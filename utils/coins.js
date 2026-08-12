const COIN_TYPES = {
    BRONZE: {
        type: 'bronze',
        name: 'Bronze',
        emoji: '<:bronze_coins:1536941654295060580>',
        min: 50,
        max: 200,
        step: 50,
    },
    SILVER: {
        type: 'silver',
        name: 'Prata',
        emoji: '<:silver_coins:1536941657746837597>',
        min: 200,
        max: 500,
        step: 50,
    },
    GOLD: {
        type: 'gold',
        name: 'Ouro',
        emoji: '<:gold_coins:1536941656178298992>',
        min: 500,
        max: 1000,
        step: 50,
    },
};

/**
 * Returns a random integer between min and max (inclusive) stepping by step.
 */
function getRandomStepValue(min, max, step) {
    const stepsCount = Math.floor((max - min) / step) + 1;
    const randomIndex = Math.floor(Math.random() * stepsCount);
    return min + randomIndex * step;
}

/**
 * Generates a coin reward object for missions based on planet rarity.
 */
function generateMissionCoins(planetRarity) {
    let chanceBronze = 60;
    let chanceSilver = 30;
    let chanceGold = 10;

    if (planetRarity === 'B' || planetRarity === 'Incomum') {
        chanceBronze = 55;
        chanceSilver = 33;
        chanceGold = 12;
    } else if (planetRarity === 'C' || planetRarity === 'Raro') {
        chanceBronze = 45;
        chanceSilver = 38;
        chanceGold = 17;
    } else if (planetRarity === 'D' || planetRarity === 'Épico') {
        chanceBronze = 35;
        chanceSilver = 42;
        chanceGold = 23;
    } else if (planetRarity === 'E' || planetRarity === 'Lendário') {
        chanceBronze = 25;
        chanceSilver = 45;
        chanceGold = 30;
    }

    const roll = Math.random() * 100;
    let selectedTier;

    if (roll < chanceBronze) {
        selectedTier = COIN_TYPES.BRONZE;
    } else if (roll < chanceBronze + chanceSilver) {
        selectedTier = COIN_TYPES.SILVER;
    } else {
        selectedTier = COIN_TYPES.GOLD;
    }

    const amount = getRandomStepValue(selectedTier.min, selectedTier.max, selectedTier.step);

    return {
        type: selectedTier.type,
        emoji: selectedTier.emoji,
        amount,
    };
}

/**
 * Generates a coin reward object for daily claim.
 */
function generateDailyCoins() {
    // Daily: 1000 to 2000 coins
    const amount = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;

    return {
        type: 'daily',
        emoji: '<:gold_coins:1536941656178298992>',
        amount,
    };
}

function generateDailyResources() {
    const BASIC_RESOURCES = [
        { key: 'stone', emoji: '<:rock:1536579687407681596>', min: 15, max: 30 },
        { key: 'wood', emoji: '<:wood:1536579684706418698>', min: 15, max: 30 },
        { key: 'dirt', emoji: '<:dirt:1536579675172904960>', min: 15, max: 30 },
        { key: 'iron', emoji: '<:iron:1536579671871856681>', min: 15, max: 30 },
        { key: 'copper', emoji: '<:copper:1536579668986306581>', min: 15, max: 30 },
        { key: 'metal', emoji: '<:metal:1536579666385567774>', min: 5, max: 15 },
    ];

    // Shuffle array to pick 3 random resources
    const shuffled = [...BASIC_RESOURCES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    return selected.map(resource => ({
        key: resource.key,
        emoji: resource.emoji,
        amount: Math.floor(Math.random() * (resource.max - resource.min + 1)) + resource.min,
    }));
}

module.exports = {
    COIN_TYPES,
    getRandomStepValue,
    generateMissionCoins,
    generateDailyCoins,
    generateDailyResources,
};
