const path = require('node:path');
const fs = require('node:fs');
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

const TICKET_PANEL_CHANNEL = '1537510782932361367';
const RULES_CHANNEL = '1537510693987942600';

const TICKET_BUTTON_IDS = ['ticket_open_pt', 'ticket_open_en'];

// =============================================================================
// Procura um customId dentro de uma mensagem enviada em Components V2.
// =============================================================================
// Em Components V2 os botões NAO ficam direto em `message.components` (isso
// so e verdade pro formato antigo de ActionRow solto). Com V2, o topo e um
// Container, e o botao de verdade fica varios niveis abaixo dele (dentro de
// uma ActionRow que esta dentro do Container, que as vezes esta dentro de
// uma Section). Buscar so em `message.components[i].components[j].customId`
// (1 nivel) NUNCA encontra nada em uma mensagem V2 - e por isso que a
// checagem antiga sempre dava "nao existe" e reenviava o painel toda vez
// que o bot reiniciava. Esta funcao desce recursivamente por
// `.components` (containers, action rows, sections) e tambem por
// `.accessory` (o item ao lado do texto numa Section, ex: um botao ali)
// ate achar (ou nao) o customId procurado.
const messageHasCustomId = (components, targetIds) => {
    for (const component of components ?? []) {
        if (targetIds.includes(component.customId)) return true;
        if (component.components?.length && messageHasCustomId(component.components, targetIds)) return true;
        if (component.accessory && messageHasCustomId([component.accessory], targetIds)) return true;
    }
    return false;
};

const botAlreadySent = async (channel, client, matcher) => {
    const messages = await channel.messages.fetch({ limit: 100 });
    return messages.some((msg) => msg.author.id === client.user.id && matcher(msg));
};

// =============================================================================
// 1) PAINEL DE TICKETS
// =============================================================================
const sendTicketPanel = async (client) => {
    const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL).catch(() => null);
    if (!channel) return;

    const alreadySent = await botAlreadySent(channel, client, (msg) =>
        messageHasCustomId(msg.components, TICKET_BUTTON_IDS)
    );
    if (alreadySent) return;

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

    console.log('[Support] Painel de tickets enviado.');
};

// =============================================================================
// 2) REGRAS DO SERVIDOR
// =============================================================================
// Bilíngue e no mesmo estilo visual do painel de tickets (logo + seções +
// separadores grandes). Detecção de duplicata aqui só checa se o bot já
// mandou QUALQUER mensagem nesse canal (não tem botão pra procurar por
// customId), então é seguro reiniciar o bot sem duplicar — mas se você
// editar o texto das regras DEPOIS de já ter enviado uma vez, vai precisar
// apagar a mensagem antiga manualmente pra ele mandar a versão nova.
const sendRules = async (client) => {
    const channel = await client.channels.fetch(RULES_CHANNEL).catch(() => null);
    if (!channel) return;

    const alreadySent = await botAlreadySent(channel, client, () => true);
    if (alreadySent) return;

    const logoPath = path.join(__dirname, '../../images/logo/logo.png');
    const hasLogo = fs.existsSync(logoPath);
    const files = [];

    const headerText = [
        new TextDisplayBuilder().setContent(
            '# <:registry:1536459835921530890> Regras do Servidor · Server Rules'
        ),
        new TextDisplayBuilder().setContent(
            'Leia com atenção antes de participar da comunidade.\n' +
            'Please read carefully before taking part in the community.'
        ),
    ];

    const container = new ContainerBuilder();

    if (hasLogo) {
        files.push(new AttachmentBuilder(logoPath, { name: 'logo.png' }));
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(...headerText)
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL('attachment://logo.png')
                )
        );
    } else {
        container.addTextDisplayComponents(...headerText);
    }

    container
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent([
                '## 🇧🇷 Português',
                '',
                '`1.` <:dnd:1536247547193204766> Respeite todos os membros — sem discurso de ódio, assédio ou discriminação.',
                '`2.` <:error:1536247565006143528> Sem spam, flood ou propaganda de outros servidores sem autorização.',
                '`3.` <:hmm:1536247599365890139> Conteúdo NSFW, violento ou ilegal não é permitido em nenhum canal.',
                '`4.` <:registry:1536459835921530890> Siga também os Termos de Serviço e as Diretrizes da Comunidade do Discord.',
                '`5.` <:book:1536247508181848134> Use os canais para o que eles foram feitos.',
                '`6.` <:support:1536248470611173466> Dúvidas ou problemas? Abra um ticket de suporte.',
                '',
                '<:sob:1536248436339376138> O descumprimento das regras pode resultar em advertência, mute, kick ou ban, a critério da equipe.'
            ].join('\n'))
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent([
                '## 🇺🇸 English',
                '',
                '`1.` <:dnd:1536247547193204766> Respect all members — no hate speech, harassment, or discrimination.',
                '`2.` <:error:1536247565006143528> No spam, flooding, or advertising other servers without permission.',
                '`3.` <:hmm:1536247599365890139> NSFW, violent, or illegal content is not allowed in any channel.',
                '`4.` <:registry:1536459835921530890> Also follow Discord\'s Terms of Service and Community Guidelines.',
                '`5.` <:book:1536247508181848134> Use each channel for its intended purpose.',
                '`6.` <:support:1536248470611173466> Questions or issues? Open a support ticket.',
                '',
                '<:sob:1536248436339376138> Breaking the rules may result in a warning, mute, kick, or ban, at the staff\'s discretion.'
            ].join('\n'))
        );

    await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        files,
    });

    console.log('[Support] Regras enviadas.');
};

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`[Support] ${client.user.tag} conectado.`);

        await sendTicketPanel(client);
        await sendRules(client);
    }
};
