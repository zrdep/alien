const CATEGORIES = {
    PROPULSOR: 'propulsor',
    EXCAVATION: 'excavation',
    SCANNER: 'scanner',
};

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
        ingredients: [
            { key: 'metal', amount: 10 },
            { key: 'iron', amount: 8 },
            { key: 'stone', amount: 6 },
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
        craftSeconds: 1200, // 20 minutos
        ingredients: [
            { key: 'blueCrystal', amount: 10 },
            { key: 'metal', amount: 8 },
            { key: 'starFragment', amount: 5 },
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
        craftSeconds: 3600, // 1 hora
        ingredients: [
            { key: 'purpleCrystal', amount: 4 },
            { key: 'glowingOre', amount: 3 },
            { key: 'planetCore', amount: 2 },
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
        craftSeconds: 10800, // 3 horas
        ingredients: [
            { key: 'cosmicPearl', amount: 5 },
            { key: 'planetCore', amount: 3 },
            { key: 'starEssence', amount: 2 },
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
        ingredients: [
            { key: 'stone', amount: 8 },
            { key: 'wood', amount: 6 },
            { key: 'iron', amount: 4 },
            { key: 'blueCrystal', amount: 1 },
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
        craftSeconds: 1200, // 20 minutos
        ingredients: [
            { key: 'metal', amount: 7 },
            { key: 'copper', amount: 5 },
            { key: 'blueCrystal', amount: 3 },
            { key: 'glowingOre', amount: 1 },
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
        craftSeconds: 3600, // 1 hora
        ingredients: [
            { key: 'purpleCrystal', amount: 8 },
            { key: 'starFragment', amount: 6 },
            { key: 'glowingOre', amount: 4 },
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
        craftSeconds: 10800, // 3 horas
        ingredients: [
            { key: 'planetCore', amount: 3 },
            { key: 'cosmicPearl', amount: 2 },
            { key: 'starEssence', amount: 1 },
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
        ingredients: [
            { key: 'metal', amount: 8 },
            { key: 'iron', amount: 6 },
            { key: 'blueCrystal', amount: 2 },
            { key: 'starFragment', amount: 1 },
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
        craftSeconds: 1200, // 20 minutos
        ingredients: [
            { key: 'wood', amount: 10 },
            { key: 'dirt', amount: 8 },
            { key: 'metal', amount: 6 },
            { key: 'purpleCrystal', amount: 2 },
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
        craftSeconds: 3600, // 1 hora
        ingredients: [
            { key: 'purpleCrystal', amount: 4 },
            { key: 'glowingOre', amount: 3 },
            { key: 'planetCore', amount: 2 },
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
        craftSeconds: 10800, // 3 horas
        ingredients: [
            { key: 'cosmicPearl', amount: 3 },
            { key: 'planetCore', amount: 2 },
            { key: 'starEssence', amount: 2 },
        ],
        checkRequirement: (userShip) => userShip.starScannerLevel === 4,
        applyReward: (db, userId) => {
            db.prepare('UPDATE users SET ship_scanner_level = ? WHERE user_id = ?').run(5, userId);
        },
        targetTierOrLevel: 5,
    },
];

const getAllRecipes = () => CRAFT_RECIPES;

const getRecipe = (id) => CRAFT_RECIPES.find((r) => r.id === id) ?? null;

const getRecipesByCategory = (category) => CRAFT_RECIPES.filter((r) => r.category === category);

module.exports = {
    CATEGORIES,
    CRAFT_RECIPES,
    getAllRecipes,
    getRecipe,
    getRecipesByCategory,
};
