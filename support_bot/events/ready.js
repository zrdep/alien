const path = require('node:path');
const {
    Events,
    MessageFlags,
    AttachmentBuilder,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const PANEL_CHANNEL = '1537510782932361367';

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`[Support] ${client.user.tag} conectado.`);

        const channel = await client.channels.fetch(PANEL_CHANNEL).catch(() => null);
        if (!channel) return;

        const messages = await channel.messages.fetch({ limit: 50 });

        const exists = messages.some(msg =>
            msg.author.id === client.user.id &&
            msg.components.some(row =>
                row.components.some(c =>
                    c.customId === 'ticket_open_pt' || c.customId === 'ticket_open_en'
                )
            )
        );

        if (exists) return;

        const logo = new AttachmentBuilder(
            path.join(__dirname, '../../images/logo/logo.png'),
            { name: 'logo.png' }
        );

        const container = new ContainerBuilder()

            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '# <:support:1536248470611173466> Support Center'
                        ),
                        new TextDisplayBuilder().setContent(
                            'Escolha seu idioma para abrir um ticket.\nChoose your language to open a ticket.'
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
                    '## 🇧🇷 Português',
                    '',
                    '<:book:1536247508181848134> Explique seu problema.',
                    '<:support:1536248470611173466> Nossa equipe responderá rapidamente.',
                    '<:registry:1536459835921530890> O histórico será salvo ao fechar.'
                ].join('\n'))
            )

            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_open_pt')
                        .setLabel('Abrir Ticket')
                        .setEmoji('1536248470611173466')
                        .setStyle(ButtonStyle.Primary)
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent([
                    '## 🇺🇸 English',
                    '',
                    '<:book:1536247508181848134> Tell us about your issue.',
                    '<:support:1536248470611173466> Our team will reply as soon as possible.',
                    '<:registry:1536459835921530890> A transcript will be saved when the ticket is closed.'
                ].join('\n'))
            )

            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_open_en')
                        .setLabel('Open Ticket')
                        .setEmoji('1536248470611173466')
                        .setStyle(ButtonStyle.Primary)
                )
            );

        await channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            files: [logo]
        });

        console.log('[Support] Painel enviado.');
    }
};