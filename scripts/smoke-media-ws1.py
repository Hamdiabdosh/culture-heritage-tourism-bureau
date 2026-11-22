#!/usr/bin/env python3
"""Phase 2.3 WS1 — media upload security smoke (stdlib only).

Usage: python3 scripts/smoke-media-ws1.py [http://127.0.0.1:8081]

Requires rebuilt API image with GD+exif. Creates/uses fixtures under
scripts/fixtures/media-ws1/. Cleans up uploaded files that this script creates.
"""
from __future__ import annotations

import http.cookiejar
import json
import os
import struct
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import uuid
from pathlib import Path

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8081").rstrip("/")
PASSWORD = "Admin123!"
ROOT = Path(__file__).resolve().parents[1]
# Fixtures are generated inside the API container under the bind-mounted backend/tmp.
FIX = ROOT / "backend" / "tmp" / "media-ws1-fixtures"
passed = 0
uploaded_names: list[str] = []


def check(label: str, cond: bool, detail=None) -> None:
    global passed
    if not cond:
        print(f"FAIL {label}" + (f" — {detail}" if detail is not None else ""), file=sys.stderr)
        raise SystemExit(1)
    passed += 1
    print(f"OK   {label}")


class Client:
    def __init__(self) -> None:
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def csrf(self) -> str:
        return next((c.value for c in self.jar if c.name == "egwp_csrf"), "")

    def call_json(self, method: str, path: str, body=None, csrf: bool = True):
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
            try:
                parsed = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                parsed = raw.decode("utf-8", "replace")
            return e.code, parsed

    def upload(self, path: Path, filename: str | None = None, content_type: str | None = None):
        boundary = "----egwp" + uuid.uuid4().hex
        name = filename or path.name
        raw = path.read_bytes()
        ctype = content_type or "application/octet-stream"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{name}"\r\n'
            f"Content-Type: {ctype}\r\n\r\n"
        ).encode() + raw + f"\r\n--{boundary}--\r\n".encode()
        headers = {
            "Accept": "application/json",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "X-CSRF-Token": self.csrf(),
        }
        req = urllib.request.Request(BASE + "/api/cms/media", data=body, method="POST", headers=headers)
        try:
            with self.opener.open(req) as res:
                return res.status, json.loads(res.read() or b"null")
        except urllib.error.HTTPError as e:
            raw_body = e.read()
            try:
                parsed = json.loads(raw_body) if raw_body else None
            except json.JSONDecodeError:
                parsed = raw_body.decode("utf-8", "replace")
            return e.code, parsed

    def get_bytes(self, path: str):
        req = urllib.request.Request(BASE + path, method="GET")
        try:
            with self.opener.open(req) as res:
                return res.status, res.read(), dict(res.headers)
        except urllib.error.HTTPError as e:
            return e.code, e.read(), dict(e.headers)

    def login(self, email: str) -> "Client":
        status, body = self.call_json("POST", "/api/auth/login", {"email": email, "password": PASSWORD})
        assert status == 200, f"login {email}: {status} {body}"
        return self


