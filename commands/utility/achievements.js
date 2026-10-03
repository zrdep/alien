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

const { t, tFor } = require('../../utils/i18n');
const {
    getUserLanguage,
    getUserAlien,
    getAchievementCurrentStat,
    getUserAchievements,
    getEquippedHat,
    BOT_INVITE_ACHIEVEMENT_ID,
} = require('../../utils/db');
const {
    listAchievementsSorted,
    getRarityEmoji,
    getRarityLabelKey,
    RARITY_ORDER,
    getHat,
    RESOURCES,
    getAchievement,
} = require('../../gameConfig');
const { composeAlienWithHat } = require('../../utils/hatImage');

const ALIEN_IMAGES_DIR = path.join(__dirname, '..', '..', 'images', 'aliens');
const ALIEN_COLORS = {
    purple: 'purple.png',
    green: 'green.png',
    blue: 'blue.png',
    pink: 'pink.png',
    orange: 'orange.png',
};

const COMPOSED_ALIEN_HAT_NAME = 'ach_alien_hat.png';

// ===========================
// EMOJIS TODOS DO BOT (apenas <:nome:id> do docs/emojisNome.txt)
// ===========================
const E_EXCITED     = '<:excited:1536247579061256252>';
const E_GOLD_COINS  = '<:gold_coins:1536941656178298992>';
const E_BAG_COINS   = '<:bag_coins:1536941656178298992>';
const E_OVNI        = '<:ovni:1536247726889762847>';
const E_ASTEROID    = '<:asteroid:1536459906973171782>';
const E_ROCK        = '<:rock:1536579687407681596>';
const E_CONFIG      = '<:config:1536247533502734376>';
const E_REGISTRY    = '<:registry:1536459835921530890>';
const E_BOOK        = '<:book:1536247508181848134>';
const E_BOOK2       = '<:book2:1536459861527756952>';
const E_SATURN      = '<:saturn:1536459943480270959>';
const E_PASSIONATE  = '<:passionate:1536247742110634034>';
const E_ONLINE      = '<:online:1536247711169249391>';
const E_IDLE        = '<:idle:1536247613681176616>';
const E_DND         = '<:dnd:1536247547193204766>';
const E_HMM         = '<:hmm:1536247599365890139>';
const E_RAINBOW     = '<:rainbow:1536248394681552957>';
const E_SUNGLASSES  = '<:sunglasses:1536248455519801386>';
const E_SETTINGS    = '<:settings:1536248422686920704>';
const E_EARTH       = '<:earth:1536459925495087226>';
const E_COSMIC_PEARL= '<:cosmic_pearl:1536579648073371658>';
const E_PING        = '<:ping:1536248338108911626>';

const E_UNLOCKED    = E_ONLINE;       // online = "feito", "concluído"
const E_LOCKED      = E_DND;          // dnd = "bloqueado", "não disponível"
const E_DIAMOND     = E_COSMIC_PEARL; // pérola cósmica = recompensa
const E_PAGE        = E_BOOK2;        // livro 2 = "página"
const E_SHOP_BUY    = E_CONFIG;       // config = loja (já usado com esse sentido no profile)
const E_SHOP_SELL   = E_REGISTRY;     // registry = vender p/ sistema
const E_FILTER      = E_SETTINGS;     // settings = filtro
const E_LIST_TAB    = E_BOOK;         // book = lista / categoria

const RESOURCE_BY_KEY = new Map(RESOURCES.map((r) => [r.key, r]));

// ===========================
// CATEGORIES — todos os emojis do bot
// ===========================
const CATEGORIES = [
    {
        key: 'all',
        emoji: E_RAINBOW,
        filter: () => true,
    },
    {
        key: 'unlocked',
        emoji: E_UNLOCKED,
        filter: (a, unlocked) => unlocked.has(a.id),
    },
    {
        key: 'locked',
        emoji: E_LOCKED,
        filter: (a, unlocked) => !unlocked.has(a.id),
    },
    {
        key: 'market_sell',
        emoji: E_REGISTRY,
        filter: (a) => a.type === 'market_global_sold_count' || a.type === 'market_global_sold_revenue',
    },
    {
        key: 'market_buy',
        emoji: E_OVNI,
        filter: (a) => a.type === 'market_global_bought_count' || a.type === 'market_global_bought_spent',
    },
    {
        key: 'shop',
        emoji: E_CONFIG,
        filter: (a) => a.type === 'shop_bought_count' || a.type === 'shop_sold_count',
    },
    {
        key: 'explore',
        emoji: E_SATURN,
        filter: (a) =>
            a.type === 'planets_seen' || a.type === 'trips_completed' ||
            a.type === 'resources_collected' || a.type === 'distance_traveled_km',
    },
    {
        key: 'daily',
        emoji: E_ONLINE,
        filter: (a) => a.type === 'daily_streak',
    },
    {
        key: 'craft',
        emoji: E_BOOK,
        filter: (a) => a.type === 'craft_completed',
    },
    ...RARITY_ORDER.map((r) => ({
        key: `rarity_${r}`,
        emoji: getRarityEmoji(r),
        // Nome vem do i18n na hora de exibir (ver getCategoryName).
        rarityCode: r,
        filter: (a) => a.rarity === r,
    })),
];

