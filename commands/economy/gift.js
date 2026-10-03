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
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const {
    getUserLanguage,
    getUserCoins,
    getUserInventory,
    transferUserCoins,
    transferInventoryResource,
} = require('../../utils/db');
const { RESOURCES, MARKET_CONFIG, getSaleFee } = require('../../gameConfig');
const { t } = require('../../utils/i18n');

// Atalho pros textos desta tela (locales/*.json → commands.gift.*).
const tg = (lang, key, vars) => t(lang, `commands.gift.${key}`, vars);

// Presentes de ∩oins pagam a mesma taxa do mercado (destruída). Sem isso,
// passar ∩oins entre contas furava a taxa e o preço mínimo do /market.
const buildGiftFeeLine = (entry) => {
    if (entry.kind !== 'coins') return '';
    const fee = getSaleFee(entry.amount);
    return `\n${E_GOLD} ${t(entry.lang, 'commands.gift.feeLine', {
        percent: MARKET_CONFIG.saleFeePercent,
        fee: formatNum(fee, entry.lang),
        net: formatNum(entry.amount - fee, entry.lang),
    })}`;
};

const GIFT_IMAGE_NAME = 'gift_coins.png';
const GIFT_IMAGE_PATH = path.join(__dirname, '..', '..', 'images', 'moedas', GIFT_IMAGE_NAME);

const E_GIFT = '<:gift_coins:1537511597013074030>';
const E_GOLD = '<:gold_coins:1536941656178298992>';
const E_SOB  = '<:sob:1536248436339376138>';
const E_HMM  = '<:hmm:1536247599365890139>';
const E_ONLINE = '<:online:1536247711169249391>';
const E_DND    = '<:dnd:1536247547193204766>';
const E_IDLE   = '<:idle:1536247613681176616>';

const CONFIRM_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos

// Presentes pendentes de confirmação, em memória (giftId -> estado). Some
// se o bot reiniciar no meio de uma confirmação — aceitável pra uma janela
// de só 3 minutos; quem clicar num botão órfão depois de um restart recebe
// a mensagem de "expirado" (ver handleButton abaixo).
const pendingGifts = new Map();

const formatNum = (n, lang) => (n ?? 0).toLocaleString(lang === 'pt-BR' ? 'pt-BR' : 'en-US');

const describeItem = (entry, lang) => {
    if (entry.kind === 'coins') {
        return `\`${formatNum(entry.amount, lang)}\` ∩oins`;
    }
    const resource = RESOURCES.find((r) => r.key === entry.resourceKey);
    const name = resource?.name?.[lang] ?? resource?.name?.['pt-BR'] ?? entry.resourceKey;
    const emoji = resource?.emoji ?? '';
    return `\`${formatNum(entry.amount, lang)}\`x ${emoji} ${name}`;
};

const buildFilesAndSection = (bodyText) => {
    const hasImage = fs.existsSync(GIFT_IMAGE_PATH);
    const files = hasImage ? [{ attachment: GIFT_IMAGE_PATH, name: GIFT_IMAGE_NAME }] : [];
    const section = hasImage
        ? new SectionBuilder()
              .addTextDisplayComponents(bodyText)
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${GIFT_IMAGE_NAME}`))
        : new SectionBuilder().addTextDisplayComponents(bodyText);
    return { files, section };
};

// Título do container muda de idioma conforme quem está OLHANDO a mensagem
// no momento (interaction atual), então cada handler recebe seu próprio
// `interaction` pra decidir o idioma do texto que ele mesmo está montando.
const buildContainer = (lang, bodyContent, buttons) => {
    const bodyText = new TextDisplayBuilder().setContent(bodyContent);
    const { files, section } = buildFilesAndSection(bodyText);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${E_GIFT} ${tg(lang, 'title')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section);

    if (buttons) {
        container.addSeparatorComponents(new SeparatorBuilder()).addActionRowComponents(buttons);
    }

    return { flags: MessageFlags.IsComponentsV2, components: [container], files };
};

const buildConfirmButtons = (giftId, targetId, lang, disabled = false) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`gift_confirm_${targetId}_${giftId}`)
            .setLabel(tg(lang, 'confirmButton'))
            .setEmoji(E_ONLINE)
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`gift_cancel_${targetId}_${giftId}`)
            .setLabel(tg(lang, 'cancelButton'))
            .setEmoji(E_DND)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
};

// Sempre no idioma de QUEM CRIOU o presente (entry.lang) — não do idioma de
// quem tá olhando a mensagem no momento, pra não misturar pt/en na mesma
// mensagem pra quem clica depois.
const buildPendingBody = (entry) => {
    const item = describeItem(entry, entry.lang);

    const statusLine = (userId, confirmed) => {
        const label = confirmed
            ? tg(entry.lang, 'statusConfirmed')
            : tg(entry.lang, 'statusWaiting');
        return `${confirmed ? E_ONLINE : E_IDLE} <@${userId}> — ${label}`;
    };

    return (
        `> ${item}\n` +
        `<@${entry.senderId}> **→** <@${entry.targetId}>${buildGiftFeeLine(entry)}\n\n` +
        `${statusLine(entry.senderId, entry.confirmed.has(entry.senderId))}\n` +
        `${statusLine(entry.targetId, entry.confirmed.has(entry.targetId))}\n\n` +
        `-# ${E_HMM} ${tg(entry.lang, 'confirmHint')}`
    );
};

