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

const {
    getUser,
    getUserAlien,
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
} = require('../../utils/db');
const { RESOURCES, getResourceMeta } = require('../../utils/planetResources');
const { formatResourceLine } = require('../../utils/resourcesDisplay');
const { formatDuration, formatTimeRemaining } = require('../../utils/exploration');
const logger = require('../../utils/logger');

const ID_REGEX = /^\d{15,25}$/;

const STATUS_LABEL = {
    traveling_out: '<:ovni:1536247726889762847> Indo até o planeta',
    collecting: '<:rock:1536579687407681596> Minerando',
    traveling_back: '<:earth:1536459925495087226> Voltando para casa',
};

// Permite digitar tanto a chave interna (stone, blueCrystal...) quanto o nome em
// português (pedra, cristal azul...) no modal de "setar recursos".
const RESOURCE_ALIASES = (() => {
    const map = new Map();
    const ptNames = {
        stone: 'pedra',
        wood: 'madeira',
        dirt: 'terra',
        iron: 'ferro',
        copper: 'cobre',
        metal: 'metal',
        blueCrystal: 'cristal azul',
        starFragment: 'fragmento estelar',
        purpleCrystal: 'cristal roxo',
        glowingOre: 'minerio luminoso',
        planetCore: 'nucleo de planeta',
        cosmicPearl: 'perola cosmica',
        starEssence: 'essencia estelar',
    };

    for (const key of Object.keys(RESOURCES)) {
        map.set(key.toLowerCase(), key);
    }
    for (const [key, ptName] of Object.entries(ptNames)) {
        map.set(ptName.replace(/\s+/g, ''), key);
        map.set(ptName, key);
    }
    return map;
})();

const normalizeResourceInput = (raw) => {
    const cleaned = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    return RESOURCE_ALIASES.get(cleaned) ?? RESOURCE_ALIASES.get(cleaned.replace(/\s+/g, '')) ?? null;
};

const isOwnerContext = (interaction) =>
    interaction.guildId === OWNER_GUILD_ID && interaction.user.id === OWNER_ID;

const replyNoPermission = async (interaction) => {
    const payload = {
        content: '<:dnd:1536247547193204766> Você não tem permissão para usar este comando.',
        flags: MessageFlags.Ephemeral,
    };
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
    } else {
        await interaction.reply(payload);
    }
};

const buildResourceList = (targetId) => {
    const inventory = getUserInventory(targetId);
    if (!inventory.length) return '_Inventário vazio._';

    return inventory
        .map((item) => {
            const meta = getResourceMeta(item.key) ?? {};
            return formatResourceLine('pt-BR', {
                key: item.key,
                amount: item.amount,
                emoji: meta.emoji ?? '<:registry:1536459835921530890>',
                rarity: meta.rarity ?? 'A',
            });
        })
        .join('\n');
};

const buildMissionSection = (targetId) => {
    resolveExplorationMission(targetId);
    const mission = getExplorationMission(targetId);

    if (!mission) return '_Sem missão ativa._';

    const label = STATUS_LABEL[mission.status] ?? mission.status;
    const restante = formatTimeRemaining(mission.phase_ends_at, 'pt-BR');
    const duracaoFase = formatDuration(
        Math.max(0, Math.round((mission.phase_ends_at - mission.phase_started_at) / 1000)),
        'pt-BR'
    );

    return `**Planeta:** ${mission.planet_name}
**Fase atual:** ${label}
**Duração da fase:** \`${duracaoFase}\`
**Tempo restante:** \`${restante}\``;
};

const buildDailySection = (targetId) => {
    const state = getDailyState(targetId);
    const status = state.canClaim
        ? '<:excited:1536247579061256252> disponível'
        : '<:dnd:1536247547193204766> já resgatada hoje';

    return `**Status:** ${status}
**Sequência:** \`${state.currentStreak}\` dia(s)`;
};

