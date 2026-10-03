const {
    PROPULSOR_TIERS,
    getPropulsorTier,
    getExcavationTier,
    getScannerTier,
    formatSpeed,
} = require('./ship');
const { CONSUMABLES, getConsumableName } = require('../gameConfig/consumables');

const CATEGORIES = {
    PROPULSOR: 'propulsor',
    EXCAVATION: 'excavation',
    SCANNER: 'scanner',
    CONSUMABLES: 'consumables',
};

// REGRAS DAS RECEITAS DE UPGRADE (ver docs/balanceamento-economia.md):
//   - uma receita NUNCA pede recurso de raridade acima do nível que ela
//     desbloqueia (nível 2 = até B, 3 = até C, 4 = até D, 5 = até E) — o
//     núcleo dela é o tier atual e o anterior, e recursos comuns entram como
//     volume (é o que dá destino à sobra de Pedra/Terra/Cobre/Metal);
//   - `coinsCost` é cobrado ao iniciar o craft e DESTRUÍDO (sumidouro de
//     ∩oins). Escala por nível: 300 / 2.000 / 6.000 / 15.000.
//   - identidade das trilhas: Propulsor = metais/energia, Sonda = geologia
//     (pedra, cobre, cristais), Scanner = óptica (terra, cristais, fragmento).

