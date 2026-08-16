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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

const { getUserLanguage } = require('../../utils/db');
const {
    getUserHats,
    createHatMarketListing,
    getHatMarketListings,
    getUserHatMarketListings,
    buyHatMarketListing,
    cancelHatMarketListing,
    buyHatFromSystemShop,
} = require('../../utils/db');
const {
    getAllHats,
    getHat,
    getHatName,
    getMinHatListingPrice,
    getHatShopPrice,
    HAT_MARKET_CONFIG,
} = require('../../gameConfig/hats');
const { getRarityEmoji } = require('../../gameConfig/rarities');
const { notifyAchievementsFollowUp } = require('../../utils/achievementNotifier');

const IMAGE_NAME = 'bag_coins.png';
const IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', IMAGE_NAME);

const TXT = {
    'pt-BR': {
        title: 'Mercado de Chapéus',
        browseSubtitle: 'Compre chapéus de outros jogadores',
        sellSubtitle: 'Anuncie um chapéu do seu inventário',
        myListingsSubtitle: 'Seus anúncios ativos',
        shopSubtitle: 'Compre chapéus direto da Loja do Sistema, a preço fixo',
        browseButton: 'Navegar',
        shopButton: 'Loja',
        sellButton: 'Vender',
        myListingsButton: 'Meus Anúncios',
        switchToMarketButton: 'Ver Mercado',
        selectHatPlaceholder: 'Selecione um chapéu...',
        noListings: 'Nenhum anúncio ativo pra esse chapéu ainda.',
        buyButton: 'Comprar',
        buyByIdButton: 'Comprar por ID',
        buyShop1x: (price) => `Comprar 1x (${price.toLocaleString('pt-BR')} ∩oins)`,
        buyShop5x: (price) => `Comprar 5x (${price.toLocaleString('pt-BR')} ∩oins)`,
        shopListTitle: 'Lista de Preços da Loja Oficial:',
        shopNote: 'Chapéus da Loja do Sistema são criados na hora — sem vendedor, sem taxa.',
        noOwnedHats: 'Você não tem nenhum chapéu pra vender. Explore planetas com </planet:1537544781020799123> pra achar um!',
        selectHatToSellPlaceholder: 'Selecione o chapéu que quer vender...',
        noMyListings: 'Você não tem anúncios ativos.',
        cancelButton: 'Cancelar',
        sellModalTitle: 'Anunciar chapéu',
        sellModalPriceLabel: 'Preço (∩oins)',
        buyModalTitle: 'Comprar por ID',
        buyModalIdLabel: 'ID do anúncio',
        invalidValues: 'Valores inválidos.',
        priceTooLow: (min) => `Preço mínimo pra esse chapéu: **${min.toLocaleString('pt-BR')}** ∩oins.`,
        hatNotOwned: 'Você não tem esse chapéu (ou já está anunciado).',
        tooManyListings: (limit) => `Você já tem o máximo de anúncios ativos (${limit}) pra esse chapéu.`,
        sellSuccess: (name, price) => `<:excited:1536247579061256252> Anúncio criado! **${name}** por **${price.toLocaleString('pt-BR')}** ∩oins.`,
        listingNotFound: 'Anúncio não encontrado ou já vendido.',
        cannotBuyOwn: 'Você não pode comprar seu próprio anúncio.',
        insufficientCoins: (total) => `Você não tem ∩oins suficientes. Precisa de **${total.toLocaleString('pt-BR')}**.`,
        buySuccess: (name, total) => `<:excited:1536247579061256252> Você comprou **${name}** por **${total.toLocaleString('pt-BR')}** ∩oins!`,
        buyShopSuccess: (amount, name, total) => `<:excited:1536247579061256252> Você comprou **${amount}x ${name}** da Loja por **${total.toLocaleString('pt-BR')}** ∩oins!`,
        cancelSuccess: (name) => `Anúncio de **${name}** cancelado — o chapéu voltou pro seu inventário.`,
        feeNote: (fee) => `*Taxa de venda: ${fee}%*`,
    },
    'en-US': {
        title: 'Hat Market',
        browseSubtitle: 'Buy hats from other players',
        sellSubtitle: 'List a hat from your inventory',
        myListingsSubtitle: 'Your active listings',
        shopSubtitle: 'Buy hats directly from the System Shop at a fixed price',
        browseButton: 'Browse',
        shopButton: 'Shop',
        sellButton: 'Sell',
        myListingsButton: 'My Listings',
        switchToMarketButton: 'View Market',
        selectHatPlaceholder: 'Select a hat...',
        noListings: 'No active listings for this hat yet.',
        buyButton: 'Buy',
        buyByIdButton: 'Buy by ID',
        buyShop1x: (price) => `Buy 1x (${price.toLocaleString('en-US')} ∩oins)`,
        buyShop5x: (price) => `Buy 5x (${price.toLocaleString('en-US')} ∩oins)`,
        shopListTitle: 'Official Shop Price List:',
        shopNote: 'System Shop hats are created on the spot — no seller, no fee.',
        noOwnedHats: "You don't have any hats to sell. Explore planets with </planet:1537544781020799123> to find one!",
        selectHatToSellPlaceholder: 'Select the hat you want to sell...',
        noMyListings: "You don't have any active listings.",
        cancelButton: 'Cancel',
        sellModalTitle: 'List hat',
        sellModalPriceLabel: 'Price (∩oins)',
        buyModalTitle: 'Buy by ID',
        buyModalIdLabel: 'Listing ID',
        invalidValues: 'Invalid values.',
        priceTooLow: (min) => `Minimum price for this hat: **${min.toLocaleString('en-US')}** ∩oins.`,
        hatNotOwned: "You don't own this hat (or it's already listed).",
        tooManyListings: (limit) => `You already have the max active listings (${limit}) for this hat.`,
        sellSuccess: (name, price) => `<:excited:1536247579061256252> Listing created! **${name}** for **${price.toLocaleString('en-US')}** ∩oins.`,
        listingNotFound: 'Listing not found or already sold.',
        cannotBuyOwn: 'You cannot buy your own listing.',
        insufficientCoins: (total) => `You don't have enough ∩oins. You need **${total.toLocaleString('en-US')}**.`,
        buySuccess: (name, total) => `<:excited:1536247579061256252> You bought **${name}** for **${total.toLocaleString('en-US')}** ∩oins!`,
        buyShopSuccess: (amount, name, total) => `<:excited:1536247579061256252> You bought **${amount}x ${name}** from the Shop for **${total.toLocaleString('en-US')}** ∩oins!`,
        cancelSuccess: (name) => `Listing for **${name}** cancelled — the hat is back in your inventory.`,
        feeNote: (fee) => `*Sale fee: ${fee}%*`,
    },
};

