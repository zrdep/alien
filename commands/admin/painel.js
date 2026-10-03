const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

const { guildId: OWNER_GUILD_ID, ownerId: OWNER_ID } = require('../../config.json');
const { tFor } = require('../../utils/i18n');

const {
    getUserAlien,
    getUserLanguage,
    getUserShip,
    getUserCoins,
    setUserCoins,
    getUserInventory,
    setInventoryResource,
    getExplorationMission,
    resolveExplorationMission,
    forceExpireMissionPhase,
    getDailyState,
    resetDailyClaim,
    createRedeemableForAllUsers,
} = require('../../utils/db');
const { getResourceMeta } = require('../../utils/planetResources');
const { RESOURCES } = require('../../gameConfig/resources');
const { formatResourceLine } = require('../../utils/resourcesDisplay');
const { formatDuration, formatTimeRemaining } = require('../../utils/exploration');
const logger = require('../../utils/logger');

const ID_REGEX = /^\d{15,25}$/;

const STATUS_EMOJI = {
    traveling_out: '<:ovni:1536247726889762847>',
    collecting: '<:rock:1536579687407681596>',
    traveling_back: '<:earth:1536459925495087226>',
};

// Permite digitar a chave interna (stone, blueCrystal...) ou o nome em
// português OU inglês (pedra, stone, cristal azul, blue crystal...) nos
// modais de recurso. Os nomes vêm de gameConfig/resources.js — ao adicionar
// um recurso na config central, ele já fica digitável aqui automaticamente.
const normalizeName = (raw) => raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const RESOURCE_ALIASES = (() => {
    const map = new Map();

    for (const resource of RESOURCES) {
        map.set(resource.key.toLowerCase(), resource.key);
        for (const name of Object.values(resource.name)) {
            const clean = normalizeName(name);
            map.set(clean, resource.key);
            map.set(clean.replace(/\s+/g, ''), resource.key);
        }
    }

    return map;
})();

const normalizeResourceInput = (raw) => {
    const cleaned = normalizeName(raw);

    return RESOURCE_ALIASES.get(cleaned) ?? RESOURCE_ALIASES.get(cleaned.replace(/\s+/g, '')) ?? null;
};

const isOwnerContext = (interaction) =>
    interaction.guildId === OWNER_GUILD_ID && interaction.user.id === OWNER_ID;

// Respostas de erro curtas (ephemeral) do painel.
const replyHmm = (interaction, key, vars) => interaction.reply({
    content: `<:hmm:1536247599365890139> ${tFor(interaction, `commands.painel.${key}`, vars)}`,
    flags: MessageFlags.Ephemeral,
});

const replyNoPermission = async (interaction) => {
    const payload = {
        content: `<:dnd:1536247547193204766> ${tFor(interaction, 'commands.painel.noPermission')}`,
        flags: MessageFlags.Ephemeral,
    };
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
    } else {
        await interaction.reply(payload);
    }
};

const buildResourceList = (interaction, targetId) => {
    const inventory = getUserInventory(targetId);
    if (!inventory.length) return `_${tFor(interaction, 'commands.painel.inventoryEmpty')}_`;

    const lang = getUserLanguage(interaction.user.id);
    return inventory
        .map((item) => {
            const meta = getResourceMeta(item.key) ?? {};
            return formatResourceLine(lang, {
                key: item.key,
                amount: item.amount,
                emoji: meta.emoji ?? '<:registry:1536459835921530890>',
                rarity: meta.rarity ?? 'A',
            });
        })
        .join('\n');
};

const buildMissionSection = (interaction, targetId) => {
    resolveExplorationMission(targetId);
    const mission = getExplorationMission(targetId);

    if (!mission) return `_${tFor(interaction, 'commands.painel.noMission')}_`;

    const lang = getUserLanguage(interaction.user.id);
    const label = STATUS_EMOJI[mission.status]
        ? `${STATUS_EMOJI[mission.status]} ${tFor(interaction, `commands.painel.status.${mission.status}`)}`
        : mission.status;
    const restante = formatTimeRemaining(mission.phase_ends_at, lang);
    const duracaoFase = formatDuration(
        Math.max(0, Math.round((mission.phase_ends_at - mission.phase_started_at) / 1000)),
        lang
    );

    return tFor(interaction, 'commands.painel.missionBody', {
        planet: mission.planet_name,
        phase: label,
        duration: duracaoFase,
        remaining: restante,
    });
};

