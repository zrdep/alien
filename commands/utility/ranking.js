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

const { tFor, getText } = require('../../utils/i18n');
const { getUserLanguage, getLeaderboard, getLeaderboardRank } = require('../../utils/db');
const { formatDistance, formatCount, formatPlace } = require('../../utils/statsFormatter');
const { composeRankingPodium } = require('../../utils/rankingPodiumImage');
const logger = require('../../utils/logger');

const DEFAULT_CATEGORY = 'coins';

// Escopo do ranking: todo mundo, ou só quem já usou o bot neste servidor
// (ver user_guilds em utils/db.js). O escopo vai no customId do menu e dos
// botões pra sobreviver às trocas de categoria.
const SCOPES = { GLOBAL: 'global', SERVER: 'server' };
const PODIUM_ATTACHMENT_NAME = 'ranking_podium.png';

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


// Resolve nome de exibição pro user_id salvo no banco. Usa o cache do client
// quando possível (instantâneo) e só bate na API do Discord pra quem ainda
// não está em cache — em paralelo, então o Top 10 inteiro resolve numa
// única "rodada" em vez de 10 chamadas sequenciais.
const resolveDisplayName = async (client, userId, lang) => {
    try {
        const user = await client.users.fetch(userId);
        return user.username;
    } catch {
        return getText(lang, 'commands.ranking.unknownUser', { id: userId.slice(-4) });
    }
};

