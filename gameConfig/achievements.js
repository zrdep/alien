// =============================================================================
// CONQUISTAS — fonte única de verdade
// =============================================================================
// Cada conquista tem:
//   - id:          identificador único (usado no DB)
//   - emoji:       emoji temático (ver docs/emojisNome.txt)
//   - name:        nome traduzido pt-BR/en-US
//   - description: descrição traduzida pt-BR/en-US
//   - rarity:      raridade da conquista (A-E, mesmo código de gameConfig/rarities.js)
//   - type:        tipo de estatística que dispara a conquista (usado pelo check)
//   - threshold:   valor que a estatística precisa atingir para desbloquear
//   - reward:      { coins, resources: [{key, amount}] }
//
// TIPOS DE CONQUISTA (type):
//   - market_global_sold_count:   qtd total de unidades VENDIDAS no mercado GLOBAL
//   - market_global_sold_revenue: receita TOTAL (líquido, após taxas) em ∩oins de vendas no mercado global
//   - market_global_bought_count: qtd total de unidades COMPRADAS no mercado GLOBAL
//   - market_global_bought_spent: total GASTO em ∩oins comprando no mercado global
//   - shop_bought_count:          qtd total comprada na LOJA DO SISTEMA
//   - shop_sold_count:            qtd total vendida PARA a loja do sistema
//   - coins_total_earned:         total de ∩oins já ganhos (acumulado)
//   - planets_seen:               número de planetas já descobertos (/planet)
//   - trips_completed:            número de missões de exploração concluídas
//   - resources_collected:        total de recursos coletados em exploração
//   - distance_traveled_km:       distância total percorrida (ida+volta)
//   - daily_streak:               sequência atual de /daily consecutivos
//   - craft_completed:            número de crafts concluídos
//   - bot_invited:                usuário confirmou (via /resgatar) que
//                                  adicionou o bot a um servidor
// =============================================================================

