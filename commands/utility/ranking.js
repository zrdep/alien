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
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const { getUserLanguage, getLeaderboard, getLeaderboardRank } = require('../../utils/db');
const { formatDistance, formatCount } = require('../../utils/statsFormatter');

const DEFAULT_CATEGORY = 'coins';

// Cada categoria: emoji do topo do painel + emoji da linha do menu + como
// formatar o valor bruto que vem do banco.
const CATEGORY_META = {
    coins: {
        headerEmoji: '<:gold_coins:1536941656178298992>',
        menuEmoji: '<:gold_coins:1536941656178298992>',
        format: (value, lang) => `${value.toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US')} ∩oins`,
    },
    planets_seen: {
        headerEmoji: '<:asteroid:1536459906973171782>',
        menuEmoji: '<:asteroid:1536459906973171782>',
        format: (value, lang) => formatCount(value, lang),
    },
    trips_completed: {
        headerEmoji: '<:ovni:1536247726889762847>',
        menuEmoji: '<:ovni:1536247726889762847>',
        format: (value, lang) => formatCount(value, lang),
    },
    distance_traveled_km: {
        headerEmoji: '<:saturn:1536459943480270959>',
        menuEmoji: '<:saturn:1536459943480270959>',
        format: (value, lang) => formatDistance(value, lang),
    },
    total_resources_collected: {
        headerEmoji: '<:rock:1536579687407681596>',
        menuEmoji: '<:rock:1536579687407681596>',
        format: (value, lang) => formatCount(value, lang),
    },
};

const CATEGORY_ORDER = ['coins', 'planets_seen', 'trips_completed', 'distance_traveled_km', 'total_resources_collected'];

const MEDALS = ['🥇', '🥈', '🥉'];

// Resolve nome de exibição pro user_id salvo no banco. Usa o cache do client
// quando possível (instantâneo) e só bate na API do Discord pra quem ainda
// não está em cache — em paralelo, então o Top 10 inteiro resolve numa
// única "rodada" em vez de 10 chamadas sequenciais.
const resolveDisplayName = async (client, userId) => {
    try {
        const user = await client.users.fetch(userId);
        return user.username;
    } catch {
        return `Usuário Desconhecido (${userId.slice(-4)})`;
    }
};

const buildCategoryMenu = (interaction, activeCategory) => {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('ranking_category_select')
            .setPlaceholder(tFor(interaction, 'commands.ranking.placeholder'))
            .addOptions(
                CATEGORY_ORDER.map((key) => ({
                    label: tFor(interaction, `commands.ranking.categories.${key}`),
                    description: tFor(interaction, `commands.ranking.categoryDesc.${key}`),
                    value: key,
                    emoji: CATEGORY_META[key].menuEmoji,
                    default: key === activeCategory,
                }))
            )
    );
};

const buildRankingPayload = async (interaction, category = DEFAULT_CATEGORY) => {
    const lang = getUserLanguage(interaction.user.id);
    const meta = CATEGORY_META[category] ?? CATEGORY_META[DEFAULT_CATEGORY];
    const activeCategory = CATEGORY_META[category] ? category : DEFAULT_CATEGORY;

    const rows = getLeaderboard(activeCategory, 10);

    const header = new TextDisplayBuilder().setContent(
        `# 🏆 ${tFor(interaction, 'commands.ranking.title')}\n` +
        `${meta.headerEmoji} **${tFor(interaction, `commands.ranking.categories.${activeCategory}`)}** — ${tFor(interaction, `commands.ranking.categoryDesc.${activeCategory}`)}`
    );

    let bodyContent;
    let topAvatarUrl = null;

    if (!rows.length) {
        bodyContent = `<:hmm:1536247599365890139> ${tFor(interaction, 'commands.ranking.empty')}`;
    } else {
        const names = await Promise.all(rows.map((row) => resolveDisplayName(interaction.client, row.userId)));

        const lines = rows.map((row, index) => {
            const place = index < 3 ? MEDALS[index] : `\`#${index + 1}\``;
            return `${place} **${names[index]}** — \`${meta.format(row.value, lang)}\``;
        });

        bodyContent = lines.join('\n');

        try {
            const topUser = await interaction.client.users.fetch(rows[0].userId);
            topAvatarUrl = topUser.displayAvatarURL({ size: 256 });
        } catch {
            topAvatarUrl = null;
        }
    }

    const rankInfo = getLeaderboardRank(activeCategory, interaction.user.id);
    const positionText = rankInfo?.position
        ? `#${rankInfo.position} — \`${meta.format(rankInfo.value, lang)}\``
        : tFor(interaction, 'commands.ranking.notRanked');

    const footerText = new TextDisplayBuilder().setContent(
        `-# <:registry:1536459835921530890> ${tFor(interaction, 'commands.ranking.yourPosition')}: ${positionText}\n` +
        `-# ${tFor(interaction, 'commands.ranking.footer')}`
    );

    const bodyText = new TextDisplayBuilder().setContent(bodyContent);

    let bodySection;
    if (topAvatarUrl) {
        bodySection = new SectionBuilder()
            .addTextDisplayComponents(bodyText)
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(topAvatarUrl));
    } else {
        bodySection = new SectionBuilder().addTextDisplayComponents(bodyText);
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(buildCategoryMenu(interaction, activeCategory))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(bodySection)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footerText);

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container],
    };
};

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('ranking')
        .setNameLocalizations({ 'pt-BR': 'ranking' })
        .setDescription('See the galactic leaderboard for different stats')
        .setDescriptionLocalizations({
            'pt-BR': 'Veja o ranking galáctico de diferentes estatísticas',
        }),

    async execute(interaction) {
        const payload = await buildRankingPayload(interaction, DEFAULT_CATEGORY);
        await interaction.editReply(payload);
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId !== 'ranking_category_select') return false;

        await interaction.deferUpdate();
        const category = interaction.values[0];
        const payload = await buildRankingPayload(interaction, category);
        await interaction.editReply(payload);
        return true;
    },
};
