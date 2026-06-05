# -*- coding: utf-8 -*-
# Extrai as moedas POSSUÍDAS (Qua.>0) do XLS do escudo para JSON, para o
# importador node casar com o catálogo. Usa só as folhas "1ª" (a "2ª" é 2.ª cópia).
import xlrd, re, json, sys

WB = xlrd.open_workbook(r'assets/coleçaodadospai/Colecção de Moedas de 1917 a 2002.XLS')
FOLHAS = [
    ('Moedas Colecção em € 1ª', 'circulacao'),
    ('Colecção Moedas ultima até 2000', 'circulacao'),
    ('Col.Moed.Comemorativas & Sé.1ª', 'comemorativa'),
]

def num(v):
    try:
        f = float(v)
        return f if f == f else None
    except Exception:
        return None

out = []
for sn, fam in FOLHAS:
    ws = WB.sheet_by_name(sn)
    for r in range(ws.nrows):
        data = str(ws.cell_value(r, 0))
        m = re.match(r'\s*Ano\s*(\d{4})\s*-?\s*([A-Za-z]*)', data)
        if not m:
            continue
        ano = int(m.group(1))
        mint = (m.group(2) or '').strip().upper() or None
        qua = num(ws.cell_value(r, 1)) or 0
        if qua <= 0:
            continue
        desc = re.sub(r'\s+', ' ', str(ws.cell_value(r, 2))).strip()
        facial = num(ws.cell_value(r, 3))
        # Valores de mercado EM EUROS. Circulação: BC/MBC/Bela em col 4/5/6 (já €).
        # Comemorativas: têm col 4=V.Fac€; o valor € real é MBC (col 6); a col 7
        # "Bela" é esse valor × 200,482 em ESCUDOS (não usar, inflacionava ~200×).
        if fam == 'comemorativa':
            v_bc = num(ws.cell_value(r, 5))
            v_mbc = num(ws.cell_value(r, 6))
            v_bela = None  # col 7 é escudos, ignorar
        else:
            v_bc = num(ws.cell_value(r, 4))
            v_mbc = num(ws.cell_value(r, 5))
            v_bela = num(ws.cell_value(r, 6))
        prov = str(ws.cell_value(r, ws.ncols - 1)).strip()
        prov = prov if prov and not prov.replace('.', '').isdigit() else None
        out.append({
            'ano': ano, 'mint': mint, 'desc': desc, 'familia': fam,
            'facial': facial, 'qua': qua,
            'bc': v_bc, 'mbc': v_mbc, 'bela': v_bela, 'prov': prov,
            'sheet': sn, 'row': r,   # origem no XLS (para marcar a vermelho na revisão)
        })

json.dump(out, open(r'scripts/.escudos.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(f'{len(out)} moedas possuídas extraídas → scripts/.escudos.json')
# resumo
import collections
porfam = collections.Counter(c['familia'] for c in out)
comval = sum(1 for c in out if c['bela'] or c['mbc'] or c['bc'])
print('por família:', dict(porfam), '| com valor de mercado:', comval)
