// =============================================================================
// CHAPÉUS — fonte única de verdade
// =============================================================================
// Tudo sobre chapéus (item cosmético equipável no /alien, encontrado no
// /planet e negociável entre jogadores no /hatmarket) mora aqui.
//
// PARA ADICIONAR UM NOVO CHAPÉU:
//   1. Coloque o arquivo PNG em images/hats/ com EXATAMENTE 400x650px
//      (mesmo tamanho da imagem do alien em images/aliens/), já com a área
//      transparente por baixo do chapéu — assim ele se encaixa perfeitamente
//      quando sobreposto à imagem do alien.
//   2. Adicione um objeto novo no array HATS abaixo.
//   3. Pronto — /planet, /alien e /hatmarket já reconhecem o chapéu novo
//      automaticamente.
//
// SOBRE `findChance`:
//   Peso (não precisa somar 100) usado pra sortear QUAL chapéu aparece,
//   depois que o "sorteio geral" (HAT_DROP_CONFIG) já decidiu que um
//   chapéu VAI aparecer. Pesos maiores = mais comum DENTRO da raridade dele.
//
// SOBRE `marketBasePrice`:
//   Preço de referência (∩oins) usado só pra calcular o preço MÍNIMO
//   permitido ao anunciar esse chapéu no /hatmarket (ver
//   HAT_MARKET_CONFIG.minPricePercentOfBase abaixo). Não é uma loja do
//   sistema — chapéus só se conseguem explorando ou comprando de outro
//   jogador.
// =============================================================================

const HATS = [
    // --- Raridade A (comum) -------------------------------------------------
    {
        key: 'straw',
        file: 'straw.png',
        rarity: 'A',
        findChance: 20,
        marketBasePrice: 2_500,
        name: { 'pt-BR': 'Chapéu de Palha', 'en-US': 'Straw Hat' },
    },
    {
        key: 'builder',
        file: 'builder.png',
        rarity: 'A',
        findChance: 17,
        marketBasePrice: 3_000,
        name: { 'pt-BR': 'Capacete de Obra', 'en-US': 'Builder Helmet' },
    },

    // --- Raridade B (incomum) -----------------------------------------------
    {
        key: 'touca',
        file: 'touca.png',
        rarity: 'B',
        findChance: 17,
        marketBasePrice: 3_000,
        name: { 'pt-BR': 'Touca de Lã', 'en-US': 'Beanie' },
    },
    {
        key: 'chef',
        file: 'chef.png',
        rarity: 'B',
        findChance: 14,
        marketBasePrice: 4_000,
        name: { 'pt-BR': 'Chapéu de Chef', 'en-US': 'Chef Hat' },
    },
    {
        key: 'frog',
        file: 'frog.png',
        rarity: 'B',
        findChance: 10,
        marketBasePrice: 6_000,
        name: { 'pt-BR': 'Gorro de Sapo', 'en-US': 'Frog Hat' },
    },

    // --- Raridade C (raro) ---------------------------------------------------
    {
        key: 'cowboy',
        file: 'cowboy.png',
        rarity: 'C',
        findChance: 9,
        marketBasePrice: 6_000,
        name: { 'pt-BR': 'Chapéu de Cowboy', 'en-US': 'Cowboy Hat' },
    },
    {
        key: 'fedora',
        file: 'fedora.png',
        rarity: 'C',
        findChance: 8,
        marketBasePrice: 8_000,
        name: { 'pt-BR': 'Fedora', 'en-US': 'Fedora' },
    },

    // --- Raridade D (épico) ---------------------------------------------------
    {
        key: 'viking',
        file: 'viking.png',
        rarity: 'D',
        findChance: 5,
        marketBasePrice: 10_000,
        name: { 'pt-BR': 'Elmo Viking', 'en-US': 'Viking Helmet' },
    },
    {
        key: 'wizzard',
        file: 'wizzard.png',
        rarity: 'D',
        findChance: 4,
        marketBasePrice: 14_000,
        name: { 'pt-BR': 'Chapéu de Mago', 'en-US': 'Wizard Hat' },
    },

    // --- Raridade E (lendário) -------------------------------------------------
    {
        key: 'tophat',
        file: 'tophat.png',
        rarity: 'E',
        findChance: 4,
        marketBasePrice: 30_000,
        name: { 'pt-BR': 'Cartola', 'en-US': 'Top Hat' },
    },
    {
        key: 'king',
        file: 'king.png',
        rarity: 'E',
        findChance: 3,
        marketBasePrice: 30_000,
        name: { 'pt-BR': 'Coroa Real', 'en-US': 'Royal Crown' },
    },
    {
        key: 'birthday',
        file: 'birthday.png',
        rarity: 'E',
        findChance: 2,
        marketBasePrice: 35_000,
        name: { 'pt-BR': 'Chapéu de Aniversário', 'en-US': 'Birthday Hat' },
    },
];

