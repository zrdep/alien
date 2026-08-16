const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const { recordBotInvite, setGuildDefaultLanguageIfUnset } = require('../utils/db');
const { mapDiscordLocaleToLang } = require('../utils/i18n');

// =============================================================================
// Dispara quando o bot entra num servidor novo. Tenta descobrir QUEM
// adicionou o bot (pra conquista `invite_bot_1` / comando /resgatar):
//
//   1. Se o bot tem permissão de "Ver Registro de Auditoria" no servidor,
//      busca a entrada de audit log do tipo BOT_ADD mais recente cujo alvo
//      seja o próprio bot -> o executor dessa entrada é quem convidou.
//   2. Se não tiver a permissão, a busca falhar, ou não achar a entrada
//      (pode não existir ainda por um pequeno atraso de propagação do
//      Discord), cai pro fallback: assume o dono do servidor como
//      "convidador" — não é garantido ser a pessoa exata, mas é a melhor
//      aproximação disponível sem a permissão de audit log.
//
// O mesmo detectInviter() é reaproveitado no backfill do events/ready.js
// pra servidores em que o bot já estava antes dessa feature existir.
// =============================================================================

const detectInviter = async (guild) => {
    try {
        const me = guild.members.me;
        if (me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
            const entry = logs.entries.find((e) => e.target?.id === guild.client.user.id);
            if (entry?.executor?.id) {
                return { inviterId: entry.executor.id, source: 'audit_log' };
            }
        }
    } catch (err) {
        logger.warn(`Não foi possível ler o audit log de ${guild.name} (${guild.id}): ${err.message}`);
    }

    if (guild.ownerId) {
        return { inviterId: guild.ownerId, source: 'owner_fallback' };
    }

    return { inviterId: null, source: 'unknown' };
};

module.exports = {
    name: Events.GuildCreate,
    once: false,
    detectInviter, // exportado pra ser reaproveitado no backfill do ready.js
    async execute(guild) {
        const { inviterId, source } = await detectInviter(guild);
        recordBotInvite(guild.id, inviterId, Date.now(), source);

        // Detecta o idioma padrão do servidor pelo locale configurado no
        // Discord (Configurações do Servidor > Idioma da Comunidade).
        // Servidores fora do Brasil/língua portuguesa já entram em inglês.
        const detectedLang = mapDiscordLocaleToLang(guild.preferredLocale);
        setGuildDefaultLanguageIfUnset(guild.id, detectedLang);

        if (inviterId) {
            logger.success(`Bot adicionado ao servidor "${guild.name}" (${guild.id}) — convidado por ${inviterId} (${source}), idioma padrão: ${detectedLang}`);
        } else {
            logger.warn(`Bot adicionado ao servidor "${guild.name}" (${guild.id}) — não foi possível identificar quem convidou`);
        }
    },
};
