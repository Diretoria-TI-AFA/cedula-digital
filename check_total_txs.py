import urllib.request
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

headers = {"Authorization": f"Bearer {token}", "User-Agent": user_agent, "Content-Type": "application/json"}

# Check total transactions currently
req_t = urllib.request.Request("https://cedula-scaer.pockethost.io/api/collections/transactions/records?perPage=1", headers=headers)
with urllib.request.urlopen(req_t, context=ctx) as res:
    print("Total atual de transações no PocketHost:", json.loads(res.read())["totalItems"])
