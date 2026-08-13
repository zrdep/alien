const {
    Events,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const logger = require('../utils/logger');
const picocolors = require('picocolors');
const { hasAcceptedTerms, acceptTerms, getUserAlien } = require('../utils/db');
const { tFor } = require('../utils/i18n');
const { blockWrongComponentUser } = require('../utils/componentGuard');
const { checkGuildAccess, replyBlocked } = require('../utils/guildGuard');

const c = picocolors;

const termosBotoes = (langFn) => {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('terms_view')
            .setLabel(langFn('terms.buttons.view'))
            .setEmoji('<:book:1536247508181848134>')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('terms_accept')
            .setLabel(langFn('terms.buttons.accept'))
            .setEmoji('<:excited:1536247579061256252>')
            .setStyle(ButtonStyle.Success)
    );
    return [row];
};

const termosMensagem = (interaction) => {
    const tt = (k) => tFor(interaction, k);
    return {
        content:
`<:support:1536248470611173466> **| ${tt('terms.title')}**

${tt('terms.introBefore')} **∩lien**, ${tt('terms.introAfter')}

${tt('terms.consent')}

${tt('terms.tipConfig')}`,
        components: termosBotoes(tt),
        flags: MessageFlags.Ephemeral,
    };
};

const termosConteudoCompleto = (interaction) => {
    const tt = (k) => tFor(interaction, k);
    const embed = new EmbedBuilder()
        .setColor(0x7e22ce)
        .setTitle(`<:book:1536247508181848134> ${tt('terms.embed.title')}`)
        .setDescription(
`> **1. ${tt('terms.embed.responsible')}**
> ${tt('terms.embed.responsibleText')}

> **2. ${tt('terms.embed.data')}**
> ${tt('terms.embed.dataText')}

> **3. ${tt('terms.embed.privacy')}**
> ${tt('terms.embed.privacyText')}`
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('terms_accept')
            .setLabel(tt('terms.buttons.acceptFull'))
            .setEmoji('<:excited:1536247579061256252>')
            .setStyle(ButtonStyle.Success)
    );

    return {
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
    };
};

const termosJaAceitoButtons = (interaction) => {
    const isPt = tFor(interaction, 'terms.accepted').includes('Termos aceitos');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('terms_open_tutorial')
            .setLabel(isPt ? 'Ver Tutorial (/tutorial)' : 'View Tutorial (/tutorial)')
            .setEmoji('<:book2:1536459861527756952>')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('terms_open_help')
            .setLabel(isPt ? 'Ver Comandos (/help)' : 'View Commands (/help)')
            .setEmoji('<:book:1536247508181848134>')
            .setStyle(ButtonStyle.Primary)
    );
    return [row];
};

const termosJaAceito = (interaction) => ({
    content: `<:excited:1536247579061256252> ${tFor(interaction, 'terms.accepted')}`,
    components: termosJaAceitoButtons(interaction),
    embeds: [],
    flags: MessageFlags.Ephemeral,
});

const termosViewJaAceito = (interaction) => ({
    content: `<:book:1536247508181848134> ${tFor(interaction, 'terms.alreadyAccepted')}`,
    components: termosJaAceitoButtons(interaction),
    embeds: [],
    flags: MessageFlags.Ephemeral,
});

const GLOBAL_COOLDOWN_MS = 5_000;
const globalCooldowns = new Map();

// Sem isso, globalCooldowns cresce para sempre (1 entrada por usuário único
// que já rodou um comando, nunca removida) - com o tempo isso é memória
// desperdiçada à toa. Limpa entradas expiradas periodicamente.
const COOLDOWN_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
    const agora = Date.now();
    for (const [userId, timestamp] of globalCooldowns) {
        if (agora - timestamp > GLOBAL_COOLDOWN_MS) {
            globalCooldowns.delete(userId);
        }
    }
}, COOLDOWN_CLEANUP_INTERVAL_MS).unref();

const getDeferOptions = (interaction) => {
    if (interaction.commandName === 'config' || interaction.commandName === 'painel') {
        return { flags: MessageFlags.Ephemeral };
    }

    if ((interaction.commandName === 'alien' || interaction.commandName === 'craft') && !getUserAlien(interaction.user.id)) {
        return { flags: MessageFlags.Ephemeral };
    }

    return {};
};

