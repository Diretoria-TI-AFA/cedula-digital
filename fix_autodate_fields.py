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

headers = {"Authorization": f"Bearer {token}", "User-Agent": user_agent, "Content-Type": "application/json"}

# Add autodate fields created and updated to collections: transactions, director_reports, club_memberships
cols_to_fix = ["transactions", "director_reports", "club_memberships", "cadets", "monthly_summaries", "scaer_config"]

for col_name in cols_to_fix:
    try:
        col_req = urllib.request.Request(f"https://cedula-scaer.pockethost.io/api/collections/{col_name}", headers=headers)
        with urllib.request.urlopen(col_req, context=ctx) as res:
            col = json.loads(res.read())
        
        field_names = [f.get("name") for f in col.get("fields", [])]
        updated = False
        
        if "created" not in field_names:
            col["fields"].append({
                "name": "created",
                "type": "autodate",
                "onCreate": True,
                "onUpdate": False
            })
            updated = True
            
        if "updated" not in field_names:
            col["fields"].append({
                "name": "updated",
                "type": "autodate",
                "onCreate": True,
                "onUpdate": True
            })
            updated = True
            
        if updated:
            patch_data = json.dumps({"fields": col["fields"]}).encode("utf-8")
            patch_req = urllib.request.Request(
                f"https://cedula-scaer.pockethost.io/api/collections/{col_name}",
                data=patch_data,
                headers=headers,
                method="PATCH"
            )
            with urllib.request.urlopen(patch_req, context=ctx) as patch_res:
                print(f"Collection {col_name} atualizada com autodate created/updated!")
        else:
            print(f"Collection {col_name} ja possui created/updated.")
    except Exception as e:
        print(f"Erro em {col_name}: {e}")

# Now re-test sort=-created on transactions
test_url = "https://cedula-scaer.pockethost.io/api/collections/transactions/records?sort=-created&perPage=5"
try:
    test_req = urllib.request.Request(test_url, headers=headers)
    with urllib.request.urlopen(test_req, context=ctx) as res:
        print("sort=-created FUNCIONOU com status 200!")
except urllib.error.HTTPError as e:
    print(f"sort=-created erro {e.code}: {e.read().decode('utf-8')}")
