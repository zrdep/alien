const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const {
    getUserLanguage,
    getUserCoins,
    claimBotInviteAchievement,
    claimAllRedeemables,
} = require('../../utils/db');
const { getAchievement, RESOURCES } = require('../../gameConfig');

const E_EXCITED    = '<:excited:1536247579061256252>';
const E_SUNGLASSES = '<:sunglasses:1536248455519801386>';
const E_GOLD_COINS = '<:gold_coins:1536941656178298992>';
const E_COSMIC_PEARL = '<:cosmic_pearl:1536579648073371658>';
const E_HMM         = '<:hmm:1536247599365890139>';
const E_RAINBOW     = '<:rainbow:1536248394681552957>';
const E_SUPPORT     = '<:support:1536248470611173466>';

const RESOURCE_BY_KEY = new Map(RESOURCES.map((r) => [r.key, r]));

const formatNum = (n, lang) => (n ?? 0).toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');

const formatResourceList = (resources, lang) => {
    if (!resources?.length) return null;
    return resources.map((r) => {
        const res = RESOURCE_BY_KEY.get(r.key);
        const label = res ? `${res.emoji} ${res.name?.[lang] ?? res.name?.['pt-BR'] ?? r.key}` : r.key;
        return `\`${formatNum(r.amount, lang)}\`x ${label}`;
    }).join(' + ');
};

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('redeem')
        .setNameLocalizations({ 'pt-BR': 'resgatar' })
        .setDescription('Redeem pending achievements, gifts, and rewards')
        .setDescriptionLocalizations({
            'pt-BR': 'Resgate conquistas pendentes, presentes e recompensas',
        }),

    async execute(interaction) {
        const userId = interaction.user.id;
        const lang = getUserLanguage(userId);

        // === 1. Conquista de convidar o bot =================================
        const inviteResult = claimBotInviteAchievement(userId);
        const inviteAchievement = getAchievement('invite_bot_1');

        // === 2. Presentes/recompensas genéricas pendentes ====================
        const claimedRedeemables = claimAllRedeemables(userId);

        const somethingHappened =
            inviteResult.status === 'unlocked' || claimedRedeemables.length > 0;

        const blocks = [];

        // --- Bloco: conquista de convite ------------------------------------
        if (inviteResult.status === 'unlocked') {
            const unlock = inviteResult.unlockedAchievements.find(
                (u) => u.achievement.id === 'invite_bot_1'
            );
            const reward = unlock?.appliedReward ?? { coins: inviteAchievement?.reward?.coins ?? 0, resources: [] };
            const name = inviteAchievement?.name?.[lang] ?? inviteAchievement?.name?.['pt-BR'] ?? 'invite_bot_1';

            blocks.push(
                `${E_EXCITED} **${tFor(interaction, 'commands.redeem.achievementUnlocked')}**\n` +
                `${E_SUPPORT} **${name}**\n` +
                `> ${E_GOLD_COINS} +${formatNum(reward.coins, lang)} ∩oins`
            );
        } else if (inviteResult.status === 'not_verified') {
            blocks.push(
                `${E_HMM} *${tFor(interaction, 'commands.redeem.inviteNotVerified')}*`
            );
        }
        // 'already_unlocked': não mostra nada — quem já tem a conquista não
        // precisa ser lembrado disso toda vez que resgata algo.

        // --- Bloco: presentes/recompensas genéricas --------------------------
        if (claimedRedeemables.length > 0) {
            let totalCoins = 0;
            const totalResources = new Map();
            const itemLines = claimedRedeemables.map((item) => {
                const title = lang === 'en-US' ? item.titleEn : item.titlePt;
                const parts = [];
                if (item.coins > 0) {
                    totalCoins += item.coins;
                    parts.push(`${E_GOLD_COINS} +${formatNum(item.coins, lang)} ∩oins`);
                }
                if (item.resources?.length) {
                    for (const r of item.resources) {
                        totalResources.set(r.key, (totalResources.get(r.key) ?? 0) + r.amount);
                    }
                    parts.push(formatResourceList(item.resources, lang));
                }
                return `${E_COSMIC_PEARL} **${title}**\n> ${parts.join(' + ')}`;
            });

            blocks.push(
                `${E_RAINBOW} **${tFor(interaction, 'commands.redeem.giftsRedeemed')}**\n\n` +
                itemLines.join('\n')
            );
        }

        // --- Nada pendente em geral -------------------------------------------
        if (!somethingHappened && inviteResult.status !== 'not_verified') {
            blocks.push(
                `${E_HMM} *${tFor(interaction, 'commands.redeem.nothingToRedeem')}*`
            );
        }

        const currentCoins = getUserCoins(userId);

        const header = new TextDisplayBuilder().setContent(
            `# ${somethingHappened ? E_EXCITED : E_SUNGLASSES} ${tFor(interaction, 'commands.redeem.title')}\n\n` +
            `${E_GOLD_COINS} **${tFor(interaction, 'commands.redeem.balanceLabel')}**: \`${formatNum(currentCoins, lang)}\` ∩oins`
        );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(new SeparatorBuilder());

        for (let i = 0; i < blocks.length; i++) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(blocks[i]));
            if (i !== blocks.length - 1) {
                container.addSeparatorComponents(new SeparatorBuilder());
            }
        }

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    },
};
