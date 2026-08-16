const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
} = require('discord.js');

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
        const isPt = lang === 'pt-BR';

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
                `${E_EXCITED} **${isPt ? 'Conquista desbloqueada!' : 'Achievement unlocked!'}**\n` +
                `${E_SUPPORT} **${name}**\n` +
                `> ${E_GOLD_COINS} +${formatNum(reward.coins, lang)} ∩oins`
            );
        } else if (inviteResult.status === 'not_verified') {
            blocks.push(
                isPt
                    ? `${E_HMM} *Ainda não encontramos nenhum servidor seu com o ∩lien adicionado. ` +
                      `Adicione o bot num servidor que você controla e rode \`/resgatar\` de novo!*`
                    : `${E_HMM} *We couldn't find any server of yours with ∩lien added yet. ` +
                      `Add the bot to a server you control and run \`/redeem\` again!*`
            );
        } else if (inviteResult.status === 'already_unlocked') {
            blocks.push(
                isPt
                    ? `${E_SUPPORT} *A conquista de convidar o bot já está desbloqueada — nada pendente aí.*`
                    : `${E_SUPPORT} *The invite-the-bot achievement is already unlocked — nothing pending there.*`
            );
        }

        // --- Bloco: presentes/recompensas genéricas --------------------------
        if (claimedRedeemables.length > 0) {
            let totalCoins = 0;
            const totalResources = new Map();
            const itemLines = claimedRedeemables.map((item) => {
                const title = isPt ? item.titlePt : item.titleEn;
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
                `${E_RAINBOW} **${isPt ? 'Presentes resgatados!' : 'Gifts redeemed!'}**\n\n` +
                itemLines.join('\n')
            );
        }

        // --- Nada pendente em geral -------------------------------------------
        if (!somethingHappened && inviteResult.status !== 'not_verified') {
            blocks.push(
                isPt
                    ? `${E_HMM} *Nada pra resgatar no momento. Volte aqui quando tiver algo novo!*`
                    : `${E_HMM} *Nothing to redeem right now. Check back when there's something new!*`
            );
        }

        const currentCoins = getUserCoins(userId);

        const header = new TextDisplayBuilder().setContent(
            `# ${somethingHappened ? E_EXCITED : E_SUNGLASSES} ${isPt ? 'Resgatar' : 'Redeem'}\n\n` +
            `${E_GOLD_COINS} **${isPt ? 'Saldo atual' : 'Current balance'}**: \`${formatNum(currentCoins, lang)}\` ∩oins`
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
