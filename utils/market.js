// Adaptador entre gameConfig/resources.js (fonte única de verdade) e o formato
// que commands/economy/market.js espera (`namePt`/`nameEn` diretos, em vez de
// `name['pt-BR']`/`name['en-US']`). Preço, emoji e nomes agora vêm todos de
// gameConfig/resources.js — não duplique-os aqui.

const { RESOURCES } = require('../gameConfig/resources');

const MARKET_RESOURCES = Object.fromEntries(
    RESOURCES.map((r) => [
        r.key,
        {
            key: r.key,
            namePt: r.name['pt-BR'],
            nameEn: r.name['en-US'],
            emoji: r.emoji,
            systemShopPrice: r.systemShopPrice,
        },
    ]),
);

const getResourceInfo = (key) => MARKET_RESOURCES[key] ?? null;

const getAllMarketResources = () => Object.values(MARKET_RESOURCES);

const isValidResourceKey = (key) => key in MARKET_RESOURCES;

module.exports = {
    MARKET_RESOURCES,
    getResourceInfo,
    getAllMarketResources,
    isValidResourceKey,
};
