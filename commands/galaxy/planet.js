const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    SeparatorBuilder,
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const { getUserLanguage, consumePlanetUsage } = require('../../utils/db');
const { gerarDadosPlaneta } = require('../../utils/planet');
const { gerarRecursosPlaneta } = require('../../utils/planetResources');
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

const RESOURCE_NAME = {
    'pt-BR': {
        stone: 'Pedra',
        wood: 'Madeira',
        dirt: 'Terra',
        iron: 'Ferro',
        copper: 'Cobre',
        metal: 'Metal',
        blueCrystal: 'Cristal Azul',
        starFragment: 'Fragmento Estelar',
        purpleCrystal: 'Cristal Roxo',
        glowingOre: 'Minério Luminoso',
        planetCore: 'Núcleo de Planeta',
        cosmicPearl: 'Pérola Cósmica',
        starEssence: 'Essência Estelar',
    },
    'en-US': {
        stone: 'Stone',
        wood: 'Wood',
        dirt: 'Dirt',
        iron: 'Iron',
        copper: 'Copper',
        metal: 'Metal',
        blueCrystal: 'Blue Crystal',
        starFragment: 'Star Fragment',
        purpleCrystal: 'Purple Crystal',
        glowingOre: 'Glowing Ore',
        planetCore: 'Planet Core',
        cosmicPearl: 'Cosmic Pearl',
        starEssence: 'Star Essence',
    },
};

const RESOURCE_RARITY_EMOJI = {
    A: '<:comum:1536459746364760215>',
    B: '<:incomum:1536459764492533800>',
    C: '<:rare:1536459780166647878>',
    D: '<:epic:1536459798269395044>',
    E: '<:legendary:1536459814475927653>',
};

const buildResourcesContent = (interaction, recursos) => {
    const lang = getUserLanguage(interaction.user.id);
    const names = RESOURCE_NAME[lang] ?? RESOURCE_NAME['pt-BR'];
    const title = tFor(interaction, 'commands.planet.resourcesTitle');
    const empty = tFor(interaction, 'commands.planet.resourcesEmpty');

    let body = '';
    if (!recursos || recursos.length === 0) {
        body = `<:hmm:1536247599365890139> ${empty}`;
    } else {
        body = recursos.map((r) => {
            const rName = names[r.key] ?? r.key;
            const rEmoji = r.emoji;
            const rRarityEmoji = RESOURCE_RARITY_EMOJI[r.rarity] ?? '';
            return `${rEmoji} **${rName}** × \`${r.amount}\` ${rRarityEmoji}`;
        }).join('\n');
    }

    return `\n## <:excited:1536247579061256252> ${title}\n\n${body}\n`;
};

const gerarSvgPlaneta = async (seed) => {
    const { Style, Avatar } = await import('@dicebear/core');
    const path = require('path');
    const fs = require('fs');
    const definitionPath = path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        '@dicebear',
        'styles',
        'planets.json'
    );
    const altPath = path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        '@dicebear',
        'styles',
        'dist',
        'planets.min.json'
    );

    let definition = null;
    if (fs.existsSync(definitionPath)) {
        definition = JSON.parse(fs.readFileSync(definitionPath, 'utf-8'));
    } else if (fs.existsSync(altPath)) {
        definition = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
    } else {
        throw new Error('Não foi possível encontrar planets.json em @dicebear/styles');
    }

    const style = new Style(definition);
    const avatar = new Avatar(style, {
        borderRadius: 10,
        shadeVariant: {
            hard: 1,
            soft: 1,
        },
        starProbability: 80,
        starVariant: {
            faint: 2,
            large: 1,
            medium: 1,
            small: 1,
            sparkle: 1,
        },
        surfaceVariant: {
            banded: 1,
            belted: 2,
            cap: 2,
            cracked: 2,
            cratered: 2,
            marbled: 2,
            speckled: 2,
            spotted: 1,
            swirl: 2,
            terra: 2,
        },
        backgroundColor: [
            '17233f', '23244a', '2c1c45',
            '0f2336', '012e3a', '002a2e',
            '0b3533', '361b34', '1c1f27',
            '1d1a2a', '2e1b20', '242424',
        ],
        backgroundColorFill: ['linear'],
        backgroundColorAngle: 295,
        backgroundColorFillStops: 3,
        seed,
    });

    return avatar.toString();
};

