import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"
reader = pypdf.PdfReader(pdf_path)

total_pages = len(reader.pages)
print(f"Total pages: {total_pages}")

# Inspect last 300 pages (where August cédulas are)
for idx in range(total_pages - 300, total_pages):
    txt = reader.pages[idx].extract_text() or ""
    if "23/236" in txt or "23236" in txt:
        print(f"\n==================== PÁGINA {idx + 1} ====================")
        for line in txt.split("\n"):
            line_clean = line.strip()
            if line_clean:
                print(line_clean)
