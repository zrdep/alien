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
    // Daily chances: 35% Bronze, 45% Silver, 20% Gold
    const roll = Math.random() * 100;
    let selectedTier;

    if (roll < 35) {
        selectedTier = COIN_TYPES.BRONZE;
    } else if (roll < 80) {
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

module.exports = {
    COIN_TYPES,
    getRandomStepValue,
    generateMissionCoins,
    generateDailyCoins,
};
