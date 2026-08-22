import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

csv_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"
with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

print(f"Total rows in CSV: {len(df)}")
# Search for COMAFA in Agosto in the CSV
comafa_august = []
for idx, row in df.iterrows():
    m = str(row.iloc[0] or '').strip().lower()
    if 'agosto' in m:
        clube = str(row.iloc[4] or '').upper()
        obs = str(row.iloc[5] or '').upper()
        if 'COMAFA' in clube or 'COMAFA' in obs:
            comafa_august.append((idx, row.tolist()))

print(f"Total COMAFA rows in Agosto in CSV: {len(comafa_august)}")
for idx, r in comafa_august[:15]:
    print(f"Row {idx}: {r}")
