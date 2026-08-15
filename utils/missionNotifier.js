const {
    getExplorationMission,
    setMissionNotifyChannel,
    resolveExplorationMission,
    peekMissionNotice,
    getUserAlien,
    getUserShip,
} = require('./db');
const { getMissionFinalEndsAt, buildArrivalNotice } = require('./exploration');
const logger = require('./logger');

const scheduledTimers = new Map();

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
        alienName: alien?.name ?? 'Alienígena',
        planetName: mission.planet_name,
        resources,
        coins,
    };
};

const sendArrivalPingFromNotice = async (client, userId, channelId, notice) => {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return;

        await channel.send({
            content: `<@${userId}> ${buildArrivalNotice(userId, notice)}`,
            allowedMentions: { users: [userId] },
        });
    } catch (err) {
        logger.warn(`Falha ao enviar notificação de chegada para ${userId}: ${err.message}`);
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
        SELECT user_id, notify_channel_id, resources_json, coins_json, planet_name
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
    enableMissionNotification,
    scheduleMissionNotification,
    captureNotifyFlaggedMissions,
    processNotifyFlaggedMissions,
};
