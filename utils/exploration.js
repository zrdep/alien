const { t } = require('./i18n');
const { getUserLanguage, getUserAlien } = require('./db');
const { getPropulsorTier } = require('./ship');
const { formatResourcesInline } = require('./resourcesDisplay');

const EXPLORE_OFFER_MS = 3 * 60 * 1000;
const COLLECT_DURATION_MS = 10 * 60 * 1000;

const MISSION_STATUS = {
    TRAVELING_OUT: 'traveling_out',
    COLLECTING: 'collecting',
    TRAVELING_BACK: 'traveling_back',
};

const calculateTravelSeconds = (distanceKm, propulsorTierCode) => {
    const tier = getPropulsorTier(propulsorTierCode);
    const seconds = Math.ceil(distanceKm / tier.speedKms);
    return Math.max(1, seconds);
};

const formatDuration = (totalSeconds, lang) => {
    const usePt = lang !== 'en-US';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        if (usePt) {
            return minutes > 0
                ? `${hours}h ${minutes}min`
                : `${hours}h`;
        }
        return minutes > 0
            ? `${hours}h ${minutes}m`
            : `${hours}h`;
    }

    if (minutes > 0) {
        if (seconds > 0) {
            return usePt
                ? `${minutes} min ${seconds}s`
                : `${minutes}m ${seconds}s`;
        }
        return usePt ? `${minutes} min` : `${minutes}m`;
    }

    return usePt ? `${seconds}s` : `${seconds}s`;
};

const formatTimeRemaining = (endsAtMs, lang, now = Date.now()) => {
    const diffSec = Math.max(0, Math.ceil((endsAtMs - now) / 1000));
    return formatDuration(diffSec, lang);
};

const getAlienDisplayName = (userId) => {
    const alien = getUserAlien(userId);
    if (alien?.name) return alien.name;
    return t(userId, 'commands.alien.defaultName');
};

const parseMissionResources = (mission) => {
    try {
        return JSON.parse(mission.resources_json);
    } catch {
        return [];
    }
};

const formatCoinsText = (lang, coinsData) => {
    if (!coinsData || !coinsData.amount) return '';
    const amountStr = coinsData.amount.toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');
    return `\n${coinsData.emoji} **+${amountStr}** ∩oins`;
};

const buildMissionStatusContent = (userId, mission) => {
    const lang = getUserLanguage(userId);
    const alienName = getAlienDisplayName(userId);
    const resources = parseMissionResources(mission);
    const resourcesText = formatResourcesInline(lang, resources);
    const eta = formatTimeRemaining(mission.phase_ends_at, lang);

    const getMissionCoins = () => {
        if (mission.coins_json) {
            try {
                return JSON.parse(mission.coins_json);
            } catch {
                return null;
            }
        }
        const { generateMissionCoins } = require('./coins');
        return generateMissionCoins(mission.planet_rarity);
    };

    const coinsText = formatCoinsText(lang, getMissionCoins());

    if (mission.status === MISSION_STATUS.TRAVELING_OUT) {
        return `<:ovni:1536247726889762847> **${t(userId, 'commands.planet.missionTravelingTitle')}**

<:loading:1536247662372982794> ${t(userId, 'commands.planet.missionTravelingBody', {
            alien: alienName,
            planet: mission.planet_name,
        })}

${t(userId, 'commands.planet.missionCollectingFor')}
${resourcesText}

<:saturn:1536459943480270959> ${t(userId, 'commands.planet.missionEta', { time: eta })}`;
    }

    if (mission.status === MISSION_STATUS.COLLECTING) {
        return `<:earth:1536459925495087226> **${t(userId, 'commands.planet.missionCollectingTitle')}**

<:excited:1536247579061256252> ${t(userId, 'commands.planet.missionCollectingBody', {
            alien: alienName,
            planet: mission.planet_name,
        })}

${t(userId, 'commands.planet.missionCollectingFor')}
${resourcesText}

<:loading:1536247662372982794> ${t(userId, 'commands.planet.missionCollectingEta', { time: eta })}`;
    }

    if (mission.status === MISSION_STATUS.TRAVELING_BACK) {
        const coinsData = getMissionCoins();
        const coinsText = formatCoinsText(lang, coinsData);

        return `<:ovni:1536247726889762847> **${t(userId, 'commands.planet.missionReturningTitle')}**

<:passionate:1536247742110634034> ${t(userId, 'commands.planet.missionReturningBody', {
            alien: alienName,
            planet: mission.planet_name,
        })}

${resourcesText}${coinsText}

<:saturn:1536459943480270959> ${t(userId, 'commands.planet.missionEta', { time: eta })}`;
    }

    return '';
};

const buildArrivalNotice = (userId, notice) => {
    const lang = getUserLanguage(userId);
    const resources = notice.resources ?? [];
    const resourcesText = formatResourcesInline(lang, resources);

    let coinsText = '';
    if (notice.coins && notice.coins.amount) {
        const amountStr = notice.coins.amount.toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');
        coinsText = `\n${notice.coins.emoji} **+${amountStr}** ∩oins`;
    }

    return `<:excited:1536247579061256252> **${t(userId, 'commands.planet.missionArrivedTitle')}**

${t(userId, 'commands.planet.missionArrivedBody', {
        alien: notice.alienName,
        planet: notice.planetName,
    })}

${resourcesText}${coinsText}

<:registry:1536459835921530890> ${t(userId, 'commands.planet.missionArrivedTip')}`;
};

const buildExploreStartedContent = (userId, mission) => {
    const lang = getUserLanguage(userId);
    const alienName = getAlienDisplayName(userId);
    const travelTime = formatDuration(mission.travel_seconds, lang);
    const eta = formatTimeRemaining(mission.phase_ends_at, lang);

    return `<:ovni:1536247726889762847> **${t(userId, 'commands.planet.exploreStartedTitle')}**

${t(userId, 'commands.planet.exploreStartedBody', {
        alien: alienName,
        planet: mission.planet_name,
        travel: travelTime,
    })}

<:saturn:1536459943480270959> ${t(userId, 'commands.planet.missionEta', { time: eta })}`;
};

const getExpeditionTimes = (userId, distanceKm, propulsorTier) => {
    const lang = getUserLanguage(userId);
    const oneWaySec = calculateTravelSeconds(distanceKm, propulsorTier);
    const roundTripSec = oneWaySec * 2;
    const miningSec = COLLECT_DURATION_MS / 1000;

    return {
        oneWay: formatDuration(oneWaySec, lang),
        roundTrip: formatDuration(roundTripSec, lang),
        mining: formatDuration(miningSec, lang),
    };
};

module.exports = {
    EXPLORE_OFFER_MS,
    COLLECT_DURATION_MS,
    MISSION_STATUS,
    calculateTravelSeconds,
    formatDuration,
    formatTimeRemaining,
    getAlienDisplayName,
    parseMissionResources,
    getExpeditionTimes,
    buildMissionStatusContent,
    buildArrivalNotice,
    buildExploreStartedContent,
};