// Baixa os bytes do avatar (forçando PNG, pra evitar gif/webp animado no
// resvg) pra poder embutir como base64 no SVG do pódio. Retorna null em
// qualquer falha — quem chama trata isso como "sem foto" e deixa aquele
// degrau do pódio vazio.
const fetchAvatarBuffer = async (client, userId) => {
    try {
        const user = await client.users.fetch(userId);
        const url = user.displayAvatarURL({ extension: 'png', size: 128 });
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (err) {
        logger.error(`Falha ao baixar avatar do usuário ${userId} pro pódio do ranking: ${err.message}`);
        return null;
    }
};

const buildScopeButtons = (interaction, activeCategory, scope) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ranking_scope:${SCOPES.GLOBAL}:${activeCategory}`)
            .setLabel(tFor(interaction, 'commands.ranking.scopeGlobal'))
            .setEmoji('<:earth:1536459925495087226>')
            .setStyle(scope === SCOPES.GLOBAL ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(scope === SCOPES.GLOBAL),
        new ButtonBuilder()
            .setCustomId(`ranking_scope:${SCOPES.SERVER}:${activeCategory}`)
            .setLabel(tFor(interaction, 'commands.ranking.scopeServer'))
            .setEmoji('<:saturn:1536459943480270959>')
            .setStyle(scope === SCOPES.SERVER ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(scope === SCOPES.SERVER)
    );
};

const buildCategoryMenu = (interaction, activeCategory, scope = SCOPES.GLOBAL) => {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`ranking_category_select:${scope}`)
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

const buildRankingPayload = async (interaction, category = DEFAULT_CATEGORY, requestedScope = SCOPES.GLOBAL) => {
    const lang = getUserLanguage(interaction.user.id);
    const meta = CATEGORY_META[category] ?? CATEGORY_META[DEFAULT_CATEGORY];
    const activeCategory = CATEGORY_META[category] ? category : DEFAULT_CATEGORY;
    // Fora de servidor (DM) não existe "este servidor".
    const scope = interaction.guildId && requestedScope === SCOPES.SERVER ? SCOPES.SERVER : SCOPES.GLOBAL;
    const guildId = scope === SCOPES.SERVER ? interaction.guildId : null;

    const rows = getLeaderboard(activeCategory, 10, guildId);

    const scopeLabel = tFor(interaction, scope === SCOPES.SERVER ? 'commands.ranking.scopeServer' : 'commands.ranking.scopeGlobal');
    const header = new TextDisplayBuilder().setContent(
        `# <:sunglasses:1536248455519801386> ${tFor(interaction, 'commands.ranking.title')} · ${scopeLabel}\n` +
        `${meta.headerEmoji} **${tFor(interaction, `commands.ranking.categories.${activeCategory}`)}** — ${tFor(interaction, `commands.ranking.categoryDesc.${activeCategory}`)}`
    );

    let bodyContent;
    let podiumBuffer = null;

    if (!rows.length) {
        bodyContent = `<:hmm:1536247599365890139> ${tFor(interaction, 'commands.ranking.empty')}`;
    } else {
        const names = await Promise.all(rows.map((row) => resolveDisplayName(interaction.client, row.userId, lang)));

        const lines = rows.map((row, index) => {
            const place = formatPlace(index);
            return `${place} **${names[index]}** — \`${meta.format(row.value, lang)}\``;
        });

        bodyContent = lines.join('\n');

        // Pódio (top 3) com a foto de cada um.
        const top3 = rows.slice(0, 3);
        const avatarBuffers = await Promise.all(top3.map((row) => fetchAvatarBuffer(interaction.client, row.userId)));
        const entriesByRank = {};
        avatarBuffers.forEach((avatarBuffer, index) => {
            entriesByRank[index + 1] = { avatarBuffer };
        });

        podiumBuffer = composeRankingPodium(entriesByRank);
    }

    const rankInfo = getLeaderboardRank(activeCategory, interaction.user.id, guildId);
    const positionText = rankInfo?.position
        ? `#${rankInfo.position} — \`${meta.format(rankInfo.value, lang)}\``
        : tFor(interaction, 'commands.ranking.notRanked');

    const footerText = new TextDisplayBuilder().setContent(
        `-# <:registry:1536459835921530890> ${tFor(interaction, 'commands.ranking.yourPosition')}: ${positionText}\n` +
        `-# ${tFor(interaction, 'commands.ranking.footer')}`
    );

    const bodyText = new TextDisplayBuilder().setContent(bodyContent);

    const files = [];
    let bodySection = null;
    if (podiumBuffer) {
        files.push({ attachment: podiumBuffer, name: PODIUM_ATTACHMENT_NAME });
        bodySection = new SectionBuilder()
            .addTextDisplayComponents(bodyText)
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${PODIUM_ATTACHMENT_NAME}`));
    }
    // Sem pódio, `Section` não pode ser usado: no Components V2 do Discord
    // o accessory (thumbnail/botão) é obrigatório em toda Section, e sem
    // pódio não temos imagem pra usar como accessory. Nesse caso o texto
    // vai direto no container, sem Section.

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(buildCategoryMenu(interaction, activeCategory, scope));

    if (interaction.guildId) {
        container.addActionRowComponents(buildScopeButtons(interaction, activeCategory, scope));
    }

    container.addSeparatorComponents(new SeparatorBuilder());

    if (bodySection) {
        container.addSectionComponents(bodySection);
    } else {
        container.addTextDisplayComponents(bodyText);
    }

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footerText);

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        // Sempre explícito: quando troca de categoria via select menu, isso
        // garante que o anexo antigo seja substituído (ou removido) em vez de
        // ficar "grudado" no editReply.
        files,
    };
};

module.exports = {
    // Reaproveitados pela API do site (utils/siteApi.js).
    CATEGORY_META,
    CATEGORY_ORDER,

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
        if (!interaction.customId.startsWith('ranking_category_select')) return false;

        await interaction.deferUpdate();
        const scope = interaction.customId.split(':')[1] ?? SCOPES.GLOBAL;
        const category = interaction.values[0];
        const payload = await buildRankingPayload(interaction, category, scope);
        await interaction.editReply(payload);
        return true;
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('ranking_scope:')) return false;

        await interaction.deferUpdate();
        const [, scope, category] = interaction.customId.split(':');
        const payload = await buildRankingPayload(interaction, category, scope);
        await interaction.editReply(payload);
        return true;
    },
};