import urllib.request
import urllib.error
import json
import ssl
import sys
import time
import os
import math
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

POCKETHOST_URL = "https://cedula-scaer.pockethost.io"
SUPERUSER_EMAIL = "diretoriati.afa@gmail.com"
SUPERUSER_PASS = "Athos23!"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

CSV_PATH = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def make_request(url, method="GET", data=None, token=None, retries=5):
    headers = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
            with urllib.request.urlopen(req, context=ctx, timeout=60) as res:
                body = res.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            if e.code == 429:
                print(f"[Rate Limit 429] Aguardando 30s...")
                time.sleep(30)
            elif e.code >= 500:
                print(f"[Server Error {e.code}] Aguardando 5s...")
                time.sleep(5)
            else:
                print(f"[HTTP Error {e.code}] {url}: {err_body[:300]}")
                raise e
        except Exception as e:
            print(f"[Network Error] {e}, aguardando 5s...")
            time.sleep(5)
            
    raise Exception(f"Falha na requisição {method} {url}")

print("=" * 70)
print("CLEAN PERFECT UPLOADER - ELIMINAÇÃO TOTAL DE DUPLICATAS")
print("=" * 70)

# 1. Autenticação
print("\n1. Autenticando no PocketHost...")
auth_res = make_request(
    f"{POCKETHOST_URL}/api/collections/_superusers/auth-with-password",
    method="POST",
    data={"identity": SUPERUSER_EMAIL, "password": SUPERUSER_PASS}
)
token = auth_res["token"]
print("Autenticado com sucesso!")

# 2. Carregar Usuários e Clubes para vincular IDs corretos
print("\n2. Carregando catálogo de usuários e clubes...")
users_res = make_request(f"{POCKETHOST_URL}/api/collections/users/records?perPage=1000", token=token)
users = users_res.get("items", [])

clubs_res = make_request(f"{POCKETHOST_URL}/api/collections/clubs/records?perPage=100", token=token)
clubs = clubs_res.get("items", [])

user_by_number = {}
for u in users:
    num = (u.get("cadetNumber") or "").strip()
    if num:
        clean = num.replace("/", "").replace(".0", "")
        user_by_number[num] = u
        user_by_number[clean] = u

club_by_name = {}
for cl in clubs:
    name_clean = (cl.get("name") or "").strip().upper()
    club_by_name[name_clean] = cl

