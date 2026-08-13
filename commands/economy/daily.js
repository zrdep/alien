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

const GIFT_IMAGE_NAME = 'gift_coins.png';
const GIFT_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', GIFT_IMAGE_NAME);

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
        const userId = interaction.user.id;
        const lang = getUserLanguage(userId);
        const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

        const alien = getUserAlien(userId);
        if (!alien) {
            await interaction.editReply({
                content: `<:alien:1536247533502734376> **${tFor(interaction, 'commands.planet.alienRequired')}**\n${tFor(interaction, 'commands.planet.alienRequiredTip')}`,
            });
            return;
        }

        const state = getDailyState(userId);
        const resetFormatted = formatDuration(state.secondsUntilReset, lang);

        const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
        const files = [];
        if (hasImage) {
            files.push({
                attachment: GIFT_IMAGE_PATH,
                name: GIFT_IMAGE_NAME,
            });
        }

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

            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
                files,
            });
            return;
        }

        // Generate daily reward & claim
        const reward = generateDailyCoins(state.nextStreak);
        const dailyResources = generateDailyResources();

        const { streak } = claimDaily(userId, state.today, reward.amount);
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

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            files,
        });
    },
};
