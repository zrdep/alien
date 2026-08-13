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
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const { tFor } = require('../../utils/i18n');
const {
    getUserAlien,
    getUserLanguage,
    getUserCoins,
    createMarketListing,
    getMarketListingsByResource,
    getUserMarketListings,
    getMarketListingById,
    buyMarketListing,
    cancelMarketListing,
    buyFromSystemShop,
} = require('../../utils/db');
const {
    getAllMarketResources,
    getResourceInfo,
    isValidResourceKey,
} = require('../../utils/market');

const MARKET_IMAGE_NAME = 'bag_coins.png';
const MARKET_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', MARKET_IMAGE_NAME);

function createMarketHeader(interaction, subTitle) {
    const title = tFor(interaction, 'commands.market.title');
    return new TextDisplayBuilder().setContent(
        `# <:gold_coins:1536941656178298992> ${title}\n` +
        `<:saturn:1536459943480270959> *${subTitle}*`
    );
}

function buildResourceSelectMenu(interaction, selectedKey = 'stone', context = 'global') {
    const lang = getUserLanguage(interaction.user.id);
    const resources = getAllMarketResources();

    const options = resources.map((r) => ({
        label: lang === 'pt-BR' ? r.namePt : r.nameEn,
        value: r.key,
        emoji: r.emoji,
        default: r.key === selectedKey,
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`market_select_resource_${context}`)
            .setPlaceholder(tFor(interaction, 'commands.market.selectResourcePlaceholder'))
            .addOptions(options)
    );
}

function buildNavButtons(interaction, activeTab = 'global') {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('market_nav_global')
            .setLabel(tFor(interaction, 'commands.market.browseGlobalButton'))
            .setEmoji('<:ovni:1536247726889762847>')
            .setStyle(activeTab === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('market_nav_shop')
            .setLabel(tFor(interaction, 'commands.market.buyFromShopButton'))
            .setEmoji('<:config:1536247533502734376>')
            .setStyle(activeTab === 'shop' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('market_nav_mylistings')
            .setLabel(tFor(interaction, 'commands.market.myListingsButton'))
            .setEmoji('<:registry:1536459835921530890>')
            .setStyle(activeTab === 'mylistings' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
}

function renderGlobalMarketContainer(interaction, selectedResourceKey = 'stone', page = 1) {
    const lang = getUserLanguage(interaction.user.id);
    const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
    const isPt = lang === 'pt-BR';
    const resourceInfo = getResourceInfo(selectedResourceKey) ?? getResourceInfo('stone');

    const resourceName = isPt ? resourceInfo.namePt : resourceInfo.nameEn;

    const MAX_PAGES = 3;
    const ITEMS_PER_PAGE = 5;
    const currentPage = Math.min(Math.max(1, page), MAX_PAGES);
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const { listings, total } = getMarketListingsByResource(resourceInfo.key, ITEMS_PER_PAGE, offset);
    const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)));

    const headerTitle = tFor(interaction, 'commands.market.browseTitle', { resource: `${resourceInfo.emoji} ${resourceName}` }) +
        ` • ${isPt ? 'Pág.' : 'Pg.'} ${currentPage}/${totalPages}`;
    const header = createMarketHeader(interaction, headerTitle);

    let listingsText = '';
    const actionRows = [];

    if (listings.length === 0) {
        listingsText = `<:hmm:1536247599365890139> *${tFor(interaction, 'commands.market.noListings')}*\n\n` +
            `<:excited:1536247579061256252> ${tFor(interaction, 'commands.market.shopNote')}`;
    } else {
        listingsText = listings.map((l, index) => {
            const globalIndex = offset + index;
            const priceUnitFormatted = l.pricePerUnit.toLocaleString(numLoc);
            const totalFormatted = (l.pricePerUnit * l.amount).toLocaleString(numLoc);
            const rankEmoji = globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : globalIndex === 2 ? '🥉' : '🔹';
            return (
                `${rankEmoji} **ID #${l.id}** • ${tFor(interaction, 'commands.market.sellerLabel')}: <@${l.sellerId}>\n` +
                `└ **${l.amount.toLocaleString(numLoc)}x** ${resourceInfo.emoji} ${resourceName} — **\`${priceUnitFormatted}\`** ∩oins/un (${totalFormatted} ∩oins)`
            );
        }).join('\n\n');

        if (total > MAX_PAGES * ITEMS_PER_PAGE) {
            listingsText += `\n\n<:config:1536247533502734376> *${isPt
                ? `Mostrando as 3 primeiras páginas (${MAX_PAGES * ITEMS_PER_PAGE} de ${total} ofertas). Anuncie por um preço menor para figurar entre os mais baratos!`
                : `Showing first 3 pages (${MAX_PAGES * ITEMS_PER_PAGE} of ${total} offers). List at a lower price to rank among the cheapest!`
            }*`;
        }

        const cheapest = listings[0];
        if (cheapest && cheapest.sellerId !== interaction.user.id) {
            actionRows.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`market_buy_listing_${cheapest.id}_1`)
                        .setLabel(`${tFor(interaction, 'commands.market.buyButton')} (1x • ${cheapest.pricePerUnit.toLocaleString(numLoc)} ∩oins)`)
                        .setEmoji('<:excited:1536247579061256252>')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`market_buy_listing_${cheapest.id}_${cheapest.amount}`)
                        .setLabel(`Tudo (${cheapest.amount}x • ${(cheapest.pricePerUnit * cheapest.amount).toLocaleString(numLoc)} ∩oins)`)
                        .setEmoji('<:gold_coins:1536941656178298992>')
                        .setStyle(ButtonStyle.Primary)
                )
            );
        }
    }

    const bodyText = new TextDisplayBuilder().setContent(listingsText);

    const hasImage = fs.existsSync(MARKET_IMAGE_PATH);
    let section;
    if (hasImage) {
        const thumbnail = new ThumbnailBuilder().setURL(`attachment://${MARKET_IMAGE_NAME}`);
        section = new SectionBuilder().addTextDisplayComponents(bodyText).setThumbnailAccessory(thumbnail);
    } else {
        section = new SectionBuilder().addTextDisplayComponents(bodyText);
    }

    const selectRow = buildResourceSelectMenu(interaction, resourceInfo.key, 'global');
    const navRow = buildNavButtons(interaction, 'global');

    const paginationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`market_page_global_${resourceInfo.key}_${currentPage - 1}`)
            .setLabel(isPt ? '◀ Anterior' : '◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage <= 1),
        new ButtonBuilder()
            .setCustomId(`market_page_info`)
            .setLabel(`${currentPage}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`market_page_global_${resourceInfo.key}_${currentPage + 1}`)
            .setLabel(isPt ? 'Próximo ▶' : 'Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages || currentPage >= MAX_PAGES)
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const files = hasImage ? [{ attachment: MARKET_IMAGE_PATH, name: MARKET_IMAGE_NAME }] : [];
    const components = [container, selectRow, navRow, paginationRow, ...actionRows];

    return { components, files, flags: MessageFlags.IsComponentsV2 };
}

function renderSystemShopContainer(interaction, selectedResourceKey = 'stone') {
    const lang = getUserLanguage(interaction.user.id);
    const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
    const resourceInfo = getResourceInfo(selectedResourceKey) ?? getResourceInfo('stone');
    const resourceName = lang === 'pt-BR' ? resourceInfo.namePt : resourceInfo.nameEn;

    const header = createMarketHeader(interaction, tFor(interaction, 'commands.market.shopTitle'));

    const resources = getAllMarketResources();
    const shopListText = resources.map((r) => {
        const rName = lang === 'pt-BR' ? r.namePt : r.nameEn;
        const isSelected = r.key === resourceInfo.key ? '▶ ' : '';
        return `${isSelected}${r.emoji} **${rName}**: \`${r.systemShopPrice.toLocaleString(numLoc)}\` ∩oins/un`;
    }).join('\n');

    const selectedDetails =
        `### ${resourceInfo.emoji} **${resourceName}**\n` +
        `**${tFor(interaction, 'commands.market.systemPriceLabel')}**: \`${resourceInfo.systemShopPrice.toLocaleString(numLoc)}\` ∩oins/un\n\n` +
        `${tFor(interaction, 'commands.market.shopNote')}`;

    const bodyText = new TextDisplayBuilder().setContent(
        `${selectedDetails}\n\n` +
        `## Lista de Preços da Loja Oficial:\n${shopListText}`
    );

    const hasImage = fs.existsSync(MARKET_IMAGE_PATH);
    let section;
    if (hasImage) {
        const thumbnail = new ThumbnailBuilder().setURL(`attachment://${MARKET_IMAGE_NAME}`);
        section = new SectionBuilder().addTextDisplayComponents(bodyText).setThumbnailAccessory(thumbnail);
    } else {
        section = new SectionBuilder().addTextDisplayComponents(bodyText);
    }

    const selectRow = buildResourceSelectMenu(interaction, resourceInfo.key, 'shop');
    const navRow = buildNavButtons(interaction, 'shop');

    const shopActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`market_buy_shop_${resourceInfo.key}_1`)
            .setLabel(`Comprar 1x (${resourceInfo.systemShopPrice.toLocaleString(numLoc)} ∩oins)`)
            .setEmoji('<:gold_coins:1536941656178298992>')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`market_buy_shop_${resourceInfo.key}_10`)
            .setLabel(`Comprar 10x (${(resourceInfo.systemShopPrice * 10).toLocaleString(numLoc)} ∩oins)`)
            .setEmoji('<:gold_coins:1536941656178298992>')
            .setStyle(ButtonStyle.Primary)
    );

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const files = hasImage ? [{ attachment: MARKET_IMAGE_PATH, name: MARKET_IMAGE_NAME }] : [];
    const components = [container, selectRow, navRow, shopActionRow];

    return { components, files, flags: MessageFlags.IsComponentsV2 };
}

