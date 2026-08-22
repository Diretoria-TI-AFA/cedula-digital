import pypdf
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"
reader = pypdf.PdfReader(pdf_path)

print(f"Lendo todas as {len(reader.pages)} páginas do PDF oficial...")

all_transactions = []
month_pattern = re.compile(r'(Fevereiro|Março|Marco|Abril|Maio|Junho|Julho|Agosto)', re.IGNORECASE)
amount_pattern = re.compile(r'\(R\$\s*([\d\.,]+)\)|R\$\s*([\d\.,]+)')

for page_idx, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    if not text.strip():
        continue
    
    # Process text lines
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        
        # Check if line contains (R$ ...)
        match_amt = amount_pattern.search(line)
        if match_amt:
            amt_str = (match_amt.group(1) or match_amt.group(2) or '').replace('.', '').replace(',', '.')
            try:
                amt = float(amt_str)
            except:
                continue
            if amt <= 0:
                continue
            
            # Find month
            m_match = month_pattern.search(line)
            month = m_match.group(1).capitalize() if m_match else ""
            
            # Find cadetNumber (e.g. 23/236 or 23236)
            num_match = re.search(r'(\d{2}/\d{3}|\d{5})', line)
            cadet_num = num_match.group(1) if num_match else ""
            
            if cadet_num:
                clean_num = cadet_num.replace('/', '')
                fmt_num = f"{clean_num[:2]}/{clean_num[2:]}"
                all_transactions.append({
                    "page": page_idx + 1,
                    "raw": line,
                    "month": month,
                    "cadetNumber": fmt_num,
                    "amount": round(amt, 2)
                })

print(f"Total de transações extraídas do PDF: {len(all_transactions)}")

# Check Felipe 23/236 in PDF
felipe_txs = [t for t in all_transactions if t["cadetNumber"] == "23/236"]
print(f"\nTotal de transações de 23/236 no PDF: {len(felipe_txs)}")

by_month = {}
for t in felipe_txs:
    m = t["month"]
    by_month[m] = by_month.get(m, 0.0) + t["amount"]

print("\nTotais por Mês para Felipe (23/236) no PDF:")
for m, v in by_month.items():
    print(f"  * {m}: R$ {v:.2f}")