const buildDailySection = (interaction, targetId) => {
    const state = getDailyState(targetId);
    const status = state.canClaim
        ? `<:excited:1536247579061256252> ${tFor(interaction, 'commands.painel.dailyAvailable')}`
        : `<:dnd:1536247547193204766> ${tFor(interaction, 'commands.painel.dailyClaimed')}`;

    return tFor(interaction, 'commands.painel.dailyBody', { status, streak: state.currentStreak });
};

const buildPainelPayload = (interaction, targetId) => {
    const lang = getUserLanguage(interaction.user.id);
    const alien = getUserAlien(targetId);
    const coins = getUserCoins(targetId);
    const ship = getUserShip(targetId);
    const mission = getExplorationMission(targetId);
    const dailyState = getDailyState(targetId);

    const header = new TextDisplayBuilder().setContent(
`# <:settings:1536248422686920704> ${tFor(interaction, 'commands.painel.title')}

${tFor(interaction, 'commands.painel.header', {
    user: `<@${targetId}> (\`${targetId}\`)`,
    alien: alien
        ? (alien.name ?? `_${tFor(interaction, 'commands.painel.alienNoName')}_`)
        : `_${tFor(interaction, 'commands.painel.alienNone')}_`,
    coins: coins.toLocaleString(lang),
    propulsor: ship.propulsorTier,
    excavation: ship.excavationProbeLevel,
    scanner: ship.starScannerLevel,
})}`
    );

    const missionTxt = new TextDisplayBuilder().setContent(
`## <:ovni:1536247726889762847> ${tFor(interaction, 'commands.painel.missionTitle')}\n${buildMissionSection(interaction, targetId)}`
    );

    const dailyTxt = new TextDisplayBuilder().setContent(
`## <:gold_coins:1536941656178298992> ${tFor(interaction, 'commands.painel.dailyTitle')}\n${buildDailySection(interaction, targetId)}`
    );

    const inventoryTxt = new TextDisplayBuilder().setContent(
`## <:registry:1536459835921530890> ${tFor(interaction, 'commands.painel.inventoryTitle')}\n${buildResourceList(interaction, targetId)}`
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(missionTxt)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(dailyTxt)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(inventoryTxt);

    const rowActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`painel_skip:${targetId}`)
            .setLabel(tFor(interaction, 'commands.painel.buttons.skipPhase'))
            .setEmoji('<:loading:1536247662372982794>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!mission),
        new ButtonBuilder()
            .setCustomId(`painel_skipall:${targetId}`)
            .setLabel(tFor(interaction, 'commands.painel.buttons.skipAll'))
            .setEmoji('<:restart:1536248409634246719>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!mission),
        new ButtonBuilder()
            .setCustomId(`painel_refresh:${targetId}`)
            .setLabel(tFor(interaction, 'commands.painel.buttons.refresh'))
            .setEmoji('<:online:1536247711169249391>')
            .setStyle(ButtonStyle.Secondary)
    );

    const rowSetters = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`painel_setres:${targetId}`)
            .setLabel(tFor(interaction, 'commands.painel.buttons.setResource'))
            .setEmoji('<:registry:1536459835921530890>')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`painel_setcoins:${targetId}`)
            .setLabel(tFor(interaction, 'commands.painel.buttons.setCoins'))
            .setEmoji('<:gold_coins:1536941656178298992>')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`painel_skipdaily:${targetId}`)
            .setLabel(tFor(interaction, 'commands.painel.buttons.skipDaily'))
            .setEmoji('<:restart:1536248409634246719>')
            .setStyle(ButtonStyle.Success)
            .setDisabled(dailyState.canClaim)
    );

    // Ação GLOBAL (não depende do jogador aberto no painel): cria um
    // resgate pendente pra todo mundo, que cada um pega com /redeem.
    const rowGlobal = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`painel_giftall:${targetId}`)
            .setLabel(tFor(interaction, 'commands.painel.buttons.giftAll'))
            .setEmoji('<:gift_coins:1537511597013074030>')
            .setStyle(ButtonStyle.Primary)
    );

    container.addActionRowComponents(rowActions);
    container.addActionRowComponents(rowSetters);
    container.addActionRowComponents(rowGlobal);

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container],
    };
};

