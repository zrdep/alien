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
const { getUserLanguage, getUserAlien, setUserAlien, getUserShip, getPlanetUsageState, resolveActiveCraft } = require('../../utils/db');
const { buildHangarContent } = require('../../utils/ship');

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

const buildSectionWithThumbnail = (textDisplay, fileName) => {
    const files = [];
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

const addTextWithOptionalThumbnail = (container, textDisplay, fileName) => {
    const { section, textDisplay: fallback, files } = buildSectionWithThumbnail(textDisplay, fileName);
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

    resolveActiveCraft(interaction.user.id);
    const usage = getPlanetUsageState(interaction.user.id);
    const ship = getUserShip(interaction.user.id);
    const hangarTxt = new TextDisplayBuilder().setContent(
        buildHangarContent(interaction.user.id, usage, ship)
    );

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

    const files = addTextWithOptionalThumbnail(container, infoTxt, getAlienFile(alien.color));

    container.addActionRowComponents(buildRenameButton(interaction));

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(hangarTxt);

    return {
        flags: MessageFlags.IsComponentsV2,
        content: '',
        components: [container],
        files,
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

        await interaction.editReply(buildAlienPanel(interaction, alien));
    },

    async handleSelectMenu(interaction) {
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
        await interaction.update(buildAlienPanel(interaction, alien, { saved: true }));
        return true;
    },
};
