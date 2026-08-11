const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bot.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        terms_accepted INTEGER NOT NULL DEFAULT 0,
        terms_accepted_at TEXT,
        language TEXT NOT NULL DEFAULT 'pt-BR',
        alien_color TEXT,
        alien_name TEXT
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS planet_usage (
        user_id TEXT PRIMARY KEY,
        cycle_key TEXT NOT NULL DEFAULT '',
        uses INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT
    );
`);

const colunas = db.prepare("PRAGMA table_info(users)").all();
const temLanguage = colunas.some(c => c.name === 'language');
const temAlienColor = colunas.some(c => c.name === 'alien_color');
const temAlienName = colunas.some(c => c.name === 'alien_name');

if (!temLanguage) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR';
    `);
    logger.success('Coluna `language` adicionada à tabela `users`');
}

if (!temAlienColor) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN alien_color TEXT;
    `);
    logger.success('Coluna `alien_color` adicionada à tabela `users`');
}

if (!temAlienName) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN alien_name TEXT;
    `);
    logger.success('Coluna `alien_name` adicionada à tabela `users`');
}

const temShipExcavation = colunas.some(c => c.name === 'ship_excavation_level');
const temShipPropulsor = colunas.some(c => c.name === 'ship_propulsor_tier');
const temShipScanner = colunas.some(c => c.name === 'ship_scanner_level');

if (!temShipExcavation) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN ship_excavation_level INTEGER NOT NULL DEFAULT 1;
    `);
    logger.success('Coluna `ship_excavation_level` adicionada à tabela `users`');
}

if (!temShipPropulsor) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN ship_propulsor_tier TEXT NOT NULL DEFAULT 'A';
    `);
    logger.success('Coluna `ship_propulsor_tier` adicionada à tabela `users`');
}

