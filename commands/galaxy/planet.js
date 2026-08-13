const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const path = require('path');
const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const { tFor } = require('../../utils/i18n');
const {
    getUserLanguage,
    consumePlanetUsage,
    getUserAlien,
    getUserShip,
    savePlanetOffer,
    getPlanetOffer,
    deletePlanetOffer,
    resolveExplorationMission,
    getExplorationMission,
    startExplorationMission,
    popMissionNotice,
    incrementPlanetsSeen,
} = require('../../utils/db');
const { gerarDadosPlaneta } = require('../../utils/planet');
const { gerarRecursosPlaneta } = require('../../utils/planetResources');
const { formatResourcesInline } = require('../../utils/resourcesDisplay');
const { generateMissionCoins } = require('../../utils/coins');
const {
    EXPLORE_OFFER_MS,
    MISSION_STATUS,
    calculateTravelSeconds,
    getExpeditionTimes,
    buildMissionStatusContent,
    buildArrivalNotice,
    buildExploreStartedContent,
} = require('../../utils/exploration');
const logger = require('../../utils/logger');

const RARITY_EMOJI = {
    A: '<:comum:1536459746364760215>',
    B: '<:incomum:1536459764492533800>',
    C: '<:rare:1536459780166647878>',
    D: '<:epic:1536459798269395044>',
    E: '<:legendary:1536459814475927653>',
};

const USAGE_EMOJI = {
    uses: '<:loading:1536247662372982794>',
    remaining: '<:hmm:1536247599365890139>',
};

const ATTACHMENT_NAME = 'planet.png';

const rarityKey = (code) => `commands.planet.rarity${code}`;

const buildResourcesContent = (interaction, recursos) => {
    const title = tFor(interaction, 'commands.planet.resourcesTitle');
    const empty = tFor(interaction, 'commands.planet.resourcesEmpty');
    const lang = getUserLanguage(interaction.user.id);

    let body = '';
    if (!recursos?.length) {
        body = `<:hmm:1536247599365890139> ${empty}`;
    } else {
        body = formatResourcesInline(lang, recursos);
    }

    return `\n## <:excited:1536247579061256252> ${title}\n\n${body}\n`;
};

const buildPlanetButtons = (interaction, planetSeed) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`planet_explore:${planetSeed}`)
            .setLabel(tFor(interaction, 'commands.planet.exploreLabel'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('<:ovni:1536247726889762847>'),
        new ButtonBuilder()
            .setCustomId('planet_next')
            .setLabel(tFor(interaction, 'commands.planet.nextLabel'))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('<:restart:1536248409634246719>')
    );
};

