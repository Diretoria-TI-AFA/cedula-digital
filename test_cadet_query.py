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

auth_url = "https://cedula-scaer.pockethost.io/api/collections/_superusers/auth-with-password"
data = json.dumps({"identity": "diretoriati.afa@gmail.com", "password": "Athos23!"}).encode("utf-8")
req = urllib.request.Request(auth_url, data=data, headers={"Content-Type": "application/json", "User-Agent": user_agent})
with urllib.request.urlopen(req, context=ctx) as res:
    token = json.loads(res.read())["token"]

headers = {"Authorization": f"Bearer {token}", "User-Agent": user_agent}

# Test the cadet Felipe (23/236) filter
filter_query = '(userId="jfm9ryue52pj54x" || cadetId="jfm9ryue52pj54x" || cadetNumber="23/236" || cadetNumber="23236" || userName="FELIPE" || cadetName="FELIPE")'
encoded_filter = urllib.parse.quote(filter_query)

tests = [
    # 1. perPage 1000 (fails)
    f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&page=1&perPage=1000",
    # 2. perPage 500 without sort
    f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&page=1&perPage=500",
    # 3. perPage 500 with sort=-created
    f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&page=1&perPage=500&sort=-created",
    # 4. perPage 500 with sort=-billingPeriod
    f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&page=1&perPage=500&sort=-billingPeriod",
    # 5. perPage 200 with sort=-created
    f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&page=1&perPage=200&sort=-created",
]

for t in tests:
    print(f"\nTesting: {t}")
    try:
        req = urllib.request.Request(t, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as res:
            res_data = json.loads(res.read())
            print(f"-> SUCCESS (Status {res.status}) - items: {len(res_data.get('items', []))}, total: {res_data.get('totalItems')}")
            if res_data.get('items'):
                print("First item sample:", res_data['items'][0]['description'], res_data['items'][0]['amount'], res_data['items'][0]['billingPeriod'])
    except urllib.error.HTTPError as e:
        print(f"-> ERROR {e.code}: {e.read().decode('utf-8')}")
