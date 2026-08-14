const { getRarity } = require('../gameConfig/rarities');
const { getDailyEligibleResources } = require('../gameConfig/resources');

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
 * As chances por raridade vêm de gameConfig/rarities.js (`missionCoinChances`) —
 * ao adicionar uma raridade nova lá, ela já funciona aqui automaticamente.
 */
function generateMissionCoins(planetRarityCode) {
    const { bronze, silver, gold } = getRarity(planetRarityCode).missionCoinChances;

    const roll = Math.random() * 100;
    let selectedTier;

    if (roll < bronze) {
        selectedTier = COIN_TYPES.BRONZE;
    } else if (roll < bronze + silver) {
        selectedTier = COIN_TYPES.SILVER;
    } else {
        selectedTier = COIN_TYPES.GOLD;
        void gold; // gold é o restante da faixa (100 - bronze - silver); mantido no config por clareza.
    }

    const amount = getRandomStepValue(selectedTier.min, selectedTier.max, selectedTier.step);

    return {
        type: selectedTier.type,
        emoji: selectedTier.emoji,
        amount,
    };
}

function generateDailyCoins(streak = 1) {
    const base = getRandomStepValue(1000, 2000, 100);

    const streakBonus = Math.min(Math.max(streak - 1, 0), 6) * 100;

    const amount = base + streakBonus;

    return {
        type: 'daily',
        emoji: '<:gold_coins:1536941656178298992>',
        amount,
        streakBonus,
    };
}

/**
 * Sorteia 3 recursos elegíveis para o /daily (gameConfig/resources.js, campo
 * `daily.eligible`), cada um com quantidade dentro da faixa configurada
 * (`daily.min`/`daily.max`) para aquele recurso.
 */
function generateDailyResources() {
    const eligible = getDailyEligibleResources();

    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    return selected.map((resource) => ({
        key: resource.key,
        emoji: resource.emoji,
        amount: Math.floor(Math.random() * (resource.daily.max - resource.daily.min + 1)) + resource.daily.min,
    }));
}

module.exports = {
    COIN_TYPES,
    getRandomStepValue,
    generateMissionCoins,
    generateDailyCoins,
    generateDailyResources,
};
