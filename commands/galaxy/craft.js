const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
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
    getUserShip,
    getUserInventory,
    getUserCoins,
    getUserItemQuantity,
    startCraftJob,
    resolveActiveCraft,
    popCraftNotice,
} = require('../../utils/db');
const {
    CATEGORIES,
    getRecipesByCategory,
    getRecipe,
    getRecipeDescParams,
    isRecipeAlreadyOwned,
} = require('../../utils/craftRecipes');
const { getResourceMeta } = require('../../utils/planetResources');
const { getResourceLabel } = require('../../utils/resourcesDisplay');
const { formatDuration, formatTimeRemaining } = require('../../utils/exploration');
const { notifyAchievementsFollowUp } = require('../../utils/achievementNotifier');

const buildCategoryMenu = (interaction, selectedCategory = CATEGORIES.PROPULSOR) => {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('craft_category_select')
            .setPlaceholder(tFor(interaction, 'commands.craft.categoryPlaceholder'))
            .addOptions([
                {
                    label: tFor(interaction, 'commands.craft.categories.propulsor'),
                    value: CATEGORIES.PROPULSOR,
                    emoji: '<:ovni:1536247726889762847>',
                    default: selectedCategory === CATEGORIES.PROPULSOR,
                },
                {
                    label: tFor(interaction, 'commands.craft.categories.excavation'),
                    value: CATEGORIES.EXCAVATION,
                    emoji: '<:rock:1536579687407681596>',
                    default: selectedCategory === CATEGORIES.EXCAVATION,
                },
                {
                    label: tFor(interaction, 'commands.craft.categories.scanner'),
                    value: CATEGORIES.SCANNER,
                    emoji: '<:saturn:1536459943480270959>',
                    default: selectedCategory === CATEGORIES.SCANNER,
                },
                {
                    label: tFor(interaction, 'commands.craft.categories.consumables'),
                    value: CATEGORIES.CONSUMABLES,
                    emoji: '<:asteroid:1536459906973171782>',
                    default: selectedCategory === CATEGORIES.CONSUMABLES,
                },
            ])
    );
};

