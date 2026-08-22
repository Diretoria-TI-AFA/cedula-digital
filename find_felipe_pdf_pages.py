import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"
reader = pypdf.PdfReader(pdf_path)

print(f"Total pages: {len(reader.pages)}")

# Search for pages containing 23/236 or 23236 or FELIPE and AGOSTO
for idx in range(len(reader.pages)):
    txt = reader.pages[idx].extract_text() or ""
    if "23/236" in txt or "23236" in txt:
        print(f"\n==================== PÁGINA {idx + 1} ====================")
        for line in txt.split("\n"):
            line_clean = line.strip()
            if line_clean:
                print(line_clean)
