const { t } = require('./i18n');
const { getUserLanguage, getUserAlien, getUserShip, getDailyState } = require('./db');
const { getPropulsorTier, getExcavationBonusPercent } = require('./ship');
const { getScannerMiningMs } = require('../gameConfig/shipUpgrades');
const { formatResourcesInline } = require('./resourcesDisplay');
const { getHat, getHatName } = require('../gameConfig/hats');
const { getRarityEmoji } = require('../gameConfig/rarities');
const { getConsumable, getConsumableName } = require('../gameConfig/consumables');

const EXPLORE_OFFER_MS = 3 * 60 * 1000;
// Duração de mineração padrão (tier 1 do Scanner Estelar) — usada só como
// fallback quando não temos o nível do scanner do jogador à mão. O valor
// real e dinâmico (15min -> 8min conforme o scanner evolui) vem de
// getScannerMiningMs(), em gameConfig/shipUpgrades.js.
const COLLECT_DURATION_MS = getScannerMiningMs(1);

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

// Linha extra mostrando o bônus de recursos da Sonda de Escavação atual do
// jogador — os valores em `resources` JÁ vêm com o bônus aplicado (ver
// utils/planetResources.js), isso é só um indicador visual de onde ele
// entrou em jogo.
const buildProbeBonusText = (userId) => {
    const ship = getUserShip(userId);
    const bonusPercent = getExcavationBonusPercent(ship.excavationProbeLevel);
    if (bonusPercent <= 0) return '';
    return `\n<:rock:1536579687407681596> ${t(userId, 'commands.planet.probeBonusLabel', { percent: bonusPercent })}`;
};

// Linha do chapéu escondido no planeta (missão em andamento) ou já entregue
// (aviso de chegada). Vazio quando não há chapéu.
const buildHatText = (userId, hatKey) => {
    const hat = hatKey ? getHat(hatKey) : null;
    if (!hat) return '';
    return `\n${t(userId, 'commands.planet.hatLine', {
        emoji: getRarityEmoji(hat.rarity),
        hat: getHatName(hat.key, getUserLanguage(userId)),
    })}`;
};

// Linhas dos consumíveis usados nesta missão (efeito já aplicado).
const buildBoostsText = (userId, boostsJson) => {
    let keys = [];
    try {
        keys = JSON.parse(boostsJson || '[]');
    } catch {
        keys = [];
    }
    const lang = getUserLanguage(userId);
    return keys
        .map((key) => getConsumable(key))
        .filter(Boolean)
        .map((item) => `\n${item.emoji} ${t(userId, 'commands.planet.boostActiveLine', {
            item: getConsumableName(item.key, lang),
            effect: t(userId, `commands.consumables.${item.key}.desc`, {
                percent: item.effect.resourceBonusPercent ?? item.effect.travelReductionPercent ?? 0,
            }),
        })}`)
        .join('');
};

