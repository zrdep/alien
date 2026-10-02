<br>

<p align="center">
  <img src="./images/emojis/ovni.png" width="120" alt="ALIEN">
</p>

<h1 align="center">
  <code>∩lien</code>
</h1>


<p align="center">
  <i>Projeto secreto. Não sabemos de onde veio, só estamos deixando ele crescer.</i>
  <br>
  <img src="./images/emojis/hmm.png" width="18">
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white">
  <img alt="discord.js" src="https://img.shields.io/badge/discord.js-14.27-5865F2?logo=discord&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/better--sqlite3-WAL%20mode-003B57?logo=sqlite&logoColor=white">
  <img alt="Idiomas" src="https://img.shields.io/badge/idiomas-pt--BR%20%7C%20en--US-blueviolet">
</p>

<p align="center">
  <img src="./images/emojis/comum.png" width="22">
  <img src="./images/emojis/incomum.png" width="22">
  <img src="./images/emojis/rare.png" width="22">
  <img src="./images/emojis/epic.png" width="22">
  <img src="./images/emojis/legendary.png" width="22">
</p>

---

## <img src="./images/emojis/ovni.png" width="22" valign="middle"> O que é o ∩lien?

Um RPG de exploração espacial e economia, jogado inteiramente por comandos `/` no Discord. Você adota um alienígena, monta sua nave, explora planetas, coleta recursos, negocia num mercado com outros jogadores e desbloqueia conquistas — tudo isso rodando em cima de um `data/bot.db` local.

Roda em **dois bots separados no mesmo processo Node** (`index.js` na raiz sobe os dois):

| Bot | Pasta | Função |
|---|---|---|
| <img src="./images/emojis/ovni.png" width="18"> **∩lien** (principal) | raiz do projeto (`commands/`, `events/`, `utils/`) | O jogo em si — exploração, economia, nave, conquistas |
| <img src="./images/emojis/support.png" width="18"> **Support Bot** | `support_bot/` | Painel de tickets e regras do servidor de suporte |

Totalmente bilíngue (**pt-BR** / **en-US**) via `utils/i18n.js` + `locales/*.json` — cada jogador escolhe seu idioma com `/config`.

---

## <img src="./images/emojis/asteroid.png" width="22" valign="middle"> Loop principal do jogo

<table>
<tr>
<td align="center" width="20%">

<img src="./images/emojis/earth.png" width="40"><br>
<sub><code>/planet</code></sub><br>
<sub>escolhe a oferta</sub>

</td>
<td align="center">→</td>
<td align="center" width="20%">

<img src="./images/emojis/loading.png" width="40"><br>
<sub>viagem de ida</sub><br>
<sub>depende do Propulsor</sub>

</td>
<td align="center">→</td>
<td align="center" width="20%">

<img src="./images/emojis/asteroid.png" width="40"><br>
<sub>mineração</sub><br>
<sub>depende do Scanner</sub>

</td>
<td align="center">→</td>
<td align="center" width="20%">

<img src="./images/emojis/excited.png" width="40"><br>
<sub>volta pra Terra</sub><br>
<sub>recursos + ∩oins</sub>

</td>
</tr>
</table>

O jogador acompanha o progresso da missão a qualquer momento — o bot avisa automaticamente no canal quando cada fase termina (`utils/missionNotifier.js`).

---

## <img src="./images/emojis/settings.png" width="22" valign="middle"> Upgrades de nave (`/craft`)

Cada upgrade tem **5 tiers**, na mesma escala de raridade usada nos planetas — e as tabelas abaixo usam os ícones reais de cada tier dentro do jogo:

### <img src="./images/emojis/loading.png" width="18" valign="middle"> Propulsor — velocidade de viagem

| Tier | Velocidade |
|---|---|
| <img src="./images/emojis/comum.png" width="18" valign="middle"> **A** | 2.200 km/s |
| <img src="./images/emojis/incomum.png" width="18" valign="middle"> **B** | 6.000 km/s |
| <img src="./images/emojis/rare.png" width="18" valign="middle"> **C** | 18.000 km/s |
| <img src="./images/emojis/epic.png" width="18" valign="middle"> **D** | 30.000 km/s |
| <img src="./images/emojis/legendary.png" width="18" valign="middle"> **E** | 60.000 km/s |

O tempo de viagem (ida e volta) é `distância do planeta ÷ velocidade do propulsor`.

### <img src="./images/emojis/asteroid.png" width="18" valign="middle"> Sonda de Escavação — bônus de recursos

| Tier | Bônus |
|---|---|
| <img src="./images/emojis/comum.png" width="18" valign="middle"> **A** | +0% |
| <img src="./images/emojis/incomum.png" width="18" valign="middle"> **B** | +10% |
| <img src="./images/emojis/rare.png" width="18" valign="middle"> **C** | +15% |
| <img src="./images/emojis/epic.png" width="18" valign="middle"> **D** | +25% |
| <img src="./images/emojis/legendary.png" width="18" valign="middle"> **E** | +40% |

Aplicado direto na quantidade de cada recurso sorteado no planeta (`utils/planetResources.js`). O bônus aparece explicitamente na tela do `/planet` e nas mensagens de missão, pra ficar claro que já está incluso.

### <img src="./images/emojis/info.png" width="18" valign="middle"> Scanner Estelar — tempo de mineração

