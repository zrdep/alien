const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    SeparatorBuilder,
} = require('discord.js');

const { version: discordJsVersion } = require('discord.js');

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Mostra informações sobre o ∩lien.'),

    async execute(interaction) {
        const client = interaction.client;

        // ─────────────────────────────────────────────
        // UPTIME
        // ─────────────────────────────────────────────

        const uptimeMs = client.uptime;

        const dias = Math.floor(uptimeMs / 86_400_000);

        const horas = Math.floor(
            (uptimeMs % 86_400_000) / 3_600_000
        );

        const minutos = Math.floor(
            (uptimeMs % 3_600_000) / 60_000
        );

        const segundos = Math.floor(
            (uptimeMs % 60_000) / 1000
        );

        const uptime =
            (dias ? `${dias}d ` : '') +
            (horas ? `${horas}h ` : '') +
            (minutos ? `${minutos}m ` : '') +
            `${segundos}s`;

        // ─────────────────────────────────────────────
        // INFORMAÇÕES
        // ─────────────────────────────────────────────

        const servidores = client.guilds.cache.size;

        const usuarios = client.guilds.cache.reduce(
            (total, guild) =>
                total + (guild.memberCount ?? 0),
            0
        );

        const comandos = client.commands?.size ?? 0;

        const pingWs = client.ws.ping;

        const nodeVersion = process.version;

        const botAvatar = client.user.displayAvatarURL({
            extension: 'png',
            size: 4096,
        });

        // ─────────────────────────────────────────────
        // MENSAGEM DE ABERTURA
        // ─────────────────────────────────────────────

        const introducao = new TextDisplayBuilder()
            .setContent(`
# <:excited:1536247579061256252> Olá humano!

<:ovni:1536247726889762847> Você encontrou meu cantinho!

Eu sou só um alienígena **tentando entender os humanos** enquanto faço algumas coisinhas por aqui.

<:passionate:1536247742110634034> Já que você está curioso, aqui estão algumas informações sobre mim:
`);

        // ─────────────────────────────────────────────
        // INFORMAÇÕES DO BOT
        // ─────────────────────────────────────────────

        const informacoes = new TextDisplayBuilder()
            .setContent(`
## Informações do bot

<:ovni:1536247726889762847> **Servidores:** \`${servidores.toLocaleString('pt-BR')}\`
<:passionate:1536247742110634034> **Usuários:** \`${usuarios.toLocaleString('pt-BR')}\`
<:config:1536247533502734376> **Comandos:** \`${comandos}\`
`);

        const thumbnail = new ThumbnailBuilder()
            .setURL(botAvatar);

        const sectionInformacoes = new SectionBuilder()
            .addTextDisplayComponents(informacoes)
            .setThumbnailAccessory(thumbnail);

        // ─────────────────────────────────────────────
        // DESEMPENHO
        // ─────────────────────────────────────────────

        const desempenho = new TextDisplayBuilder()
            .setContent(`
## Desempenho

<:ping:1536248338108911626> **Ping:** \`${pingWs}ms\`
<:restart:1536248409634246719> **Uptime:** \`${uptime}\`
<:online:1536247711169249391> **Status:** \`Online\`
`);

        // ─────────────────────────────────────────────
        // MENSAGEM FINAL
        // ─────────────────────────────────────────────

        const final = new TextDisplayBuilder()
            .setContent(`
Hehe! Era isso que você queria saber sobre mim!
<:hmm:1536247599365890139> Agora vai... tenho **planetas pra explorar**. 

`);

        // ─────────────────────────────────────────────
        // CONTAINER
        // ─────────────────────────────────────────────

        const container = new ContainerBuilder()
            // Mensagem de abertura
            .addTextDisplayComponents(introducao)

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // Informações + avatar
            .addSectionComponents(sectionInformacoes)

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // Desempenho
            .addTextDisplayComponents(desempenho)

            .addSeparatorComponents(
                new SeparatorBuilder()
            )
            
            // Final
            .addTextDisplayComponents(final);

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    },
};