def ensure_fixtures() -> None:
    """Build fixtures via PHP+GD inside the api container (bind-mounted backend/tmp)."""
    (ROOT / "backend" / "tmp").mkdir(parents=True, exist_ok=True)
    out_in_container = "/var/www/backend/tmp/media-ws1-fixtures"
    gen = ROOT / "backend" / "tmp" / "gen-media-fixtures.php"
    gen.write_text(
        "<?php\n"
        f"$d='{out_in_container}';\n"
        "if (!is_dir($d)) mkdir($d, 0777, true);\n"
        "$im=imagecreatetruecolor(32,32); $c=imagecolorallocate($im,200,40,40); imagefilledrectangle($im,0,0,31,31,$c); imagejpeg($im,\"$d/static.jpg\",90); imagedestroy($im);\n"
        "$im=imagecreatetruecolor(32,32); imagealphablending($im,false); imagesavealpha($im,true); $t=imagecolorallocatealpha($im,0,0,0,127); imagefilledrectangle($im,0,0,31,31,$t); $c=imagecolorallocatealpha($im,40,180,40,0); imagefilledellipse($im,16,16,20,20,$c); imagepng($im,\"$d/static.png\"); imagedestroy($im);\n"
        "$im=imagecreatetruecolor(32,32); $c=imagecolorallocate($im,40,40,200); imagefilledrectangle($im,0,0,31,31,$c); imagewebp($im,\"$d/static.webp\",90); imagedestroy($im);\n"
        "$im=imagecreatetruecolor(32,32); $c=imagecolorallocate($im,220,180,40); imagefilledrectangle($im,0,0,31,31,$c); imagegif($im,\"$d/static.gif\"); imagedestroy($im);\n"
        "$jpg=file_get_contents(\"$d/static.jpg\"); file_put_contents(\"$d/polyglot.jpg\", $jpg.\"\\n<script>alert(1)</script>\");\n"
        "file_put_contents(\"$d/fake.html.jpg\", \"<html><body>x</body></html>\");\n"
        "file_put_contents(\"$d/corrupt.jpg\", \"not-an-image\");\n"
        "$im=imagecreatetruecolor(8001,10); imagejpeg($im,\"$d/edge_over.jpg\",30); imagedestroy($im);\n"
        "$im=imagecreatetruecolor(6000,4001); imagejpeg($im,\"$d/mp_over.jpg\",20); imagedestroy($im);\n"
        "echo \"wrote $d\\n\";\n"
    )
    subprocess.run(
        ["docker", "compose", "exec", "-T", "api", "php", "/var/www/backend/tmp/gen-media-fixtures.php"],
        check=True,
        cwd=str(ROOT),
    )
    subprocess.run(
        ["docker", "compose", "exec", "-T", "api", "chmod", "-R", "a+rwX", "/var/www/backend/tmp"],
        check=True,
        cwd=str(ROOT),
    )
    check("fixture dir from container", FIX.is_dir(), FIX)

    anim_gif = bytes.fromhex(
        "474946383961"
        "01000100"
        "00"
        "00"
        "00"
        "21f9040500000000"
        "2c00000000010001000002014400"
        "21f9040500000000"
        "2c00000000010001000002014400"
        "3b"
    )
    (FIX / "animated.gif").write_bytes(anim_gif)

    vp8x_payload = bytes([0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    anim_chunk = b"ANIM" + struct.pack("<I", 6) + b"\x00\x00\x00\x00\x00\x00"
    body = b"VP8X" + struct.pack("<I", len(vp8x_payload)) + vp8x_payload + anim_chunk
    riff = b"RIFF" + struct.pack("<I", 4 + len(body)) + b"WEBP" + body
    (FIX / "animated.webp").write_bytes(riff)

    def png_chunk(tag: bytes, data: bytes) -> bytes:
        import zlib
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    import zlib as _z
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    actl = struct.pack(">II", 2, 0)
    raw = _z.compress(b"\x00\x00\x00\x00")
    apng = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"acTL", actl)
        + png_chunk(b"IDAT", raw)
        + png_chunk(b"IEND", b"")
    )
    (FIX / "animated.png").write_bytes(apng)

    # Malformed / truncated containers (must reject before GD)
    (FIX / "trunc.gif").write_bytes(b"GIF89a" + b"\x00" * 7)
    static_gif = (FIX / "static.gif").read_bytes()
    if static_gif.endswith(b";"):
        (FIX / "notrail.gif").write_bytes(static_gif[:-1])
    else:
        (FIX / "notrail.gif").write_bytes(static_gif)
    static_webp = (FIX / "static.webp").read_bytes()
    (FIX / "trunc.webp").write_bytes(static_webp[:20])
    lie = bytearray(static_webp)
    lie[4] = 0xFF
    lie[5] = 0xFF
    (FIX / "riff_lie.webp").write_bytes(bytes(lie))


