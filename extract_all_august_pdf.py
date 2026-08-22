import pypdf
import re
import json
import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"
reader = pypdf.PdfReader(pdf_path)

print(f"Varrendo páginas de Agosto no PDF oficial...")

august_missing_txs = []
# Pages 750 to 1100 contain August statements
for p_idx in range(750, len(reader.pages)):
    text = reader.pages[p_idx].extract_text() or ""
    if "Agosto" in text or "AGOSTO" in text:
        # Regex to capture all items on the page:
        # e.g. "Agosto23/236 FELIPE (R$ 36,00) COMAFA ATHOS TOTAL"
        # or "Agosto 23/236 Felipe (R$ 20,00) SCAER FESTA JUNINA- CONSUMO"
        # Match pattern: Agosto\s*(\d{2}/\d{3})\s*([A-Za-zÀ-ÿ\s]+?)\s*\(R\$\s*([\d\.,]+)\)\s*([A-Za-zÀ-ÿ\s\.\-&/º]+)
        matches = re.finditer(r'Agosto\s*(\d{2}/\d{3})\s*([A-Za-zÀ-ÿ\s]+?)\s*\(R\$\s*([\d\.,]+)\)\s*([A-Za-zÀ-ÿ\s\.\-&/º]+?)(?=Agosto\s*\d{2}/\d{3}|$)', text, re.DOTALL)
        for m in matches:
            cadet_num = m.group(1).strip()
            name = m.group(2).strip()
            amt_str = m.group(3).strip().replace('.', '').replace(',', '.')
            desc_club = m.group(4).strip().replace('\n', ' ')
            
            try:
                amt = float(amt_str)
                if amt > 0:
                    august_missing_txs.append({
                        "cadetNumber": cadet_num,
                        "name": name,
                        "amount": round(amt, 2),
                        "desc_club": desc_club,
                        "page": p_idx + 1
                    })
            except:
                pass

print(f"Total de itens de Agosto extraídos das páginas do PDF: {len(august_missing_txs)}")

# Filter specifically for COMAFA ATHOS in August
comafa_athos_aug = [t for t in august_missing_txs if "COMAFA" in t["desc_club"].upper()]
print(f"Total de lançamentos COMAFA em Agosto: {len(comafa_athos_aug)}")
for it in comafa_athos_aug[:10]:
    print(it)

# Check Felipe 23/236
felipe_entries = [t for t in august_missing_txs if t["cadetNumber"] == "23/236"]
print(f"\nTodos os lançamentos do Cadete Felipe 23/236 em Agosto no PDF ({len(felipe_entries)}):")
total_felipe = 0.0
for e in felipe_entries:
    total_felipe += e["amount"]
    print(f"  - R$ {e['amount']:6.2f} | {e['desc_club']}")
print(f"TOTAL EXATO DE FELIPE NO PDF: R$ {total_felipe:.2f}")