const buildSetResourceModal = (interaction, targetId) => {
    const modal = new ModalBuilder()
        .setCustomId(`painel_setres_modal:${targetId}`)
        .setTitle(tFor(interaction, 'commands.painel.buttons.setResource'));

    const resourceInput = new TextInputBuilder()
        .setCustomId('recurso')
        .setLabel(tFor(interaction, 'commands.painel.modal.resourceLabel'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const amountInput = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel(tFor(interaction, 'commands.painel.modal.amountLabel'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(resourceInput),
        new ActionRowBuilder().addComponents(amountInput)
    );

    return modal;
};

const buildSetCoinsModal = (interaction, targetId) => {
    const modal = new ModalBuilder()
        .setCustomId(`painel_setcoins_modal:${targetId}`)
        .setTitle(tFor(interaction, 'commands.painel.buttons.setCoins'));

    const amountInput = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel(tFor(interaction, 'commands.painel.modal.coinsLabel'))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

    return modal;
};

const buildGiftAllModal = (interaction, targetId) => {
    const modal = new ModalBuilder()
        .setCustomId(`painel_giftall_modal:${targetId}`)
        .setTitle(tFor(interaction, 'commands.painel.modal.giftAllTitle'));

    const field = (id, label, required, placeholder) => {
        const input = new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(TextInputStyle.Short)
            .setRequired(required);
        if (placeholder) input.setPlaceholder(placeholder);
        return new ActionRowBuilder().addComponents(input);
    };

    modal.addComponents(
        field('titulo_pt', tFor(interaction, 'commands.painel.modal.titlePtLabel'), true, 'Ex: Presente de lançamento!'),
        field('titulo_en', tFor(interaction, 'commands.painel.modal.titleEnLabel'), true, 'Ex: Launch gift!'),
        field('moedas', tFor(interaction, 'commands.painel.modal.giftCoinsLabel'), false, '1000'),
        field('recursos', tFor(interaction, 'commands.painel.modal.giftResourcesLabel'), false, tFor(interaction, 'commands.painel.modal.giftResourcesPlaceholder'))
    );

    return modal;
};

// "pedra:20, ferro 10" -> [{ key: 'stone', amount: 20 }, { key: 'iron', amount: 10 }]
// Retorna { resources } ou { error } com o trecho que não deu pra entender.
const parseGiftResources = (raw) => {
    const resources = [];
    for (const part of raw.split(',').map((p) => p.trim()).filter(Boolean)) {
        const match = /^(.+?)\s*[:= ]\s*(\d+)$/.exec(part);
        const key = match ? normalizeResourceInput(match[1]) : null;
        const amount = match ? Number.parseInt(match[2], 10) : 0;
        if (!key || amount <= 0) return { error: part };
        resources.push({ key, amount });
    }
    return { resources };
};

module.exports = {
    // Comando sensível: sem cooldown "de jogo" normal, mas também não precisa ser rápido.
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('[Owner] Admin panel to manage a player')
        .setDescriptionLocalizations({ 'pt-BR': '[Owner] Painel administrativo para gerenciar um jogador' })
        .addStringOption((option) =>
            option
                .setName('id')
                .setDescription('Discord ID of the user you want to manage')
                .setDescriptionLocalizations({ 'pt-BR': 'ID do Discord do usuário que você quer gerenciar' })
                .setRequired(true)
        )
        .setDefaultMemberPermissions(0),

    async execute(interaction) {
        if (!isOwnerContext(interaction)) {
            await replyNoPermission(interaction);
            return;
        }

        const targetId = interaction.options.getString('id', true).trim();
        if (!ID_REGEX.test(targetId)) {
            await interaction.editReply({
                content: `<:hmm:1536247599365890139> ${tFor(interaction, 'commands.painel.invalidId')}`,
            });
            return;
        }

        logger.info(`${interaction.user.tag} abriu o /painel para o usuário ${targetId}`);
        await interaction.editReply(buildPainelPayload(interaction, targetId));
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('painel_')) return false;

        if (!isOwnerContext(interaction)) {
            await replyNoPermission(interaction);
            return true;
        }

        const [action, targetId] = interaction.customId.split(':');
        if (!targetId || !ID_REGEX.test(targetId)) {
            await replyHmm(interaction, 'invalidComponentId');
            return true;
        }

        if (action === 'painel_setres') {
            await interaction.showModal(buildSetResourceModal(interaction, targetId));
            return true;
        }

        if (action === 'painel_setcoins') {
            await interaction.showModal(buildSetCoinsModal(interaction, targetId));
            return true;
        }

        if (action === 'painel_giftall') {
            await interaction.showModal(buildGiftAllModal(interaction, targetId));
            return true;
        }

        await interaction.deferUpdate();

        if (action === 'painel_skip') {
            forceExpireMissionPhase(targetId);
            resolveExplorationMission(targetId);
        }

        if (action === 'painel_skipall') {
            // Avança fase por fase até a missão terminar (ou até um limite de segurança).
            for (let i = 0; i < 5; i++) {
                const mission = getExplorationMission(targetId);
                if (!mission) break;
                forceExpireMissionPhase(targetId);
                resolveExplorationMission(targetId);
            }
        }

        if (action === 'painel_skipdaily') {
            resetDailyClaim(targetId);
            logger.info(`${interaction.user.tag} pulou o cooldown da diária de ${targetId} via /painel`);
        }

        // painel_refresh cai direto aqui e só recarrega o payload.
        await interaction.editReply(buildPainelPayload(interaction, targetId));
        return true;
    },

    async handleModalSubmit(interaction) {
        if (!interaction.customId.startsWith('painel_')) return false;

        if (!isOwnerContext(interaction)) {
            await replyNoPermission(interaction);
            return true;
        }

        const [action, targetId] = interaction.customId.split(':');
        if (!targetId || !ID_REGEX.test(targetId)) {
            await replyHmm(interaction, 'invalidComponentId');
            return true;
        }

        if (action === 'painel_setres_modal') {
            const rawResource = interaction.fields.getTextInputValue('recurso');
            const rawAmount = interaction.fields.getTextInputValue('quantidade');

            const resourceKey = normalizeResourceInput(rawResource);
            const amount = Number.parseInt(rawAmount, 10);

            if (!resourceKey) {
                await replyHmm(interaction, 'unknownResource', { resource: rawResource });
                return true;
            }

            if (!Number.isFinite(amount) || amount < 0) {
                await replyHmm(interaction, 'invalidAmount');
                return true;
            }

            setInventoryResource(targetId, resourceKey, amount);
            logger.info(`${interaction.user.tag} setou ${resourceKey}=${amount} para ${targetId} via /painel`);

            const payload = buildPainelPayload(interaction, targetId);
            if (interaction.isFromMessage?.()) {
                await interaction.update(payload);
            } else {
                await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
            }
            return true;
        }

        if (action === 'painel_giftall_modal') {
            const titlePt = interaction.fields.getTextInputValue('titulo_pt').trim();
            const titleEn = interaction.fields.getTextInputValue('titulo_en').trim();
            const rawCoins = interaction.fields.getTextInputValue('moedas').trim();
            const rawResources = interaction.fields.getTextInputValue('recursos').trim();

            const coins = rawCoins ? Number.parseInt(rawCoins, 10) : 0;
            if (!Number.isFinite(coins) || coins < 0) {
                await replyHmm(interaction, 'invalidCoins');
                return true;
            }

            const { resources, error } = parseGiftResources(rawResources);
            if (error) {
                await replyHmm(interaction, 'giftResourceParseError', { part: error });
                return true;
            }

            if (coins === 0 && resources.length === 0) {
                await replyHmm(interaction, 'giftEmpty');
                return true;
            }

            const total = createRedeemableForAllUsers({ titlePt, titleEn, coins, resources });
            logger.info(`${interaction.user.tag} enviou presente "${titlePt}" (${coins} ∩, ${JSON.stringify(resources)}) para ${total} jogadores via /painel`);

            await interaction.reply({
                content: `<:gift_coins:1537511597013074030> ${tFor(interaction, 'commands.painel.giftAllDone', {
                    title: getUserLanguage(interaction.user.id) === 'en-US' ? titleEn : titlePt,
                    total: total.toLocaleString(getUserLanguage(interaction.user.id)),
                })}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        if (action === 'painel_setcoins_modal') {
            const rawAmount = interaction.fields.getTextInputValue('quantidade');
            const amount = Number.parseInt(rawAmount, 10);

            if (!Number.isFinite(amount) || amount < 0) {
                await replyHmm(interaction, 'invalidAmount');
                return true;
            }

            setUserCoins(targetId, amount);
            logger.info(`${interaction.user.tag} setou coins=${amount} para ${targetId} via /painel`);

            const payload = buildPainelPayload(interaction, targetId);
            if (interaction.isFromMessage?.()) {
                await interaction.update(payload);
            } else {
                await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
            }
            return true;
        }

        return false;
    },
};