const CRAFT_RECIPES = [
    // ============================================
    // PROPULSORES
    // ============================================
    {
        id: 'propulsor_b',
        category: CATEGORIES.PROPULSOR,
        titleKey: 'commands.craft.recipes.propulsor_b.title',
        descKey: 'commands.craft.recipes.propulsor_b.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 300,
        ingredients: [
            { key: 'iron', amount: 10 },
            { key: 'metal', amount: 6 },
            { key: 'stone', amount: 12 },
        ],
        checkRequirement: (userShip) => userShip.propulsorTier === 'A',
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_propulsor_tier = ? WHERE user_id = ?').run('B', userId);
        },
        targetTierOrLevel: 'B',
    },
    {
        id: 'propulsor_c',
        category: CATEGORIES.PROPULSOR,
        titleKey: 'commands.craft.recipes.propulsor_c.title',
        descKey: 'commands.craft.recipes.propulsor_c.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 2000,
        ingredients: [
            { key: 'metal', amount: 15 },
            { key: 'iron', amount: 10 },
            { key: 'starFragment', amount: 6 },
        ],
        checkRequirement: (userShip) => userShip.propulsorTier === 'B',
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_propulsor_tier = ? WHERE user_id = ?').run('C', userId);
        },
        targetTierOrLevel: 'C',
    },
    {
        id: 'propulsor_d',
        category: CATEGORIES.PROPULSOR,
        titleKey: 'commands.craft.recipes.propulsor_d.title',
        descKey: 'commands.craft.recipes.propulsor_d.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 6000,
        ingredients: [
            { key: 'metal', amount: 25 },
            { key: 'starFragment', amount: 12 },
            { key: 'glowingOre', amount: 6 },
        ],
        checkRequirement: (userShip) => userShip.propulsorTier === 'C',
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_propulsor_tier = ? WHERE user_id = ?').run('D', userId);
        },
        targetTierOrLevel: 'D',
    },
    {
        id: 'propulsor_e',
        category: CATEGORIES.PROPULSOR,
        titleKey: 'commands.craft.recipes.propulsor_e.title',
        descKey: 'commands.craft.recipes.propulsor_e.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 15000,
        ingredients: [
            { key: 'glowingOre', amount: 10 },
            { key: 'planetCore', amount: 3 },
            { key: 'starEssence', amount: 4 },
        ],
        checkRequirement: (userShip) => userShip.propulsorTier === 'D',
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_propulsor_tier = ? WHERE user_id = ?').run('E', userId);
        },
        targetTierOrLevel: 'E',
    },

    // ============================================
    // SONDA DE ESCAVAÇÃO
    // ============================================
    {
        id: 'excavation_2',
        category: CATEGORIES.EXCAVATION,
        titleKey: 'commands.craft.recipes.excavation_2.title',
        descKey: 'commands.craft.recipes.excavation_2.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 300,
        ingredients: [
            { key: 'stone', amount: 15 },
            { key: 'wood', amount: 10 },
            { key: 'copper', amount: 6 },
        ],
        checkRequirement: (userShip) => userShip.excavationProbeLevel === 1,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_excavation_level = ? WHERE user_id = ?').run(2, userId);
        },
        targetTierOrLevel: 2,
    },
    {
        id: 'excavation_3',
        category: CATEGORIES.EXCAVATION,
        titleKey: 'commands.craft.recipes.excavation_3.title',
        descKey: 'commands.craft.recipes.excavation_3.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 2000,
        ingredients: [
            { key: 'stone', amount: 25 },
            { key: 'copper', amount: 15 },
            { key: 'blueCrystal', amount: 6 },
        ],
        checkRequirement: (userShip) => userShip.excavationProbeLevel === 2,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_excavation_level = ? WHERE user_id = ?').run(3, userId);
        },
        targetTierOrLevel: 3,
    },
    {
        id: 'excavation_4',
        category: CATEGORIES.EXCAVATION,
        titleKey: 'commands.craft.recipes.excavation_4.title',
        descKey: 'commands.craft.recipes.excavation_4.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 6000,
        ingredients: [
            { key: 'copper', amount: 30 },
            { key: 'blueCrystal', amount: 12 },
            { key: 'purpleCrystal', amount: 6 },
        ],
        checkRequirement: (userShip) => userShip.excavationProbeLevel === 3,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_excavation_level = ? WHERE user_id = ?').run(4, userId);
        },
        targetTierOrLevel: 4,
    },
    {
        id: 'excavation_5',
        category: CATEGORIES.EXCAVATION,
        titleKey: 'commands.craft.recipes.excavation_5.title',
        descKey: 'commands.craft.recipes.excavation_5.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 15000,
        ingredients: [
            { key: 'purpleCrystal', amount: 10 },
            { key: 'planetCore', amount: 4 },
            { key: 'cosmicPearl', amount: 3 },
        ],
        checkRequirement: (userShip) => userShip.excavationProbeLevel === 4,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_excavation_level = ? WHERE user_id = ?').run(5, userId);
        },
        targetTierOrLevel: 5,
    },

    // ============================================
    // SCANNER ESTELAR
    // ============================================
    {
        id: 'scanner_2',
        category: CATEGORIES.SCANNER,
        titleKey: 'commands.craft.recipes.scanner_2.title',
        descKey: 'commands.craft.recipes.scanner_2.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 300,
        ingredients: [
            { key: 'dirt', amount: 15 },
            { key: 'wood', amount: 10 },
            { key: 'iron', amount: 5 },
        ],
        checkRequirement: (userShip) => userShip.starScannerLevel === 1,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_scanner_level = ? WHERE user_id = ?').run(2, userId);
        },
        targetTierOrLevel: 2,
    },
    {
        id: 'scanner_3',
        category: CATEGORIES.SCANNER,
        titleKey: 'commands.craft.recipes.scanner_3.title',
        descKey: 'commands.craft.recipes.scanner_3.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 2000,
        ingredients: [
            { key: 'dirt', amount: 25 },
            { key: 'copper', amount: 10 },
            { key: 'blueCrystal', amount: 4 },
            { key: 'starFragment', amount: 4 },
        ],
        checkRequirement: (userShip) => userShip.starScannerLevel === 2,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_scanner_level = ? WHERE user_id = ?').run(3, userId);
        },
        targetTierOrLevel: 3,
    },
    {
        id: 'scanner_4',
        category: CATEGORIES.SCANNER,
        titleKey: 'commands.craft.recipes.scanner_4.title',
        descKey: 'commands.craft.recipes.scanner_4.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 6000,
        ingredients: [
            { key: 'starFragment', amount: 10 },
            { key: 'purpleCrystal', amount: 5 },
            { key: 'glowingOre', amount: 5 },
        ],
        checkRequirement: (userShip) => userShip.starScannerLevel === 3,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_scanner_level = ? WHERE user_id = ?').run(4, userId);
        },
        targetTierOrLevel: 4,
    },
    {
        id: 'scanner_5',
        category: CATEGORIES.SCANNER,
        titleKey: 'commands.craft.recipes.scanner_5.title',
        descKey: 'commands.craft.recipes.scanner_5.desc',
        craftSeconds: 300, // 5 minutos
        coinsCost: 15000,
        ingredients: [
            { key: 'purpleCrystal', amount: 8 },
            { key: 'planetCore', amount: 3 },
            { key: 'cosmicPearl', amount: 5 },
            { key: 'starEssence', amount: 2 },
        ],
        checkRequirement: (userShip) => userShip.starScannerLevel === 4,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_scanner_level = ? WHERE user_id = ?').run(5, userId);
        },
        targetTierOrLevel: 5,
    },

    // ============================================
    // CONSUMÍVEIS — geradas a partir de gameConfig/consumables.js.
    // Repetíveis (sem pré-requisito); o item vai pra `user_items` e é gasto
    // ao iniciar uma missão no /planet.
    // ============================================
    ...CONSUMABLES.map((item) => ({
        id: `consumable_${item.key}`,
        category: CATEGORIES.CONSUMABLES,
        titleKey: 'commands.craft.consumableTitle',
        descKey: `commands.consumables.${item.key}.desc`,
        craftSeconds: item.recipe.craftSeconds,
        coinsCost: item.recipe.coinsCost,
        ingredients: item.recipe.ingredients,
        consumableKey: item.key,
        applyReward: (db, userId) => {
            db.prepare(`
                INSERT INTO user_items (user_id, item_key, quantity)
                VALUES (?, ?, 1)
                ON CONFLICT(user_id, item_key) DO UPDATE SET quantity = quantity + 1
            `).run(userId, item.key);
        },
    })),
];

