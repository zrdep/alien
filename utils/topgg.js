// =============================================================================
// TOP.GG — WEBHOOK DE VOTAÇÃO (v1 — assinatura HMAC)
// =============================================================================
// Recebe o POST do Top.gg quando alguém vota, gera recompensa (coins +
// recursos), salva como redeemable pendente e envia uma DM avisando o
// jogador. A rota é protegida pela assinatura HMAC-SHA256 enviada no
// header `x-topgg-signature` (formato: t={timestamp},v1={hash}).
// =============================================================================

const crypto = require('node:crypto');
const { createRedeemable, getUserLanguage } = require('./db');
const { generateDailyResources, getRandomStepValue } = require('./coins');
const { getResourceName } = require('../gameConfig/resources');
const logger = require('./logger');

// ── Configuração das recompensas de voto ────────────────────────────────
const VOTE_REWARD = {
    coins: { min: 1500, max: 3000, step: 100 },
    // Weekend (sexta~domingo) no Top.gg vale voto duplo — damos extra.
    weekendMultiplier: 1.5,
};

/**
 * Gera a recompensa de um voto.
 * @param {boolean} isWeekend — se o voto caiu no fim de semana (Top.gg envia esse flag).
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
    if (!signatureHeader) return false;

    const parts = signatureHeader.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Part = parts.find(p => p.startsWith('v1='));

    if (!tPart || !v1Part) return false;

    const timestamp = tPart.slice(2);
    const receivedSig = v1Part.slice(3);

    const hmac = crypto.createHmac('sha256', secret);
    const expectedSig = hmac.update(`${timestamp}.${rawBody}`).digest('hex');

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
 * Registra a rota de webhook do Top.gg na instância Express.
 * @param {import('express').Application} app
 * @param {import('discord.js').Client} client
 * @param {string} webhookSecret — secret compartilhado com o Top.gg (whs_...)
 */
function registerTopggWebhook(app, client, webhookSecret) {
    const express = require('express');

    // Precisamos do body cru (Buffer) pra validar a assinatura HMAC,
    // mas também do JSON parseado. O `verify` do express.json() nos dá os dois.
    const jsonParser = express.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf.toString('utf-8');
        },
    });

    app.post('/api/topgg/vote', jsonParser, async (req, res) => {
        // ── Verificação da assinatura HMAC ──────────────────────────
        const sigHeader = req.headers['x-topgg-signature'];
        if (!verifyTopggSignature(req.rawBody, sigHeader, webhookSecret)) {
            logger.warn('Top.gg webhook — assinatura inválida');
            return res.status(401).json({ error: 'unauthorized' });
        }

        // ── Payload do Top.gg (v1) ──────────────────────────────────
        // Formato v1: { type: "vote.create", data: { user: { platform_id }, weight, ... } }
        const { type, data } = req.body;
        const userId = data?.user?.platform_id;
        const isWeekend = (data?.weight ?? 1) > 1;

        if (!userId) {
            logger.warn('Top.gg webhook — payload sem userId');
            return res.status(400).json({ error: 'missing_user' });
        }

        // Top.gg envia type "vote.test" quando você testa pelo painel — aceitamos
        // pra facilitar debug, mas logamos separado.
        if (type === 'vote.test') {
            logger.info(`Top.gg webhook — voto de TESTE recebido (user ${userId})`);
        }

        // ── Gerar recompensa ────────────────────────────────────────
        const reward = generateVoteReward(!!isWeekend);

        const resourcesForDb = reward.resources.map(r => ({
            key: r.key,
            amount: r.amount,
        }));

        try {
            createRedeemable(userId, {
                titlePt: isWeekend
                    ? '🗳️ Voto no Top.gg (fim de semana — bônus!)'
                    : '🗳️ Voto no Top.gg',
                titleEn: isWeekend
                    ? '🗳️ Top.gg Vote (weekend — bonus!)'
                    : '🗳️ Top.gg Vote',
                coins: reward.coins,
                resources: resourcesForDb,
            });

            logger.success(
                `Top.gg voto registrado — user: ${userId} | coins: ${reward.coins} | weekend: ${!!isWeekend}`
            );
        } catch (err) {
            logger.error(`Top.gg webhook — erro ao criar redeemable: ${err.message}`);
            return res.status(500).json({ error: 'internal_error' });
        }

        // ── DM para o usuário ───────────────────────────────────────
        try {
            const discordUser = await client.users.fetch(userId);
            const lang = (() => {
                try { return getUserLanguage(userId); } catch { return 'pt-BR'; }
            })();

            const resourcesText = reward.resources
                .map(r => `${r.emoji} ${getResourceName(r.key, lang)} × ${r.amount}`)
                .join('\n');

            const weekendTag = isWeekend
                ? (lang === 'pt-BR' ? ' **(Fim de semana — bônus!)**' : ' **(Weekend — bonus!)**')
                : '';

            const title = lang === 'pt-BR'
                ? '🗳️ Obrigado por votar!'
                : '🗳️ Thanks for voting!';

            const body = lang === 'pt-BR'
                ? `Seu voto foi registrado com sucesso!${weekendTag}\n\n` +
                  `**Recompensa:**\n` +
                  `<:gold_coins:1536941656178298992> \`${reward.coins.toLocaleString('pt-BR')}\` ∩oins\n` +
                  `${resourcesText}\n\n` +
                  `Use </resgatar:1538333297430765702> para resgatar sua recompensa!`
                : `Your vote has been registered!${weekendTag}\n\n` +
                  `**Reward:**\n` +
                  `<:gold_coins:1536941656178298992> \`${reward.coins.toLocaleString('en-US')}\` ∩oins\n` +
                  `${resourcesText}\n\n` +
                  `Use </resgatar:1538333297430765702> to claim your reward!`;

            await discordUser.send(`## ${title}\n${body}`);
            logger.info(`Top.gg DM enviada para ${discordUser.tag ?? userId}`);
        } catch (dmErr) {
            // DM pode falhar se o usuário desabilitou — não é erro crítico.
            logger.warn(`Top.gg DM falhou para ${userId}: ${dmErr.message}`);
        }

        return res.status(200).json({ ok: true });
    });

    logger.success('Top.gg webhook registrado em POST /api/topgg/vote');
}

module.exports = {
    registerTopggWebhook,
    VOTE_REWARD,
};