const getTxt = (lang) => TXT[lang] ?? TXT['pt-BR'];

const parseCustomEmoji = (emojiString) => {
    const match = /^<a?:(\w+):(\d+)>$/.exec(emojiString ?? '');
    if (!match) return undefined;
    return { id: match[2], name: match[1] };
};

const header = (t, subtitle) => new TextDisplayBuilder().setContent(
    `# <:gold_coins:1536941656178298992> ${t.title}\n<:saturn:1536459943480270959> *${subtitle}*`
);

const buildNavRow = (active, t) => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hatmarket_nav_browse').setLabel(t.browseButton)
        .setEmoji('<:ovni:1536247726889762847>')
        .setStyle(active === 'browse' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('hatmarket_nav_shop').setLabel(t.shopButton)
        .setEmoji('<:gold_coins:1536941656178298992>')
        .setStyle(active === 'shop' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('hatmarket_nav_sell').setLabel(t.sellButton)
        .setEmoji('<:config:1536247533502734376>')
        .setStyle(active === 'sell' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('hatmarket_nav_mylistings').setLabel(t.myListingsButton)
        .setEmoji('<:registry:1536459835921530890>')
        .setStyle(active === 'mylistings' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('hatmarket_switch_market').setLabel(t.switchToMarketButton)
        .setEmoji('<:rock:1536579687407681596>')
        .setStyle(ButtonStyle.Secondary)
);

const buildHatSelectRow = (customId, placeholder, selectedKey, hats) => {
    const options = hats.map((h) => ({
        label: getHatName(h.key, 'pt-BR'),
        value: h.key,
        emoji: parseCustomEmoji(getRarityEmoji(h.rarity)),
        default: h.key === selectedKey,
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(options.slice(0, 25))
    );
};

const wrapWithImage = (interaction, textDisplay) => {
    const hasImage = fs.existsSync(IMAGE_PATH);
    if (!hasImage) {
        return { section: new SectionBuilder().addTextDisplayComponents(textDisplay), files: [] };
    }
    const thumb = new ThumbnailBuilder().setURL(`attachment://${IMAGE_NAME}`);
    return {
        section: new SectionBuilder().addTextDisplayComponents(textDisplay).setThumbnailAccessory(thumb),
        files: [{ attachment: IMAGE_PATH, name: IMAGE_NAME }],
    };
};

function renderBrowse(interaction, selectedKey) {
    const lang = getUserLanguage(interaction.user.id);
    const t = getTxt(lang);
    const hats = getAllHats();
    const hatKey = selectedKey ?? hats[0]?.key;
    const hat = getHat(hatKey);

    const { listings } = getHatMarketListings(hatKey, 10, 0);

    let body;
    if (!listings.length) {
        body = `<:hmm:1536247599365890139> *${t.noListings}*`;
    } else {
        body = listings.map((l, i) => {
            const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹';
            const seller = l.sellerName || `Usuario#${l.sellerId.substring(0, 4)}`;
            return `${rank} **ID #${l.id}** • ${lang === 'pt-BR' ? 'Vendedor' : 'Seller'}: **${seller}**\n` +
                `└ **\`${l.price.toLocaleString(lang)}\`** ∩oins`;
        }).join('\n\n');
    }

    const rarityEmoji = hat ? getRarityEmoji(hat.rarity) : '';
    const bodyText = new TextDisplayBuilder().setContent(
        `### ${rarityEmoji} ${getHatName(hatKey, lang)}\n\n${body}`
    );

    const { section, files } = wrapWithImage(interaction, bodyText);
    const container = new ContainerBuilder()
        .addTextDisplayComponents(header(t, t.browseSubtitle))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const rows = [container, buildHatSelectRow('hatmarket_select_browse', t.selectHatPlaceholder, hatKey, hats), buildNavRow('browse', t)];

    if (listings.length) {
        const cheapest = listings[0];
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`hatmarket_buy_${cheapest.id}`)
                .setLabel(`${t.buyButton} (${cheapest.price.toLocaleString(lang)} ∩oins)`)
                .setEmoji('<:excited:1536247579061256252>')
                .setStyle(ButtonStyle.Success)
                .setDisabled(cheapest.sellerId === interaction.user.id),
            new ButtonBuilder()
                .setCustomId('hatmarket_open_buy_modal')
                .setLabel(t.buyByIdButton)
                .setEmoji('<:registry:1536459835921530890>')
                .setStyle(ButtonStyle.Secondary)
        );
        rows.push(actionRow);
    }

    return { components: rows, files, flags: MessageFlags.IsComponentsV2 };
}

function renderShop(interaction, selectedKey) {
    const lang = getUserLanguage(interaction.user.id);
    const t = getTxt(lang);
    const hats = getAllHats();
    const hatKey = selectedKey ?? hats[0]?.key;
    const hat = getHat(hatKey);
    const price = getHatShopPrice(hatKey);

    const shopListText = hats.map((h) => {
        const isSelected = h.key === hatKey ? '▶ ' : '';
        return `${isSelected}${getRarityEmoji(h.rarity)} **${getHatName(h.key, lang)}**: \`${getHatShopPrice(h.key).toLocaleString(lang)}\` ∩oins`;
    }).join('\n');

    const rarityEmoji = hat ? getRarityEmoji(hat.rarity) : '';
    const bodyText = new TextDisplayBuilder().setContent(
        `### ${rarityEmoji} ${getHatName(hatKey, lang)}\n` +
        `**${lang === 'pt-BR' ? 'Preço' : 'Price'}**: \`${price.toLocaleString(lang)}\` ∩oins\n\n` +
        `${t.shopNote}\n\n` +
        `## ${t.shopListTitle}\n${shopListText}`
    );

    const { section, files } = wrapWithImage(interaction, bodyText);
    const container = new ContainerBuilder()
        .addTextDisplayComponents(header(t, t.shopSubtitle))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    const buyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`hatmarket_buy_shop_${hatKey}_1`)
            .setLabel(t.buyShop1x(price))
            .setEmoji('<:gold_coins:1536941656178298992>')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`hatmarket_buy_shop_${hatKey}_5`)
            .setLabel(t.buyShop5x(price * 5))
            .setEmoji('<:gold_coins:1536941656178298992>')
            .setStyle(ButtonStyle.Primary)
    );

    const rows = [
        container,
        buildHatSelectRow('hatmarket_select_shop', t.selectHatPlaceholder, hatKey, hats),
        buildNavRow('shop', t),
        buyRow,
    ];

    return { components: rows, files, flags: MessageFlags.IsComponentsV2 };
}

