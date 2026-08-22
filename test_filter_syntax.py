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

# Test query for a cadete user
req_u = urllib.request.Request("https://cedula-scaer.pockethost.io/api/collections/users/records?filter=(role='cadete')&perPage=1", headers=headers)
with urllib.request.urlopen(req_u, context=ctx) as res:
    cadet_user = json.loads(res.read())["items"][0]

print("Cadete testado:", cadet_user)

user_id = cadet_user.get("id")
num = cadet_user.get("cadetNumber") or ""
cleanNum = num.replace("/", "")
formattedNum = f"{cleanNum[:2]}/{cleanNum[2:]}" if len(cleanNum) == 5 else num
warName = cadet_user.get("warName") or ""

filter_parts = []
if user_id:
    filter_parts.append(f'userId="{user_id}"')
    filter_parts.append(f'cadetId="{user_id}"')
if num:
    filter_parts.append(f'cadetNumber="{num}"')
if cleanNum:
    filter_parts.append(f'cadetNumber="{cleanNum}"')
if formattedNum:
    filter_parts.append(f'cadetNumber="{formattedNum}"')
if warName:
    filter_parts.append(f'userName="{warName}"')
    filter_parts.append(f'cadetName="{warName}"')

pb_filter = " || ".join(filter_parts)
print("\nFilter gerado:", pb_filter)

encoded_filter = urllib.parse.quote(pb_filter)
url = f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter=({encoded_filter})&perPage=100"

try:
    req_tx = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req_tx, context=ctx) as res:
        res_data = json.loads(res.read())
        print(f"Sucesso! Total retornado: {res_data.get('totalItems')}")
except urllib.error.HTTPError as e:
    print(f"Erro HTTP {e.code}: {e.read().decode('utf-8')}")
