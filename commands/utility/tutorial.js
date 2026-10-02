const path = require('path');
const fs = require('fs');
const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');

const { getUserLanguage } = require('../../utils/db');

const GIFT_IMAGE_NAME = 'bag_coins.png';
const GIFT_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', GIFT_IMAGE_NAME);

const TOTAL_STEPS = 7;

// Mapeia o nome plano do comando (usado no select menu) pra menção clicável (usada no corpo do passo).
const COMMAND_MENTIONS = {
    '/alien': '</alien:1537544781020799120>',
    '/planet': '</planet:1537544781020799123>',
    '/daily': '</daily:1537544781020799118>',
    '/craft': '</craft:1537544781020799121>',
    '/market': '</market:1538040562978922517>',
    '/profile': '</profile:1537544781117263992>',
    '/achievements': '</achievements:1538040562978922518>',
};

function getStepContent(lang, stepNum) {
    const isPt = lang === 'pt-BR';

    const steps = {
        1: {
            title: isPt ? 'Passo 1: Escolha seu Alienígena' : 'Step 1: Choose your Alien Companion',
            cmd: '/alien',
            icon: '<:ovni:1536247726889762847>',
            desc: isPt
                ? 'Antes de iniciar sua jornada estelar, você precisa escolher seu companheiro alienígena! Use </alien:1537544781020799120> para selecionar a cor (roxo, verde, azul, rosa, laranja) e definir um nome especial para ele.'
                : 'Before starting your stellar journey, choose your alien companion! Use </alien:1537544781020799120> to pick a color (purple, green, blue, pink, orange) and give it a special name.',
        },
        2: {
            title: isPt ? 'Passo 2: Explore Planetas & Missões' : 'Step 2: Explore Planets & Missions',
            cmd: '/planet',
            icon: '<:saturn:1536459943480270959>',
            desc: isPt
                ? 'Descubra planetas de várias raridades e envie seu alienígena em missões de exploração espaciais. Durante as expedições, ele irá coletar recursos raros e ∩oins valiosas para você!'
                : 'Discover planets of various rarities and send your alien on space exploration missions. During expeditions, it will collect rare resources and valuable ∩oins for you!',
        },
        3: {
            title: isPt ? 'Passo 3: Recompensa Diária (Daily)' : 'Step 3: Daily Reward',
            cmd: '/daily',
            icon: '<:excited:1536247579061256252>',
            desc: isPt
                ? 'Resgate sua recompensa diária de ∩oins e recursos com </daily:1537544781020799118> — funciona em qualquer servidor! Mantenha sua sequência de dias ativa para receber bônus crescentes a cada dia.'
                : 'Claim your daily ∩oins and resource reward with </daily:1537544781020799118> — it works in any server! Keep your streak active to earn higher bonuses every day.',
        },
        4: {
            title: isPt ? 'Passo 4: Melhore sua Nave (Crafting)' : 'Step 4: Upgrade your Ship (Crafting)',
            cmd: '/craft',
            icon: '<:config:1536247533502734376>',
            desc: isPt
                ? 'Use os recursos acumulados no seu inventário para fabricar atualizações para sua nave! Evolua o Propulsor (mais velocidade), a Sonda de Escavação (mais recursos por missão) e o Scanner Estelar (menos tempo de mineração).'
                : 'Use accumulated resources from your inventory to craft upgrades for your ship! Upgrade your Propulsor (more speed), Excavation Probe (more resources per mission), and Star Scanner (less mining time).',
        },
        5: {
            title: isPt ? 'Passo 5: Mercado Global de Recursos' : 'Step 5: Global Resource Market',
            cmd: '/market',
            icon: '<:gold_coins:1536941656178298992>',
            desc: isPt
                ? 'Precisa de ∩oins ou de um recurso específico? Anuncie seus recursos excedentes no Mercado Global para outros jogadores ou compre itens diretamente na Loja do Sistema.'
                : 'Need ∩oins or a specific resource? List your extra resources on the Global Market for other players or buy items directly from the System Shop.',
        },
        6: {
            title: isPt ? 'Passo 6: Perfil & Estatísticas' : 'Step 6: Profile & Statistics',
            cmd: '/profile',
            icon: '<:registry:1536459835921530890>',
            desc: isPt
                ? 'Acompanhe seu progresso! Consulte seu saldo de moedas em </wallet:1537544781020799119>, veja seus itens em </inventory:1537544781020799122> e confira suas estatísticas de viagem e equipamentos em </profile:1537544781117263992>.'
                : 'Track your progress! Check your balance in </wallet:1537544781020799119>, see items in </inventory:1537544781020799122>, and view travel stats and ship equipment in </profile:1537544781117263992>.',
        },
        7: {
            title: isPt ? 'Passo 7: Conquistas & Personalização' : 'Step 7: Achievements & Customization',
            cmd: '/achievements',
            icon: '<:legendary:1536459814475927653>',
            desc: isPt
                ? 'Você já sabe o essencial! Agora explore </achievements:1538040562978922518> para desbloquear conquistas, </hatmarket:1538040562978922516> para comprar e vender chapéus exclusivos, e </config user:1537544781020799125> para ajustar seu idioma. Bons voos, explorador!'
                : 'You know the essentials now! Explore </achievements:1538040562978922518> to unlock achievements, </hatmarket:1538040562978922516> to buy and sell exclusive hats, and </config user:1537544781020799125> to adjust your language. Safe travels, explorer!',
        },
    };

    return steps[stepNum] ?? steps[1];
}