function renderSell(interaction, selectedKey) {
    const lang = getUserLanguage(interaction.user.id);
    const t = getTxt(lang);
    const owned = getUserHats(interaction.user.id);

    let body;
    let rows = [];
    if (!owned.length) {
        body = `<:hmm:1536247599365890139> *${t.noOwnedHats}*`;
    } else {
        const hatKey = selectedKey ?? owned[0].hatKey;
        const hat = getHat(hatKey);
        const minPrice = getMinHatListingPrice(hatKey);
        const qty = owned.find((o) => o.hatKey === hatKey)?.quantity ?? 0;
        const rarityEmoji = hat ? getRarityEmoji(hat.rarity) : '';

        body = `### ${rarityEmoji} ${getHatName(hatKey, lang)} (x${qty})\n\n` +
            `${lang === 'pt-BR' ? 'Preço mínimo' : 'Minimum price'}: **\`${minPrice.toLocaleString(lang)}\`** ∩oins\n` +
            `${t.feeNote(HAT_MARKET_CONFIG.saleFeePercent)}`;

        const ownedHatDefs = owned.map((o) => getHat(o.hatKey)).filter(Boolean);
        rows.push(buildHatSelectRow('hatmarket_select_sell', t.selectHatToSellPlaceholder, hatKey, ownedHatDefs));
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`hatmarket_open_sell_modal_${hatKey}`)
                .setLabel(t.sellButton)
                .setEmoji('<:gold_coins:1536941656178298992>')
                .setStyle(ButtonStyle.Success)
        ));
    }

    const bodyText = new TextDisplayBuilder().setContent(body);
    const { section, files } = wrapWithImage(interaction, bodyText);
    const container = new ContainerBuilder()
        .addTextDisplayComponents(header(t, t.sellSubtitle))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    return { components: [container, ...rows, buildNavRow('sell', t)], files, flags: MessageFlags.IsComponentsV2 };
}

