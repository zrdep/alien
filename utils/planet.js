const { hashNum, hashRange, weightedPick } = require('./hash');
const { RARITIES, getRarity } = require('../gameConfig/rarities');

const PREFIXOS = [
    'Andrômeda',
    'Órion',
    'Kepler',
    'Proxima',
    'Sirius',
    'Vega',
    'Arcturus',
    'Aldebaran',
    'Rigel',
    'Betelgeuse',
    'Pleiades',
    'Antares',
    'Altair',
    'Deneb',
    'Capella',
    'Canopus',
    'Mira',
    'Xerxes',
    'Nova',
    'Cassiopeia',
    'Ursa',
    'Draco',
    'Lyra',
    'Cygnus',
    'Aquila',
    'Hydrus',
    'Corvus',
    'Lupus',
    'Ara',
    'Tucana',
    'Pavo',
    'Grus',
    'Phoenix',
    'Dorado',
    'Mensa',
    'Chama',
    'Volans',
    'Carina',
    'Puppis',
    'Vela',
    'Centaurus',
    'Circinus',
    'Norma',
    'Scorpius',
    'Sagittarius',
    'Corona',
    'Serpens',
    'Hercules',
    'Auriga',
    'Camelopardalis',
];

// A distribuição de raridade dos planetas (peso, faixa de distância) vem toda
// de gameConfig/rarities.js agora — esta lista aqui só adapta o formato pro
// `weightedPick`, que espera um campo `weight`.
const PLANET_RARITY_POOL = RARITIES.map((r) => ({ code: r.code, weight: r.planetWeight }));

const roundToNiceZeroes = (num) => {
    if (num >= 1_000_000) {
        return Math.round(num / 100_000) * 100_000;
    }
    if (num >= 100_000) {
        return Math.round(num / 10_000) * 10_000;
    }
    return Math.round(num / 1_000) * 1_000;
};

const formatDistance = (km, lang = 'pt-BR') => {
    const usePt = lang === 'pt-BR';
    if (km >= 1_000_000) {
        const milhoes = (km / 1_000_000).toFixed(1).replace('.', usePt ? ',' : '.');
        return `${milhoes} ${usePt ? 'milhões' : 'million'} km`;
    }
    const miles = km.toLocaleString(usePt ? 'pt-BR' : 'en-US');
    return `${miles} km`;
};

const randomSeed = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < 16; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
};

const gerarDadosPlaneta = (seedOrNull = null) => {
    const seed = seedOrNull ?? randomSeed();

    const prefixoIdx = hashNum(seed + '-prefix', PREFIXOS.length);
    const prefixo = PREFIXOS[prefixoIdx];

    const numero = hashNum(seed + '-number', 999) + 1;

    const rarityPick = weightedPick(PLANET_RARITY_POOL, seed + '-rarity');
    const rarity = getRarity(rarityPick.code);

    const distanciaRaw = hashRange(`${seed}-dist`, rarity.planetDistanceMin, rarity.planetDistanceMax);
    const distancia = roundToNiceZeroes(distanciaRaw);

    const numeroStr = numero.toString().padStart(3, '0');
    const nome = `${prefixo}-${numeroStr}${rarity.code}`;

    return {
        nome,
        prefixo,
        numero,
        numeroStr,
        distancia,
        distanciaFormat: (lang) => formatDistance(distancia, lang),
        seedDicebear: nome,
        raridadeCode: rarity.code,
        raridadeColor: rarity.color,
    };
};

module.exports = {
    PREFIXOS,
    gerarDadosPlaneta,
};
