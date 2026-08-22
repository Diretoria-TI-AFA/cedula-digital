import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

csv_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"
with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

print("Columns:", df.columns.tolist())
print(f"Total rows: {len(df)}")

# Filter for cadet 23236 / 23/236 / FELIPE
felipe_rows = []
for idx, row in df.iterrows():
    num = str(row.iloc[1] or '').replace('.0', '').replace('/', '').strip()
    if num == '23236':
        felipe_rows.append(row.tolist())

print(f"\nFelipe 23236 rows in CSV: {len(felipe_rows)}")
for r in felipe_rows[:25]:
    print(r)
