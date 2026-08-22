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

# 1. Obter 10 usuários reais da collection users
req_u = urllib.request.Request("https://cedula-scaer.pockethost.io/api/collections/users/records?perPage=10", headers=headers)
with urllib.request.urlopen(req_u, context=ctx) as res:
    users = json.loads(res.read())["items"]

print("Amostra de 10 Usuários em users:")
for u in users:
    print(f"ID={u.get('id')} | cadetNumber={repr(u.get('cadetNumber'))} | warName={repr(u.get('warName'))} | name={repr(u.get('name'))} | email={repr(u.get('email'))} | role={repr(u.get('role'))}")

# 2. Obter 10 transações em transactions
req_t = urllib.request.Request("https://cedula-scaer.pockethost.io/api/collections/transactions/records?perPage=10", headers=headers)
with urllib.request.urlopen(req_t, context=ctx) as res:
    txs = json.loads(res.read())["items"]

print("\nAmostra de 10 Transações em transactions:")
for t in txs:
    print(f"cadetNumber={repr(t.get('cadetNumber'))} | userId={repr(t.get('userId'))} | cadetId={repr(t.get('cadetId'))} | userName={repr(t.get('userName'))} | amount={t.get('amount')} | period={t.get('billingPeriod')}")
