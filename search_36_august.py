import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

csv_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"
with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

# Find any row in August where value is 36.00 or cadet name is Felipe
print("=== ROWS IN AUGUST WITH 36,00 ===")
for idx, row in df.iterrows():
    m = str(row.iloc[0] or '').strip().lower()
    if 'agosto' in m:
        v = str(row.iloc[3] or '')
        if '36,00' in v or '36.00' in v or ' 36 ' in v:
            print(f"Row {idx}: {row.tolist()}")

print("\n=== ROWS IN AUGUST WITH JOGO DA COPA OR FESTA JUNINA ===")
for idx, row in df.iterrows():
    m = str(row.iloc[0] or '').strip().lower()
    if 'agosto' in m:
        obs = str(row.iloc[5] or '').upper()
        if 'COPA' in obs or 'JUNINA' in obs:
            num = str(row.iloc[1] or '').replace('.0', '').replace('/', '').strip()
            if num.startswith('23'):
                print(f"Row {idx}: {row.tolist()}")
