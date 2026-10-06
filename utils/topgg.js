// =============================================================================
// TOP.GG — WEBHOOK DE VOTAÇÃO (v1 — assinatura HMAC)
// =============================================================================
// Recebe o POST do Top.gg quando alguém vota, gera recompensa (coins +
// recursos), salva como redeemable pendente (/redeem) e envia uma DM avisando
// o jogador. A rota é protegida pela assinatura HMAC-SHA256 enviada no
// header `x-topgg-signature` (formato: t={timestamp},v1={hash}).
//
// Eventos tratados:
//   - vote.create  → voto real: salva a recompensa e manda a DM
//   - webhook.test → botão "testar" do painel do Top.gg: só manda a DM
//                    (prévia), sem salvar recompensa
// =============================================================================

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {
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

const { createRedeemable, getUserLanguage } = require('./db');
const { generateDailyResources, getRandomStepValue } = require('./coins');
const { getResourceName } = require('../gameConfig/resources');
const { t } = require('./i18n');
const logger = require('./logger');

const E_PASSIONATE   = '<:passionate:1536247742110634034>';
const E_EXCITED      = '<:excited:1536247579061256252>';
const E_GOLD         = '<:gold_coins:1536941656178298992>';
const E_RAINBOW      = '<:rainbow:1536248394681552957>';
const E_COSMIC_PEARL = '<:cosmic_pearl:1536579648073371658>';
const E_SATURN       = '<:saturn:1536459943480270959>';
const E_HMM          = '<:hmm:1536247599365890139>';

const IMAGES_DIR = path.join(__dirname, '..', 'images', 'moedas');
const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // Top.gg libera um voto a cada 12h

// ── Configuração das recompensas de voto ────────────────────────────────
const VOTE_REWARD = {
    coins: { min: 1500, max: 3000, step: 100 },
    // Weekend (sexta~domingo) no Top.gg vale voto duplo — damos extra.
    weekendMultiplier: 1.5,
};

// Ids de votos já processados (voteId -> quando foi processado). O Top.gg
// reenvia o webhook se a resposta der timeout/5xx — sem isso o mesmo voto
// poderia virar duas recompensas. Fica em memória: 24h cobre com folga a
// janela de retentativas (~17 min no máximo).
const processedVotes = new Map();
const PROCESSED_TTL_MS = 24 * 60 * 60 * 1000;

const pruneProcessedVotes = () => {
    const cutoff = Date.now() - PROCESSED_TTL_MS;
    for (const [id, at] of processedVotes) {
        if (at < cutoff) processedVotes.delete(id);
    }
};

/**
 * Gera a recompensa de um voto.
 * @param {boolean} isWeekend — voto com peso dobrado (fim de semana no Top.gg).
 */
function generateVoteReward(isWeekend) {
    let coins = getRandomStepValue(VOTE_REWARD.coins.min, VOTE_REWARD.coins.max, VOTE_REWARD.coins.step);
    if (isWeekend) coins = Math.floor(coins * VOTE_REWARD.weekendMultiplier);

    const resources = generateDailyResources(); // 3 recursos aleatórios

    return { coins, resources };
}

/**
 * Verifica a assinatura HMAC-SHA256 do Top.gg (v1).
 * Header: x-topgg-signature → "t={timestamp},v1={hex_signature}"
 * Payload assinado: "{timestamp}.{rawBody}"
 */
function verifyTopggSignature(rawBody, signatureHeader, secret) {
    if (!signatureHeader || typeof rawBody !== 'string') return false;

    const parts = signatureHeader.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Part = parts.find(p => p.startsWith('v1='));

    if (!tPart || !v1Part) return false;

    const timestamp = tPart.slice(2);
    const receivedSig = v1Part.slice(3);

    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(receivedSig, 'hex'),
            Buffer.from(expectedSig, 'hex'),
        );
    } catch {
        return false;
    }
}

/**
 * Monta a DM de agradecimento (Components V2, mesmo visual do /daily).
 */
function buildVoteDm(lang, { reward, isWeekend, isTest, nextVoteAt, voteUrl }) {
    const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
    const fmt = (n) => n.toLocaleString(numLoc);
    const tv = (key, vars) => t(lang, `topgg.dm.${key}`, vars);

    const imageName = isWeekend ? 'chest_coins.png' : 'gift_coins.png';
    const imagePath = path.join(IMAGES_DIR, imageName);
    const hasImage = fs.existsSync(imagePath);
    const files = hasImage ? [{ attachment: imagePath, name: imageName }] : [];

    const bodyLines = [tv('body')];
    if (isWeekend) {
        bodyLines.push('', `${E_RAINBOW} ${tv('weekendBonus', { multiplier: fmt(VOTE_REWARD.weekendMultiplier) })}`);
    }
    bodyLines.push(
        '',
        `## ${E_EXCITED} ${tv('rewardTitle')}`,
        `> ${E_GOLD} \`${fmt(reward.coins)}\` ∩oins`,
        ...reward.resources.map(r => `> \`${fmt(r.amount)}\`x ${r.emoji} ${getResourceName(r.key, lang)}`),
    );
    const body = new TextDisplayBuilder().setContent(bodyLines.join('\n'));

    const footer = new TextDisplayBuilder().setContent([
        isTest ? `${E_HMM} ${tv('testNotice')}` : `${E_COSMIC_PEARL} ${tv('redeemHint')}`,
        `${E_SATURN} ${tv('nextVote', { time: `<t:${Math.floor(nextVoteAt / 1000)}:R>` })}`,
    ].join('\n'));

    const voteButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(voteUrl)
        .setLabel(tv('voteButton'))
        .setEmoji({ id: '1536247742110634034', name: 'passionate' });

    const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${E_PASSIONATE} ${tv('title')}`))
        .addSeparatorComponents(new SeparatorBuilder());

    if (hasImage) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(body)
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${imageName}`)),
        );
    } else {
        container.addTextDisplayComponents(body);
    }

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(footer)
        .addActionRowComponents(new ActionRowBuilder().addComponents(voteButton));

    return { flags: MessageFlags.IsComponentsV2, components: [container], files };
}

