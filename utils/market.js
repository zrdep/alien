const MARKET_RESOURCES = {
    stone: {
        key: 'stone',
        namePt: 'Pedra',
        nameEn: 'Rock',
        emoji: '<:rock:1536579687407681596>',
        systemShopPrice: 50,
    },
    wood: {
        key: 'wood',
        namePt: 'Madeira',
        nameEn: 'Wood',
        emoji: '<:wood:1536579684706418698>',
        systemShopPrice: 50,
    },
    dirt: {
        key: 'dirt',
        namePt: 'Terra',
        nameEn: 'Dirt',
        emoji: '<:dirt:1536579675172904960>',
        systemShopPrice: 30,
    },
    iron: {
        key: 'iron',
        namePt: 'Ferro',
        nameEn: 'Iron',
        emoji: '<:iron:1536579671871856681>',
        systemShopPrice: 100,
    },
    copper: {
        key: 'copper',
        namePt: 'Cobre',
        nameEn: 'Copper',
        emoji: '<:copper:1536579668986306581>',
        systemShopPrice: 100,
    },
    metal: {
        key: 'metal',
        namePt: 'Metal',
        nameEn: 'Metal',
        emoji: '<:metal:1536579666385567774>',
        systemShopPrice: 150,
    },
    blueCrystal: {
        key: 'blueCrystal',
        namePt: 'Cristal Azul',
        nameEn: 'Blue Crystal',
        emoji: '<:blue_crystal:1536579663739093022>',
        systemShopPrice: 400,
    },
    starFragment: {
        key: 'starFragment',
        namePt: 'Fragmento Estelar',
        nameEn: 'Stellar Fragment',
        emoji: '<:stellar_fragment:1536579660178006057>',
        systemShopPrice: 600,
    },
    purpleCrystal: {
        key: 'purpleCrystal',
        namePt: 'Cristal Roxo',
        nameEn: 'Purple Crystal',
        emoji: '<:purple_crystal:1536579657489588224>',
        systemShopPrice: 1000,
    },
    glowingOre: {
        key: 'glowingOre',
        namePt: 'Minério Luminoso',
        nameEn: 'Luminous Ore',
        emoji: '<:luminous_ore:1536579654285262939>',
        systemShopPrice: 1500,
    },
    planetCore: {
        key: 'planetCore',
        namePt: 'Núcleo Planetário',
        nameEn: 'Planetary Core',
        emoji: '<:planetary_core:1536579651437330432>',
        systemShopPrice: 3000,
    },
    cosmicPearl: {
        key: 'cosmicPearl',
        namePt: 'Pérola Cósmica',
        nameEn: 'Cosmic Pearl',
        emoji: '<:cosmic_pearl:1536579648073371658>',
        systemShopPrice: 5000,
    },
    starEssence: {
        key: 'starEssence',
        namePt: 'Essência Estelar',
        nameEn: 'Stellar Essence',
        emoji: '<:stellar_essence:1536579644692889651>',
        systemShopPrice: 10000,
    },
};

const getResourceInfo = (key) => MARKET_RESOURCES[key] ?? null;

const getAllMarketResources = () => Object.values(MARKET_RESOURCES);

const isValidResourceKey = (key) => key in MARKET_RESOURCES;

module.exports = {
    MARKET_RESOURCES,
    getResourceInfo,
    getAllMarketResources,
    isValidResourceKey,
};
