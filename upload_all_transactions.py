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
    
    encoded_data = json.dumps(data).encode("utf-8") if data else None
    
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
            with urllib.request.urlopen(req, context=ctx, timeout=60) as res:
                body = res.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait_time = 5 * (attempt + 1)
                print(f"[Rate Limit 429] Aguardando {wait_time}s antes de tentar novamente (tentativa {attempt+1}/{retries})...")
                time.sleep(wait_time)
            elif e.code >= 500:
                wait_time = 3 * (attempt + 1)
                print(f"[Server Error {e.code}] Aguardando {wait_time}s...")
                time.sleep(wait_time)
            else:
                err_body = e.read().decode("utf-8", errors="replace")
                print(f"[HTTP Error {e.code}] {url}: {err_body[:300]}")
                raise e
        except Exception as e:
            print(f"[Network Error] {e}, aguardando 3s...")
            time.sleep(3)
            
    raise Exception(f"Falha na requisição {method} {url} após {retries} tentativas.")

print("=" * 70)
print("INICIANDO MIGRAÇÃO COMPLETA DE LANÇAMENTOS PARA O POCKETHOST")
print("=" * 70)

# 1. Autenticação
print("\n1. Autenticando superuser no PocketHost...")
auth_res = make_request(
    f"{POCKETHOST_URL}/api/collections/_superusers/auth-with-password",
    method="POST",
    data={"identity": SUPERUSER_EMAIL, "password": SUPERUSER_PASS}
)
token = auth_res["token"]
print("Autenticado com sucesso!")

# 2. Carregar Usuários, Cadetes e Clubes
print("\n2. Carregando catálogo de usuários e clubes do servidor...")
users_res = make_request(f"{POCKETHOST_URL}/api/collections/users/records?perPage=1000", token=token)
users = users_res.get("items", [])

cadets_res = make_request(f"{POCKETHOST_URL}/api/collections/cadets/records?perPage=1000", token=token)
cadets = cadets_res.get("items", [])

clubs_res = make_request(f"{POCKETHOST_URL}/api/collections/clubs/records?perPage=100", token=token)
clubs = clubs_res.get("items", [])

print(f"- Usuários: {len(users)}")
print(f"- Cadetes: {len(cadets)}")
print(f"- Clubes: {len(clubs)}")

user_by_number = {}
for u in users:
    num = (u.get("cadetNumber") or "").strip()
    if num:
        user_by_number[num] = u
        user_by_number[num.replace("/", "")] = u

cadet_by_number = {}
for c in cadets:
    num = (c.get("cadetNumber") or "").strip()
    if num:
        cadet_by_number[num] = c
        cadet_by_number[num.replace("/", "")] = c

club_by_name = {}
for cl in clubs:
    name_clean = (cl.get("name") or "").strip().upper()
    club_by_name[name_clean] = cl

# 3. Ler e Estruturar os Lançamentos do CSV
print(f"\n3. Lendo e sanitizando arquivo oficial: {CSV_PATH}")
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

skipped_empty = 0

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
        skipped_empty += 1
        continue
    
    val_clean = val_raw.replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        amount = float(val_clean)
        if math.isnan(amount) or math.isinf(amount):
            skipped_empty += 1
            continue
    except:
        skipped_empty += 1
        continue
    
    amount = round(amount, 2)
    
    u_match = user_by_number.get(formatted_num) or user_by_number.get(clean_num)
    c_match = cadet_by_number.get(formatted_num) or cadet_by_number.get(clean_num)
    
    user_id = u_match["id"] if u_match else ""
    cadet_id = c_match["id"] if c_match else (user_id or "")
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
        "cadetId": cadet_id,
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

print(f"\n4. Processamento concluído:")
print(f"- Lançamentos válidos a enviar: {len(transactions_list)}")
print(f"- Linhas vazias/inválidas ignoradas: {skipped_empty}")
for per, trk in month_summaries_tracker.items():
    print(f"  - {per}: {trk['count']} lançamentos | {len(trk['cadets'])} cadetes | Total: R$ {trk['total']:,.2f}")

# 5. Enviar via PocketBase Batch API
BATCH_SIZE = 100
total_batches = (len(transactions_list) + BATCH_SIZE - 1) // BATCH_SIZE

print(f"\n5. Enviando {len(transactions_list)} lançamentos em {total_batches} lotes (Batch API)...")
start_time = time.time()
uploaded_count = 0
errors_count = 0

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
    
    try:
        make_request(
            f"{POCKETHOST_URL}/api/batch",
            method="POST",
            data={"requests": batch_reqs},
            token=token
        )
        uploaded_count += len(chunk)
    except Exception as e:
        print(f"[Falha no Lote {b_idx+1}] Tentando sub-envio item a item...")
        for item in chunk:
            try:
                make_request(
                    f"{POCKETHOST_URL}/api/collections/transactions/records",
                    method="POST",
                    data=item,
                    token=token
                )
                uploaded_count += 1
            except Exception as single_err:
                errors_count += 1
                print(f"Erro no item {item['cadetNumber']} ({item['description']}): {single_err}")
    
    pct = (uploaded_count / len(transactions_list)) * 100
    elapsed = time.time() - start_time
    rate = uploaded_count / elapsed if elapsed > 0 else 0
    
    if (b_idx + 1) % 20 == 0 or (b_idx + 1) == total_batches:
        print(f"[{pct:5.1f}%] Enviados {uploaded_count}/{len(transactions_list)} lançamentos (Lote {b_idx+1}/{total_batches}) - {rate:.0f} tx/s")
    
    time.sleep(0.08)

print(f"\nEnvio finalizado! {uploaded_count} registros gravados com sucesso ({errors_count} erros) em {time.time() - start_time:.1f}s.")

# 6. Atualizar os Resumos Mensais (monthly_summaries)
print("\n6. Consolidando resumos mensais na tabela 'monthly_summaries'...")
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
        print(f"  - Resumo de {period} atualizado!")
    else:
        make_request(
            f"{POCKETHOST_URL}/api/collections/monthly_summaries/records",
            method="POST",
            data=summary_data,
            token=token
        )
        print(f"  - Resumo de {period} criado!")

print("\n" + "=" * 70)
print("TODOS OS DADOS REAIS DE FEVEREIRO A AGOSTO ESTÃO NO POCKETHOST!")
print("=" * 70)