const mensagemCooldown = (interaction, segundos) => ({
    content: `<:hmm:1536247599365890139> **${tFor(interaction, 'cooldown.title')}**
${tFor(interaction, 'cooldown.text', { seconds: segundos })}`,
    flags: MessageFlags.Ephemeral,
});

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isStringSelectMenu()) {
            const access = checkGuildAccess(interaction);
            if (!access.ok) {
                await replyBlocked(interaction, access);
                return;
            }

            if (await blockWrongComponentUser(interaction)) return;

            for (const command of interaction.client.commands.values()) {
                if (typeof command.handleSelectMenu === 'function') {
                    const handled = await command.handleSelectMenu(interaction);
                    if (handled !== false) return;
                }
            }
            return;
        }

        if (interaction.isChannelSelectMenu()) {
            const access = checkGuildAccess(interaction);
            if (!access.ok) {
                await replyBlocked(interaction, access);
                return;
            }

            if (await blockWrongComponentUser(interaction)) return;

            for (const command of interaction.client.commands.values()) {
                if (typeof command.handleChannelSelectMenu === 'function') {
                    const handled = await command.handleChannelSelectMenu(interaction);
                    if (handled !== false) return;
                }
            }
            return;
        }

        if (interaction.isButton()) {
            const access = checkGuildAccess(interaction);
            if (!access.ok) {
                await replyBlocked(interaction, access);
                return;
            }

            if (await blockWrongComponentUser(interaction)) return;

            if (interaction.customId === 'terms_accept') {
                if (hasAcceptedTerms(interaction.user.id)) {
                    await interaction.update(termosViewJaAceito(interaction));
                    return;
                }
                acceptTerms(interaction.user.id);
                logger.success(`${interaction.user.tag} aceitou os termos de uso`);
                await interaction.update(termosJaAceito(interaction));
                return;
            }

            if (interaction.customId === 'terms_view') {
                await interaction.update(termosConteudoCompleto(interaction));
                return;
            }

            if (interaction.customId === 'terms_open_tutorial') {
                const tutorialCmd = interaction.client.commands.get('tutorial');
                if (tutorialCmd && typeof tutorialCmd.renderTutorialContainer === 'function') {
                    await interaction.update(tutorialCmd.renderTutorialContainer(interaction, 1));
                }
                return;
            }

            if (interaction.customId === 'terms_open_help') {
                const helpCmd = interaction.client.commands.get('help');
                if (helpCmd && typeof helpCmd.renderHelpContainer === 'function') {
                    await interaction.update(helpCmd.renderHelpContainer(interaction, 'galaxy'));
                }
                return;
            }

            for (const command of interaction.client.commands.values()) {
                if (typeof command.handleButton === 'function') {
                    const handled = await command.handleButton(interaction);
                    if (handled !== false) return;
                }
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            const access = checkGuildAccess(interaction);
            if (!access.ok) {
                await replyBlocked(interaction, access);
                return;
            }

            if (await blockWrongComponentUser(interaction)) return;

            for (const command of interaction.client.commands.values()) {
                if (typeof command.handleModalSubmit === 'function') {
                    const handled = await command.handleModalSubmit(interaction);
                    if (handled !== false) return;
                }
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const access = checkGuildAccess(interaction);
        if (!access.ok) {
            await replyBlocked(interaction, access);
            return;
        }

        const comandoLivre = ['config', 'painel', 'help', 'tutorial'];
        const precisaDeTermos = !comandoLivre.includes(interaction.commandName);

        if (precisaDeTermos && !hasAcceptedTerms(interaction.user.id)) {
            await interaction.reply(termosMensagem(interaction));
            logger.warn(`${interaction.user.tag} tentou /${interaction.commandName} mas não aceitou os termos`);
            return;
        }

        const agora = Date.now();
        const ultimoUso = globalCooldowns.get(interaction.user.id) ?? 0;
        const tempoRestante = ultimoUso + GLOBAL_COOLDOWN_MS - agora;

        if (tempoRestante > 0) {
            const segundos = Math.ceil(tempoRestante / 1000);
            await interaction.reply(mensagemCooldown(interaction, segundos));
            return;
        }

        globalCooldowns.set(interaction.user.id, agora);

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`Comando não encontrado: /${interaction.commandName}`);
            return;
        }

        logger.command(
            interaction.user.tag,
            interaction.commandName,
            interaction.guild?.name ?? null
        );

        try {
            await interaction.deferReply(getDeferOptions(interaction));
        } catch (deferError) {
            logger.warn(`Interação expirada antes do defer: /${interaction.commandName} (${interaction.user.tag})`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.br();
            logger.div();
            logger.error(`Falha ao executar /${interaction.commandName}`);
            logger.error(`Usuário: ${interaction.user.tag} (${interaction.user.id})`);
            if (interaction.guild) {
                logger.error(`Servidor: ${interaction.guild.name} (${interaction.guild.id})`);
            }
            logger.div();
            console.error(c.red(error.stack ?? error.message));
            logger.div();
            logger.br();

            const errorContent = `<:dnd:1536247547193204766> ${tFor(interaction, 'errors.generic')}`;

            try {
                if (interaction.deferred && !interaction.replied) {
                    // A interação já foi deferida (caso comum, já que sempre fazemos deferReply
                    // antes de executar o comando), então precisamos editar a resposta e não
                    // criar uma nova - reply() falharia aqui.
                    await interaction.editReply({
                        content: errorContent,
                        embeds: [],
                        components: [],
                        files: [],
                    });
                } else if (!interaction.replied) {
                    await interaction.reply({
                        content: errorContent,
                        flags: MessageFlags.Ephemeral,
                    });
                } else {
                    logger.warn('Interação já foi respondida, pulando resposta de erro.');
                }
            } catch (replyError) {
                logger.error('Falha ao responder a interação com erro: ' + replyError.message);
            }
        }
    },
};