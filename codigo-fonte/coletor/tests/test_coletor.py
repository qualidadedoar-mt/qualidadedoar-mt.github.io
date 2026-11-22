import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from iqar import indice, nivel, iqar_estacao
from correcao import epa_pm25, media_ab
import coletar


def test_iqar_faixas():
    assert indice("MP2,5", 15) == 40
    assert indice("MP2,5", 16) == 42
    assert indice("MP2,5", 50) == 80
    assert indice("MP2,5", 300) == 400
    assert indice("MP2,5", 12.5) == 32      # 12,5 arredonda para 12 (par)
    assert indice("MP10", 100) == 80
    assert indice("CO", 9.05) == 43
    assert nivel(40) == 1 and nivel(41) == 2 and nivel(121) == 4 and nivel(250) == 5


def test_dominante():
    i, d = iqar_estacao({"MP2,5": 10, "O3": 140})
    assert d == "O3" and nivel(i) == 3


def test_epa_continua():
    for x in (30, 50, 210, 260):
        assert abs(epa_pm25(x - 1e-6, 50) - epa_pm25(x, 50)) < 0.01
    assert round(epa_pm25(20, 50), 2) == 11.92


def test_ab():
    assert media_ab(10, 11)[2] is True
    assert media_ab(10, 40)[2] is False
    assert media_ab(None, 12)[0] == 12


def test_municipio():
    assert coletar.municipio_de(-56.10, -15.60) == "Cuiabá"
    assert coletar.municipio_de(-49.0, -16.0) is None   # Goiás


def test_serie_acumula():
    cfg = coletar.carregar_config()
    est, t0 = None, 1_790_000_000
    for k in range(60):  # 30 h de coletas a cada 30 min
        t = t0 + k * 1800
        sim = {"fields": ["sensor_index", "name", "latitude", "longitude", "last_seen", "humidity", "pm2.5_cf_1_a", "pm2.5_cf_1_b"],
               "data": [[1001, "CPA", -15.56, -56.07, t, 60, 20, 21], [1002, "GO", -16.0, -49.0, t, 60, 20, 21]]}
        leit = coletar.ler_purpleair(cfg, None, sim)
        est = coletar.atualizar_estado(est, leit, t, 30)
        est = json.loads(json.dumps(est))  # ida e volta como no Firestore
    assert len(est["estacoes"]) == 1          # o sensor de Goiás é descartado
    e = est["estacoes"][0]
    assert e["municipio"] == "Cuiabá" and e["online"]
    assert e["completude"] == 1.0 and e["representativo"]
    assert len(e["serie"]["MP2,5"]["t"]) == 60
    assert e["iqar"] == indice("MP2,5", e["medias"]["MP2,5"])


def test_campos_economicos(monkeypatch):
    """Só pede posição enquanto algum sensor da lista não tem coordenada conhecida."""
    import requests
    cfg = coletar.carregar_config()
    pedidos = []

    class Resp:
        status_code = 200
        def __init__(self, campos):
            self.campos = campos
        def json(self):
            return {"fields": ["sensor_index"] + self.campos, "data": []}

    def falso_get(url, params, headers, timeout):
        pedidos.append(params["fields"].split(","))
        return Resp(params["fields"].split(","))

    monkeypatch.setattr(requests, "get", falso_get)
    coletar.ler_purpleair(cfg, "chave", None, {})
    assert "latitude" in pedidos[-1] and "name" not in pedidos[-1]
    todas = {s["indice"]: (-15.6, -56.1) for s in cfg["purpleair"]["sensores"]}
    coletar.ler_purpleair(cfg, "chave", None, todas)
    assert pedidos[-1] == coletar.CAMPOS_MEDIDA
