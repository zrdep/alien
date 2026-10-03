# Como adicionar conteúdo ao jogo

Este guia existe porque, antes desta reorganização, adicionar uma coisa simples
(tipo um recurso novo) exigia editar 4 arquivos diferentes — e era fácil
esquecer um deles ou digitar um nome errado em algum lugar. Agora tudo mora em
`gameConfig/`, e existe uma validação automática (`npm run check-config`) que
avisa se você esqueceu algo.

Depois de editar qualquer arquivo em `gameConfig/`, rode:

```bash
npm run check-config
```

Isso roda sem precisar conectar no Discord. Se der erro, ele te diz exatamente
qual arquivo e qual chave está errada. **O bot também roda essa validação
sozinho ao iniciar** (`node index.js`) e recusa a subir se algo estiver
quebrado — então nunca vai virar um bug silencioso em produção.

---

## 1. Adicionar um recurso novo (ex: "Matéria Escura")

Arquivo: `gameConfig/resources.js`

Adicione um objeto no array `RESOURCES`:

```js
{
    key: 'darkMatter',                 // identificador interno, único, camelCase
    rarity: 'E',                       // precisa ser um código que existe em gameConfig/rarities.js
    emoji: '<:dark_matter:123456789>', // emoji custom do seu servidor
    name: { 'pt-BR': 'Matéria Escura', 'en-US': 'Dark Matter' },
    systemShopPrice: 12000,            // preço de venda no mercado do sistema
    daily: { eligible: false },        // true = pode aparecer no /daily; se true, adicione min/max
},
```

Isso já é suficiente pra ele:
- ser reconhecido pelo `/inventory`, `/painel` (admin) e mercado de jogadores
- ter nome certo em PT e EN em qualquer lugar que exibe recursos

Mas ele **não vai cair em nenhum planeta ainda** — pra isso, veja o passo 2.
Se ele deve poder ser usado como ingrediente de craft, veja o passo 4.

---

## 2. Fazer um recurso cair em planetas

Arquivo: `gameConfig/planetDropTables.js`

Cada raridade de planeta (`A` a `E`) tem uma lista de recursos que podem
aparecer nela, com uma chance-base (%):

```js
E: [
    { resource: 'cosmicPearl', chance: 35 },
    { resource: 'planetCore', chance: 30 },
    { resource: 'purpleCrystal', chance: 20 },
    { resource: 'starEssence', chance: 15 },
    { resource: 'darkMatter', chance: 8 },   // <- adicionado
],
```

`resource` precisa ser exatamente a `key` que você cadastrou no passo 1. Se
digitar errado, `npm run check-config` avisa.

A chance não precisa somar 100 — é a chance de CADA recurso aparecer
independentemente, avaliada em várias "passadas" até o planeta ter pelo menos
3 recursos (lógica em `utils/planetResources.js`, não precisa mexer nela).

---

## 3. Adicionar uma raridade nova (ex: "F - Mítico")

Arquivo: `gameConfig/rarities.js`

Copie o padrão de uma raridade existente e ajuste os números:

```js
{
    code: 'F',
    order: 5,                                    // sempre a última + 1
    emoji: '<:mythic:123456789>',
    color: 0xec4899,
    planetWeight: 2,                              // chance relativa de um planeta ser dessa raridade
    planetDistanceMin: 20_000_000,
    planetDistanceMax: 40_000_000,
    resourceAmountMin: 1,
    resourceAmountMax: 2,
    missionCoinChances: { bronze: 15, silver: 45, gold: 40 }, // precisa somar 100
},
```

Depois:
1. Adicione as traduções em `locales/pt-BR.json` e `locales/en-US.json`,
   chave `commands.planet.rarityF` (nome que aparece pro jogador — ex:
   `"Mítico"` / `"Mythic"`).
2. Adicione uma entrada `F: [...]` em `gameConfig/planetDropTables.js` (senão
   planetas dessa raridade não dão nenhum recurso — o `check-config` avisa
   disso como aviso, não erro).
3. Se quiser upgrades de nave nessa raridade nova, veja o passo 5.

---

## 4. Adicionar uma receita de craft nova

Arquivo: `utils/craftRecipes.js` (continua com a lista explícita de receitas —
de propósito: balanceamento de craft costuma exigir ajuste fino
caso-a-caso, então não faria sentido "gerar automaticamente").