/**
 * Registra a rota de webhook do Top.gg na instância Express.
 * @param {import('express').Application} app
 * @param {import('discord.js').Client} client
 * @param {string} webhookSecret — secret compartilhado com o Top.gg (whs_...)
 */
function registerTopggWebhook(app, client, webhookSecret) {
    const express = require('express');

    // Precisamos do body cru (string) pra validar a assinatura HMAC,
    // mas também do JSON parseado. O `verify` do express.json() nos dá os dois.
    const jsonParser = express.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf.toString('utf-8');
        },
    });

    app.post('/api/topgg/vote', jsonParser, async (req, res) => {
        // ── Verificação da assinatura HMAC ──────────────────────────
        if (!verifyTopggSignature(req.rawBody, req.headers['x-topgg-signature'], webhookSecret)) {
            logger.warn('Top.gg webhook — assinatura inválida');
            return res.status(401).json({ error: 'unauthorized' });
        }

        // ── Payload do Top.gg (v1) ──────────────────────────────────
        // { type: "vote.create" | "webhook.test", data: { id, weight, expires_at, user: { platform_id } } }
        const { type, data } = req.body ?? {};

        if (type !== 'vote.create' && type !== 'webhook.test') {
            // Outros eventos do Top.gg não nos interessam — 200 pra não gerar retry.
            return res.status(200).json({ ok: true, ignored: true });
        }

        const isTest = type === 'webhook.test';
        const userId = data?.user?.platform_id;
        const voteId = data?.id;

        if (!userId) {
            logger.warn('Top.gg webhook — payload sem userId');
            return res.status(400).json({ error: 'missing_user' });
        }

        if (voteId && processedVotes.has(voteId)) {
            logger.info(`Top.gg webhook — voto ${voteId} repetido (retry), ignorado`);
            return res.status(200).json({ ok: true, duplicate: true });
        }

        const isWeekend = (data?.weight ?? 1) > 1;
        const reward = generateVoteReward(isWeekend);

        let lang = 'pt-BR';
        try { lang = getUserLanguage(userId); } catch { /* usa o padrão */ }

        // ── Salvar recompensa (só voto real) ────────────────────────
        if (isTest) {
            logger.info(`Top.gg webhook — voto de TESTE recebido (user ${userId}), recompensa não salva`);
        } else {
            const titleKey = isWeekend ? 'topgg.redeemTitleWeekend' : 'topgg.redeemTitle';
            try {
                createRedeemable(userId, {
                    titlePt: t('pt-BR', titleKey),
                    titleEn: t('en-US', titleKey),
                    coins: reward.coins,
                    resources: reward.resources.map(r => ({ key: r.key, amount: r.amount })),
                });
            } catch (err) {
                logger.error(`Top.gg webhook — erro ao criar redeemable: ${err.message}`);
                return res.status(500).json({ error: 'internal_error' });
            }

            if (voteId) {
                pruneProcessedVotes();
                processedVotes.set(voteId, Date.now());
            }

            logger.success(
                `Top.gg voto registrado — user: ${userId} | coins: ${reward.coins} | weekend: ${isWeekend}`
            );
        }

        // Responde antes da DM: se o Discord demorar, o Top.gg não dá
        // timeout e não reenvia o voto.
        res.status(200).json({ ok: true });

        // ── DM para o usuário ───────────────────────────────────────
        try {
            const nextVoteAt = Date.parse(data?.expires_at) || Date.now() + VOTE_COOLDOWN_MS;
            const voteUrl = `https://top.gg/bot/${client.user.id}/vote`;

            const discordUser = await client.users.fetch(userId);
            await discordUser.send(buildVoteDm(lang, { reward, isWeekend, isTest, nextVoteAt, voteUrl }));
            logger.info(`Top.gg DM enviada para ${discordUser.tag ?? userId}`);
        } catch (dmErr) {
            // DM pode falhar se o usuário desabilitou — não é erro crítico.
            logger.warn(`Top.gg DM falhou para ${userId}: ${dmErr.message}`);
        }
    });

    logger.success('Top.gg webhook registrado em POST /api/topgg/vote');
}

module.exports = {
    registerTopggWebhook,
    VOTE_REWARD,
};
