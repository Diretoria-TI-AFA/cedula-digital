import pypdf
import re
import json
import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"
reader = pypdf.PdfReader(pdf_path)

print(f"Buscando todas as páginas de COMAFA ATHOS em Agosto no PDF...")

august_comafa_entries = []
# Pages around 800-1100
for p_idx in range(800, len(reader.pages)):
    text = reader.pages[p_idx].extract_text() or ""
    if "COMAFA ATHOS" in text and ("Agosto" in text or "AGOSTO" in text or "agosto" in text):
        # Extract each COMAFA ATHOS line
        for line in text.split("\n"):
            if "COMAFA ATHOS" in line:
                # e.g. "Agosto23/236 FELIPE (R$ 36,00) COMAFA ATHOS TOTAL"
                # or "Agosto 23/236 FELIPE (R$ 36,00) COMAFA ATHOS TOTAL"
                num_match = re.search(r'(\d{2}/\d{3}|\d{5})', line)
                amt_match = re.search(r'\(R\$\s*([\d\.,]+)\)|R\$\s*([\d\.,]+)', line)
                if num_match and amt_match:
                    cadet_num = num_match.group(1)
                    clean_num = cadet_num.replace('/', '')
                    fmt_num = f"{clean_num[:2]}/{clean_num[2:]}"
                    
                    amt_str = (amt_match.group(1) or amt_match.group(2)).replace('.', '').replace(',', '.')
                    try:
                        amt = float(amt_str)
                        if amt > 0:
                            august_comafa_entries.append({
                                "cadetNumber": fmt_num,
                                "amount": round(amt, 2),
                                "raw": line
                            })
                    except:
                        pass

print(f"Total de lançamentos de COMAFA ATHOS em Agosto encontrados: {len(august_comafa_entries)}")
for it in august_comafa_entries[:10]:
    print(it)

# Check Felipe 23/236 in august_comafa_entries
felipe_comafa = [e for e in august_comafa_entries if e["cadetNumber"] == "23/236"]
print(f"\nFelipe 23/236 COMAFA Agosto: {felipe_comafa}")
