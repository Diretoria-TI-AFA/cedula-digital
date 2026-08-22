import pandas as pd
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

# 1. Read CSV
csv_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"
with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

# 2. Auth superuser
auth_url = "https://cedula-scaer.pockethost.io/api/collections/_superusers/auth-with-password"
data = json.dumps({"identity": "diretoriati.afa@gmail.com", "password": "Athos23!"}).encode("utf-8")
req = urllib.request.Request(auth_url, data=data, headers={"Content-Type": "application/json", "User-Agent": user_agent})
with urllib.request.urlopen(req, context=ctx) as res:
    token = json.loads(res.read())["token"]

headers = {"Authorization": f"Bearer {token}", "User-Agent": user_agent}

month_map = {
    "fevereiro": "2026-02", "março": "2026-03", "marco": "2026-03",
    "abril": "2026-04", "maio": "2026-05", "junho": "2026-06",
    "julho": "2026-07", "agosto": "2026-08"
}

# Test 5 random cadets
test_cadets = ["23001", "23002", "23054", "23236", "23120"]

for clean_num in test_cadets:
    formatted_num = f"{clean_num[:2]}/{clean_num[2:]}"
    
    # Sum from CSV
    csv_months = {}
    for _, row in df.iterrows():
        num_row = str(row.iloc[1] or '').replace('.0', '').replace('/', '').strip()
        if num_row == clean_num:
            m_raw = str(row.iloc[0] or '').strip().lower()
            m_code = month_map.get(m_raw)
            if not m_code: continue
            val_raw = str(row.iloc[3] or '').strip()
            if 'nan' in val_raw.lower() or not val_raw: continue
            val_clean = val_raw.replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
            try:
                v = float(val_clean)
                if v > 0:
                    csv_months[m_code] = csv_months.get(m_code, 0.0) + round(v, 2)
            except:
                pass
    
    # Query from PocketHost
    encoded_filter = urllib.parse.quote(f'(cadetNumber="{formatted_num}" || cadetNumber="{clean_num}")')
    url = f"https://cedula-scaer.pockethost.io/api/collections/transactions/records?filter={encoded_filter}&perPage=500"
    req_pb = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req_pb, context=ctx) as res:
        pb_items = json.loads(res.read())["items"]
    
    pb_months = {}
    for it in pb_items:
        m = it["billingPeriod"]
        pb_months[m] = pb_months.get(m, 0.0) + it["amount"]
    
    print(f"\n=======================================================")
    print(f"VALIDAÇÃO CADETE {formatted_num} (CSV vs PocketHost):")
    print(f"=======================================================")
    all_months = sorted(set(list(csv_months.keys()) + list(pb_months.keys())))
    for m in all_months:
        csv_v = csv_months.get(m, 0.0)
        pb_v = pb_months.get(m, 0.0)
        diff = abs(csv_v - pb_v)
        status = "✅ 100% EXATO" if diff < 0.05 else f"❌ DIF: {diff:.2f}"
        print(f"  {m} -> CSV: R$ {csv_v:7.2f} | Servidor: R$ {pb_v:7.2f} | {status}")