| Tier | Tempo de mineração |
|---|---|
| <img src="./images/emojis/comum.png" width="18" valign="middle"> **A** | 15 min |
| <img src="./images/emojis/incomum.png" width="18" valign="middle"> **B** | 13 min |
| <img src="./images/emojis/rare.png" width="18" valign="middle"> **C** | 11 min |
| <img src="./images/emojis/epic.png" width="18" valign="middle"> **D** | 9 min |
| <img src="./images/emojis/legendary.png" width="18" valign="middle"> **E** | 8 min |

Em vez de "alcance" (que não tinha efeito nenhum na versão antiga), o Scanner agora mapeia o subsolo do planeta com mais precisão — reduzindo o tempo real que o alien passa minerando.

---

## <img src="./images/emojis/pizza.png" width="22" valign="middle"> Economia

### <img src="./images/moedas/gold_coins.png" width="18" valign="middle"> `/daily` — recompensa diária

| | |
|---|---|
| <img src="./images/emojis/pizza.png" width="16" valign="middle"> Base | **1.000 a 2.000 ∩oins** (sorteado) |
| <img src="./images/emojis/passionate.png" width="16" valign="middle"> Sequência | +100 ∩oins por dia seguido, até **+600** no 7º dia |
| <img src="./images/emojis/registry.png" width="16" valign="middle"> Bônus | +3 recursos aleatórios do universo |
| <img src="./images/emojis/saturn.png" width="16" valign="middle"> Reset | Todo dia à meia-noite (horário de Brasília) |

<img src="./images/emojis/online.png" width="16" valign="middle"> Pode ser resgatado em **qualquer servidor** (ou na DM, via instalação de usuário).

### <img src="./images/emojis/error.png" width="18" valign="middle"> `/market` — mercado global de recursos

| Regra | Valor |
|---|---|
| Preço mínimo de anúncio | 50% do preço da Loja do Sistema |
| Taxa sobre venda concluída | 5% (paga pelo vendedor) |
| Anúncios ativos por recurso (mesmo jogador) | 1 |

### <img src="./images/emojis/sunglasses.png" width="18" valign="middle"> `/hatmarket` — mercado de chapéus

| Regra | Valor |
|---|---|
| Preço mínimo de anúncio | 50% do preço base do chapéu |
| Taxa sobre venda concluída | 5% |
| Anúncios ativos por chapéu (mesmo jogador) | 3 |

As taxas de 5% funcionam como **sumidouro de moedas** — ajudam a evitar que a quantidade de ∩oins em circulação só cresça infinitamente.

---

## <img src="./images/emojis/legendary.png" width="22" valign="middle"> Conquistas (`/achievements`)

Mais de 25 conquistas rastreadas automaticamente, cobrindo 13 tipos de estatística (lista única em `gameConfig/achievements.js` → `ACHIEVEMENT_TYPES`):

`planets_seen` - `trips_completed` - `distance_traveled_km` - `resources_collected` - `craft_completed` - `daily_streak` -
`market_global_bought_count` - `market_global_bought_spent` - `market_global_sold_count` - `market_global_sold_revenue` -
`shop_bought_count` - `shop_sold_count` - `bot_invited`

Toda ação relevante (`addMissionCompletionStats`, compra/venda, craft, daily) roda uma checagem e desbloqueia automaticamente — sem precisar de comando manual.

---

## <img src="./images/emojis/saturn.png" width="22" valign="middle"> Ranking (`/ranking`)

Leaderboard Top 10 com 5 categorias, trocáveis por um menu suspenso:

| Categoria | Ícone |
|---|---|
| Mais Ricos | <img src="./images/moedas/gold_coins.png" width="18" valign="middle"> |
| Planetas Vistos | <img src="./images/emojis/asteroid.png" width="18" valign="middle"> |
| Planetas Explorados | <img src="./images/emojis/ovni.png" width="18" valign="middle"> |
| Distância Percorrida | <img src="./images/emojis/saturn.png" width="18" valign="middle"> |
| Recursos Coletados | <img src="./images/emojis/registry.png" width="18" valign="middle"> |

O painel mostra um **pódio do 1º, 2º e 3º lugar** como destaque e a **posição pessoal de quem usou o comando**, mesmo fora do Top 10.

---

## <img src="./images/emojis/config.png" width="22" valign="middle"> Stack técnica

| Peça | Tecnologia |
|---|---|
| Runtime | Node.js 18+ |
| Discord | [discord.js](https://discord.js.org/) v14 (Components V2) |
| Banco de dados | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), modo **WAL** |
| Avatares/imagens de alien | `@dicebear` + `@resvg/resvg-js` |
| i18n | JSON próprio (`locales/pt-BR.json`, `locales/en-US.json`) via `utils/i18n.js` |

### <img src="./images/emojis/restart.png" width="18" valign="middle"> Comandos úteis (`package.json`)

```bash
npm start                 # sobe o bot
npm run deploy-commands   # registra/atualiza os slash commands no Discord
npm run generate-planets  # gera as imagens dos planetas
npm run check-config      # valida as variáveis de ambiente/config
```

---

<p align="center">
  <img src="./images/emojis/passionate.png" width="20">
  <br>
  <i>Feito com carinho pra galáxia do Discord.</i>
</p>