const ACHIEVEMENTS = [
    // =========================================================================
    // COMUNIDADE — CONVIDAR O BOT
    // =========================================================================
    // Desbloqueada via /resgatar, não automaticamente feito o check normal
    // (checkAchievementsForUser continua funcionando igual, mas quem seta o
    // campo `bot_invited = 1` é o utils/db.js#claimBotInviteAchievement,
    // chamado pelo comando /resgatar depois de confirmar que o usuário
    // aparece como quem adicionou o bot em algum servidor).
    {
        id: 'invite_bot_1',
        emoji: '<:support:1536248470611173466>',
        rarity: 'B',
        type: 'bot_invited',
        threshold: 1,
        name: { 'pt-BR': 'Recrutador Interestelar', 'en-US': 'Interstellar Recruiter' },
        description: {
            'pt-BR': 'Adicione o ∩lien a um servidor seu e resgate com </redeem:1538333297430765702>',
            'en-US': 'Add ∩lien to a server of yours and claim it with </redeem:1538333297430765702>',
        },
        reward: { coins: 2000, resources: [] },
    },

    // =========================================================================
    // MERCADO GLOBAL — VENDAS
    // =========================================================================
    {
        id: 'market_sell_1',
        emoji: '<:registry:1536459835921530890>',
        rarity: 'A',
        type: 'market_global_sold_count',
        threshold: 10,
        name: { 'pt-BR': 'Primeiros Anúncios', 'en-US': 'First Listings' },
        description: { 'pt-BR': 'Venda 10 unidades no Mercado Global', 'en-US': 'Sell 10 units on the Global Market' },
        reward: { coins: 500, resources: [{ key: 'stone', amount: 30 }, { key: 'wood', amount: 30 }] },
    },
    {
        id: 'market_sell_2',
        emoji: '<:registry:1536459835921530890>',
        rarity: 'B',
        type: 'market_global_sold_count',
        threshold: 100,
        name: { 'pt-BR': 'Mercador Iniciante', 'en-US': 'Beginner Merchant' },
        description: { 'pt-BR': 'Venda 100 unidades no Mercado Global', 'en-US': 'Sell 100 units on the Global Market' },
        reward: { coins: 2500, resources: [{ key: 'iron', amount: 25 }, { key: 'copper', amount: 25 }] },
    },
    {
        id: 'market_sell_3',
        emoji: '<:gold_coins:1536941656178298992>',
        rarity: 'C',
        type: 'market_global_sold_count',
        threshold: 500,
        name: { 'pt-BR': 'Comerciante Experiente', 'en-US': 'Experienced Trader' },
        description: { 'pt-BR': 'Venda 500 unidades no Mercado Global', 'en-US': 'Sell 500 units on the Global Market' },
        reward: { coins: 10000, resources: [{ key: 'metal', amount: 40 }, { key: 'blueCrystal', amount: 10 }] },
    },
    {
        id: 'market_sell_4',
        emoji: '<:legendary:1536459814475927653>',
        rarity: 'D',
        type: 'market_global_sold_count',
        threshold: 2500,
        name: { 'pt-BR': 'Magnata do Mercado', 'en-US': 'Market Magnate' },
        description: { 'pt-BR': 'Venda 2.500 unidades no Mercado Global', 'en-US': 'Sell 2,500 units on the Global Market' },
        reward: { coins: 50000, resources: [{ key: 'purpleCrystal', amount: 15 }, { key: 'glowingOre', amount: 10 }] },
    },
    {
        id: 'market_sell_5',
        emoji: '<:sunglasses:1536248455519801386>',
        rarity: 'E',
        type: 'market_global_sold_count',
        threshold: 10000,
        name: { 'pt-BR': 'Imperador Galáctico', 'en-US': 'Galactic Emperor' },
        description: { 'pt-BR': 'Venda 10.000 unidades no Mercado Global', 'en-US': 'Sell 10,000 units on the Global Market' },
        reward: { coins: 250000, resources: [{ key: 'planetCore', amount: 5 }, { key: 'cosmicPearl', amount: 3 }, { key: 'starEssence', amount: 2 }] },
    },

    // =========================================================================
    // MERCADO GLOBAL — RECEITA
    // =========================================================================
    {
        id: 'market_revenue_1',
        emoji: '<:bronze_coins:1536941654295060580>',
        rarity: 'A',
        type: 'market_global_sold_revenue',
        threshold: 1000,
        name: { 'pt-BR': 'Lucro Pequeno', 'en-US': 'Small Profit' },
        description: { 'pt-BR': 'Gere 1.000 ∩oins de receita líquida em vendas', 'en-US': 'Earn 1,000 ∩oins net revenue from sales' },
        reward: { coins: 200, resources: [{ key: 'dirt', amount: 50 }] },
    },
    {
        id: 'market_revenue_2',
        emoji: '<:silver_coins:1536941657746837597>',
        rarity: 'B',
        type: 'market_global_sold_revenue',
        threshold: 10000,
        name: { 'pt-BR': 'Renda Extra', 'en-US': 'Extra Income' },
        description: { 'pt-BR': 'Gere 10.000 ∩oins de receita líquida em vendas', 'en-US': 'Earn 10,000 ∩oins net revenue from sales' },
        reward: { coins: 1500, resources: [{ key: 'iron', amount: 20 }, { key: 'copper', amount: 20 }] },
    },
    {
        id: 'market_revenue_3',
        emoji: '<:gold_coins:1536941656178298992>',
        rarity: 'C',
        type: 'market_global_sold_revenue',
        threshold: 100000,
        name: { 'pt-BR': 'Receita Sólida', 'en-US': 'Solid Revenue' },
        description: { 'pt-BR': 'Gere 100.000 ∩oins de receita líquida em vendas', 'en-US': 'Earn 100,000 ∩oins net revenue from sales' },
        reward: { coins: 15000, resources: [{ key: 'starFragment', amount: 15 }, { key: 'metal', amount: 30 }] },
    },
    {
        id: 'market_revenue_4',
        emoji: '<:bag_coins:1536941656178298992>',
        rarity: 'D',
        type: 'market_global_sold_revenue',
        threshold: 1000000,
        name: { 'pt-BR': 'Milionário Cósmico', 'en-US': 'Cosmic Millionaire' },
        description: { 'pt-BR': 'Gere 1.000.000 ∩oins de receita líquida em vendas', 'en-US': 'Earn 1,000,000 ∩oins net revenue from sales' },
        reward: { coins: 100000, resources: [{ key: 'planetCore', amount: 3 }, { key: 'cosmicPearl', amount: 2 }] },
    },
    {
        id: 'market_revenue_5',
        emoji: '<:chest_coins:1536941656178298992>',
        rarity: 'E',
        type: 'market_global_sold_revenue',
        threshold: 10000000,
        name: { 'pt-BR': 'CEO da Galáxia', 'en-US': 'Galaxy CEO' },
        description: { 'pt-BR': 'Gere 10.000.000 ∩oins de receita líquida. VOCÊ É A ECONOMIA.', 'en-US': 'Earn 10M ∩oins net revenue. YOU ARE THE ECONOMY.' },
        reward: { coins: 1000000, resources: [{ key: 'starEssence', amount: 10 }, { key: 'cosmicPearl', amount: 8 }] },
    },

    // =========================================================================
    // MERCADO GLOBAL — COMPRAS
    // =========================================================================
    {
        id: 'market_buy_1',
        emoji: '<:ovni:1536247726889762847>',
        rarity: 'A',
        type: 'market_global_bought_count',
        threshold: 10,
        name: { 'pt-BR': 'Comprador Curioso', 'en-US': 'Curious Buyer' },
        description: { 'pt-BR': 'Compre 10 unidades no Mercado Global', 'en-US': 'Buy 10 units on the Global Market' },
        reward: { coins: 300, resources: [{ key: 'stone', amount: 25 }, { key: 'wood', amount: 25 }] },
    },
    {
        id: 'market_buy_2',
        emoji: '<:config:1536247533502734376>',
        rarity: 'B',
        type: 'market_global_bought_count',
        threshold: 100,
        name: { 'pt-BR': 'Consumidor Ávido', 'en-US': 'Avid Consumer' },
        description: { 'pt-BR': 'Compre 100 unidades no Mercado Global', 'en-US': 'Buy 100 units on the Global Market' },
        reward: { coins: 1800, resources: [{ key: 'metal', amount: 20 }] },
    },
    {
        id: 'market_buy_3',
        emoji: '<:excited:1536247579061256252>',
        rarity: 'C',
        type: 'market_global_bought_count',
        threshold: 1000,
        name: { 'pt-BR': 'Cliente VIP', 'en-US': 'VIP Customer' },
        description: { 'pt-BR': 'Compre 1.000 unidades no Mercado Global', 'en-US': 'Buy 1,000 units on the Global Market' },
        reward: { coins: 8000, resources: [{ key: 'blueCrystal', amount: 15 }, { key: 'starFragment', amount: 10 }] },
    },
    {
        id: 'market_buy_4',
        emoji: '<:gift_coins:1536941656178298992>',
        rarity: 'D',
        type: 'market_global_bought_spent',
        threshold: 500000,
        name: { 'pt-BR': 'Investidor Galáctico', 'en-US': 'Galactic Investor' },
        description: { 'pt-BR': 'Gaste 500.000 ∩oins comprando no Mercado Global', 'en-US': 'Spend 500,000 ∩oins buying on the Global Market' },
        reward: { coins: 50000, resources: [{ key: 'glowingOre', amount: 12 }, { key: 'purpleCrystal', amount: 15 }] },
    },

    // =========================================================================
    // LOJA DO SISTEMA
    // =========================================================================
    {
        id: 'shop_buy_1',
        emoji: '<:config:1536247533502734376>',
        rarity: 'A',
        type: 'shop_bought_count',
        threshold: 50,
        name: { 'pt-BR': 'Cliente da Loja', 'en-US': 'Shop Customer' },
        description: { 'pt-BR': 'Compre 50 unidades na Loja do Sistema', 'en-US': 'Buy 50 units from the System Shop' },
        reward: { coins: 400, resources: [{ key: 'dirt', amount: 40 }] },
    },
    {
        id: 'shop_sell_1',
        emoji: '<:registry:1536459835921530890>',
        rarity: 'A',
        type: 'shop_sold_count',
        threshold: 100,
        name: { 'pt-BR': 'Fornecedor do Sistema', 'en-US': 'System Supplier' },
        description: { 'pt-BR': 'Venda 100 unidades PARA a Loja do Sistema', 'en-US': 'Sell 100 units TO the System Shop' },
        reward: { coins: 400, resources: [{ key: 'iron', amount: 15 }, { key: 'copper', amount: 15 }] },
    },

    // =========================================================================
    // EXPLORAÇÃO / MISSÕES
    // =========================================================================
    {
        id: 'explore_1',
        emoji: '<:asteroid:1536459906973171782>',
        rarity: 'A',
        type: 'planets_seen',
        threshold: 20,
        name: { 'pt-BR': 'Desbravador', 'en-US': 'Pathfinder' },
        description: { 'pt-BR': 'Descubra 20 planetas diferentes', 'en-US': 'Discover 20 different planets' },
        reward: { coins: 800, resources: [{ key: 'stone', amount: 40 }, { key: 'wood', amount: 40 }] },
    },
    {
        id: 'explore_2',
        emoji: '<:earth:1536459925495087226>',
        rarity: 'B',
        type: 'trips_completed',
        threshold: 25,
        name: { 'pt-BR': 'Viajante Espacial', 'en-US': 'Space Traveler' },
        description: { 'pt-BR': 'Complete 25 missões de exploração', 'en-US': 'Complete 25 exploration missions' },
        reward: { coins: 3000, resources: [{ key: 'metal', amount: 25 }] },
    },
    {
        id: 'explore_3',
        emoji: '<:saturn:1536459943480270959>',
        rarity: 'C',
        type: 'resources_collected',
        threshold: 500,
        name: { 'pt-BR': 'Colecionador de Recursos', 'en-US': 'Resource Collector' },
        description: { 'pt-BR': 'Colete 500 recursos em explorações', 'en-US': 'Collect 500 resources through exploration' },
        reward: { coins: 8000, resources: [{ key: 'blueCrystal', amount: 12 }, { key: 'starFragment', amount: 8 }] },
    },
    {
        id: 'explore_4',
        emoji: '<:rainbow:1536248394681552957>',
        rarity: 'D',
        type: 'distance_traveled_km',
        threshold: 100000000,
        name: { 'pt-BR': 'Viajante da Galáxia', 'en-US': 'Galaxy Traveler' },
        description: { 'pt-BR': 'Percorra 100 milhões de km em explorações', 'en-US': 'Travel 100 million km in explorations' },
        reward: { coins: 50000, resources: [{ key: 'planetCore', amount: 2 }, { key: 'purpleCrystal', amount: 10 }] },
    },
    {
        id: 'explore_5',
        emoji: '<:legendary:1536459814475927653>',
        rarity: 'E',
        type: 'trips_completed',
        threshold: 500,
        name: { 'pt-BR': 'Lenda Exploração', 'en-US': 'Exploration Legend' },
        description: { 'pt-BR': 'Complete 500 missões de exploração', 'en-US': 'Complete 500 exploration missions' },
        reward: { coins: 300000, resources: [{ key: 'starEssence', amount: 5 }, { key: 'cosmicPearl', amount: 5 }] },
    },

    // =========================================================================
    // DAILY / CONSISTÊNCIA
    // =========================================================================
    {
        id: 'daily_1',
        emoji: '<:online:1536247711169249391>',
        rarity: 'A',
        type: 'daily_streak',
        threshold: 3,
        name: { 'pt-BR': 'Presença Confirmada', 'en-US': 'Check-in Confirmed' },
        description: { 'pt-BR': 'Faça 3 </daily:1537544781020799118> consecutivos', 'en-US': 'Do 3 consecutive </daily:1537544781020799118>' },
        reward: { coins: 300, resources: [{ key: 'dirt', amount: 30 }] },
    },
    {
        id: 'daily_2',
        emoji: '<:passionate:1536247742110634034>',
        rarity: 'B',
        type: 'daily_streak',
        threshold: 7,
        name: { 'pt-BR': 'Semana Completa', 'en-US': 'Full Week' },
        description: { 'pt-BR': 'Faça 7 </daily:1537544781020799118> consecutivos (1 semana)', 'en-US': 'Do 7 consecutive </daily:1537544781020799118> (1 week)' },
        reward: { coins: 2500, resources: [{ key: 'iron', amount: 30 }, { key: 'copper', amount: 30 }] },
    },
    {
        id: 'daily_3',
        emoji: '<:excited:1536247579061256252>',
        rarity: 'C',
        type: 'daily_streak',
        threshold: 30,
        name: { 'pt-BR': 'Mês de Dedicação', 'en-US': 'Month of Dedication' },
        description: { 'pt-BR': 'Faça 30 </daily:1537544781020799118> consecutivos (1 mês)', 'en-US': 'Do 30 consecutive </daily:1537544781020799118> (1 month)' },
        reward: { coins: 25000, resources: [{ key: 'metal', amount: 50 }, { key: 'starFragment', amount: 10 }] },
    },

    // =========================================================================
    // CRAFT
    // =========================================================================
    {
        id: 'craft_1',
        emoji: '<:book:1536247508181848134>',
        rarity: 'B',
        type: 'craft_completed',
        threshold: 5,
        name: { 'pt-BR': 'Aprendiz de Artesão', 'en-US': 'Apprentice Artisan' },
        description: { 'pt-BR': 'Conclua 5 crafts com sucesso', 'en-US': 'Complete 5 successful crafts' },
        reward: { coins: 3000, resources: [{ key: 'blueCrystal', amount: 8 }, { key: 'metal', amount: 20 }] },
    },
    {
        id: 'craft_2',
        emoji: '<:book2:1536459861527756952>',
        rarity: 'D',
        type: 'craft_completed',
        threshold: 50,
        name: { 'pt-BR': 'Mestre Artesão', 'en-US': 'Master Artisan' },
        description: { 'pt-BR': 'Conclua 50 crafts com sucesso', 'en-US': 'Complete 50 successful crafts' },
        reward: { coins: 80000, resources: [{ key: 'glowingOre', amount: 15 }, { key: 'planetCore', amount: 3 }] },
    },
];

const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

const getAchievement = (id) => ACHIEVEMENT_BY_ID.get(id) ?? null;

const getAchievementsByType = (type) => ACHIEVEMENTS.filter((a) => a.type === type);

const listAchievementsSorted = () => {
    const { getRarity } = require('./rarities');
    return [...ACHIEVEMENTS].sort((a, b) => {
        const rarA = getRarity(a.rarity);
        const rarB = getRarity(b.rarity);
        if (rarA.order !== rarB.order) return rarA.order - rarB.order;
        return a.threshold - b.threshold;
    });
};

module.exports = {
    ACHIEVEMENTS,
    getAchievement,
    getAchievementsByType,
    listAchievementsSorted,
};
