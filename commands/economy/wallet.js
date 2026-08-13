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
    getUserLanguage,
    getUserCoins,
    getDailyState,
    getUserAlien,
} = require('../../utils/db');
const { formatDuration } = require('../../utils/exploration');

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

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            files,
        });
    },
};