Copie uma receita parecida como modelo:

```js
{
    id: 'propulsor_f',
    category: CATEGORIES.PROPULSOR,
    titleKey: 'commands.craft.recipes.propulsor_f.title', // adicione em pt-BR e en-US
    descKey: 'commands.craft.recipes.propulsor_f.desc',   // adicione em pt-BR e en-US
    craftSeconds: 300,
    coinsCost: 30000,            // ∩oins destruídas ao iniciar o craft (0 = grátis)
    ingredients: [
        { key: 'darkMatter', amount: 5 },   // key precisa existir em gameConfig/resources.js
        { key: 'starEssence', amount: 10 },
    ],
    checkRequirement: (userShip) => userShip.propulsorTier === 'E',
    applyReward: (db, userId) => {
        db.prepare('UPDATE users SET ship_propulsor_tier = ? WHERE user_id = ?').run('F', userId);
    },
    targetTierOrLevel: 'F',      // precisa existir em gameConfig/shipUpgrades.js
},
```

Regra das receitas: nunca pedir recurso de raridade acima do nível que a
receita desbloqueia. Veja `docs/balanceamento-economia.md` antes de mexer em
quantidades ou `coinsCost`.

`npm run check-config` confere que todo `ingredients[].key` referenciado
realmente existe em `gameConfig/resources.js` — pega typo na hora.

---

## 5. Adicionar um tier de nave (propulsor / sonda de escavação / scanner)

Arquivo: `gameConfig/shipUpgrades.js`

Adicione no final do array correspondente (`PROPULSOR_TIERS`,
`EXCAVATION_TIERS` ou `SCANNER_TIERS`):

```js
// Propulsor
{ code: 'F', rarityCode: 'F', speedKms: 250_000 },

// Sonda de escavação
{ level: 6, code: 'F', rarityCode: 'F', bonus: 55 },

// Scanner
{ level: 6, code: 'F', rarityCode: 'F', miningMinutes: 7 },
```

`rarityCode` precisa apontar pra uma raridade que já existe em
`gameConfig/rarities.js` (é de lá que o tier herda emoji e nome/cor). Depois,
crie a receita de craft correspondente (passo 4) — sem ela o jogador não tem
como conseguir o upgrade.

---

## 6. Adicionar um consumível

Arquivo: `gameConfig/consumables.js`

```js
{
    key: 'shieldBattery',
    emoji: '<:rainbow:1536248394681552957>',   // de docs/emojisNome.txt
    name: { 'pt-BR': 'Bateria de Escudo', 'en-US': 'Shield Battery' },
    effect: { resourceBonusPercent: 10 },       // ou travelReductionPercent
    recipe: {
        ingredients: [{ key: 'metal', amount: 10 }],
        coinsCost: 100,
        craftSeconds: 60,
    },
},
```

Depois adicione `commands.consumables.shieldBattery.desc` nos dois locales.
A receita aparece sozinha no `/craft` e o botão no `/planet`. Efeito de um
tipo NOVO precisa ser implementado em `utils/consumables.js`.

---

## Onde cada coisa mora (referência rápida)

| Quero mudar...                              | Arquivo                              |
|----------------------------------------------|---------------------------------------|
| Cor/emoji/distância/chance de raridade        | `gameConfig/rarities.js`             |
| Nome/emoji/preço/elegibilidade de recurso     | `gameConfig/resources.js`            |
| O que cai em cada raridade de planeta         | `gameConfig/planetDropTables.js`     |
| Velocidade/bônus/tempo de mineração da nave  | `gameConfig/shipUpgrades.js`         |
| Receitas de craft e seus custos               | `utils/craftRecipes.js`              |
| Consumíveis (itens de missão)                 | `gameConfig/consumables.js`          |
| Limite de planetas por hora                   | `gameConfig/exploration.js`          |
| Nome traduzido de uma raridade (pt/en)        | `locales/pt-BR.json` / `en-US.json`  |

**Nunca** edite `utils/planet.js`, `utils/planetResources.js`, `utils/ship.js`,
`utils/coins.js`, `utils/market.js` ou `utils/resourcesDisplay.js` pra
adicionar conteúdo novo — esses arquivos só têm *lógica* (como sortear, como
formatar), não dados. Se você editar um deles esperando adicionar um recurso e
não achar onde, é sinal de que o dado deveria estar em `gameConfig/`.