const svgToPngBuffer = async (svg) => {
    const { Resvg } = require('@resvg/resvg-js');
    const resvg = new Resvg(svg, {
        fitTo: {
            mode: 'width',
            value: 512,
        },
    });
    const pngData = resvg.render();
    return pngData.asPng();
};

const ATTACHMENT_NAME = 'planet.png';

const rarityKey = (code) => `commands.planet.rarity${code}`;

module.exports = {
    cooldown: 10,

    data: new SlashCommandBuilder()
        .setName('planet')
        .setNameLocalizations({
            'pt-BR': 'planet',
        })
        .setDescription('Generates a random planet in ∩lien galaxy')
        .setDescriptionLocalizations({
            'pt-BR': 'Gera um planeta aleatório na galáxia do ∩lien',
        }),

    async execute(interaction) {
        await interaction.deferReply();

        const lang = getUserLanguage(interaction.user.id);
        const usage = consumePlanetUsage(interaction.user.id);

        if (!usage.canUse) {
            const mins = usage.nextReset.minutesLeft;
            const msg = lang === 'en-US'
                ? `<:sob:1536248436339376138> **Empty fuel tank!** You've completed all 10 space trips for this hour. Recharge and come back in **${mins} minutes** — until then, the ship stays in the hangar. <:ovni:1536247726889762847>`
                : `<:sob:1536248436339376138> **Tanque de combustível vazio!** Você já fez todas as 10 explorações espaciais desta hora. Recarregue as energias e volte daqui **${mins} minutos** — até lá, a nave fica no hangar. <:ovni:1536247726889762847>`;
            await interaction.editReply({ content: msg });
            return;
        }

        const dados = gerarDadosPlaneta();
        const recursos = gerarRecursosPlaneta(dados.seedDicebear, dados.raridadeCode);

        const emojiRarity = RARITY_EMOJI[dados.raridadeCode] ?? RARITY_EMOJI.A;
        const rarityLabel = tFor(interaction, rarityKey(dados.raridadeCode));

        let pngBuffer = null;
        try {
            const svg = await gerarSvgPlaneta(dados.seedDicebear);
            pngBuffer = await svgToPngBuffer(svg);
        } catch (err) {
            logger.error(`Failed to generate planet image: ${err.message}`);
            pngBuffer = null;
        }

        const header = new TextDisplayBuilder().setContent(
`# <:asteroid:1536459906973171782> ${dados.nome}

${emojiRarity} **${rarityLabel}**
<:earth:1536459925495087226> ${tFor(interaction, 'commands.planet.subtitle')}
`
        );

        const detailsTxt = new TextDisplayBuilder().setContent(
`## <:saturn:1536459943480270959> ${tFor(interaction, 'commands.planet.detailsTitle')}
${tFor(interaction, 'commands.planet.idLabel')}: \`${dados.seedDicebear}\`
${tFor(interaction, 'commands.planet.distanceLabel')}: **\`${dados.distanciaFormat(lang)}\`**

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

        const buildContainer = (withThumbnail) => {
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

            return new ContainerBuilder()
                .addTextDisplayComponents(header)
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(resourcesTxt);
        };

        const files = pngBuffer
            ? [{ attachment: pngBuffer, name: ATTACHMENT_NAME }]
            : [];

        const tryThumbnail = pngBuffer !== null;

        try {
            await interaction.editReply({
                content: '',
                flags: MessageFlags.IsComponentsV2,
                components: [buildContainer(tryThumbnail)],
                files,
            });
        } catch (replyErr) {
            logger.warn(`Failed to send /planet with thumbnail: ${replyErr.message}. Retrying without thumbnail...`);
            try {
                await interaction.editReply({
                    content: '',
                    flags: MessageFlags.IsComponentsV2,
                    components: [buildContainer(false)],
                    files,
                });
            } catch (finalErr) {
                logger.warn(`Failed to send /planet without thumbnail: ${finalErr.message}`);
                throw finalErr;
            }
        }
    },
};
