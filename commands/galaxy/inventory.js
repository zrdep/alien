const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const {
    getUserAlien,
    getUserLanguage,
    resolveExplorationMission,
    getExplorationMission,
    getUserInventory,
    getUserCoins,
    getUserItems,
    popMissionNotice,
} = require('../../utils/db');
const { getConsumable, getConsumableName } = require('../../gameConfig/consumables');
const { getResourceMeta } = require('../../utils/planetResources');
const { formatResourceLine } = require('../../utils/resourcesDisplay');
const { buildMissionStatusContent, buildArrivalNotice } = require('../../utils/exploration');

const RARITY_ORDER = { E: 0, D: 1, C: 2, B: 3, A: 4 };

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('inventory')
        .setNameLocalizations({ 'pt-BR': 'inventario' })
        .setDescription('View your collected galactic resources')
        .setDescriptionLocalizations({
            'pt-BR': 'Veja seus recursos galácticos coletados',
        }),

    async execute(interaction) {
        const alien = getUserAlien(interaction.user.id);
        if (!alien) {
            await interaction.editReply({
                content: `<:ovni:1536247726889762847> **${tFor(interaction, 'commands.planet.alienRequired')}**\n${tFor(interaction, 'commands.planet.alienRequiredTip')}`,
            });
            return;
        }

        resolveExplorationMission(interaction.user.id);
        const mission = getExplorationMission(interaction.user.id);
        const arrivalNotice = popMissionNotice(interaction.user.id);
        const lang = getUserLanguage(interaction.user.id);
        const inventory = getUserInventory(interaction.user.id);
        const coins = getUserCoins(interaction.user.id);
        const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

        const header = new TextDisplayBuilder().setContent(`
# <:registry:1536459835921530890> ${tFor(interaction, 'commands.inventory.title')}

<:sunglasses:1536248455519801386> ${tFor(interaction, 'commands.inventory.subtitle')}

<:gold_coins:1536941656178298992> **${tFor(interaction, 'commands.inventory.coinsLabel')}:** \`${coins.toLocaleString(numLoc)}\` ∩oins
`);

        let bodyText;
        if (!inventory.length) {
            bodyText = `<:hmm:1536247599365890139> ${tFor(interaction, 'commands.inventory.empty')}`;
        } else {
            const sorted = inventory
                .map((item) => {
                    const meta = getResourceMeta(item.key);
                    return {
                        key: item.key,
                        amount: item.amount,
                        rarity: meta?.rarity ?? 'A',
                        emoji: meta?.emoji ?? '<:registry:1536459835921530890>',
                    };
                })
                .sort((a, b) => {
                    const rarityDiff = (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9);
                    if (rarityDiff !== 0) return rarityDiff;
                    return b.amount - a.amount;
                });

            const lines = sorted.map((item) => formatResourceLine(lang, item)).join('\n');

            bodyText = `
## <:excited:1536247579061256252> ${tFor(interaction, 'commands.inventory.resourcesTitle')}

${lines}
`;
        }

        // Consumíveis (Kit de Mineração, Célula de Combustível...) — usados
        // nos botões de exploração do /planet.
        const items = getUserItems(interaction.user.id).filter((i) => getConsumable(i.itemKey));
        if (items.length) {
            const itemLines = items
                .map((i) => `${getConsumable(i.itemKey).emoji} **${getConsumableName(i.itemKey, lang)}** × \`${i.quantity}\``)
                .join('\n');
            bodyText += `\n## <:rainbow:1536248394681552957> ${tFor(interaction, 'commands.inventory.itemsTitle')}\n\n${itemLines}\n`;
        }

        const body = new TextDisplayBuilder().setContent(bodyText);

        const inventoryContainer = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(body);

        if (mission) {
            const missionBlocks = [];
            if (arrivalNotice) missionBlocks.push(buildArrivalNotice(interaction.user.id, arrivalNotice));
            missionBlocks.push(buildMissionStatusContent(interaction.user.id, mission));

            const missionText = new TextDisplayBuilder().setContent(missionBlocks.filter(Boolean).join('\n\n'));
            const combined = new ContainerBuilder()
                .addTextDisplayComponents(missionText)
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(header)
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(body);

            await interaction.editReply({
                content: '',
                flags: MessageFlags.IsComponentsV2,
                components: [combined],
            });
            return;
        }

        if (arrivalNotice) {
            const notice = new TextDisplayBuilder().setContent(buildArrivalNotice(interaction.user.id, arrivalNotice));
            const withNotice = new ContainerBuilder()
                .addTextDisplayComponents(notice)
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(header)
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(body);

            await interaction.editReply({
                content: '',
                flags: MessageFlags.IsComponentsV2,
                components: [withNotice],
            });
            return;
        }

        await interaction.editReply({
            content: '',
            flags: MessageFlags.IsComponentsV2,
            components: [inventoryContainer],
        });
    },
};
