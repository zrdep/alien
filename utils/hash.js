// Funções de hash determinístico usadas para gerar planetas/recursos a partir
// de uma seed (mesma seed sempre gera o mesmo resultado). Antes existiam
// cópias idênticas destas funções em utils/planet.js e utils/planetResources.js;
// agora vivem só aqui.

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

/**
 * Escolhe um item de `items` com base em peso (`item.weight`), de forma
 * determinística a partir da seed. Usado para sortear raridade de planeta.
 */
const weightedPick = (items, seed) => {
    const total = items.reduce((s, it) => s + (it.weight ?? 1), 0);
    let r = (hashNum(seed + '-weighted', total) / total) * total;
    for (const it of items) {
        r -= (it.weight ?? 1);
        if (r <= 0) return it;
    }
    return items[items.length - 1];
};

module.exports = {
    hashNum,
    hashRange,
    hashPercent,
    weightedPick,
};
