const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');
const { tFor } = require('../../utils/i18n');

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Mostra a latência do bot e da conexão websocket'),

    async execute(interaction) {
        await interaction.editReply({
            content: tFor(interaction, 'commands.ping.calculating'),
        });

        const reply = await interaction.fetchReply();

        const botPing = reply.createdTimestamp - interaction.createdTimestamp;
        const wsPing = interaction.client.ws.ping;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
`# <:ping:1536248338108911626> ${tFor(interaction, 'commands.ping.title')}

**${tFor(interaction, 'commands.ping.botLatency')}:** \`${botPing}ms\`
**${tFor(interaction, 'commands.ping.wsLatency')}:** \`${wsPing}ms\``
                )
            );

        await interaction.editReply({
            content: '',
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });
    }
};
