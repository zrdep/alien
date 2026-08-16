const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./logger');
const { generateMissionCoins } = require('./coins');
const { getResourceInfo } = require('./market');
const { MARKET_CONFIG, getMinListingPrice, getSellerProceeds } = require('../gameConfig/market');
const { getHat, HAT_MARKET_CONFIG, getMinHatListingPrice, getHatShopPrice, getHatSellerProceeds } = require('../gameConfig/hats');
const { getScannerMiningMs } = require('../gameConfig/shipUpgrades');

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

// Preferência de onde receber o aviso de "missão concluída": 'off' (padrão,
// precisa clicar no botão toda vez), 'dm' (sempre na DM) ou 'channel'
// (sempre no canal onde o /planeta foi usado).
const temMissionNotifyPref = colunas.some(c => c.name === 'mission_notify_pref');
if (!temMissionNotifyPref) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN mission_notify_pref TEXT NOT NULL DEFAULT 'off';
    `);
    logger.success('Coluna `mission_notify_pref` adicionada à tabela `users`');
}

// Marca se o usuário JÁ escolheu um idioma manualmente em /config user.
// Enquanto for 0, o idioma dele fica sincronizado com o idioma padrão do
// servidor onde ele interage (ver `syncUserLanguageWithGuildDefault`).
const temLanguageSet = colunas.some(c => c.name === 'language_set');
if (!temLanguageSet) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN language_set INTEGER NOT NULL DEFAULT 0;
    `);
    logger.success('Coluna `language_set` adicionada à tabela `users`');
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

const temCoins = colunas.some(c => c.name === 'coins');
const temLastDailyDate = colunas.some(c => c.name === 'last_daily_date');

if (!temCoins) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;
    `);
    logger.success('Coluna `coins` adicionada à tabela `users`');
}

if (!temLastDailyDate) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN last_daily_date TEXT;
    `);
    logger.success('Coluna `last_daily_date` adicionada à tabela `users`');
}

const temPlanetsSeen = colunas.some(c => c.name === 'planets_seen');
const temDistanceTraveled = colunas.some(c => c.name === 'distance_traveled_km');
const temTripsCompleted = colunas.some(c => c.name === 'trips_completed');
const temTotalResources = colunas.some(c => c.name === 'total_resources_collected');

if (!temPlanetsSeen) {
    db.exec(`ALTER TABLE users ADD COLUMN planets_seen INTEGER NOT NULL DEFAULT 0;`);
    logger.success('Coluna `planets_seen` adicionada à tabela `users`');
}
if (!temDistanceTraveled) {
    db.exec(`ALTER TABLE users ADD COLUMN distance_traveled_km INTEGER NOT NULL DEFAULT 0;`);
    logger.success('Coluna `distance_traveled_km` adicionada à tabela `users`');
}
if (!temTripsCompleted) {
    db.exec(`ALTER TABLE users ADD COLUMN trips_completed INTEGER NOT NULL DEFAULT 0;`);
    logger.success('Coluna `trips_completed` adicionada à tabela `users`');
}
if (!temTotalResources) {
    db.exec(`ALTER TABLE users ADD COLUMN total_resources_collected INTEGER NOT NULL DEFAULT 0;`);
    logger.success('Coluna `total_resources_collected` adicionada à tabela `users`');
}

const temDailyStreak = colunas.some(c => c.name === 'daily_streak');
if (!temDailyStreak) {
    db.exec(`ALTER TABLE users ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0;`);
    logger.success('Coluna `daily_streak` adicionada à tabela `users`');
}

const colunasMarketStats = [
    { name: 'market_global_sold_count', default: 0 },
    { name: 'market_global_sold_revenue', default: 0 },
    { name: 'market_global_bought_count', default: 0 },
    { name: 'market_global_bought_spent', default: 0 },
    { name: 'shop_bought_count', default: 0 },
    { name: 'shop_sold_count', default: 0 },
    { name: 'craft_completed_count', default: 0 },
    { name: 'coins_total_earned', default: 0 },
    { name: 'bot_invited', default: 0 },
];
for (const col of colunasMarketStats) {
    if (!colunas.some(c => c.name === col.name)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} INTEGER NOT NULL DEFAULT ${col.default};`);
        logger.success(`Coluna \`${col.name}\` adicionada à tabela \`users\``);
    }
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
        phase_ends_at INTEGER NOT NULL,
        coins_json TEXT
    );
`);

const colunasMission = db.prepare("PRAGMA table_info(exploration_missions)").all();
const temMissionCoins = colunasMission.some(c => c.name === 'coins_json');

if (!temMissionCoins) {
    db.exec(`
        ALTER TABLE exploration_missions
        ADD COLUMN coins_json TEXT;
    `);
    logger.success('Coluna `coins_json` adicionada à tabela `exploration_missions`');
}

const temNotifyChannel = colunasMission.some(c => c.name === 'notify_channel_id');
if (!temNotifyChannel) {
    db.exec(`
        ALTER TABLE exploration_missions
        ADD COLUMN notify_channel_id TEXT;
    `);
    logger.success('Coluna `notify_channel_id` adicionada à tabela `exploration_missions`');
}

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
        default_language TEXT,
        updated_at TEXT
    );
`);

const colunasGuildSettings = db.prepare("PRAGMA table_info(guild_settings)").all();
const temDefaultLanguage = colunasGuildSettings.some(c => c.name === 'default_language');
if (!temDefaultLanguage) {
    db.exec(`
        ALTER TABLE guild_settings
        ADD COLUMN default_language TEXT;
    `);
    logger.success('Coluna `default_language` adicionada à tabela `guild_settings`');
}

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

db.exec(`
    CREATE TABLE IF NOT EXISTS market_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id TEXT NOT NULL,
        resource_key TEXT NOT NULL,
        amount INTEGER NOT NULL,
        price_per_unit INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active'
    );
`);

const colunasMarket = db.prepare("PRAGMA table_info(market_listings)").all();
const temExpiresAt = colunasMarket.some(c => c.name === 'expires_at');
const temStatus = colunasMarket.some(c => c.name === 'status');

if (!temExpiresAt) {
    db.exec(`ALTER TABLE market_listings ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;`);
    logger.success('Coluna `expires_at` adicionada à tabela `market_listings`');
}

if (!temStatus) {
    db.exec(`ALTER TABLE market_listings ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`);
    logger.success('Coluna `status` adicionada à tabela `market_listings`');
}

const temSellerName = colunasMarket.some(c => c.name === 'seller_name');
if (!temSellerName) {
    db.exec(`ALTER TABLE market_listings ADD COLUMN seller_name TEXT;`);
    logger.success('Coluna `seller_name` adicionada à tabela `market_listings`');
}

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_market_resource_price
    ON market_listings (resource_key, amount, price_per_unit, created_at);
