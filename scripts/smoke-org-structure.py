#!/usr/bin/env python3
"""Phase 2.2 — departments + people API regression (local docker stack, stdlib only).

Usage: python3 scripts/smoke-org-structure.py [http://127.0.0.1:8081]

Creates temporary fixtures (viewer user, second institution, smoke22-* rows) and
removes them on exit. Requires migration 008 applied and the docker `mysql` service.
"""
import http.cookiejar
import json
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8081").rstrip("/")
INST = "11111111-1111-4111-8111-111111111111"
OTHER_INST = "99999999-9999-4999-8999-999999999999"
OTHER_DEPT = "99999999-9999-4999-8999-00000000000d"
VIEWER_ID = "99999999-9999-4999-8999-0000000000a1"
VIEWER_EMAIL = "smoke22-viewer@example.invalid"
PASSWORD = "Admin123!"  # dev seed bcrypt hash is reused for the temp viewer
passed = 0


def sql(statement: str) -> str:
    out = subprocess.run(
        ["docker", "compose", "exec", "-T", "mysql", "mariadb", "-uegwp", "-pegwp", "egwp", "-N", "-e", statement],
        check=True, capture_output=True, text=True,
    )
    return out.stdout.strip()


class Client:
    def __init__(self) -> None:
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def csrf(self) -> str:
        return next((c.value for c in self.jar if c.name == "egwp_csrf"), "")

    def call(self, method: str, path: str, body=None, csrf: bool = True):
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if method != "GET" and csrf and self.csrf():
            headers["X-CSRF-Token"] = self.csrf()
        req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
        try:
            with self.opener.open(req) as res:
                return res.status, json.loads(res.read() or b"null")
        except urllib.error.HTTPError as e:
            raw = e.read()
            return e.code, json.loads(raw) if raw else None

    def login(self, email: str) -> "Client":
        status, body = self.call("POST", "/api/auth/login", {"email": email, "password": PASSWORD})
        assert status == 200, f"login {email}: {status} {body}"
        return self


def check(label: str, cond: bool, detail=None) -> None:
    global passed
    if not cond:
        print(f"FAIL {label}" + (f" — {detail}" if detail is not None else ""), file=sys.stderr)
        raise SystemExit(1)
    passed += 1
    print(f"OK   {label}")


def expect(label: str, result, status: int):
    got, body = result
    check(f"{label} → {status}", got == status, f"got {got}: {body}")
    return body


def setup() -> None:
    sql(
        f"INSERT INTO institutions (id, name, short_name) VALUES ('{OTHER_INST}', 'Smoke other', 'SO');"
        f"INSERT INTO departments (id, institution_id, slug, name, translations)"
        f"  VALUES ('{OTHER_DEPT}', '{OTHER_INST}', 'smoke22-other', 'Other institution dept', '{{}}');"
        f"INSERT INTO users (id, name, email, email_verified, role, active)"
        f"  VALUES ('{VIEWER_ID}', 'Smoke Viewer', '{VIEWER_EMAIL}', 1, 'viewer', 1);"
        f"INSERT INTO account (id, account_id, provider_id, user_id, password)"
        f"  SELECT '{uuid.uuid4()}', '{VIEWER_EMAIL}', 'credential', '{VIEWER_ID}', a.password"
        f"  FROM account a JOIN users u ON u.id = a.user_id WHERE u.email = 'admin@example.gov.et' LIMIT 1;"
    )


def cleanup() -> None:
    sql(
        f"DELETE FROM people WHERE institution_id = '{INST}' AND slug LIKE 'smoke22-%';"
        f"DELETE FROM departments WHERE institution_id = '{INST}' AND slug LIKE 'smoke22-%';"
        f"DELETE FROM institutions WHERE id = '{OTHER_INST}';"
        f"DELETE FROM users WHERE id = '{VIEWER_ID}';"
    )


