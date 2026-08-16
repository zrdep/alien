const { Events, ActivityType } = require('discord.js');
const figlet = require('figlet');
const picocolors = require('picocolors');
const logger = require('../utils/logger');
const { resolveAllPendingMissions, cleanExpiredPlanetOffers, resolveAllPendingCrafts, hasBotInviteRecord, recordBotInvite, setGuildDefaultLanguageIfUnset } = require('../utils/db');
const { captureNotifyFlaggedMissions, processNotifyFlaggedMissions } = require('../utils/missionNotifier');
const { mapDiscordLocaleToLang } = require('../utils/i18n');
const { scheduleBackups } = require('../utils/backup');
const { detectInviter } = require('./guildCreate');
const versao = require('../config.json').versao;

const c = picocolors;

const pegarStatus = (client) => {
    const servidores = client.guilds.cache.size;
    const usuarios = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const comandos = client.commands.size;

const status = [
    {
        name: `A explorar ${servidores} planetas | ∩lien ${versao}`,
        type: ActivityType.Watching,
    },
    {
        name: `Exploring ${servidores} planets | ∩lien ${versao}`,
        type: ActivityType.Watching,
    },
    {
        name: `A processar ${comandos} comandos | ∩lien ${versao}`,
        type: ActivityType.Watching,
    },
    {
        name: `Processing ${comandos} commands | ∩lien ${versao}`,
        type: ActivityType.Watching,
    },
    {
        name: `A abduzir ${usuarios} usuários | ∩lien ${versao}`,
        type: ActivityType.Watching,
    },
    {
        name: `Abduzing ${usuarios} users | ∩lien ${versao}`,
        type: ActivityType.Watching,
    },
];

    return status[Math.floor(Math.random() * status.length)];
};

const atualizarStatus = (client) => {
    const s = pegarStatus(client);
    client.user.setPresence({
        activities: [s],
        status: 'online',
    });
};

// =============================================================================
// Backfill de bot_invites — cobre servidores em que o bot já estava ANTES da
// feature de convite/achievement existir (então nunca passaram pelo
// guildCreate). Roda uma vez ao ligar, em segundo plano (não bloqueia o
// "Pronto para uso!"), com um pequeno intervalo entre servidores pra não
// estourar rate limit de audit log.
// =============================================================================
const backfillBotInvites = async (client) => {
    const pendentes = client.guilds.cache.filter((g) => !hasBotInviteRecord(g.id));
    if (pendentes.size === 0) return;

    let preenchidos = 0;
    for (const guild of pendentes.values()) {
        try {
            const { inviterId, source } = await detectInviter(guild);
            recordBotInvite(guild.id, inviterId, Date.now(), source);
            preenchidos++;
        } catch (err) {
            logger.warn(`Backfill de convite falhou para "${guild.name}" (${guild.id}): ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (preenchidos > 0) {
        logger.info(`Backfill de convites do bot concluído: ${preenchidos} servidor(es) registrado(s)`);
    }
};

// =============================================================================
// Backfill de idioma padrão do servidor — cobre servidores em que o bot já
// estava ANTES dessa feature existir (nunca passaram pelo guildCreate).
// =============================================================================
const backfillGuildDefaultLanguage = async (client) => {
    let preenchidos = 0;
    for (const guild of client.guilds.cache.values()) {
        try {
            const lang = mapDiscordLocaleToLang(guild.preferredLocale);
            if (setGuildDefaultLanguageIfUnset(guild.id, lang)) preenchidos++;
        } catch (err) {
            logger.warn(`Backfill de idioma padrão falhou para "${guild.name}" (${guild.id}): ${err.message}`);
        }
    }

    if (preenchidos > 0) {
        logger.info(`Backfill de idioma padrão concluído: ${preenchidos} servidor(es) atualizado(s)`);
    }
};

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        const servidores = client.guilds.cache.size;
        const usuarios = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const comandos = client.commands.size;

        const asciiArt = await new Promise((resolve) => {
            figlet('  ALIEN', { font: 'Big', horizontalLayout: 'default' }, (err, data) => {
                if (err) resolve('  ALIEN');
                else resolve(data);
            });
        });

        logger.br();
        logger.div();
        logger.ascii(c.magenta(asciiArt));
        logger.div();
        logger.br();

        console.log(
            c.gray('    Bot:    ') + c.bold(c.white(client.user.tag)) + c.gray(`  (${client.user.id})`)
        );
        console.log(
            c.gray('    Status: ') + c.green('ONLINE') + c.bold(c.green(' ✓'))
        );
        logger.br();

        const stat = (label, valor, cor) =>
            console.log(
                c.gray(`    ${label.padEnd(11)}`) + c.bold(cor(String(valor)))
            );

        stat('Servidores:', servidores, c.cyan);
        stat('Usuários:', usuarios, c.yellow);
        stat('Comandos:', comandos, c.magenta);
        stat('Ping WS:', `${client.ws.ping}ms`, c.green);

        logger.br();

        const expiredOffers = cleanExpiredPlanetOffers();
        // Precisa ser capturado ANTES de resolveAllPendingMissions, senão as
        // missões concluídas offline já terão sumido da tabela.
        const notifySnapshots = captureNotifyFlaggedMissions();
        const missions = resolveAllPendingMissions();
        const crafts = resolveAllPendingCrafts();
        const notifyResult = await processNotifyFlaggedMissions(client, notifySnapshots);

        if (missions.total > 0) {
            logger.info(`Missões sincronizadas: ${missions.total} ativa(s), ${missions.completed} concluída(s) offline`);
        }
        if (crafts.total > 0) {
            logger.info(`Fabricações sincronizadas: ${crafts.total} ativa(s), ${crafts.completed} concluída(s) offline`);
        }
        if (expiredOffers > 0) {
            logger.info(`Ofertas de planeta expiradas removidas: ${expiredOffers}`);
        }
        if (notifyResult.rescheduled > 0 || notifyResult.firedNow > 0) {
            logger.info(`Notificações de missão: ${notifyResult.rescheduled} reagendada(s), ${notifyResult.firedNow} enviada(s) agora`);
        }

        logger.br();

        atualizarStatus(client);
        setInterval(() => atualizarStatus(client), 30_000);
        logger.info('Sistema de status rotativo ativado (30s)');

        backfillBotInvites(client).catch((err) => {
            logger.warn(`Backfill de convites do bot falhou: ${err.message}`);
        });

        backfillGuildDefaultLanguage(client).catch((err) => {
            logger.warn(`Backfill de idioma padrão falhou: ${err.message}`);
        });

        scheduleBackups(client);

        logger.success('Pronto para uso!');
        logger.br();
    },
};
