// Lógica de SORTEIO de recursos ao explorar um planeta. Os DADOS (quais
// recursos existem, qual raridade tem, quanto cai por planeta) vêm de
// gameConfig/resources.js, gameConfig/rarities.js e gameConfig/planetDropTables.js —
// este arquivo só contém o algoritmo de sorteio em si.

const { hashRange, hashPercent } = require('./hash');
const { getResource } = require('../gameConfig/resources');
const { getRarity } = require('../gameConfig/rarities');
const { getDropTable } = require('../gameConfig/planetDropTables');

const MAX_RESOURCES_PER_PLANET = 4;
const MIN_RESOURCES_PER_PLANET = 3;
const MAX_FILL_PASSES = 8;

const rollResourcesPass = (planetSeed, planetRarityCode, passIdx, usedKeys, currentCount) => {
    const table = getDropTable(planetRarityCode);
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
            const res = getResource(entry.resource);
            if (!res) continue; // config inválida — já é pego por validateGameConfig() no boot

            const range = getRarity(res.rarity);
            const amount = hashRange(`${saltedSeed}-qtd`, range.resourceAmountMin, range.resourceAmountMax);

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
        const table = getDropTable(planetRarityCode);
        for (let i = 0; i < table.length && chosen.length < MIN_RESOURCES_PER_PLANET; i++) {
            const entry = table[i];
            if (usedKeys.has(entry.resource)) continue;
            usedKeys.add(entry.resource);

            const res = getResource(entry.resource);
            if (!res) continue;

            const range = getRarity(res.rarity);
            const amount = hashRange(`${planetSeed}-force-${entry.resource}`, range.resourceAmountMin, range.resourceAmountMax);

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

const getResourceMeta = (key) => {
    const res = getResource(key);
    if (!res) return null;
    return { key: res.key, rarity: res.rarity, emoji: res.emoji };
};

module.exports = {
    MAX_RESOURCES_PER_PLANET,
    gerarRecursosPlaneta,
    getResourceMeta,
};
