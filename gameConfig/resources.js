// =============================================================================
// RECURSOS — fonte única de verdade
// =============================================================================
// Antes, cada recurso tinha pedaços de dados duplicados em até 4 arquivos:
//   - utils/planetResources.js (chave + raridade + emoji)
//   - utils/resourcesDisplay.js (nome PT/EN)
//   - utils/market.js (nome PT/EN de novo, com valores DIFERENTES em alguns
//     casos — ex: "planetCore" era "Núcleo de Planeta" num arquivo e "Núcleo
//     Planetário" no outro)
//   - utils/coins.js (lista separada pros recursos do /daily)
//
// Agora cada recurso é UM objeto, aqui, com tudo que ele precisa.
//
// PARA ADICIONAR UM NOVO RECURSO:
//   1. Adicione um objeto novo no array RESOURCES abaixo.
//   2. Se ele deve poder aparecer em planetas, adicione uma entrada pra ele
//      em gameConfig/planetDropTables.js (na(s) raridade(s) de planeta desejada(s)).
//   3. Se ele deve poder ser usado em receitas de craft, referencie a
//      `key` dele em utils/craftRecipes.js.
//   4. Rode `node scripts/check-config.js` (ou inicie o bot) — a validação
//      automática avisa se você esqueceu algum passo ou digitou a `rarity`
//      errado.
//
// REGRA DE PREÇO (ver docs/balanceamento-economia.md):
//   - systemShopPrice ≈ 50 ∩oins por minuto de jogo necessário pra conseguir
//     1 unidade (nave de meio de jogo, mirando o melhor planeta);
//   - sellPrice = 25% do systemShopPrice (arredondado). Fica abaixo do piso
//     do mercado entre jogadores (50%), então vender pra outro jogador sempre
//     rende mais que vender pro sistema.
//
// SOBRE `sellPrice`:
//   Preço (em ∩oins) que a Loja do Sistema paga por UNIDADE quando um
//   jogador vende esse recurso diretamente pro bot (/mercado loja_venda).
//   Precisa ser MENOR que `systemShopPrice`, senão vira um exploit infinito
//   de dinheiro (comprar da loja e vender de volta com lucro). A validação
//   automática (gameConfig/index.js) bloqueia isso.
// =============================================================================

const RESOURCES = [
    {
        key: 'stone',
        rarity: 'A',
        emoji: '<:rock:1536579687407681596>',
        name: { 'pt-BR': 'Pedra', 'en-US': 'Stone' },
        systemShopPrice: 50,
        sellPrice: 13,
        daily: { eligible: true, min: 15, max: 30 },
    },
    {
        key: 'wood',
        rarity: 'A',
        emoji: '<:wood:1536579684706418698>',
        name: { 'pt-BR': 'Madeira', 'en-US': 'Wood' },
        systemShopPrice: 50,
        sellPrice: 13,
        daily: { eligible: true, min: 15, max: 30 },
    },
    {
        key: 'dirt',
        rarity: 'A',
        emoji: '<:dirt:1536579675172904960>',
        name: { 'pt-BR': 'Terra', 'en-US': 'Dirt' },
        systemShopPrice: 50,
        sellPrice: 13,
        daily: { eligible: true, min: 15, max: 30 },
    },
    {
        key: 'iron',
        rarity: 'B',
        emoji: '<:iron:1536579671871856681>',
        name: { 'pt-BR': 'Ferro', 'en-US': 'Iron' },
        systemShopPrice: 100,
        sellPrice: 25,
        daily: { eligible: true, min: 15, max: 30 },
    },
    {
        key: 'copper',
        rarity: 'B',
        emoji: '<:copper:1536579668986306581>',
        name: { 'pt-BR': 'Cobre', 'en-US': 'Copper' },
        systemShopPrice: 100,
        sellPrice: 25,
        daily: { eligible: true, min: 15, max: 30 },
    },
    {
        key: 'metal',
        rarity: 'B',
        emoji: '<:metal:1536579666385567774>',
        name: { 'pt-BR': 'Metal', 'en-US': 'Metal' },
        systemShopPrice: 150,
        sellPrice: 38,
        daily: { eligible: true, min: 5, max: 15 },
    },
    {
        key: 'blueCrystal',
        rarity: 'C',
        emoji: '<:blue_crystal:1536579663739093022>',
        name: { 'pt-BR': 'Cristal Azul', 'en-US': 'Blue Crystal' },
        systemShopPrice: 500,
        sellPrice: 125,
        daily: { eligible: false },
    },
    {
        key: 'starFragment',
        rarity: 'C',
        emoji: '<:stellar_fragment:1536579660178006057>',
        name: { 'pt-BR': 'Fragmento Estelar', 'en-US': 'Star Fragment' },
        systemShopPrice: 550,
        sellPrice: 138,
        daily: { eligible: false },
    },
    {
        key: 'purpleCrystal',
        rarity: 'D',
        emoji: '<:purple_crystal:1536579657489588224>',
        name: { 'pt-BR': 'Cristal Roxo', 'en-US': 'Purple Crystal' },
        systemShopPrice: 1500,
        sellPrice: 375,
        daily: { eligible: false },
    },
    {
        key: 'glowingOre',
        rarity: 'D',
        emoji: '<:luminous_ore:1536579654285262939>',
        name: { 'pt-BR': 'Minério Luminoso', 'en-US': 'Glowing Ore' },
        systemShopPrice: 1600,
        sellPrice: 400,
        daily: { eligible: false },
    },
    {
        key: 'planetCore',
        rarity: 'E',
        emoji: '<:planetary_core:1536579651437330432>',
        name: { 'pt-BR': 'Núcleo de Planeta', 'en-US': 'Planet Core' },
        systemShopPrice: 3000,
        sellPrice: 750,
        daily: { eligible: false },
    },
    {
        key: 'cosmicPearl',
        rarity: 'E',
        emoji: '<:cosmic_pearl:1536579648073371658>',
        name: { 'pt-BR': 'Pérola Cósmica', 'en-US': 'Cosmic Pearl' },
        systemShopPrice: 4500,
        sellPrice: 1125,
        daily: { eligible: false },
    },
    {
        key: 'starEssence',
        rarity: 'E',
        emoji: '<:stellar_essence:1536579644692889651>',
        name: { 'pt-BR': 'Essência Estelar', 'en-US': 'Star Essence' },
        systemShopPrice: 6000,
        sellPrice: 1500,
        daily: { eligible: false },
    },

    // Exemplo de como ficaria um novo recurso (deixado comentado):
    // {
    //     key: 'darkMatter',
    //     rarity: 'E',
    //     emoji: '<:dark_matter:SEU_ID_AQUI>',
    //     name: { 'pt-BR': 'Matéria Escura', 'en-US': 'Dark Matter' },
    //     systemShopPrice: 12000,
    //     sellPrice: 4800,
    //     daily: { eligible: false },
    // },
];

const RESOURCE_BY_KEY = new Map(RESOURCES.map((r) => [r.key, r]));

const getResource = (key) => RESOURCE_BY_KEY.get(key) ?? null;

const getResourceName = (key, lang = 'pt-BR') => {
    const res = getResource(key);
    if (!res) return key;
    return res.name[lang] ?? res.name['pt-BR'];
};

const getDailyEligibleResources = () => RESOURCES.filter((r) => r.daily?.eligible);

const isValidResourceKey = (key) => RESOURCE_BY_KEY.has(key);

module.exports = {
    RESOURCES,
    getResource,
    getResourceName,
    getDailyEligibleResources,
    isValidResourceKey,
};
