import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

csv_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"
with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

# Calculate monthly sums for cadet 23236 exclusively by cadetNumber:
month_order = ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto"]

felipe_by_month = {}
for idx, row in df.iterrows():
    num = str(row.iloc[1] or '').replace('.0', '').replace('/', '').strip()
    if num == '23236':
        mes = str(row.iloc[0] or '').strip()
        val_raw = str(row.iloc[3] or '').strip()
        if 'nan' in val_raw.lower() or not val_raw: continue
        val_clean = val_raw.replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
        try:
            val = float(val_clean)
        except:
            continue
        if val <= 0: continue
        
        felipe_by_month.setdefault(mes, []).append((val, row.iloc[4], row.iloc[5]))

print("=== VALORES OFICIAIS EXATOS DO CSV PARA O CADETE 23/236 (23236) ===")
for m in month_order:
    items = felipe_by_month.get(m, [])
    total = sum(x[0] for x in items)
    print(f"\n{m}: Total = R$ {total:.2f} ({len(items)} lançamentos)")
    for val, clube, obs in items:
        print(f"   - R$ {val:6.2f} | Clube: {clube} | Obs: {obs}")
