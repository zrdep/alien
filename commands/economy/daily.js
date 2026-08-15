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
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const {
    getUserAlien,
    getUserLanguage,
    getUserCoins,
    getDailyState,
    claimDaily,
    addInventoryResources,
} = require('../../utils/db');
const { generateDailyCoins, generateDailyResources } = require('../../utils/coins');
const { formatDuration } = require('../../utils/exploration');
const { notifyAchievementsFollowUp } = require('../../utils/achievementNotifier');

const GIFT_IMAGE_NAME = 'gift_coins.png';
const GIFT_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', GIFT_IMAGE_NAME);

const DAILY_GUILD_ID = '1488000497658101923';
const DAILY_CHANNEL_ID = '1537511176324386917';

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('daily')
        .setNameLocalizations({ 'pt-BR': 'daily' })
        .setDescription('Claim your daily ∩oins reward (resets at 00:00)')
        .setDescriptionLocalizations({
            'pt-BR': 'Resgate sua recompensa diária de ∩oins (reseta às 00:00)',
        }),

    async execute(interaction) {
        const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
        const files = [];
        if (hasImage) {
            files.push({
                attachment: GIFT_IMAGE_PATH,
                name: GIFT_IMAGE_NAME,
            });
        }

        if (interaction.guildId !== DAILY_GUILD_ID) {
            const header = new TextDisplayBuilder().setContent(
                `# <:ovni:1536247726889762847> ${tFor(interaction, 'commands.daily.restrictedTitle')}`
            );

            const bodyText = new TextDisplayBuilder().setContent(
                tFor(interaction, 'commands.daily.restrictedBody')
            );

            let section;
            if (hasImage) {
                const thumbnail = new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`);
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

            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                files,
            });
            return;
        }

        const { payload, unlockedAchievements } = buildDailyResponse(interaction);
        await interaction.editReply(payload);
        await notifyAchievementsFollowUp(interaction, unlockedAchievements);
    },
};

// =============================================================================
// Lógica de reivindicação em si, reaproveitável fora do comando /daily —
// usada também pelo painel de daily do Support Bot (support_bot/events/
// ready.js + interactionCreate.js), que roda no MESMO processo e pode
// chamar isso direto, sem precisar "invocar" o comando do bot principal via
// Discord (o que não seria possível entre bots diferentes de qualquer jeito).
//
// Retorna `{ payload, unlockedAchievements }` em vez de enviar a resposta
// sozinha, porque quem chama pode precisar de `editReply` (comando, já
// deferido) OU `reply`/`editReply` depois de um `deferReply` manual (botão
// do painel) — cada chamador decide como entregar o `payload`.
// =============================================================================
const buildDailyResponse = (interaction, { ephemeral = false } = {}) => {
    const userId = interaction.user.id;
    const lang = getUserLanguage(userId);
    const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

    const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
    const files = [];
    if (hasImage) {
        files.push({ attachment: GIFT_IMAGE_PATH, name: GIFT_IMAGE_NAME });
    }

    const v2Flags = ephemeral
        ? (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral)
        : MessageFlags.IsComponentsV2;

    const alien = getUserAlien(userId);
    if (!alien) {
        const payload = {
            content: `<:alien:1536247533502734376> **${tFor(interaction, 'commands.planet.alienRequired')}**\n${tFor(interaction, 'commands.planet.alienRequiredTip')}`,
        };
        if (ephemeral) payload.flags = MessageFlags.Ephemeral;
        return { payload, unlockedAchievements: [] };
    }

    const state = getDailyState(userId);
    const resetFormatted = formatDuration(state.secondsUntilReset, lang);

    if (!state.canClaim) {
        const currentCoins = getUserCoins(userId);

        const header = new TextDisplayBuilder().setContent(
            `# <:dnd:1536247547193204766> ${tFor(interaction, 'commands.daily.alreadyClaimedTitle')}`
        );

        const bodyText = new TextDisplayBuilder().setContent(
            `${tFor(interaction, 'commands.daily.alreadyClaimedBody')}\n\n` +
            `**${tFor(interaction, 'commands.daily.balanceLabel')}**: \`${currentCoins.toLocaleString(numLoc)}\` ∩oins\n` +
            `**${tFor(interaction, 'commands.daily.streakLabel')}**: \`${state.currentStreak}\` <:passionate:1536247742110634034>\n\n` +
            `<:saturn:1536459943480270959> ${tFor(interaction, 'commands.daily.nextResetLabel', { time: resetFormatted })}`
        );

        let section;
        if (hasImage) {
            const thumbnail = new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`);
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

        return {
            payload: { flags: v2Flags, components: [container], files },
            unlockedAchievements: [],
        };
    }

    // Generate daily reward & claim
    const reward = generateDailyCoins(state.nextStreak);
    const dailyResources = generateDailyResources();

    const { streak, unlockedAchievements } = claimDaily(userId, state.today, reward.amount);
    addInventoryResources(userId, dailyResources.map(r => ({ key: r.key, amount: r.amount })));

    const totalCoins = getUserCoins(userId);

    const resourcesText = dailyResources
        .map(r => `${r.emoji} ${tFor(interaction, `commands.daily.resources.${r.key}`)} × ${r.amount}`)
        .join('\n');

    const streakBonusText = reward.streakBonus > 0
        ? ` (+${reward.streakBonus.toLocaleString(numLoc)} ${tFor(interaction, 'commands.daily.streakBonusLabel')})`
        : '';

    const header = new TextDisplayBuilder().setContent(
        `# <:excited:1536247579061256252> ${tFor(interaction, 'commands.daily.claimedTitle')}`
    );

    const bodyText = new TextDisplayBuilder().setContent(
        `${tFor(interaction, 'commands.daily.claimedBody', {
            emoji: reward.emoji,
            amount: reward.amount.toLocaleString(numLoc),
        })}${streakBonusText}\n\n` +
        `**${tFor(interaction, 'commands.daily.balanceLabel')}**: \`${totalCoins.toLocaleString(numLoc)}\` ∩oins\n` +
        `**${tFor(interaction, 'commands.daily.streakLabel')}**: \`${streak}\` <:passionate:1536247742110634034>\n\n` +
        `## <:passionate:1536247742110634034> **${tFor(interaction, 'commands.daily.resourcesTitle')}:**\n${resourcesText}\n\n` +
        `<:saturn:1536459943480270959> ${tFor(interaction, 'commands.daily.nextResetLabel', { time: resetFormatted })}`
    );

    let section;
    if (hasImage) {
        const thumbnail = new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`);
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

    return {
        payload: { flags: v2Flags, components: [container], files },
        unlockedAchievements,
    };
};

module.exports.buildDailyResponse = buildDailyResponse;
module.exports.DAILY_GUILD_ID = DAILY_GUILD_ID;
module.exports.DAILY_CHANNEL_ID = DAILY_CHANNEL_ID;
