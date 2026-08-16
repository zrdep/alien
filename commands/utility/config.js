const {
    SlashCommandBuilder,
    MessageFlags,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { t, SUPPORTED_LANGS } = require('../../utils/i18n');
const {
    setUserLanguage,
    getUserLanguage,
    getUserMissionNotifyPref,
    setUserMissionNotifyPref,
    getGuildSettings,
    setGuildAllowedChannel,
    clearGuildAllowedChannel,
} = require('../../utils/db');
const { hasManageGuild } = require('../../utils/guildGuard');

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

const MISSION_NOTIFY_OPTIONS = [
    { value: 'off', emoji: '<:idle:1536247613681176616>', labelKey: 'commands.config.missionNotifyOptionOffLabel', descKey: 'commands.config.missionNotifyOptionOffDesc' },
    { value: 'dm', emoji: '<:ovni:1536247726889762847>', labelKey: 'commands.config.missionNotifyOptionDmLabel', descKey: 'commands.config.missionNotifyOptionDmDesc' },
    { value: 'channel', emoji: '<:earth:1536459925495087226>', labelKey: 'commands.config.missionNotifyOptionChannelLabel', descKey: 'commands.config.missionNotifyOptionChannelDesc' },
];

const buildMissionNotifyMenu = (userId) => {
    const current = getUserMissionNotifyPref(userId);
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('config_user_mission_notify')
            .setPlaceholder(t(userId, 'commands.config.missionNotifyPlaceholder'))
            .addOptions(
                MISSION_NOTIFY_OPTIONS.map((opt) => ({
                    label: t(userId, opt.labelKey),
                    description: t(userId, opt.descKey),
                    value: opt.value,
                    emoji: opt.emoji,
                    default: opt.value === current,
                }))
            )
    );
    return row;
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

const buildMissionNotifySection = (userId) => {
    const pref = getUserMissionNotifyPref(userId);
    const prefLabelKey = MISSION_NOTIFY_OPTIONS.find((o) => o.value === pref)?.labelKey
        ?? 'commands.config.missionNotifyOptionOffLabel';
    const prefEmoji = MISSION_NOTIFY_OPTIONS.find((o) => o.value === pref)?.emoji ?? '';

    return new TextDisplayBuilder().setContent(`
## ${t(userId, 'commands.config.missionNotifyLabel')}

${t(userId, 'commands.config.missionNotifyDesc')}

**${t(userId, 'commands.config.currentValue')}** ${prefEmoji} ${t(userId, prefLabelKey)}
`);
};

const buildFooter = (userId) => {
    return new TextDisplayBuilder().setContent(`
<:sunglasses:1536248455519801386> ${t(userId, 'commands.config.panelUserFooter')}
`);
};

const buildSuccessToast = (userId, messageKey = 'commands.config.languageSaved') => {
    return new TextDisplayBuilder().setContent(
        `<:excited:1536247579061256252> **${t(userId, messageKey)}**
`);
};

const buildServerChannelValue = (userId, guildId) => {
    const settings = getGuildSettings(guildId);
    if (!settings.allowedChannelId) {
        return t(userId, 'commands.config.serverChannelAll');
    }
    return `<#${settings.allowedChannelId}>`;
};

const buildServerPanel = (userId, guildId, { saved = false, savedMessage = null } = {}) => {
    const container = new ContainerBuilder();

    if (saved && savedMessage) {
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(savedMessage))
            .addSeparatorComponents(new SeparatorBuilder());
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`
# <:settings:1536248422686920704> ${t(userId, 'commands.config.panelServerTitle')}

<:registry:1536459835921530890> ${t(userId, 'commands.config.panelServerIntro')}
`));

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`
## <:earth:1536459925495087226> ${t(userId, 'commands.config.serverChannelLabel')}

${t(userId, 'commands.config.serverChannelDesc')}

**${t(userId, 'commands.config.currentValue')}** ${buildServerChannelValue(userId, guildId)}
`));

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('config_server_channel')
                .setPlaceholder(t(userId, 'commands.config.serverChannelPlaceholder'))
                .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setMaxValues(1)
                .setMinValues(1)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('config_server_clear')
                .setLabel(t(userId, 'commands.config.serverChannelClear'))
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:restart:1536248409634246719>')
        )
    );

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container],
    };
};