if (!temShipScanner) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN ship_scanner_level INTEGER NOT NULL DEFAULT 1;
    `);
    logger.success('Coluna `ship_scanner_level` adicionada à tabela `users`');
}

logger.success('Banco SQLite inicializado (data/bot.db)');

db.exec(`
    CREATE TABLE IF NOT EXISTS planet_offers (
        user_id TEXT NOT NULL,
        planet_seed TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, planet_seed)
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS exploration_missions (
        user_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        planet_name TEXT NOT NULL,
        planet_seed TEXT NOT NULL,
        planet_distance_km INTEGER NOT NULL,
        planet_rarity TEXT NOT NULL,
        resources_json TEXT NOT NULL,
        travel_seconds INTEGER NOT NULL,
        phase_started_at INTEGER NOT NULL,
        phase_ends_at INTEGER NOT NULL
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS user_inventory (
        user_id TEXT NOT NULL,
        resource_key TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, resource_key)
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS mission_notices (
        user_id TEXT PRIMARY KEY,
        notice_json TEXT NOT NULL
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        allowed_channel_id TEXT,
        updated_at TEXT
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS active_crafts (
        user_id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS craft_notices (
        user_id TEXT PRIMARY KEY,
        notice_json TEXT NOT NULL
    );
`);

const getUser = (userId) => {
    let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    if (!user) {
        db.prepare('INSERT INTO users (user_id) VALUES (?)').run(userId);
        user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    }
    return user;
};

const hasAcceptedTerms = (userId) => {
    const user = getUser(userId);
    return user.terms_accepted === 1;
};

const acceptTerms = (userId) => {
    db.prepare(`
        UPDATE users
        SET terms_accepted = 1,
            terms_accepted_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
    `).run(userId);
};

const getUserLanguage = (userId) => {
    const user = getUser(userId);
    return user.language || 'pt-BR';
};

const setUserLanguage = (userId, language) => {
    db.prepare(`
        UPDATE users
        SET language = ?
        WHERE user_id = ?
    `).run(language, userId);
};

const getUserAlien = (userId) => {
    const user = getUser(userId);
    if (!user.alien_color) return null;
    return {
        color: user.alien_color,
        name: user.alien_name || null,
    };
};

const setUserAlien = (userId, { color, name }) => {
    const current = getUserAlien(userId);
    const finalColor = color ?? current?.color;
    const finalName = name !== undefined ? name : current?.name;
    db.prepare(`
        UPDATE users
        SET alien_color = COALESCE(?, alien_color),
            alien_name  = CASE WHEN ? IS NOT NULL THEN ? ELSE alien_name END
        WHERE user_id = ?
    `).run(finalColor, finalName, finalName, userId);
};

const getUserShip = (userId) => {
    const user = getUser(userId);
    return {
        excavationProbeLevel: user.ship_excavation_level ?? 1,
        propulsorTier: user.ship_propulsor_tier ?? 'A',
        starScannerLevel: user.ship_scanner_level ?? 1,
    };
};

const getBraziliaDateParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
        minute: Number(values.minute),
    };
};

const getPlanetCycleKey = (date = new Date()) => {
    const { year, month, day, hour } = getBraziliaDateParts(date);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}`;
};

const getPlanetNextResetInfo = (date = new Date()) => {
    const { year, month, day, hour, minute } = getBraziliaDateParts(date);
    const nextHour = (hour + 1) % 24;
    const minutesLeft = 60 - minute;
    const label = `${String(nextHour).padStart(2, '0')}:00`;
    const nextDay = (hour + 1) >= 24 ? day + 1 : day;
    const fullLabel = `${String(nextDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year} ${String(nextHour).padStart(2, '0')}:00`;

    return {
        label,
        fullLabel,
        minutesLeft,
    };
};

const getPlanetUsageState = (userId, date = new Date()) => {
    const cycleKey = getPlanetCycleKey(date);
    const row = db.prepare('SELECT * FROM planet_usage WHERE user_id = ?').get(userId);

    if (!row || row.cycle_key !== cycleKey) {
        db.prepare(`
            INSERT INTO planet_usage (user_id, cycle_key, uses, updated_at)
            VALUES (?, ?, 0, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET cycle_key = excluded.cycle_key, uses = 0, updated_at = CURRENT_TIMESTAMP
        `).run(userId, cycleKey);

        return {
            cycleKey,
            uses: 0,
            limit: 10,
            canUse: true,
            remaining: 10,
            nextReset: getPlanetNextResetInfo(date),
        };
    }

    return {
        cycleKey: row.cycle_key,
        uses: row.uses,
        limit: 10,
        canUse: row.uses < 10,
        remaining: Math.max(0, 10 - row.uses),
        nextReset: getPlanetNextResetInfo(date),
    };
};

const consumePlanetUsage = (userId, date = new Date()) => {
    const state = getPlanetUsageState(userId, date);

    if (!state.canUse) {
        return state;
    }

    const nextUses = state.uses + 1;
    db.prepare(`
        INSERT INTO planet_usage (user_id, cycle_key, uses, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET cycle_key = excluded.cycle_key, uses = excluded.uses, updated_at = CURRENT_TIMESTAMP
    `).run(userId, state.cycleKey, nextUses);

    return {
        ...state,
        uses: nextUses,
        canUse: true,
        remaining: Math.max(0, 10 - nextUses),
    };
};

const savePlanetOffer = (userId, planetSeed, payload, expiresAt) => {
    db.prepare(`
        INSERT INTO planet_offers (user_id, planet_seed, payload_json, expires_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, planet_seed) DO UPDATE SET
            payload_json = excluded.payload_json,
            expires_at = excluded.expires_at
    `).run(userId, planetSeed, JSON.stringify(payload), expiresAt);
};

const getPlanetOffer = (userId, planetSeed) => {
    const row = db.prepare(`
        SELECT * FROM planet_offers
        WHERE user_id = ? AND planet_seed = ?
    `).get(userId, planetSeed);

    if (!row) return null;

    let payload = null;
    try {
        payload = JSON.parse(row.payload_json);
    } catch {
        return null;
    }

    return {
        planetSeed: row.planet_seed,
        payload,
        expiresAt: row.expires_at,
    };
};

const deletePlanetOffer = (userId, planetSeed) => {
    db.prepare('DELETE FROM planet_offers WHERE user_id = ? AND planet_seed = ?').run(userId, planetSeed);
};

const getExplorationMission = (userId) => {
    return db.prepare('SELECT * FROM exploration_missions WHERE user_id = ?').get(userId) ?? null;
};

const startExplorationMission = (userId, data) => {
    db.prepare(`
        INSERT INTO exploration_missions (
            user_id, status, planet_name, planet_seed, planet_distance_km,
            planet_rarity, resources_json, travel_seconds, phase_started_at, phase_ends_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            status = excluded.status,
            planet_name = excluded.planet_name,
            planet_seed = excluded.planet_seed,
            planet_distance_km = excluded.planet_distance_km,
            planet_rarity = excluded.planet_rarity,
            resources_json = excluded.resources_json,
            travel_seconds = excluded.travel_seconds,
            phase_started_at = excluded.phase_started_at,
            phase_ends_at = excluded.phase_ends_at
    `).run(
        userId,
        data.status,
        data.planetName,
        data.planetSeed,
        data.planetDistanceKm,
        data.planetRarity,
        JSON.stringify(data.resources),
        data.travelSeconds,
        data.phaseStartedAt,
        data.phaseEndsAt,
    );
};

const updateExplorationMission = (userId, data) => {
    db.prepare(`
        UPDATE exploration_missions
        SET status = ?,
            phase_started_at = ?,
            phase_ends_at = ?
        WHERE user_id = ?
    `).run(data.status, data.phaseStartedAt, data.phaseEndsAt, userId);
};

const clearExplorationMission = (userId) => {
    db.prepare('DELETE FROM exploration_missions WHERE user_id = ?').run(userId);
};

const addInventoryResources = (userId, resources) => {
    const stmt = db.prepare(`
        INSERT INTO user_inventory (user_id, resource_key, amount)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, resource_key) DO UPDATE SET
            amount = amount + excluded.amount
    `);

    const runMany = db.transaction((items) => {
        for (const item of items) {
            stmt.run(userId, item.key, item.amount);
        }
    });

    runMany(resources);
};

const getUserInventory = (userId) => {
    const rows = db.prepare(`
        SELECT resource_key, amount
        FROM user_inventory
        WHERE user_id = ? AND amount > 0
        ORDER BY amount DESC
    `).all(userId);

    return rows.map((row) => ({
        key: row.resource_key,
        amount: row.amount,
    }));
};

const setMissionNotice = (userId, notice) => {
    db.prepare(`
        INSERT INTO mission_notices (user_id, notice_json)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET notice_json = excluded.notice_json
    `).run(userId, JSON.stringify(notice));
};

const popMissionNotice = (userId) => {
    const row = db.prepare('SELECT notice_json FROM mission_notices WHERE user_id = ?').get(userId);
    if (!row) return null;

    db.prepare('DELETE FROM mission_notices WHERE user_id = ?').run(userId);

    try {
        return JSON.parse(row.notice_json);
    } catch {
        return null;
    }
};

const resolveExplorationMission = (userId, now = Date.now()) => {
    const COLLECT_DURATION_MS = 30 * 60 * 1000;
    const STATUS = {
        TRAVELING_OUT: 'traveling_out',
        COLLECTING: 'collecting',
        TRAVELING_BACK: 'traveling_back',
    };

    let notice = null;

    while (true) {
        const mission = getExplorationMission(userId);
        if (!mission) return { mission: null, notice };

        if (now < mission.phase_ends_at) {
            return { mission, notice };
        }

        if (mission.status === STATUS.TRAVELING_OUT) {
            const collectStart = mission.phase_ends_at;
            updateExplorationMission(userId, {
                status: STATUS.COLLECTING,
                phaseStartedAt: collectStart,
                phaseEndsAt: collectStart + COLLECT_DURATION_MS,
            });
            continue;
        }

        if (mission.status === STATUS.COLLECTING) {
            const returnStart = mission.phase_ends_at;
            updateExplorationMission(userId, {
                status: STATUS.TRAVELING_BACK,
                phaseStartedAt: returnStart,
                phaseEndsAt: returnStart + mission.travel_seconds * 1000,
            });
            continue;
        }

        if (mission.status === STATUS.TRAVELING_BACK) {
            let resources = [];
            try {
                resources = JSON.parse(mission.resources_json);
            } catch {
                resources = [];
            }

            addInventoryResources(userId, resources);

            const alien = getUserAlien(userId);
            notice = {
                alienName: alien?.name ?? 'Alienígena',
                planetName: mission.planet_name,
                resources,
            };
            setMissionNotice(userId, notice);
            clearExplorationMission(userId);
            return { mission: null, notice };
        }

        clearExplorationMission(userId);
        return { mission: null, notice: null };
    }
};

const resolveAllPendingMissions = (now = Date.now()) => {
    const rows = db.prepare('SELECT user_id FROM exploration_missions').all();
    let completed = 0;

    for (const row of rows) {
        const { notice } = resolveExplorationMission(row.user_id, now);
        if (notice) completed++;
    }

    return { total: rows.length, completed };
};

const cleanExpiredPlanetOffers = (now = Date.now()) => {
    const result = db.prepare('DELETE FROM planet_offers WHERE expires_at < ?').run(now);
    return result.changes;
};

const getGuildAllowedChannel = (guildId) => {
    const row = db.prepare('SELECT allowed_channel_id FROM guild_settings WHERE guild_id = ?').get(guildId);
    return row?.allowed_channel_id ?? null;
};

const getGuildSettings = (guildId) => {
    const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    return {
        allowedChannelId: row?.allowed_channel_id ?? null,
        updatedAt: row?.updated_at ?? null,
    };
};

const setGuildAllowedChannel = (guildId, channelId) => {
    db.prepare(`
        INSERT INTO guild_settings (guild_id, allowed_channel_id, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(guild_id) DO UPDATE SET
            allowed_channel_id = excluded.allowed_channel_id,
            updated_at = CURRENT_TIMESTAMP
    `).run(guildId, channelId);
};

const clearGuildAllowedChannel = (guildId) => {
    db.prepare('DELETE FROM guild_settings WHERE guild_id = ?').run(guildId);
};

const getActiveCraft = (userId) => {
    return db.prepare('SELECT * FROM active_crafts WHERE user_id = ?').get(userId) ?? null;
};

const setCraftNotice = (userId, notice) => {
    db.prepare(`
        INSERT INTO craft_notices (user_id, notice_json)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET notice_json = excluded.notice_json
    `).run(userId, JSON.stringify(notice));
};

const popCraftNotice = (userId) => {
    const row = db.prepare('SELECT notice_json FROM craft_notices WHERE user_id = ?').get(userId);
    if (!row) return null;

    db.prepare('DELETE FROM craft_notices WHERE user_id = ?').run(userId);

    try {
        return JSON.parse(row.notice_json);
    } catch {
        return null;
    }
};

const startCraftJob = (userId, recipe, now = Date.now()) => {
    if (!recipe) return { success: false, reason: 'invalid_recipe' };

    const active = getActiveCraft(userId);
    if (active) {
        return { success: false, reason: 'craft_in_progress', activeCraft: active };
    }

    const userShip = getUserShip(userId);
    if (typeof recipe.checkRequirement === 'function' && !recipe.checkRequirement(userShip)) {
        return { success: false, reason: 'requirement_not_met' };
    }

    const inventory = getUserInventory(userId);
    const userStock = new Map(inventory.map((item) => [item.key, item.amount]));

    for (const ing of recipe.ingredients) {
        const hasAmount = userStock.get(ing.key) ?? 0;
        if (hasAmount < ing.amount) {
            return { success: false, reason: 'insufficient_resources' };
        }
    }

    const durationMs = (recipe.craftSeconds ?? 60) * 1000;
    const endsAt = now + durationMs;

    const performStartCraftTx = db.transaction(() => {
        const deductStmt = db.prepare(`
            UPDATE user_inventory
            SET amount = amount - ?
            WHERE user_id = ? AND resource_key = ? AND amount >= ?
        `);
        for (const ing of recipe.ingredients) {
            const res = deductStmt.run(ing.amount, userId, ing.key, ing.amount);
            if (res.changes === 0) {
                throw new Error(`Insufficient resource ${ing.key}`);
            }
        }

        db.prepare(`
            INSERT INTO active_crafts (user_id, recipe_id, started_at, ends_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                recipe_id = excluded.recipe_id,
                started_at = excluded.started_at,
                ends_at = excluded.ends_at
        `).run(userId, recipe.id, now, endsAt);
    });

    try {
        performStartCraftTx();
        return { success: true, endsAt };
    } catch (err) {
        return { success: false, reason: err.message };
    }
};

const resolveActiveCraft = (userId, now = Date.now()) => {
    const { getRecipe } = require('./craftRecipes');
    const active = getActiveCraft(userId);

    if (!active) {
        return { craft: null, notice: popCraftNotice(userId) };
    }

    if (now < active.ends_at) {
        return { craft: active, notice: null };
    }

    const recipe = getRecipe(active.recipe_id);
    if (recipe) {
        try {
            recipe.applyReward(db, userId);
        } catch (_err) {}
    }

    db.prepare('DELETE FROM active_crafts WHERE user_id = ?').run(userId);

    const notice = {
        recipeId: active.recipe_id,
        titleKey: recipe?.titleKey ?? null,
    };
    setCraftNotice(userId, notice);

    return { craft: null, notice };
};

const resolveAllPendingCrafts = (now = Date.now()) => {
    const rows = db.prepare('SELECT user_id FROM active_crafts').all();
    let completed = 0;

    for (const row of rows) {
        const { notice } = resolveActiveCraft(row.user_id, now);
        if (notice) completed++;
    }

    return { total: rows.length, completed };
};

module.exports = {
    db,
    getUser,
    hasAcceptedTerms,
    acceptTerms,
    getUserLanguage,
    setUserLanguage,
    getUserAlien,
    setUserAlien,
    getUserShip,
    getBraziliaDateParts,
    getPlanetCycleKey,
    getPlanetNextResetInfo,
    getPlanetUsageState,
    consumePlanetUsage,
    savePlanetOffer,
    getPlanetOffer,
    deletePlanetOffer,
    getExplorationMission,
    startExplorationMission,
    updateExplorationMission,
    clearExplorationMission,
    addInventoryResources,
    getUserInventory,
    getActiveCraft,
    startCraftJob,
    resolveActiveCraft,
    popCraftNotice,
    resolveAllPendingCrafts,
    setMissionNotice,
    popMissionNotice,
    resolveExplorationMission,
    resolveAllPendingMissions,
    cleanExpiredPlanetOffers,
    getGuildAllowedChannel,
    getGuildSettings,
    setGuildAllowedChannel,
    clearGuildAllowedChannel,
};

