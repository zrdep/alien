// =============================================================================
// PONTO DE ENTRADA DA CONFIGURAÇÃO DE JOGO
// =============================================================================
// Reexporta tudo que está em config/*.js num só lugar, e roda uma validação
// de integridade (validateGameConfig) que é chamada automaticamente quando
// o bot inicia (veja utils/db.js). Ela existe pra pegar erros de digitação
// ANTES deles virarem um bug estranho em produção — por exemplo, se você
// escrever a `key` de um recurso errada numa receita de craft, ou referenciar
// uma raridade que não existe.
// =============================================================================

const rarities = require('./rarities');
const resources = require('./resources');
const planetDropTables = require('./planetDropTables');
const shipUpgrades = require('./shipUpgrades');
const market = require('./market');
const hats = require('./hats');
const achievements = require('./achievements');

const validateGameConfig = ({ throwOnError = true } = {}) => {
    const errors = [];
    const warnings = [];

    const rarityCodes = new Set(rarities.RARITY_ORDER);
    const resourceKeys = new Set(resources.RESOURCES.map((r) => r.key));

    // -- Recursos referenciam raridades válidas -----------------------------
    for (const res of resources.RESOURCES) {
        if (!rarityCodes.has(res.rarity)) {
            errors.push(`gameConfig/resources.js: recurso "${res.key}" usa raridade "${res.rarity}", que não existe em gameConfig/rarities.js`);
        }
        if (!res.name?.['pt-BR'] || !res.name?.['en-US']) {
            errors.push(`gameConfig/resources.js: recurso "${res.key}" está sem nome em pt-BR e/ou en-US`);
        }
        if (!Number.isFinite(res.sellPrice) || res.sellPrice < 0) {
            errors.push(`gameConfig/resources.js: recurso "${res.key}" tem sellPrice inválido (${res.sellPrice}) — precisa ser um número >= 0`);
        } else if (res.sellPrice >= res.systemShopPrice) {
            errors.push(`gameConfig/resources.js: recurso "${res.key}" tem sellPrice (${res.sellPrice}) >= systemShopPrice (${res.systemShopPrice}) — isso permite comprar da loja e vender de volta com lucro (exploit infinito de ∩oins)`);
        }
    }

    // -- Chaves de recurso duplicadas ----------------------------------------
    const seenKeys = new Set();
    for (const res of resources.RESOURCES) {
        if (seenKeys.has(res.key)) {
            errors.push(`gameConfig/resources.js: chave de recurso duplicada "${res.key}"`);
        }
        seenKeys.add(res.key);
    }

    // -- Drop tables referenciam raridade de planeta e recursos válidos -----
    for (const [planetRarityCode, entries] of Object.entries(planetDropTables.PLANET_DROP_TABLES)) {
        if (!rarityCodes.has(planetRarityCode)) {
            errors.push(`gameConfig/planetDropTables.js: tabela para raridade de planeta "${planetRarityCode}", que não existe em gameConfig/rarities.js`);
        }
        for (const entry of entries) {
            if (!resourceKeys.has(entry.resource)) {
                errors.push(`gameConfig/planetDropTables.js: raridade "${planetRarityCode}" referencia o recurso "${entry.resource}", que não existe em gameConfig/resources.js`);
            }
        }
    }

    // -- Toda raridade de planeta tem pelo menos uma drop table --------------
    for (const code of rarityCodes) {
        if (!planetDropTables.PLANET_DROP_TABLES[code]) {
            warnings.push(`gameConfig/planetDropTables.js: raridade "${code}" não tem tabela de drop definida — planetas dessa raridade não vão dar nenhum recurso`);
        }
    }

    // -- Ship tiers referenciam raridades válidas ----------------------------
    const shipTierGroups = {
        PROPULSOR_TIERS: shipUpgrades.PROPULSOR_TIERS,
        EXCAVATION_TIERS: shipUpgrades.EXCAVATION_TIERS,
        SCANNER_TIERS: shipUpgrades.SCANNER_TIERS,
    };
    for (const [groupName, tiers] of Object.entries(shipTierGroups)) {
        for (const tier of tiers) {
            if (!rarityCodes.has(tier.rarityCode)) {
                errors.push(`gameConfig/shipUpgrades.js: ${groupName} tem tier "${tier.code}" com rarityCode "${tier.rarityCode}", que não existe em gameConfig/rarities.js`);
            }
        }
    }

    // -- Chapéus referenciam raridades válidas e têm arquivo de imagem ------
    const path = require('path');
    const fs = require('fs');
    const hatsDir = path.join(__dirname, '..', 'images', 'hats');
    const seenHatKeys = new Set();
    for (const hat of hats.HATS) {
        if (seenHatKeys.has(hat.key)) {
            errors.push(`gameConfig/hats.js: chave de chapéu duplicada "${hat.key}"`);
        }
        seenHatKeys.add(hat.key);

        if (!rarityCodes.has(hat.rarity)) {
            errors.push(`gameConfig/hats.js: chapéu "${hat.key}" usa raridade "${hat.rarity}", que não existe em gameConfig/rarities.js`);
        }
        if (!hat.name?.['pt-BR'] || !hat.name?.['en-US']) {
            errors.push(`gameConfig/hats.js: chapéu "${hat.key}" está sem nome em pt-BR e/ou en-US`);
        }
        if (!Number.isFinite(hat.findChance) || hat.findChance <= 0) {
            errors.push(`gameConfig/hats.js: chapéu "${hat.key}" tem findChance inválido (${hat.findChance})`);
        }
        if (!Number.isFinite(hat.marketBasePrice) || hat.marketBasePrice <= 0) {
            errors.push(`gameConfig/hats.js: chapéu "${hat.key}" tem marketBasePrice inválido (${hat.marketBasePrice})`);
        }
        if (fs.existsSync(hatsDir) && !fs.existsSync(path.join(hatsDir, hat.file))) {
            warnings.push(`gameConfig/hats.js: chapéu "${hat.key}" referencia o arquivo "${hat.file}", que não existe em images/hats/`);
        }
    }

    // -- Regras do mercado fazem sentido -------------------------------------
    const { MARKET_CONFIG } = market;
    if (MARKET_CONFIG.saleFeePercent < 0 || MARKET_CONFIG.saleFeePercent >= 100) {
        errors.push(`config/market.js: saleFeePercent (${MARKET_CONFIG.saleFeePercent}) deve estar entre 0 e 100`);
    }
    if (MARKET_CONFIG.minPricePercentOfShop < 0 || MARKET_CONFIG.minPricePercentOfShop > 100) {
        errors.push(`config/market.js: minPricePercentOfShop (${MARKET_CONFIG.minPricePercentOfShop}) deve estar entre 0 e 100`);
    }
    if (MARKET_CONFIG.maxActiveListingsPerResource < 1) {
        errors.push(`config/market.js: maxActiveListingsPerResource deve ser pelo menos 1`);
    }

    // -- Conquistas referenciam raridades válidas e recursos da recompensa ---
    const validAchievementTypes = new Set([
        'market_global_sold_count', 'market_global_sold_revenue',
        'market_global_bought_count', 'market_global_bought_spent',
        'shop_bought_count', 'shop_sold_count',
        'coins_total_earned', 'planets_seen', 'trips_completed',
        'resources_collected', 'distance_traveled_km', 'daily_streak',
        'craft_completed',
    ]);
    const seenAchievementIds = new Set();
    for (const ach of achievements.ACHIEVEMENTS) {
        if (seenAchievementIds.has(ach.id)) {
            errors.push(`gameConfig/achievements.js: id de conquista duplicado "${ach.id}"`);
        }
        seenAchievementIds.add(ach.id);

        if (!rarityCodes.has(ach.rarity)) {
            errors.push(`gameConfig/achievements.js: conquista "${ach.id}" usa raridade "${ach.rarity}", que não existe`);
        }
        if (!validAchievementTypes.has(ach.type)) {
            errors.push(`gameConfig/achievements.js: conquista "${ach.id}" tem type inválido "${ach.type}"`);
        }
        if (!Number.isFinite(ach.threshold) || ach.threshold <= 0) {
            errors.push(`gameConfig/achievements.js: conquista "${ach.id}" tem threshold inválido (${ach.threshold})`);
        }
        if (!ach.name?.['pt-BR'] || !ach.name?.['en-US']) {
            errors.push(`gameConfig/achievements.js: conquista "${ach.id}" está sem nome em pt-BR e/ou en-US`);
        }
        if (!ach.description?.['pt-BR'] || !ach.description?.['en-US']) {
            errors.push(`gameConfig/achievements.js: conquista "${ach.id}" está sem descrição em pt-BR e/ou en-US`);
        }
        if (ach.reward?.coins && (!Number.isFinite(ach.reward.coins) || ach.reward.coins < 0)) {
            errors.push(`gameConfig/achievements.js: conquista "${ach.id}" tem reward.coins inválido`);
        }
        if (ach.reward?.resources) {
            for (const res of ach.reward.resources) {
                if (!resourceKeys.has(res.key)) {
                    errors.push(`gameConfig/achievements.js: conquista "${ach.id}" recompensa com recurso "${res.key}" que não existe`);
                }
                if (!Number.isFinite(res.amount) || res.amount <= 0) {
                    errors.push(`gameConfig/achievements.js: conquista "${ach.id}" tem amount inválido no recurso "${res.key}"`);
                }
            }
        }
    }

    // -- Receitas de craft referenciam recursos válidos ----------------------
    // (lazy require pra evitar ciclo: craftRecipes não depende de config/index)
    try {
        const { CRAFT_RECIPES } = require('../utils/craftRecipes');
        const seenRecipeIds = new Set();
        for (const recipe of CRAFT_RECIPES) {
            if (seenRecipeIds.has(recipe.id)) {
                errors.push(`utils/craftRecipes.js: id de receita duplicado "${recipe.id}"`);
            }
            seenRecipeIds.add(recipe.id);

            for (const ing of recipe.ingredients) {
                if (!resourceKeys.has(ing.key)) {
                    errors.push(`utils/craftRecipes.js: a receita "${recipe.id}" usa o ingrediente "${ing.key}", que não existe em gameConfig/resources.js`);
                }
            }
        }
    } catch {
        // craftRecipes.js pode não existir em algum contexto de teste; ignora.
    }

    if (warnings.length) {
        // eslint-disable-next-line no-console
        console.warn(`[config] ${warnings.length} aviso(s) de configuração:\n- ${warnings.join('\n- ')}`);
    }

    if (errors.length) {
        const message = `[config] ${errors.length} erro(s) de configuração encontrados:\n- ${errors.join('\n- ')}`;
        if (throwOnError) {
            throw new Error(message);
        }
        // eslint-disable-next-line no-console
        console.error(message);
    }

    return { errors, warnings };
};

module.exports = {
    ...rarities,
    ...resources,
    ...planetDropTables,
    ...shipUpgrades,
    ...market,
    ...hats,
    ...achievements,
    validateGameConfig,
};