function formatTimeLeft(seconds, isPt) {
    if (seconds <= 0) return isPt ? 'Expirado' : 'Expired';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${Math.max(1, minutes)}m`;
}

function renderMyListingsContainer(interaction) {
    const lang = getUserLanguage(interaction.user.id);
    const isPt = lang === 'pt-BR';
    const numLoc = isPt ? 'pt-BR' : 'en-US';
    const now = Date.now();

    const header = createMarketHeader(interaction, tFor(interaction, 'commands.market.myListingsTitle'));
    const userListings = getUserMarketListings(interaction.user.id);

    let contentText = '';
    const cancelRows = [];

    if (userListings.length === 0) {
        contentText = `<:hmm:1536247599365890139> *${tFor(interaction, 'commands.market.noMyListings')}*`;
    } else {
        const expiredListings = userListings.filter(l => l.status === 'expired' || (l.expiresAt > 0 && l.expiresAt <= now));
        const activeListings = userListings.filter(l => l.status === 'active' && (l.expiresAt === 0 || l.expiresAt > now));

        let textBlocks = [];

        if (expiredListings.length > 0) {
            const expiredText = expiredListings.map((l) => {
                const res = getResourceInfo(l.resourceKey);
                const resName = res ? (isPt ? res.namePt : res.nameEn) : l.resourceKey;
                const emoji = res?.emoji ?? '<:rock:1536579687407681596>';
                return (
                    `⏰ **ID #${l.id} [EXPIRADO - 7 DIAS]** • ${emoji} **${resName}**\n` +
                    `└ **${l.amount.toLocaleString(numLoc)}x** (${isPt ? 'Sem compradores em 7 dias' : 'No buyers in 7 days'}) • **[Pronto para Resgate]**`
                );
            }).join('\n\n');

            textBlocks.push(`## ⏰ ${isPt ? 'Anúncios Expirados (Prontos para Resgate)' : 'Expired Listings (Ready to Claim)'}:\n${expiredText}`);
        }

        if (activeListings.length > 0) {
            const activeText = activeListings.map((l) => {
                const res = getResourceInfo(l.resourceKey);
                const resName = res ? (isPt ? res.namePt : res.nameEn) : l.resourceKey;
                const emoji = res?.emoji ?? '<:rock:1536579687407681596>';
                const secondsLeft = Math.max(0, Math.floor((l.expiresAt - now) / 1000));
                const timeLeft = formatTimeLeft(secondsLeft, isPt);

                return (
                    `🔹 **ID #${l.id}** • ${emoji} **${resName}**\n` +
                    `└ **${l.amount.toLocaleString(numLoc)}x** por **\`${l.pricePerUnit.toLocaleString(numLoc)}\`** ∩oins/un • ⏳ Expira em: **${timeLeft}**`
                );
            }).join('\n\n');

            textBlocks.push(`## 🔹 ${isPt ? 'Anúncios Ativos no Mercado' : 'Active Market Listings'}:\n${activeText}`);
        }

        contentText = textBlocks.join('\n\n---\n\n');

        const sortedForButtons = [...expiredListings, ...activeListings].slice(0, 5);
        const buttons = sortedForButtons.map((l) => {
            const isExpired = l.status === 'expired' || (l.expiresAt > 0 && l.expiresAt <= now);
            if (isExpired) {
                return new ButtonBuilder()
                    .setCustomId(`market_cancel_listing_${l.id}`)
                    .setLabel(`${isPt ? 'Resgatar' : 'Claim'} ID #${l.id}`)
                    .setEmoji('<:excited:1536247579061256252>')
                    .setStyle(ButtonStyle.Success);
            }
            return new ButtonBuilder()
                .setCustomId(`market_cancel_listing_${l.id}`)
                .setLabel(`${isPt ? 'Cancelar' : 'Cancel'} ID #${l.id}`)
                .setEmoji('<:restart:1536248409634246719>')
                .setStyle(ButtonStyle.Danger);
        });

        if (buttons.length > 0) {
            cancelRows.push(new ActionRowBuilder().addComponents(buttons));
        }
    }

    const bodyText = new TextDisplayBuilder().setContent(contentText);

    const hasImage = fs.existsSync(MARKET_IMAGE_PATH);
    let section;
    if (hasImage) {
        const thumbnail = new ThumbnailBuilder().setURL(`attachment://${MARKET_IMAGE_NAME}`);
        section = new SectionBuilder().addTextDisplayComponents(bodyText).setThumbnailAccessory(thumbnail);
    } else {
        section = new SectionBuilder().addTextDisplayComponents(bodyText);
    }

    const navRow = buildNavButtons(interaction, 'mylistings');

    const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const files = hasImage ? [{ attachment: MARKET_IMAGE_PATH, name: MARKET_IMAGE_NAME }] : [];
    const components = [container, navRow, ...cancelRows];

    return { components, files, flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('market')
        .setNameLocalizations({ 'pt-BR': 'mercado' })
        .setDescription('Global resource market and system shop')
        .setDescriptionLocalizations({
            'pt-BR': 'Mercado global de recursos e loja do sistema',
        })
        .addSubcommand((sub) =>
            sub
                .setName('view')
                .setNameLocalizations({ 'pt-BR': 'painel' })
                .setDescription('Open the market browser panel')
                .setDescriptionLocalizations({
                    'pt-BR': 'Abre o painel interativo do mercado',
                })
                .addStringOption((opt) =>
                    opt
                        .setName('resource')
                        .setNameLocalizations({ 'pt-BR': 'recurso' })
                        .setDescription('Filter by resource')
                        .setDescriptionLocalizations({ 'pt-BR': 'Filtrar por recurso' })
                        .setRequired(false)
                        .addChoices(
                            ...getAllMarketResources().map((r) => ({
                                name: `${r.namePt} (${r.key})`,
                                value: r.key,
                            }))
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('sell')
                .setNameLocalizations({ 'pt-BR': 'vender' })
                .setDescription('List a resource for sale on the global market')
                .setDescriptionLocalizations({
                    'pt-BR': 'Anuncia um recurso para venda no mercado global',
                })
                .addStringOption((opt) =>
                    opt
                        .setName('resource')
                        .setNameLocalizations({ 'pt-BR': 'recurso' })
                        .setDescription('Resource to sell')
                        .setDescriptionLocalizations({ 'pt-BR': 'Recurso para vender' })
                        .setRequired(true)
                        .addChoices(
                            ...getAllMarketResources().map((r) => ({
                                name: `${r.namePt} (${r.key})`,
                                value: r.key,
                            }))
                        )
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('amount')
                        .setNameLocalizations({ 'pt-BR': 'quantidade' })
                        .setDescription('Quantity to sell')
                        .setDescriptionLocalizations({ 'pt-BR': 'Quantidade para vender' })
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('price')
                        .setNameLocalizations({ 'pt-BR': 'preco_unitario' })
                        .setDescription('Price in ∩oins per unit')
                        .setDescriptionLocalizations({ 'pt-BR': 'Preço em ∩oins por unidade' })
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('shop')
                .setNameLocalizations({ 'pt-BR': 'loja' })
                .setDescription('Buy resources directly from the System Shop at fixed prices')
                .setDescriptionLocalizations({
                    'pt-BR': 'Compra recursos diretamente da Loja do Sistema a preço fixo',
                })
                .addStringOption((opt) =>
                    opt
                        .setName('resource')
                        .setNameLocalizations({ 'pt-BR': 'recurso' })
                        .setDescription('Resource to buy')
                        .setDescriptionLocalizations({ 'pt-BR': 'Recurso para comprar' })
                        .setRequired(true)
                        .addChoices(
                            ...getAllMarketResources().map((r) => ({
                                name: `${r.namePt} (${r.key})`,
                                value: r.key,
                            }))
                        )
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('amount')
                        .setNameLocalizations({ 'pt-BR': 'quantidade' })
                        .setDescription('Quantity to buy')
                        .setDescriptionLocalizations({ 'pt-BR': 'Quantidade para comprar' })
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('my_listings')
                .setNameLocalizations({ 'pt-BR': 'meus_anuncios' })
                .setDescription('View and manage your active market listings')
                .setDescriptionLocalizations({
                    'pt-BR': 'Veja e gerencie seus anúncios ativos no mercado',
                })
        ),

    async execute(interaction) {
        const alien = getUserAlien(interaction.user.id);
        if (!alien) {
            await interaction.editReply({
                content: `<:alien:1536247533502734376> **${tFor(interaction, 'commands.planet.alienRequired')}**\n${tFor(interaction, 'commands.planet.alienRequiredTip')}`,
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand(false) ?? 'view';

        if (subcommand === 'sell' || subcommand === 'vender') {
            const resourceKey = interaction.options.getString('resource', true);
            const amount = interaction.options.getInteger('amount', true);
            const pricePerUnit = interaction.options.getInteger('price', true);

            const result = createMarketListing(interaction.user.id, resourceKey, amount, pricePerUnit);
            if (!result.success) {
                let errorMsg = tFor(interaction, 'commands.market.invalidValues');
                if (result.reason === 'insufficient_resources') {
                    errorMsg = tFor(interaction, 'commands.market.insufficientResources');
                }
                await interaction.editReply({ content: errorMsg });
                return;
            }

            const resInfo = getResourceInfo(resourceKey);
            const lang = getUserLanguage(interaction.user.id);
            const resName = resInfo ? (lang === 'pt-BR' ? resInfo.namePt : resInfo.nameEn) : resourceKey;
            const emoji = resInfo?.emoji ?? '';

            await interaction.editReply({
                content: tFor(interaction, 'commands.market.sellSuccess', {
                    amount,
                    emoji,
                    resource: resName,
                    price: pricePerUnit.toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US'),
                    total: (amount * pricePerUnit).toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US'),
                }),
            });
            return;
        }

        if (subcommand === 'shop' || subcommand === 'loja') {
            const resourceKey = interaction.options.getString('resource', true);
            const amount = interaction.options.getInteger('amount', true);

            const result = buyFromSystemShop(interaction.user.id, resourceKey, amount);
            if (!result.success) {
                let errorMsg = tFor(interaction, 'commands.market.invalidValues');
                if (result.reason === 'insufficient_coins') {
                    errorMsg = tFor(interaction, 'commands.market.insufficientCoins', {
                        total: result.totalCost.toLocaleString(getUserLanguage(interaction.user.id)),
                    });
                }
                await interaction.editReply({ content: errorMsg });
                return;
            }

            const resInfo = getResourceInfo(resourceKey);
            const lang = getUserLanguage(interaction.user.id);
            const resName = resInfo ? (lang === 'pt-BR' ? resInfo.namePt : resInfo.nameEn) : resourceKey;
            const emoji = resInfo?.emoji ?? '';

            await interaction.editReply({
                content: tFor(interaction, 'commands.market.buySuccess', {
                    amount,
                    emoji,
                    resource: resName,
                    total: result.totalCost.toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US'),
                }),
            });
            return;
        }

        if (subcommand === 'my_listings' || subcommand === 'meus_anuncios') {
            const payload = renderMyListingsContainer(interaction);
            await interaction.editReply(payload);
            return;
        }

        // View / Default
        const selectedResource = interaction.options.getString('resource') ?? 'stone';
        const payload = renderGlobalMarketContainer(interaction, selectedResource, 1);
        await interaction.editReply(payload);
    },

    async handleSelectMenu(interaction) {
        if (!interaction.customId.startsWith('market_select_resource')) return false;

        const selectedResourceKey = interaction.values[0];

        if (interaction.customId === 'market_select_resource_shop') {
            const payload = renderSystemShopContainer(interaction, selectedResourceKey);
            await interaction.update(payload);
            return true;
        }

        // Global Market View (default page 1)
        const payload = renderGlobalMarketContainer(interaction, selectedResourceKey, 1);
        await interaction.update(payload);
        return true;
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('market_')) return false;

        const lang = getUserLanguage(interaction.user.id);
        const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

        if (interaction.customId === 'market_nav_global') {
            const payload = renderGlobalMarketContainer(interaction, 'stone', 1);
            await interaction.update(payload);
            return true;
        }

        if (interaction.customId === 'market_nav_shop') {
            const payload = renderSystemShopContainer(interaction, 'stone');
            await interaction.update(payload);
            return true;
        }

        if (interaction.customId === 'market_nav_mylistings') {
            const payload = renderMyListingsContainer(interaction);
            await interaction.update(payload);
            return true;
        }

        if (interaction.customId.startsWith('market_page_global_')) {
            const parts = interaction.customId.replace('market_page_global_', '').split('_');
            const resourceKey = parts[0];
            const pageNum = parseInt(parts[1], 10) || 1;

            const payload = renderGlobalMarketContainer(interaction, resourceKey, pageNum);
            await interaction.update(payload);
            return true;
        }

        if (interaction.customId.startsWith('market_buy_listing_')) {
            const parts = interaction.customId.replace('market_buy_listing_', '').split('_');
            const listingId = parseInt(parts[0], 10);
            const buyAmount = parseInt(parts[1], 10);

            const result = buyMarketListing(interaction.user.id, listingId, buyAmount);
            if (!result.success) {
                let errorMsg = tFor(interaction, 'commands.market.listingNotFound');
                if (result.reason === 'cannot_buy_own_listing') {
                    errorMsg = tFor(interaction, 'commands.market.cannotBuyOwn');
                } else if (result.reason === 'insufficient_coins') {
                    errorMsg = tFor(interaction, 'commands.market.insufficientCoins', {
                        total: result.totalCost.toLocaleString(numLoc),
                    });
                }
                await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
                return true;
            }

            const resInfo = getResourceInfo(result.resourceKey);
            const resName = resInfo ? (lang === 'pt-BR' ? resInfo.namePt : resInfo.nameEn) : result.resourceKey;
            const emoji = resInfo?.emoji ?? '';

            await interaction.reply({
                content: tFor(interaction, 'commands.market.buySuccess', {
                    amount: result.buyAmount,
                    emoji,
                    resource: resName,
                    total: result.totalCost.toLocaleString(numLoc),
                }),
                flags: MessageFlags.Ephemeral,
            });

            // Refresh global market view
            const payload = renderGlobalMarketContainer(interaction, result.resourceKey, 1);
            await interaction.message.edit(payload).catch(() => {});
            return true;
        }

        if (interaction.customId.startsWith('market_buy_shop_')) {
            const parts = interaction.customId.replace('market_buy_shop_', '').split('_');
            const resourceKey = parts[0];
            const buyAmount = parseInt(parts[1], 10);

            const result = buyFromSystemShop(interaction.user.id, resourceKey, buyAmount);
            if (!result.success) {
                let errorMsg = tFor(interaction, 'commands.market.invalidValues');
                if (result.reason === 'insufficient_coins') {
                    errorMsg = tFor(interaction, 'commands.market.insufficientCoins', {
                        total: result.totalCost.toLocaleString(numLoc),
                    });
                }
                await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
                return true;
            }

            const resInfo = getResourceInfo(result.resourceKey);
            const resName = resInfo ? (lang === 'pt-BR' ? resInfo.namePt : resInfo.nameEn) : result.resourceKey;
            const emoji = resInfo?.emoji ?? '';

            await interaction.reply({
                content: tFor(interaction, 'commands.market.buySuccess', {
                    amount: result.amount,
                    emoji,
                    resource: resName,
                    total: result.totalCost.toLocaleString(numLoc),
                }),
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        if (interaction.customId.startsWith('market_cancel_listing_')) {
            const listingId = parseInt(interaction.customId.replace('market_cancel_listing_', ''), 10);

            const result = cancelMarketListing(interaction.user.id, listingId);
            if (!result.success) {
                await interaction.reply({
                    content: tFor(interaction, 'commands.market.listingNotFound'),
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }

            const resInfo = getResourceInfo(result.resourceKey);
            const resName = resInfo ? (lang === 'pt-BR' ? resInfo.namePt : resInfo.nameEn) : result.resourceKey;
            const emoji = resInfo?.emoji ?? '';

            const payload = renderMyListingsContainer(interaction);
            await interaction.update(payload);

            await interaction.followUp({
                content: tFor(interaction, 'commands.market.cancelSuccess', {
                    amount: result.amount,
                    emoji,
                    resource: resName,
                }),
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        return false;
    },
};
