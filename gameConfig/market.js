// =============================================================================
// REGRAS DO MERCADO DE JOGADORES — fonte única de verdade
// =============================================================================
// Regras anti-abuso do /market (mercado entre jogadores, diferente da loja do
// sistema). Mexa só nos números aqui — a lógica que aplica essas regras fica
// em utils/db.js (createMarketListing, buyMarketListing).
// =============================================================================

const MARKET_CONFIG = {
    // Máximo de anúncios ATIVOS que um jogador pode ter do MESMO recurso ao
    // mesmo tempo. Evita que uma pessoa sozinha tome conta da lista de preços
    // de um recurso com dezenas de anúncios.
    maxActiveListingsPerResource: 1,

    // Preço mínimo de anúncio = este % do preço fixo da Loja do Sistema
    // daquele recurso. Evita anúncios "isca" a 1 ∩oin pra manipular o
    // ranking de menor preço.
    minPricePercentOfShop: 50,

    // Taxa (%) cobrada do VENDEDOR sobre cada venda concluída no mercado
    // (o comprador paga o preço cheio anunciado; o vendedor recebe o
    // restante depois da taxa). É um sumidouro de moedas da economia.
    saleFeePercent: 5,
};

/**
 * Preço mínimo permitido pra anunciar 1 unidade de um recurso, dado o preço
 * fixo dele na Loja do Sistema.
 */
const getMinListingPrice = (systemShopPrice) => {
    return Math.max(1, Math.ceil(systemShopPrice * (MARKET_CONFIG.minPricePercentOfShop / 100)));
};

/**
 * Taxa (em ∩oins) descontada do vendedor sobre o valor total de uma venda.
 */
const getSaleFee = (totalCost) => {
    return Math.floor(totalCost * (MARKET_CONFIG.saleFeePercent / 100));
};

/**
 * Quanto o vendedor efetivamente recebe depois da taxa.
 */
const getSellerProceeds = (totalCost) => {
    return totalCost - getSaleFee(totalCost);
};

module.exports = {
    MARKET_CONFIG,
    getMinListingPrice,
    getSaleFee,
    getSellerProceeds,
};
