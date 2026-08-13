const path = require('node:path');
const {
    Events,
    AttachmentBuilder,
    MessageFlags,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
} = require('discord.js');

const GUILD_ID = '1488000497658101923';
const CHANNEL_ID = '1537505542774333540';

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member) {
        if (member.guild.id !== GUILD_ID) return;

        const channel = member.guild.channels.cache.get(CHANNEL_ID);
        if (!channel) return;

        const logo = new AttachmentBuilder(
            path.join(__dirname, '../../images/logo/logo.png'),
            { name: 'logo.png' }
        );

const container = new ContainerBuilder()
    .addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '# <:ovni:1536247726889762847> Bem-vindo • Welcome'
                ),
                new TextDisplayBuilder().setContent(
                    `Olá ${member}! Bem-vindo à nossa comunidade.\nWelcome to our community!`
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL('attachment://logo.png')
            )
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            '## <:registry:1536459835921530890> Comece aqui • Start here',
            '',
            '<:book:1536247508181848134> <#1537510693987942600> Leia as regras • Read the rules',
            '<:support:1536248470611173466> <#1537510782932361367> Precisa de ajuda? Abra um ticket • Need help? Open a ticket',
            '<:gift_coins:1537511597013074030> • Vá até <#1537511176324386917> para coletar seu **Daily**.\n<:gift_coins:1537511597013074030> • Go to <#1537511176324386917> to collect your **Daily**.',
        ].join('\n'))
    );

        await channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            files: [logo],
        });
    },
};