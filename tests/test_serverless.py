import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import server


class Request:
    def __init__(self, payload=None, origin="https://groker.example", raw=None):
        self.command = "POST"
        body = raw if raw is not None else json.dumps(payload).encode()
        self.headers = {"Content-Type": "application/json", "Content-Length": str(len(body)),
                        "Host": "groker.example", "Origin": origin}
        self.rfile = io.BytesIO(body)
        self.status, self.payload = None, None

    def json_response(self, payload, status=200):
        self.payload, self.status = payload, status


class ServerlessTests(unittest.TestCase):
    def test_one_https_request_returns_full_report_without_writes_or_background_jobs(self):
        request = Request({"action": "inspect", "demo": True})
        with patch.object(server.time, "sleep"), patch.object(Path, "write_text", side_effect=AssertionError("read-only")), patch.object(server.threading, "Thread", side_effect=AssertionError("no detached jobs")):
            # The scan uses a joined thread pool for network batches, not detached jobs.
            # An inline executor makes the distinction explicit in this test.
            class InlinePool:
                def __init__(self, **kwargs): pass
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def map(self, function, values): return map(function, values)
            with patch.object(server.concurrent.futures, "ThreadPoolExecutor", InlinePool):
                server.handle_api(request)
        self.assertEqual(request.status, 200)
        job = request.payload
        self.assertEqual(job["status"], "complete")
        self.assertEqual(job["report"]["id"], job["id"])
        self.assertEqual(job["report"]["report_version"], 2)
        self.assertEqual(job["report"]["grade"], "C")
        self.assertEqual(job["progress"], 100)

    def test_cold_invocations_do_not_need_shared_job_memory(self):
        with patch.object(server.time, "sleep"):
            first = server.inspection_payload({"demo": True})
            second = server.inspection_payload({"demo": True})
        self.assertNotEqual(first["id"], second["id"])
        self.assertEqual(first["report"]["counts"], second["report"]["counts"])
        self.assertFalse(hasattr(server, "JOBS"))

    def test_cross_origin_write_is_rejected_before_inspection(self):
        request = Request({"action": "inspect", "demo": True}, origin="https://another.example")
        with patch.object(server, "inspection_payload") as inspect:
            server.handle_api(request)
        self.assertEqual(request.status, 403)
        inspect.assert_not_called()

    def test_invalid_payloads_do_not_start_an_inspection(self):
        for payload in ([], {"action": "unknown"}, {"action": "inspect", "url": []}):
            with self.subTest(payload=payload):
                request = Request(payload)
                server.handle_api(request)
                self.assertEqual(request.status, 400)
        request = Request(raw=b"\xff")
        server.handle_api(request)
        self.assertEqual(request.status, 400)

    def test_config_exposes_no_environment_secret(self):
        request = Request({"action": "config"})
        with patch.dict(server.os.environ, {"GROKER_XAI_API_KEY": "private-test-key", "GROKER_XAI_MODEL": "test-model"}):
            server.handle_api(request)
        self.assertTrue(request.payload["model_configured"])
        self.assertNotIn("private-test-key", json.dumps(request.payload))
        self.assertEqual(request.payload["history"], "browser")

    def test_time_budget_excludes_unrequested_urls_and_discloses_partial_coverage(self):
        clock = [0.0]
        def fetch(url):
            result = server.demo_fetch(url)
            clock[0] += 2
            return result
        with patch.object(server.time, "monotonic", side_effect=lambda: clock[0]), patch.object(server.time, "sleep"):
            report = server.inspect_site("https://orbit.demo/", fetch=fetch, demo=True, time_budget=1)
        self.assertEqual(report["pages"], 1)
        self.assertTrue(report["time_budget"]["exhausted"])
        self.assertGreater(report["time_budget"]["skipped_urls"], 0)
        self.assertTrue(report["coverage"]["bounded"])
        self.assertGreater(report["unknown_checks"], 0)
        self.assertEqual(report["counts"]["error"], 0)
        self.assertIn("partial", report["verdict"].lower())

    def test_real_vercel_handler_runs_with_a_rewritten_path(self):
        spec = importlib.util.spec_from_file_location("groker_vercel_entry", ROOT / "api" / "index.py")
        api = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(api)
        instance = object.__new__(api.handler)
        instance.command, instance.path = "POST", "/api/index.py"
        source = Request({"action": "inspect", "demo": True})
        instance.headers, instance.rfile = source.headers, source.rfile
        instance.json_response = source.json_response
        with patch.object(server.time, "sleep"):
            instance.do_POST()
        self.assertEqual(source.status, 200)
        self.assertEqual(source.payload["status"], "complete")


if __name__ == "__main__":
    unittest.main()