// Label traduzido da raridade (ex: "Raro" / "Rare"), vindo de
// locales/*.json — as raridades não têm nome próprio em gameConfig.
const getRarityName = (lang, code) => t(lang, getRarityLabelKey(code));

const getCategoryName = (category, lang) => {
    if (category.rarityCode) {
        return `${t(lang, 'commands.planet.rarityLabel')} ${category.rarityCode} — ${getRarityName(lang, category.rarityCode)}`;
    }
    return t(lang, `commands.achievements.categories.${category.key}`);
};

const ACHIEVEMENTS_PER_PAGE = 6;

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

const formatNum = (n, lang) => (n ?? 0).toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');

const parseCustomEmoji = (emojiString) => {
    const match = /^<a?:(\w+):(\d+)>$/.exec(emojiString ?? '');
    if (!match) return undefined;
    return { id: match[2], name: match[1] };
};

const buildAchievementBlock = (achievement, unlocked, current, lang) => {
    const name = achievement.name?.[lang] ?? achievement.name?.['pt-BR'] ?? achievement.id;
    const description = achievement.description?.[lang] ?? achievement.description?.['pt-BR'] ?? '';
    const rarityEmoji = getRarityEmoji(achievement.rarity);
    const rarityName = getRarityName(lang, achievement.rarity);
    const rarityWord = t(lang, 'commands.planet.rarityLabel');

    const statusIcon = unlocked ? E_UNLOCKED : E_IDLE;
    const statusLabel = unlocked
        ? t(lang, 'commands.achievements.statusUnlocked')
        : t(lang, 'commands.achievements.statusInProgress');

    const threshold = achievement.threshold;
    const pct = Math.max(0, Math.min(100, Math.floor((current / threshold) * 100)));
    const progressText = unlocked
        ? `\`100%\` ${statusLabel}`
        : `\`${pct}%\` (${formatNum(current, lang)} / ${formatNum(threshold, lang)}) — ${statusLabel}`;

    const rewardLines = [];
    if (achievement.reward?.coins > 0) {
        const coinsLabel = t(lang, 'commands.achievements.coinsReward');
        rewardLines.push(`${E_GOLD_COINS} **${coinsLabel}**: \`${formatNum(achievement.reward.coins, lang)}\` ∩oins`);
    }
    if (achievement.reward?.resources?.length) {
        const parts = achievement.reward.resources.map((r) => {
            const res = RESOURCE_BY_KEY.get(r.key);
            const label = res
                ? `${res.emoji} ${res.name?.[lang] ?? res.name?.['pt-BR'] ?? r.key}`
                : r.key;
            return `\`${formatNum(r.amount, lang)}\`x ${label}`;
        });
        const resourcesLabel = t(lang, 'commands.achievements.resourcesReward');
        rewardLines.push(`${E_DIAMOND} **${resourcesLabel}**: ${parts.join(' + ')}`);
    }

    return `${statusIcon} ${rarityEmoji} ${achievement.emoji} **${name}** *(${rarityWord} ${achievement.rarity} — ${rarityName})*\n` +
        `> ${description}\n` +
        `> ${progressText}\n` +
        (rewardLines.length ? rewardLines.map((l) => `> ${l}`).join('\n') + '\n' : '');
};

