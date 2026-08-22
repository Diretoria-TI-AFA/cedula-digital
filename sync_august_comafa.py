import pypdf
import re
import json
import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

POCKETHOST_URL = "https://cedula-scaer.pockethost.io"
SUPERUSER_EMAIL = "diretoriati.afa@gmail.com"
SUPERUSER_PASS = "Athos23!"
USER_AGENT = "Mozilla/5.0"

pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"
reader = pypdf.PdfReader(pdf_path)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Autenticação
print("1. Autenticando no PocketHost...")
auth_data = json.dumps({"identity": SUPERUSER_EMAIL, "password": SUPERUSER_PASS}).encode("utf-8")
req_auth = urllib.request.Request(
    f"{POCKETHOST_URL}/api/collections/_superusers/auth-with-password",
    data=auth_data,
    headers={"Content-Type": "application/json", "User-Agent": USER_AGENT}
)
with urllib.request.urlopen(req_auth, context=ctx) as res:
    token = json.loads(res.read())["token"]

headers = {"Authorization": f"Bearer {token}", "User-Agent": USER_AGENT, "Content-Type": "application/json"}

# 2. Obter catálogo de usuários
print("2. Carregando catálogo de usuários...")
req_u = urllib.request.Request(f"{POCKETHOST_URL}/api/collections/users/records?perPage=1000", headers=headers)
with urllib.request.urlopen(req_u, context=ctx) as res:
    users = json.loads(res.read())["items"]

user_by_number = {}
for u in users:
    num = (u.get("cadetNumber") or "").strip()
    if num:
        clean = num.replace("/", "").replace(".0", "")
        user_by_number[num] = u
        user_by_number[clean] = u

# 3. Extrair todos os lançamentos de COMAFA ATHOS de Agosto do PDF
print("3. Extraindo COMAFA ATHOS de Agosto do PDF...")
comafa_entries = []

# Varre todas as páginas de cédulas de Agosto (páginas 860 a 930)
for p_idx in range(850, 940):
    text = reader.pages[p_idx].extract_text() or ""
    # Padrão: Agosto(23/\d{3})\s*([A-Za-zÀ-ÿ\s]+?)\s*\(R\$\s*([\d\.,]+)\)\s*COMAFA\s*ATHOS\s*TOTAL
    # Ou com espaços
    matches = re.finditer(r'Agosto\s*(23/\d{3})\s*([A-Za-zÀ-ÿ\s]+?)\(R\$\s*([\d\.,]+)\)\s*COMAFA\s*ATHOS\s*TOTAL', text, re.IGNORECASE)
    for m in matches:
        cadet_num = m.group(1).strip()
        name = m.group(2).strip()
        amt_str = m.group(3).strip().replace('.', '').replace(',', '.')
        try:
            amt = float(amt_str)
            if amt > 0:
                comafa_entries.append({
                    "cadetNumber": cadet_num,
                    "cadetName": name,
                    "amount": round(amt, 2),
                    "page": p_idx + 1
                })
        except:
            pass

print(f"Total de lançamentos de COMAFA ATHOS encontrados no PDF: {len(comafa_entries)}")
for it in comafa_entries:
    if it["cadetNumber"] == "23/236":
        print(f"-> FELIPE 23/236: R$ {it['amount']:.2f}")

# 4. Enviar em lote para o PocketHost
print("\n4. Gravando lançamentos faltantes de COMAFA ATHOS no PocketHost...")
batch_reqs = []
for it in comafa_entries:
    u_match = user_by_number.get(it["cadetNumber"])
    user_id = u_match["id"] if u_match else ""
    war_name = (u_match.get("warName") if u_match else "") or it["cadetName"]
    
    tx_body = {
        "cadetId": user_id,
        "userId": user_id,
        "cadetNumber": it["cadetNumber"],
        "cadetName": war_name,
        "userName": war_name,
        "clubId": "COMAFA ATHOS",
        "clubName": "COMAFA ATHOS",
        "description": "TOTAL - COMAFA ATHOS",
        "amount": it["amount"],
        "category": "consumo",
        "billingPeriod": "2026-08",
        "type": "manual",
        "status": "pending",
        "createdByName": "CédulAthos 2k26 Oficial (PDF)"
    }
    batch_reqs.append({
        "method": "POST",
        "url": "/api/collections/transactions/records",
        "body": tx_body
    })

if batch_reqs:
    batch_data = json.dumps({"requests": batch_reqs}).encode("utf-8")
    req_batch = urllib.request.Request(
        f"{POCKETHOST_URL}/api/batch",
        data=batch_data,
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(req_batch, context=ctx) as res:
        print(f"Sucesso! {len(batch_reqs)} lançamentos gravados via batch!")

# 5. Re-calcular resumo de Agosto
print("\n5. Recalculando resumo mensal de 2026-08...")
req_aug = urllib.request.Request(
    f"{POCKETHOST_URL}/api/collections/transactions/records?filter=(billingPeriod='2026-08')&perPage=500",
    headers=headers
)
with urllib.request.urlopen(req_aug, context=ctx) as res:
    aug_txs = json.loads(res.read())

total_aug = 0.0
cadets_aug = set()
for t in aug_txs.get("items", []):
    total_aug += t.get("amount", 0.0)
    cadets_aug.add(t.get("cadetNumber"))

print(f"Novo Total Geral de Agosto: R$ {total_aug:.2f} ({aug_txs.get('totalItems')} transações)")

# Test Felipe 23/236 final sum
req_felipe = urllib.request.Request(
    f"{POCKETHOST_URL}/api/collections/transactions/records?filter=(cadetNumber='23/236')&perPage=500",
    headers=headers
)
with urllib.request.urlopen(req_felipe, context=ctx) as res:
    fel_items = json.loads(res.read())["items"]

print(f"\nExtrato Final de 23/236 (FELIPE) em Agosto:")
aug_felipe_sum = 0.0
for it in fel_items:
    if it["billingPeriod"] == "2026-08":
        aug_felipe_sum += it["amount"]
        print(f"  - R$ {it['amount']:6.2f} | {it['clubName']} | {it['description']}")

print(f"\n=======================================================")
print(f"TOTAL FINAL DE FELIPE EM AGOSTO: R$ {aug_felipe_sum:.2f}")
print(f"=======================================================")
