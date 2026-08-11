const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const { t, SUPPORTED_LANGS } = require('../../utils/i18n');
const { setUserLanguage, getUserLanguage } = require('../../utils/db');

const FLAG = {
    'pt-BR': '🇧🇷',
    'en-US': '🇺🇸',
};

const NAME = {
    'pt-BR': { 'pt-BR': 'Português (Brasil)', 'en-US': 'Portuguese (Brazil)' },
    'en-US': { 'pt-BR': 'Inglês (EUA)', 'en-US': 'English (USA)' },
};

const DESC = {
    'pt-BR': { 'pt-BR': 'Respostas do bot em português', 'en-US': 'Bot responses in Portuguese' },
    'en-US': { 'pt-BR': 'Respostas do bot em inglês', 'en-US': 'Bot responses in English' },
};

const buildLanguageMenu = (userId) => {
    const currentLang = getUserLanguage(userId);
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('config_user_language')
            .setPlaceholder(t(userId, 'commands.config.languagePlaceholder'))
            .addOptions(
                SUPPORTED_LANGS.map((code) => ({
                    label: NAME[code][currentLang],
                    description: DESC[code][currentLang],
                    value: code,
                    emoji: FLAG[code],
                    default: code === currentLang,
                }))
            )
    );
    return [row];
};

const buildHeader = (userId) => {
    return new TextDisplayBuilder().setContent(`
# <:settings:1536248422686920704> ${t(userId, 'commands.config.panelUserTitle')}

<:alien:1536247533502734376> ${t(userId, 'commands.config.panelUserIntro')}
`);
};

const buildLanguageSection = (userId) => {
    const lang = getUserLanguage(userId);

    return new TextDisplayBuilder().setContent(`
## ${t(userId, 'commands.config.languageLabel')}

${t(userId, 'commands.config.languageDesc')}

**${t(userId, 'commands.config.currentValue')}** ${FLAG[lang]} ${NAME[lang][lang]}
`);
};

const buildFooter = (userId) => {
    return new TextDisplayBuilder().setContent(`
<:sunglasses:1536248455519801386> ${t(userId, 'commands.config.panelUserFooter')}
`);
};

const buildSuccessToast = (userId) => {
    return new TextDisplayBuilder().setContent(
        `<:excited:1536247579061256252> **${t(userId, 'commands.config.languageSaved')}**
`);
};

const painelUsuario = (userId) => {
    const header = buildHeader(userId);
    const separator1 = new SeparatorBuilder();
    const languageBlock = buildLanguageSection(userId);
    const separator2 = new SeparatorBuilder();
    const footer = buildFooter(userId);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(languageBlock)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(footer);

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container, ...buildLanguageMenu(userId)],
    };
};

const painelUsuarioAtualizado = (userId) => {
    const toast = buildSuccessToast(userId);
    const header = buildHeader(userId);
    const separator1 = new SeparatorBuilder();
    const languageBlock = buildLanguageSection(userId);
    const separator2 = new SeparatorBuilder();
    const footer = buildFooter(userId);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(toast)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(languageBlock)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(footer);

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container, ...buildLanguageMenu(userId)],
    };
};

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('config')
        .setNameLocalizations({
            'en-US': 'config',
        })
        .setDescription('Configure suas preferências no bot')
        .setDescriptionLocalizations({
            'en-US': 'Configure your preferences in the bot',
        })
        .addSubcommand((sub) =>
            sub
                .setName('user')
                .setNameLocalizations({ 'en-US': 'user' })
                .setDescription('Altere suas configurações pessoais')
                .setDescriptionLocalizations({
                    'en-US': 'Change your personal settings',
                })
        )
        .addSubcommand((sub) =>
            sub
                .setName('server')
                .setNameLocalizations({ 'en-US': 'server' })
                .setDescription('Altere configurações do servidor')
                .setDescriptionLocalizations({
                    'en-US': 'Change server settings',
                })
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'server') {
            await interaction.reply({
                content: `<:question:1536248373240270888> **${t(interaction.user.id, 'commands.config.serverComingSoon')}**`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.reply(painelUsuario(interaction.user.id));
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'config_user_language') return false;

        const code = interaction.values[0];
        if (!SUPPORTED_LANGS.includes(code)) {
            await interaction.reply({
                content: `<:error:1536247536191111248> ${t(interaction.user.id, 'commands.config.invalidLanguage')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        setUserLanguage(interaction.user.id, code);

        await interaction.update(painelUsuarioAtualizado(interaction.user.id));

        return true;
    },
};