// O dono das conquistas exibidas (que pode ser OUTRO usuário, via opção
// `user`) vai embutido no customId dos componentes — sem isso, trocar filtro
// ou página voltava a mostrar as conquistas de quem clicou.
const buildCategoryMenu = (interaction, targetUserId, activeKey, lang) => {

    const options = CATEGORIES.map((c) => ({
        label: getCategoryName(c, lang),
        value: c.key,
        emoji: parseCustomEmoji(c.emoji),
        default: c.key === activeKey,
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`achievements_category_pick:${targetUserId}`)
            .setPlaceholder(t(lang, 'commands.achievements.filterPlaceholder'))
            .addOptions(options)
    );
};

const buildPaginationRow = (interaction, targetUserId, categoryKey, page, totalPages) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`achievements_page:${targetUserId}:${categoryKey}:${page - 1}`)
            .setLabel(tFor(interaction, 'commands.achievements.previousPage'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId('achievements_page_info')
            .setLabel(`${page}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`achievements_page:${targetUserId}:${categoryKey}:${page + 1}`)
            .setLabel(tFor(interaction, 'commands.achievements.nextPage'))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)
    );
};

const buildAchievementsView = (interaction, userId, categoryKey, page) => {
    const lang = getUserLanguage(interaction.user.id);
    const ta = (key) => t(lang, `commands.achievements.${key}`);
    const txt = {
        title: ta('title'),
        filterTitle: ta('filterTitle'),
        progressHeader: ta('progressHeader'),
        noneFound: `${E_HMM} *${ta('noneFound')}*`,
        pageLabel: ta('pageLabel'),
        of: ta('pageOf'),
    };

    const unlockedSet = new Set(getUserAchievements(userId).map((a) => a.achievementId));
    const all = listAchievementsSorted();
    const category = CATEGORY_BY_KEY.get(categoryKey) ?? CATEGORIES[0];
    const filtered = all.filter((a) => category.filter(a, unlockedSet));

    const totalPages = Math.max(1, Math.ceil(filtered.length / ACHIEVEMENTS_PER_PAGE));
    const safePage = Math.min(totalPages, Math.max(1, page));
    const startIdx = (safePage - 1) * ACHIEVEMENTS_PER_PAGE;
    const pageItems = filtered.slice(startIdx, startIdx + ACHIEVEMENTS_PER_PAGE);

    const unlockedCount = all.filter((a) => unlockedSet.has(a.id)).length;
    const overallPct = all.length > 0 ? Math.floor((unlockedCount / all.length) * 100) : 0;
    const filteredUnlocked = filtered.filter((a) => unlockedSet.has(a.id)).length;
    const filteredPct = filtered.length > 0 ? Math.floor((filteredUnlocked / filtered.length) * 100) : 0;

    const header = new TextDisplayBuilder().setContent(
        `# ${E_SUNGLASSES} ${txt.title}\n\n` +
        `${E_RAINBOW} **${txt.progressHeader}**: \`${unlockedCount}/${all.length}\` (\`${overallPct}%\` ${ta('unlockedWord')})\n` +
        `${E_FILTER} **${txt.filterTitle}**: ${category.emoji} ${getCategoryName(category, lang)} ` +
        `— \`${filteredUnlocked}/${filtered.length}\` (\`${filteredPct}%\`)` +
        (filtered.length > 0 ? `\n${E_PAGE} **${txt.pageLabel}** \`${safePage}\` ${txt.of} \`${totalPages}\`` : '')
    );

    const blocks = pageItems.map((a) => {
        const current = getAchievementCurrentStat(userId, a.type);
        return buildAchievementBlock(a, unlockedSet.has(a.id), current, lang);
    });

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder());

    // =====================================================================
    // DESTAQUE: conquista de convidar o bot, se ainda não feita ------------
    // Só aparece quando o próprio usuário roda /conquistas pra si mesmo
    // (não faz sentido mandar OUTRA pessoa rodar /resgatar). Fica logo
    // depois do header, antes de qualquer filtro/página, de propósito —
    // pra ser a primeira coisa visível.
    // =====================================================================
    if (userId === interaction.user.id && !unlockedSet.has(BOT_INVITE_ACHIEVEMENT_ID)) {
        const inviteAchievement = getAchievement(BOT_INVITE_ACHIEVEMENT_ID);
        if (inviteAchievement) {
            let clientId = null;
            try {
                clientId = require('../../config.json').clientId;
            } catch {
                clientId = null;
            }
            const inviteLink = clientId
                ? `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=2147863680&integration_type=0&scope=bot+applications.commands`
                : null;

            const rewardCoins = inviteAchievement.reward?.coins ?? 0;
            const highlightText =
                `${E_EXCITED} **${ta('inviteHighlightTitle')}**\n` +
                `${inviteAchievement.emoji} **${inviteAchievement.name[lang] ?? inviteAchievement.name['pt-BR']}** — ${inviteAchievement.description[lang] ?? inviteAchievement.description['pt-BR']}\n` +
                `${E_GOLD_COINS} ${ta('inviteReward')}: \`${formatNum(rewardCoins, lang)}\` ∩oins\n` +
                (inviteLink ? `> [${ta('inviteLink')}](${inviteLink})\n` : '') +
                `> ${ta('inviteHowTo')}`;

            container
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(highlightText))
                .addSeparatorComponents(new SeparatorBuilder());
        }
    }

    // Thumbnail com alien + chapéu, se existir
    const files = [];
    const alien = getUserAlien(userId);
    const equippedHatKey = getEquippedHat(userId);
    const equippedHat = equippedHatKey ? getHat(equippedHatKey) : null;

    let thumbUrl = null;
    if (alien?.color && ALIEN_COLORS[alien.color]) {
        const alienFile = ALIEN_COLORS[alien.color];
        const alienFullPath = path.join(ALIEN_IMAGES_DIR, alienFile);

        if (equippedHat && fs.existsSync(alienFullPath)) {
            const composedBuffer = composeAlienWithHat(alienFile, equippedHat.file);
            if (composedBuffer) {
                thumbUrl = `attachment://${COMPOSED_ALIEN_HAT_NAME}`;
                files.push({ attachment: composedBuffer, name: COMPOSED_ALIEN_HAT_NAME });
            }
        }

        if (!thumbUrl && fs.existsSync(alienFullPath)) {
            thumbUrl = `attachment://${alienFile}`;
            files.push({ attachment: alienFullPath, name: alienFile });
        }
    }

    if (thumbUrl) {
        const displayName = alien?.name ?? t(lang, 'commands.alien.defaultName');
        const thumbHeaderLine = new TextDisplayBuilder().setContent(
            `${E_EXCITED} ${ta('profileOf')} \`${displayName}\``
        );
        const section = new SectionBuilder()
            .addTextDisplayComponents(thumbHeaderLine)
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl));
        container.addSectionComponents(section);
        container.addSeparatorComponents(new SeparatorBuilder());
    }

    if (blocks.length === 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(txt.noneFound));
    } else {
        for (let i = 0; i < blocks.length; i++) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(blocks[i]));
            if (i !== blocks.length - 1) {
                container.addSeparatorComponents(new SeparatorBuilder());
            }
        }
    }

    container.addActionRowComponents(buildCategoryMenu(interaction, userId, category.key, lang));

    if (totalPages > 1) {
        container.addActionRowComponents(buildPaginationRow(interaction, userId, category.key, safePage, totalPages));
    }

    return {
        flags: MessageFlags.IsComponentsV2,
        content: '',
        components: [container],
        files,
    };
};

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('achievements')
        .setNameLocalizations({ 'pt-BR': 'conquistas' })
        .setDescription('View all achievements and your progress toward them')
        .setDescriptionLocalizations({
            'pt-BR': 'Veja todas as conquistas e seu progresso nelas',
        })
        .addUserOption((option) =>
            option
                .setName('user')
                .setNameLocalizations({ 'pt-BR': 'usuario' })
                .setDescription('User to check achievements for (defaults to you)')
                .setDescriptionLocalizations({
                    'pt-BR': 'Usuário para ver conquistas (padrão: você)',
                })
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') ?? interaction.user;
        const view = buildAchievementsView(interaction, targetUser.id, 'all', 1);
        await interaction.editReply(view);
    },

    async handleSelectMenu(interaction) {
        if (!interaction.customId.startsWith('achievements_category_pick')) return false;
        // Mensagens antigas (antes do dono ir no customId) caem no próprio usuário.
        const targetUserId = interaction.customId.split(':')[1] || interaction.user.id;
        const categoryKey = interaction.values[0];
        const view = buildAchievementsView(interaction, targetUserId, categoryKey, 1);
        await interaction.update(view);
        return true;
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('achievements_page:')) return false;
        const [, targetUserId, categoryKey, pageStr] = interaction.customId.split(':');
        const page = parseInt(pageStr, 10) || 1;
        const view = buildAchievementsView(interaction, targetUserId, categoryKey, page);
        await interaction.update(view);
        return true;
    },
};
