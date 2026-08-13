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
    getUserAlien,
    getUserShip,
    getUserCoins,
    getUserProfileStats,
} = require('../../utils/db');
const { formatDistance, formatCount } = require('../../utils/statsFormatter');

const ALIEN_IMAGES_DIR = path.join(__dirname, '..', '..', 'images', 'aliens');

const ALIEN_COLORS = {
    purple: 'purple.png',
    green: 'green.png',
    blue: 'blue.png',
    pink: 'pink.png',
    orange: 'orange.png',
};

const EASTER_EGG_LINES = [
    'psst... você sabia que já explorei **infinitos planetas** antes de você chegar? Perdi a conta.',
    'hm... me procurando? *ajusta os óculos imaginários*',
    'meu segredo? eu só finjo não entender humanos.',
    'olá! você sabia que sou feito de puro código e **muito café espacial**?',
    'você quis saber sobre mim? que raro. geralmente sou eu quem fica curioso sobre humanos.',
    'ei, não sou um alien qualquer. sou o **alien** do bot. tem diferença.',
    '<:dnd:1536247547193204766> ATENÇÃO: perfil classificado. acesso autorizado. *bip boop*',
];

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('profile')
        .setNameLocalizations({ 'pt-BR': 'profile' })
        .setDescription("View your or another user's ∩lien profile and stats")
        .setDescriptionLocalizations({
            'pt-BR': 'Veja o seu perfil ou o de outro usuário no ∩lien',
        })
        .addUserOption((option) =>
            option
                .setName('user')
                .setNameLocalizations({ 'pt-BR': 'user' })
                .setDescription('User to check profile for (mention or ID)')
                .setDescriptionLocalizations({
                    'pt-BR': 'Usuário para ver o perfil (menção ou ID)',
                })
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') ?? interaction.user;
        const isSelf = targetUser.id === interaction.user.id;
        const lang = getUserLanguage(interaction.user.id);
        const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

        // === Bot guard: bots don't have profiles ===
        if (targetUser.bot) {
            const botText = new TextDisplayBuilder().setContent(
                `<:dnd:1536247547193204766> **${tFor(interaction, 'commands.profile.botTitle')}**\n\n` +
                `<:hmm:1536247599365890139> ${tFor(interaction, 'commands.profile.botBody', { user: targetUser.username })}`
            );
            const botContainer = new ContainerBuilder().addTextDisplayComponents(botText);
            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [botContainer],
                files: [],
            });
            return;
        }

        const alien = getUserAlien(targetUser.id);
        const ship = getUserShip(targetUser.id);
        const coins = getUserCoins(targetUser.id);
        const stats = getUserProfileStats(targetUser.id);

        const alienName = alien?.name ?? tFor(interaction, 'commands.alien.defaultName');
        const formattedDistance = formatDistance(stats.distanceTraveledKm, lang);
        const formattedPlanets = formatCount(stats.planetsSeen, lang);
        const formattedTrips = formatCount(stats.tripsCompleted, lang);
        const formattedResources = formatCount(stats.totalResourcesCollected, lang);
        const formattedCoins = coins.toLocaleString(numLoc);

        const header = new TextDisplayBuilder().setContent(
            `# <:excited:1536247579061256252> ${
                isSelf
                    ? tFor(interaction, 'commands.profile.myTitle')
                    : tFor(interaction, 'commands.profile.userTitle', { user: targetUser.username })
            }`
        );

        const mainInfoText = new TextDisplayBuilder().setContent(
            `<:ovni:1536247726889762847> **${tFor(interaction, 'commands.profile.alienLabel')}**: \`${alienName}\`\n` +
            `<:gold_coins:1536941656178298992> **${tFor(interaction, 'commands.profile.coinsLabel')}**: \`${formattedCoins}\` ∩oins`
        );

        // Check alien image attachment
        const files = [];
        let thumbnailFilename = null;
        if (alien?.color && ALIEN_COLORS[alien.color]) {
            const fileName = ALIEN_COLORS[alien.color];
            const fullPath = path.join(ALIEN_IMAGES_DIR, fileName);
            if (fs.existsSync(fullPath)) {
                thumbnailFilename = fileName;
                files.push({
                    attachment: fullPath,
                    name: fileName,
                });
            }
        }

        let mainSection;
        if (thumbnailFilename) {
            const thumbnail = new ThumbnailBuilder().setURL(`attachment://${thumbnailFilename}`);
            mainSection = new SectionBuilder()
                .addTextDisplayComponents(mainInfoText)
                .setThumbnailAccessory(thumbnail);
        } else {
            mainSection = new SectionBuilder().addTextDisplayComponents(mainInfoText);
        }

        const statsText = new TextDisplayBuilder().setContent(
            `## <:saturn:1536459943480270959> ${tFor(interaction, 'commands.profile.statsTitle')}\n\n` +
            `<:asteroid:1536459906973171782> **${tFor(interaction, 'commands.profile.planetsSeen')}**: \`${formattedPlanets}\`\n` +
            `<:ovni:1536247726889762847> **${tFor(interaction, 'commands.profile.distanceTraveled')}**: \`${formattedDistance}\`\n` +
            `<:passionate:1536247742110634034> **${tFor(interaction, 'commands.profile.tripsCompleted')}**: \`${formattedTrips}\`\n` +
            `<:rock:1536579687407681596> **${tFor(interaction, 'commands.profile.resourcesCollected')}**: \`${formattedResources}\``
        );

        const shipText = new TextDisplayBuilder().setContent(
            `## <:config:1536247533502734376> ${tFor(interaction, 'commands.profile.shipTitle')}\n\n` +
            `<:ovni:1536247726889762847> **${tFor(interaction, 'commands.profile.propulsor')}**: Tier \`${ship.propulsorTier}\`\n` +
            `<:rock:1536579687407681596> **${tFor(interaction, 'commands.profile.excavation')}**: Nível \`${ship.excavationProbeLevel}\`\n` +
            `<:loading:1536247662372982794> **${tFor(interaction, 'commands.profile.scanner')}**: Nível \`${ship.starScannerLevel}\``
        );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(new SeparatorBuilder())
            .addSectionComponents(mainSection)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(statsText)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(shipText);

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            files,
        });
    },
};
