const path = require('path');
const fs = require('fs');
const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const {
    getUserLanguage,
    getUserAlien,
    setUserAlien,
    getUserShip,
    getPlanetUsageState,
    resolveActiveCraft,
    getUserHats,
    getEquippedHat,
    setEquippedHat,
} = require('../../utils/db');
const { buildHangarContent } = require('../../utils/ship');
const { getHat, getHatName } = require('../../gameConfig/hats');
const { getRarityEmoji } = require('../../gameConfig/rarities');
const { composeAlienWithHat } = require('../../utils/hatImage');
const { notifyAchievementsFollowUp } = require('../../utils/achievementNotifier');

const ALIEN_COLORS = [
    { key: 'purple', file: 'purple.png' },
    { key: 'green',  file: 'green.png'  },
    { key: 'blue',   file: 'blue.png'   },
    { key: 'pink',   file: 'pink.png'   },
    { key: 'orange', file: 'orange.png' },
];

const ALIEN_ALL_FILE = 'allAliens.png';
const IMAGES_DIR = path.join(__dirname, '..', '..', 'images', 'aliens');
const ALIEN_NAME_MAX = 12;

const COLOR_NAME = {
    'pt-BR': {
        purple: 'Roxo',
        green:  'Verde',
        blue:   'Azul',
        pink:   'Rosa',
        orange: 'Laranja',
    },
    'en-US': {
        purple: 'Purple',
        green:  'Green',
        blue:   'Blue',
        pink:   'Pink',
        orange: 'Orange',
    },
};

const COLOR_EMOJI = {
    purple: { id: '1536771988838940723', name: 'purple' },
    green:  { id: '1536771986783473795', name: 'green'  },
    blue:   { id: '1536771985126858793', name: 'blue'   },
    pink:   { id: '1536771983692275753', name: 'pink'   },
    orange: { id: '1536771978856370308', name: 'orange' },
};

const COLOR_EMOJI_TEXT = {
    purple: '<:purple:1536771988838940723>',
    green:  '<:green:1536771986783473795>',
    blue:   '<:blue:1536771985126858793>',
    pink:   '<:pink:1536771983692275753>',
    orange: '<:orange:1536771978856370308>',
};

const getColorLabel = (color, lang) => {
    const names = COLOR_NAME[lang] ?? COLOR_NAME['pt-BR'];
    return names[color] ?? color;
};

const imageExists = (fileName) => fs.existsSync(path.join(IMAGES_DIR, fileName));

const getAlienFile = (color) => {
    const entry = ALIEN_COLORS.find((c) => c.key === color);
    if (!entry || !imageExists(entry.file)) return null;
    return entry.file;
};

const buildAttachment = (fileName) => ({
    attachment: path.join(IMAGES_DIR, fileName),
    name: fileName,
});

const COMPOSED_ATTACHMENT_NAME = 'alien_hat.png';

const buildBufferAttachment = (buffer) => ({
    attachment: buffer,
    name: COMPOSED_ATTACHMENT_NAME,
});

const buildColorMenu = (interaction) => {
    const lang = getUserLanguage(interaction.user.id);
    const options = ALIEN_COLORS.map((c) => ({
        label: getColorLabel(c.key, lang),
        value: c.key,
        emoji: COLOR_EMOJI[c.key],
        description: tFor(interaction, `commands.alien.colorChoice.${c.key}`),
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('alien_color_pick')
            .setPlaceholder(tFor(interaction, 'commands.alien.colorPlaceholder'))
            .addOptions(options)
    );
};

const buildRenameButton = (interaction) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('alien_name_change')
            .setLabel(tFor(interaction, 'commands.alien.renameLabel'))
            .setStyle(ButtonStyle.Primary)
            .setEmoji({ id: '1536772081214292155', name: 'edit' })
    );
};

const buildRenameModal = (interaction) => {
    return new ModalBuilder()
        .setCustomId('alien_name_modal')
        .setTitle(tFor(interaction, 'commands.alien.renameModalTitle'))
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('alien_name_input')
                    .setLabel(tFor(interaction, 'commands.alien.renameInputLabel'))
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(tFor(interaction, 'commands.alien.renameInputPlaceholder'))
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(ALIEN_NAME_MAX)
            )
        );
};

const parseCustomEmoji = (emojiString) => {
    const match = /^<a?:(\w+):(\d+)>$/.exec(emojiString ?? '');
    if (!match) return undefined;
    return { id: match[2], name: match[1] };
};

const HAT_NONE_VALUE = '__no_hat__';
const HAT_TEXT = {
    'pt-BR': {
        title: 'Chapéus',
        equippedLabel: 'Equipado',
        noneEquipped: 'Nenhum chapéu equipado',
        placeholder: 'Equipar um chapéu...',
        noneOption: 'Nenhum (tirar chapéu)',
        emptyInventory: 'Você ainda não achou nenhum chapéu. Explore planetas com `/planet` pra ter chance de encontrar um!',
    },
    'en-US': {
        title: 'Hats',
        equippedLabel: 'Equipped',
        noneEquipped: 'No hat equipped',
        placeholder: 'Equip a hat...',
        noneOption: 'None (remove hat)',
        emptyInventory: "You haven't found any hats yet. Explore planets with `/planet` for a chance to find one!",
    },
};

