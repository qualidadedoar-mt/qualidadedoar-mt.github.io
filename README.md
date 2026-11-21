# QAR · Qualidade do Ar MT

Portal de qualidade do ar de Mato Grosso (Sema-MT e UFMT/PPGFA): junta os sensores
PurpleAir do estado com as estações Thermo Grid 5000 e AQMS06, calcula o IQAr
(Resolução Conama nº 506/2024) e mostra tudo em <https://qualidadedoar-mt.github.io>.

Em desenvolvimento, o acesso é só para contas criadas pelo administrador.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | Arquivo **gerado** por `codigo-fonte/build.py`. Não editar à mão |
| `codigo-fonte/app/` | Portal: `app.js` (login e acesso), `portal.js` (telas, IQAr, mapa), `firebase.js`, `geo.js` (municípios de MT) |
| `codigo-fonte/estilo.css`, `codigo-fonte/index.html` | Estilo e molde da página |
| `codigo-fonte/coletor/` | Coleta da PurpleAir, controle dos canais A/B, correção EPA, IQAr, publicação no Firestore |
| `codigo-fonte/agente_local/` | Envia ao Firestore os dados das estações Thermo Grid 5000 e AQMS06 |
| `firestore.rules` | Regras de acesso (publicadas pelo console do Firebase) |
| `.github/workflows/` | `dados.yml` (coleta a cada 10 min) e `testes.yml` |

## Gerar o index.html

```
cd codigo-fonte
npm install        (só na primeira vez)
python build.py    -> gera ../index.html
```

Aberto direto do disco (`file://`), o portal entra em modo demonstração, sem login.

## Firebase (projeto `qualidadedoar-mt`, plano Spark)

- Authentication por e-mail/senha, **sem autocadastro**: as contas são criadas em
  Authentication › Usuários.
- Na primeira entrada a pessoa cria o próprio perfil `users/{uid}` como `pending`. O admin
  libera na página **Equipe** do portal. O primeiro admin é definido no console do Firestore:
  `users/{uid}` com `role = "admin"` e `status = "active"`.
- Coleções: `portal/estado` (resumo publicado pelo coletor), `historico/AAAA-MM-DD`
  (MP2,5 de cada estação por horário), `entrada/{estação}` (agente local), `users/{uid}`.

## Segredos do repositório (Settings › Secrets and variables › Actions)

- `FIREBASE_SERVICE_ACCOUNT`: JSON da conta de serviço (Firebase › Contas de serviço).
- `PURPLEAIR_API_KEY`: chave de leitura da API PurpleAir. Sem ela, a coleta usa só as
  estações locais; sem nenhuma fonte, não publica nada e o portal mostra demonstração.

## Estações locais (Thermo Grid 5000 e AQMS06)

No PC que recebe os dados: `pip install firebase-admin`, copie
`agente_local/config_thermo.exemplo.json` para `config_thermo.json`, ajuste arquivo, colunas e
caminho da chave (fora do repositório), teste com `--teste` e agende no Agendador de Tarefas a
cada 10 minutos.

## Método

- **PurpleAir**: média dos canais A e B (descartada se diferem mais de 5 µg/m³ e 70 %), correção
  nacional da US EPA (Barkjohn et al., 2021, com extensão para fumaça) e ajuste linear local
  definido em `coletor/estacoes.json` (colocalização com a Thermo Grid 5000).
- **IQAr**: faixas da Resolução Conama nº 506/2024 (orientação técnica do MMA, jan/2025).
  MP2,5, MP10 e SO2 em média de 24 h; O3 e CO em média móvel de 8 h; NO2 em média de 1 h.
  Média de 24 h marcada como não representativa com menos de 75 % dos dados.

## Testes

`python -m pytest -q codigo-fonte/coletor/tests`