`);

// -- Chapéus (achados no /planet, equipados no /alien, comercializados no
// -- /hatmarket) ---------------------------------------------------------
const temEquippedHat = colunas.some(c => c.name === 'equipped_hat');
if (!temEquippedHat) {
    db.exec(`ALTER TABLE users ADD COLUMN equipped_hat TEXT;`);
    logger.success('Coluna `equipped_hat` adicionada à tabela `users`');
}

db.exec(`
    CREATE TABLE IF NOT EXISTS user_hats (
        user_id TEXT NOT NULL,
        hat_key TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, hat_key)
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS hat_market_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id TEXT NOT NULL,
        seller_name TEXT,
        hat_key TEXT NOT NULL,
        price INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active'
    );
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hat_market_key_price
    ON hat_market_listings (hat_key, price, created_at);
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, achievement_id)
    );
`);

// -- Registro de "quem adicionou o bot em qual servidor" -------------------
// Preenchido pelo evento guildCreate (bot entrou agora) e por um backfill
// no ready.js (servidores em que o bot já estava antes dessa feature
// existir). Usado pra verificar a conquista `invite_bot_1` quando o
// usuário roda /resgatar — ver claimBotInviteAchievement() mais abaixo.
db.exec(`
    CREATE TABLE IF NOT EXISTS bot_invites (
        guild_id TEXT PRIMARY KEY,
        inviter_id TEXT,
        joined_at INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT 'unknown'
    );
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bot_invites_inviter ON bot_invites(inviter_id);
`);

// -- Sistema genérico de "resgates" (/resgatar) -----------------------------
// Fonte única pra qualquer recompensa que fica pendente até o usuário
// reivindicar ativamente com /resgatar — hoje só usado indiretamente pela
// conquista de convidar o bot, mas pensado pra também suportar presentes
// futuros enviados manualmente pra um usuário ou pra todo mundo de uma vez
// (ver createRedeemable / createRedeemableForAllUsers mais abaixo).
db.exec(`
    CREATE TABLE IF NOT EXISTS redeemables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title_pt TEXT NOT NULL,
        title_en TEXT NOT NULL,
        coins INTEGER NOT NULL DEFAULT 0,
        resources_json TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        claimed_at INTEGER
    );
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_redeemables_user_pending ON redeemables(user_id, claimed_at);
`);

// =============================================================================
// Índices pra ranking (/ranking) — sem eles o SQLite ainda funciona, mas
// precisa varrer a tabela inteira pra ordenar toda vez. Com o índice, um
// "ORDER BY coluna DESC LIMIT 10" vira leitura direta da árvore já
// ordenada — instantâneo mesmo com muitos jogadores.
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
    CREATE INDEX IF NOT EXISTS idx_users_planets_seen ON users(planets_seen DESC);
    CREATE INDEX IF NOT EXISTS idx_users_trips_completed ON users(trips_completed DESC);
    CREATE INDEX IF NOT EXISTS idx_users_distance_traveled ON users(distance_traveled_km DESC);
    CREATE INDEX IF NOT EXISTS idx_users_resources_collected ON users(total_resources_collected DESC);
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
        SET language = ?, language_set = 1
        WHERE user_id = ?
    `).run(language, userId);
};

const MISSION_NOTIFY_PREFS = ['off', 'dm', 'channel'];

const getUserMissionNotifyPref = (userId) => {
    const user = getUser(userId);
    return MISSION_NOTIFY_PREFS.includes(user.mission_notify_pref) ? user.mission_notify_pref : 'off';
};

const setUserMissionNotifyPref = (userId, pref) => {
    if (!MISSION_NOTIFY_PREFS.includes(pref)) return;
    db.prepare(`
        UPDATE users
        SET mission_notify_pref = ?
        WHERE user_id = ?
    `).run(pref, userId);
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
        second: Number(values.second ?? 0),
    };
};

const getUserCoins = (userId) => {
    const user = getUser(userId);
    return user.coins ?? 0;
};

const addUserCoins = (userId, amount) => {
    if (typeof amount !== 'number' || amount <= 0) return;
    getUser(userId);
    const amt = Math.floor(amount);
    db.prepare(`
        UPDATE users
        SET coins = coins + ?,
            coins_total_earned = coins_total_earned + ?
        WHERE user_id = ?
    `).run(amt, amt, userId);
};

const setUserCoins = (userId, amount) => {
    if (typeof amount !== 'number' || amount < 0 || !Number.isFinite(amount)) return;
    getUser(userId);
    db.prepare(`
        UPDATE users
        SET coins = ?
        WHERE user_id = ?
    `).run(Math.floor(amount), userId);
};

const getDailyState = (userId, date = new Date()) => {
    const user = getUser(userId);
    const { year, month, day, hour, minute, second } = getBraziliaDateParts(date);
    const today = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const canClaim = user.last_daily_date !== today;

    const passedSeconds = hour * 3600 + minute * 60 + second;
    const secondsUntilReset = Math.max(0, 86400 - passedSeconds);

    const yesterday = getYesterdayDateStr(today);
    const streakWillContinue = user.last_daily_date === yesterday;

    return {
        canClaim,
        today,
        lastDailyDate: user.last_daily_date ?? null,
        secondsUntilReset,
        currentStreak: user.daily_streak ?? 0,
        nextStreak: canClaim ? (streakWillContinue ? (user.daily_streak ?? 0) + 1 : 1) : (user.daily_streak ?? 0),
    };
};

const getYesterdayDateStr = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

const claimDaily = (userId, dateStr, coinsAmount) => {
    const user = getUser(userId);

    const yesterday = getYesterdayDateStr(dateStr);
    const newStreak = user.last_daily_date === yesterday ? (user.daily_streak ?? 0) + 1 : 1;

    const coinsInt = Math.floor(coinsAmount);
    db.prepare(`
        UPDATE users
        SET last_daily_date = ?,
            coins = coins + ?,
            daily_streak = ?,
            coins_total_earned = coins_total_earned + ?
        WHERE user_id = ?
    `).run(dateStr, coinsInt, newStreak, coinsInt, userId);

    const unlockedAchievements = checkAchievementsForUser(userId);

    return { streak: newStreak, unlockedAchievements };
};

const resetDailyClaim = (userId) => {
    getUser(userId);
    db.prepare(`
        UPDATE users
        SET last_daily_date = NULL
        WHERE user_id = ?
    `).run(userId);
};

const incrementPlanetsSeen = (userId, count = 1) => {
    getUser(userId);
    db.prepare(`
        UPDATE users
        SET planets_seen = planets_seen + ?
        WHERE user_id = ?
    `).run(count, userId);
    const unlockedAchievements = checkAchievementsForUser(userId);
    return { unlockedAchievements };
};

const addMissionCompletionStats = (userId, distanceKm, totalResources) => {
    getUser(userId);
    const roundTripDistance = distanceKm * 2;
    db.prepare(`
        UPDATE users
        SET distance_traveled_km = distance_traveled_km + ?,
            trips_completed = trips_completed + 1,
            total_resources_collected = total_resources_collected + ?
        WHERE user_id = ?
    `).run(roundTripDistance, totalResources, userId);
    const unlockedAchievements = checkAchievementsForUser(userId);
    return { unlockedAchievements, roundTripDistance };
};