function renderProgressDots(currentStep) {
    return Array.from({ length: TOTAL_STEPS }, (_, i) => (i + 1 === currentStep ? '●' : '○')).join(' ');
}

function renderTutorialContainer(interaction, stepNum = 1) {
    const lang = getUserLanguage(interaction.user.id);
    const isPt = lang === 'pt-BR';
    const currentStep = Math.min(Math.max(1, stepNum), TOTAL_STEPS);
    const isLastStep = currentStep === TOTAL_STEPS;
    const data = getStepContent(lang, currentStep);

    const header = new TextDisplayBuilder().setContent(
        `# <:book2:1536459861527756952> ${isPt ? 'Guia do Explorador • Tutorial ∩lien' : 'Explorer Guide • ∩lien Tutorial'}\n` +
        `<:ovni:1536247726889762847> *${isPt ? `Etapa ${currentStep} de ${TOTAL_STEPS}` : `Step ${currentStep} of ${TOTAL_STEPS}`}*\n` +
        renderProgressDots(currentStep)
    );

    const footerTip = isLastStep
        ? `<:sunglasses:1536248455519801386> *${isPt ? 'Você concluiu o tutorial! Use </help:1538040562978922519> sempre que precisar consultar um comando.' : "You've completed the tutorial! Use </help:1538040562978922519> anytime you need to look up a command."}*`
        : `<:excited:1536247579061256252> *${isPt ? 'Use os botões ou o menu abaixo para navegar entre os passos do tutorial!' : 'Use the buttons or the menu below to navigate tutorial steps!'}*`;

    const bodyText = new TextDisplayBuilder().setContent(
        `## ${data.icon} ${data.title}\n` +
        `**${isPt ? 'Comando principal:' : 'Main command:'}** ${COMMAND_MENTIONS[data.cmd] ?? data.cmd}\n\n` +
        `${data.desc}\n\n` +
        footerTip
    );

    const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
    let section;
    if (hasImage) {
        const thumbnail = new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`);
        section = new SectionBuilder().addTextDisplayComponents(bodyText).setThumbnailAccessory(thumbnail);
    } else {
        section = new SectionBuilder().addTextDisplayComponents(bodyText);
    }

    const jumpRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('tutorial_select_step')
            .setPlaceholder(isPt ? 'Ir direto para um passo...' : 'Jump directly to a step...')
            .addOptions(
                Array.from({ length: TOTAL_STEPS }, (_, i) => {
                    const step = i + 1;
                    const stepData = getStepContent(lang, step);
                    return {
                        label: isPt ? `Passo ${step}: ${stepData.title.split(': ')[1] ?? stepData.title}` : stepData.title,
                        description: stepData.cmd,
                        value: String(step),
                        emoji: stepData.icon,
                        default: step === currentStep,
                    };
                })
            )
    );

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`tutorial_step_${currentStep - 1}`)
            .setLabel(isPt ? '◀ Anterior' : '◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentStep <= 1),
        new ButtonBuilder()
            .setCustomId(`tutorial_step_${currentStep + 1}`)
            .setLabel(isLastStep ? (isPt ? 'Concluído' : 'Done') : (isPt ? 'Próximo ▶' : 'Next ▶'))
            .setEmoji(isLastStep ? '<:online:1536247711169249391>' : '<:ovni:1536247726889762847>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(isLastStep),
        new ButtonBuilder()
            .setCustomId('tutorial_open_help')
            .setLabel(isPt ? 'Comandos (/help)' : 'Commands (/help)')
            .setEmoji('<:book:1536247508181848134>')
            .setStyle(ButtonStyle.Success)
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const files = hasImage ? [{ attachment: GIFT_IMAGE_PATH, name: GIFT_IMAGE_NAME }] : [];

    return {
        components: [container, jumpRow, navRow],
        files,
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('tutorial')
        .setNameLocalizations({ 'pt-BR': 'tutorial' })
        .setDescription('Interactive step-by-step tutorial guide for new space explorers')
        .setDescriptionLocalizations({
            'pt-BR': 'Guia interativo passo a passo para novos exploradores espaciais',
        }),

    async execute(interaction) {
        const payload = renderTutorialContainer(interaction, 1);
        await interaction.editReply(payload);
    },

    async handleButton(interaction) {
        if (interaction.customId === 'tutorial_open_help') {
            const helpCommand = interaction.client.commands.get('help');
            if (helpCommand && typeof helpCommand.renderHelpContainer === 'function') {
                const payload = helpCommand.renderHelpContainer(interaction, 'galaxy');
                await interaction.update(payload);
            } else {
                const isPt = getUserLanguage(interaction.user.id) === 'pt-BR';
                await interaction.reply({
                    content: isPt ? 'Use o comando </help:1538040562978922519> para ver a lista de comandos!' : 'Use </help:1538040562978922519> to see command list!',
                    flags: MessageFlags.Ephemeral,
                });
            }
            return true;
        }

        if (interaction.customId.startsWith('tutorial_step_')) {
            const stepNum = parseInt(interaction.customId.replace('tutorial_step_', ''), 10);
            const payload = renderTutorialContainer(interaction, stepNum);
            await interaction.update(payload);
            return true;
        }

        return false;
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'tutorial_select_step') return false;

        const stepNum = parseInt(interaction.values[0], 10);
        const payload = renderTutorialContainer(interaction, stepNum);
        await interaction.update(payload);
        return true;
    },

    renderTutorialContainer,
};
