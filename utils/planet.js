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

const SUFIXOS_RARIDADE = [
    { code: 'A', label: { 'pt-BR': 'Comum',     'en-US': 'Common'     }, color: 0x9ca3af, weight: 60 },
    { code: 'B', label: { 'pt-BR': 'Incomum',   'en-US': 'Uncommon'   }, color: 0x22c55e, weight: 25 },
    { code: 'C', label: { 'pt-BR': 'Raro',      'en-US': 'Rare'       }, color: 0x3b82f6, weight: 10 },
    { code: 'D', label: { 'pt-BR': 'Épico',     'en-US': 'Epic'       }, color: 0xa855f7, weight: 4  },
    { code: 'E', label: { 'pt-BR': 'Lendário',  'en-US': 'Legendary'  }, color: 0xf59e0b, weight: 1  },
];

const hashNum = (str, max = 1) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % max);
};

const weightedPick = (items, seed) => {
    const total = items.reduce((s, it) => s + (it.weight ?? 1), 0);
    let r = (hashNum(seed + '-rarity', total) / total) * total;
    for (const it of items) {
        r -= (it.weight ?? 1);
        if (r <= 0) return it;
    }
    return items[items.length - 1];
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

    const sufixo = weightedPick(SUFIXOS_RARIDADE, seed);

    const numeroStr = numero.toString().padStart(3, '0');
    const nome = `${prefixo}-${numeroStr}${sufixo.code}`;

    return {
        nome,
        prefixo,
        numero,
        numeroStr,
        sufixo,
        seedDicebear: nome,
        raridadeCode: sufixo.code,
        raridadeLabel: (lang) => sufixo.label[lang] ?? sufixo.label['pt-BR'],
        raridadeColor: sufixo.color,
    };
};

module.exports = {
    PREFIXOS,
    SUFIXOS_RARIDADE,
    gerarDadosPlaneta,
};