// =============================================================================
// RANKING (/ranking)
// =============================================================================
// Cada categoria mapeia direto pra uma coluna já existente na tabela `users`
// (todas indexadas acima), então o ranking é 1 query só com ORDER BY + LIMIT
// — o SQLite lê direto do índice já ordenado, sem varrer a tabela inteira e
// sem precisar buscar usuário por usuário em JS. Isso roda em frações de
// milissegundo mesmo com muitos jogadores cadastrados.
const LEADERBOARD_COLUMNS = {
    coins: 'coins',
    planets_seen: 'planets_seen',
    trips_completed: 'trips_completed',
    distance_traveled_km: 'distance_traveled_km',
    total_resources_collected: 'total_resources_collected',
};

// Cache curto em memória: um /ranking popular não precisa bater no banco a
// cada clique de todo mundo — os números não mudam segundo a segundo.
const leaderboardCache = new Map(); // "statKey:limit" -> { rows, expiresAt }
const LEADERBOARD_CACHE_TTL_MS = 90 * 1000;

const getLeaderboard = (statKey, limit = 10) => {
    const column = LEADERBOARD_COLUMNS[statKey];
    if (!column) return [];

    const cacheKey = `${statKey}:${limit}`;
    const cached = leaderboardCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.rows;
    }

    // `column` vem sempre de LEADERBOARD_COLUMNS (whitelist fixa acima), nunca
    // de input do usuário — por isso é seguro interpolar direto no SQL aqui
    // (SQLite não permite parametrizar nome de coluna/tabela com `?`).
    const rows = db.prepare(`
        SELECT user_id AS userId, ${column} AS value
        FROM users
        WHERE ${column} > 0
        ORDER BY ${column} DESC
        LIMIT ?
    `).all(limit);

    leaderboardCache.set(cacheKey, { rows, expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS });
    return rows;
};

// Posição exata de 1 jogador numa categoria (pra mostrar "você está em
// #37" mesmo fora do Top 10) — também 1 query só, contando quantos têm
// valor maior (não precisa carregar a lista inteira em memória).
const getLeaderboardRank = (statKey, userId) => {
    const column = LEADERBOARD_COLUMNS[statKey];
    if (!column) return null;

    const user = db.prepare(`SELECT ${column} AS value FROM users WHERE user_id = ?`).get(userId);
    const value = user?.value ?? 0;
    if (value <= 0) return { value, position: null };

    const { higherCount } = db.prepare(`
        SELECT COUNT(*) AS higherCount FROM users WHERE ${column} > ?
    `).get(value);

    return { value, position: higherCount + 1 };
};

const getUserProfileStats = (userId) => {
    const user = getUser(userId);
    return {
        planetsSeen: user.planets_seen ?? 0,
        distanceTraveledKm: user.distance_traveled_km ?? 0,
        tripsCompleted: user.trips_completed ?? 0,
        totalResourcesCollected: user.total_resources_collected ?? 0,
        botInvited: user.bot_invited ?? 0,
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
            planet_rarity, resources_json, travel_seconds, phase_started_at, phase_ends_at, coins_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            status = excluded.status,
            planet_name = excluded.planet_name,
            planet_seed = excluded.planet_seed,
            planet_distance_km = excluded.planet_distance_km,
            planet_rarity = excluded.planet_rarity,
            resources_json = excluded.resources_json,
            travel_seconds = excluded.travel_seconds,
            phase_started_at = excluded.phase_started_at,
            phase_ends_at = excluded.phase_ends_at,
            coins_json = excluded.coins_json
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
        data.coinsJson ?? null,
    );
};

