// =============================================================================
// REGRAS DO /craft — fonte única de verdade
// =============================================================================
// Números do craft que não pertencem a uma receita específica. As receitas
// em si ficam em utils/craftRecipes.js (upgrades) e gameConfig/consumables.js
// (consumíveis). Ver docs/balanceamento-economia.md, seção 7.1.
// =============================================================================

const CRAFT_CONFIG = {
    // Quantidades que dá pra fabricar de uma vez nos CONSUMÍVEIS (upgrades
    // são sempre 1). Ingredientes, ∩oins e tempo multiplicam pela quantidade.
    consumableBatchSizes: [1, 2, 5, 10],

    // Acelerar (pular) um craft em andamento pagando ∩oins. O valor é
    // DESTRUÍDO (sumidouro). Cobrado por minuto restante, arredondado pra
    // cima: 300 ∩/min ≈ 2x o que um jogador de nave máxima gera no mesmo
    // tempo (~145 ∩/min) — é conveniência cara de propósito.
    skip: {
        coinsPerMinute: 300,
        minCost: 500,
    },
};

/**
 * Custo em ∩oins pra concluir agora um craft que ainda tem `remainingMs`.
 */
const getCraftSkipCost = (remainingMs) => {
    const minutes = Math.ceil(Math.max(0, remainingMs) / 60000);
    return Math.max(CRAFT_CONFIG.skip.minCost, minutes * CRAFT_CONFIG.skip.coinsPerMinute);
};

module.exports = {
    CRAFT_CONFIG,
    getCraftSkipCost,
};
