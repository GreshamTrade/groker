"""Evidence-first report assembly. Scores describe this sample, never unseen pages."""
from collections import Counter
from statistics import median
from urllib.parse import urlsplit

CATEGORIES = (
    ("routes", "Links & resources", 40, "patch"),
    ("documents", "Content & discoverability", 25, "scout"),
    ("accessibility", "Document accessibility", 20, "pixel"),
    ("delivery", "Delivery & transport", 15, "echo"),
)


def enrich_report(report, pages, responses, assets, remaining=()):
    checks = []

    def check(category, label, passed, url, evidence, weight=1):
        checks.append({"category": category, "label": label, "status": "unknown" if passed is None else "pass" if passed else "fail",
                       "url": url, "evidence": str(evidence), "weight": weight})

    def reachable(result):
        code = result.get("status", 0)
        if code in (401, 403, 429) or not code:
            return None
        return 200 <= code < 400

    internal_urls = set(edge["to"] for edge in report["edges"])
    all_issues = report["findings"]
    for item in all_issues:
        referrals = [{"page": doc.url, "text": link["text"].strip()} for doc, _ in pages
                     for link in doc.link_details if link["url"] == item["url"]]
        item["linked_from"] = referrals or [{"page": doc.url, "text": "Referenced resource"}
                                              for doc, _ in pages if item["url"] in doc.assets]
        item["is_call_to_action"] = any(any(word in referral["text"].lower()
                                                   for word in ("start", "sign up", "signup", "join", "register", "trial", "get started"))
                                        for referral in referrals)
    page_details, resources = [], []
    titles = Counter(doc.title.strip().lower() for doc, _ in pages if doc.title.strip())
    incoming = Counter(edge["to"] for edge in report["edges"])
    for target in sorted(internal_urls):
        result = responses.get(target)
        if result is not None:
            check("routes", "Internal link responds", reachable(result), target, result.get("error") or f"HTTP {result['status']}", 2)
    for target, result in assets:
        check("routes", "Referenced resource responds", reachable(result), target, result.get("error") or f"HTTP {result['status']}", 2)
        resources.append({"url": target, "status": result["status"], "ms": result["ms"],
                          "type": result["headers"].get("content-type", "unknown").split(";")[0],
                          "bytes": len(result["body"]), "error": result.get("error"),
                          "linked_from": [doc.url for doc, _ in pages if target in doc.assets]})
    for doc, result in pages:
        check("documents", "Descriptive page title", bool(doc.title.strip()), doc.url, doc.title.strip() or "No title element", 2)
        check("documents", "Page description", bool(doc.description.strip()), doc.url, doc.description or "No meta description")
        check("documents", "One primary heading", len(doc.h1) == 1, doc.url, f"{len(doc.h1)} h1 elements")
        check("documents", "Unique title within sample", titles[doc.title.strip().lower()] == 1 if doc.title.strip() else None,
              doc.url, f"{titles[doc.title.strip().lower()]} pages use this title")
        check("accessibility", "Document language declared", bool(doc.lang.strip()), doc.url, doc.lang or "No html lang attribute")
        check("accessibility", "Mobile viewport declared", doc.viewport, doc.url, "Viewport meta tag present" if doc.viewport else "No viewport meta tag", 2)
        for image in doc.images:
            check("accessibility", "Image has an alt attribute", image["alt"] is not None, doc.url,
                  f"{image['url']} · alt={repr(image['alt'])}")
        for field in doc.form_inputs:
            has_label = bool(field["label"] or (field["id"] and field["id"] in doc.labels))
            # A wrapped label needs DOM inspection; don't punish an unverified association.
            check("accessibility", "Form control label association", True if has_label else None, doc.url,
                  f"Control {field['name'] or field['id'] or '(unnamed)'}: " + ("explicit label found" if has_label else "association requires browser inspection"))
        secure = urlsplit(result["final_url"]).scheme == "https"
        check("delivery", "Page served over HTTPS", secure, doc.url, result["final_url"], 2)
        check("delivery", "Response read completely", not result.get("truncated"), doc.url,
              f"{len(result['body']):,} bytes inspected" + (" · response truncated" if result.get("truncated") else ""))
        check("delivery", "Redirect chain stays short", len(result["redirects"]) <= 2, doc.url,
              f"{len(result['redirects'])} redirects observed")
        insecure = [asset for asset in doc.assets if asset.startswith("http://")]
        if secure:
            check("delivery", "No insecure resource URLs in HTML", not insecure, doc.url,
                  ", ".join(insecure) if insecure else "No HTTP resource URLs in sampled HTML")
        page_issues = [f for f in all_issues if f["url"] == doc.url or (f["url"] in doc.assets)]
        page_details.append({
            "url": doc.url, "path": urlsplit(doc.url).path or "/", "title": doc.title.strip(),
            "status": result["status"], "ms": result["ms"], "bytes": len(result["body"]),
            "description": doc.description, "lang": doc.lang, "viewport": doc.viewport,
            "headings": [{"level": h["level"], "text": h["text"].strip()} for h in doc.headings],
            "h1": [h.strip() for h in doc.h1], "images": len(doc.images),
            "missing_alt": sum(image["alt"] is None for image in doc.images),
            "links": len(set(doc.links)), "inbound": incoming[doc.url], "canonical": doc.canonical,
            "robots": doc.meta.get("robots", "Not declared"),
            "og_title": doc.meta.get("og:title"), "og_description": doc.meta.get("og:description"),
            "og_image": doc.meta.get("og:image"), "redirects": result["redirects"],
            "response_headers": {k: result["headers"].get(k) for k in ("content-type", "cache-control", "strict-transport-security", "content-security-policy", "x-content-type-options", "referrer-policy")},
            "issues": len(page_issues), "truncated": result.get("truncated", False),
        })

    breakdown = []
    for key, name, weight, owner in CATEGORIES:
        rows = [c for c in checks if c["category"] == key]
        observed = [c for c in rows if c["status"] != "unknown"]
        total_weight = sum(c["weight"] for c in observed)
        passed_weight = sum(c["weight"] for c in observed if c["status"] == "pass")
        score = round(100 * passed_weight / total_weight) if total_weight else None
        failures = sum(c["status"] == "fail" for c in rows)
        breakdown.append({"id": key, "name": name, "weight": weight, "agent": owner, "score": score,
                          "passed": sum(c["status"] == "pass" for c in rows), "failed": failures,
                          "unknown": sum(c["status"] == "unknown" for c in rows), "total": len(observed),
                          "summary": f"{failures} checks need attention" if failures else "No failed checks in this sample",
                          "checks": rows})
    available = [c for c in breakdown if c["score"] is not None]
    score = round(sum(c["score"]*c["weight"] for c in available) / sum(c["weight"] for c in available)) if available else None
    raw_score = score
    confirmed_errors = [f for f in all_issues if f["severity"] == "error" and f["confirmed"]]
    # Healthy metadata must not hide a repeatable missing route or resource.
    score_cap = 74 if confirmed_errors else None
    if score is not None and score_cap is not None:
        score = min(score, score_cap)
    grade, label = ("A", "Looking good") if score is not None and score >= 90 else ("B", "A little polish") if score is not None and score >= 75 else ("C", "Needs attention") if score is not None and score >= 60 else ("D", "Some loose ends") if score is not None and score >= 40 else ("F", "Fix the essentials") if score is not None else ("—", "Not enough evidence")
    failed = [c for c in checks if c["status"] == "fail"]
    strengths = []
    if all(urlsplit(doc.url).scheme == "https" for doc, _ in pages):
        strengths.append("Every inspected page was served over HTTPS.")
    titled = sum(bool(doc.title.strip()) for doc, _ in pages)
    if titled:
        strengths.append(f"{titled} of {len(pages)} pages have a title; {sum(v == 1 for v in titles.values())} titles are unique in this sample.")
    healthy_links = sum(200 <= responses[u]["status"] < 400 for u in internal_urls if u in responses)
    if internal_urls:
        strengths.append(f"{healthy_links} of {len(internal_urls)} inspected internal destinations responded successfully.")
    described = sum(doc.lang != "" for doc, _ in pages)
    strengths.append(f"A document language is declared on {described} of {len(pages)} inspected pages.")
    priorities = []
    for item in sorted(all_issues, key=lambda f: ({"error": 0, "warning": 1, "notice": 2}[f["severity"]], not f.get("is_call_to_action", False))):
        title = item["title"]
        action = ("Update or remove the broken internal link, restore the missing page, then rerun the inspection."
                  if "link goes" in title else "Restore the file or update the resource URL in the referring page."
                  if "resource" in title else "Add an alt description, or an empty alt attribute if this image is decorative."
                  if "alt" in title else 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> and verify the layout in a browser.'
                  if "viewport" in title else 'Set the correct language on the <html> element.'
                  if "language" in title else "Write a concise meta description that matches the page content."
                  if "description" in title else "Review the evidence, correct the source document and rerun the affected check.")
        priorities.append({"finding_id": item["id"], "title": title, "url": item["url"], "severity": item["severity"],
                           "action": action, "evidence": item["evidence"], "confirmed": item["confirmed"],
                           "linked_from": item["linked_from"]})
    if confirmed_errors:
        verdict = f"{len(confirmed_errors)} missing pages or resources. Fix the broken paths first."
        catch = f"{len(confirmed_errors)} missing responses repeated on a second request. " + " · ".join(urlsplit(f["url"]).path for f in confirmed_errors[:3])
        broken_cta = next((f for f in confirmed_errors if f.get("is_call_to_action")), None)
        if broken_cta:
            referral = next(r for r in broken_cta["linked_from"] if r["text"])
            catch = (f'The “{referral["text"]}” link on {urlsplit(referral["page"]).path or "/"} points to '
                     f'{urlsplit(broken_cta["url"]).path}, which returned a missing-page response twice. '
                     'Fix this path before polishing metadata.')
    elif failed:
        verdict = f"The main paths respond. {len(failed)} document checks still need attention."
        catch = "The sample has no confirmed missing pages or resources, but document omissions still deserve a review."
    else:
        verdict = "The sampled pages look tidy. Keep the same checks on your next release."
        catch = "No failed checks in this sample. Pages behind logins, rendered layouts and unvisited routes remain outside this result."
    unavailable = sum(c["status"] == "unknown" for c in checks)
    timings = [result["ms"] for _, result in pages if result["status"] == 200]
    report.update({
        "report_version": 2, "score": score, "raw_score": raw_score, "score_cap": score_cap,
        "grade": grade, "grade_label": label,
        "verdict": verdict, "main_catch": catch, "strengths": strengths,
        "breakdown": breakdown, "check_count": len(checks)-unavailable, "unknown_checks": unavailable,
        "passed_checks": sum(c["status"] == "pass" for c in checks), "failed_checks": len(failed),
        "page_details": page_details, "resource_details": resources, "priorities": priorities,
        "response_median_ms": round(median(timings)) if timings else None,
        "total_html_bytes": sum(len(result["body"]) for _, result in pages),
        "coverage": {"sampled_pages": len(pages), "discovered_destinations": len(set(internal_urls) | {doc.url for doc, _ in pages}),
                     "unvisited_queue": len(remaining), "bounded": bool(remaining), "unknown_checks": unavailable},
        "score_method": "Sample health is the weighted average of completed checks: links & resources 40%, content & discoverability 25%, document accessibility 20%, delivery & transport 15%. Link/resource responses and title/viewport/HTTPS checks count double within their category. Unknown checks are excluded. Confirmed missing pages or resources cap the final score at 74 (grade C), so healthy metadata cannot hide broken paths. A ≥90, B ≥75, C ≥60, D ≥40, F <40. This is a document-and-response heuristic, not a security, SEO or accessibility certification.",
        "not_checked": ["JavaScript-rendered layout and interaction", "Screenshots, Core Web Vitals and visual regressions", "Authenticated pages and form submission", "Security vulnerabilities or full WCAG compliance", "External link destinations and resources outside the origin"],
    })
    report["agent_notes"] = [
        {"agent": "scout", "title": "The lay of the land", "text": f"Mapped {len(pages)} HTML pages and {len(report['edges'])} internal connections. " + (f"{len(remaining)} queued destinations remained when the page sample limit was reached." if remaining else "The current discovery queue was exhausted; disconnected or script-rendered pages may still exist.")},
        {"agent": "patch", "title": "What holds together", "text": f"Selected {report['links']} internal destinations and {len(assets)} linked resources for response checks. Unavailable responses are excluded from the grade. {len(confirmed_errors)} missing responses repeated on the second pass."},
        {"agent": "pixel", "title": "The little details", "text": f"Read document metadata, headings and image descriptions. {sum(c['status']=='fail' and c['category'] in ('documents','accessibility') for c in checks)} document checks failed. Empty image alt text is accepted for decorative images."},
        {"agent": "echo", "title": "A second look", "text": f"{sum('repeat HTTP' in f['evidence'] for f in all_issues)} findings carry a repeat response. {unavailable} unavailable or ambiguous checks are excluded from the score. Repeat requests are additional observations, not an independent source."},
        {"agent": "chief", "title": "What I would do next", "text": priorities[0]["action"] if priorities else "Keep this report as a baseline and repeat the same inspection after the next release."},
    ]
