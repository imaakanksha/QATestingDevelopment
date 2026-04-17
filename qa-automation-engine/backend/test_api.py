"""Quick API test script for the unified diff endpoint."""
import urllib.request
import urllib.error
import json
import io

# Read files
with open("../test_report_a.json", "rb") as f:
    data_a = f.read()
with open("../test_report_b.json", "rb") as f:
    data_b = f.read()

# Build multipart form data manually
boundary = b"----PythonFormBoundary7MA4YWxkTrZu0gW"
body = b""
body += b"--" + boundary + b"\r\n"
body += b'Content-Disposition: form-data; name="baseline"; filename="test_report_a.json"\r\n'
body += b"Content-Type: application/json\r\n\r\n"
body += data_a + b"\r\n"
body += b"--" + boundary + b"\r\n"
body += b'Content-Disposition: form-data; name="target"; filename="test_report_b.json"\r\n'
body += b"Content-Type: application/json\r\n\r\n"
body += data_b + b"\r\n"
body += b"--" + boundary + b"--\r\n"

req = urllib.request.Request(
    "http://localhost:8000/api/compare-json",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary.decode()}"},
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print("Status: 200")
        print("Mode:", result.get("mode"))
        print("Summary:", json.dumps(result.get("summary", {}), indent=2))
        rows = result.get("rows", [])
        print("Total rows:", len(rows))
        print()
        diff_rows = [r for r in rows if r["status"] != "identical"]
        print(f"Diff rows: {len(diff_rows)}")
        for r in diff_rows[:10]:
            sec = r["section"]
            item = r["item"]
            field = r["field"]
            va = r["report_a"]
            vb = r["report_b"]
            st = r["status"]
            print(f"  [{sec}] {item} / {field}: {va} -> {vb} ({st})")
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode()}")