const buildRecipeMenu = (interaction, category, selectedRecipeId = null) => {
    const lang = getUserLanguage(interaction.user.id);
    const recipes = getRecipesByCategory(category);
    const options = recipes.map((r) => ({
        label: tFor(interaction, r.titleKey, getRecipeDescParams(r, lang)),
        description: tFor(interaction, r.descKey, getRecipeDescParams(r, lang)).slice(0, 100),
        value: r.id,
        default: r.id === selectedRecipeId,
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('craft_recipe_select')
            .setPlaceholder(tFor(interaction, 'commands.craft.recipePlaceholder'))
            .addOptions(options)
    );
};

const buildActiveCraftPanel = (interaction, activeCraft) => {
    const userId = interaction.user.id;
    const lang = getUserLanguage(userId);
    const recipe = getRecipe(activeCraft.recipe_id);
    const itemTitle = recipe ? tFor(interaction, recipe.titleKey, getRecipeDescParams(recipe, lang)) : activeCraft.recipe_id;
    const eta = formatTimeRemaining(activeCraft.ends_at, lang);

    const text = `<:loading:1536247662372982794> **${tFor(interaction, 'commands.craft.inProgressTitle')}**

${tFor(interaction, 'commands.craft.inProgressBody', { item: itemTitle })}

<:saturn:1536459943480270959> ${tFor(interaction, 'commands.craft.inProgressEta', { time: eta })}`;

    const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
    );

    return {
        flags: MessageFlags.IsComponentsV2,
        content: '',
        components: [container],
    };
};

const buildCraftPanel = (interaction, category = CATEGORIES.PROPULSOR, selectedRecipeId = null, toastMessage = null) => {
    const userId = interaction.user.id;

    const { craft: activeCraft, notice, unlockedAchievements } = resolveActiveCraft(userId);

    if (notice && !toastMessage) {
        const noticeRecipe = notice.recipeId ? getRecipe(notice.recipeId) : null;
        const noticeLang = getUserLanguage(userId);
        const itemTitle = notice.titleKey
            ? tFor(interaction, notice.titleKey, noticeRecipe ? getRecipeDescParams(noticeRecipe, noticeLang) : {})
            : notice.recipeId;
        toastMessage = `<:excited:1536247579061256252> **${tFor(interaction, 'commands.craft.successTitle')}**\n${tFor(interaction, 'commands.craft.successBody', { item: itemTitle })}`;
    }

    const __craftUnlockedAchievements = unlockedAchievements || [];

    if (activeCraft) {
        const panel = buildActiveCraftPanel(interaction, activeCraft);
        return { ...panel, __craftUnlockedAchievements };
    }

    const lang = getUserLanguage(userId);
    const userShip = getUserShip(userId);
    const inventory = getUserInventory(userId);
    const userStock = new Map(inventory.map((item) => [item.key, item.amount]));

    const recipes = getRecipesByCategory(category);
    const currentRecipe = getRecipe(selectedRecipeId) ?? recipes[0];

    const header = new TextDisplayBuilder().setContent(`
# <:config:1536247533502734376> ${tFor(interaction, 'commands.craft.title')}

<:sunglasses:1536248455519801386> ${tFor(interaction, 'commands.craft.subtitle')}
`);

    const recipeDescParams = getRecipeDescParams(currentRecipe, lang);
    const recipeTitle = tFor(interaction, currentRecipe.titleKey, recipeDescParams);
    const recipeDesc = tFor(interaction, currentRecipe.descKey, recipeDescParams);
    const ingredientsTitle = tFor(interaction, 'commands.craft.ingredientsTitle');
    const timeFormatted = formatDuration(currentRecipe.craftSeconds ?? 60, lang);

    let allRequirementsMet = true;
    const meetsLevelReq = typeof currentRecipe.checkRequirement === 'function' ? currentRecipe.checkRequirement(userShip) : true;
    const alreadyOwned = isRecipeAlreadyOwned(currentRecipe, userShip);

    if (!meetsLevelReq || alreadyOwned) {
        allRequirementsMet = false;
    }

    const ingredientLines = currentRecipe.ingredients.map((ing) => {
        const meta = getResourceMeta(ing.key);
        const name = getResourceLabel(lang, ing.key);
        const userHas = userStock.get(ing.key) ?? 0;
        const isEnough = userHas >= ing.amount;

        if (!isEnough) allRequirementsMet = false;

        const checkEmoji = isEnough
            ? '<:online:1536247711169249391>'
            : '<:dnd:1536247547193204766>';

        return `${checkEmoji} ${meta?.emoji ?? '<:registry:1536459835921530890>'} **${name}**: \`${userHas}/${ing.amount}\``;
    }).join('\n');

    const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
    const coinsCost = currentRecipe.coinsCost ?? 0;
    let coinsLine = '';
    if (coinsCost > 0) {
        const userCoins = getUserCoins(userId);
        const hasCoins = userCoins >= coinsCost;
        if (!hasCoins) allRequirementsMet = false;
        const checkEmoji = hasCoins ? '<:online:1536247711169249391>' : '<:dnd:1536247547193204766>';
        coinsLine = `\n${checkEmoji} <:gold_coins:1536941656178298992> **∩oins**: \`${userCoins.toLocaleString(numLoc)}/${coinsCost.toLocaleString(numLoc)}\``;
    }

    // Consumível: mostra quantos o jogador já tem guardados.
    const ownedLine = currentRecipe.consumableKey
        ? `\n<:registry:1536459835921530890> ${tFor(interaction, 'commands.craft.consumableOwned', {
            amount: getUserItemQuantity(userId, currentRecipe.consumableKey),
        })}`
        : '';

    let statusWarning = '';
    if (alreadyOwned) {
        statusWarning = `\n\n<:online:1536247711169249391> *${tFor(interaction, 'commands.craft.alreadyMaxLevel')}*`;
    } else if (!meetsLevelReq) {
        statusWarning = `\n\n<:hmm:1536247599365890139> *${tFor(interaction, 'commands.craft.requirementNotMet')}*`;
    }

    const detailsDisplay = new TextDisplayBuilder().setContent(`
## <:registry:1536459835921530890> ${recipeTitle}

${recipeDesc}

<:saturn:1536459943480270959> **${tFor(interaction, 'commands.craft.craftTimeLabel')}:** \`${timeFormatted}\`${ownedLine}

### <:rock:1536579687407681596> ${ingredientsTitle}
${ingredientLines}${coinsLine}${statusWarning}
`);

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`craft_submit:${currentRecipe.id}`)
            .setLabel(tFor(interaction, 'commands.craft.buttonCraft'))
            .setStyle(ButtonStyle.Success)
            .setEmoji('<:excited:1536247579061256252>')
            .setDisabled(!allRequirementsMet)
    );

    const container = new ContainerBuilder();

    if (toastMessage) {
        container
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(toastMessage))
            .addSeparatorComponents(new SeparatorBuilder());
    }

    container
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(detailsDisplay)
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(buildCategoryMenu(interaction, category))
        .addActionRowComponents(buildRecipeMenu(interaction, category, currentRecipe.id))
        .addActionRowComponents(buttonRow);

    return {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        content: '',
        components: [container],
        __craftUnlockedAchievements,
    };
};

