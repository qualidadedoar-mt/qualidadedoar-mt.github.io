"""Coletor do QAR: junta PurpleAir + estações locais, calcula o IQAr e
publica um documento-resumo (portal/estado) no Firestore.

Uso:
  python coletor/coletar.py                     # produção (GitHub Actions)
  python coletor/coletar.py --simular coletor/exemplo.json --saida estado.json
      # teste local, sem Firestore e sem gastar pontos da PurpleAir

Variáveis de ambiente:
  FIREBASE_SERVICE_ACCOUNT  JSON da conta de serviço (conteúdo, não caminho)
  PURPLEAIR_API_KEY         chave de leitura da API PurpleAir (opcional)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from correcao import ajuste_local, epa_pm25, media_ab  # noqa: E402
from iqar import iqar_estacao  # noqa: E402

AQUI = Path(__file__).resolve().parent
TZ_MT = timezone(timedelta(hours=-4))  # America/Cuiaba (sem horário de verão)
JANELA_H = 48           # horas guardadas na série do documento-resumo
ONLINE_MIN = 75         # leitura mais antiga que isso = equipamento fora do ar
PERIODO_H = {"MP2,5": 24, "MP10": 24, "SO2": 24, "O3": 8, "CO": 8, "NO2": 1}
# Campos mínimos (modo econômico). Nome vem do estacoes.json; posição só é pedida
# enquanto algum sensor da lista ainda não tem coordenada conhecida.
CAMPOS_MEDIDA = ["last_seen", "humidity", "pm2.5_cf_1_a", "pm2.5_cf_1_b"]
CAMPOS_POSICAO = ["latitude", "longitude"]


class ErroPurpleAir(RuntimeError):
    pass


# ---------------------------------------------------------------- utilidades
def carregar_config() -> dict:
    return json.loads((AQUI / "estacoes.json").read_text(encoding="utf-8"))


def _pip(lon: float, lat: float, anel: list) -> bool:
    dentro = False
    j = len(anel) - 1
    for i in range(len(anel)):
        xi, yi = anel[i]
        xj, yj = anel[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi:
            dentro = not dentro
        j = i
    return dentro


_MUN = None


def municipio_de(lon: float, lat: float) -> str | None:
    global _MUN
    if _MUN is None:
        _MUN = json.loads((AQUI / "municipios_mt.geojson").read_text(encoding="utf-8"))["features"]
    for f in _MUN:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for p in polys:
            if _pip(lon, lat, p[0]):
                return f["properties"]["name"]
    return None


# ---------------------------------------------------------------- fontes
def ler_purpleair(cfg: dict, chave: str | None, simulado: dict | None,
                  posicoes: dict | None = None) -> list[dict]:
    """Retorna leituras corrigidas: [{id, nome, municipio, ..., t, valores}].

    posicoes: {sensor_index: (lat, lon)} já conhecidas (do resumo anterior), para não
    pagar pelos campos de posição a cada chamada.
    """
    pa = cfg.get("purpleair", {})
    posicoes = dict(posicoes or {})
    for s in pa.get("sensores", []):
        if "lat" in s and "lon" in s:
            posicoes[s["indice"]] = (s["lat"], s["lon"])
    if simulado is not None:
        resp = simulado
    elif chave:
        import requests
        campos = list(CAMPOS_MEDIDA)
        if pa.get("modo") == "recorte" or any(s["indice"] not in posicoes for s in pa.get("sensores", [])):
            campos += CAMPOS_POSICAO
        if pa.get("modo") == "recorte":
            campos.append("name")
        params = {"fields": ",".join(campos), "max_age": 3600}
        print(f"PurpleAir: campos pedidos = {params['fields']}")
        if pa.get("modo") == "recorte":
            r = pa["recorte"]
            params.update(nwlng=r["oeste"], nwlat=r["norte"], selng=r["leste"], selat=r["sul"], location_type=0)
        else:
            idx = [str(s["indice"]) for s in pa.get("sensores", [])]
            if not idx:
                print("PurpleAir: nenhum sensor listado em estacoes.json")
                return []
            params["show_only"] = ",".join(idx)
        r = requests.get("https://api.purpleair.com/v1/sensors", params=params,
                         headers={"X-API-Key": chave.strip()}, timeout=30)
        if r.status_code != 200:
            # a PurpleAir explica o motivo no corpo (ex.: ApiKeyTypeMismatchError, sem pontos no projeto)
            try:
                corpo = r.json()
                motivo = f"{corpo.get('error')}: {corpo.get('description')}"
            except ValueError:
                motivo = r.text[:300]
            raise ErroPurpleAir(f"PurpleAir respondeu HTTP {r.status_code} - {motivo}")
        resp = r.json()
    else:
        print("PurpleAir: sem PURPLEAIR_API_KEY, pulando")
        return []

    campos = resp["fields"]
    cad = {s["indice"]: s for s in pa.get("sensores", [])}
    aj = cfg.get("ajuste_local", {})
    saida = []
    for linha in resp.get("data", []):
        d = dict(zip(campos, linha))
        idx = d["sensor_index"]
        meta = cad.get(idx, {})
        m, dif, ok = media_ab(d.get("pm2.5_cf_1_a"), d.get("pm2.5_cf_1_b"))
        lat, lon = d.get("latitude"), d.get("longitude")
        if lat is None and idx in posicoes:
            lat, lon = posicoes[idx]
        mun = meta.get("municipio") or (municipio_de(lon, lat) if lat is not None else None)
        if mun is None:
            continue  # fora de Mato Grosso
        reg = {
            "id": meta.get("id", f"pa-{idx}"), "tipo": "pa", "indice": idx,
            "nome": meta.get("nome", d.get("name") or f"Sensor {idx}"),
            "municipio": mun, "lat": lat, "lon": lon,
            "operador": meta.get("operador", "Comunidade"),
            "t": int(d.get("last_seen") or time.time()),
            "ur": d.get("humidity"), "ab": None if dif is None else round(dif, 1),
            "valores": {},
        }
        if m is not None and ok:
            v = epa_pm25(m, d.get("humidity"))
            v = ajuste_local(v, aj.get("inclinacao", 1.0), aj.get("intercepto", 0.0))
            reg["valores"]["MP2,5"] = round(v, 1)
        else:
            reg["qc"] = "canais A e B discordam" if m is not None else "sem dado de MP2,5"
        saida.append(reg)
    print(f"PurpleAir: {len(saida)} sensores lidos")
    return saida


def ler_entradas(db, simulado: list | None) -> list[dict]:
    """Estações locais (Thermo Grid 5000, AQMS06) enviadas pelo agente_local."""
    if simulado is not None:
        return simulado
    if db is None:
        return []
    out = []
    for doc in db.collection("entrada").stream():
        d = doc.to_dict()
        d["id"] = doc.id
        t = d.get("t")
        if hasattr(t, "timestamp"):
            d["t"] = int(t.timestamp())
        elif isinstance(t, str):
            d["t"] = int(datetime.fromisoformat(t).timestamp())
        out.append(d)
    print(f"Estações locais: {len(out)}")
    return out


# ---------------------------------------------------------------- cálculo
def atualizar_estado(anterior: dict | None, leituras: list[dict], agora: int, intervalo_min: int) -> dict:
    est_ant = {e["id"]: e for e in (anterior or {}).get("estacoes", [])}
    limite = agora - JANELA_H * 3600
    estacoes = []
    vistos = set()
    for r in leituras:
        vistos.add(r["id"])
        e = est_ant.get(r["id"], {})
        serie = e.get("serie", {})
        for pol, v in r.get("valores", {}).items():
            s = serie.setdefault(pol, {"t": [], "v": []})
            if not s["t"] or r["t"] > s["t"][-1]:
                s["t"].append(r["t"])
                s["v"].append(v)
        for pol in list(serie):  # corta a janela
            s = serie[pol]
            k = next((i for i, t in enumerate(s["t"]) if t >= limite), len(s["t"]))
            s["t"], s["v"] = s["t"][k:], s["v"][k:]
            if not s["t"]:
                del serie[pol]
        estacoes.append(_resumo(r, serie, agora, intervalo_min))
    # estação que sumiu da resposta continua listada como fora do ar
    for i, e in est_ant.items():
        if i not in vistos:
            e = dict(e)
            e["online"] = False
            estacoes.append(e)
    estacoes.sort(key=lambda e: (e["tipo"] == "pa", e["municipio"], e["nome"]))
    return {
        "versao": 1,
        "atualizado": datetime.fromtimestamp(agora, TZ_MT).isoformat(timespec="minutes"),
        "intervalo_min": intervalo_min,
        "estacoes": estacoes,
    }


def _resumo(r: dict, serie: dict, agora: int, intervalo_min: int) -> dict:
    medias, comp = {}, None
    for pol, s in serie.items():
        h = PERIODO_H.get(pol, 1)
        vals = [v for t, v in zip(s["t"], s["v"]) if t >= agora - h * 3600 and v is not None]
        if vals:
            medias[pol] = round(sum(vals) / len(vals), 2 if pol == "CO" else 1)
        if pol == "MP2,5":
            esperado = max(1, 24 * 60 // intervalo_min)
            n24 = sum(1 for t in s["t"] if t >= agora - 24 * 3600)
            comp = round(min(1.0, n24 / esperado), 2)
    iq, dom = iqar_estacao(medias)
    online = (agora - r["t"]) / 60 <= ONLINE_MIN
    return {
        "id": r["id"], "tipo": r.get("tipo", "pa"), "indice": r.get("indice"), "nome": r.get("nome", r["id"]),
        "municipio": r.get("municipio"), "lat": r.get("lat"), "lon": r.get("lon"),
        "operador": r.get("operador", ""), "online": online,
        "ultimo": datetime.fromtimestamp(r["t"], TZ_MT).isoformat(timespec="minutes"),
        "ultimo_valor": r.get("valores", {}), "medias": medias,
        "iqar": iq, "dominante": dom, "completude": comp,
        "representativo": comp is None or comp >= 0.75,
        "ab": r.get("ab"), "ur": r.get("ur"), "qc": r.get("qc"),
        "serie": serie,
    }


# ---------------------------------------------------------------- Firestore
def abrir_firestore():
    conteudo = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not conteudo:
        return None
    import firebase_admin
    from firebase_admin import credentials, firestore
    cred = credentials.Certificate(json.loads(conteudo))
    firebase_admin.initialize_app(cred)
    return firestore.client()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--simular", help="JSON com resposta PurpleAir e/ou entradas locais")
    ap.add_argument("--saida", help="grava o documento-resumo neste arquivo em vez do Firestore")
    ap.add_argument("--anterior", help="documento-resumo anterior (teste local)")
    ap.add_argument("--agora", type=int, help="timestamp fixo (teste)")
    a = ap.parse_args()

    cfg = carregar_config()
    intervalo = int(cfg.get("intervalo_min", 30))
    agora = a.agora or int(time.time())
    sim = json.loads(Path(a.simular).read_text(encoding="utf-8")) if a.simular else None

    db = None if a.saida else abrir_firestore()
    if db is None and not a.saida:
        print("ERRO: defina FIREBASE_SERVICE_ACCOUNT ou use --saida", file=sys.stderr)
        return 1

    if a.saida:
        anterior = json.loads(Path(a.anterior).read_text(encoding="utf-8")) if a.anterior else None
    else:
        snap = db.collection("portal").document("estado").get()
        anterior = snap.to_dict() if snap.exists else None
    posicoes = {e["indice"]: (e["lat"], e["lon"]) for e in (anterior or {}).get("estacoes", [])
                if e.get("indice") is not None and e.get("lat") is not None}

    erro_pa = None
    try:
        leituras = ler_purpleair(cfg, os.environ.get("PURPLEAIR_API_KEY"), sim.get("purpleair") if sim else None, posicoes)
    except ErroPurpleAir as e:
        print(f"ERRO: {e}", file=sys.stderr)
        erro_pa, leituras = e, []
    leituras += ler_entradas(db, sim.get("entrada") if sim else None)
    if not leituras:
        print("Nenhuma fonte de dados disponível; nada publicado (o portal segue em modo demonstração).")
        return 1 if erro_pa else 0

    estado = atualizar_estado(anterior, leituras, agora, intervalo)

    if a.saida:
        Path(a.saida).write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"Resumo gravado em {a.saida}")
        return 0

    db.collection("portal").document("estado").set(estado)
    # histórico diário: um documento por dia, MP2,5 de cada estação por horário
    dia = datetime.fromtimestamp(agora, TZ_MT)
    hist = {e["id"]: {dia.strftime("%H%M"): e["ultimo_valor"].get("MP2,5")}
            for e in estado["estacoes"] if e["online"] and "MP2,5" in e["ultimo_valor"]}
    if hist:
        db.collection("historico").document(dia.strftime("%Y-%m-%d")).set(hist, merge=True)
    print(f"Publicado: {len(estado['estacoes'])} estações, {sum(e['online'] for e in estado['estacoes'])} online")
    return 1 if erro_pa else 0  # falha visível no Actions, mas as estações locais já foram publicadas


if __name__ == "__main__":
    sys.exit(main())
