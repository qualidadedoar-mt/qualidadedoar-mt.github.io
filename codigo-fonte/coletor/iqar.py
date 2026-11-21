"""Índice de Qualidade do Ar (IQAr) conforme a Resolução Conama nº 506/2024
e a Orientação Técnica do MMA de janeiro de 2025.

IQAr = Iini + (Ifin - Iini) / (Cfin - Cini) * (C - Cini)
O índice divulgado é o maior entre os poluentes da estação.
"""
from __future__ import annotations

import math

# Faixas do índice (início, fim) para N1..N5
FAIXAS = [(0, 40), (41, 80), (81, 120), (121, 200), (201, 400)]
CLASSES = ["Boa", "Moderada", "Ruim", "Muito ruim", "Péssima"]

# Limite superior de concentração de cada faixa (µg/m³; CO em ppm)
LIMITES = {
    "MP2,5": {"periodo": "24h", "faixas": [15, 50, 75, 125, 300]},
    "MP10": {"periodo": "24h", "faixas": [45, 100, 150, 250, 600]},
    "O3": {"periodo": "8h", "faixas": [100, 130, 160, 200, 800]},
    "NO2": {"periodo": "1h", "faixas": [200, 240, 320, 1130, 3750]},
    "SO2": {"periodo": "24h", "faixas": [40, 50, 125, 800, 2620]},
    "CO": {"periodo": "8h", "faixas": [9, 11, 13, 15, 50]},
}


def arredonda_par(x: float) -> int:
    """Arredonda para o inteiro mais próximo; X,5 exato vai para o par."""
    f = math.floor(x)
    d = x - f
    if abs(d - 0.5) < 1e-9:
        return f if f % 2 == 0 else f + 1
    return int(round(x))


def indice(poluente: str, conc: float | None) -> int | None:
    if conc is None or (isinstance(conc, float) and math.isnan(conc)):
        return None
    lim = LIMITES[poluente]["faixas"]
    c = round(conc, 1) if poluente == "CO" else arredonda_par(conc)
    for i, cfin in enumerate(lim):
        if c <= cfin:
            ini_c = 0 if i == 0 else lim[i - 1]
            ini_i = 0 if i == 0 else FAIXAS[i][0]
            fim_i = FAIXAS[i][1]
            return int(round(ini_i + (fim_i - ini_i) / (cfin - ini_c) * (c - ini_c)))
    return 400


def nivel(iqar: int | None) -> int | None:
    if iqar is None:
        return None
    for n, (_, fim) in enumerate(FAIXAS, start=1):
        if iqar <= fim:
            return n
    return 5


def iqar_estacao(concentracoes: dict[str, float]) -> tuple[int | None, str | None]:
    """Retorna (IQAr, poluente dominante) a partir das médias por poluente."""
    melhor, dom = None, None
    for pol, c in concentracoes.items():
        if pol not in LIMITES:
            continue
        i = indice(pol, c)
        if i is not None and (melhor is None or i > melhor):
            melhor, dom = i, pol
    return melhor, dom
