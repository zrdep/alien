const { getResourceName } = require('../gameConfig/resources');
const { getRarityEmoji } = require('../gameConfig/rarities');

const getResourceLabel = (lang, key) => getResourceName(key, lang);

const formatResourceLine = (lang, resource) => {
    const name = getResourceLabel(lang, resource.key);
    const rarityEmoji = getRarityEmoji(resource.rarity) ?? '';
    return `${resource.emoji} **${name}** × \`${resource.amount}\` ${rarityEmoji}`;
};

const formatResourcesInline = (lang, resources) => {
    if (!resources?.length) return '';
    return resources.map((r) => formatResourceLine(lang, r)).join('\n');
};

const formatResourcesBlock = (lang, resources, title) => {
    if (!resources?.length) return '';
    const body = formatResourcesInline(lang, resources);
    return title ? `**${title}**\n${body}` : body;
};

module.exports = {
    getResourceLabel,
    formatResourceLine,
    formatResourcesInline,
    formatResourcesBlock,
};
