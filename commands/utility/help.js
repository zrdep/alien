const path = require('path');
const fs = require('fs');
const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const { tFor, getText } = require('../../utils/i18n');
const { getUserLanguage } = require('../../utils/db');

const GIFT_IMAGE_NAME = 'bag_coins.png';
const GIFT_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', GIFT_IMAGE_NAME);

const CATEGORIES = {
    galaxy: {
        emoji: '<:ovni:1536247726889762847>',
        commands: [
            ['alien', '</alien:1537544781020799120>'],
            ['planet', '</planet:1537544781020799123>'],
            ['inventory', '</inventory:1537544781020799122>'],
            ['craft', '</craft:1537544781020799121>'],
        ],
    },
    economy: {
        emoji: '<:gold_coins:1536941656178298992>',
        commands: [
            ['daily', '</daily:1537544781020799118>'],
            ['redeem', '</redeem:1538333297430765702>'],
            ['wallet', '</wallet:1537544781020799119>'],
            ['market', '</market:1538040562978922517>'],
            ['hatmarket', '</hatmarket:1538040562978922516>'],
        ],
    },
    utility: {
        emoji: '<:settings:1536248422686920704>',
        commands: [
            ['profile', '</profile:1537544781117263992>'],
            ['achievements', '</achievements:1538040562978922518>'],
            ['config', '</config user:1537544781020799125> / </config server:1537544781020799125>'],
            ['tutorial', '</tutorial:1538040562978922520>'],
            ['ranking', '</ranking:1538201380437626920>'],
            ['botinfo', '</botinfo:1537544781020799124>'],
            ['ping', '</ping:1537544781020799126>'],
            ['help', '</help:1538040562978922519>'],
        ],
    },
};

const TOTAL_COMMANDS = Object.values(CATEGORIES).reduce((total, cat) => total + cat.commands.length, 0);

function renderHelpContainer(interaction, activeCategory = 'galaxy') {
    const lang = getUserLanguage(interaction.user.id);
    const tx = (key, vars) => getText(lang, `commands.help.${key}`, vars);
    const categoryKey = CATEGORIES[activeCategory] ? activeCategory : 'galaxy';
    const category = CATEGORIES[categoryKey];

    const header = new TextDisplayBuilder().setContent(
        `# <:book:1536247508181848134> ${tx('title')}\n` +
        `<:ovni:1536247726889762847> *${tx('countLine', { count: TOTAL_COMMANDS })}*`
    );

    const commandsText = category.commands
        .map(([key, mention]) => `• **${mention}**\n└ ${tx(`commandDesc.${key}`)}`)
        .join('\n\n');

    const bodyText = new TextDisplayBuilder().setContent(
        `## ${category.emoji} ${tx(`categories.${categoryKey}.title`)}\n` +
        `*${tx(`categories.${categoryKey}.desc`)}*\n\n` +
        `${commandsText}\n\n` +
        `<:excited:1536247579061256252> **${tx('tipLabel')}** ${tx('tipText')}\n` +
        `<:support:1536248470611173466> ${tx('supportText')}`
    );

    const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
    const section = new SectionBuilder().addTextDisplayComponents(bodyText);
    if (hasImage) {
        section.setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`));
    }

    const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder(tx('selectPlaceholder'))
            .addOptions(Object.entries(CATEGORIES).map(([key, cat]) => ({
                label: tx(`categories.${key}.title`),
                description: tx(`categories.${key}.option`, { count: cat.commands.length }),
                value: key,
                emoji: cat.emoji,
                default: categoryKey === key,
            })))
    );

    const tutorialButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_open_tutorial')
            .setLabel(tx('tutorialButton'))
            .setEmoji('<:book2:1536459861527756952>')
            .setStyle(ButtonStyle.Success)
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const files = hasImage ? [{ attachment: GIFT_IMAGE_PATH, name: GIFT_IMAGE_NAME }] : [];

    return {
        components: [container, selectRow, tutorialButtonRow],
        files,
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('help')
        .setNameLocalizations({ 'pt-BR': 'ajuda' })
        .setDescription('Shows all available commands separated by categories')
        .setDescriptionLocalizations({
            'pt-BR': 'Mostra todos os comandos disponíveis separados por categorias',
        }),

    async execute(interaction) {
        const payload = renderHelpContainer(interaction, 'galaxy');
        await interaction.editReply(payload);
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'help_select_category') return false;

        const selectedCategory = interaction.values[0];
        const payload = renderHelpContainer(interaction, selectedCategory);
        await interaction.update(payload);
        return true;
    },

    async handleButton(interaction) {
        if (interaction.customId !== 'help_open_tutorial') return false;

        const tutorialCommand = interaction.client.commands.get('tutorial');
        if (tutorialCommand && typeof tutorialCommand.renderTutorialContainer === 'function') {
            const payload = tutorialCommand.renderTutorialContainer(interaction, 1);
            await interaction.update(payload);
        } else {
            await interaction.reply({
                content: tFor(interaction, 'commands.help.tutorialFallback'),
                flags: MessageFlags.Ephemeral,
            });
        }
        return true;
    },

    renderHelpContainer,
};