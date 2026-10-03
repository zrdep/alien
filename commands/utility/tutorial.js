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
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');

const { getUserLanguage } = require('../../utils/db');
const { tFor, getText } = require('../../utils/i18n');

const GIFT_IMAGE_NAME = 'bag_coins.png';
const GIFT_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', GIFT_IMAGE_NAME);

// Mapeia o nome plano do comando (usado no select menu) pra menção clicável (usada no corpo do passo).
const COMMAND_MENTIONS = {
    '/alien': '</alien:1537544781020799120>',
    '/planet': '</planet:1537544781020799123>',
    '/daily': '</daily:1537544781020799118>',
    '/craft': '</craft:1537544781020799121>',
    '/market': '</market:1538040562978922517>',
    '/profile': '</profile:1537544781117263992>',
    '/achievements': '</achievements:1538040562978922518>',
};

const STEPS = [
    { cmd: '/alien', icon: '<:ovni:1536247726889762847>' },
    { cmd: '/planet', icon: '<:saturn:1536459943480270959>' },
    { cmd: '/daily', icon: '<:excited:1536247579061256252>' },
    { cmd: '/craft', icon: '<:config:1536247533502734376>' },
    { cmd: '/market', icon: '<:gold_coins:1536941656178298992>' },
    { cmd: '/profile', icon: '<:registry:1536459835921530890>' },
    { cmd: '/achievements', icon: '<:legendary:1536459814475927653>' },
];

function getStepContent(lang, stepNum) {
    const step = STEPS[stepNum - 1] ? stepNum : 1;
    const title = getText(lang, `commands.tutorial.steps.${step}.title`);
    return {
        ...STEPS[step - 1],
        title: getText(lang, 'commands.tutorial.stepTitle', { step, title }),
        desc: getText(lang, `commands.tutorial.steps.${step}.desc`),
    };
}

const TOTAL_STEPS = STEPS.length;

function renderProgressDots(currentStep) {
    return Array.from({ length: TOTAL_STEPS }, (_, i) => (i + 1 === currentStep ? '●' : '○')).join(' ');
}

function renderTutorialContainer(interaction, stepNum = 1) {
    const lang = getUserLanguage(interaction.user.id);
    const tx = (key, vars) => getText(lang, `commands.tutorial.${key}`, vars);
    const currentStep = Math.min(Math.max(1, stepNum), TOTAL_STEPS);
    const isLastStep = currentStep === TOTAL_STEPS;
    const data = getStepContent(lang, currentStep);

    const header = new TextDisplayBuilder().setContent(
        `# <:book2:1536459861527756952> ${tx('header')}\n` +
        `<:ovni:1536247726889762847> *${tx('stepOf', { step: currentStep, total: TOTAL_STEPS })}*\n` +
        renderProgressDots(currentStep)
    );

    const footerTip = isLastStep
        ? `<:sunglasses:1536248455519801386> *${tx('finishedTip')}*`
        : `<:excited:1536247579061256252> *${tx('navTip')}*`;

    const bodyText = new TextDisplayBuilder().setContent(
        `## ${data.icon} ${data.title}\n` +
        `**${tx('mainCommand')}** ${COMMAND_MENTIONS[data.cmd] ?? data.cmd}\n\n` +
        `${data.desc}\n\n` +
        footerTip
    );

    const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
    let section;
    if (hasImage) {
        const thumbnail = new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`);
        section = new SectionBuilder().addTextDisplayComponents(bodyText).setThumbnailAccessory(thumbnail);
    } else {
        section = new SectionBuilder().addTextDisplayComponents(bodyText);
    }

    const jumpRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('tutorial_select_step')
            .setPlaceholder(tx('jumpPlaceholder'))
            .addOptions(
                Array.from({ length: TOTAL_STEPS }, (_, i) => {
                    const step = i + 1;
                    const stepData = getStepContent(lang, step);
                    return {
                        label: stepData.title,
                        description: stepData.cmd,
                        value: String(step),
                        emoji: stepData.icon,
                        default: step === currentStep,
                    };
                })
            )
    );

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tutorial_step_${currentStep - 1}`)
            .setLabel(tx('previous'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentStep <= 1),
        new ButtonBuilder()
            .setCustomId(`tutorial_step_${currentStep + 1}`)
            .setLabel(isLastStep ? tx('done') : tx('next'))
            .setEmoji(isLastStep ? '<:online:1536247711169249391>' : '<:ovni:1536247726889762847>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(isLastStep),
        new ButtonBuilder()
            .setCustomId('tutorial_open_help')
            .setLabel(tx('helpButton'))
            .setEmoji('<:book:1536247508181848134>')
            .setStyle(ButtonStyle.Success)
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const files = hasImage ? [{ attachment: GIFT_IMAGE_PATH, name: GIFT_IMAGE_NAME }] : [];

    return {
        components: [container, jumpRow, navRow],
        files,
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('tutorial')
        .setNameLocalizations({ 'pt-BR': 'tutorial' })
        .setDescription('Interactive step-by-step tutorial guide for new space explorers')
        .setDescriptionLocalizations({
            'pt-BR': 'Guia interativo passo a passo para novos exploradores espaciais',
        }),

    async execute(interaction) {
        const payload = renderTutorialContainer(interaction, 1);
        await interaction.editReply(payload);
    },

    async handleButton(interaction) {
        if (interaction.customId === 'tutorial_open_help') {
            const helpCommand = interaction.client.commands.get('help');
            if (helpCommand && typeof helpCommand.renderHelpContainer === 'function') {
                const payload = helpCommand.renderHelpContainer(interaction, 'galaxy');
                await interaction.update(payload);
            } else {
                await interaction.reply({
                    content: tFor(interaction, 'commands.tutorial.helpFallback'),
                    flags: MessageFlags.Ephemeral,
                });
            }
            return true;
        }

        if (interaction.customId.startsWith('tutorial_step_')) {
            const stepNum = parseInt(interaction.customId.replace('tutorial_step_', ''), 10);
            const payload = renderTutorialContainer(interaction, stepNum);
            await interaction.update(payload);
            return true;
        }

        return false;
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'tutorial_select_step') return false;

        const stepNum = parseInt(interaction.values[0], 10);
        const payload = renderTutorialContainer(interaction, stepNum);
        await interaction.update(payload);
        return true;
    },

    renderTutorialContainer,
};
