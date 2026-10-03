const {
    getExplorationMission,
    setMissionNotifyChannel,
    resolveExplorationMission,
    peekMissionNotice,
    getUserAlien,
    getUserShip,
} = require('./db');
const { getMissionFinalEndsAt, buildArrivalNoticeV2Payload } = require('./exploration');
const logger = require('./logger');

const scheduledTimers = new Map();

// Valor especial gravado em `notify_channel_id` quando o jogador escolhe
// receber o aviso na DM em vez de num canal do servidor.
const DM_TARGET = 'dm';

const buildNoticeFromMission = (userId, mission) => {
    let resources = [];
    try {
        resources = JSON.parse(mission.resources_json);
    } catch {
        resources = [];
    }

    let coins = null;
    if (mission.coins_json) {
        try {
            coins = JSON.parse(mission.coins_json);
        } catch {
            coins = null;
        }
    }

    const alien = getUserAlien(userId);

    return {
        alienName: alien?.name ?? null,
        planetName: mission.planet_name,
        resources,
        coins,
        hatKey: mission.hat_key ?? null,
    };
};

const sendArrivalPingFromNotice = async (client, userId, channelId, notice) => {
    const isDm = channelId === DM_TARGET;
    const payload = buildArrivalNoticeV2Payload(userId, notice, { pingUser: !isDm });

    const sendDm = async () => {
        try {
            const user = await client.users.fetch(userId);
            await user.send(isDm ? payload : buildArrivalNoticeV2Payload(userId, notice, { pingUser: false }));
        } catch (err) {
            logger.warn(`Não foi possível enviar a notificação de chegada por DM para ${userId} (DMs provavelmente fechadas): ${err.message}`);
        }
    };

    if (isDm) {
        await sendDm();
        return;
    }

    // Canal: se o bot não consegue postar ali (sem permissão, canal apagado,
    // ou o ∩lien foi instalado só pelo usuário e não está no servidor),
    // cai pra DM em vez de perder o aviso em silêncio.
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) throw new Error('canal indisponível');

        await channel.send(payload);
    } catch (err) {
        logger.warn(`Falha ao enviar notificação de chegada no canal para ${userId} (${err.message}) — tentando DM`);
        await sendDm();
    }
};

const sendArrivalPing = async (client, userId, channelId, mission) => {
    const notice = buildNoticeFromMission(userId, mission);
    await sendArrivalPingFromNotice(client, userId, channelId, notice);
};

const clearScheduledTimer = (userId) => {
    const existing = scheduledTimers.get(userId);
    if (existing) {
        clearTimeout(existing);
        scheduledTimers.delete(userId);
    }
};

const scheduleMissionNotification = (client, userId) => {
    clearScheduledTimer(userId);

    const mission = getExplorationMission(userId);
    if (!mission || !mission.notify_channel_id) return;

    const channelId = mission.notify_channel_id;
    const ship = getUserShip(userId);
    const finalEndsAt = getMissionFinalEndsAt(mission, ship.starScannerLevel);
    const delay = finalEndsAt - Date.now();

    const fire = async () => {
        scheduledTimers.delete(userId);

        const missionSnapshot = getExplorationMission(userId);
        const { notice } = resolveExplorationMission(userId);

        if (notice) {
            await sendArrivalPing(client, userId, channelId, missionSnapshot);
            return;
        }

        if (!missionSnapshot) {

            const pendingNotice = peekMissionNotice(userId);
            if (pendingNotice) {
                await sendArrivalPingFromNotice(client, userId, channelId, pendingNotice);
            }
        }
    };

    if (delay <= 0) {
        fire();
        return;
    }

    const timer = setTimeout(fire, delay);
    timer.unref?.();
    scheduledTimers.set(userId, timer);
};

const enableMissionNotification = (client, userId, channelId) => {
    const mission = getExplorationMission(userId);
    if (!mission) return false;

    setMissionNotifyChannel(userId, channelId);
    scheduleMissionNotification(client, userId);
    return true;
};

const captureNotifyFlaggedMissions = () => {
    const { db } = require('./db');
    return db.prepare(`
        SELECT user_id, notify_channel_id, resources_json, coins_json, planet_name, hat_key
        FROM exploration_missions
        WHERE notify_channel_id IS NOT NULL
    `).all();
};

const processNotifyFlaggedMissions = async (client, snapshots) => {
    let rescheduled = 0;
    let firedNow = 0;

    for (const snapshot of snapshots) {
        const stillPending = getExplorationMission(snapshot.user_id);

        if (stillPending) {
            scheduleMissionNotification(client, snapshot.user_id);
            rescheduled++;
        } else {
            await sendArrivalPing(client, snapshot.user_id, snapshot.notify_channel_id, snapshot);
            firedNow++;
        }
    }

    return { rescheduled, firedNow };
};

module.exports = {
    DM_TARGET,
    enableMissionNotification,
    scheduleMissionNotification,
    captureNotifyFlaggedMissions,
    processNotifyFlaggedMissions,
};