const clearPending = (giftId) => {
    const entry = pendingGifts.get(giftId);
    if (entry?.timeoutHandle) clearTimeout(entry.timeoutHandle);
    pendingGifts.delete(giftId);
};

const expireGift = async (giftId) => {
    const entry = pendingGifts.get(giftId);
    if (!entry) return;
    pendingGifts.delete(giftId);
    const body =
        `${E_SOB} *${tg(entry.lang, 'timedOut')}*`;

    try {
        await entry.message.edit(buildContainer(entry.lang, body, buildConfirmButtons(giftId, entry.targetId, entry.lang, true)));
    } catch {
        // mensagem pode ter sido apagada nesse meio tempo — sem problema
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gift')
        .setNameLocalizations({ 'pt-BR': 'presentear' })
        .setDescription('Gift coins or resources directly to another user (both must confirm)')
        .setDescriptionLocalizations({
            'pt-BR': 'Presenteie ∩oins ou recursos para outro usuário (os dois precisam confirmar)',
        })
        .addSubcommand((sub) =>
            sub
                .setName('coins')
                .setNameLocalizations({ 'pt-BR': 'moedas' })
                .setDescription('Gift ∩oins to another user')
                .setDescriptionLocalizations({ 'pt-BR': 'Presenteie ∩oins para outro usuário' })
                .addUserOption((opt) =>
                    opt
                        .setName('user')
                        .setNameLocalizations({ 'pt-BR': 'usuario' })
                        .setDescription('Who will receive the coins')
                        .setDescriptionLocalizations({ 'pt-BR': 'Quem vai receber as moedas' })
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('amount')
                        .setNameLocalizations({ 'pt-BR': 'quantidade' })
                        .setDescription('How many ∩oins to gift')
                        .setDescriptionLocalizations({ 'pt-BR': 'Quantas ∩oins presentear' })
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) => {
            sub
                .setName('resource')
                .setNameLocalizations({ 'pt-BR': 'recurso' })
                .setDescription('Gift a resource to another user')
                .setDescriptionLocalizations({ 'pt-BR': 'Presenteie um recurso para outro usuário' })
                .addUserOption((opt) =>
                    opt
                        .setName('user')
                        .setNameLocalizations({ 'pt-BR': 'usuario' })
                        .setDescription('Who will receive the resource')
                        .setDescriptionLocalizations({ 'pt-BR': 'Quem vai receber o recurso' })
                        .setRequired(true)
                )
                .addStringOption((opt) => {
                    opt
                        .setName('resource')
                        .setNameLocalizations({ 'pt-BR': 'recurso' })
                        .setDescription('Which resource to gift')
                        .setDescriptionLocalizations({ 'pt-BR': 'Qual recurso presentear' })
                        .setRequired(true);
                    for (const r of RESOURCES) {
                        opt.addChoices({
                            name: `${r.name['pt-BR']} / ${r.name['en-US']}`,
                            name_localizations: { 'pt-BR': r.name['pt-BR'] },
                            value: r.key,
                        });
                    }
                    return opt;
                })
                .addIntegerOption((opt) =>
                    opt
                        .setName('amount')
                        .setNameLocalizations({ 'pt-BR': 'quantidade' })
                        .setDescription('How many units to gift')
                        .setDescriptionLocalizations({ 'pt-BR': 'Quantas unidades presentear' })
                        .setMinValue(1)
                        .setRequired(true)
                );
            return sub;
        }),

    async execute(interaction) {
        const senderId = interaction.user.id;
        const lang = getUserLanguage(senderId);
        const targetUser = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        const subcommand = interaction.options.getSubcommand();

        const simpleReply = (text) =>
            interaction.editReply(buildContainer(lang, text, null));

        if (targetUser.bot) {
            return simpleReply(`${E_HMM} ${tg(lang, 'cannotGiftBot')}`);
        }
        if (targetUser.id === senderId) {
            return simpleReply(`${E_HMM} ${tg(lang, 'cannotGiftSelf')}`);
        }

        const entry = {
            senderId,
            targetId: targetUser.id,
            lang,
            amount,
            confirmed: new Set(),
        };

        if (subcommand === 'coins') {
            const senderCoins = getUserCoins(senderId);
            if (senderCoins < amount) {
                return simpleReply(`${E_SOB} ${tg(lang, 'notEnoughCoins', {
                    has: formatNum(senderCoins, lang),
                    amount: formatNum(amount, lang),
                })}`);
            }
            entry.kind = 'coins';
        } else {
            const resourceKey = interaction.options.getString('resource', true);
            const senderInventory = getUserInventory(senderId);
            const senderAmount = senderInventory.find((r) => r.key === resourceKey)?.amount ?? 0;
            if (senderAmount < amount) {
                const resource = RESOURCES.find((r) => r.key === resourceKey);
                const resourceName = resource?.name?.[lang] ?? resource?.name?.['pt-BR'] ?? resourceKey;
                return simpleReply(`${E_SOB} ${tg(lang, 'notEnoughResources', {
                    has: formatNum(senderAmount, lang),
                    resource: resourceName,
                    amount: formatNum(amount, lang),
                })}`);
            }
            entry.kind = 'resource';
            entry.resourceKey = resourceKey;
        }

        const giftId = interaction.id;
        const message = await interaction.editReply(
            buildContainer(lang, buildPendingBody(entry), buildConfirmButtons(giftId, targetUser.id, lang))
        );
        entry.message = message;
        entry.timeoutHandle = setTimeout(() => expireGift(giftId), CONFIRM_TIMEOUT_MS);
        pendingGifts.set(giftId, entry);
    },

    async handleButton(interaction) {
        const match = interaction.customId.match(/^gift_(confirm|cancel)_(\d+)_(.+)$/);
        if (!match) return false;

        const [, action, , giftId] = match;
        // Idioma de quem CLICOU — usado só nas respostas privadas/efêmeras
        // abaixo (erro "não é seu presente" etc). O container público segue
        // sempre no idioma de quem criou o presente (entry.lang).
        const clickerLang = getUserLanguage(interaction.user.id);
        const entry = pendingGifts.get(giftId);

        if (!entry) {
            await interaction.reply({
                content: `${E_HMM} ${tg(clickerLang, 'expiredOrResolved')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        // componentGuard já garante que só remetente/destinatário chegam
        // aqui, mas uma checagem redundante não custa nada.
        if (interaction.user.id !== entry.senderId && interaction.user.id !== entry.targetId) {
            await interaction.reply({
                content: `${E_HMM} ${tg(clickerLang, 'notYours')}`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        if (action === 'cancel') {
            clearPending(giftId);
            const body = `${E_SOB} *${tg(entry.lang, 'cancelledBy', { user: `<@${interaction.user.id}>` })}*`;
            await interaction.update(buildContainer(entry.lang, body, buildConfirmButtons(giftId, entry.targetId, entry.lang, true)));
            return true;
        }

        // action === 'confirm'
        entry.confirmed.add(interaction.user.id);
        if (entry.confirmed.size < 2) {
            await interaction.update(buildContainer(entry.lang, buildPendingBody(entry), buildConfirmButtons(giftId, entry.targetId, entry.lang)));
            return true;
        }

        // Ambos confirmaram — revalida saldo/estoque agora (pode ter mudado
        // nos últimos minutos) antes de mover qualquer coisa de verdade.
        clearPending(giftId);

        // A transferência em si é atômica (ver transferUserCoins /
        // transferInventoryResource em utils/db.js): debita só se o remetente
        // ainda tiver saldo e soma com UPDATE relativo, então nenhum ganho que
        // aconteça ao mesmo tempo (ex: missão concluída) é sobrescrito.
        if (entry.kind === 'coins') {
            if (!transferUserCoins(entry.senderId, entry.targetId, entry.amount, getSaleFee(entry.amount))) {
                await interaction.update(buildContainer(
                    entry.lang,
                    `${E_SOB} *${tg(entry.lang, 'senderNoCoins')}*`,
                    buildConfirmButtons(giftId, entry.targetId, entry.lang, true)
                ));
                return true;
            }
        } else {
            if (!transferInventoryResource(entry.senderId, entry.targetId, entry.resourceKey, entry.amount)) {
                await interaction.update(buildContainer(
                    entry.lang,
                    `${E_SOB} *${tg(entry.lang, 'senderNoResource')}*`,
                    buildConfirmButtons(giftId, entry.targetId, entry.lang, true)
                ));
                return true;
            }
        }

        const body =
            `${E_GOLD} *${tg(entry.lang, 'success', {
                sender: `<@${entry.senderId}>`,
                target: `<@${entry.targetId}>`,
                item: describeItem(entry, entry.lang),
            })}*${buildGiftFeeLine(entry)}`;
        await interaction.update(buildContainer(entry.lang, body, buildConfirmButtons(giftId, entry.targetId, entry.lang, true)));
        return true;
    },
};