const updateExplorationMission = (userId, data) => {
    if (data.coinsJson !== undefined) {
        db.prepare(`
            UPDATE exploration_missions
            SET status = ?,
                phase_started_at = ?,
                phase_ends_at = ?,
                coins_json = ?
            WHERE user_id = ?
        `).run(data.status, data.phaseStartedAt, data.phaseEndsAt, data.coinsJson, userId);
    } else {
        db.prepare(`
            UPDATE exploration_missions
            SET status = ?,
                phase_started_at = ?,
                phase_ends_at = ?
            WHERE user_id = ?
        `).run(data.status, data.phaseStartedAt, data.phaseEndsAt, userId);
    }
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

const setInventoryResource = (userId, resourceKey, amount) => {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    db.prepare(`
        INSERT INTO user_inventory (user_id, resource_key, amount)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, resource_key) DO UPDATE SET amount = excluded.amount
    `).run(userId, resourceKey, safeAmount);
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

const peekMissionNotice = (userId) => {
    const row = db.prepare('SELECT notice_json FROM mission_notices WHERE user_id = ?').get(userId);
    if (!row) return null;

    try {
        return JSON.parse(row.notice_json);
    } catch {
        return null;
    }
};

const forceExpireMissionPhase = (userId) => {
    const mission = getExplorationMission(userId);
    if (!mission) return false;

    db.prepare(`
        UPDATE exploration_missions
        SET phase_ends_at = ?
        WHERE user_id = ?
    `).run(Date.now() - 1000, userId);

    return true;
};

const setMissionNotifyChannel = (userId, channelId) => {
    db.prepare(`
        UPDATE exploration_missions
        SET notify_channel_id = ?
        WHERE user_id = ?
    `).run(channelId, userId);
};

const resolveExplorationMission = (userId, now = Date.now()) => {
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
            // Duração de mineração depende do nível atual do Scanner Estelar
            // do jogador (15min no tier 1, caindo até 8min no tier 5).
            const ship = getUserShip(userId);
            const collectDurationMs = getScannerMiningMs(ship.starScannerLevel);
            updateExplorationMission(userId, {
                status: STATUS.COLLECTING,
                phaseStartedAt: collectStart,
                phaseEndsAt: collectStart + collectDurationMs,
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

            let coinsReward = null;
            if (mission.coins_json) {
                try {
                    coinsReward = JSON.parse(mission.coins_json);
                } catch {
                    coinsReward = null;
                }
            }
            if (!coinsReward) {
                coinsReward = generateMissionCoins(mission.planet_rarity);
            }

            addInventoryResources(userId, resources);
            if (coinsReward && coinsReward.amount) {
                addUserCoins(userId, coinsReward.amount);
            }
            const totalRecsCount = resources.reduce((sum, item) => sum + (item.amount ?? 0), 0);
            const missionUnlocks = addMissionCompletionStats(userId, mission.planet_distance_km, totalRecsCount).unlockedAchievements;

            const alien = getUserAlien(userId);
            notice = {
                alienName: alien?.name ?? 'Alienígena',
                planetName: mission.planet_name,
                resources,
                coins: coinsReward,
            };
            setMissionNotice(userId, notice);
            clearExplorationMission(userId);
            return { mission: null, notice, unlockedAchievements: missionUnlocks };
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
        defaultLanguage: row?.default_language ?? null,
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
    // Só limpa o canal permitido — NÃO apaga a linha inteira, pra não perder
    // o `default_language` (ou outras configs futuras) do servidor.
    db.prepare(`
        UPDATE guild_settings
        SET allowed_channel_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ?
    `).run(guildId);
};

// Idioma padrão do servidor, aplicado a quem nunca escolheu um idioma
// pessoal em /config user. `lang` deve ser 'pt-BR' ou 'en-US'.
const setGuildDefaultLanguage = (guildId, lang) => {
    db.prepare(`
        INSERT INTO guild_settings (guild_id, default_language, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(guild_id) DO UPDATE SET
            default_language = excluded.default_language,
            updated_at = CURRENT_TIMESTAMP
    `).run(guildId, lang);
};

// Só define o padrão se o servidor ainda não tiver um definido — usado no
// guildCreate/backfill pra não sobrescrever uma escolha manual de admin.
const setGuildDefaultLanguageIfUnset = (guildId, lang) => {
    const current = db.prepare('SELECT default_language FROM guild_settings WHERE guild_id = ?').get(guildId);
    if (current?.default_language) return false;
    setGuildDefaultLanguage(guildId, lang);
    return true;
};

// Sincroniza o idioma do usuário com o padrão do servidor, mas SÓ se ele
// nunca tiver escolhido um idioma manualmente (`language_set = 0`).
// Chamado a cada interação dentro de um servidor (ver events/interactionCreate.js).
const syncUserLanguageWithGuildDefault = (userId, guildId) => {
    const user = getUser(userId);
    if (user.language_set === 1) return;

    const settings = db.prepare('SELECT default_language FROM guild_settings WHERE guild_id = ?').get(guildId);
    const defaultLang = settings?.default_language;
    if (!defaultLang || defaultLang === user.language) return;

    db.prepare('UPDATE users SET language = ? WHERE user_id = ?').run(defaultLang, userId);
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
        } catch (err) {
            logger.error(`Falha ao aplicar recompensa do craft "${active.recipe_id}" para o usuário ${userId}: ${err.message}`);
        }
    }

    incrementCraftCompleted(userId, 1);
    const unlockedAchievements = checkAchievementsForUser(userId);

    db.prepare('DELETE FROM active_crafts WHERE user_id = ?').run(userId);

    const notice = {
        recipeId: active.recipe_id,
        titleKey: recipe?.titleKey ?? null,
    };
    setCraftNotice(userId, notice);

    return { craft: null, notice, unlockedAchievements };
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

const MARKET_LISTING_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const processExpiredMarketListings = () => {
    const now = Date.now();
    db.prepare(`
        UPDATE market_listings
        SET status = 'expired'
        WHERE status = 'active' AND (expires_at > 0 AND expires_at <= ?)
    `).run(now);
};

const createMarketListing = (sellerId, resourceKey, amount, pricePerUnit, sellerName = null) => {
    const qty = Math.floor(Number(amount));
    const price = Math.floor(Number(pricePerUnit));

    if (qty <= 0 || price <= 0 || !Number.isFinite(qty) || !Number.isFinite(price)) {
        return { success: false, reason: 'invalid_values' };
    }

    const resourceInfo = getResourceInfo(resourceKey);
    if (!resourceInfo) {
        return { success: false, reason: 'invalid_resource' };
    }

    const minPrice = getMinListingPrice(resourceInfo.systemShopPrice);
    if (price < minPrice) {
        return { success: false, reason: 'price_too_low', minPrice };
    }

    processExpiredMarketListings();
    const activeCount = db.prepare(`
        SELECT COUNT(*) AS total
        FROM market_listings
        WHERE seller_id = ? AND resource_key = ? AND status = 'active'
    `).get(sellerId, resourceKey);

    if ((activeCount?.total ?? 0) >= MARKET_CONFIG.maxActiveListingsPerResource) {
        return { success: false, reason: 'too_many_listings', limit: MARKET_CONFIG.maxActiveListingsPerResource };
    }

    const currentInventory = db.prepare(`
        SELECT amount FROM user_inventory
        WHERE user_id = ? AND resource_key = ?
    `).get(sellerId, resourceKey);

    const available = currentInventory?.amount ?? 0;
    if (available < qty) {
        return { success: false, reason: 'insufficient_resources' };
    }

    const now = Date.now();
    const expiresAt = now + MARKET_LISTING_LIFETIME_MS;

    const tx = db.transaction(() => {
        db.prepare(`
            UPDATE user_inventory
            SET amount = amount - ?
            WHERE user_id = ? AND resource_key = ?
        `).run(qty, sellerId, resourceKey);

        const res = db.prepare(`
            INSERT INTO market_listings (seller_id, seller_name, resource_key, amount, price_per_unit, created_at, expires_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `).run(sellerId, sellerName, resourceKey, qty, price, now, expiresAt);

        return res.lastInsertRowid;
    });

    const listingId = tx();
    return { success: true, listingId, expiresAt };
};

const getMarketListingsByResource = (resourceKey, limit = 10, offset = 0) => {
    processExpiredMarketListings();
    const now = Date.now();

    const rows = db.prepare(`
        SELECT id, seller_id AS sellerId, seller_name AS sellerName, resource_key AS resourceKey, amount, price_per_unit AS pricePerUnit, created_at AS createdAt, expires_at AS expiresAt, status
        FROM market_listings
        WHERE resource_key = ? AND amount > 0 AND status = 'active' AND (expires_at > ? OR expires_at = 0)
        ORDER BY price_per_unit ASC, created_at ASC
        LIMIT ? OFFSET ?
    `).all(resourceKey, now, limit, offset);

    const totalCountRow = db.prepare(`
        SELECT COUNT(*) AS total
        FROM market_listings
        WHERE resource_key = ? AND amount > 0 AND status = 'active' AND (expires_at > ? OR expires_at = 0)
    `).get(resourceKey, now);

    return {
        listings: rows,
        total: totalCountRow?.total ?? 0,
    };
};

const getUserMarketListings = (sellerId) => {
    processExpiredMarketListings();
    const now = Date.now();

    return db.prepare(`
        SELECT id, seller_id AS sellerId, seller_name AS sellerName, resource_key AS resourceKey, amount, price_per_unit AS pricePerUnit, created_at AS createdAt, expires_at AS expiresAt, status
        FROM market_listings
        WHERE seller_id = ? AND amount > 0
        ORDER BY CASE WHEN status = 'expired' OR (expires_at > 0 AND expires_at <= ?) THEN 0 ELSE 1 END ASC, created_at DESC
    `).all(sellerId, now);
};

const getMarketListingById = (listingId) => {
    return db.prepare(`
        SELECT id, seller_id AS sellerId, seller_name AS sellerName, resource_key AS resourceKey, amount, price_per_unit AS pricePerUnit, created_at AS createdAt, expires_at AS expiresAt, status
        FROM market_listings
        WHERE id = ?
    `).get(listingId) ?? null;
};

const buyMarketListing = (buyerId, listingId, buyAmount) => {
    processExpiredMarketListings();
    const listing = getMarketListingById(listingId);
    const now = Date.now();

    if (!listing || listing.amount <= 0 || listing.status !== 'active' || (listing.expiresAt > 0 && listing.expiresAt <= now)) {
        return { success: false, reason: 'listing_not_found' };
    }

    if (listing.sellerId === buyerId) {
        return { success: false, reason: 'cannot_buy_own_listing' };
    }

    const qty = Math.floor(Number(buyAmount));
    if (qty <= 0 || qty > listing.amount) {
        return { success: false, reason: 'invalid_amount' };
    }

    const totalCost = qty * listing.pricePerUnit;
    const sellerProceeds = getSellerProceeds(totalCost);
    const buyerCoins = getUserCoins(buyerId);
    if (buyerCoins < totalCost) {
        return { success: false, reason: 'insufficient_coins', totalCost };
    }

    const tx = db.transaction(() => {
        db.prepare('UPDATE users SET coins = coins - ? WHERE user_id = ?').run(totalCost, buyerId);

        getUser(listing.sellerId);
        db.prepare('UPDATE users SET coins = coins + ? WHERE user_id = ?').run(sellerProceeds, listing.sellerId);

        db.prepare(`
            INSERT INTO user_inventory (user_id, resource_key, amount)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, resource_key) DO UPDATE SET amount = amount + excluded.amount
        `).run(buyerId, listing.resourceKey, qty);

        const newAmount = listing.amount - qty;
        if (newAmount <= 0) {
            db.prepare('DELETE FROM market_listings WHERE id = ?').run(listingId);
        } else {
            db.prepare('UPDATE market_listings SET amount = ? WHERE id = ?').run(newAmount, listingId);
        }
    });

    tx();

    addMarketGlobalBoughtStats(buyerId, qty, totalCost);
    addMarketGlobalSoldStats(listing.sellerId, qty, sellerProceeds);
    const buyerUnlocks = checkAchievementsForUser(buyerId);
    const sellerUnlocks = checkAchievementsForUser(listing.sellerId);

    return {
        success: true,
        totalCost,
        sellerProceeds,
        saleFee: totalCost - sellerProceeds,
        sellerId: listing.sellerId,
        resourceKey: listing.resourceKey,
        buyAmount: qty,
        pricePerUnit: listing.pricePerUnit,
        buyerUnlockedAchievements: buyerUnlocks,
        sellerUnlockedAchievements: sellerUnlocks,
    };
};

const cancelMarketListing = (sellerId, listingId) => {
    const listing = getMarketListingById(listingId);
    if (!listing || listing.sellerId !== sellerId) {
        return { success: false, reason: 'listing_not_found' };
    }

    const tx = db.transaction(() => {
        db.prepare(`
            INSERT INTO user_inventory (user_id, resource_key, amount)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, resource_key) DO UPDATE SET amount = amount + excluded.amount
        `).run(sellerId, listing.resourceKey, listing.amount);

        db.prepare('DELETE FROM market_listings WHERE id = ?').run(listingId);
    });

    tx();
    return {
        success: true,
        resourceKey: listing.resourceKey,
        amount: listing.amount,
    };
};

const buyFromSystemShop = (buyerId, resourceKey, amount) => {
    const resourceInfo = getResourceInfo(resourceKey);
    if (!resourceInfo) {
        return { success: false, reason: 'invalid_resource' };
    }

    const qty = Math.floor(Number(amount));
    if (qty <= 0 || !Number.isFinite(qty)) {
        return { success: false, reason: 'invalid_amount' };
    }

    const unitPrice = resourceInfo.systemShopPrice;
    const totalCost = qty * unitPrice;

    const buyerCoins = getUserCoins(buyerId);
    if (buyerCoins < totalCost) {
        return { success: false, reason: 'insufficient_coins', totalCost };
    }

    const tx = db.transaction(() => {
        db.prepare('UPDATE users SET coins = coins - ? WHERE user_id = ?').run(totalCost, buyerId);

        db.prepare(`
            INSERT INTO user_inventory (user_id, resource_key, amount)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, resource_key) DO UPDATE SET amount = amount + excluded.amount
        `).run(buyerId, resourceKey, qty);
    });

    tx();

    addShopBoughtStats(buyerId, qty);
    const unlockedAchievements = checkAchievementsForUser(buyerId);

    return {
        success: true,
        resourceKey,
        amount: qty,
        unitPrice,
        totalCost,
        unlockedAchievements,
    };
};

// Espelha buyFromSystemShop: vende recursos do inventário do jogador
// diretamente pro sistema, a `sellPrice` (definido por recurso em
// gameConfig/resources.js). Vendedor recebe o valor total na hora, sem taxa
// (a taxa do /market só se aplica a vendas entre jogadores).
const sellToSystemShop = (sellerId, resourceKey, amount) => {
    const resourceInfo = getResourceInfo(resourceKey);
    if (!resourceInfo) {
        return { success: false, reason: 'invalid_resource' };
    }

    const qty = Math.floor(Number(amount));
    if (qty <= 0 || !Number.isFinite(qty)) {
        return { success: false, reason: 'invalid_amount' };
    }

    const unitPrice = resourceInfo.sellPrice;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { success: false, reason: 'not_sellable' };
    }

    const currentInventory = db.prepare(`
        SELECT amount FROM user_inventory
        WHERE user_id = ? AND resource_key = ?
    `).get(sellerId, resourceKey);

    const available = currentInventory?.amount ?? 0;
    if (available < qty) {
        return { success: false, reason: 'insufficient_resources' };
    }

    const totalPayout = qty * unitPrice;

    const tx = db.transaction(() => {
        db.prepare(`
            UPDATE user_inventory
            SET amount = amount - ?
            WHERE user_id = ? AND resource_key = ?
        `).run(qty, sellerId, resourceKey);

        db.prepare('UPDATE users SET coins = coins + ? WHERE user_id = ?').run(totalPayout, sellerId);
    });

    tx();

    addShopSoldStats(sellerId, qty);
    const unlockedAchievements = checkAchievementsForUser(sellerId);

    return {
        success: true,
        resourceKey,
        amount: qty,
        unitPrice,
        totalPayout,
        unlockedAchievements,
    };
};

// =============================================================================
// CHAPÉUS — inventário, equipar e /hatmarket
// =============================================================================

const getUserHats = (userId) => {
    return db.prepare(`
        SELECT hat_key AS hatKey, quantity
        FROM user_hats
        WHERE user_id = ? AND quantity > 0
        ORDER BY hat_key ASC
    `).all(userId);
};

// Espelha buyFromSystemShop (recursos): compra chapéu(éis) direto da Loja do
// Sistema, ao preço fixo de gameConfig/hats.js (getHatShopPrice). Diferente
// do /hatmarket normal (jogador-a-jogador), aqui não existe vendedor nem
// taxa — o chapéu é criado "do nada" e pago em ∩oins direto pro sistema.
const buyHatFromSystemShop = (buyerId, hatKey, qty = 1) => {
    const hat = getHat(hatKey);
    if (!hat) {
        return { success: false, reason: 'invalid_hat' };
    }

    const amount = Math.floor(Number(qty));
    if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, reason: 'invalid_amount' };
    }

    const unitPrice = getHatShopPrice(hatKey);
    const totalCost = amount * unitPrice;

    const buyerCoins = getUserCoins(buyerId);
    if (buyerCoins < totalCost) {
        return { success: false, reason: 'insufficient_coins', totalCost };
    }

    const tx = db.transaction(() => {
        db.prepare('UPDATE users SET coins = coins - ? WHERE user_id = ?').run(totalCost, buyerId);
        addUserHat(buyerId, hatKey, amount);
    });
    tx();

    addShopBoughtStats(buyerId, amount);
    const unlockedAchievements = checkAchievementsForUser(buyerId);

    return {
        success: true,
        hatKey,
        amount,
        unitPrice,
        totalCost,
        unlockedAchievements,
    };
};

