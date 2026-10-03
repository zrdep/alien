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

O jogador acompanha o progresso da missão a qualquer momento. Quando o alien volta, o bot avisa (`utils/missionNotifier.js`):

- **Onde:** jogador novo já começa com o aviso **no canal** da missão; dá pra trocar pra DM ou desligar em `/config user`. Se o bot não conseguir postar no canal (sem permissão, ou instalado só pelo usuário), o aviso vai pra DM.
- **Lembrete de daily:** se o `/daily` de hoje ainda não foi resgatado, o aviso lembra — e avisa quando a sequência está em risco.

### <img src="./images/emojis/sunglasses.png" width="18" valign="middle"> Chapéus

Um planeta pode esconder um chapéu (aparece na oferta do `/planet`); ele só vai pro inventário quando o alien **volta da missão**. A raridade do chapéu acompanha a do planeta:

| Planeta | Chance de o chapéu ser lendário |
|---|---:|
| <img src="./images/emojis/comum.png" width="18" valign="middle"> Comum | 0,7% |
| <img src="./images/emojis/incomum.png" width="18" valign="middle"> Incomum | 1,8% |
| <img src="./images/emojis/rare.png" width="18" valign="middle"> Raro | 4,8% |
| <img src="./images/emojis/epic.png" width="18" valign="middle"> Épico | 15% |
| <img src="./images/emojis/legendary.png" width="18" valign="middle"> Lendário | 34,5% |

O total de chapéus no jogo continua o mesmo (≈ 16 a cada 100 planetas vistos); só muda **onde** cada raridade cai. Pesos em `gameConfig/hats.js` → `hatRarityWeightByPlanet`.

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

### <img src="./images/emojis/pizza.png" width="18" valign="middle"> Custo dos upgrades

Cada upgrade consome recursos **e** ∩oins (as ∩oins são destruídas — é um sumidouro da economia):

| Tier | ∩oins | Recursos usados |
|---|---:|---|
| <img src="./images/emojis/incomum.png" width="18" valign="middle"> **B** | 300 | comuns e incomuns |
| <img src="./images/emojis/rare.png" width="18" valign="middle"> **C** | 2.000 | incomuns e raros |
| <img src="./images/emojis/epic.png" width="18" valign="middle"> **D** | 6.000 | raros e épicos |
| <img src="./images/emojis/legendary.png" width="18" valign="middle"> **E** | 15.000 | épicos e lendários |

Nenhuma receita pede recurso de raridade acima do nível que ela desbloqueia. Recursos comuns entram como volume, pra que a sobra deles tenha destino. Receitas completas em `utils/craftRecipes.js`.

### <img src="./images/emojis/asteroid.png" width="18" valign="middle"> Consumíveis

Fabricados no `/craft` (categoria **Consumíveis**, 1 min cada) e gastos ao clicar em explorar no `/planet` — aparecem como botões extras quando você tem algum:

| Item | Receita | Efeito na próxima missão |
|---|---|---|
| <img src="./images/emojis/asteroid.png" width="16" valign="middle"> **Kit de Mineração** | 15 Pedra · 10 Terra · 5 Cobre · 200 ∩oins | +25% de recursos |
| <img src="./images/emojis/loading.png" width="16" valign="middle"> **Célula de Combustível** | 10 Madeira · 10 Terra · 4 Ferro · 150 ∩oins | −40% no tempo de viagem (ida e volta) |

Dá pra usar os dois na mesma missão. Definidos em `gameConfig/consumables.js`.

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

### <img src="./images/emojis/config.png" width="18" valign="middle"> Loja do Sistema — preços dos recursos

O sistema vende a um preço fixo (≈ 50 ∩oins por minuto de jogo necessário pra conseguir o recurso) e compra de volta por **25%** desse valor:

| Recurso | Raridade | Loja (compra) | Sistema paga (venda) |
|---|---|---:|---:|
| Pedra · Madeira · Terra | Comum | 50 | 13 |
| Ferro · Cobre | Incomum | 100 | 25 |
| Metal | Incomum | 150 | 38 |
| Cristal Azul | Raro | 500 | 125 |
| Fragmento Estelar | Raro | 550 | 138 |
| Cristal Roxo | Épico | 1.500 | 375 |
| Minério Luminoso | Épico | 1.600 | 400 |
| Núcleo de Planeta | Lendário | 3.000 | 750 |
| Pérola Cósmica | Lendário | 4.500 | 1.125 |
| Essência Estelar | Lendário | 6.000 | 1.500 |

Como o piso do mercado entre jogadores é 50% do preço da loja, vender pra outro jogador sempre rende pelo menos o dobro de vender pro sistema.

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

### <img src="./images/emojis/passionate.png" width="18" valign="middle"> `/gift` — presentear

Os dois precisam confirmar. Presente de **∩oins paga a mesma taxa de 5%** do mercado (descontada do que o destinatário recebe); presente de recursos não tem taxa.

### <img src="./images/moedas/gift_coins.png" width="18" valign="middle"> `/redeem` — presentes e eventos

O dono do bot cria um **presente para todos** pelo `/painel` (título em pt-BR e en-US, ∩oins e/ou recursos). Cada jogador recebe um aviso no próximo comando e resgata com `/redeem`.

### <img src="./images/emojis/restart.png" width="18" valign="middle"> Para onde as ∩oins vão (sumidouros)

Taxa de 5% do `/market`, `/hatmarket` e `/gift` · custo em ∩oins dos upgrades e consumíveis · compras na Loja do Sistema e na loja de chapéus. Detalhes e simulação em [`docs/balanceamento-economia.md`](docs/balanceamento-economia.md).

---

## <img src="./images/emojis/legendary.png" width="22" valign="middle"> Conquistas (`/achievements`)

Mais de 25 conquistas rastreadas automaticamente, cobrindo 13 tipos de estatística (lista única em `gameConfig/achievements.js` → `ACHIEVEMENT_TYPES`):

`planets_seen` - `trips_completed` - `distance_traveled_km` - `resources_collected` - `craft_completed` - `daily_streak` -
`market_global_bought_count` - `market_global_bought_spent` - `market_global_sold_count` - `market_global_sold_revenue` -
`shop_bought_count` - `shop_sold_count` - `bot_invited`

Toda ação relevante (`addMissionCompletionStats`, compra/venda, craft, daily) roda uma checagem e desbloqueia automaticamente — sem precisar de comando manual.

---

## <img src="./images/emojis/saturn.png" width="22" valign="middle"> Ranking (`/ranking`)

Leaderboard Top 10 com 5 categorias, trocáveis por um menu suspenso, em dois escopos (botões **Global** / **Este servidor**):

| Categoria | Ícone |
|---|---|
| Mais Ricos | <img src="./images/moedas/gold_coins.png" width="18" valign="middle"> |
| Planetas Vistos | <img src="./images/emojis/asteroid.png" width="18" valign="middle"> |
| Planetas Explorados | <img src="./images/emojis/ovni.png" width="18" valign="middle"> |
| Distância Percorrida | <img src="./images/emojis/saturn.png" width="18" valign="middle"> |
| Recursos Coletados | <img src="./images/emojis/registry.png" width="18" valign="middle"> |

O painel mostra um **pódio do 1º, 2º e 3º lugar** como destaque e a **posição pessoal de quem usou o comando**, mesmo fora do Top 10.

O ranking **Este servidor** lista quem já usou o bot naquele servidor (tabela `user_guilds`). Não consulta a lista de membros do Discord — seria pesado e exigiria um intent privilegiado. O registro custa 1 escrita por par servidor/jogador por vida do processo (cache em memória), a consulta usa índice e fica 90s em cache. Quem saiu do servidor continua aparecendo.

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
npm run deploy-commands   # força o registro dos slash commands (o npm start já faz isso sozinho quando algum comando muda)
npm run generate-planets  # gera as imagens dos planetas
npm run check-config      # valida as variáveis de ambiente/config
```

---

<p align="center">
  <img src="./images/emojis/passionate.png" width="20">
  <br>
  <i>Feito com carinho pra galáxia do Discord.</i>
</p>