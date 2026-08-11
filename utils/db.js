const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./logger');

const dbPath = path.join(__dirname, '..', 'data', 'bot.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        terms_accepted INTEGER NOT NULL DEFAULT 0,
        terms_accepted_at TEXT,
        language TEXT NOT NULL DEFAULT 'pt-BR'
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

if (!temLanguage) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR';
    `);
    logger.success('Coluna `language` adicionada à tabela `users`');
}

logger.success('Banco SQLite inicializado (data/bot.db)');

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

module.exports = {
    db,
    getUser,
    hasAcceptedTerms,
    acceptTerms,
    getUserLanguage,
    setUserLanguage,
    getBraziliaDateParts,
    getPlanetCycleKey,
    getPlanetNextResetInfo,
    getPlanetUsageState,
    consumePlanetUsage,
};