const getHatText = (lang) => HAT_TEXT[lang] ?? HAT_TEXT['pt-BR'];

const buildHatSectionContent = (interaction) => {
    const lang = getUserLanguage(interaction.user.id);
    const t = getHatText(lang);
    const equippedKey = getEquippedHat(interaction.user.id);
    const owned = getUserHats(interaction.user.id);

    let body;
    if (!owned.length) {
        body = `<:hmm:1536247599365890139> ${t.emptyInventory}`;
    } else if (equippedKey) {
        const hat = getHat(equippedKey);
        const emoji = hat ? getRarityEmoji(hat.rarity) : '';
        body = `${emoji} **${t.equippedLabel}:** ${getHatName(equippedKey, lang)}`;
    } else {
        body = `<:hmm:1536247599365890139> ${t.noneEquipped}`;
    }

    return `\n## <:king:1536459814475927653> ${t.title}\n\n${body}\n`;
};

const buildHatEquipMenu = (interaction) => {
    const lang = getUserLanguage(interaction.user.id);
    const t = getHatText(lang);
    const owned = getUserHats(interaction.user.id);
    if (!owned.length) return null;

    const equippedKey = getEquippedHat(interaction.user.id);

    const options = [
        {
            label: t.noneOption,
            value: HAT_NONE_VALUE,
            emoji: { name: '❌' },
            default: !equippedKey,
        },
        ...owned.slice(0, 24).map((o) => {
            const hat = getHat(o.hatKey);
            return {
                label: `${getHatName(o.hatKey, lang)} (x${o.quantity})`,
                value: o.hatKey,
                emoji: hat ? parseCustomEmoji(getRarityEmoji(hat.rarity)) : undefined,
                default: equippedKey === o.hatKey,
            };
        }),
    ];

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('alien_hat_equip')
            .setPlaceholder(t.placeholder)
            .addOptions(options)
    );
};

const buildSectionWithThumbnail = (textDisplay, fileName, composedBuffer = null) => {
    const files = [];

    if (composedBuffer) {
        const thumb = new ThumbnailBuilder().setURL(`attachment://${COMPOSED_ATTACHMENT_NAME}`);
        files.push(buildBufferAttachment(composedBuffer));
        return {
            section: new SectionBuilder()
                .addTextDisplayComponents(textDisplay)
                .setThumbnailAccessory(thumb),
            files,
        };
    }

    if (fileName && imageExists(fileName)) {
        const thumb = new ThumbnailBuilder().setURL(`attachment://${fileName}`);
        files.push(buildAttachment(fileName));
        return {
            section: new SectionBuilder()
                .addTextDisplayComponents(textDisplay)
                .setThumbnailAccessory(thumb),
            files,
        };
    }
    return {
        section: null,
        textDisplay,
        files,
    };
};

const addTextWithOptionalThumbnail = (container, textDisplay, fileName, composedBuffer = null) => {
    const { section, textDisplay: fallback, files } = buildSectionWithThumbnail(textDisplay, fileName, composedBuffer);
    if (section) {
        container.addSectionComponents(section);
    } else {
        container.addTextDisplayComponents(fallback);
    }
    return files;
};

const buildOnboarding = (interaction) => {
    const title = tFor(interaction, 'commands.alien.onboardingTitle');
    const intro = tFor(interaction, 'commands.alien.onboardingIntro');

    const header = new TextDisplayBuilder().setContent(
        `# <:alien:1536247533502734376> ${title}\n\n${intro}`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(header);
    const files = [];

    if (imageExists(ALIEN_ALL_FILE)) {
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://${ALIEN_ALL_FILE}`)
            )
        );
        files.push(buildAttachment(ALIEN_ALL_FILE));
    }

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(buildColorMenu(interaction));

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container],
        files,
    };
};