const buildPlanetContainer = (interaction, dados, usage, recursos, { withThumbnail = true, exploreSeed = null } = {}) => {
    const emojiRarity = RARITY_EMOJI[dados.raridadeCode] ?? RARITY_EMOJI.A;
    const rarityLabel = tFor(interaction, rarityKey(dados.raridadeCode));
    const lang = getUserLanguage(interaction.user.id);
    const ship = getUserShip(interaction.user.id);
    const times = getExpeditionTimes(interaction.user.id, dados.distancia, ship.propulsorTier);

    const header = new TextDisplayBuilder().setContent(
`# <:asteroid:1536459906973171782> ${dados.nome}

${emojiRarity} **${rarityLabel}**
<:earth:1536459925495087226> ${tFor(interaction, 'commands.planet.subtitle')}
`
    );

    const coinsLabel = tFor(interaction, 'commands.planet.coinsLabel');
    const coinsAmount = dados.coins?.amount ?? 0;
    const coinsEmoji = dados.coins?.emoji ?? '<:gold_coins:1536941656178298992>';
    const coinsText = coinsAmount > 0
        ? `${coinsEmoji} ${coinsLabel}: **\`+${coinsAmount.toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US')}\`** ∩oins\n`
        : '';

    const detailsTxt = new TextDisplayBuilder().setContent(
`## <:saturn:1536459943480270959> ${tFor(interaction, 'commands.planet.detailsTitle')}
${tFor(interaction, 'commands.planet.idLabel')}: \`${dados.seedDicebear}\`
${tFor(interaction, 'commands.planet.distanceLabel')}: **\`${dados.distanciaFormat(lang)}\`**

<:ovni:1536247726889762847> ${tFor(interaction, 'commands.planet.travelOneWayLabel')}: **\`${times.oneWay}\`**
<:ovni:1536247726889762847> ${tFor(interaction, 'commands.planet.travelRoundTripLabel')}: **\`${times.roundTrip}\`**
<:rock:1536579687407681596> ${tFor(interaction, 'commands.planet.miningTimeLabel')}: **\`${times.mining}\`**
${coinsText}
${USAGE_EMOJI.uses} ${tFor(interaction, 'commands.planet.usageUsed')}: **\`${usage.uses}/${usage.limit}\`**
${USAGE_EMOJI.remaining} ${tFor(interaction, 'commands.planet.usageRemaining')}: **\`${usage.remaining}\`**
`
    );

    const registryTxt = new TextDisplayBuilder().setContent(
`## <:registry:1536459835921530890> ${tFor(interaction, 'commands.planet.registryTitle')}
${tFor(interaction, 'commands.planet.prefixLabel')}: \`${dados.prefixo}\`
${tFor(interaction, 'commands.planet.numberLabel')}: \`${dados.numeroStr}\`
${tFor(interaction, 'commands.planet.suffixLabel')}: \`${dados.sufixo.code}\`
${tFor(interaction, 'commands.planet.rarityLabel')}: ${emojiRarity} ${rarityLabel}
`
    );

    const resourcesTxt = new TextDisplayBuilder().setContent(buildResourcesContent(interaction, recursos));

    let section;
    if (withThumbnail) {
        try {
            const thumbnail = new ThumbnailBuilder().setURL(`attachment://${ATTACHMENT_NAME}`);
            section = new SectionBuilder()
                .addTextDisplayComponents(detailsTxt)
                .addTextDisplayComponents(registryTxt)
                .setThumbnailAccessory(thumbnail);
        } catch (_err) {
            section = new SectionBuilder()
                .addTextDisplayComponents(detailsTxt)
                .addTextDisplayComponents(registryTxt);
        }
    } else {
        section = new SectionBuilder()
            .addTextDisplayComponents(detailsTxt)
            .addTextDisplayComponents(registryTxt);
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(resourcesTxt);

    if (exploreSeed) {
        container.addActionRowComponents(buildPlanetButtons(interaction, exploreSeed));
    }

    return container;
};

const buildPlanetPayload = (interaction, dados, usage, recursos, pngBuffer, arrivalNotice = null) => {
    const container = buildPlanetContainer(interaction, dados, usage, recursos, {
        withThumbnail: pngBuffer !== null,
        exploreSeed: dados.seedDicebear,
    });

    if (arrivalNotice) {
        const noticeTxt = new TextDisplayBuilder().setContent(buildArrivalNotice(interaction.user.id, arrivalNotice));
        const wrapped = new ContainerBuilder()
            .addTextDisplayComponents(noticeTxt)
            .addSeparatorComponents(new SeparatorBuilder());

        for (const part of container.toJSON().components ?? []) {
            if (part.type === 10) {
                wrapped.addTextDisplayComponents(new TextDisplayBuilder().setContent(part.content));
            } else if (part.type === 14) {
                wrapped.addSeparatorComponents(new SeparatorBuilder());
            } else if (part.type === 9) {
                const section = new SectionBuilder();
                for (const c of part.components ?? []) {
                    if (c.type === 10) section.addTextDisplayComponents(new TextDisplayBuilder().setContent(c.content));
                }
                if (part.accessory?.media?.url) {
                    section.setThumbnailAccessory(new ThumbnailBuilder().setURL(part.accessory.media.url));
                }
                wrapped.addSectionComponents(section);
            } else if (part.type === 1) {
                wrapped.addActionRowComponents(buildPlanetButtons(interaction, dados.seedDicebear));
            }
        }

        return wrapped;
    }

    return container;
};

let dicebearCorePromise = null;
const getDicebearCore = () => {
    if (!dicebearCorePromise) {
        dicebearCorePromise = import('@dicebear/core');
    }
    return dicebearCorePromise;
};

let cachedDefinition = null;
const getPlanetsDefinition = () => {
    if (!cachedDefinition) {
        const definitionPath = path.join(__dirname, '..', '..', 'node_modules', '@dicebear', 'styles', 'planets.json');
        const altPath = path.join(__dirname, '..', '..', 'node_modules', '@dicebear', 'styles', 'dist', 'planets.min.json');

        if (fs.existsSync(definitionPath)) {
            cachedDefinition = JSON.parse(fs.readFileSync(definitionPath, 'utf-8'));
        } else if (fs.existsSync(altPath)) {
            cachedDefinition = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
        } else {
            throw new Error('Não foi possível encontrar planets.json em @dicebear/styles');
        }
    }
    return cachedDefinition;
};

let cachedStyle = null;
const getPlanetsStyle = async () => {
    if (!cachedStyle) {
        const { Style } = await getDicebearCore();
        const definition = getPlanetsDefinition();
        cachedStyle = new Style(definition);
    }
    return cachedStyle;
};

const PLANET_CACHE_MAX = 200;
const planetPngCache = new Map();

const generatePlanetPng = async (seed) => {
    if (planetPngCache.has(seed)) {
        return planetPngCache.get(seed);
    }

    const { Avatar } = await getDicebearCore();
    const style = await getPlanetsStyle();

    const avatar = new Avatar(style, {
        borderRadius: 10,
        shadeVariant: { hard: 1, soft: 1 },
        starProbability: 80,
        starVariant: { faint: 2, large: 1, medium: 1, small: 1, sparkle: 1 },
        surfaceVariant: {
            banded: 1, belted: 2, cap: 2, cracked: 2, cratered: 2,
            marbled: 2, speckled: 2, spotted: 1, swirl: 2, terra: 2,
        },
        backgroundColor: [
            '17233f', '23244a', '2c1c45', '0f2336', '012e3a', '002a2e',
            '0b3533', '361b34', '1c1f27', '1d1a2a', '2e1b20', '242424',
        ],
        backgroundColorFill: ['linear'],
        backgroundColorAngle: 295,
        backgroundColorFillStops: 3,
        seed,
    });

    const svg = avatar.toString();
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 320 } });
    const pngBuffer = resvg.render().asPng();

    if (planetPngCache.size >= PLANET_CACHE_MAX) {
        const oldestKey = planetPngCache.keys().next().value;
        planetPngCache.delete(oldestKey);
    }
    planetPngCache.set(seed, pngBuffer);

    return pngBuffer;
};

