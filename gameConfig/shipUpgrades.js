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
    { code: 'A', rarityCode: 'A', speedKms: 2_200 },
    { code: 'B', rarityCode: 'B', speedKms: 6_000 },
    { code: 'C', rarityCode: 'C', speedKms: 18_000 },
    { code: 'D', rarityCode: 'D', speedKms: 30_000 },
    { code: 'E', rarityCode: 'E', speedKms: 60_000 },
];

const EXCAVATION_TIERS = [
    { level: 1, code: 'A', rarityCode: 'A', depth: 50, bonus: 0 },
    { level: 2, code: 'B', rarityCode: 'B', depth: 80, bonus: 10 },
    { level: 3, code: 'C', rarityCode: 'C', depth: 120, bonus: 15 },
    { level: 4, code: 'D', rarityCode: 'D', depth: 180, bonus: 25 },
    { level: 5, code: 'E', rarityCode: 'E', depth: 250, bonus: 40 },
];

// O Scanner Estelar não "vê mais longe" — ele mapeia o subsolo do planeta com
// precisão, então o alien perde menos tempo cavando às cegas. Cada tier reduz
// o tempo de mineração (começa em 15min no tier A e chega a 8min no tier E).
const SCANNER_TIERS = [
    { level: 1, code: 'A', rarityCode: 'A', miningMinutes: 15 },
    { level: 2, code: 'B', rarityCode: 'B', miningMinutes: 13 },
    { level: 3, code: 'C', rarityCode: 'C', miningMinutes: 11 },
    { level: 4, code: 'D', rarityCode: 'D', miningMinutes: 9 },
    { level: 5, code: 'E', rarityCode: 'E', miningMinutes: 8 },
];

const DEFAULT_SHIP = {
    excavationProbeLevel: 1,
    propulsorTier: 'A',
    starScannerLevel: 1,
};

// Helper "puro" (sem dependências de db/ship) pra converter nível/código do
// scanner direto em milissegundos de mineração. Existe aqui pra poder ser
// usado tanto por utils/exploration.js quanto por utils/db.js sem criar
// import circular entre esses dois arquivos.
const getScannerMiningMs = (levelOrCode) => {
    let tier;
    if (typeof levelOrCode === 'string') {
        tier = SCANNER_TIERS.find((t) => t.code === levelOrCode);
    } else {
        const index = Math.max(0, Math.min((levelOrCode || 1) - 1, SCANNER_TIERS.length - 1));
        tier = SCANNER_TIERS[index];
    }
    return (tier ?? SCANNER_TIERS[0]).miningMinutes * 60 * 1000;
};

module.exports = {
    PROPULSOR_TIERS,
    EXCAVATION_TIERS,
    SCANNER_TIERS,
    DEFAULT_SHIP,
    getScannerMiningMs,
};
