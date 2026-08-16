const fs = require('fs');
const path = require('path');
const { getUserLanguage } = require('./db');
const logger = require('./logger');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const DEFAULT_LANG = 'pt-BR';
const SUPPORTED_LANGS = ['pt-BR', 'en-US'];

const translations = {};

for (const file of fs.readdirSync(LOCALES_DIR)) {
    if (file.endsWith('.json')) {
        const code = file.replace('.json', '');
        try {
            translations[code] = JSON.parse(
                fs.readFileSync(path.join(LOCALES_DIR, file), 'utf-8')
            );
        } catch (err) {
            logger.error(`Falha ao carregar tradução ${file}: ${err.message}`);
        }
    }
}

logger.success(`Sistema i18n carregado (${Object.keys(translations).length} idiomas)`);

const resolveKey = (obj, keyPath) => {
    return keyPath.split('.').reduce((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
            return acc[part];
        }
        return undefined;
    }, obj);
};

const getText = (langCode, key, variables = {}) => {
    const lang = SUPPORTED_LANGS.includes(langCode) ? langCode : DEFAULT_LANG;
    let value = resolveKey(translations[lang], key);

    if (value === undefined) {
        value = resolveKey(translations[DEFAULT_LANG], key);
    }

    if (value === undefined) {
        logger.warn(`Chave de tradução ausente: ${key} (lang=${lang})`);
        return key;
    }

    if (typeof value === 'string') {
        for (const [varName, varValue] of Object.entries(variables)) {
            value = value.replace(new RegExp(`\\{${varName}\\}`, 'g'), String(varValue));
        }
    }

    return value;
};

const t = (userIdOrLang, key, variables) => {
    if (SUPPORTED_LANGS.includes(userIdOrLang)) {
        return getText(userIdOrLang, key, variables);
    }
    const lang = getUserLanguage(userIdOrLang);
    return getText(lang, key, variables);
};

const tFor = (interaction, key, variables) => {
    return t(interaction.user.id, key, variables);
};

// Mapeia o `preferredLocale` do Discord (guild.preferredLocale, ex: 'pt-BR',
// 'en-US', 'es-ES', 'fr'...) para um dos idiomas suportados pelo bot.
// Qualquer coisa que não seja variação de português cai em 'en-US'.
const mapDiscordLocaleToLang = (discordLocale) => {
    if (typeof discordLocale === 'string' && discordLocale.toLowerCase().startsWith('pt')) {
        return 'pt-BR';
    }
    return 'en-US';
};

module.exports = {
    t,
    tFor,
    getText,
    mapDiscordLocaleToLang,
    DEFAULT_LANG,
    SUPPORTED_LANGS,
};
