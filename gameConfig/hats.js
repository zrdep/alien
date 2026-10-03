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
//   O peso ainda é multiplicado por HAT_DROP_CONFIG.hatRarityWeightByPlanet,
//   que favorece chapéus raros em planetas raros.
//
// SOBRE `marketBasePrice`:
//   Preço de referência (∩oins) usado tanto pra calcular o preço MÍNIMO
//   permitido ao anunciar esse chapéu no /hatmarket (ver
//   HAT_MARKET_CONFIG.minPricePercentOfBase abaixo) quanto como preço FIXO
//   de compra direta na Loja do Sistema (aba "Loja" do /hatmarket — espelha
//   a Loja do Sistema do /market pra recursos).
//
// SOBRE `keepAntennae` (opcional):
//   Por padrão, o alien aparece SEM antenas quando usa chapéu (images/aliens/hat/),
//   pra elas não ficarem saindo em volta do chapéu. Use `keepAntennae: true`
//   em chapéus pequenos que não cobrem a cabeça toda (ex.: aniversário).
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
        keepAntennae: true,
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

    // Multiplicador do `findChance` de cada chapéu conforme a raridade do
    // CHAPÉU (coluna) e a do PLANETA (linha). Planeta raro esconde chapéu
    // raro. Foi calibrado pra manter o total igual ao sorteio antigo (16,44
    // chapéus a cada 100 planetas vistos) e a proporção geral por raridade
    // quase igual — só muda ONDE cada um cai:
    //   chance de lendário: planeta A 0,7% · C 4,8% · E 34,5% (antes 8% em todos)
    // Detalhes em docs/balanceamento-economia.md.
    hatRarityWeightByPlanet: {
        //     chapéu:  A     B     C     D     E
        A: { A: 1.6, B: 1.2, C: 0.6, D: 0.3, E: 0.1 },
        B: { A: 1.3, B: 1.3, C: 0.9, D: 0.5, E: 0.25 },
        C: { A: 1.0, B: 1.0, C: 1.2, D: 0.9, E: 0.6 },
        D: { A: 0.6, B: 0.8, C: 1.2, D: 1.8, E: 1.8 },
        E: { A: 0.3, B: 0.5, C: 1.0, D: 2.2, E: 4.0 },
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

    const rarityWeights = HAT_DROP_CONFIG.hatRarityWeightByPlanet[planetRarityCode] ?? {};
    const weightOf = (hat) => hat.findChance * (rarityWeights[hat.rarity] ?? 1);

    const totalWeight = HATS.reduce((sum, h) => sum + weightOf(h), 0);
    let roll = Math.random() * totalWeight;

    for (const hat of HATS) {
        roll -= weightOf(hat);
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

/**
 * Preço fixo de compra direta na Loja do Sistema (aba "Loja" do /hatmarket).
 */
const getHatShopPrice = (hatKey) => {
    const hat = getHat(hatKey);
    return hat?.marketBasePrice ?? 1;
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
    getHatShopPrice,
    getHatSaleFee,
    getHatSellerProceeds,
};
