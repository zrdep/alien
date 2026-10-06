// =============================================================================
// TOP.GG — WEBHOOK DE VOTAÇÃO
// =============================================================================
// Recebe o POST do Top.gg quando alguém vota, gera recompensa (coins +
// recursos), salva como redeemable pendente e envia uma DM avisando o
// jogador. A rota é protegida pelo header `Authorization` que deve bater
// com o secret configurado no Top.gg e em config.json.
// =============================================================================

const { createRedeemable } = require('./db');
const { generateDailyResources, getRandomStepValue } = require('./coins');
const { getResourceName } = require('../gameConfig/resources');
const { getUserLanguage } = require('./db');
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
 * Registra a rota de webhook do Top.gg na instância Express.
 * @param {import('express').Application} app
 * @param {import('discord.js').Client} client
 * @param {string} webhookSecret — secret compartilhado com o Top.gg
 */
function registerTopggWebhook(app, client, webhookSecret) {
    // O Express 5 já vem com body-parser embutido, mas precisamos garantir
    // que JSON está habilitado na rota.
    const express = require('express');

    app.post('/api/topgg/vote', express.json(), async (req, res) => {
        // ── Autenticação ────────────────────────────────────────────
        const authHeader = req.headers['authorization'];
        if (!authHeader || authHeader !== webhookSecret) {
            logger.warn('Top.gg webhook — autorização inválida');
            return res.status(401).json({ error: 'unauthorized' });
        }

        // ── Payload do Top.gg ───────────────────────────────────────
        // Docs: https://docs.top.gg/resources/webhooks/#bot-webhooks
        const { user: userId, type, isWeekend } = req.body;

        if (!userId) {
            logger.warn('Top.gg webhook — payload sem userId');
            return res.status(400).json({ error: 'missing_user' });
        }

        // Top.gg envia type "test" quando você testa pelo painel — aceitamos
        // pra facilitar debug, mas logamos separado.
        if (type === 'test') {
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
