const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    SeparatorBuilder,
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const { version: discordJsVersion } = require('discord.js');

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Mostra informações sobre o ∩lien.'),

    async execute(interaction) {
        const client = interaction.client;
        const tt = (k) => tFor(interaction, k);

        const uptimeMs = client.uptime;

        const dias = Math.floor(uptimeMs / 86_400_000);
        const horas = Math.floor((uptimeMs % 86_400_000) / 3_600_000);
        const minutos = Math.floor((uptimeMs % 3_600_000) / 60_000);
        const segundos = Math.floor((uptimeMs % 60_000) / 1000);

        const uptime =
            (dias ? `${dias}d ` : '') +
            (horas ? `${horas}h ` : '') +
            (minutos ? `${minutos}m ` : '') +
            `${segundos}s`;

        const servidores = client.guilds.cache.size;
        const usuarios = client.guilds.cache.reduce(
            (total, guild) => total + (guild.memberCount ?? 0),
            0
        );
        const comandos = client.commands?.size ?? 0;
        const pingWs = client.ws.ping;
        const nodeVersion = process.version;
        const locale = interaction.user.id;

        const botAvatar = client.user.displayAvatarURL({
            extension: 'png',
            size: 4096,
        });

        const introTitle = tt('commands.botinfo.title');
        const serversLabel = tt('commands.botinfo.servers');
        const usersLabel = tt('commands.botinfo.users');
        const commandsLabel = tt('commands.botinfo.commands');
        const perfTitle = tt('commands.botinfo.performanceTitle');
        const pingLabel = tt('commands.botinfo.pingWs');
        const uptimeLabel = tt('commands.botinfo.uptime');

        const introducao = new TextDisplayBuilder()
            .setContent(`
# <:excited:1536247579061256252> ${introTitle}

<:ovni:1536247726889762847> ∩LIEN — versão \`${require('../../package.json').version}\`
`);

        const informacoes = new TextDisplayBuilder()
            .setContent(`
<:ovni:1536247726889762847> **${serversLabel}:** \`${servidores.toLocaleString('pt-BR')}\`
<:passionate:1536247742110634034> **${usersLabel}:** \`${usuarios.toLocaleString('pt-BR')}\`
<:config:1536247533502734376> **${commandsLabel}:** \`${comandos}\`
`);

        const thumbnail = new ThumbnailBuilder().setURL(botAvatar);

        const sectionInformacoes = new SectionBuilder()
            .addTextDisplayComponents(informacoes)
            .setThumbnailAccessory(thumbnail);

        const desempenho = new TextDisplayBuilder()
            .setContent(`
## ${perfTitle}

<:ping:1536248338108911626> **${pingLabel}:** \`${pingWs}ms\`
<:restart:1536248409634246719> **${uptimeLabel}:** \`${uptime}\`
<:online:1536247711169249391> **Status:** \`Online\`
`);

        const final = new TextDisplayBuilder().setContent(`
<:hmm:1536247599365890139> Agora vou... tenho **planetas pra explorar**.
`);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(introducao)
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(sectionInformacoes)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(desempenho)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(final);

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    },
};