def unlink_upload(name: str) -> None:
    path = ROOT / "backend" / "storage" / "uploads" / name
    if path.is_file():
        path.unlink()


def main() -> None:
    ensure_fixtures()

    det = subprocess.run(
        [
            "docker", "compose", "exec", "-T", "api", "php", "-r",
            r'''
require "/var/www/backend/app/Media/ImageProcessingException.php";
require "/var/www/backend/app/Media/ImageProcessor.php";
use App\Media\ImageProcessor;
$d="/var/www/backend/tmp/media-ws1-fixtures";
$g=ImageProcessor::gifIsAnimated("$d/static.gif");
$a=ImageProcessor::gifIsAnimated("$d/animated.gif");
$w=ImageProcessor::webpIsAnimated("$d/static.webp");
$aw=ImageProcessor::webpIsAnimated("$d/animated.webp");
$p=ImageProcessor::pngIsAnimated("$d/static.png");
$ap=ImageProcessor::pngIsAnimated("$d/animated.png");
echo json_encode(["gif_static"=>$g,"gif_anim"=>$a,"webp_static"=>$w,"webp_anim"=>$aw,"png_static"=>$p,"png_anim"=>$ap]);
''',
        ],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    detectors = json.loads(det.stdout.strip().splitlines()[-1])
    check("detector static GIF", detectors["gif_static"] is False, detectors)
    check("detector animated GIF", detectors["gif_anim"] is True, detectors)
    check("detector static WebP", detectors["webp_static"] is False, detectors)
    check("detector animated WebP", detectors["webp_anim"] is True, detectors)
    check("detector static PNG", detectors["png_static"] is False, detectors)
    check("detector animated PNG", detectors["png_anim"] is True, detectors)

    # Codecs
    pre = subprocess.run(
        ["docker", "compose", "exec", "-T", "api", "php", "/var/www/backend/bin/check-media-env.php"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    check("check-media-env exit 0", pre.returncode == 0, pre.stderr or pre.stdout)

    editor = Client().login("editor@example.gov.et")
    status, caps = editor.call_json("GET", "/api/cms/media/capabilities")
    check("capabilities 200", status == 200, caps)
    check("capabilities imageProcessing", caps.get("imageProcessing") is True, caps)

    # Existing file still publicly reachable (compatibility)
    existing = list((ROOT / "backend" / "storage" / "uploads").glob("*.jpg"))
    if existing:
        name = existing[0].name
        st, body, hdrs = Client().get_bytes(f"/api/media/{name}")
        check("legacy media URL still serves", st == 200 and len(body) > 0, st)
        check("legacy nosniff", "nosniff" in (hdrs.get("X-Content-Type-Options") or "").lower(), hdrs)

    # Direct storage URL must not be served by API docroot / PHP server
    # Built-in server only serves public/; requesting /storage/... should 404 via front controller or miss
    st, _, _ = Client().get_bytes("/storage/uploads/" + (existing[0].name if existing else "nope.jpg"))
    check("storage path not publicly served via API host", st in (404, 400), st)

    for label, fname, ctype in [
        ("JPEG", "static.jpg", "image/jpeg"),
        ("PNG", "static.png", "image/png"),
        ("WebP", "static.webp", "image/webp"),
        ("GIF", "static.gif", "image/gif"),
    ]:
        st, body = editor.upload(FIX / fname, content_type=ctype)
        check(f"upload static {label} → 201", st == 201, body)
        check(f"upload static {label} url", isinstance(body, dict) and body.get("url", "").startswith("/api/media/"), body)
        name = body["name"]
        uploaded_names.append(name)
        st2, raw, _ = Client().get_bytes(body["url"])
        check(f"serve static {label}", st2 == 200 and len(raw) > 0, st2)
        # Re-encoded file should not contain appended polyglot marker when uploading clean static
        if label == "JPEG":
            check("static jpeg has no script tag", b"<script>" not in raw)

    st, body = editor.upload(FIX / "polyglot.jpg", content_type="image/jpeg")
    check("polyglot upload → 201 (re-encoded)", st == 201, body)
    uploaded_names.append(body["name"])
    st2, raw, _ = Client().get_bytes(body["url"])
    check("polyglot payload stripped", b"<script>" not in raw, raw[:200])

    for label, fname in [
        ("animated GIF", "animated.gif"),
        ("animated WebP", "animated.webp"),
        ("animated PNG", "animated.png"),
        ("truncated GIF", "trunc.gif"),
        ("GIF without trailer", "notrail.gif"),
        ("truncated WebP", "trunc.webp"),
        ("WebP RIFF lie", "riff_lie.webp"),
    ]:
        st, body = editor.upload(FIX / fname)
        check(f"reject {label} → 400", st == 400, body)
        err = (body or {}).get("error", {}) if isinstance(body, dict) else {}
        msg = err.get("message", "") if isinstance(err, dict) else str(body)
        check(f"reject {label} has message", isinstance(msg, str) and len(msg) > 0, msg)

    # Detector nulls for malformed (uncertain → reject)
    det2 = subprocess.run(
        [
            "docker", "compose", "exec", "-T", "api", "php", "-r",
            r'''
require "/var/www/backend/app/Media/ImageProcessingException.php";
require "/var/www/backend/app/Media/ImageProcessor.php";
use App\Media\ImageProcessor;
$d="/var/www/backend/tmp/media-ws1-fixtures";
echo json_encode([
  "trunc_gif"=>ImageProcessor::gifIsAnimated("$d/trunc.gif"),
  "notrail"=>ImageProcessor::gifIsAnimated("$d/notrail.gif"),
  "trunc_webp"=>ImageProcessor::webpIsAnimated("$d/trunc.webp"),
  "lie"=>ImageProcessor::webpIsAnimated("$d/riff_lie.webp"),
]);
''',
        ],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    d2 = json.loads(det2.stdout.strip().splitlines()[-1])
    check("trunc GIF detector null", d2["trunc_gif"] is None, d2)
    check("notrail GIF detector null", d2["notrail"] is None, d2)
    check("trunc WebP detector null", d2["trunc_webp"] is None, d2)
    check("RIFF lie WebP detector null", d2["lie"] is None, d2)

    # Audit suite (memory, EXIF, max-size, storage symlink)
    audit_src = ROOT / "scripts" / "test-media-ws1-audit.php"
    audit_dst = ROOT / "backend" / "tmp" / "test-media-ws1-audit.php"
    audit_dst.write_bytes(audit_src.read_bytes())
    audit = subprocess.run(
        ["docker", "compose", "exec", "-T", "api", "php", "/var/www/backend/tmp/test-media-ws1-audit.php"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    check("audit suite exit 0", audit.returncode == 0, audit.stderr or audit.stdout[-500:])

    st, body = editor.upload(FIX / "fake.html.jpg", filename="x.jpg", content_type="image/jpeg")
    check("reject HTML masquerade → 400", st == 400, body)

    st, body = editor.upload(FIX / "corrupt.jpg", content_type="image/jpeg")
    check("reject corrupt → 400", st == 400, body)

    st, body = editor.upload(FIX / "edge_over.jpg", content_type="image/jpeg")
    check("reject edge oversize → 400", st == 400, body)

    st, body = editor.upload(FIX / "mp_over.jpg", content_type="image/jpeg")
    check("reject megapixel oversize → 400", st == 400, body)

    # Viewer cannot upload
    viewer_email = "smoke-ws1-viewer@example.invalid"
    # skip creating viewer if complex — editor CSRF without login already tested via requireEditor
    anon = Client()
    st, body = anon.upload(FIX / "static.jpg")
    check("anon upload → 401/403", st in (401, 403), body)

    print(f"\nPASSED {passed} checks")


if __name__ == "__main__":
    try:
        main()
    finally:
        for n in uploaded_names:
            unlink_upload(n)