function renderMyListings(interaction) {
    const lang = getUserLanguage(interaction.user.id);
    const t = getTxt(lang);
    const listings = getUserHatMarketListings(interaction.user.id);

    let body;
    const cancelRows = [];
    if (!listings.length) {
        body = `<:hmm:1536247599365890139> *${t.noMyListings}*`;
    } else {
        body = listings.map((l) => {
            const hat = getHat(l.hatKey);
            const rarityEmoji = hat ? getRarityEmoji(hat.rarity) : '';
            return `🔹 **ID #${l.id}** • ${rarityEmoji} ${getHatName(l.hatKey, lang)}\n` +
                `└ **\`${l.price.toLocaleString(lang)}\`** ∩oins`;
        }).join('\n\n');

        const buttons = listings.slice(0, 5).map((l) =>
            new ButtonBuilder()
                .setCustomId(`hatmarket_cancel_${l.id}`)
                .setLabel(`${t.cancelButton} #${l.id}`)
                .setEmoji('<:restart:1536248409634246719>')
                .setStyle(ButtonStyle.Danger)
        );
        if (buttons.length) cancelRows.push(new ActionRowBuilder().addComponents(buttons));
    }

    const bodyText = new TextDisplayBuilder().setContent(body);
    const { section, files } = wrapWithImage(interaction, bodyText);
    const container = new ContainerBuilder()
        .addTextDisplayComponents(header(t, t.myListingsSubtitle))
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    return { components: [container, buildNavRow('mylistings', t), ...cancelRows], files, flags: MessageFlags.IsComponentsV2 };
}

