const RESOURCE_NAME = {
    'pt-BR': {
        stone: 'Pedra',
        wood: 'Madeira',
        dirt: 'Terra',
        iron: 'Ferro',
        copper: 'Cobre',
        metal: 'Metal',
        blueCrystal: 'Cristal Azul',
        starFragment: 'Fragmento Estelar',
        purpleCrystal: 'Cristal Roxo',
        glowingOre: 'Minério Luminoso',
        planetCore: 'Núcleo de Planeta',
        cosmicPearl: 'Pérola Cósmica',
        starEssence: 'Essência Estelar',
    },
    'en-US': {
        stone: 'Stone',
        wood: 'Wood',
        dirt: 'Dirt',
        iron: 'Iron',
        copper: 'Copper',
        metal: 'Metal',
        blueCrystal: 'Blue Crystal',
        starFragment: 'Star Fragment',
        purpleCrystal: 'Purple Crystal',
        glowingOre: 'Glowing Ore',
        planetCore: 'Planet Core',
        cosmicPearl: 'Cosmic Pearl',
        starEssence: 'Star Essence',
    },
};

const RARITY_EMOJI = {
    A: '<:comum:1536459746364760215>',
    B: '<:incomum:1536459764492533800>',
    C: '<:rare:1536459780166647878>',
    D: '<:epic:1536459798269395044>',
    E: '<:legendary:1536459814475927653>',
};

const getResourceLabel = (lang, key) => {
    const names = RESOURCE_NAME[lang] ?? RESOURCE_NAME['pt-BR'];
    return names[key] ?? key;
};

const formatResourceLine = (lang, resource) => {
    const name = getResourceLabel(lang, resource.key);
    const rarityEmoji = RARITY_EMOJI[resource.rarity] ?? '';
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
    RESOURCE_NAME,
    RARITY_EMOJI,
    getResourceLabel,
    formatResourceLine,
    formatResourcesInline,
    formatResourcesBlock,
};
