import urllib.request
import urllib.parse
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

user_agent = "Mozilla/5.0"

auth_url = "https://cedula-scaer.pockethost.io/api/collections/_superusers/auth-with-password"
data = json.dumps({"identity": "diretoriati.afa@gmail.com", "password": "Athos23!"}).encode("utf-8")
req = urllib.request.Request(auth_url, data=data, headers={"Content-Type": "application/json", "User-Agent": user_agent})
with urllib.request.urlopen(req, context=ctx) as res:
    token = json.loads(res.read())["token"]

headers = {"Authorization": f"Bearer {token}", "User-Agent": user_agent}

filter_query = '(userId="jfm9ryue52pj54x" || cadetId="jfm9ryue52pj54x" || cadetNumber="23/236" || cadetNumber="23236" || userName="FELIPE" || cadetName="FELIPE")'
encoded_filter = urllib.parse.quote(filter_query)
url = f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&perPage=500&sort=-billingPeriod"

req_t = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req_t, context=ctx) as res:
    items = json.loads(res.read())["items"]
    print(f"Total de lançamentos de 23/236 (FELIPE): {len(items)}")
    months = {}
    for it in items:
        m = it["billingPeriod"]
        months[m] = months.get(m, 0.0) + it["amount"]
    for m in sorted(months.keys()):
        print(f"  * Mês {m}: R$ {months[m]:.2f}")
