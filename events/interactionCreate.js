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
const { hasAcceptedTerms, acceptTerms } = require('../utils/db');

const c = picocolors;

const termosBotoes = () => {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('terms_view')
            .setLabel('Ver termos')
            .setEmoji('<:book:1536247508181848134>')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('terms_accept')
            .setLabel('Aceitar')
            .setEmoji('<:excited:1536247579061256252>')
            .setStyle(ButtonStyle.Success)
    );
    return [row];
};

const termosMensagem = () => ({
    content:
`<:support:1536248470611173466> **| Ei, humano!**

Antes de usar o **∩lien**, você precisa aceitar nossos
**Termos de Uso** e **Política de Privacidade**.

Ao continuar, você concorda com os termos do bot.`,
    components: termosBotoes(),
    flags: MessageFlags.Ephemeral,
});

const termosConteudoCompleto = () => {
    const embed = new EmbedBuilder()
        .setColor(0x7e22ce)
        .setTitle('<:book:1536247508181848134> Termos de Uso ∩lien')
        .setDescription(
`> **1. Uso Responsável**
> Use este bot de forma respeitosa. Não abuse dos comandos.

> **2. Dados Coletados**
> Armazenamos apenas seu ID de usuário para salvar suas preferências,
> progresso e configurações dentro do bot.

> **3. Privacidade**
> Não compartilhamos nenhum dado com terceiros.
> Tudo fica armazenado localmente no banco do bot.`
        )

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('terms_accept')
            .setLabel('Aceitar e continuar')
            .setEmoji('<:excited:1536247579061256252>')
            .setStyle(ButtonStyle.Success)
    );

    return {
        embeds: [embed],
        components: [row],
        flags: MessageFlags.Ephemeral,
    };
};

const termosJaAceito = () => ({
    content: '<:excited:1536247579061256252> **Termos aceitos!** Agora você já pode usar todos os comandos do ∩lien.',
    components: [],
    embeds: [],
    flags: MessageFlags.Ephemeral,
});

const termosViewJaAceito = () => ({
    content: '<:book:1536247508181848134> Você já aceitou os termos! Pode usar todos os comandos.',
    components: [],
    embeds: [],
    flags: MessageFlags.Ephemeral,
});

const GLOBAL_COOLDOWN_MS = 5_000;
const globalCooldowns = new Map();

const mensagemCooldown = (segundos) => ({
    content: `<:hmm:1536247599365890139> **Calma aí, humano!**
Você só pode usar outro comando daqui a \`${segundos}s\`.`,
    flags: MessageFlags.Ephemeral,
});

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isButton()) {
            if (interaction.customId === 'terms_accept') {
                if (hasAcceptedTerms(interaction.user.id)) {
                    await interaction.update(termosViewJaAceito());
                    return;
                }
                acceptTerms(interaction.user.id);
                logger.success(`${interaction.user.tag} aceitou os termos de uso`);
                await interaction.update(termosJaAceito());
                return;
            }

            if (interaction.customId === 'terms_view') {
                await interaction.update(termosConteudoCompleto());
                return;
            }
        }

        if (!interaction.isChatInputCommand()) return;

        if (!hasAcceptedTerms(interaction.user.id)) {
            await interaction.reply(termosMensagem());
            logger.warn(`${interaction.user.tag} tentou /${interaction.commandName} mas não aceitou os termos`);
            return;
        }

        const agora = Date.now();
        const ultimoUso = globalCooldowns.get(interaction.user.id) ?? 0;
        const tempoRestante = ultimoUso + GLOBAL_COOLDOWN_MS - agora;

        if (tempoRestante > 0) {
            const segundos = Math.ceil(tempoRestante / 1000);
            await interaction.reply(mensagemCooldown(segundos));
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

            if (interaction.replied || interaction.deferred) {
                logger.warn('Interação já foi respondida, pulando resposta de erro.');
                return;
            }

            try {
                await interaction.reply({
                    content: '<:dnd:1536247547193204766> Ocorreu um erro ao executar este comando! Contate o suporte.',
                    flags: MessageFlags.Ephemeral,
                });
            } catch (replyError) {
                logger.error('Falha ao responder a interação com erro: ' + replyError.message);
            }
        }
    },
};
