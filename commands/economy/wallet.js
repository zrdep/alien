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
} = require('discord.js');

const { tFor, t } = require('../../utils/i18n');
const {
    getUserLanguage,
    getUserCoins,
    getDailyState,
    getUserAlien,
    getCoinHistory,
    countCoinHistory,
} = require('../../utils/db');
const { formatDuration } = require('../../utils/exploration');
const { getResourceLabel } = require('../../utils/resourcesDisplay');
const { getHatName, getAchievement } = require('../../gameConfig');
const { getRecipe, getRecipeDescParams } = require('../../utils/craftRecipes');

const E_ONLINE = '<:online:1536247711169249391>';
const E_DND    = '<:dnd:1536247547193204766>';
const HISTORY_PAGE_SIZE = 10;

const formatNum = (n, lang) => (n ?? 0).toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');

// Transforma o `detail` salvo no banco nas variáveis do texto da linha,
// traduzindo nomes (recurso, chapéu, receita, conquista) no idioma de quem vê.
const buildHistoryVars = (tx, lang) => {
    const d = tx.detail ?? {};
    const vars = { ...d };
    if (d.resource) vars.resource = getResourceLabel(lang, d.resource);
    if (d.hat) vars.hat = getHatName(d.hat, lang);
    if (d.user) vars.user = `<@${d.user}>`;
    if (d.achievement) {
        const ach = getAchievement(d.achievement);
        vars.achievement = ach?.name?.[lang] ?? ach?.name?.['pt-BR'] ?? d.achievement;
    }
    if (d.recipe) {
        const recipe = getRecipe(d.recipe);
        const title = recipe ? t(lang, recipe.titleKey, getRecipeDescParams(recipe, lang)) : d.recipe;
        vars.item = d.qty > 1 ? `${d.qty}x ${title}` : title;
    }
    if (d.titlePt || d.titleEn) vars.title = lang === 'en-US' ? (d.titleEn ?? d.titlePt) : (d.titlePt ?? d.titleEn);
    return vars;
};

const buildHistoryPayload = (interaction, page = 0) => {
    const userId = interaction.user.id;
    const lang = getUserLanguage(userId);
    const total = countCoinHistory(userId);
    const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
    const current = Math.min(Math.max(0, page), totalPages - 1);
    const rows = getCoinHistory(userId, HISTORY_PAGE_SIZE, current * HISTORY_PAGE_SIZE);

    const header = new TextDisplayBuilder().setContent(
        `# <:registry:1536459835921530890> ${tFor(interaction, 'commands.wallet.historyTitle')}`
    );

    const body = rows.length === 0
        ? `<:hmm:1536247599365890139> *${tFor(interaction, 'commands.wallet.historyEmpty')}*`
        : rows.map((tx) => {
            const typeKey = `commands.wallet.historyTypes.${tx.type}`;
            const label = tFor(interaction, typeKey, buildHistoryVars(tx, lang));
            const sign = tx.amount > 0 ? '+' : '-';
            const emoji = tx.amount > 0 ? E_ONLINE : E_DND;
            const when = `<t:${Math.floor(tx.createdAt / 1000)}:R>`;
            const balance = tFor(interaction, 'commands.wallet.historyBalance', { coins: formatNum(tx.balanceAfter, lang) });
            return `${emoji} **${sign}${formatNum(Math.abs(tx.amount), lang)}** · ${label}\n-# ${when} · ${balance}`;
        }).join('\n');

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

    if (totalPages > 1) {
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `-# ${tFor(interaction, 'commands.wallet.historyPage', { page: current + 1, total: totalPages })}`
            ))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`wallet_history_page:${current - 1}`)
                    .setLabel(tFor(interaction, 'commands.wallet.historyPrev'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(current === 0),
                new ButtonBuilder()
                    .setCustomId(`wallet_history_page:${current + 1}`)
                    .setLabel(tFor(interaction, 'commands.wallet.historyNext'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(current >= totalPages - 1),
            ));
    }

    return { flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] };
};

const BAG_IMAGE_NAME = 'bag_coins.png';
const BAG_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', BAG_IMAGE_NAME);

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('wallet')
        .setNameLocalizations({ 'pt-BR': 'carteira' })
        .setDescription("Check your or another user's ∩oins wallet")
        .setDescriptionLocalizations({
            'pt-BR': 'Veja a sua carteira ou a de outro usuário de ∩oins',
        })
        .addUserOption((option) =>
            option
                .setName('user')
                .setNameLocalizations({ 'pt-BR': 'usuario' })
                .setDescription('User to check wallet for')
                .setDescriptionLocalizations({
                    'pt-BR': 'Usuário para ver a carteira',
                })
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') ?? interaction.user;
        const isSelf = targetUser.id === interaction.user.id;
        const lang = getUserLanguage(interaction.user.id);
        const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

        const coins = getUserCoins(targetUser.id);
        const dailyState = getDailyState(targetUser.id);
        const resetFormatted = formatDuration(dailyState.secondsUntilReset, lang);

        let dailyStatusText;
        if (dailyState.canClaim) {
            dailyStatusText = tFor(interaction, 'commands.wallet.dailyAvailable');
        } else {
            dailyStatusText = tFor(interaction, 'commands.wallet.dailyClaimed', { time: resetFormatted });
        }

        const alien = getUserAlien(targetUser.id);
        const alienText = alien?.name
            ? `\n<:excited:1536247579061256252> **${tFor(interaction, 'commands.wallet.alienCompanion')}**: \`${alien.name}\``
            : '';

        const header = new TextDisplayBuilder().setContent(
            `# <:gold_coins:1536941656178298992> ${
                isSelf
                    ? tFor(interaction, 'commands.wallet.myTitle')
                    : tFor(interaction, 'commands.wallet.userTitle', { user: targetUser.username })
            }`
        );

        const bodyText = new TextDisplayBuilder().setContent(
            `**${tFor(interaction, 'commands.wallet.balanceLabel')}**: \`${coins.toLocaleString(numLoc)}\` ∩oins` +
            alienText +
            `\n\n<:saturn:1536459943480270959> **${tFor(interaction, 'commands.wallet.dailyStatusLabel')}**: ${dailyStatusText}`
        );

        const hasImage = fs.existsSync(BAG_IMAGE_PATH);
        const files = [];
        if (hasImage) {
            files.push({
                attachment: BAG_IMAGE_PATH,
                name: BAG_IMAGE_NAME,
            });
        }

        let section;
        if (hasImage) {
            const thumbnail = new ThumbnailBuilder().setURL(`attachment://${BAG_IMAGE_NAME}`);
            section = new SectionBuilder()
                .addTextDisplayComponents(bodyText)
                .setThumbnailAccessory(thumbnail);
        } else {
            section = new SectionBuilder().addTextDisplayComponents(bodyText);
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(section);

        // Histórico é privado: só aparece na própria carteira e abre ephemeral.
        if (isSelf) {
            container.addActionRowComponents(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('wallet_history')
                    .setLabel(tFor(interaction, 'commands.wallet.historyButton'))
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:registry:1536459835921530890>')
            ));
        }

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            files,
        });
    },

    async handleButton(interaction) {
        if (interaction.customId === 'wallet_history') {
            await interaction.reply(buildHistoryPayload(interaction, 0));
            return true;
        }
        if (interaction.customId.startsWith('wallet_history_page:')) {
            const page = Number(interaction.customId.slice('wallet_history_page:'.length)) || 0;
            const { flags, components } = buildHistoryPayload(interaction, page);
            await interaction.update({ flags: flags & ~MessageFlags.Ephemeral, components });
            return true;
        }
        return false;
    },
};
