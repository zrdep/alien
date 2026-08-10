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
        terms_accepted_at TEXT
    );
`);

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

module.exports = {
    db,
    getUser,
    hasAcceptedTerms,
    acceptTerms,
};