const getUserHatQuantity = (userId, hatKey) => {
    const row = db.prepare(`
        SELECT quantity FROM user_hats WHERE user_id = ? AND hat_key = ?
    `).get(userId, hatKey);
    return row?.quantity ?? 0;
};

const addUserHat = (userId, hatKey, qty = 1) => {
    if (!getHat(hatKey) || qty <= 0) return;
    db.prepare(`
        INSERT INTO user_hats (user_id, hat_key, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, hat_key) DO UPDATE SET quantity = quantity + excluded.quantity
    `).run(userId, hatKey, qty);
};

const removeUserHat = (userId, hatKey, qty = 1) => {
    const current = getUserHatQuantity(userId, hatKey);
    if (current < qty) return false;

    db.prepare(`
        UPDATE user_hats SET quantity = quantity - ?
        WHERE user_id = ? AND hat_key = ?
    `).run(qty, userId, hatKey);

    // Se ficou sem nenhuma unidade e era o chapéu equipado, desequipa.
    if (current - qty <= 0) {
        const user = getUser(userId);
        if (user.equipped_hat === hatKey) {
            setEquippedHat(userId, null);
        }
    }
    return true;
};

const getEquippedHat = (userId) => {
    const user = getUser(userId);
    return user.equipped_hat || null;
};

