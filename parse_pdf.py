import pymupdf
import re
import json
import os
import sys

pdf_path = r"C:\Users\felip\Downloads\CédulAthos 2k26 - Lançamentos (1).pdf"

if not os.path.exists(pdf_path):
    print(f"Error: File {pdf_path} not found.")
    sys.exit(1)

doc = pymupdf.open(pdf_path)
total_pages = len(doc)
print(f"Abriu PDF com {total_pages} páginas.")

month_map = {
    "janeiro": "2026-01",
    "fevereiro": "2026-02",
    "março": "2026-03",
    "marco": "2026-03",
    "abril": "2026-04",
    "maio": "2026-05",
    "junho": "2026-06",
    "julho": "2026-07",
    "agosto": "2026-08",
    "setembro": "2026-09",
    "outubro": "2026-10",
    "novembro": "2026-11",
    "dezembro": "2026-12"
}

records = []

# Mapear cada página extraindo blocos de texto estruturados
for page_idx in range(total_pages):
    page = doc[page_idx]
    text = page.get_text("text")
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # Cada registro na tabela do PDF tem 6 linhas consecutivas:
    # 0: Mês (ex: Fevereiro)
    # 1: Número (ex: 23001)
    # 2: Nome (ex: Moro)
    # 3: Valor (ex: R$ 10,00)
    # 4: Clube (ex: CLUBE DE LITERATURA)
    # 5: Observação (ex: MENSALIDADE)
    
    # Encontrar índices onde começa um mês válido
    i = 0
    while i < len(lines):
        line_lower = lines[i].lower()
        if line_lower in month_map:
            # Temos o início de um registro
            mes_str = line_lower
            period = month_map[mes_str]
            
            # Procurar os próximos campos
            if i + 3 < len(lines):
                num_raw = lines[i+1]
                # Se for número de 4 a 6 dígitos
                if re.match(r"^\d{4,6}$", num_raw):
                    if len(num_raw) == 5:
                        cadet_num = f"{num_raw[:2]}/{num_raw[2:]}"
                    else:
                        cadet_num = num_raw
                    
                    nome = lines[i+2]
                    val_str = lines[i+3]
                    
                    # Verificar se val_str parece valor monetário
                    if "R$" in val_str or re.search(r"\d+,\d{2}", val_str):
                        val_clean = val_str.replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
                        try:
                            amount = float(val_clean)
                        except:
                            amount = 0.0
                        
                        # Clube e Obs podem ocupar 1 ou mais linhas
                        clube = ""
                        obs = ""
                        
                        curr = i + 4
                        club_parts = []
                        obs_parts = []
                        
                        while curr < len(lines) and lines[curr].lower() not in month_map:
                            item = lines[curr]
                            # Se for observação típica
                            if any(k in item.upper() for k in ["MENSALIDADE", "TOTAL", "DOAÇÃO", "DOACAO", "GASTOS", "COMPRA", "AVULSO", "EVENTO", "INTERAFA", "TAXA"]):
                                obs_parts.append(item)
                            elif not obs_parts:
                                club_parts.append(item)
                            else:
                                obs_parts.append(item)
                            curr += 1
                        
                        clube = " ".join(club_parts).strip()
                        obs = " ".join(obs_parts).strip()
                        
                        if not obs and "TOTAL" in clube.upper():
                            obs = "TOTAL"
                            clube = clube.replace("TOTAL", "").strip()
                        
                        # Determinar categoria
                        clube_upper = clube.upper()
                        obs_upper = obs.upper()
                        
                        if "SCAER" in clube_upper and ("WIFI" in obs_upper or "MENSALIDADE" in obs_upper):
                            cat = "mensalidade_scaer"
                        elif "MENSALIDADE" in obs_upper or "MENSALIDADE" in clube_upper:
                            cat = "mensalidade_clube"
                        elif "DOAÇÃO" in obs_upper or "DOACAO" in obs_upper:
                            cat = "doacao_religiosa"
                        elif "EVENTO" in obs_upper or "INTERAFA" in obs_upper:
                            cat = "evento"
                        else:
                            cat = "consumo"
                        
                        desc = f"{obs} - {clube}" if obs and clube else (obs or clube or "Lançamento Cédula")
                        
                        records.append({
                            "cadetNumber": cadet_num,
                            "cadetName": nome,
                            "userName": nome,
                            "clubId": clube if clube else "SCAER",
                            "clubName": clube if clube else "SCAER",
                            "description": desc,
                            "amount": amount,
                            "category": cat,
                            "billingPeriod": period,
                            "status": "pending",
                            "type": "automatic" if "MENSALIDADE" in cat else "manual"
                        })
                        
                        i = curr
                        continue
        i += 1

print(f"Extração concluída com sucesso! Total de registros extraídos: {len(records)}")

out_file = r"C:\Users\felip\Desktop\cedula-digital\parsed_transactions.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print(f"Salvo em {out_file}")

from collections import Counter
print("Distribuição por Período:", Counter(r["billingPeriod"] for r in records))
print("Distribuição por Categoria:", Counter(r["category"] for r in records))
print("Exemplos dos primeiros 3 lançamentos:")
for r in records[:3]:
    print(r)
