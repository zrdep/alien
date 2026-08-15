const { ApplicationIntegrationType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getGuildAllowedChannel } = require('./db');
const { tFor } = require('./i18n');

const isUserInstall = (interaction) => {
    const raw = typeof interaction.toJSON === 'function' ? interaction.toJSON() : null;
    const owners = raw?.authorizing_integration_owners;

    if (owners) {
        return owners[ApplicationIntegrationType.UserInstall] != null
            || owners[String(ApplicationIntegrationType.UserInstall)] != null;
    }

    return !interaction.inGuild();
};

const hasManageGuild = (interaction) =>
    interaction.inGuild() && interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

const isConfigUserCommand = (interaction) =>
    interaction.isChatInputCommand?.()
    && interaction.commandName === 'config'
    && interaction.options.getSubcommand(false) === 'user';

const isConfigServerCommand = (interaction) =>
    interaction.isChatInputCommand?.()
    && interaction.commandName === 'config'
    && interaction.options.getSubcommand(false) === 'server';

const isConfigServerComponent = (interaction) =>
    ['config_server_channel', 'config_server_clear'].includes(interaction.customId);

const checkGuildAccess = (interaction) => {
    const isServerConfig = isConfigServerCommand(interaction) || isConfigServerComponent(interaction);

    // /config server só faz sentido dentro de um servidor de verdade — o
    // próprio comando/componentes já verificam isso (interaction.inGuild()
    // + permissão de Gerenciar Servidor) e respondem com a mensagem certa,
    // então aqui só deixamos passar pra ele decidir.
    if (isServerConfig) {
        return { ok: true };
    }

    // Todo o resto do bot (exploração, nave, chapéus, mercado, /config
    // user etc.) funciona normalmente em instalação de usuário — DM, grupo
    // ou qualquer servidor, mesmo sem o bot estar formalmente adicionado
    // ali. A restrição de canal abaixo só faz sentido pra quem instalou o
    // ∩lien oficialmente no servidor.
    if (isUserInstall(interaction)) {
        return { ok: true };
    }

    if (isConfigUserCommand(interaction)) {
        return { ok: true };
    }

    if (!interaction.inGuild()) {
        return { ok: false, messageKey: 'guildGuard.dmNotAllowed' };
    }

    const allowedChannelId = getGuildAllowedChannel(interaction.guildId);
    if (!allowedChannelId || interaction.channelId === allowedChannelId) {
        return { ok: true };
    }

    return {
        ok: false,
        messageKey: 'guildGuard.wrongChannel',
        channelId: allowedChannelId,
    };
};

const replyBlocked = async (interaction, result) => {
    const payload = {
        content: tFor(interaction, result.messageKey, {
            channel: result.channelId ? `<#${result.channelId}>` : '',
        }),
        flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
        return;
    }

    if (interaction.isMessageComponent?.() || interaction.isModalSubmit?.()) {
        await interaction.reply(payload);
        return;
    }

    await interaction.reply(payload);
};

module.exports = {
    checkGuildAccess,
    replyBlocked,
    hasManageGuild,
    isUserInstall,
};