// =============================================================================
// SORTEIO DE CHAPÉU NO /planet
// =============================================================================
const HAT_DROP_CONFIG = {
    // Chance-base (%) de um chapéu qualquer aparecer toda vez que um NOVO
    // planeta é gerado no /planet (independente da raridade do planeta).
    baseFindChancePercent: 12,

    // Multiplicador aplicado sobre `baseFindChancePercent` de acordo com a
    // raridade do planeta sorteado — planetas mais raros têm mais chance de
    // esconder um chapéu.
    planetRarityMultiplier: {
        A: 1,
        B: 1.2,
        C: 1.6,
        D: 2.2,
        E: 3,
    },
};

// =============================================================================
// REGRAS DO /hatmarket (mercado de chapéus entre jogadores)
// =============================================================================
const HAT_MARKET_CONFIG = {
    // Preço mínimo de anúncio = este % do `marketBasePrice` do chapéu.
    minPricePercentOfBase: 50,

    // Taxa (%) cobrada do VENDEDOR sobre cada venda concluída.
    saleFeePercent: 5,

    // Máximo de anúncios ATIVOS que um jogador pode ter do MESMO chapéu ao
    // mesmo tempo.
    maxActiveListingsPerHat: 3,

    // Tempo (ms) que um anúncio de chapéu fica ativo antes de expirar.
    listingLifetimeMs: 3 * 24 * 60 * 60 * 1000, // 3 dias
};

const HAT_BY_KEY = new Map(HATS.map((h) => [h.key, h]));

const getHat = (key) => HAT_BY_KEY.get(key) ?? null;

const getAllHats = () => HATS;

const getHatsByRarity = (rarityCode) => HATS.filter((h) => h.rarity === rarityCode);

const getHatName = (key, lang) => {
    const hat = getHat(key);
    if (!hat) return key;
    return hat.name[lang] ?? hat.name['pt-BR'];
};

/**
 * Sorteia se um chapéu vai aparecer nesse /planet e, se sim, qual.
 * Retorna o objeto do chapéu (de HATS) ou null se nada foi encontrado.
 */
const rollHatDrop = (planetRarityCode) => {
    const multiplier = HAT_DROP_CONFIG.planetRarityMultiplier[planetRarityCode] ?? 1;
    const chance = HAT_DROP_CONFIG.baseFindChancePercent * multiplier;

    if (Math.random() * 100 >= chance) return null;
    if (!HATS.length) return null;

    const totalWeight = HATS.reduce((sum, h) => sum + h.findChance, 0);
    let roll = Math.random() * totalWeight;

    for (const hat of HATS) {
        roll -= hat.findChance;
        if (roll <= 0) return hat;
    }

    return HATS[HATS.length - 1];
};

/**
 * Preço mínimo permitido pra anunciar 1 unidade desse chapéu no /hatmarket.
 */
const getMinHatListingPrice = (hatKey) => {
    const hat = getHat(hatKey);
    const base = hat?.marketBasePrice ?? 1;
    return Math.max(1, Math.ceil(base * (HAT_MARKET_CONFIG.minPricePercentOfBase / 100)));
};

const getHatSaleFee = (price) => Math.floor(price * (HAT_MARKET_CONFIG.saleFeePercent / 100));

const getHatSellerProceeds = (price) => price - getHatSaleFee(price);

module.exports = {
    HATS,
    HAT_DROP_CONFIG,
    HAT_MARKET_CONFIG,
    getHat,
    getAllHats,
    getHatsByRarity,
    getHatName,
    rollHatDrop,
    getMinHatListingPrice,
    getHatSaleFee,
    getHatSellerProceeds,
};
