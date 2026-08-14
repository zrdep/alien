// =============================================================================
// UPGRADES DE NAVE — fonte única de verdade (propulsor, sonda de escavação, scanner)
// =============================================================================
// Cada tier de upgrade referencia uma raridade (gameConfig/rarities.js) para
// herdar emoji/cor/label — você só define aqui o que é específico daquele
// upgrade (velocidade, profundidade, alcance).
//
// PARA ADICIONAR UM NOVO TIER (ex: propulsor F, depois do E):
//   1. Garanta que a raridade correspondente existe em gameConfig/rarities.js.
//   2. Adicione um objeto novo no fim do array (PROPULSOR_TIERS,
//      EXCAVATION_TIERS ou SCANNER_TIERS) com `code`/`level` seguindo a
//      sequência e `rarityCode` apontando pra raridade nova.
//   3. Adicione a receita de craft correspondente em utils/craftRecipes.js
//      (ver o topo daquele arquivo pra copiar o padrão de uma receita
//      existente) — sem isso o jogador não tem como chegar no tier novo.
// =============================================================================

const PROPULSOR_TIERS = [
    { code: 'A', rarityCode: 'A', speedKms: 4_500 },
    { code: 'B', rarityCode: 'B', speedKms: 12_000 },
    { code: 'C', rarityCode: 'C', speedKms: 36_000 },
    { code: 'D', rarityCode: 'D', speedKms: 60_000 },
    { code: 'E', rarityCode: 'E', speedKms: 120_000 },
];

const EXCAVATION_TIERS = [
    { level: 1, code: 'A', rarityCode: 'A', depth: 50, bonus: 0 },
    { level: 2, code: 'B', rarityCode: 'B', depth: 80, bonus: 5 },
    { level: 3, code: 'C', rarityCode: 'C', depth: 120, bonus: 10 },
    { level: 4, code: 'D', rarityCode: 'D', depth: 180, bonus: 18 },
    { level: 5, code: 'E', rarityCode: 'E', depth: 250, bonus: 28 },
];

const SCANNER_TIERS = [
    { level: 1, code: 'A', rarityCode: 'A', range: 3 },
    { level: 2, code: 'B', rarityCode: 'B', range: 6 },
    { level: 3, code: 'C', rarityCode: 'C', range: 10 },
    { level: 4, code: 'D', rarityCode: 'D', range: 15 },
    { level: 5, code: 'E', rarityCode: 'E', range: 25 },
];

const DEFAULT_SHIP = {
    excavationProbeLevel: 1,
    propulsorTier: 'A',
    starScannerLevel: 1,
};

module.exports = {
    PROPULSOR_TIERS,
    EXCAVATION_TIERS,
    SCANNER_TIERS,
    DEFAULT_SHIP,
};
