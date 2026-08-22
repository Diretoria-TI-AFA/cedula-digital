import pandas as pd
import pypdf
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

csv_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos.csv"
pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"

# 1. Search in CSV for all rows mentioning 23236, 23/236, or Felipe in Agosto
print("=== BUSCA NO CSV (AGOSTO) ===")
with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
    df = pd.read_csv(f)

for idx, row in df.iterrows():
    m = str(row.iloc[0] or '').strip().lower()
    if 'agosto' in m:
        num = str(row.iloc[1] or '').replace('.0', '').replace('/', '').strip()
        nome = str(row.iloc[2] or '').strip()
        val = str(row.iloc[3] or '').strip()
        clube = str(row.iloc[4] or '').strip()
        obs = str(row.iloc[5] or '').strip()
        
        if num == '23236' or '23236' in num or 'cesar' in nome.lower() or 'braga' in nome.lower():
            print(f"CSV Row {idx}: Mês={row.iloc[0]} | Num={num} | Nome={nome} | Valor={val} | Clube={clube} | Obs={obs}")

# 2. Search in PDF for pages mentioning 23/236 or 23236 in Agosto
print("\n=== BUSCA NO PDF (AGOSTO - 23/236) ===")
reader = pypdf.PdfReader(pdf_path)
print(f"Total de páginas no PDF: {len(reader.pages)}")

found_pages = []
for p_idx, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    if ("23/236" in text or "23236" in text) and ("Agosto" in text or "AGOSTO" in text or "agosto" in text):
        found_pages.append((p_idx + 1, text))

print(f"Páginas encontradas no PDF com 23/236 em Agosto: {len(found_pages)}")
for p_num, text in found_pages:
    print(f"\n--- PÁGINA {p_num} ---")
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    for line in lines:
        if "23/236" in line or "23236" in line or "BRAGA" in line.upper() or "FELIPE" in line.upper() or "TOTAL" in line.upper() or "R$" in line:
            print("  ", line)