const buildAlienPanel = (interaction, alien, { saved = false } = {}) => {
    const lang = getUserLanguage(interaction.user.id);
    const colorLabel = getColorLabel(alien.color, lang);
    const displayName = alien.name ?? tFor(interaction, 'commands.alien.defaultName');

    const title = tFor(interaction, 'commands.alien.panelTitle');
    const nameLine = `**${tFor(interaction, 'commands.alien.nameLabel')}:** \`${displayName}\``;
    const colorLine = `**${tFor(interaction, 'commands.alien.colorLabel')}:** ${COLOR_EMOJI_TEXT[alien.color]} ${colorLabel}`;

    const header = new TextDisplayBuilder().setContent(`
# <:alien:1536247533502734376> ${title}

<:passionate:1536247742110634034> ${tFor(interaction, 'commands.alien.panelGreeting', { name: displayName })}
`);

    const infoTxt = new TextDisplayBuilder().setContent(`
## <:registry:1536459835921530890> ${tFor(interaction, 'commands.alien.infoTitle')}

${nameLine}
${colorLine}
`);

    const { unlockedAchievements } = resolveActiveCraft(interaction.user.id);
    const usage = getPlanetUsageState(interaction.user.id);
    const ship = getUserShip(interaction.user.id);
    const hangarTxt = new TextDisplayBuilder().setContent(
        buildHangarContent(interaction.user.id, usage, ship)
    );

    const equippedHatKey = getEquippedHat(interaction.user.id);
    const equippedHat = equippedHatKey ? getHat(equippedHatKey) : null;
    const alienFile = getAlienFile(alien.color);
    const composedBuffer = (alienFile && equippedHat)
        ? composeAlienWithHat(alienFile, equippedHat.file)
        : null;

    const hatTxt = new TextDisplayBuilder().setContent(buildHatSectionContent(interaction));
    const hatMenu = buildHatEquipMenu(interaction);

    const container = new ContainerBuilder();

    if (saved) {
        const savedMsg = `<:excited:1536247579061256252> **${tFor(interaction, 'commands.alien.savedLabel')}**`;
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(savedMsg))
            .addSeparatorComponents(new SeparatorBuilder());
    }

    container
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder());

    const files = addTextWithOptionalThumbnail(container, infoTxt, alienFile, composedBuffer);

    container.addActionRowComponents(buildRenameButton(interaction));

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(hatTxt);

    if (hatMenu) {
        container.addActionRowComponents(hatMenu);
    }

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(hangarTxt);

    return {
        flags: MessageFlags.IsComponentsV2,
        content: '',
        components: [container],
        files,
        __alienUnlockedAchievements: unlockedAchievements ?? [],
    };
};

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('alien')
        .setNameLocalizations({ 'pt-BR': 'alien' })
        .setDescription('Manage your intergalactic alien buddy')
        .setDescriptionLocalizations({
            'pt-BR': 'Gerencie seu amiguinho alienígena intergaláctico',
        }),

    async execute(interaction) {
        const alien = getUserAlien(interaction.user.id);

        if (!alien) {
            await interaction.editReply(buildOnboarding(interaction));
            return;
        }

        const panel = buildAlienPanel(interaction, alien);
        await interaction.editReply(panel);
        await notifyAchievementsFollowUp(interaction, panel.__alienUnlockedAchievements);
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId === 'alien_hat_equip') {
            const value = interaction.values[0];
            const hatKey = value === HAT_NONE_VALUE ? null : value;

            const result = setEquippedHat(interaction.user.id, hatKey);
            if (!result.success) {
                await interaction.reply({
                    content: `<:error:1536247565006143528> ${tFor(interaction, 'commands.alien.invalidColor')}`,
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }

            const alien = getUserAlien(interaction.user.id);
            const panel = buildAlienPanel(interaction, alien, { saved: true });
            await interaction.update(panel);
            await notifyAchievementsFollowUp(interaction, panel.__alienUnlockedAchievements);
            return true;
        }

        if (interaction.customId !== 'alien_color_pick') return false;

        const color = interaction.values[0];
        if (!ALIEN_COLORS.some((c) => c.key === color)) {
            await interaction.reply({
                content: `<:error:1536247565006143528> ${tFor(interaction, 'commands.alien.invalidColor')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        setUserAlien(interaction.user.id, { color });
        const alien = getUserAlien(interaction.user.id);
        const panel = buildAlienPanel(interaction, alien, { saved: true });

        await interaction.update(panel);
        await notifyAchievementsFollowUp(interaction, panel.__alienUnlockedAchievements);
        return true;
    },

    async handleButton(interaction) {
        if (interaction.customId !== 'alien_name_change') return false;

        const alien = getUserAlien(interaction.user.id);
        if (!alien) {
            await interaction.reply({
                content: `<:error:1536247565006143528> ${tFor(interaction, 'commands.alien.noAlienButton')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        await interaction.showModal(buildRenameModal(interaction));
        return true;
    },

    async handleModalSubmit(interaction) {
        if (interaction.customId !== 'alien_name_modal') return false;

        const rawName = interaction.fields.getTextInputValue('alien_name_input');
        const trimmed = rawName.trim().slice(0, ALIEN_NAME_MAX);

        if (!trimmed) {
            await interaction.reply({
                content: `<:error:1536247565006143528> ${tFor(interaction, 'commands.alien.invalidName')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        setUserAlien(interaction.user.id, { name: trimmed });
        const alien = getUserAlien(interaction.user.id);
        const panel = buildAlienPanel(interaction, alien, { saved: true });
        await interaction.update(panel);
        await notifyAchievementsFollowUp(interaction, panel.__alienUnlockedAchievements);
        return true;
    },
};