const getAllRecipes = () => CRAFT_RECIPES;

const getRecipe = (id) => CRAFT_RECIPES.find((r) => r.id === id) ?? null;

const getRecipesByCategory = (category) => CRAFT_RECIPES.filter((r) => r.category === category);

// Monta as variáveis pra interpolar no texto de descrição da receita
// (locales/*.json, chave `descKey`) SEMPRE lendo o valor atual direto de
// gameConfig/shipUpgrades.js (via utils/ship.js) — assim, se alguém mudar
// um número lá (velocidade, bônus, tempo de mineração, efeito de consumível), a
// tela de /craft reflete na hora, sem precisar caçar texto duplicado em
// locale pra atualizar também.
const getRecipeDescParams = (recipe, lang) => {
    switch (recipe.category) {
        case CATEGORIES.PROPULSOR: {
            const tier = getPropulsorTier(recipe.targetTierOrLevel);
            return { speed: formatSpeed(tier.speedKms, lang) };
        }
        case CATEGORIES.EXCAVATION: {
            const tier = getExcavationTier(recipe.targetTierOrLevel);
            return { bonus: tier.bonus };
        }
        case CATEGORIES.SCANNER: {
            const tier = getScannerTier(recipe.targetTierOrLevel);
            return { minutes: tier.miningMinutes };
        }
        case CATEGORIES.CONSUMABLES: {
            const item = CONSUMABLES.find((c) => c.key === recipe.consumableKey);
            return {
                name: getConsumableName(recipe.consumableKey, lang),
                percent: item?.effect.resourceBonusPercent ?? item?.effect.travelReductionPercent ?? 0,
            };
        }
        default:
            return {};
    }
};

// Diz se o jogador já possui essa melhoria (ou uma superior) — usado pra
// distinguir "você já fabricou isso" de "você ainda não desbloqueou o
// pré-requisito", já que checkRequirement() sozinho retorna `false` nos
// dois casos.
const isRecipeAlreadyOwned = (recipe, userShip) => {
    switch (recipe.category) {
        case CATEGORIES.PROPULSOR: {
            const currentIndex = PROPULSOR_TIERS.findIndex((t) => t.code === userShip.propulsorTier);
            const targetIndex = PROPULSOR_TIERS.findIndex((t) => t.code === recipe.targetTierOrLevel);
            return currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex;
        }
        case CATEGORIES.EXCAVATION:
            return (userShip.excavationProbeLevel ?? 1) >= recipe.targetTierOrLevel;
        case CATEGORIES.SCANNER:
            return (userShip.starScannerLevel ?? 1) >= recipe.targetTierOrLevel;
        default:
            return false;
    }
};

module.exports = {
    CATEGORIES,
    CRAFT_RECIPES,
    getAllRecipes,
    getRecipe,
    getRecipesByCategory,
    getRecipeDescParams,
    isRecipeAlreadyOwned,
};
