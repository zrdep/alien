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
    getUserMarketStats,
    getUserAchievements,
    getEquippedHat,
} = require('../../utils/db');
const { formatDistance, formatCount } = require('../../utils/statsFormatter');
const {
    listAchievementsSorted,
    getRarityEmoji,
    getHat,
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

const COMPOSED_ALIEN_HAT_NAME = 'alien_hat_profile.png';

const EMOJI_COINS_GOLD = '<:gold_coins:1536941656178298992>';
const EMOJI_BAG_COINS = '<:bag_coins:1536941656178298992>';
const EMOJI_EXCITED = '<:excited:1536247579061256252>';
const EMOJI_OVNI = '<:ovni:1536247726889762847>';
const EMOJI_SATURN = '<:saturn:1536459943480270959>';
const EMOJI_ASTEROID = '<:asteroid:1536459906973171782>';
const EMOJI_PASSIONATE = '<:passionate:1536247742110634034>';
const EMOJI_ROCK = '<:rock:1536579687407681596>';
const EMOJI_CONFIG = '<:config:1536247533502734376>';
const EMOJI_REGISTRY = '<:registry:1536459835921530890>';
const EMOJI_BOOK2 = '<:book2:1536459861527756952>';
const EMOJI_RAINBOW = '<:rainbow:1536248394681552957>';
const EMOJI_BOOK = '<:book:1536247508181848134>';
const EMOJI_DND = '<:dnd:1536247547193204766>';
const EMOJI_HMM = '<:hmm:1536247599365890139>';
const EMOJI_LOADING = '<:loading:1536247662372982794>';


module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('profile')
        .setNameLocalizations({ 'pt-BR': 'perfil' })
        .setDescription("View your or another user's ∩lien profile and stats")
        .setDescriptionLocalizations({
            'pt-BR': 'Veja o seu perfil ou o de outro usuário no ∩lien',
        })
        .addUserOption((option) =>
            option
                .setName('user')
                .setNameLocalizations({ 'pt-BR': 'usuario' })
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
        const isPt = lang === 'pt-BR';
        const numLoc = isPt ? 'pt-BR' : 'en-US';

        // === Bot guard: bots don't have profiles ===
        if (targetUser.bot) {
            const botText = new TextDisplayBuilder().setContent(
                `${EMOJI_DND} **${tFor(interaction, 'commands.profile.botTitle')}**\n\n` +
                `${EMOJI_HMM} ${tFor(interaction, 'commands.profile.botBody', { user: targetUser.username })}`
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
        const marketStats = getUserMarketStats(targetUser.id);
        const unlockedAchievements = new Set(getUserAchievements(targetUser.id).map((a) => a.achievementId));
        const allAchievements = listAchievementsSorted();
        const equippedHatKey = getEquippedHat(targetUser.id);
        const equippedHat = equippedHatKey ? getHat(equippedHatKey) : null;

        const alienName = alien?.name ?? tFor(interaction, 'commands.alien.defaultName');
        const formattedDistance = formatDistance(stats.distanceTraveledKm, lang);
        const formattedPlanets = formatCount(stats.planetsSeen, lang);
        const formattedTrips = formatCount(stats.tripsCompleted, lang);
        const formattedResources = formatCount(stats.totalResourcesCollected, lang);
        const formattedCoins = coins.toLocaleString(numLoc);

        const totalAchievements = allAchievements.length;
        const unlockedCount = unlockedAchievements.size;
        const achievementPct = totalAchievements > 0 ? Math.floor((unlockedCount / totalAchievements) * 100) : 0;

        const header = new TextDisplayBuilder().setContent(
            `# ${EMOJI_EXCITED} ${
                isSelf
                    ? tFor(interaction, 'commands.profile.myTitle')
                    : tFor(interaction, 'commands.profile.userTitle', { user: targetUser.username })
            }`
        );

        const mainInfoText = new TextDisplayBuilder().setContent(
            `${EMOJI_OVNI} **${tFor(interaction, 'commands.profile.alienLabel')}**: \`${alienName}\`\n` +
            `${EMOJI_COINS_GOLD} **${tFor(interaction, 'commands.profile.coinsLabel')}**: \`${formattedCoins}\` ∩oins\n` +
            `${EMOJI_RAINBOW} **${tFor(interaction, 'commands.profile.achievementsLabel')}**: \`${unlockedCount}/${totalAchievements}\` (\`${achievementPct}%\` ${tFor(interaction, 'commands.profile.achievementsUnlocked')})`
        );

        // === Monta thumbnail do perfil, com chapéu equipado se existir ===
        const files = [];
        let mainSection;

        if (alien?.color && ALIEN_COLORS[alien.color]) {
            const alienFile = ALIEN_COLORS[alien.color];
            const alienFullPath = path.join(ALIEN_IMAGES_DIR, alienFile);

            if (equippedHat && fs.existsSync(alienFullPath)) {
                const composedBuffer = composeAlienWithHat(alienFile, equippedHat.file);
                if (composedBuffer) {
                    const thumbnail = new ThumbnailBuilder().setURL(`attachment://${COMPOSED_ALIEN_HAT_NAME}`);
                    files.push({
                        attachment: composedBuffer,
                        name: COMPOSED_ALIEN_HAT_NAME,
                    });
                    mainSection = new SectionBuilder()
                        .addTextDisplayComponents(mainInfoText)
                        .setThumbnailAccessory(thumbnail);
                }
            }

            if (!mainSection && fs.existsSync(alienFullPath)) {
                const thumbnail = new ThumbnailBuilder().setURL(`attachment://${alienFile}`);
                files.push({
                    attachment: alienFullPath,
                    name: alienFile,
                });
                mainSection = new SectionBuilder()
                    .addTextDisplayComponents(mainInfoText)
                    .setThumbnailAccessory(thumbnail);
            }
        }


        const statsText = new TextDisplayBuilder().setContent(
            `## ${EMOJI_SATURN} ${tFor(interaction, 'commands.profile.statsTitle')}\n\n` +
            `${EMOJI_ASTEROID} **${tFor(interaction, 'commands.profile.planetsSeen')}**: \`${formattedPlanets}\`\n` +
            `${EMOJI_OVNI} **${tFor(interaction, 'commands.profile.distanceTraveled')}**: \`${formattedDistance}\`\n` +
            `${EMOJI_PASSIONATE} **${tFor(interaction, 'commands.profile.tripsCompleted')}**: \`${formattedTrips}\`\n` +
            `${EMOJI_ROCK} **${tFor(interaction, 'commands.profile.resourcesCollected')}**: \`${formattedResources}\``
        );

        const shipText = new TextDisplayBuilder().setContent(
            `## ${EMOJI_CONFIG} ${tFor(interaction, 'commands.profile.shipTitle')}\n\n` +
            `${EMOJI_OVNI} **${tFor(interaction, 'commands.profile.propulsor')}**: ${tFor(interaction, 'commands.profile.tierLabel')} \`${ship.propulsorTier}\`\n` +
            `${EMOJI_ROCK} **${tFor(interaction, 'commands.profile.excavation')}**: ${tFor(interaction, 'commands.profile.levelLabel')} \`${ship.excavationProbeLevel}\`\n` +
            `${EMOJI_LOADING} **${tFor(interaction, 'commands.profile.scanner')}**: ${tFor(interaction, 'commands.profile.levelLabel')} \`${ship.starScannerLevel}\``
        );

        // === Seção MERCADO GLOBAL (sem "lucro estimado", conforme pedido) ===
        const marketRevenueFormatted = marketStats.marketGlobalSoldRevenue.toLocaleString(numLoc);
        const marketSpentFormatted = marketStats.marketGlobalBoughtSpent.toLocaleString(numLoc);

        const marketText = new TextDisplayBuilder().setContent(
            `## ${EMOJI_BAG_COINS} ${tFor(interaction, 'commands.profile.marketTitle')}\n\n` +
            `${EMOJI_REGISTRY} **${tFor(interaction, 'commands.profile.unitsSold')}**: \`${marketStats.marketGlobalSoldCount.toLocaleString(numLoc)}\`\n` +
            `${EMOJI_COINS_GOLD} **${tFor(interaction, 'commands.profile.netRevenue')}**: \`${marketRevenueFormatted}\` ∩oins\n\n` +
            `${EMOJI_OVNI} **${tFor(interaction, 'commands.profile.unitsBought')}**: \`${marketStats.marketGlobalBoughtCount.toLocaleString(numLoc)}\`\n` +
            `${EMOJI_COINS_GOLD} **${tFor(interaction, 'commands.profile.totalSpent')}**: \`${marketSpentFormatted}\` ∩oins\n\n` +
            `${EMOJI_CONFIG} **${tFor(interaction, 'commands.profile.shopBought')}**: \`${marketStats.shopBoughtCount.toLocaleString(numLoc)}\` ${tFor(interaction, 'commands.profile.unitsShort')}\n` +
            `${EMOJI_BOOK} **${tFor(interaction, 'commands.profile.shopSold')}**: \`${marketStats.shopSoldCount.toLocaleString(numLoc)}\` ${tFor(interaction, 'commands.profile.unitsShort')}\n` +
            `${EMOJI_BOOK2} **${tFor(interaction, 'commands.profile.craftsCompleted')}**: \`${marketStats.craftCompletedCount.toLocaleString(numLoc)}\``
        );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(new SeparatorBuilder());

        // Section exige miniatura (o Discord recusa sem): quem ainda não tem
        // alien (ou sem a imagem) ganha só o texto.
        if (mainSection) {
            container.addSectionComponents(mainSection);
        } else {
            container.addTextDisplayComponents(mainInfoText);
        }

        container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(statsText)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(shipText)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(marketText);

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            files,
        });
    },
};