module.exports = {
    cooldown: 5,

    data: new SlashCommandBuilder()
        .setName('craft')
        .setNameLocalizations({ 'pt-BR': 'fabricar' })
        .setDescription('Craft ship upgrades with your galactic resources')
        .setDescriptionLocalizations({
            'pt-BR': 'Fabrique melhorias de nave com seus recursos galácticos',
        }),

    async execute(interaction) {
        const alien = getUserAlien(interaction.user.id);
        if (!alien) {
            await interaction.editReply({
                content: `<:ovni:1536247726889762847> **${tFor(interaction, 'commands.planet.alienRequired')}**\n${tFor(interaction, 'commands.planet.alienRequiredTip')}`,
            });
            return;
        }

        // Monta o painel UMA vez: é essa chamada que resolve um craft já
        // concluído e devolve as conquistas desbloqueadas por ele.
        const panel = buildCraftPanel(interaction, CATEGORIES.PROPULSOR);
        await interaction.editReply(panel);
        await notifyAchievementsFollowUp(interaction, panel.__craftUnlockedAchievements);
    },

    async handleSelectMenu(interaction) {
        if (interaction.customId === 'craft_category_select') {
            const category = interaction.values[0];
            const panel = buildCraftPanel(interaction, category);
            await interaction.update(panel);
            await notifyAchievementsFollowUp(interaction, panel.__craftUnlockedAchievements);
            return true;
        }

        if (interaction.customId === 'craft_recipe_select') {
            const recipeId = interaction.values[0];
            const recipe = getRecipe(recipeId);
            const category = recipe ? recipe.category : CATEGORIES.PROPULSOR;
            const panel = buildCraftPanel(interaction, category, recipeId);
            await interaction.update(panel);
            await notifyAchievementsFollowUp(interaction, panel.__craftUnlockedAchievements);
            return true;
        }

        return false;
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('craft_submit:')) return false;

        const recipeId = interaction.customId.slice('craft_submit:'.length);
        const recipe = getRecipe(recipeId);

        if (!recipe) {
            await interaction.reply({
                content: `<:error:1536247565006143528> ${tFor(interaction, 'commands.craft.recipeNotFound')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const result = startCraftJob(interaction.user.id, recipe);

        if (!result.success) {
            let errorKey = 'commands.craft.insufficientResources';
            if (result.reason === 'already_owned') {
                errorKey = 'commands.craft.alreadyMaxLevel';
            } else if (result.reason === 'requirement_not_met') {
                errorKey = 'commands.craft.requirementNotMet';
            } else if (result.reason === 'craft_in_progress') {
                errorKey = 'commands.craft.busyError';
            } else if (result.reason === 'insufficient_coins') {
                errorKey = 'commands.craft.insufficientCoins';
            }
            await interaction.reply({
                content: `<:error:1536247565006143528> ${tFor(interaction, errorKey)}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const panel = buildCraftPanel(interaction, recipe.category, recipeId);
        await interaction.update(panel);
        await notifyAchievementsFollowUp(interaction, panel.__craftUnlockedAchievements);
        return true;
    },
};