def dept(slug: str, **extra):
    return {"name": f"Dept {slug}", "slug": slug, "summary": "Smoke summary", "description": "",
            "sortOrder": 0, "status": "published", "translations": {}, **extra}


def person(slug: str, **extra):
    return {"fullName": f"Person {slug}", "slug": slug, "title": "Smoke title", "bio": "Smoke bio",
            "email": "", "phone": "", "departmentId": None, "sortOrder": 0, "isLeadership": True,
            "status": "published", "translations": {}, **extra}


def run() -> None:
    anon = Client()
    admin = Client().login("admin@example.gov.et")
    editor = Client().login("editor@example.gov.et")
    viewer = Client().login(VIEWER_EMAIL)

    # --- Auth, CSRF, roles ---------------------------------------------------
    anon.call("GET", "/api/auth/session")  # obtain CSRF cookie without a session
    expect("anon create department", anon.call("POST", "/api/cms/departments", dept("smoke22-x")), 401)
    expect("anon create person", anon.call("POST", "/api/cms/people", person("smoke22-x")), 401)
    expect("admin create without CSRF header", admin.call("POST", "/api/cms/departments", dept("smoke22-x"), csrf=False), 403)
    expect("admin update without CSRF header", admin.call("PUT", f"/api/cms/people/{uuid.uuid4()}", person("smoke22-x"), csrf=False), 403)
    expect("viewer create department", viewer.call("POST", "/api/cms/departments", dept("smoke22-x")), 403)
    expect("viewer create person", viewer.call("POST", "/api/cms/people", person("smoke22-x")), 403)
    expect("viewer can read CMS departments", viewer.call("GET", "/api/cms/departments"), 200)
    expect("anon cannot read CMS people", anon.call("GET", "/api/cms/people"), 401)

    # --- Department validation -----------------------------------------------
    for label, payload in [
        ("dept unknown translation lang", dept("smoke22-bad", translations={"fr": {"name": "x"}})),
        ("dept unknown translation field", dept("smoke22-bad", translations={"am": {"slug": "x"}})),
        ("dept translations as list", dept("smoke22-bad", translations=[{"name": "x"}])),
        ("dept translation non-string value", dept("smoke22-bad", translations={"am": {"name": ["x"]}})),
        ("dept invalid status", dept("smoke22-bad", status="live")),
        ("dept missing name", dept("smoke22-bad", name="  ")),
        ("dept invalid sortOrder", dept("smoke22-bad", sortOrder="first")),
        ("dept name too long", dept("smoke22-bad", name="x" * 256)),
    ]:
        expect(label, admin.call("POST", "/api/cms/departments", payload), 400)

    # --- Department create / publish gate / duplicates -----------------------
    d1 = expect("admin create published dept", admin.call("POST", "/api/cms/departments", dept(
        "smoke22-heritage", name="<b>Heritage</b> Directorate", sortOrder=20,
        translations={"am": {"name": "Amharic heritage name"}, "om": {}})), 201)
    check("dept HTML stripped", d1["name"] == "Heritage Directorate", d1["name"])
    check("dept status published (admin)", d1["status"] == "published")
    check("empty translation entry dropped", list(d1["translations"].keys()) == ["am"], d1["translations"])
    expect("duplicate dept slug", admin.call("POST", "/api/cms/departments", dept("smoke22-heritage")), 409)

    d2 = expect("admin create second dept", admin.call("POST", "/api/cms/departments", dept(
        "smoke22-culture", name="Culture Directorate", sortOrder=10)), 201)
    d3 = expect("editor create dept requesting published", editor.call("POST", "/api/cms/departments", dept(
        "smoke22-draft", status="published")), 201)
    check("publish gate forces editor draft", d3["status"] == "draft", d3["status"])

    expect("update dept slug to duplicate", admin.call("PUT", f"/api/cms/departments/{d2['id']}", dept(
        "smoke22-heritage", name="Culture Directorate")), 409)
    d2 = expect("admin update dept order", admin.call("PUT", f"/api/cms/departments/{d2['id']}", dept(
        "smoke22-culture", name="Culture Directorate", sortOrder=5)), 200)
    check("dept update persisted", d2["sortOrder"] == 5)

    # --- Department public visibility / order / locale -----------------------
    items = expect("public departments", anon.call("GET", "/api/departments"), 200)["items"]
    slugs = [i["slug"] for i in items]
    check("draft dept hidden publicly", "smoke22-draft" not in slugs, slugs)
    check("sort_order respected", slugs.index("smoke22-culture") < slugs.index("smoke22-heritage"), slugs)
    check("public dept hides internal fields",
          not ({"id", "status", "translations", "createdAt"} & set(items[0].keys())), items[0].keys())
    expect("public draft dept by slug", anon.call("GET", "/api/departments/smoke22-draft"), 404)
    en = expect("public dept en", anon.call("GET", "/api/departments/smoke22-heritage"), 200)
    check("en: no fallback", en["language"] == "en" and en["usedFallback"] is False, en)
    am = expect("public dept am", anon.call("GET", "/api/departments/smoke22-heritage?lang=am"), 200)
    check("am: translated name", am["name"] == "Amharic heritage name", am)
    check("am: summary falls back → usedFallback", am["summary"] == "Smoke summary" and am["usedFallback"] is True, am)
    om = expect("public dept om", anon.call("GET", "/api/departments/smoke22-heritage?lang=om"), 200)
    check("om: English fallback", om["name"] == "Heritage Directorate" and om["usedFallback"] is True, om)
    xx = expect("public dept unknown lang", anon.call("GET", "/api/departments/smoke22-heritage?lang=xx"), 200)
    check("unknown lang → en", xx["language"] == "en", xx)

    # --- Person validation ---------------------------------------------------
    for label, payload in [
        ("person nonexistent department", person("smoke22-bad", departmentId=str(uuid.uuid4()))),
        ("person cross-institution department", person("smoke22-bad", departmentId=OTHER_DEPT)),
        ("person invalid email", person("smoke22-bad", email="not-an-email")),
        ("person invalid phone", person("smoke22-bad", phone="call me<script>")),
        ("person unknown translation field", person("smoke22-bad", translations={"am": {"fullName": "x"}})),
        ("person unknown translation lang", person("smoke22-bad", translations={"en": {"title": "x"}})),
        ("person missing title", person("smoke22-bad", title="")),
        ("person invalid isLeadership", person("smoke22-bad", isLeadership="yes")),
    ]:
        expect(label, admin.call("POST", "/api/cms/people", payload), 400)

    # --- Person create / list -------------------------------------------------
    p1 = expect("admin create leadership person", admin.call("POST", "/api/cms/people", person(
        "smoke22-head", departmentId=d1["id"], email="head@example.invalid", phone="+251 25 000 0000",
        sortOrder=1, translations={"am": {"title": "Amharic title"}})), 201)
    check("person department linked", p1["departmentId"] == d1["id"])
    expect("duplicate person slug", admin.call("POST", "/api/cms/people", person("smoke22-head")), 409)
    p_staff = expect("admin create non-leadership person", admin.call("POST", "/api/cms/people", person(
        "smoke22-staff", isLeadership=False)), 201)
    p_draft = expect("editor create person requesting published", editor.call("POST", "/api/cms/people", person(
        "smoke22-draft-person", status="published")), 201)
    check("publish gate forces editor draft (person)", p_draft["status"] == "draft")
    p_draft_dept = expect("person linked to draft dept", admin.call("POST", "/api/cms/people", person(
        "smoke22-in-draft-dept", departmentId=d3["id"], sortOrder=2)), 201)

    lead = expect("public leadership", anon.call("GET", "/api/leadership"), 200)["items"]
    lslugs = [i["slug"] for i in lead]
    check("leadership includes published leader", "smoke22-head" in lslugs, lslugs)
    check("leadership excludes non-leadership", "smoke22-staff" not in lslugs, lslugs)
    check("leadership excludes drafts", "smoke22-draft-person" not in lslugs, lslugs)
    head = next(i for i in lead if i["slug"] == "smoke22-head")
    check("leader department association", head["department"] == {"slug": "smoke22-heritage", "name": "Heritage Directorate"}, head)
    check("public person hides internal fields",
          not ({"id", "status", "translations", "departmentId", "createdAt"} & set(head.keys())), head.keys())
    in_draft = next(i for i in lead if i["slug"] == "smoke22-in-draft-dept")
    check("draft department not exposed via person", in_draft["department"] is None, in_draft)
    head_am = expect("public person am", anon.call("GET", "/api/people/smoke22-head?lang=am"), 200)
    check("person am title + dept name", head_am["title"] == "Amharic title"
          and head_am["department"]["name"] == "Amharic heritage name", head_am)
    check("person am bio fallback flagged", head_am["bio"] == "Smoke bio" and head_am["usedFallback"] is True, head_am)
    expect("public non-leader by slug", anon.call("GET", "/api/people/smoke22-staff"), 200)
    expect("public draft person by slug", anon.call("GET", "/api/people/smoke22-draft-person"), 404)

    # --- Cross-institution access via IDs ------------------------------------
    expect("CMS get other-institution dept", admin.call("GET", f"/api/cms/departments/{OTHER_DEPT}"), 404)
    expect("CMS update other-institution dept", admin.call("PUT", f"/api/cms/departments/{OTHER_DEPT}", dept("smoke22-hijack")), 404)
    expect("CMS archive other-institution dept", admin.call("DELETE", f"/api/cms/departments/{OTHER_DEPT}"), 404)
    check("other-institution dept untouched",
          sql(f"SELECT CONCAT(slug,'|',status) FROM departments WHERE id='{OTHER_DEPT}'") == "smoke22-other|draft")
    expect("public slug of other-institution dept", anon.call("GET", "/api/departments/smoke22-other"), 404)

    # --- Archive rules -------------------------------------------------------
    expect("archive dept with active people", admin.call("DELETE", f"/api/cms/departments/{d1['id']}"), 409)
    expect("archive dept via status with active people", admin.call("PUT", f"/api/cms/departments/{d1['id']}", dept(
        "smoke22-heritage", name="Heritage Directorate", status="archived")), 409)
    archived = expect("archive person", editor.call("DELETE", f"/api/cms/people/{p1['id']}"), 200)
    check("person archived (soft)", archived["status"] == "archived")
    expect("archived person hidden publicly", anon.call("GET", "/api/people/smoke22-head"), 404)
    expect("viewer cannot archive person", viewer.call("DELETE", f"/api/cms/people/{p_staff['id']}"), 403)
    d1a = expect("archive dept once people archived", admin.call("DELETE", f"/api/cms/departments/{d1['id']}"), 200)
    check("dept archived (soft)", d1a["status"] == "archived")
    expect("archived dept hidden publicly", anon.call("GET", "/api/departments/smoke22-heritage"), 404)
    expect("assign person to archived dept", admin.call("PUT", f"/api/cms/people/{p_staff['id']}", person(
        "smoke22-staff", isLeadership=False, departmentId=d1["id"])), 400)
    check("archived rows still in CMS list",
          "smoke22-heritage" in [i["slug"] for i in admin.call("GET", "/api/cms/departments")[1]["items"]])

    # --- Editor gate on live content (not weakened) --------------------------
    live = expect("editor edits published dept", editor.call("PUT", f"/api/cms/departments/{d2['id']}", dept(
        "smoke22-culture", name="Culture Directorate", status="published")), 200)
    check("editor edit of live dept returns it to draft", live["status"] == "draft", live["status"])
    _ = p_draft_dept


def main() -> None:
    cleanup()
    setup()
    try:
        run()
    finally:
        cleanup()
    print(f"All {passed} organization smoke checks passed (fixtures cleaned up).")


if __name__ == "__main__":
    main()