const setEquippedHat = (userId, hatKey) => {
    if (hatKey !== null && (!getHat(hatKey) || getUserHatQuantity(userId, hatKey) <= 0)) {
        return { success: false, reason: 'hat_not_owned' };
    }
    db.prepare(`UPDATE users SET equipped_hat = ? WHERE user_id = ?`).run(hatKey, userId);
    return { success: true };
};

const processExpiredHatListings = () => {
    const now = Date.now();
    db.prepare(`
        UPDATE hat_market_listings
        SET status = 'expired'
        WHERE status = 'active' AND expires_at > 0 AND expires_at <= ?
    `).run(now);
};

const createHatMarketListing = (sellerId, hatKey, price, sellerName = null) => {
    const hat = getHat(hatKey);
    if (!hat) return { success: false, reason: 'invalid_hat' };

    const priceInt = Math.floor(Number(price));
    if (!Number.isFinite(priceInt) || priceInt <= 0) {
        return { success: false, reason: 'invalid_values' };
    }

    const minPrice = getMinHatListingPrice(hatKey);
    if (priceInt < minPrice) {
        return { success: false, reason: 'price_too_low', minPrice };
    }

    if (getUserHatQuantity(sellerId, hatKey) < 1) {
        return { success: false, reason: 'hat_not_owned' };
    }

    processExpiredHatListings();
    const activeCount = db.prepare(`
        SELECT COUNT(*) AS total FROM hat_market_listings
        WHERE seller_id = ? AND hat_key = ? AND status = 'active'
    `).get(sellerId, hatKey);

    if ((activeCount?.total ?? 0) >= HAT_MARKET_CONFIG.maxActiveListingsPerHat) {
        return { success: false, reason: 'too_many_listings', limit: HAT_MARKET_CONFIG.maxActiveListingsPerHat };
    }

    const now = Date.now();
    const expiresAt = now + HAT_MARKET_CONFIG.listingLifetimeMs;

    const tx = db.transaction(() => {
        removeUserHat(sellerId, hatKey, 1);
        const res = db.prepare(`
            INSERT INTO hat_market_listings (seller_id, seller_name, hat_key, price, created_at, expires_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        `).run(sellerId, sellerName, hatKey, priceInt, now, expiresAt);
        return res.lastInsertRowid;
    });

    return { success: true, listingId: tx(), expiresAt };
};

