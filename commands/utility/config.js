const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const { t, tFor, SUPPORTED_LANGS } = require('../../utils/i18n');
const { setUserLanguage, getUserLanguage } = require('../../utils/db');

const FLAG = {
    'pt-BR': '🇧🇷',
    'en-US': '🇺🇸',
};

const NAME = {
    'pt-BR': { 'pt-BR': 'Português (Brasil)', 'en-US': 'Portuguese (Brazil)' },
    'en-US': { 'pt-BR': 'Inglês (EUA)',        'en-US': 'English (USA)'     },
};

const DESC = {
    'pt-BR': { 'pt-BR': 'Respostas do bot em português', 'en-US': 'Bot responses in Portuguese' },
    'en-US': { 'pt-BR': 'Respostas do bot em inglês',    'en-US': 'Bot responses in English'    },
};

const buildMenu = (currentLang) => {
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('config_user_language')
            .setPlaceholder('Escolha um idioma / Choose a language')
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

const painelUsuario = (userId) => {
    const lang = getUserLanguage(userId);
    const titleKey = 'commands.config.panelUserTitle';
    const introKey = 'commands.config.panelUserIntro';
    const labelKey = 'commands.config.languageLabel';
    const descKey  = 'commands.config.languageDesc';

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
`# <:settings:1536248422686920704> ${t(userId, titleKey)}

${t(userId, introKey)}

## <:config:1536247533502734376> ${t(userId, labelKey)}
${t(userId, descKey)}

**${FLAG[lang]} ${NAME[lang][lang]}**`
            )
        );

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container, ...buildMenu(lang)],
    };
};

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure suas preferências no bot')
        .addSubcommand((sub) =>
            sub
                .setName('user')
                .setDescription('Altere suas configurações pessoais')
        )
        .addSubcommand((sub) =>
            sub
                .setName('server')
                .setDescription('Altere configurações do servidor')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'server') {
            await interaction.reply({
                content: '<:question:1536248373240270888> **Em breve!** As configurações de servidor estarão disponíveis na próxima atualização do ∩lien.',
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
                content: '<:error:1536247536191111248> Idioma inválido.',
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        setUserLanguage(interaction.user.id, code);

        const savedKey = code === 'pt-BR'
            ? 'commands.config.languageSaved'
            : 'commands.config.languageSavedEn';

        const successText = `<:excited:1536247579061256252> ${t(interaction.user.id, savedKey)}`;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
`${successText}

# <:settings:1536248422686920704> ${t(interaction.user.id, 'commands.config.panelUserTitle')}

${t(interaction.user.id, 'commands.config.panelUserIntro')}

## <:config:1536247533502734376> ${t(interaction.user.id, 'commands.config.languageLabel')}
${t(interaction.user.id, 'commands.config.languageDesc')}

**${FLAG[code]} ${NAME[code][code]}**`
                )
            );

        await interaction.update({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            content: '',
            components: [container, ...buildMenu(code)],
        });

        return true;
    },
};
