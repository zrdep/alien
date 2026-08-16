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
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const { getUserLanguage } = require('../../utils/db');

const GIFT_IMAGE_NAME = 'bag_coins.png';
const GIFT_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', GIFT_IMAGE_NAME);

function getCategoryData(lang, categoryKey) {
    const isPt = lang === 'pt-BR';

    const categories = {
        galaxy: {
            title: isPt ? '<:ovni:1536247726889762847> Galáxia & Exploração' : '<:ovni:1536247726889762847> Galaxy & Exploration',
            desc: isPt
                ? 'Comandos para viajar no espaço, descobrir novos mundos e gerenciar seus itens:'
                : 'Commands to travel through space, discover new worlds, and manage your items:',
            commands: [
                { name: '/alien', desc: isPt ? 'Veja seu alienígena companheiro e sua nave.' : 'View your alien companion and ship.' },
                { name: isPt ? '/planeta' : '/planet', desc: isPt ? 'Explore planetas misteriosos e envie seu alien em missões de coleta.' : 'Explore mysterious planets and send your alien on resource missions.' },
                { name: isPt ? '/inventario' : '/inventory', desc: isPt ? 'Veja todos os recursos espaciais coletados nas expedições.' : 'View all space resources collected during expeditions.' },
                { name: isPt ? '/fabricar' : '/craft', desc: isPt ? 'Fabrique melhorias para a sua nave (Propulsores, Sondas, Scanners).' : 'Craft ship upgrades (Propulsors, Probes, Scanners).' },
            ],
        },
        economy: {
            title: isPt ? '<:gold_coins:1536941656178298992> Economia & Comércio' : '<:gold_coins:1536941656178298992> Economy & Trade',
            desc: isPt
                ? 'Comandos para gerenciar seu saldo de ∩oins e praticar comércio global:'
                : 'Commands to manage your ∩oins balance and trade globally:',
            commands: [
                { name: '/daily', desc: isPt ? 'Resgate sua recompensa diária de ∩oins e recursos.' : 'Claim your daily reward of ∩oins and resources.' },
                { name: isPt ? '/resgatar' : '/redeem', desc: isPt ? 'Resgate conquistas pendentes, presentes e recompensas.' : 'Redeem pending achievements, gifts, and rewards.' },
                { name: isPt ? '/carteira' : '/wallet', desc: isPt ? 'Consulte sua carteira de ∩oins ou a de outro explorador.' : 'Check your ∩oins wallet or another explorer balance.' },
                { name: isPt ? '/mercado' : '/market', desc: isPt ? 'Compre e venda recursos no Mercado Global ou na Loja do Sistema.' : 'Buy and sell resources on the Global Market or System Shop.' },
                { name: isPt ? '/mercadochapeus' : '/hatmarket', desc: isPt ? 'Compre e venda chapéus exclusivos com outros jogadores.' : 'Buy and sell exclusive hats with other players.' },
            ],
        },
        utility: {
            title: isPt ? '<:settings:1536248422686920704> Utilitários & Perfil' : '<:settings:1536248422686920704> Utility & Profile',
            desc: isPt
                ? 'Comandos de utilidade geral, estatísticas do jogador e preferências:'
                : 'General utility commands, player statistics, and preferences:',
            commands: [
                { name: isPt ? '/perfil' : '/profile', desc: isPt ? 'Veja suas estatísticas espaciais, nave e companheiro alien.' : 'View your space statistics, ship, and alien companion.' },
                { name: isPt ? '/conquistas' : '/achievements', desc: isPt ? 'Veja todas as conquistas disponíveis e seu progresso nelas.' : 'View all available achievements and your progress toward them.' },
                { name: '/config user/server', desc: isPt ? 'Altere idioma, aviso de missão concluída (DM/canal/desligado) ou configurações do servidor.' : 'Change language, mission-complete notice (DM/channel/off), or server settings.' },
                { name: '/tutorial', desc: isPt ? 'Guia interativo passo a passo para aprender a jogar com o ∩lien.' : 'Interactive step-by-step tutorial guide to learn ∩lien.' },
                { name: '/ranking', desc: isPt ? 'Veja o ranking galáctico: mais ricos, mais explorados e mais.' : 'View the galactic leaderboard: richest, most explored, and more.' },
                { name: '/botinfo', desc: isPt ? 'Exibe informações sobre o bot ∩lien, desempenho e estatísticas.' : 'Displays information about ∩lien bot, performance, and stats.' },
                { name: '/ping', desc: isPt ? 'Verifica o tempo de resposta e latência do bot.' : 'Checks bot response time and latency.' },
                { name: isPt ? '/ajuda' : '/help', desc: isPt ? 'Abre este painel de ajuda categorizado com comandos.' : 'Opens this categorized help menu with commands.' },
            ],
        },
    };

    return categories[categoryKey] ?? categories.galaxy;
}

function getTotalCommandCount(lang) {
    return ['galaxy', 'economy', 'utility'].reduce(
        (total, key) => total + getCategoryData(lang, key).commands.length,
        0
    );
}