const getHatMarketListings = (hatKey = null, limit = 10, offset = 0) => {
    processExpiredHatListings();
    const now = Date.now();

    const where = hatKey
        ? `WHERE hat_key = ? AND status = 'active' AND (expires_at > ? OR expires_at = 0)`
        : `WHERE status = 'active' AND (expires_at > ? OR expires_at = 0)`;
    const params = hatKey ? [hatKey, now] : [now];

    const rows = db.prepare(`
        SELECT id, seller_id AS sellerId, seller_name AS sellerName, hat_key AS hatKey,
               price, created_at AS createdAt, expires_at AS expiresAt, status
        FROM hat_market_listings
        ${where}
        ORDER BY price ASC, created_at ASC
        LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const totalRow = db.prepare(`
        SELECT COUNT(*) AS total FROM hat_market_listings ${where}
    `).get(...params);

    return { listings: rows, total: totalRow?.total ?? 0 };
};

const getUserHatMarketListings = (userId) => {
    processExpiredHatListings();
    return db.prepare(`
        SELECT id, hat_key AS hatKey, price, created_at AS createdAt, expires_at AS expiresAt, status
        FROM hat_market_listings
        WHERE seller_id = ? AND status = 'active'
        ORDER BY created_at DESC
    `).all(userId);
};

const getHatMarketListingById = (listingId) => {
    return db.prepare(`
        SELECT id, seller_id AS sellerId, seller_name AS sellerName, hat_key AS hatKey,
               price, created_at AS createdAt, expires_at AS expiresAt, status
        FROM hat_market_listings
        WHERE id = ?
    `).get(listingId);
};

const buyHatMarketListing = (buyerId, listingId) => {
    processExpiredHatListings();
    const listing = getHatMarketListingById(listingId);

    if (!listing || listing.status !== 'active' || (listing.expiresAt > 0 && Date.now() > listing.expiresAt)) {
        return { success: false, reason: 'listing_not_found' };
    }
    if (listing.sellerId === buyerId) {
        return { success: false, reason: 'cannot_buy_own_listing' };
    }

    const buyerCoins = getUserCoins(buyerId);
    if (buyerCoins < listing.price) {
        return { success: false, reason: 'insufficient_coins', totalCost: listing.price };
    }

    const proceeds = getHatSellerProceeds(listing.price);

    const tx = db.transaction(() => {
        db.prepare(`UPDATE hat_market_listings SET status = 'sold' WHERE id = ?`).run(listingId);
        db.prepare(`UPDATE users SET coins = coins - ? WHERE user_id = ?`).run(listing.price, buyerId);
        db.prepare(`UPDATE users SET coins = coins + ? WHERE user_id = ?`).run(proceeds, listing.sellerId);
        addUserHat(buyerId, listing.hatKey, 1);
    });
    tx();

    return {
        success: true,
        hatKey: listing.hatKey,
        totalCost: listing.price,
        sellerId: listing.sellerId,
    };
};

const cancelHatMarketListing = (userId, listingId) => {
    const listing = getHatMarketListingById(listingId);
    if (!listing || listing.sellerId !== userId || listing.status !== 'active') {
        return { success: false, reason: 'listing_not_found' };
    }

    const tx = db.transaction(() => {
        db.prepare(`UPDATE hat_market_listings SET status = 'cancelled' WHERE id = ?`).run(listingId);
        addUserHat(userId, listing.hatKey, 1);
    });
    tx();

    return { success: true, hatKey: listing.hatKey };
};

// =============================================================================
// ESTATÍSTICAS DE MERCADO E CONQUISTAS
// =============================================================================

const getUserMarketStats = (userId) => {
    const user = getUser(userId);
    return {
        marketGlobalSoldCount: user.market_global_sold_count ?? 0,
        marketGlobalSoldRevenue: user.market_global_sold_revenue ?? 0,
        marketGlobalBoughtCount: user.market_global_bought_count ?? 0,
        marketGlobalBoughtSpent: user.market_global_bought_spent ?? 0,
        shopBoughtCount: user.shop_bought_count ?? 0,
        shopSoldCount: user.shop_sold_count ?? 0,
        craftCompletedCount: user.craft_completed_count ?? 0,
        coinsTotalEarned: user.coins_total_earned ?? 0,
    };
};

const addMarketGlobalSoldStats = (sellerId, units, revenue) => {
    if (units > 0) {
        getUser(sellerId);
        db.prepare(`
            UPDATE users
            SET market_global_sold_count = market_global_sold_count + ?,
                market_global_sold_revenue = market_global_sold_revenue + ?
            WHERE user_id = ?
        `).run(Math.floor(units), Math.floor(revenue), sellerId);
    }
};

const addMarketGlobalBoughtStats = (buyerId, units, spent) => {
    if (units > 0) {
        getUser(buyerId);
        db.prepare(`
            UPDATE users
            SET market_global_bought_count = market_global_bought_count + ?,
                market_global_bought_spent = market_global_bought_spent + ?
            WHERE user_id = ?
        `).run(Math.floor(units), Math.floor(spent), buyerId);
    }
};

const addShopBoughtStats = (buyerId, units) => {
    if (units > 0) {
        getUser(buyerId);
        db.prepare(`
            UPDATE users SET shop_bought_count = shop_bought_count + ? WHERE user_id = ?
        `).run(Math.floor(units), buyerId);
    }
};

const addShopSoldStats = (sellerId, units) => {
    if (units > 0) {
        getUser(sellerId);
        db.prepare(`
            UPDATE users SET shop_sold_count = shop_sold_count + ? WHERE user_id = ?
        `).run(Math.floor(units), sellerId);
    }
};

const incrementCraftCompleted = (userId, amount = 1) => {
    if (amount > 0) {
        getUser(userId);
        db.prepare(`
            UPDATE users SET craft_completed_count = craft_completed_count + ? WHERE user_id = ?
        `).run(Math.floor(amount), userId);
    }
};

const addCoinsEarned = (userId, amount) => {
    if (amount > 0) {
        getUser(userId);
        db.prepare(`
            UPDATE users SET coins_total_earned = coins_total_earned + ? WHERE user_id = ?
        `).run(Math.floor(amount), userId);
    }
};

const getUserAchievements = (userId) => {
    const rows = db.prepare(`
        SELECT achievement_id AS achievementId, unlocked_at AS unlockedAt
        FROM user_achievements
        WHERE user_id = ?
    `).all(userId);
    return rows;
};

const isAchievementUnlocked = (userId, achievementId) => {
    const row = db.prepare(`
        SELECT 1 FROM user_achievements
        WHERE user_id = ? AND achievement_id = ?
    `).get(userId, achievementId);
    return !!row;
};

const getAchievementCurrentStat = (userId, type) => {
    const user = getUser(userId);
    switch (type) {
        case 'market_global_sold_count':   return user.market_global_sold_count ?? 0;
        case 'market_global_sold_revenue': return user.market_global_sold_revenue ?? 0;
        case 'market_global_bought_count': return user.market_global_bought_count ?? 0;
        case 'market_global_bought_spent': return user.market_global_bought_spent ?? 0;
        case 'shop_bought_count':          return user.shop_bought_count ?? 0;
        case 'shop_sold_count':            return user.shop_sold_count ?? 0;
        case 'coins_total_earned':         return user.coins_total_earned ?? 0;
        case 'planets_seen':               return user.planets_seen ?? 0;
        case 'trips_completed':            return user.trips_completed ?? 0;
        case 'resources_collected':        return user.total_resources_collected ?? 0;
        case 'distance_traveled_km':       return user.distance_traveled_km ?? 0;
        case 'daily_streak':               return user.daily_streak ?? 0;
        case 'craft_completed':            return user.craft_completed_count ?? 0;
        case 'bot_invited':                return user.bot_invited ?? 0;
        default: return 0;
    }
};

const checkAchievementsForUser = (userId) => {
    const { getAchievementsByType, getAchievement } = require('../gameConfig/achievements');
    const newlyUnlocked = [];

    const typeSet = new Set();
    for (const a of getAchievementsByType('__unused__')) typeSet.add(a.type); // no-op
    const allTypes = new Set([
        'market_global_sold_count', 'market_global_sold_revenue',
        'market_global_bought_count', 'market_global_bought_spent',
        'shop_bought_count', 'shop_sold_count',
        'coins_total_earned', 'planets_seen', 'trips_completed',
        'resources_collected', 'distance_traveled_km', 'daily_streak',
        'craft_completed', 'bot_invited',
    ]);

    for (const type of allTypes) {
        const achievements = getAchievementsByType(type);
        if (achievements.length === 0) continue;
        const current = getAchievementCurrentStat(userId, type);

        for (const ach of achievements) {
            if (current >= ach.threshold && !isAchievementUnlocked(userId, ach.id)) {
                const res = applyAchievementReward(userId, ach);
                if (res) {
                    newlyUnlocked.push({ achievement: ach, appliedReward: res });
                }
            }
        }
    }

    return newlyUnlocked;
};

const applyAchievementReward = (userId, achievement) => {
    if (!achievement || isAchievementUnlocked(userId, achievement.id)) return null;

    const rewardCoins = achievement.reward?.coins ?? 0;
    const rewardResources = achievement.reward?.resources ?? [];

    const tx = db.transaction(() => {
        db.prepare(`
            INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
            VALUES (?, ?, ?)
        `).run(userId, achievement.id, Date.now());

        if (rewardCoins > 0) {
            db.prepare('UPDATE users SET coins = coins + ? WHERE user_id = ?').run(rewardCoins, userId);
            addCoinsEarned(userId, rewardCoins);
        }

        if (rewardResources.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO user_inventory (user_id, resource_key, amount)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, resource_key) DO UPDATE SET amount = amount + excluded.amount
            `);
            for (const res of rewardResources) {
                stmt.run(userId, res.key, res.amount);
            }
        }
    });

    try {
        tx();
        return {
            coins: rewardCoins,
            resources: [...rewardResources],
        };
    } catch (err) {
        logger.error(`Falha ao aplicar recompensa da conquista "${achievement.id}" para ${userId}: ${err.message}`);
        return null;
    }
};

// =============================================================================
// CONVITE DO BOT (conquista "invite_bot_1" — ver gameConfig/achievements.js)
// =============================================================================
const BOT_INVITE_ACHIEVEMENT_ID = 'invite_bot_1';

