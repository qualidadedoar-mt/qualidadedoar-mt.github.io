"""Correção e controle de qualidade dos sensores PurpleAir.

1. Controle A/B: os dois canais do sensor precisam concordar
   (diferença <= 5 µg/m³ ou <= 70 %), como no AirNow Fire and Smoke Map.
2. Correção nacional da US EPA (Barkjohn et al., 2021) com a extensão
   para altas concentrações de fumaça (EPA, 2022), usando pm2.5_cf_1 e umidade.
3. Ajuste linear local, obtido da colocalização com a Thermo Grid 5000.
"""
from __future__ import annotations


def media_ab(a: float | None, b: float | None) -> tuple[float | None, float | None, bool]:
    """Retorna (média, |A-B|, válido)."""
    if a is None and b is None:
        return None, None, False
    if a is None or b is None:
        v = a if a is not None else b
        return v, None, True  # um canal só: aceito, mas sem verificação cruzada
    dif = abs(a - b)
    m = (a + b) / 2
    rel = dif / m if m > 0 else 0
    return m, dif, (dif <= 5 or rel <= 0.70)


def epa_pm25(cf1: float, ur: float | None) -> float:
    """Correção US EPA para PM2.5 (cf_1 em µg/m³, umidade relativa em %)."""
    rh = 50.0 if ur is None else max(0.0, min(100.0, ur))
    x = max(0.0, cf1)
    if x < 30:
        y = 0.524 * x - 0.0862 * rh + 5.75
    elif x < 50:
        k = x / 20 - 1.5
        y = (0.786 * k + 0.524 * (1 - k)) * x - 0.0862 * rh + 5.75
    elif x < 210:
        y = 0.786 * x - 0.0862 * rh + 5.75
    elif x < 260:
        k = x / 50 - 21 / 5
        y = ((0.69 * k + 0.786 * (1 - k)) * x - 0.0862 * rh * (1 - k)
             + 2.966 * k + 5.75 * (1 - k) + 8.84e-4 * x * x * k)
    else:
        y = 2.966 + 0.69 * x + 8.84e-4 * x * x
    return max(0.0, y)


def ajuste_local(v: float, inclinacao: float = 1.0, intercepto: float = 0.0) -> float:
    return max(0.0, v * inclinacao + intercepto)
