"""Agente local: lê o arquivo exportado pelo datalogger de uma estação
(Thermo Grid 5000 ou AQMS06) e envia a média dos últimos minutos para o
Firestore (coleção 'entrada'). O coletor do GitHub junta esses dados aos da
PurpleAir a cada 30 minutos.

Rodar a cada 10 minutos pelo Agendador de Tarefas do Windows:
  python enviar_estacao.py config_thermo.json

A chave da conta de serviço fica só neste computador (nunca no git).
"""
from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

TZ_MT = timezone(timedelta(hours=-4))


def ler_linhas(cfg: dict) -> list[dict]:
    caminho = Path(cfg["arquivo"])
    with caminho.open(encoding=cfg.get("codificacao", "utf-8-sig"), newline="") as f:
        leitor = csv.DictReader(f, delimiter=cfg.get("separador", ";"))
        return list(leitor)


def numero(txt: str | None) -> float | None:
    if txt is None or str(txt).strip() in ("", "NaN", "nan", "-", "---"):
        return None
    try:
        return float(str(txt).replace(",", "."))
    except ValueError:
        return None


def media_recente(cfg: dict, linhas: list[dict]) -> tuple[datetime, dict]:
    fmt = cfg.get("formato_data", "%d/%m/%Y %H:%M")
    col_t = cfg["coluna_data"]
    regs = []
    for l in linhas:
        try:
            t = datetime.strptime(l[col_t].strip(), fmt).replace(tzinfo=TZ_MT)
        except (KeyError, ValueError):
            continue
        regs.append((t, l))
    if not regs:
        raise SystemExit("Nenhuma linha com data válida no arquivo")
    regs.sort(key=lambda r: r[0])
    t_fim = regs[-1][0]
    janela = [l for t, l in regs if t > t_fim - timedelta(minutes=cfg.get("janela_min", 30))]
    valores = {}
    for pol, col in cfg["colunas"].items():
        vs = [v for v in (numero(l.get(col)) for l in janela) if v is not None]
        if vs:
            fator = cfg.get("fatores", {}).get(pol, 1.0)  # ex.: ppb -> µg/m³
            valores[pol] = round(sum(vs) / len(vs) * fator, 2 if pol == "CO" else 1)
    return t_fim, valores


def main() -> None:
    cfg = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else "config_thermo.json").read_text(encoding="utf-8"))
    t, valores = media_recente(cfg, ler_linhas(cfg))
    doc = {**cfg["estacao"], "t": t.isoformat(), "valores": valores}
    if "--teste" in sys.argv:
        print(json.dumps(doc, ensure_ascii=False, indent=1))
        return
    import firebase_admin
    from firebase_admin import credentials, firestore
    firebase_admin.initialize_app(credentials.Certificate(cfg["chave_servico"]))
    firestore.client().collection("entrada").document(cfg["estacao"]["id"]).set(doc)
    print(f"{cfg['estacao']['id']}: enviado {t:%d/%m %H:%M} {valores}")


if __name__ == "__main__":
    main()