const buildFuelEmptyMessage = (interaction, usage) => {
    const lang = getUserLanguage(interaction.user.id);
    const mins = usage.nextReset.minutesLeft;
    return lang === 'en-US'
        ? `<:sob:1536248436339376138> **Empty fuel tank!** You've completed all 10 space trips for this hour. Recharge and come back in **${mins} minutes** — until then, the ship stays in the hangar. <:ovni:1536247726889762847>`
        : `<:sob:1536248436339376138> **Tanque de combustível vazio!** Você já fez todas as 10 explorações espaciais desta hora. Recarregue as energias e volte daqui **${mins} minutos** — até lá, a nave fica no hangar. <:ovni:1536247726889762847>`;
};

const buildV2TextPayload = (text) => ({
    content: '',
    flags: MessageFlags.IsComponentsV2,
    components: [
        new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(text)
        ),
    ],
    files: [],
});

const buildMissionV2Payload = (userId, mission, arrivalNotice = null) => {
    const container = new ContainerBuilder();

    if (arrivalNotice) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(buildArrivalNotice(userId, arrivalNotice))
        );
        container.addSeparatorComponents(new SeparatorBuilder());
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(buildMissionStatusContent(userId, mission))
    );

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        files: [],
    };
};

const generatePlanetReply = async (interaction, usage, arrivalNotice = null) => {
    incrementPlanetsSeen(interaction.user.id);
    const dados = gerarDadosPlaneta();
    const recursos = gerarRecursosPlaneta(dados.seedDicebear, dados.raridadeCode);

    const planetCoins = generateMissionCoins(dados.raridadeCode);
    dados.coins = planetCoins;

    savePlanetOffer(interaction.user.id, dados.seedDicebear, {
        nome: dados.nome,
        distancia: dados.distancia,
        raridadeCode: dados.raridadeCode,
        recursos,
        coins: planetCoins,
    }, Date.now() + EXPLORE_OFFER_MS);

    let pngBuffer = null;
    try {
        pngBuffer = await generatePlanetPng(dados.seedDicebear);
    } catch (err) {
        logger.error(`Failed to generate planet image: ${err.message}`);
    }

    const container = buildPlanetPayload(interaction, dados, usage, recursos, pngBuffer, arrivalNotice);
    const files = pngBuffer ? [{ attachment: pngBuffer, name: ATTACHMENT_NAME }] : [];

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        files,
    };
};

