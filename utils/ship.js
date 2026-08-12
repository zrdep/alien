const { t } = require('./i18n');
const { getUserLanguage } = require('./db');

const RARITY_EMOJI = {
    A: '<:comum:1536459746364760215>',
    B: '<:incomum:1536459764492533800>',
    C: '<:rare:1536459780166647878>',
    D: '<:epic:1536459798269395044>',
    E: '<:legendary:1536459814475927653>',
};

const PROPULSOR_TIERS = [
    { code: 'A', speedKms: 4500,  rarityKey: 'A' },
    { code: 'B', speedKms: 12000, rarityKey: 'B' },
    { code: 'C', speedKms: 36000, rarityKey: 'C' },
    { code: 'D', speedKms: 60000, rarityKey: 'D' },
    { code: 'E', speedKms: 120000, rarityKey: 'E' },
];

const EXCAVATION_TIERS = [
    { code: 'A', rarityKey: 'A', depth: 50,  bonus: 0  },
    { code: 'B', rarityKey: 'B', depth: 80,  bonus: 5  },
    { code: 'C', rarityKey: 'C', depth: 120, bonus: 10 },
    { code: 'D', rarityKey: 'D', depth: 180, bonus: 18 },
    { code: 'E', rarityKey: 'E', depth: 250, bonus: 28 },
];

const DEFAULT_SHIP = {
    excavationProbeLevel: 1,
    propulsorTier: 'A',
    starScannerLevel: 1,
};

const SCANNER_TIERS = [
    { code: 'A', rarityKey: 'A', range: 3  },
    { code: 'B', rarityKey: 'B', range: 6  },
    { code: 'C', rarityKey: 'C', range: 10 },
    { code: 'D', rarityKey: 'D', range: 15 },
    { code: 'E', rarityKey: 'E', range: 25 },
];

const formatSpeed = (speedKms, lang) => {
    const locale = lang === 'en-US' ? 'en-US' : 'pt-BR';
    return `${speedKms.toLocaleString(locale)} km/s`;
};

const getPropulsorTier = (code) => {
    return PROPULSOR_TIERS.find((tier) => tier.code === code) ?? PROPULSOR_TIERS[0];
};

const getExcavationTier = (levelOrCode) => {
    if (typeof levelOrCode === 'string') {
        return EXCAVATION_TIERS.find((tier) => tier.code === levelOrCode) ?? EXCAVATION_TIERS[0];
    }
    const index = Math.max(0, Math.min(levelOrCode - 1, EXCAVATION_TIERS.length - 1));
    return EXCAVATION_TIERS[index];
};

const getScannerTier = (levelOrCode) => {
    if (typeof levelOrCode === 'string') {
        return SCANNER_TIERS.find((tier) => tier.code === levelOrCode) ?? SCANNER_TIERS[0];
    }
    const index = Math.max(0, Math.min(levelOrCode - 1, SCANNER_TIERS.length - 1));
    return SCANNER_TIERS[index];
};

const buildHangarContent = (userId, usage, ship = DEFAULT_SHIP) => {
    const lang = getUserLanguage(userId);
    const propulsor = getPropulsorTier(ship.propulsorTier);
    const excavation = getExcavationTier(ship.excavationProbeLevel);
    const excavationRarity = t(userId, `commands.planet.rarity${excavation.rarityKey}`);
    const propulsorRarity = t(userId, `commands.planet.rarity${propulsor.rarityKey}`);
    const scanner = getScannerTier(ship.starScannerLevel);
    const scannerRarity = t(userId, `commands.planet.rarity${scanner.rarityKey}`);

    const hangarTitle = t(userId, 'commands.alien.hangarTitle');
    const usageUsed = t(userId, 'commands.alien.hangarUsageUsed', {
        uses: usage.uses,
        limit: usage.limit,
    });
    const usageRemaining = t(userId, 'commands.alien.hangarUsageRemaining', {
        remaining: usage.remaining,
    });
    const usageReset = t(userId, 'commands.alien.hangarUsageReset', {
        time: usage.nextReset.label,
    });

    const upgradesTitle = t(userId, 'commands.alien.upgradesTitle');

    const excavationName = t(userId, 'commands.alien.upgrade.excavation.name');
    const excavationLine = t(userId, 'commands.alien.upgrade.excavation.stat', {
        emoji: RARITY_EMOJI[excavation.rarityKey],
        rarity: excavationRarity,
        depth: excavation.depth,
        bonus: excavation.bonus,
    });

    const propulsorName = t(userId, 'commands.alien.upgrade.propulsor.name');
    const propulsorLine = t(userId, 'commands.alien.upgrade.propulsor.stat', {
        emoji: RARITY_EMOJI[propulsor.rarityKey],
        rarity: propulsorRarity,
        speed: formatSpeed(propulsor.speedKms, lang),
    });

    const scannerName = t(userId, 'commands.alien.upgrade.scanner.name');
    const scannerLine = t(userId, 'commands.alien.upgrade.scanner.stat', {
        emoji: RARITY_EMOJI[scanner.rarityKey],
        rarity: scannerRarity,
        range: scanner.range,
    });

    return `## <:ovni:1536247726889762847> ${hangarTitle}
<:loading:1536247662372982794> ${usageUsed}
<:hmm:1536247599365890139> ${usageRemaining}
<:restart:1536248409634246719> ${usageReset}
## <:saturn:1536459943480270959> ${upgradesTitle}
### ${excavationName}
${excavationLine}
### ${propulsorName}
${propulsorLine}
### ${scannerName}
${scannerLine}`;
};

module.exports = {
    RARITY_EMOJI,
    PROPULSOR_TIERS,
    EXCAVATION_TIERS,
    SCANNER_TIERS,
    DEFAULT_SHIP,
    formatSpeed,
    getPropulsorTier,
    getExcavationTier,
    getScannerTier,
    buildHangarContent,
};