const painelUsuario = (userId) => {
    const header = buildHeader(userId);
    const languageBlock = buildLanguageSection(userId);
    const missionNotifyBlock = buildMissionNotifySection(userId);
    const footer = buildFooter(userId);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(languageBlock)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(missionNotifyBlock)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footer);

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container, ...buildLanguageMenu(userId), buildMissionNotifyMenu(userId)],
    };
};

const painelUsuarioAtualizado = (userId, messageKey) => {
    const toast = buildSuccessToast(userId, messageKey);
    const header = buildHeader(userId);
    const languageBlock = buildLanguageSection(userId);
    const missionNotifyBlock = buildMissionNotifySection(userId);
    const footer = buildFooter(userId);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(toast)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(languageBlock)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(missionNotifyBlock)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footer);

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container, ...buildLanguageMenu(userId), buildMissionNotifyMenu(userId)],
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
            if (!interaction.inGuild()) {
                await interaction.editReply({
                    content: `<:error:1536247565006143528> ${t(interaction.user.id, 'commands.config.serverGuildOnly')}`,
                });
                return;
            }

            if (!hasManageGuild(interaction)) {
                await interaction.editReply({
                    content: `<:error:1536247565006143528> ${t(interaction.user.id, 'commands.config.serverNoPermission')}`,
                });
                return;
            }

            await interaction.editReply(buildServerPanel(interaction.user.id, interaction.guildId));
            return;
        }

        await interaction.editReply(painelUsuario(interaction.user.id));
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId === 'config_user_mission_notify') {
            const pref = interaction.values[0];
            if (!['off', 'dm', 'channel'].includes(pref)) {
                await interaction.reply({
                    content: `<:error:1536247536191111248> ${t(interaction.user.id, 'commands.config.invalidMissionNotifyPref')}`,
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }

            setUserMissionNotifyPref(interaction.user.id, pref);
            await interaction.update(painelUsuarioAtualizado(interaction.user.id, 'commands.config.missionNotifySaved'));
            return true;
        }

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
        await interaction.update(painelUsuarioAtualizado(interaction.user.id, 'commands.config.languageSaved'));
        return true;
    },

    async handleChannelSelectMenu(interaction) {
        if (interaction.customId !== 'config_server_channel') return false;

        if (!hasManageGuild(interaction)) {
            await interaction.reply({
                content: `<:error:1536247565006143528> ${t(interaction.user.id, 'commands.config.serverNoPermission')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const channelId = interaction.values[0];
        setGuildAllowedChannel(interaction.guildId, channelId);

        const savedMessage = `<:excited:1536247579061256252> **${t(interaction.user.id, 'commands.config.serverChannelSaved', { channel: `<#${channelId}>` })}**`;
        await interaction.update(buildServerPanel(interaction.user.id, interaction.guildId, {
            saved: true,
            savedMessage,
        }));
        return true;
    },

    async handleButton(interaction) {
        if (interaction.customId !== 'config_server_clear') return false;

        if (!hasManageGuild(interaction)) {
            await interaction.reply({
                content: `<:error:1536247565006143528> ${t(interaction.user.id, 'commands.config.serverNoPermission')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        clearGuildAllowedChannel(interaction.guildId);

        const savedMessage = `<:excited:1536247579061256252> **${t(interaction.user.id, 'commands.config.serverChannelCleared')}**`;
        await interaction.update(buildServerPanel(interaction.user.id, interaction.guildId, {
            saved: true,
            savedMessage,
        }));
        return true;
    },
};
