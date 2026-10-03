// =============================================================================
// CONSUMÍVEIS — fonte única de verdade
// =============================================================================
// Itens fabricados no /craft (categoria "Consumíveis") e gastos ao iniciar
// uma missão no /planet. Existem pra dar destino à sobra de recursos comuns
// e servir de sumidouro recorrente de ∩oins (ver
// docs/balanceamento-economia.md, seção 7).
//
// PARA ADICIONAR UM CONSUMÍVEL NOVO:
//   1. Adicione um objeto em CONSUMABLES (key única, nome pt-BR/en-US,
//      emoji de docs/emojisNome.txt, efeito e receita).
//   2. Adicione `commands.consumables.<key>.desc` nos dois locales.
//   3. Se for um TIPO de efeito novo (não `resourceBonusPercent` nem
//      `travelReductionPercent`), implemente o efeito em
//      utils/consumables.js#applyConsumablesToMission.
// =============================================================================

const CONSUMABLES = [
    {
        key: 'miningKit',
        emoji: '<:asteroid:1536459906973171782>',
        name: { 'pt-BR': 'Kit de Mineração', 'en-US': 'Mining Kit' },
        // +25% em cada recurso da próxima missão (somado por cima do bônus
        // da Sonda de Escavação). Arredondamento estocástico — o valor
        // esperado é exatamente +25% mesmo em quantidades pequenas.
        effect: { resourceBonusPercent: 25 },
        recipe: {
            ingredients: [
                { key: 'stone', amount: 15 },
                { key: 'dirt', amount: 10 },
                { key: 'copper', amount: 5 },
            ],
            coinsCost: 200,
            craftSeconds: 60,
        },
    },
    {
        key: 'fuelCell',
        emoji: '<:loading:1536247662372982794>',
        name: { 'pt-BR': 'Célula de Combustível', 'en-US': 'Fuel Cell' },
        // −40% no tempo de viagem (ida E volta) da próxima missão.
        effect: { travelReductionPercent: 40 },
        recipe: {
            ingredients: [
                { key: 'wood', amount: 10 },
                { key: 'dirt', amount: 10 },
                { key: 'iron', amount: 4 },
            ],
            coinsCost: 150,
            craftSeconds: 60,
        },
    },
];

const CONSUMABLE_BY_KEY = new Map(CONSUMABLES.map((c) => [c.key, c]));

const getConsumable = (key) => CONSUMABLE_BY_KEY.get(key) ?? null;

const getConsumableName = (key, lang = 'pt-BR') => {
    const item = getConsumable(key);
    if (!item) return key;
    return item.name[lang] ?? item.name['pt-BR'];
};

module.exports = {
    CONSUMABLES,
    getConsumable,
    getConsumableName,
};
