// =============================================================================
// TABELA DE DROP DOS PLANETAS — fonte única de verdade
// =============================================================================
// Define quais recursos podem aparecer em planetas de cada raridade, e a
// chance-base (%) de cada um. Isso é intencionalmente separado da raridade
// "própria" de cada recurso (gameConfig/resources.js): um planeta Comum (A) por
// exemplo tem uma pequena chance de dar Metal (que é um recurso de raridade
// C) — isso é decisão de game design, não uma regra automática.
//
// PARA ADICIONAR UM NOVO RECURSO A UM PLANETA:
//   Adicione `{ resource: 'chaveDoRecurso', chance: 20 }` na lista da
//   raridade de planeta desejada. `resource` precisa bater com uma `key` de
//   gameConfig/resources.js (a validação automática avisa se não bater).
//
// PARA ADICIONAR UMA NOVA RARIDADE DE PLANETA:
//   Depois de cadastrar a raridade em gameConfig/rarities.js, adicione aqui uma
//   nova entrada `NOVOCODIGO: [...]` com a lista de recursos dela.
// =============================================================================

const PLANET_DROP_TABLES = {
    A: [
        { resource: 'stone', chance: 35 },
        { resource: 'wood', chance: 35 },
        { resource: 'dirt', chance: 20 },
        { resource: 'metal', chance: 10 },
    ],
    B: [
        { resource: 'iron', chance: 35 },
        { resource: 'copper', chance: 30 },
        { resource: 'stone', chance: 20 },
        { resource: 'wood', chance: 15 },
    ],
    C: [
        { resource: 'blueCrystal', chance: 40 },
        { resource: 'starFragment', chance: 30 },
        { resource: 'metal', chance: 15 },
        { resource: 'iron', chance: 15 },
    ],
    D: [
        { resource: 'purpleCrystal', chance: 40 },
        { resource: 'glowingOre', chance: 30 },
        { resource: 'starFragment', chance: 20 },
        { resource: 'planetCore', chance: 10 },
    ],
    E: [
        { resource: 'cosmicPearl', chance: 25 },
        { resource: 'planetCore', chance: 25 },
        { resource: 'purpleCrystal', chance: 40 },
        { resource: 'starEssence', chance: 10 },
    ],

    // Exemplo pra uma 6ª raridade de planeta:
    // F: [
    //     { resource: 'darkMatter', chance: 50 },
    //     { resource: 'starEssence', chance: 30 },
    //     { resource: 'cosmicPearl', chance: 20 },
    // ],
};

const getDropTable = (planetRarityCode) => PLANET_DROP_TABLES[planetRarityCode] ?? PLANET_DROP_TABLES.A;

module.exports = {
    PLANET_DROP_TABLES,
    getDropTable,
};
