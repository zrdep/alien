const { t } = require('./i18n');
const { getUserLanguage } = require('./db');
const { getRarityEmoji, getRarityLabelKey } = require('../gameConfig/rarities');
const { PROPULSOR_TIERS, EXCAVATION_TIERS, SCANNER_TIERS, DEFAULT_SHIP } = require('../gameConfig/shipUpgrades');

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
    const excavationRarity = t(userId, getRarityLabelKey(excavation.rarityCode));
    const propulsorRarity = t(userId, getRarityLabelKey(propulsor.rarityCode));
    const scanner = getScannerTier(ship.starScannerLevel);
    const scannerRarity = t(userId, getRarityLabelKey(scanner.rarityCode));

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
        emoji: getRarityEmoji(excavation.rarityCode),
        rarity: excavationRarity,
        depth: excavation.depth,
        bonus: excavation.bonus,
    });

    const propulsorName = t(userId, 'commands.alien.upgrade.propulsor.name');
    const propulsorLine = t(userId, 'commands.alien.upgrade.propulsor.stat', {
        emoji: getRarityEmoji(propulsor.rarityCode),
        rarity: propulsorRarity,
        speed: formatSpeed(propulsor.speedKms, lang),
    });

    const scannerName = t(userId, 'commands.alien.upgrade.scanner.name');
    const scannerLine = t(userId, 'commands.alien.upgrade.scanner.stat', {
        emoji: getRarityEmoji(scanner.rarityCode),
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
