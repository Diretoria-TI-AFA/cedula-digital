import urllib.request
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

# Get cadete users with role="cadete"
req_u = urllib.request.Request("https://cedula-scaer.pockethost.io/api/collections/users/records?filter=(role='cadete')&perPage=5", headers=headers)
with urllib.request.urlopen(req_u, context=ctx) as res:
    users = json.loads(res.read())["items"]

print("Amostra de 5 Cadetes:")
for u in users:
    print(f"- ID: {u.get('id')} | Num: {u.get('cadetNumber')} | Guerra: {u.get('warName')} | Nome: {u.get('name')}")

u1 = users[0]
num1 = u1.get('cadetNumber')
print(f"\nBuscando transações do cadete {num1} ({u1.get('warName')}):")

clean_num = num1.replace('/', '') if num1 else ''
formatted_num = f"{clean_num[:2]}/{clean_num[2:]}" if len(clean_num) == 5 else clean_num

filter_query = f'(cadetNumber="{num1}" || cadetNumber="{clean_num}" || cadetNumber="{formatted_num}" || userId="{u1.get("id")}")'
encoded_filter = urllib.parse.quote(filter_query)

req_tx = urllib.request.Request(f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&perPage=500", headers=headers)
with urllib.request.urlopen(req_tx, context=ctx) as res:
    txs_data = json.loads(res.read())
    txs = txs_data.get("items", [])
    print(f"Total de transações encontradas: {len(txs)}")
    
    by_month = {}
    for t in txs:
        m = t.get("billingPeriod")
        by_month[m] = by_month.get(m, 0.0) + float(t.get("amount", 0))
    
    for m in sorted(by_month.keys()):
        print(f"  * Mês {m}: Total = R$ {by_month[m]:.2f}")