// Chamado pelo events/guildCreate.js (bot acabou de entrar num servidor) e
// pelo backfill em events/ready.js (servidores em que o bot já estava).
// `ON CONFLICT DO NOTHING` garante que só o primeiro registro pra cada
// servidor conta — não sobrescreve um dado de audit log já capturado.
const recordBotInvite = (guildId, inviterId, joinedAt = Date.now(), source = 'unknown') => {
    try {
        db.prepare(`
            INSERT INTO bot_invites (guild_id, inviter_id, joined_at, source)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id) DO NOTHING
        `).run(guildId, inviterId ?? null, joinedAt, source);
    } catch (err) {
        logger.error(`Falha ao registrar convite do bot para o servidor ${guildId}: ${err.message}`);
    }
};

const hasBotInviteRecord = (guildId) => {
    const row = db.prepare('SELECT 1 FROM bot_invites WHERE guild_id = ?').get(guildId);
    return !!row;
};

const userHasInvitedBot = (userId) => {
    const row = db.prepare('SELECT 1 FROM bot_invites WHERE inviter_id = ? LIMIT 1').get(userId);
    return !!row;
};

// Chamado pelo /resgatar. Três resultados possíveis:
//   'already_unlocked' -> usuário já tinha a conquista, nada a fazer
//   'not_verified'      -> não encontramos nenhum servidor cujo convite
//                           tenha sido atribuído a esse usuário ainda
//   'unlocked'           -> acabou de desbloquear agora (reward já aplicado)
const claimBotInviteAchievement = (userId) => {
    getUser(userId); // garante que a linha existe antes do UPDATE abaixo

    if (isAchievementUnlocked(userId, BOT_INVITE_ACHIEVEMENT_ID)) {
        return { status: 'already_unlocked', unlockedAchievements: [] };
    }

    if (!userHasInvitedBot(userId)) {
        return { status: 'not_verified', unlockedAchievements: [] };
    }

    db.prepare('UPDATE users SET bot_invited = 1 WHERE user_id = ?').run(userId);
    const unlockedAchievements = checkAchievementsForUser(userId);
    return { status: 'unlocked', unlockedAchievements };
};

// =============================================================================
// RESGATES GENÉRICOS (/resgatar)
// =============================================================================
// Infraestrutura reaproveitável pra qualquer coisa que precise ficar
// "esperando" o usuário reivindicar ativamente — hoje só a conquista de
// convite usa esse fluxo, mas createRedeemable/createRedeemableForAllUsers
// já deixam pronto pra presentes/eventos futuros mandados manualmente
// (ex: um comando de admin que chama createRedeemableForAllUsers pra
// distribuir algo pra todo mundo, sem precisar de UI nova em /resgatar).
const createRedeemable = (userId, { titlePt, titleEn, coins = 0, resources = [] }) => {
    db.prepare(`
        INSERT INTO redeemables (user_id, title_pt, title_en, coins, resources_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, titlePt, titleEn, Math.floor(coins), JSON.stringify(resources), Date.now());
};

const createRedeemableForAllUsers = ({ titlePt, titleEn, coins = 0, resources = [] }) => {
    const users = db.prepare('SELECT user_id FROM users').all();
    const tx = db.transaction(() => {
        for (const { user_id } of users) {
            createRedeemable(user_id, { titlePt, titleEn, coins, resources });
        }
    });
    tx();
    return users.length;
};

const getPendingRedeemables = (userId) => {
    return db.prepare(`
        SELECT id, title_pt AS titlePt, title_en AS titleEn, coins,
               resources_json AS resourcesJson, created_at AS createdAt
        FROM redeemables
        WHERE user_id = ? AND claimed_at IS NULL
        ORDER BY created_at ASC
    `).all(userId).map((r) => ({ ...r, resources: JSON.parse(r.resourcesJson || '[]') }));
};

// Aplica TODOS os resgates pendentes do usuário de uma vez (coins +
// recursos) e marca cada um como reivindicado. Retorna a lista do que foi
// aplicado (antes de marcar), pra quem chamou poder montar a mensagem.
const claimAllRedeemables = (userId) => {
    const pending = getPendingRedeemables(userId);
    if (pending.length === 0) return [];

    const tx = db.transaction(() => {
        const now = Date.now();
        for (const item of pending) {
            if (item.coins > 0) {
                db.prepare('UPDATE users SET coins = coins + ? WHERE user_id = ?').run(item.coins, userId);
                addCoinsEarned(userId, item.coins);
            }
            if (item.resources.length > 0) {
                const stmt = db.prepare(`
                    INSERT INTO user_inventory (user_id, resource_key, amount)
                    VALUES (?, ?, ?)
                    ON CONFLICT(user_id, resource_key) DO UPDATE SET amount = amount + excluded.amount
                `);
                for (const res of item.resources) {
                    stmt.run(userId, res.key, res.amount);
                }
            }
            db.prepare('UPDATE redeemables SET claimed_at = ? WHERE id = ?').run(now, item.id);
        }
    });

    tx();
    return pending;
};

module.exports = {
    db,
    getUser,
    hasAcceptedTerms,
    acceptTerms,
    getUserLanguage,
    setUserLanguage,
    getUserMissionNotifyPref,
    setUserMissionNotifyPref,
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
    setInventoryResource,
    getActiveCraft,
    startCraftJob,
    resolveActiveCraft,
    popCraftNotice,
    resolveAllPendingCrafts,
    setMissionNotice,
    popMissionNotice,
    peekMissionNotice,
    resolveExplorationMission,
    forceExpireMissionPhase,
    setMissionNotifyChannel,
    resolveAllPendingMissions,
    cleanExpiredPlanetOffers,
    getGuildAllowedChannel,
    getGuildSettings,
    setGuildAllowedChannel,
    clearGuildAllowedChannel,
    setGuildDefaultLanguage,
    setGuildDefaultLanguageIfUnset,
    syncUserLanguageWithGuildDefault,
    getUserCoins,
    addUserCoins,
    setUserCoins,
    getDailyState,
    claimDaily,
    resetDailyClaim,
    incrementPlanetsSeen,
    addMissionCompletionStats,
    getLeaderboard,
    getLeaderboardRank,
    getUserProfileStats,
    createMarketListing,
    getMarketListingsByResource,
    getUserMarketListings,
    getMarketListingById,
    buyMarketListing,
    cancelMarketListing,
    buyFromSystemShop,
    sellToSystemShop,
    getUserHats,
    buyHatFromSystemShop,
    getUserHatQuantity,
    addUserHat,
    removeUserHat,
    getEquippedHat,
    setEquippedHat,
    createHatMarketListing,
    getHatMarketListings,
    getUserHatMarketListings,
    getHatMarketListingById,
    buyHatMarketListing,
    cancelHatMarketListing,
    getUserMarketStats,
    addMarketGlobalSoldStats,
    addMarketGlobalBoughtStats,
    addShopBoughtStats,
    addShopSoldStats,
    incrementCraftCompleted,
    addCoinsEarned,
    getUserAchievements,
    isAchievementUnlocked,
    getAchievementCurrentStat,
    checkAchievementsForUser,
    applyAchievementReward,
    BOT_INVITE_ACHIEVEMENT_ID,
    recordBotInvite,
    hasBotInviteRecord,
    userHasInvitedBot,
    claimBotInviteAchievement,
    createRedeemable,
    createRedeemableForAllUsers,
    getPendingRedeemables,
    claimAllRedeemables,
};