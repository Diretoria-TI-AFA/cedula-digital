import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

csv_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"
with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

# Find all rows in Agosto
august_df = df[df.iloc[:, 0].astype(str).str.lower().str.contains('agosto')]
print(f"Total rows in Agosto in CSV: {len(august_df)}")

# Look for any row that has 23236, 23/236, Felipe, Cesar, Braga or 245.14 or 36.00 in August
print("\n--- Rows with 23236 or 23/236 in August ---")
for idx, row in august_df.iterrows():
    num = str(row.iloc[1] or '').replace('.0', '').replace('/', '').strip()
    if num == '23236':
        print(f"Row {idx}: {row.tolist()}")

# Check all rows in August where cadet name is Felipe or warName is Felipe
print("\n--- Rows in August where name contains Felipe / Braga / Cesar ---")
for idx, row in august_df.iterrows():
    name = str(row.iloc[2] or '').lower()
    if 'felipe' in name or 'braga' in name or 'cesar' in name:
        print(f"Row {idx}: {row.tolist()}")

# Check if there is any row with exactly 36.00 in August
print("\n--- Rows in August with value around 36.00 ---")
for idx, row in august_df.iterrows():
    val = str(row.iloc[3] or '')
    if '36,00' in val or '36.00' in val:
        num = str(row.iloc[1] or '').replace('.0', '').replace('/', '').strip()
        print(f"Row {idx}: Num={num} | {row.tolist()}")