const buildMissionStatusContent = (userId, mission) => {
    const lang = getUserLanguage(userId);
    const alienName = getAlienDisplayName(userId);
    const resources = parseMissionResources(mission);
    const resourcesText = formatResourcesInline(lang, resources);
    const eta = formatTimeRemaining(mission.phase_ends_at, lang);
    const bonusText = buildProbeBonusText(userId);
    const hatText = buildHatText(userId, mission.hat_key) + buildBoostsText(userId, mission.boosts_json);

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
${resourcesText}${bonusText}${coinsText}${hatText}

<:saturn:1536459943480270959> ${t(userId, 'commands.planet.missionEta', { time: eta })}`;
    }

    if (mission.status === MISSION_STATUS.COLLECTING) {
        const coinsData = getMissionCoins();
        const coinsDisplayText = formatCoinsText(lang, coinsData);
        
        return `<:earth:1536459925495087226> **${t(userId, 'commands.planet.missionCollectingTitle')}**

<:excited:1536247579061256252> ${t(userId, 'commands.planet.missionCollectingBody', {
            alien: alienName,
            planet: mission.planet_name,
        })}

${t(userId, 'commands.planet.missionCollectingFor')}
${resourcesText}${bonusText}${coinsDisplayText}${hatText}

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

${resourcesText}${bonusText}${coinsText}${hatText}

<:saturn:1536459943480270959> ${t(userId, 'commands.planet.missionEta', { time: eta })}`;
    }

    return '';
};

// Lembrete do /daily no aviso de chegada (que pode ir pra DM/canal mesmo
// com o jogador longe). Vazio se o daily de hoje já foi resgatado.
const buildDailyReminderText = (userId) => {
    const daily = getDailyState(userId);
    if (!daily.canClaim) return '';
    // nextStreak > 1 = resgatou ontem; se não resgatar hoje, perde a sequência.
    const key = daily.nextStreak > 1
        ? 'commands.planet.dailyReminderStreak'
        : 'commands.planet.dailyReminder';
    return `\n<:passionate:1536247742110634034> ${t(userId, key, { days: daily.nextStreak - 1 })}`;
};

const buildArrivalNotice = (userId, notice) => {
    const lang = getUserLanguage(userId);
    const resources = notice.resources ?? [];
    const resourcesText = formatResourcesInline(lang, resources);
    const bonusText = buildProbeBonusText(userId);
    const hatText = buildHatText(userId, notice.hatKey);

    let coinsText = '';
    if (notice.coins && notice.coins.amount) {
        const amountStr = notice.coins.amount.toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');
        coinsText = `\n${notice.coins.emoji} **+${amountStr}** ∩oins`;
    }

    return `<:excited:1536247579061256252> **${t(userId, 'commands.planet.missionArrivedTitle')}**

${t(userId, 'commands.planet.missionArrivedBody', {
        alien: notice.alienName || getAlienDisplayName(userId),
        planet: notice.planetName,
    })}

${resourcesText}${bonusText}${coinsText}${hatText}

<:registry:1536459835921530890> ${t(userId, 'commands.planet.missionArrivedTip')}${buildDailyReminderText(userId)}`;
};

// Monta o payload Components V2 da notificação de chegada de missão (usada
// tanto pra notificação em canal quanto na DM). Quando `pingUser` é true,
// a menção `<@userId>` entra como primeira linha dentro do próprio
// TextDisplay — em mensagens Components V2 o `content` do topo precisa
// ficar vazio, mas o Discord ainda processa/pinga menções escritas dentro
// do texto dos componentes, respeitando `allowedMentions`.
const buildArrivalNoticeV2Payload = (userId, notice, { pingUser = false } = {}) => {
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

    const mentionLine = pingUser ? `<@${userId}>\n` : '';
    const text = `${mentionLine}${buildArrivalNotice(userId, notice)}`;

    const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
    );

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: pingUser ? { users: [userId] } : { parse: [] },
    };
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
    })}${buildBoostsText(userId, mission.boosts_json)}

<:saturn:1536459943480270959> ${t(userId, 'commands.planet.missionEta', { time: eta })}`;
};

const getExpeditionTimes = (userId, distanceKm, ship) => {
    const lang = getUserLanguage(userId);
    const oneWaySec = calculateTravelSeconds(distanceKm, ship.propulsorTier);
    const roundTripSec = oneWaySec * 2;
    const miningSec = getScannerMiningMs(ship.starScannerLevel) / 1000;

    return {
        oneWay: formatDuration(oneWaySec, lang),
        roundTrip: formatDuration(roundTripSec, lang),
        mining: formatDuration(miningSec, lang),
    };
};

// Calcula o timestamp (ms) em que a missão termina de vez, ou seja, quando o
// alien chega de volta na Terra com os recursos - independente de qual fase
// a missão está agora. Usado para agendar a notificação no chat.
// `starScannerLevel` é opcional: só é necessário (e só faz diferença) quando
// a missão ainda está na fase TRAVELING_OUT, ou seja, a fase de mineração
// ainda nem começou e precisamos estimar sua duração.
const getMissionFinalEndsAt = (mission, starScannerLevel = 1) => {
    if (mission.status === MISSION_STATUS.TRAVELING_OUT) {
        return mission.phase_ends_at + getScannerMiningMs(starScannerLevel) + mission.travel_seconds * 1000;
    }
    if (mission.status === MISSION_STATUS.COLLECTING) {
        return mission.phase_ends_at + mission.travel_seconds * 1000;
    }
    return mission.phase_ends_at;
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
    getMissionFinalEndsAt,
    buildMissionStatusContent,
    buildArrivalNotice,
    buildArrivalNoticeV2Payload,
    buildExploreStartedContent,
};
