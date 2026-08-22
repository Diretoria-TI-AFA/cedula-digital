import urllib.request
import urllib.parse
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

# 1. Superuser Auth
auth_url = "https://cedula-scaer.pockethost.io/api/collections/_superusers/auth-with-password"
data = json.dumps({"identity": "diretoriati.afa@gmail.com", "password": "Athos23!"}).encode("utf-8")
req = urllib.request.Request(auth_url, data=data, headers={"Content-Type": "application/json", "User-Agent": user_agent})
with urllib.request.urlopen(req, context=ctx) as res:
    super_token = json.loads(res.read())["token"]

super_headers = {"Authorization": f"Bearer {super_token}", "User-Agent": user_agent}

# 2. Get user jfm9ryue52pj54x
req_u = urllib.request.Request("https://cedula-scaer.pockethost.io/api/collections/users/records/jfm9ryue52pj54x", headers=super_headers)
with urllib.request.urlopen(req_u, context=ctx) as res:
    user_record = json.loads(res.read())
print("User Record:", user_record)

# 3. Test the exact URLs from the console
test_urls = [
    "https://cedula-scaer.pockethost.io/api/collections/director_reports/records?page=1&perPage=1000&skipTotal=1&sort=-created",
    "https://cedula-scaer.pockethost.io/api/collections/club_memberships/records?page=1&perPage=1000&skipTotal=1&sort=-created",
    "https://cedula-scaer.pockethost.io/api/collections/transactions/records?page=1&perPage=1000&skipTotal=1&sort=-created",
    "https://cedula-scaer.pockethost.io/api/collections/transactions/records?page=1&perPage=500&skipTotal=1",
    "https://cedula-scaer.pockethost.io/api/collections/director_reports/records?page=1&perPage=500&skipTotal=1",
    "https://cedula-scaer.pockethost.io/api/collections/club_memberships/records?page=1&perPage=500&skipTotal=1"
]

for url in test_urls:
    print(f"\nTesting URL: {url}")
    req_test = urllib.request.Request(url, headers=super_headers)
    try:
        with urllib.request.urlopen(req_test, context=ctx) as res:
            data_res = json.loads(res.read())
            print(f"-> SUCCESS (Status {res.status}) - items: {len(data_res.get('items', []))}")
    except urllib.error.HTTPError as e:
        print(f"-> ERROR {e.code}: {e.read().decode('utf-8')}")