function renderHelpContainer(interaction, activeCategory = 'galaxy') {
    const lang = getUserLanguage(interaction.user.id);
    const catData = getCategoryData(lang, activeCategory);
    const isPt = lang === 'pt-BR';

    const totalCommands = getTotalCommandCount(lang);

    const header = new TextDisplayBuilder().setContent(
        `# <:book:1536247508181848134> ${isPt ? 'Central de Ajuda • ∩lien' : 'Help Center • ∩lien'}\n` +
        `<:ovni:1536247726889762847> *${isPt
            ? `Explore os ${totalCommands} comandos disponíveis, organizados por categoria abaixo:`
            : `Explore all ${totalCommands} available commands, organized by category below:`}*`
    );

    const commandsText = catData.commands
        .map((cmd) => `🔹 **\`${cmd.name}\`**\n└ ${cmd.desc}`)
        .join('\n\n');

    const bodyText = new TextDisplayBuilder().setContent(
        `## ${catData.title}\n` +
        `*${catData.desc}*\n\n` +
        `${commandsText}\n\n` +
        `<:excited:1536247579061256252> **${isPt ? 'Dica para iniciantes:' : 'Tip for beginners:'}** ${isPt ? 'Nunca jogou? Use `/tutorial` para um guia passo a passo!' : "First time here? Use `/tutorial` for a step-by-step guide!"}\n` +
        `<:support:1536248470611173466> ${isPt ? 'Precisa de mais ajuda? Fale com a equipe no servidor de suporte.' : 'Need more help? Reach out to the team on the support server.'}`
    );

    const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
    let section;
    if (hasImage) {
        const thumbnail = new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`);
        section = new SectionBuilder().addTextDisplayComponents(bodyText).setThumbnailAccessory(thumbnail);
    } else {
        section = new SectionBuilder().addTextDisplayComponents(bodyText);
    }

    const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder(isPt ? 'Selecione uma categoria de comandos...' : 'Select a command category...')
            .addOptions([
                {
                    label: isPt ? 'Galáxia & Exploração' : 'Galaxy & Exploration',
                    description: isPt
                        ? `${getCategoryData(lang, 'galaxy').commands.length} comandos • viagens, planetas e nave`
                        : `${getCategoryData(lang, 'galaxy').commands.length} commands • travel, planets & ship`,
                    value: 'galaxy',
                    emoji: '<:ovni:1536247726889762847>',
                    default: activeCategory === 'galaxy',
                },
                {
                    label: isPt ? 'Economia & Comércio' : 'Economy & Trade',
                    description: isPt
                        ? `${getCategoryData(lang, 'economy').commands.length} comandos • ∩oins, mercado e chapéus`
                        : `${getCategoryData(lang, 'economy').commands.length} commands • ∩oins, market & hats`,
                    value: 'economy',
                    emoji: '<:gold_coins:1536941656178298992>',
                    default: activeCategory === 'economy',
                },
                {
                    label: isPt ? 'Utilitários & Perfil' : 'Utility & Profile',
                    description: isPt
                        ? `${getCategoryData(lang, 'utility').commands.length} comandos • perfil, conquistas e config`
                        : `${getCategoryData(lang, 'utility').commands.length} commands • profile, achievements & config`,
                    value: 'utility',
                    emoji: '<:settings:1536248422686920704>',
                    default: activeCategory === 'utility',
                },
            ])
    );

    const tutorialButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_open_tutorial')
            .setLabel(isPt ? 'Ver Tutorial Passo a Passo' : 'View Step-by-Step Tutorial')
            .setEmoji('<:book2:1536459861527756952>')
            .setStyle(ButtonStyle.Success)
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const files = hasImage ? [{ attachment: GIFT_IMAGE_PATH, name: GIFT_IMAGE_NAME }] : [];

    return {
        components: [container, selectRow, tutorialButtonRow],
        files,
        flags: MessageFlags.IsComponentsV2,
    };
}

module.exports = {
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('help')
        .setNameLocalizations({ 'pt-BR': 'ajuda' })
        .setDescription('Shows all available commands separated by categories')
        .setDescriptionLocalizations({
            'pt-BR': 'Mostra todos os comandos disponíveis separados por categorias',
        }),

    async execute(interaction) {
        const payload = renderHelpContainer(interaction, 'galaxy');
        await interaction.editReply(payload);
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'help_select_category') return false;

        const selectedCategory = interaction.values[0];
        const payload = renderHelpContainer(interaction, selectedCategory);
        await interaction.update(payload);
        return true;
    },

    async handleButton(interaction) {
        if (interaction.customId !== 'help_open_tutorial') return false;

        const tutorialCommand = interaction.client.commands.get('tutorial');
        if (tutorialCommand && typeof tutorialCommand.renderTutorialContainer === 'function') {
            const payload = tutorialCommand.renderTutorialContainer(interaction, 1);
            await interaction.update(payload);
        } else {
            const isPt = getUserLanguage(interaction.user.id) === 'pt-BR';
            await interaction.reply({
                content: isPt ? 'Use o comando `/tutorial` para ver o guia completo!' : 'Use `/tutorial` command to view the complete guide!',
                flags: MessageFlags.Ephemeral,
            });
        }
        return true;
    },

    renderHelpContainer,
};