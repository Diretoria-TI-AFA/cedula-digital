"""
Script Autônomo de Faturamento Mensal e Consolidação do Dia 20
Cédula Digital SCAER - AFA

Pode ser executado via Windows Task Scheduler (diariamente ou todo dia 20 às 23:59)
ou chamado como rotina autônoma de background.
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import ssl
import sys
import os
import time
import datetime
import re

sys.stdout.reconfigure(encoding='utf-8')

POCKETHOST_URL = os.environ.get("POCKETBASE_URL", "https://cedula-scaer.pockethost.io")
SUPERUSER_EMAIL = os.environ.get("SUPERUSER_EMAIL", "diretoriati.afa@gmail.com")
SUPERUSER_PASS = os.environ.get("SUPERUSER_PASS", "Athos23!")
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

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
            with urllib.request.urlopen(req, context=ctx, timeout=45) as res:
                body = res.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            if e.code == 429:
                match = re.search(r"retry after (\d+) seconds", err_body)
                wait_time = int(match.group(1)) + 5 if match else 20 * (attempt + 1)
                print(f"[Rate Limit 429] Aguardando {wait_time}s...")
                time.sleep(wait_time)
            elif e.code >= 500:
                time.sleep(5 * (attempt + 1))
            else:
                print(f"[HTTP Error {e.code}] {url}: {err_body[:300]}")
                raise e
        except Exception as e:
            time.sleep(5)
            
    raise Exception(f"Falha na requisição {method} {url} após {retries} tentativas.")

def get_next_period(period_str):
    parts = period_str.split('-')
    year = int(parts[0])
    month = int(parts[1])
    if month == 12:
        return f"{year + 1}-01"
    return f"{year}-{month + 1:02d}"

def run_auto_billing():
    now = datetime.datetime.now()
    today_str = now.strftime('%Y-%m-%d %H:%M:%S')
    current_calendar_period = now.strftime('%Y-%m')
    day_of_month = now.day

    print(f"==================================================")
    print(f"ROBÔ DE FATURAMENTO AUTÔNOMO SCAER - {today_str}")
    print(f"Data: Dia {day_of_month} | Período Calendário: {current_calendar_period}")
    print(f"==================================================")

    # 1. Autenticação Superuser
    print("1. Conectando ao PocketBase...")
    auth_res = make_request(
        f"{POCKETHOST_URL}/api/collections/_superusers/auth-with-password",
        method="POST",
        data={"identity": SUPERUSER_EMAIL, "password": SUPERUSER_PASS}
    )
    token = auth_res["token"]
    print("Autenticado com sucesso!")

    # 2. Ler scaer_config
    configs = make_request(f"{POCKETHOST_URL}/api/collections/scaer_config/records", token=token)
    if not configs.get("items"):
        print("Erro: scaer_config não encontrado no banco.")
        return
    config = configs["items"][0]
    config_id = config["id"]
    current_config_period = config.get("currentBillingPeriod", current_calendar_period)
    scaer_fee = float(config.get("scaerMonthlyFee", 28.0))
    next_period = get_next_period(current_config_period)

    print(f"Período Atual no Banco: {current_config_period}")
    print(f"Próximo Período: {next_period}")

    if current_calendar_period > current_config_period:
        print(f"Avançando período no scaer_config para {current_calendar_period}...")
        make_request(
            f"{POCKETHOST_URL}/api/collections/scaer_config/records/{config_id}",
            method="PATCH",
            data={"currentBillingPeriod": current_calendar_period},
            token=token
        )
        current_config_period = current_calendar_period
        next_period = get_next_period(current_config_period)

    # 3. Regra do Dia 20
    if day_of_month >= 20:
        print(f"\n[REGRA DIA 20 ATIVADA] Consolidando lançamentos de {next_period} em definitivo...")
        
        mems_res = make_request(f"{POCKETHOST_URL}/api/collections/club_memberships/records?perPage=1000", token=token)
        mems = mems_res.get("items", [])
        for m in mems:
            m_status = m.get("status")
            eff = m.get("effectiveFrom", "")
            if m_status == "pending_entry" and (not eff or eff <= next_period):
                make_request(f"{POCKETHOST_URL}/api/collections/club_memberships/records/{m['id']}", method="PATCH", data={"status": "active"}, token=token)
            elif m_status == "pending_exit" and (not eff or eff <= next_period):
                make_request(f"{POCKETHOST_URL}/api/collections/club_memberships/records/{m['id']}", method="PATCH", data={"status": "exited"}, token=token)

        preview_txs = []
        page = 1
        while True:
            res = make_request(f"{POCKETHOST_URL}/api/collections/transactions/records?page={page}&perPage=500&filter=(billingPeriod='{next_period}'%20%26%26%20status='preview')", token=token)
            preview_txs.extend(res.get("items", []))
            if page >= res.get("totalPages", 1):
                break
            page += 1

        print(f"Transações 'preview' a consolidar em {next_period}: {len(preview_txs)}")
        if preview_txs:
            batch_size = 100
            for i in range(0, len(preview_txs), batch_size):
                chunk = preview_txs[i:i + batch_size]
                batch_reqs = [
                    {
                        "method": "PATCH",
                        "url": f"/api/collections/transactions/records/{tx['id']}",
                        "body": {
                            "status": "pending",
                            "description": tx.get("description", "").replace(" (Prévia)", "")
                        }
                    }
                    for tx in chunk
                ]
                make_request(f"{POCKETHOST_URL}/api/batch", method="POST", data={"requests": batch_reqs}, token=token)
                time.sleep(1.0)
            print(f"Consolidação de {next_period} concluída com sucesso!")

        update_summary(next_period, token)

        m2_period = get_next_period(next_period)
        generate_previews_for_period(m2_period, token, scaer_fee)

    else:
        print(f"\n[PRÉVIA ANTES DO DIA 20] Garantindo lançamentos provisórios para {next_period}...")
        generate_previews_for_period(next_period, token, scaer_fee)

    print("\nExecução autônoma finalizada com êxito!")

def generate_previews_for_period(period, token, scaer_fee):
    chk = make_request(f"{POCKETHOST_URL}/api/collections/transactions/records?perPage=1&filter=billingPeriod%3D%22{period}%22", token=token)
    if chk.get("totalItems", 0) > 0:
        print(f"Período {period} já possui {chk['totalItems']} transações. Nenhuma ação necessária.")
        return

    print(f"Gerando prévias provisórias para {period}...")
    cadets = []
    p = 1
    while True:
        r = make_request(f"{POCKETHOST_URL}/api/collections/cadets/records?page={p}&perPage=200", token=token)
        cadets.extend(r.get("items", []))
        if p >= r.get("totalPages", 1):
            break
        p += 1

    clubs_res = make_request(f"{POCKETHOST_URL}/api/collections/clubs/records?perPage=100", token=token)
    clubs_by_id = {c["id"]: c for c in clubs_res.get("items", [])}
    clubs_by_name = {c.get("name", "").strip(): c for c in clubs_res.get("items", [])}

    memberships = []
    p = 1
    while True:
        r = make_request(f"{POCKETHOST_URL}/api/collections/club_memberships/records?page={p}&perPage=200", token=token)
        memberships.extend(r.get("items", []))
        if p >= r.get("totalPages", 1):
            break
        p += 1

    mems_by_cadet = {}
    for m in memberships:
        u_id = m.get("userId")
        c_num = m.get("cadetNumber")
        if u_id:
            mems_by_cadet.setdefault(u_id, []).append(m)
        if c_num and c_num != u_id:
            mems_by_cadet.setdefault(c_num, []).append(m)

    txs_to_create = []
    for c in cadets:
        cid = c["id"]
        cnum = c.get("cadetNumber", "")
        cname = c.get("warName") or c.get("name") or "Cadete"

        txs_to_create.append({
            "cadetId": cid,
            "userId": cid,
            "cadetNumber": cnum,
            "cadetName": cname,
            "userName": cname,
            "clubId": "SCAER",
            "clubName": "SCAER",
            "description": "Mensalidade SCAER (Prévia)",
            "amount": scaer_fee,
            "category": "mensalidade_scaer",
            "billingPeriod": period,
            "type": "automatic",
            "status": "preview",
            "createdBy": "system",
            "createdByName": "Sistema SCAER",
        })

        cmems = mems_by_cadet.get(cid, []) or mems_by_cadet.get(cnum, [])
        for m in cmems:
            st = m.get("status")
            if st == "pending_exit" and m.get("effectiveFrom", "") <= period:
                continue
            if st in ("active", "approved", "pending_entry"):
                club_id = m.get("clubId")
                c_obj = clubs_by_id.get(club_id) or clubs_by_name.get(m.get("clubName", ""))
                fee = float(c_obj.get("monthlyFee", 0.0) if c_obj else 0.0)
                if fee > 0:
                    cname_cl = c_obj.get("name") if c_obj else (m.get("clubName") or "Clube")
                    txs_to_create.append({
                        "cadetId": cid,
                        "userId": cid,
                        "cadetNumber": cnum,
                        "cadetName": cname,
                        "userName": cname,
                        "clubId": club_id or cname_cl,
                        "clubName": cname_cl,
                        "description": f"Mensalidade {cname_cl} (Prévia)",
                        "amount": fee,
                        "category": "mensalidade_clube",
                        "billingPeriod": period,
                        "type": "automatic",
                        "status": "preview",
                        "createdBy": "system",
                        "createdByName": "Sistema SCAER",
                    })

            notes = m.get("notes", "")
            if "Doação Mensal" in notes and st in ("active", "approved"):
                m_match = re.search(r"R\$\s*([\d,.]+)", notes)
                if m_match:
                    don_val = float(m_match.group(1).replace(",", "."))
                    if don_val > 0:
                        cname_rel = m.get("clubName", "Culto Religioso")
                        txs_to_create.append({
                            "cadetId": cid,
                            "userId": cid,
                            "cadetNumber": cnum,
                            "cadetName": cname,
                            "userName": cname,
                            "clubId": m.get("clubId") or cname_rel,
                            "clubName": cname_rel,
                            "description": f"Doação Mensal - {cname_rel} (Prévia)",
                            "amount": don_val,
                            "category": "doacao_religiosa",
                            "billingPeriod": period,
                            "type": "recurring",
                            "status": "preview",
                            "createdBy": cid,
                            "createdByName": cname,
                        })

    print(f"Enviando {len(txs_to_create)} transações em lote...")
    batch_size = 100
    for i in range(0, len(txs_to_create), batch_size):
        chunk = txs_to_create[i:i + batch_size]
        batch_reqs = [{"method": "POST", "url": "/api/collections/transactions/records", "body": tx} for tx in chunk]
        make_request(f"{POCKETHOST_URL}/api/batch", method="POST", data={"requests": batch_reqs}, token=token)
        time.sleep(1.2)
    print(f"Geração de prévias para {period} concluída!")
    update_summary(period, token)

def update_summary(period, token):
    all_period_txs = []
    p = 1
    while True:
        r = make_request(f"{POCKETHOST_URL}/api/collections/transactions/records?page={p}&perPage=500&filter=billingPeriod%3D%22{period}%22", token=token)
        all_period_txs.extend(r.get("items", []))
        if p >= r.get("totalPages", 1):
            break
        p += 1
    
    total_general = sum(t.get("amount", 0.0) for t in all_period_txs if t.get("status") != "cancelled")
    scaer_total = sum(t.get("amount", 0.0) for t in all_period_txs if (t.get("category") == "mensalidade_scaer" or "SCAER" in t.get("description", "")) and t.get("status") != "cancelled")
    
    club_map = {}
    club_map["SCAER"] = {
        "clubId": "SCAER",
        "clubName": "SCAER",
        "amount": round(scaer_total, 2),
        "transactionsCount": len([t for t in all_period_txs if t.get("category") == "mensalidade_scaer"])
    }
    for t in all_period_txs:
        c_id = t.get("clubId")
        c_name = t.get("clubName") or c_id
        if c_id and c_id != "SCAER" and t.get("status") != "cancelled":
            if c_id not in club_map:
                club_map[c_id] = {"clubId": c_id, "clubName": c_name, "amount": 0.0, "transactionsCount": 0}
            club_map[c_id]["amount"] = round(club_map[c_id]["amount"] + t.get("amount", 0.0), 2)
            club_map[c_id]["transactionsCount"] += 1

    unique_cadets = len(set(t.get("userId") or t.get("cadetId") for t in all_period_txs))
    
    summary_data = {
        "billingPeriod": period,
        "totalGeneral": round(total_general, 2),
        "totalCadets": unique_cadets,
        "totalTransactions": len(all_period_txs),
        "scaerFeeTotal": round(scaer_total, 2),
        "status": "open",
        "clubBreakdown": list(club_map.values())
    }
    
    exist = make_request(f"{POCKETHOST_URL}/api/collections/monthly_summaries/records?filter=billingPeriod%3D%22{period}%22", token=token)
    if exist.get("items"):
        s_id = exist["items"][0]["id"]
        make_request(f"{POCKETHOST_URL}/api/collections/monthly_summaries/records/{s_id}", method="PATCH", data=summary_data, token=token)
        print(f"monthly_summaries [{period}] atualizado: R$ {total_general:.2f} ({len(all_period_txs)} txs)")
    else:
        make_request(f"{POCKETHOST_URL}/api/collections/monthly_summaries/records", method="POST", data=summary_data, token=token)
        print(f"monthly_summaries [{period}] criado: R$ {total_general:.2f} ({len(all_period_txs)} txs)")

if __name__ == "__main__":
    run_auto_billing()