const editPlanetReply = async (interaction, payload) => {
    try {
        await interaction.editReply(payload);
    } catch (replyErr) {
        if (!payload.files?.length && payload.components?.length) return;
        logger.warn(`Failed to send planet with thumbnail: ${replyErr.message}. Retrying without thumbnail...`);
        const stripped = { ...payload, files: [] };
        await interaction.editReply(stripped);
    }
};

module.exports = {
    cooldown: 10,

    data: new SlashCommandBuilder()
        .setName('planet')
        .setNameLocalizations({ 'pt-BR': 'planet' })
        .setDescription('Generates a random planet in ∩lien galaxy')
        .setDescriptionLocalizations({
            'pt-BR': 'Gera um planeta aleatório na galáxia do ∩lien',
        }),

    async execute(interaction) {
        const alien = getUserAlien(interaction.user.id);
        if (!alien) {
            await interaction.editReply({
                content: `<:alien:1536247533502734376> **${tFor(interaction, 'commands.planet.alienRequired')}**\n${tFor(interaction, 'commands.planet.alienRequiredTip')}`,
            });
            return;
        }

        const { mission } = resolveExplorationMission(interaction.user.id);
        const arrivalNotice = popMissionNotice(interaction.user.id);

        if (mission) {
            await interaction.editReply(buildMissionV2Payload(interaction.user.id, mission, arrivalNotice));
            return;
        }

        const usage = consumePlanetUsage(interaction.user.id);

        if (!usage.canUse) {
            await interaction.editReply({ content: buildFuelEmptyMessage(interaction, usage) });
            return;
        }

        await editPlanetReply(interaction, await generatePlanetReply(interaction, usage, arrivalNotice));
    },

    async handleButton(interaction) {
        if (interaction.customId === 'planet_next') {
            await interaction.deferUpdate();

            const userId = interaction.user.id;
            resolveExplorationMission(userId);
            const mission = getExplorationMission(userId);

            if (mission) {
                await interaction.editReply(buildMissionV2Payload(userId, mission));
                return true;
            }

            const usage = consumePlanetUsage(userId);
            if (!usage.canUse) {
                await interaction.editReply(buildV2TextPayload(buildFuelEmptyMessage(interaction, usage)));
                return true;
            }

            await editPlanetReply(interaction, await generatePlanetReply(interaction, usage));
            return true;
        }

        if (!interaction.customId.startsWith('planet_explore:')) return false;

        const planetSeed = interaction.customId.slice('planet_explore:'.length);
        const userId = interaction.user.id;

        resolveExplorationMission(userId);
        if (getExplorationMission(userId)) {
            await interaction.reply({
                content: `<:error:1536247565006143528> ${tFor(interaction, 'commands.planet.exploreBusy')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const offer = getPlanetOffer(userId, planetSeed);
        if (!offer || Date.now() > offer.expiresAt) {
            await interaction.reply({
                content: `<:hmm:1536247599365890139> ${tFor(interaction, 'commands.planet.exploreExpired')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const ship = getUserShip(userId);
        const travelSeconds = calculateTravelSeconds(offer.payload.distancia, ship.propulsorTier);
        const now = Date.now();
        // Reaproveita o valor de moedas já sorteado e exibido no /planet (offer.payload.coins).
        // Só gera um novo caso, por algum motivo, a oferta salva não tenha esse valor.
        const coinsReward = offer.payload.coins ?? generateMissionCoins(offer.payload.raridadeCode);

        startExplorationMission(userId, {
            status: MISSION_STATUS.TRAVELING_OUT,
            planetName: offer.payload.nome,
            planetSeed,
            planetDistanceKm: offer.payload.distancia,
            planetRarity: offer.payload.raridadeCode,
            resources: offer.payload.recursos,
            travelSeconds,
            phaseStartedAt: now,
            phaseEndsAt: now + travelSeconds * 1000,
            coinsJson: JSON.stringify(coinsReward),
        });

        deletePlanetOffer(userId, planetSeed);

        const mission = getExplorationMission(userId);
        await interaction.update(
            buildV2TextPayload(buildExploreStartedContent(userId, mission))
        );

        return true;
    },
};
