import importlib.util
from pathlib import Path
import socket
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
spec = importlib.util.spec_from_file_location("groker_server", Path(__file__).resolve().parents[1] / "server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class UrlBoundaryTests(unittest.TestCase):
    def test_normalizes_domain_and_discards_fragment(self):
        self.assertEqual(server.normalize_url("example.com/docs#intro"), "https://example.com/docs")

    def test_rejects_credentials_non_web_schemes_and_private_ports(self):
        for value in ("https://u:p@example.com", "file:///etc/passwd", "http://example.com:8080/", "https://example.com/\r\nx: bad"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                server.normalize_url(value)

    def test_rejects_mixed_public_and_private_dns_answers(self):
        answers = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443)) for ip in ("8.8.8.8", "127.0.0.1")]
        with patch.object(server.socket, "getaddrinfo", return_value=answers), self.assertRaises(ValueError):
            server.resolve_public("example.com", 443)

    def test_local_names_are_rejected_before_dns(self):
        with patch.object(server.socket, "getaddrinfo") as dns:
            for name in ("localhost", "service.local", "thing.localhost", "metadata.internal"):
                with self.assertRaises(ValueError):
                    server.resolve_public(name, 80)
            dns.assert_not_called()

    def test_redirect_cannot_reach_a_local_destination(self):
        class Response:
            status = 302
            def getheaders(self):
                return [("Location", "http://localhost/admin")]
        class Connection:
            def request(self, *args, **kwargs): pass
            def getresponse(self): return Response()
            def close(self): pass
        original_resolve = server.resolve_public
        def resolve(host, port):
            return original_resolve(host, port) if host == "localhost" else ["8.8.8.8"]
        with patch.object(server, "resolve_public", side_effect=resolve), patch.object(server, "PinnedHTTPS", return_value=Connection()):
            result = server.public_fetch("https://example.com/")
        self.assertEqual(result["status"], 0)
        self.assertIn("private", result["error"])


class InspectionTests(unittest.TestCase):
    def demo(self, fetch=None):
        with patch.object(server.time, "sleep"):
            return server.inspect_site("https://orbit.demo/", fetch or server.demo_fetch, demo=True)

    def test_demo_reports_observed_missing_pages_and_resources(self):
        report = self.demo()
        errors = [f for f in report["findings"] if f["severity"] == "error"]
        self.assertEqual(report["pages"], 4)
        self.assertEqual(report["links"], 6)
        self.assertEqual(report["assets"], 3)
        self.assertEqual(len(errors), 3)
        self.assertTrue(all(f["confirmed"] for f in errors))
        self.assertTrue(all("repeat HTTP 404" in f["evidence"] for f in errors))
        self.assertTrue(report["demo"])

    def test_intermediate_missing_response_is_not_confirmed(self):
        calls = {}
        def fetch(url):
            calls[url] = calls.get(url, 0) + 1
            result = server.demo_fetch(url)
            if url.endswith("/signup") and calls[url] > 1:
                result["status"] = 200
            return result
        report = self.demo(fetch)
        item = next(f for f in report["findings"] if f["url"].endswith("/signup"))
        self.assertFalse(item["confirmed"])
        self.assertEqual(item["severity"], "warning")

    def test_metadata_findings_reference_actual_documents(self):
        report = self.demo()
        viewport = [f for f in report["findings"] if "viewport" in f["title"]]
        self.assertEqual(len(viewport), 1)
        self.assertTrue(viewport[0]["url"].endswith("/start"))
        self.assertIn("Actual layout requires a browser check", viewport[0]["detail"])

    def test_empty_alt_is_valid_for_a_decorative_image(self):
        doc = server.Document('<html><img src="a.svg" alt=""><img src="b.svg"></html>', "https://example.com/")
        self.assertEqual(doc.images[0]["alt"], "")
        self.assertIsNone(doc.images[1]["alt"])

    def test_crawl_never_follows_external_links(self):
        called=[]
        def fetch(url):
            called.append(url)
            result=server.demo_fetch(url)
            if url == "https://orbit.demo/":
                result["body"] += b'<a href="https://external.example/">External</a>'
            return result
        self.demo(fetch)
        self.assertTrue(all(url.startswith("https://orbit.demo/") for url in called))

    def test_access_block_is_not_labelled_as_a_broken_link(self):
        def fetch(url):
            result=server.demo_fetch(url)
            if url.endswith("/docs"):
                result["status"]=403
            return result
        report=self.demo(fetch)
        item=next(f for f in report["findings"] if f["url"].endswith("/docs"))
        self.assertEqual(item["title"],"Access limited")
        self.assertEqual(item["severity"],"notice")
        self.assertFalse(item["confirmed"])

    def test_report_exposes_page_metadata_and_actual_connections(self):
        report=self.demo()
        page=next(p for p in report["page_details"] if p["path"]=="/pricing")
        self.assertEqual(report["report_version"],2)
        self.assertEqual(page["h1"],["Simple pricing"])
        self.assertEqual(page["missing_alt"],1)
        self.assertTrue(any(edge["from"].endswith("/pricing") and edge["to"].endswith("/signup") for edge in report["edges"]))
        self.assertEqual(len(report["resource_details"]),3)

    def test_repeated_missing_paths_cap_the_health_grade(self):
        report=self.demo()
        self.assertGreater(report["raw_score"],report["score"])
        self.assertEqual(report["score_cap"],74)
        self.assertEqual(report["grade"],"C")
        self.assertIn("cap the final score",report["score_method"])

    def test_blocked_response_is_unknown_and_excluded_from_score(self):
        def fetch(url):
            result=server.demo_fetch(url)
            if url.endswith("/docs"):result["status"]=403
            return result
        report=self.demo(fetch)
        category=next(c for c in report["breakdown"] if c["id"]=="routes")
        row=next(c for c in category["checks"] if c["url"].endswith("/docs"))
        self.assertEqual(row["status"],"unknown")
        self.assertEqual(category["unknown"],1)
        self.assertEqual(category["total"],len(category["checks"])-1)

    def test_broken_call_to_action_is_prioritized_from_observed_anchor(self):
        report=self.demo()
        self.assertTrue(report["priorities"][0]["url"].endswith("/signup"))
        self.assertIn("Start free",report["main_catch"])
        self.assertIn("/pricing",report["main_catch"])

    def test_healthy_sample_gets_a_without_an_error_cap(self):
        def fetch(url):
            result=server.demo_fetch(url)
            result["status"]=200
            result["body"]=(f'<html lang="en"><head><title>{url}</title><meta name="description" content="Hello"><meta name="viewport" content="width=device-width"></head><body><h1>Hello</h1></body></html>').encode()
            return result
        report=self.demo(fetch)
        self.assertEqual(report["grade"],"A")
        self.assertEqual(report["score"],100)
        self.assertIsNone(report["score_cap"])


if __name__ == "__main__":
    unittest.main()
