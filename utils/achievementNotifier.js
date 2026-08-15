// =============================================================================
// NOTIFICAÇÃO DE CONQUISTA DESBLOQUEADA
// =============================================================================
// Constrói um payload em Message Components V2 (ephemeral) que pode ser:
//   - Devolvido direto pro editReply se a reply principal ainda não for enviada
//   - Enviado via `interaction.followUp({ ..., ephemeral: true })` depois do reply
// =============================================================================

const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
} = require('discord.js');

const { getUserLanguage } = require('./db');
const { getRarityEmoji, getRarity, RESOURCES } = require('../gameConfig');

const EMOJI_SUNGLASSES = '<:sunglasses:1536248455519801386>';
const EMOJI_EXCITED = '<:excited:1536247579061256252>';
const EMOJI_GOLD_COINS = '<:gold_coins:1536941656178298992>';
const EMOJI_COSMIC_PEARL = '<:cosmic_pearl:1536579648073371658>';
const EMOJI_RAINBOW = '<:rainbow:1536248394681552957>';
const EMOJI_PASSIONATE = '<:passionate:1536247742110634034>';

const RESOURCE_BY_KEY = new Map(RESOURCES.map((r) => [r.key, r]));

const formatNum = (n, lang) => (n ?? 0).toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');

/**
 * Recebe uma lista retornado pelo db.checkAchievementsForUser():
 *   [{ achievement, appliedReward: { coins, resources } }]
 * Retorna um payload `{ content, components, flags, files }` pronto para ser
 * enviado via editReply / followUp / reply.
 *
 * Se a lista for vazia retorna `null` (não há nada a notificar).
 */
const buildAchievementUnlockPayload = (interaction, unlocks) => {
    if (!unlocks || unlocks.length === 0) return null;

    const lang = getUserLanguage(interaction.user.id);
    const isPt = lang === 'pt-BR';
    const numLoc = isPt ? 'pt-BR' : 'en-US';

    const onlyOne = unlocks.length === 1;
    const headerTitle = onlyOne
        ? (isPt ? 'Conquista desbloqueada!' : 'Achievement unlocked!')
        : (isPt ? 'Várias conquistas desbloqueadas!' : 'Multiple achievements unlocked!');

    const header = new TextDisplayBuilder().setContent(
        `# ${EMOJI_SUNGLASSES} ${headerTitle}\n\n` +
        `${EMOJI_PASSIONATE} ${isPt
            ? 'Parabéns, você bateu uma meta e ganhou recompensas!'
            : 'Congrats, you hit a goal and earned rewards!'} ` +
        '`' + unlocks.length + '` ' + (isPt ? 'conquista(s)' : 'achievement(s)')
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder());

    const totalLines = [];
    let totalCoins = 0;
    const totalResources = new Map();

    for (let i = 0; i < unlocks.length; i++) {
        const { achievement, appliedReward } = unlocks[i];

        const name = achievement.name?.[lang] ?? achievement.name?.['pt-BR'] ?? achievement.id;
        const description = achievement.description?.[lang] ?? achievement.description?.['pt-BR'] ?? '';
        const rarityEmoji = getRarityEmoji(achievement.rarity);
        const rarityObj = getRarity(achievement.rarity);
        const rarityName = rarityObj?.name?.[lang] ?? rarityObj?.name?.['pt-BR'] ?? achievement.rarity;

        const reward = appliedReward ?? { coins: achievement.reward?.coins ?? 0, resources: achievement.reward?.resources ?? [] };
        const rewardLines = [];
        if (reward.coins > 0) {
            totalCoins += reward.coins;
            rewardLines.push(`${EMOJI_GOLD_COINS} +${formatNum(reward.coins, lang)} ∩oins`);
        }
        if (reward.resources?.length) {
            for (const r of reward.resources) {
                const res = RESOURCE_BY_KEY.get(r.key);
                const label = res
                    ? `${res.emoji} ${res.name?.[lang] ?? res.name?.['pt-BR'] ?? r.key}`
                    : r.key;
                rewardLines.push(`${label} +${formatNum(r.amount, lang)}`);
                const prev = totalResources.get(r.key) ?? 0;
                totalResources.set(r.key, prev + r.amount);
            }
        }

        const blockText =
            `${rarityEmoji} ${achievement.emoji} **${name}** *(Raridade ${achievement.rarity} — ${rarityName})*\n` +
            `> ${description}\n` +
            (rewardLines.length ? `> ${EMOJI_RAINBOW} Recompensas:\n> ${rewardLines.join('\n> ')}\n` : '');

        totalLines.push(blockText);
    }

    for (let i = 0; i < totalLines.length; i++) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(totalLines[i]));
        if (i !== totalLines.length - 1) {
            container.addSeparatorComponents(new SeparatorBuilder());
        }
    }

    // === TOTAL ===
    if (unlocks.length > 1) {
        const totalItems = [];
        if (totalCoins > 0) {
            totalItems.push(`${EMOJI_GOLD_COINS} **Total coins**: \`${formatNum(totalCoins, lang)}\` ∩oins`);
        }
        if (totalResources.size > 0) {
            const parts = [];
            for (const [k, v] of totalResources) {
                const res = RESOURCE_BY_KEY.get(k);
                const label = res
                    ? `${res.emoji} ${res.name?.[lang] ?? res.name?.['pt-BR'] ?? k}`
                    : k;
                parts.push(`\`${formatNum(v, lang)}\`x ${label}`);
            }
            totalItems.push(`${EMOJI_COSMIC_PEARL} **Total recursos**: ${parts.join(' + ')}`);
        }
        if (totalItems.length) {
            container
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${EMOJI_EXCITED} **${isPt ? 'TOTAL DAS CONQUISTAS (já creditado!)' : 'ACHIEVEMENT TOTAL (already credited!)'}**\n\n` +
                    totalItems.join('\n')
                ));
        }
    }

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container],
        files: [],
    };
};

/**
 * Encapsula o envio via followUp se houver conquistas novas.
 * Use sempre que o comando já fez `editReply` e agora quer anexar
 * um aviso de conquista (exatamente o cenário do /daily / /market / /craft).
 *
 * Retorna `true` se a notificação foi enviada, `false` se não havia nada.
 */
const notifyAchievementsFollowUp = async (interaction, unlocks) => {
    const payload = buildAchievementUnlockPayload(interaction, unlocks);
    if (!payload) return false;
    try {
        await interaction.followUp(payload);
        return true;
    } catch (err) {
        // Se falhar, loga mas não deixa o comando quebrar
        const logger = require('./logger');
        logger.warn(`Falha ao enviar follow-up de conquista para ${interaction.user.id}: ${err.message}`);
        return false;
    }
};

module.exports = {
    buildAchievementUnlockPayload,
    notifyAchievementsFollowUp,
};
