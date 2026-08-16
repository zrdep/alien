// =============================================================================
// RARIDADES — fonte única de verdade
// =============================================================================
// Antes, "raridade" (A-E) tinha pedaços de dados espalhados e duplicados em
// utils/planet.js, utils/ship.js, utils/resourcesDisplay.js,
// commands/galaxy/planet.js e utils/coins.js. Agora tudo mora aqui.
//
// PARA ADICIONAR UMA NOVA RARIDADE (ex: "F - Mítico"):
//   1. Adicione um novo objeto no array RARITIES abaixo, seguindo o padrão.
//   2. Adicione as traduções `commands.planet.rarityF` em locales/pt-BR.json
//      e locales/en-US.json (label da raridade).
//   3. Pronto — planetas, recursos, naves e moedas de missão já vão
//      reconhecer a nova raridade automaticamente, desde que você também
//      cadastre recursos/itens com essa raridade nos outros arquivos de
//      config (ver gameConfig/resources.js, gameConfig/planetDropTables.js,
//      gameConfig/shipUpgrades.js).
//
// NÃO colocamos o nome/label da raridade aqui de propósito: o bot é
// bilíngue (pt-BR/en-US) e os labels já vivem no sistema de i18n
// (locales/*.json, chave `commands.planet.rarity<CODE>`). Use
// `getRarityLabel(tFor(interaction), code)` ou `t(userId, ...)` com a chave
// `commands.planet.rarity${code}` para exibir o nome traduzido.
// =============================================================================

const RARITIES = [
    {
        code: 'A',
        order: 0,
        emoji: '<:comum:1536459746364760215>',
        color: 0x9ca3af,
        // Chance (peso) desta raridade ser sorteada para um planeta em /planet.
        planetWeight: 40,
        // Distância (em km) do planeta até o alienígena, sorteada dentro da faixa.
        planetDistanceMin: 50_000,
        planetDistanceMax: 100_000,
        // Quantidade de recurso coletado, para recursos desta raridade.
        resourceAmountMin: 8,
        resourceAmountMax: 20,
        // Chance (%) de cada tipo de moeda ao completar uma missão neste planeta.
        // Os três valores devem somar 100.
        missionCoinChances: { bronze: 60, silver: 30, gold: 10 },
    },
    {
        code: 'B',
        order: 1,
        emoji: '<:incomum:1536459764492533800>',
        color: 0x22c55e,
        planetWeight: 30,
        planetDistanceMin: 150_000,
        planetDistanceMax: 500_000,
        resourceAmountMin: 5,
        resourceAmountMax: 14,
        missionCoinChances: { bronze: 55, silver: 33, gold: 12 },
    },
    {
        code: 'C',
        order: 2,
        emoji: '<:rare:1536459780166647878>',
        color: 0x3b82f6,
        planetWeight: 15,
        planetDistanceMin: 650_000,
        planetDistanceMax: 1_500_000,
        resourceAmountMin: 2,
        resourceAmountMax: 5,
        missionCoinChances: { bronze: 45, silver: 38, gold: 17 },
    },
    {
        code: 'D',
        order: 3,
        emoji: '<:epic:1536459798269395044>',
        color: 0xa855f7,
        planetWeight: 10,
        planetDistanceMin: 2_500_000,
        planetDistanceMax: 5_000_000,
        resourceAmountMin: 1,
        resourceAmountMax: 3,
        missionCoinChances: { bronze: 35, silver: 42, gold: 23 },
    },
    {
        code: 'E',
        order: 4,
        emoji: '<:legendary:1536459814475927653>',
        color: 0xf59e0b,
        planetWeight: 5,
        planetDistanceMin: 8_000_000,
        planetDistanceMax: 15_000_000,
        resourceAmountMin: 1,
        resourceAmountMax: 2,
        missionCoinChances: { bronze: 25, silver: 45, gold: 30 },
    },

    // Exemplo de como ficaria uma 6ª raridade (deixado comentado):
    // {
    //     code: 'F',
    //     order: 5,
    //     emoji: '<:mythic:SEU_ID_AQUI>',
    //     color: 0xec4899,
    //     planetWeight: 2,
    //     planetDistanceMin: 20_000_000,
    //     planetDistanceMax: 40_000_000,
    //     resourceAmountMin: 1,
    //     resourceAmountMax: 2,
    //     missionCoinChances: { bronze: 15, silver: 45, gold: 40 },
    // },
];

const RARITY_ORDER = RARITIES.map((r) => r.code);

const RARITY_BY_CODE = new Map(RARITIES.map((r) => [r.code, r]));

const getRarity = (code) => RARITY_BY_CODE.get(code) ?? RARITIES[0];

const getRarityEmoji = (code) => getRarity(code).emoji;

// Chave de tradução (i18n) para o label desta raridade. Use com tFor()/t().
const getRarityLabelKey = (code) => `commands.planet.rarity${code}`;

// Próxima raridade na ordem (ex: 'A' -> 'B'). Retorna null se já for a última.
// Útil para upgrades de nave, onde cada tier avança para a próxima raridade.
const getNextRarity = (code) => {
    const current = getRarity(code);
    return RARITIES.find((r) => r.order === current.order + 1) ?? null;
};

module.exports = {
    RARITIES,
    RARITY_ORDER,
    getRarity,
    getRarityEmoji,
    getRarityLabelKey,
    getNextRarity,
};