const buildPainelPayload = (interaction, targetId) => {
    const user = getUser(targetId);
    const alien = getUserAlien(targetId);
    const coins = getUserCoins(targetId);
    const ship = getUserShip(targetId);
    const mission = getExplorationMission(targetId);
    const dailyState = getDailyState(targetId);

    const header = new TextDisplayBuilder().setContent(
`# <:settings:1536247760373088266> Painel administrativo

**Usuário:** <@${targetId}> (\`${targetId}\`)
**Alienígena:** ${alien ? (alien.name ?? '_sem nome_') : '_ainda não criou_'}
**Moedas:** \`${coins.toLocaleString('pt-BR')}\` ∩oins
**Nave:** propulsor \`${ship.propulsorTier}\` · escavação \`${ship.excavationProbeLevel}\` · scanner \`${ship.starScannerLevel}\``
    );

    const missionTxt = new TextDisplayBuilder().setContent(
`## <:ovni:1536247726889762847> Missão de exploração\n${buildMissionSection(targetId)}`
    );

    const dailyTxt = new TextDisplayBuilder().setContent(
`## <:gold_coins:1536941656178298992> Recompensa diária\n${buildDailySection(targetId)}`
    );

    const inventoryTxt = new TextDisplayBuilder().setContent(
`## <:registry:1536459835921530890> Inventário\n${buildResourceList(targetId)}`
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
            .setLabel('Pular fase atual')
            .setEmoji('<:loading:1536247662372982794>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!mission),
        new ButtonBuilder()
            .setCustomId(`painel_skipall:${targetId}`)
            .setLabel('Pular até chegar')
            .setEmoji('<:restart:1536248409634246719>')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!mission),
        new ButtonBuilder()
            .setCustomId(`painel_refresh:${targetId}`)
            .setLabel('Atualizar')
            .setEmoji('<:online:1536247711169249391>')
            .setStyle(ButtonStyle.Secondary)
    );

    const rowSetters = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`painel_setres:${targetId}`)
            .setLabel('Setar recurso')
            .setEmoji('<:registry:1536459835921530890>')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`painel_setcoins:${targetId}`)
            .setLabel('Setar moedas')
            .setEmoji('<:gold_coins:1536941656178298992>')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`painel_skipdaily:${targetId}`)
            .setLabel('Pular diária')
            .setEmoji('<:restart:1536248409634246719>')
            .setStyle(ButtonStyle.Success)
            .setDisabled(dailyState.canClaim)
    );

    container.addActionRowComponents(rowActions);
    container.addActionRowComponents(rowSetters);

    return {
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container],
    };
};

const buildSetResourceModal = (targetId) => {
    const modal = new ModalBuilder()
        .setCustomId(`painel_setres_modal:${targetId}`)
        .setTitle('Setar recurso');

    const resourceInput = new TextInputBuilder()
        .setCustomId('recurso')
        .setLabel('Recurso (ex: pedra, ferro, blueCrystal)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const amountInput = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel('Quantidade (número inteiro, ≥ 0)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(resourceInput),
        new ActionRowBuilder().addComponents(amountInput)
    );

    return modal;
};

const buildSetCoinsModal = (targetId) => {
    const modal = new ModalBuilder()
        .setCustomId(`painel_setcoins_modal:${targetId}`)
        .setTitle('Setar moedas');

    const amountInput = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel('Quantidade de moedas (número inteiro, ≥ 0)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

    return modal;
};

module.exports = {
    // Comando sensível: sem cooldown "de jogo" normal, mas também não precisa ser rápido.
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('[Owner] Painel administrativo para gerenciar um jogador')
        .addStringOption((option) =>
            option
                .setName('id')
                .setDescription('ID do Discord do usuário que você quer gerenciar')
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
                content: '<:hmm:1536247599365890139> ID inválido. Envie apenas o ID numérico do Discord do usuário.',
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
            await interaction.reply({
                content: '<:hmm:1536247599365890139> ID inválido nesse componente.',
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        if (action === 'painel_setres') {
            await interaction.showModal(buildSetResourceModal(targetId));
            return true;
        }

        if (action === 'painel_setcoins') {
            await interaction.showModal(buildSetCoinsModal(targetId));
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
            await interaction.reply({
                content: '<:hmm:1536247599365890139> ID inválido nesse componente.',
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        if (action === 'painel_setres_modal') {
            const rawResource = interaction.fields.getTextInputValue('recurso');
            const rawAmount = interaction.fields.getTextInputValue('quantidade');

            const resourceKey = normalizeResourceInput(rawResource);
            const amount = Number.parseInt(rawAmount, 10);

            if (!resourceKey) {
                await interaction.reply({
                    content: `<:hmm:1536247599365890139> Recurso "${rawResource}" não reconhecido.`,
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }

            if (!Number.isFinite(amount) || amount < 0) {
                await interaction.reply({
                    content: '<:hmm:1536247599365890139> Quantidade inválida. Envie um número inteiro maior ou igual a 0.',
                    flags: MessageFlags.Ephemeral,
                });
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

        if (action === 'painel_setcoins_modal') {
            const rawAmount = interaction.fields.getTextInputValue('quantidade');
            const amount = Number.parseInt(rawAmount, 10);

            if (!Number.isFinite(amount) || amount < 0) {
                await interaction.reply({
                    content: '<:hmm:1536247599365890139> Quantidade inválida. Envie um número inteiro maior ou igual a 0.',
                    flags: MessageFlags.Ephemeral,
                });
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