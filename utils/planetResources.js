const RESOURCE_RARITY = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
};

const RESOURCES = {
    stone:   { key: 'stone',   rarity: RESOURCE_RARITY.A, emoji: '<:rock:1536579687407681596>' },
    wood:    { key: 'wood',    rarity: RESOURCE_RARITY.A, emoji: '<:wood:1536579684706418698>' },
    dirt:    { key: 'dirt',    rarity: RESOURCE_RARITY.A, emoji: '<:dirt:1536579675172904960>' },
    iron:    { key: 'iron',    rarity: RESOURCE_RARITY.B, emoji: '<:iron:1536579671871856681>' },
    copper:  { key: 'copper',  rarity: RESOURCE_RARITY.B, emoji: '<:copper:1536579668986306581>' },
    metal:   { key: 'metal',   rarity: RESOURCE_RARITY.C, emoji: '<:metal:1536579666385567774>' },
    blueCrystal:   { key: 'blueCrystal',   rarity: RESOURCE_RARITY.C, emoji: '<:blue_crystal:1536579663739093022>' },
    starFragment:  { key: 'starFragment',  rarity: RESOURCE_RARITY.C, emoji: '<:stellar_fragment:1536579660178006057>' },
    purpleCrystal: { key: 'purpleCrystal', rarity: RESOURCE_RARITY.D, emoji: '<:purple_crystal:1536579657489588224>' },
    glowingOre:    { key: 'glowingOre',    rarity: RESOURCE_RARITY.D, emoji: '<:luminous_ore:1536579654285262939>' },
    planetCore:    { key: 'planetCore',    rarity: RESOURCE_RARITY.E, emoji: '<:planetary_core:1536579651437330432>' },
    cosmicPearl:   { key: 'cosmicPearl',   rarity: RESOURCE_RARITY.E, emoji: '<:cosmic_pearl:1536579648073371658>' },
    starEssence:   { key: 'starEssence',   rarity: RESOURCE_RARITY.E, emoji: '<:stellar_essence:1536579644692889651>' },
};

const AMOUNT_RANGE = {
    A: { min: 8,  max: 20 },
    B: { min: 5,  max: 14 },
    C: { min: 2,  max: 8  },
    D: { min: 2,  max: 6  },
    E: { min: 1,  max: 4  },
};

const DROP_TABLE = {
    A: [
        { resource: 'stone',   chance: 35 },
        { resource: 'wood',    chance: 35 },
        { resource: 'dirt',    chance: 20 },
        { resource: 'metal',   chance: 10 },
    ],
    B: [
        { resource: 'iron',    chance: 35 },
        { resource: 'copper',  chance: 30 },
        { resource: 'stone',   chance: 20 },
        { resource: 'wood',    chance: 15 },
    ],
    C: [
        { resource: 'blueCrystal',  chance: 40 },
        { resource: 'starFragment', chance: 30 },
        { resource: 'metal',        chance: 15 },
        { resource: 'iron',         chance: 15 },
    ],
    D: [
        { resource: 'purpleCrystal', chance: 40 },
        { resource: 'glowingOre',    chance: 30 },
        { resource: 'starFragment',  chance: 20 },
        { resource: 'planetCore',    chance: 10 },
    ],
    E: [
        { resource: 'cosmicPearl',   chance: 35 },
        { resource: 'planetCore',    chance: 30 },
        { resource: 'purpleCrystal', chance: 20 },
        { resource: 'starEssence',   chance: 15 },
    ],
};

const MAX_RESOURCES_PER_PLANET = 4;
const MIN_RESOURCES_PER_PLANET = 3;
const MAX_FILL_PASSES = 8;

const hashNum = (str, max = 1) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % max);
};

const hashRange = (str, min, max) => {
    const range = max - min + 1;
    return hashNum(str, range) + min;
};

const hashPercent = (str) => {
    return hashNum(str, 10000) / 100;
};

const rollResourcesPass = (planetSeed, planetRarityCode, passIdx, usedKeys, currentCount) => {
    const table = DROP_TABLE[planetRarityCode] ?? DROP_TABLE.A;
    const found = [];
    const chanceBoost = passIdx * 18;

    for (let i = 0; i < table.length; i++) {
        if (currentCount + found.length >= MAX_RESOURCES_PER_PLANET) break;

        const entry = table[i];
        if (usedKeys.has(entry.resource)) continue;

        const saltedSeed = `${planetSeed}-res-${passIdx}-${i}-${entry.resource}`;
        const roll = hashPercent(saltedSeed);
        const effectiveChance = Math.min(98, entry.chance + chanceBoost);

        if (roll < effectiveChance) {
            usedKeys.add(entry.resource);
            const res = RESOURCES[entry.resource];
            const range = AMOUNT_RANGE[res.rarity];
            const amount = hashRange(`${saltedSeed}-qtd`, range.min, range.max);

            found.push({
                key: res.key,
                amount,
                rarity: res.rarity,
                emoji: res.emoji,
            });
        }
    }

    return found;
};

const gerarRecursosPlaneta = (planetSeed, planetRarityCode) => {
    const usedKeys = new Set();
    const chosen = [];

    for (let pass = 0; pass < MAX_FILL_PASSES; pass++) {
        const batch = rollResourcesPass(planetSeed, planetRarityCode, pass, usedKeys, chosen.length);
        chosen.push(...batch);
        if (chosen.length >= MIN_RESOURCES_PER_PLANET) break;
    }

    if (chosen.length < MIN_RESOURCES_PER_PLANET) {
        const table = DROP_TABLE[planetRarityCode] ?? DROP_TABLE.A;
        for (let i = 0; i < table.length && chosen.length < MIN_RESOURCES_PER_PLANET; i++) {
            const entry = table[i];
            if (usedKeys.has(entry.resource)) continue;
            usedKeys.add(entry.resource);

            const res = RESOURCES[entry.resource];
            const range = AMOUNT_RANGE[res.rarity];
            const amount = hashRange(`${planetSeed}-force-${entry.resource}`, range.min, range.max);

            chosen.push({
                key: res.key,
                amount,
                rarity: res.rarity,
                emoji: res.emoji,
            });
        }
    }

    chosen.sort((a, b) => {
        const order = { E: 0, D: 1, C: 2, B: 3, A: 4 };
        return (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9);
    });

    return chosen;
};

const getResourceMeta = (key) => RESOURCES[key] ?? null;

module.exports = {
    RESOURCES,
    RESOURCE_RARITY,
    AMOUNT_RANGE,
    DROP_TABLE,
    MAX_RESOURCES_PER_PLANET,
    gerarRecursosPlaneta,
    getResourceMeta,
};
