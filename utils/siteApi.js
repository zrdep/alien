// =============================================================================
// API DO SITE (public/index.html)
// =============================================================================
// GET /api/ranking → Top 5 global de cada categoria do /ranking, já com nome,
// avatar e valor formatado nos dois idiomas (mesmos textos e formatadores do
// comando). O resultado fica em cache por alguns minutos: o site pode receber
// muitas visitas, mas o banco e a API do Discord só são consultados de novo
// quando o cache vence — e nunca em paralelo (as requisições esperam a mesma
// Promise).
// =============================================================================

const { getLeaderboard } = require('./db');
const { getText } = require('./i18n');
const { CATEGORY_META, CATEGORY_ORDER } = require('../commands/utility/ranking');
const logger = require('./logger');

const SITE_TOP_LIMIT = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;
const LANGS = ['pt-BR', 'en-US'];

let cache = null; // { data, expiresAt }
let pending = null;

const byLang = (fn) => Object.fromEntries(LANGS.map((lang) => [lang, fn(lang)]));

const resolveUser = async (client, userId) => {
    try {
        const user = await client.users.fetch(userId);
        return { name: user.username, avatar: user.displayAvatarURL({ extension: 'png', size: 64 }) };
    } catch {
        return { name: null, avatar: null };
    }
};

const buildRanking = async (client) => {
    const categories = await Promise.all(CATEGORY_ORDER.map(async (key) => {
        const meta = CATEGORY_META[key];
        const rows = getLeaderboard(key, SITE_TOP_LIMIT);
        const users = await Promise.all(rows.map((row) => resolveUser(client, row.userId)));

        return {
            key,
            label: byLang((lang) => getText(lang, `commands.ranking.categories.${key}`)),
            desc: byLang((lang) => getText(lang, `commands.ranking.categoryDesc.${key}`)),
            rows: rows.map((row, index) => ({
                name: byLang((lang) => users[index].name
                    ?? getText(lang, 'commands.ranking.unknownUser', { id: row.userId.slice(-4) })),
                avatar: users[index].avatar,
                value: byLang((lang) => meta.format(row.value, lang)),
            })),
        };
    }));

    return { updatedAt: Date.now(), categories };
};

const registerSiteApi = (app, client) => {
    app.get('/api/ranking', async (req, res) => {
        try {
            if (!cache || cache.expiresAt <= Date.now()) {
                pending ??= buildRanking(client).finally(() => { pending = null; });
                const data = await pending;
                cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
            }
            res.set('Cache-Control', 'public, max-age=60');
            res.json(cache.data);
        } catch (err) {
            logger.error(`Falha ao montar o ranking do site: ${err.message}`);
            res.status(500).json({ error: 'ranking_unavailable' });
        }
    });
};

module.exports = {
    registerSiteApi,
};