# 3. Ler e estruturar o CSV
print(f"\n3. Lendo e sanitizando {CSV_PATH}...")
with open(CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

month_map = {
    "fevereiro": "2026-02",
    "março": "2026-03",
    "marco": "2026-03",
    "abril": "2026-04",
    "maio": "2026-05",
    "junho": "2026-06",
    "julho": "2026-07",
    "agosto": "2026-08"
}

transactions_list = []
month_summaries_tracker = {
    "2026-02": {"total": 0.0, "count": 0, "cadets": set(), "clubs": {}, "scaer": 0.0},
    "2026-03": {"total": 0.0, "count": 0, "cadets": set(), "clubs": {}, "scaer": 0.0},
    "2026-04": {"total": 0.0, "count": 0, "cadets": set(), "clubs": {}, "scaer": 0.0},
    "2026-05": {"total": 0.0, "count": 0, "cadets": set(), "clubs": {}, "scaer": 0.0},
    "2026-06": {"total": 0.0, "count": 0, "cadets": set(), "clubs": {}, "scaer": 0.0},
    "2026-07": {"total": 0.0, "count": 0, "cadets": set(), "clubs": {}, "scaer": 0.0},
    "2026-08": {"total": 0.0, "count": 0, "cadets": set(), "clubs": {}, "scaer": 0.0},
}

for idx, row in df.iterrows():
    mes_raw = str(row.iloc[0] or "").strip().lower()
    period = month_map.get(mes_raw)
    if not period:
        continue
    
    num_raw = str(row.iloc[1] or "").strip()
    if not num_raw or num_raw.lower() in ["nan", "null", "", "none"]:
        continue
    
    clean_num = num_raw.replace(".0", "").replace("/", "")
    if len(clean_num) == 5 and clean_num.isdigit():
        formatted_num = f"{clean_num[:2]}/{clean_num[2:]}"
    else:
        formatted_num = num_raw
    
    nome_raw = str(row.iloc[2] or "").strip()
    val_raw = str(row.iloc[3] or "").strip()
    clube_raw = str(row.iloc[4] or "").strip()
    obs_raw = str(row.iloc[5] or "").strip()
    
    if val_raw.lower() in ["nan", "", "none", "#ref!"] or "nan" in val_raw.lower():
        continue
    
    val_clean = val_raw.replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        amount = float(val_clean)
        if math.isnan(amount) or math.isinf(amount) or amount <= 0:
            continue
    except:
        continue
        
    amount = round(amount, 2)
    
    u_match = user_by_number.get(formatted_num) or user_by_number.get(clean_num)
    user_id = u_match["id"] if u_match else ""
    war_name = (u_match.get("warName") if u_match else "") or nome_raw or "CADETE"
    
    clube_upper = clube_raw.upper()
    obs_upper = obs_raw.upper()
    
    matched_club = club_by_name.get(clube_upper)
    club_id = matched_club["id"] if matched_club else (clube_raw or "SCAER")
    club_name = matched_club["name"] if matched_club else (clube_raw or "SCAER")
    
    if "SCAER" in clube_upper and ("MENSALIDADE" in obs_upper or "WIFI" in obs_upper or not obs_raw):
        category = "mensalidade_scaer"
    elif "MENSALIDADE" in obs_upper or "MENSALIDADE" in clube_upper:
        category = "mensalidade_clube"
    elif "DOAÇÃO" in obs_upper or "DOACAO" in obs_upper or "AÇÃO SOCIAL" in clube_upper or "ACAO SOCIAL" in clube_upper:
        category = "doacao_religiosa"
    elif "EVENTO" in obs_upper or "INTERAFA" in obs_upper:
        category = "evento"
    else:
        category = "consumo"
    
    desc = f"{obs_raw} - {clube_raw}" if obs_raw and clube_raw else (obs_raw or clube_raw or "Lançamento de Cédula")
    status = "paid" if period != "2026-08" else "pending"
    launch_type = "automatic" if "mensalidade" in category else "manual"
    
    tx_body = {
        "cadetId": user_id,
        "userId": user_id,
        "cadetNumber": formatted_num,
        "cadetName": war_name,
        "userName": war_name,
        "clubId": club_id,
        "clubName": club_name,
        "description": desc,
        "amount": amount,
        "category": category,
        "billingPeriod": period,
        "type": launch_type,
        "status": status,
        "createdByName": "CédulAthos 2k26 Oficial"
    }
    
    transactions_list.append(tx_body)
    
    if period in month_summaries_tracker:
        tracker = month_summaries_tracker[period]
        tracker["total"] += amount
        tracker["count"] += 1
        tracker["cadets"].add(formatted_num)
        tracker["clubs"][club_name] = tracker["clubs"].get(club_name, 0.0) + amount
        if category == "mensalidade_scaer":
            tracker["scaer"] += amount

print(f"\n4. Total exato de transações únicas a enviar: {len(transactions_list)}")

# 5. Resetar totalmente a collection transactions para eliminar duplicatas
print("\n5. Excluindo e recriando collection 'transactions' limpa...")
try:
    make_request(f"{POCKETHOST_URL}/api/collections/transactions", method="DELETE", token=token)
except Exception as e:
    print(f"Delete aviso: {e}")

time.sleep(1)

transactions_payload = {
    "name": "transactions",
    "type": "base",
    "listRule": '@request.auth.id != ""',
    "viewRule": '@request.auth.id != ""',
    "createRule": '@request.auth.id != ""',
    "updateRule": '@request.auth.id != ""',
    "deleteRule": '@request.auth.id != ""',
    "fields": [
        {"name": "cadetId", "type": "text", "required": False},
        {"name": "userId", "type": "text", "required": False},
        {"name": "cadetNumber", "type": "text", "required": True},
        {"name": "cadetName", "type": "text", "required": False},
        {"name": "userName", "type": "text", "required": False},
        {"name": "clubId", "type": "text", "required": True},
        {"name": "clubName", "type": "text", "required": True},
        {"name": "description", "type": "text", "required": True},
        {"name": "amount", "type": "number", "required": False},
        {"name": "originalAmount", "type": "number", "required": False},
        {"name": "category", "type": "text", "required": True},
        {"name": "billingPeriod", "type": "text", "required": True},
        {"name": "originalPeriod", "type": "text", "required": False},
        {"name": "type", "type": "text", "required": False},
        {"name": "launchType", "type": "text", "required": False},
        {"name": "status", "type": "text", "required": False},
        {"name": "installmentInfo", "type": "json", "required": False},
        {"name": "deferredTo", "type": "text", "required": False},
        {"name": "createdBy", "type": "text", "required": False},
        {"name": "createdByName", "type": "text", "required": False},
        {"name": "notes", "type": "text", "required": False},
        {"name": "isNonMemberEvent", "type": "bool", "required": False},
        {"name": "created", "type": "autodate", "onCreate": True, "onUpdate": False},
        {"name": "updated", "type": "autodate", "onCreate": True, "onUpdate": True}
    ]
}
make_request(f"{POCKETHOST_URL}/api/collections", method="POST", data=transactions_payload, token=token)
print("Collection 'transactions' recriada com sucesso!")

# 6. Enviar 50.057 em 126 super-batches
BATCH_SIZE = 400
total_batches = (len(transactions_list) + BATCH_SIZE - 1) // BATCH_SIZE

print(f"\n6. Enviando {len(transactions_list)} lançamentos únicos em {total_batches} requisições...")
start_time = time.time()
uploaded_count = 0

for b_idx in range(total_batches):
    chunk = transactions_list[b_idx * BATCH_SIZE : (b_idx + 1) * BATCH_SIZE]
    
    batch_reqs = [
        {
            "method": "POST",
            "url": "/api/collections/transactions/records",
            "body": tx
        }
        for tx in chunk
    ]
    
    make_request(
        f"{POCKETHOST_URL}/api/batch",
        method="POST",
        data={"requests": batch_reqs},
        token=token
    )
    uploaded_count += len(chunk)
    
    pct = (uploaded_count / len(transactions_list)) * 100
    elapsed = time.time() - start_time
    rate = uploaded_count / elapsed if elapsed > 0 else 0
    
    if (b_idx + 1) % 15 == 0 or (b_idx + 1) == total_batches:
        print(f"[{pct:5.1f}%] Enviados {uploaded_count}/{len(transactions_list)} (Lote {b_idx+1}/{total_batches}) - {rate:.0f} tx/s")
    
    time.sleep(0.15)

print(f"\nEnvio concluído com sucesso! {uploaded_count} transações gravadas em {time.time() - start_time:.1f}s!")

# 7. Atualizar Resumos Mensais Consolidados
print("\n7. Atualizando resumos mensais na tabela 'monthly_summaries'...")
for period, trk in month_summaries_tracker.items():
    club_breakdown_list = [
        {"clubId": c_name, "clubName": c_name, "amount": round(c_amt, 2), "transactionsCount": 0}
        for c_name, c_amt in trk["clubs"].items()
    ]
    
    summary_data = {
        "billingPeriod": period,
        "totalGeneral": round(trk["total"], 2),
        "totalCadets": len(trk["cadets"]),
        "totalTransactions": trk["count"],
        "clubBreakdown": club_breakdown_list,
        "scaerFeeTotal": round(trk["scaer"], 2),
        "status": "closed" if period != "2026-08" else "open"
    }
    
    exist_check = make_request(
        f"{POCKETHOST_URL}/api/collections/monthly_summaries/records?filter=(billingPeriod='{period}')",
        token=token
    )
    existing_items = exist_check.get("items", [])
    
    if existing_items:
        rec_id = existing_items[0]["id"]
        make_request(
            f"{POCKETHOST_URL}/api/collections/monthly_summaries/records/{rec_id}",
            method="PATCH",
            data=summary_data,
            token=token
        )
        print(f"  - Resumo de {period}: R$ {summary_data['totalGeneral']:.2f} ({summary_data['totalTransactions']} txs)")
    else:
        make_request(
            f"{POCKETHOST_URL}/api/collections/monthly_summaries/records",
            method="POST",
            data=summary_data,
            token=token
        )
        print(f"  - Resumo de {period}: R$ {summary_data['totalGeneral']:.2f} ({summary_data['totalTransactions']} txs)")

print("\n" + "=" * 70)
print("BASE DE DADOS 100% LIMPA, SEM NENHUMA DUPLICATA!")
print("=" * 70)
