const {
    Events,
    ChannelType,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const logger = require('../../utils/logger.js');

const CATEGORY = '1488000497658101925';
const MOD_ROLE = '1537520462563774605';
const LOG_CHANNEL = '1537520628637368451';

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        // ABRIR MODAL

        if (
            interaction.isButton() &&
            (interaction.customId === 'ticket_open_pt' ||
             interaction.customId === 'ticket_open_en')
        ) {

            const english = interaction.customId === 'ticket_open_en';

            const modal = new ModalBuilder()
                .setCustomId(english ? 'ticket_modal_en' : 'ticket_modal_pt')
                .setTitle(english ? 'Open Ticket' : 'Abrir Ticket');

            const assunto = new TextInputBuilder()
                .setCustomId('assunto')
                .setLabel(english ? 'What is your issue?' : 'Qual é o assunto?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(30);

            modal.addComponents(
                new ActionRowBuilder().addComponents(assunto)
            );

            return interaction.showModal(modal);
        }

        // CRIAR TICKET

        if (
            interaction.isModalSubmit() &&
            (interaction.customId === 'ticket_modal_pt' ||
             interaction.customId === 'ticket_modal_en')
        ) {

            const english = interaction.customId === 'ticket_modal_en';
            const assunto = interaction.fields.getTextInputValue('assunto');

            const nome = interaction.user.username
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .slice(0, 12);

            const assuntoLimpo = assunto
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .slice(0, 15);

            const random = Math.random().toString(36).slice(2, 8);

            const channel = await interaction.guild.channels.create({
                name: `${nome}-${assuntoLimpo}-${random}`,
                type: ChannelType.GuildText,
                parent: CATEGORY,

                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        id: MOD_ROLE,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageChannels
                        ]
                    }
                ]
            });

            const fechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel(english ? 'Close Ticket' : 'Fechar Ticket')
                    .setEmoji('1536248470611173466')
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({
                content: english
                    ? `# <:support:1536248470611173466> Support Ticket

**User:** ${interaction.user}
**Issue:** ${assunto}

Our team will assist you shortly.

> Only moderators can close this ticket.`
                    : `# <:support:1536248470611173466> Ticket de Suporte

**Usuário:** ${interaction.user}
**Assunto:** ${assunto}

Nossa equipe responderá em breve.

> Apenas moderadores podem fechar este ticket.`,

                components: [fechar]
            });

            return interaction.reply({
                content: english
                    ? `Your ticket has been created: ${channel}`
                    : `Seu ticket foi criado: ${channel}`,
                ephemeral: true
            });
        }

        // FECHAR TICKET

        if (interaction.isButton() && interaction.customId === 'ticket_close') {

            if (!interaction.member.roles.cache.has(MOD_ROLE)) {
                return interaction.reply({
                    content: 'Only moderators can close tickets.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const messages = await interaction.channel.messages.fetch({ limit: 100 });

            const transcript = messages
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                .map(msg => {
                    const data = new Date(msg.createdTimestamp).toLocaleString('pt-BR');

                    let texto = msg.content;

                    if (!texto && msg.attachments.size)
                        texto = '[Attachment]';

                    if (!texto)
                        texto = '[Embed]';

                    return `[${data}] ${msg.author.tag}: ${texto}`;
                })
                .join('\n');

            const pasta = path.join(__dirname, '../../temp');

            if (!fs.existsSync(pasta))
                fs.mkdirSync(pasta);

            const arquivo = path.join(
                pasta,
                `${interaction.channel.name}.txt`
            );

            fs.writeFileSync(
                arquivo,
`===========================
TICKET TRANSCRIPT
===========================

Channel: ${interaction.channel.name}
Closed by: ${interaction.user.tag}
Date: ${new Date().toLocaleString('pt-BR')}

---------------------------------

${transcript}

---------------------------------
End of transcript.
`,
                'utf8'
            );

            const logs = await interaction.guild.channels.fetch(LOG_CHANNEL);

            await logs.send({
                content:
`# <:registry:1536459835921530890> Ticket Closed

**Channel:** \`${interaction.channel.name}\`
**Moderator:** ${interaction.user}`,

                files: [new AttachmentBuilder(arquivo)]
            });

            fs.unlinkSync(arquivo);

            await interaction.editReply({
                content: 'Ticket closed.'
            });

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 3000);
        }
    }
};