function buildSellModal(interaction, hatKey) {
    const lang = getUserLanguage(interaction.user.id);
    const t = getTxt(lang);
    const modal = new ModalBuilder()
        .setCustomId(`hatmarket_sell_modal_${hatKey}`)
        .setTitle(t.sellModalTitle);

    const priceInput = new TextInputBuilder()
        .setCustomId('price')
        .setLabel(t.sellModalPriceLabel)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(priceInput));
    return modal;
}

function buildBuyModal(interaction) {
    const lang = getUserLanguage(interaction.user.id);
    const t = getTxt(lang);
    const modal = new ModalBuilder()
        .setCustomId('hatmarket_buy_modal')
        .setTitle(t.buyModalTitle);

    const idInput = new TextInputBuilder()
        .setCustomId('listingId')
        .setLabel(t.buyModalIdLabel)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(idInput));
    return modal;
}

module.exports = {
    cooldown: 3,

    data: new SlashCommandBuilder()
        .setName('hatmarket')
        .setNameLocalizations({ 'pt-BR': 'mercadochapeus' })
        .setDescription('Buy and sell hats with other players')
        .setDescriptionLocalizations({
            'pt-BR': 'Compre e venda chapéus com outros jogadores',
        }),

    async execute(interaction) {
        await interaction.editReply(renderBrowse(interaction, null));
    },

    renderBrowse,

    async handleButton(interaction) {
        if (interaction.customId === 'hatmarket_nav_browse') {
            await interaction.update(renderBrowse(interaction, null));
            return true;
        }
        if (interaction.customId === 'hatmarket_nav_shop') {
            await interaction.update(renderShop(interaction, null));
            return true;
        }
        if (interaction.customId === 'hatmarket_nav_sell') {
            await interaction.update(renderSell(interaction, null));
            return true;
        }
        if (interaction.customId === 'hatmarket_nav_mylistings') {
            await interaction.update(renderMyListings(interaction));
            return true;
        }

        if (interaction.customId === 'hatmarket_switch_market') {
            // Requer dentro do handler (não no topo do arquivo) pra evitar
            // problema de import circular — market.js também pode importar
            // coisas deste arquivo pro botão inverso ("Ver Chapéus").
            const { renderGlobalMarketContainer } = require('./market');
            await interaction.update(renderGlobalMarketContainer(interaction, 'stone', 1));
            return true;
        }

        if (interaction.customId === 'hatmarket_open_buy_modal') {
            await interaction.showModal(buildBuyModal(interaction));
            return true;
        }

        if (interaction.customId.startsWith('hatmarket_open_sell_modal_')) {
            const hatKey = interaction.customId.replace('hatmarket_open_sell_modal_', '');
            await interaction.showModal(buildSellModal(interaction, hatKey));
            return true;
        }

        if (interaction.customId.startsWith('hatmarket_buy_shop_')) {
            const lang = getUserLanguage(interaction.user.id);
            const t = getTxt(lang);
            const parts = interaction.customId.replace('hatmarket_buy_shop_', '').split('_');
            const hatKey = parts[0];
            const qty = parseInt(parts[1], 10) || 1;

            const result = buyHatFromSystemShop(interaction.user.id, hatKey, qty);
            if (!result.success) {
                let msg = t.invalidValues;
                if (result.reason === 'insufficient_coins') msg = t.insufficientCoins(result.totalCost);
                await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
                return true;
            }

            const name = getHatName(result.hatKey, lang);
            await interaction.reply({
                content: t.buyShopSuccess(result.amount, name, result.totalCost),
                flags: MessageFlags.Ephemeral,
            });
            await notifyAchievementsFollowUp(interaction, result.unlockedAchievements);
            await interaction.message.edit(renderShop(interaction, result.hatKey)).catch(() => {});
            return true;
        }

        if (interaction.customId.startsWith('hatmarket_buy_')) {
            const lang = getUserLanguage(interaction.user.id);
            const t = getTxt(lang);
            const listingId = parseInt(interaction.customId.replace('hatmarket_buy_', ''), 10);

            const result = buyHatMarketListing(interaction.user.id, listingId);
            if (!result.success) {
                let msg = t.listingNotFound;
                if (result.reason === 'cannot_buy_own_listing') msg = t.cannotBuyOwn;
                if (result.reason === 'insufficient_coins') msg = t.insufficientCoins(result.totalCost);
                await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
                return true;
            }

            const name = getHatName(result.hatKey, lang);
            await interaction.reply({ content: t.buySuccess(name, result.totalCost), flags: MessageFlags.Ephemeral });
            await interaction.message.edit(renderBrowse(interaction, result.hatKey)).catch(() => {});
            return true;
        }

        if (interaction.customId.startsWith('hatmarket_cancel_')) {
            const lang = getUserLanguage(interaction.user.id);
            const t = getTxt(lang);
            const listingId = parseInt(interaction.customId.replace('hatmarket_cancel_', ''), 10);

            const result = cancelHatMarketListing(interaction.user.id, listingId);
            if (!result.success) {
                await interaction.reply({ content: t.listingNotFound, flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.update(renderMyListings(interaction));
            await interaction.followUp({
                content: t.cancelSuccess(getHatName(result.hatKey, lang)),
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        return false;
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId === 'hatmarket_select_browse') {
            await interaction.update(renderBrowse(interaction, interaction.values[0]));
            return true;
        }
        if (interaction.customId === 'hatmarket_select_shop') {
            await interaction.update(renderShop(interaction, interaction.values[0]));
            return true;
        }
        if (interaction.customId === 'hatmarket_select_sell') {
            await interaction.update(renderSell(interaction, interaction.values[0]));
            return true;
        }
        return false;
    },

    async handleModalSubmit(interaction) {
        const lang = getUserLanguage(interaction.user.id);
        const t = getTxt(lang);

        if (interaction.customId.startsWith('hatmarket_sell_modal_')) {
            const hatKey = interaction.customId.replace('hatmarket_sell_modal_', '');
            const price = parseInt(interaction.fields.getTextInputValue('price').trim(), 10);

            if (!Number.isFinite(price) || price <= 0) {
                await interaction.reply({ content: t.invalidValues, flags: MessageFlags.Ephemeral });
                return true;
            }

            const result = createHatMarketListing(interaction.user.id, hatKey, price, interaction.user.username);
            if (!result.success) {
                let msg = t.invalidValues;
                if (result.reason === 'price_too_low') msg = t.priceTooLow(result.minPrice);
                if (result.reason === 'hat_not_owned') msg = t.hatNotOwned;
                if (result.reason === 'too_many_listings') msg = t.tooManyListings(result.limit);
                await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.reply({
                content: t.sellSuccess(getHatName(hatKey, lang), price),
                flags: MessageFlags.Ephemeral,
            });

            if (interaction.message) {
                await interaction.message.edit(renderSell(interaction, hatKey)).catch(() => {});
            }
            return true;
        }

        if (interaction.customId === 'hatmarket_buy_modal') {
            const listingId = parseInt(interaction.fields.getTextInputValue('listingId').trim(), 10);
            if (!Number.isFinite(listingId)) {
                await interaction.reply({ content: t.invalidValues, flags: MessageFlags.Ephemeral });
                return true;
            }

            const result = buyHatMarketListing(interaction.user.id, listingId);
            if (!result.success) {
                let msg = t.listingNotFound;
                if (result.reason === 'cannot_buy_own_listing') msg = t.cannotBuyOwn;
                if (result.reason === 'insufficient_coins') msg = t.insufficientCoins(result.totalCost);
                await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
                return true;
            }

            const name = getHatName(result.hatKey, lang);
            await interaction.reply({ content: t.buySuccess(name, result.totalCost), flags: MessageFlags.Ephemeral });

            if (interaction.message) {
                await interaction.message.edit(renderBrowse(interaction, result.hatKey)).catch(() => {});
            }
            return true;
        }

        return false;
    },
};
