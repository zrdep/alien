// Backup automático do banco SQLite.
//
// Usa o Online Backup API do SQLite (via `db.backup()` do better-sqlite3) —
// isso gera uma cópia consistente do banco mesmo com o bot escrevendo nele ao
// mesmo tempo (o bot roda com WAL ativo), sem precisar travar nada.
//
// Dois gatilhos:
//   1. Periódico, a cada `backupIntervalHours` do config.json (padrão 6h).
//   2. No desligamento (SIGINT/SIGTERM) — ver hook em index.js — cobre o
//      caso de um redeploy na Square Cloud sobrescrever a pasta `data/`.
//
// Se `backupChannelId` estiver configurado, cada backup também é enviado
// (comprimido) pra esse canal do Discord — dá uma cópia fora do disco da
// hospedagem, então mesmo que o volume da Square Cloud seja perdido num
// redeploy, o histórico recente continua recuperável.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('./logger');
const { db } = require('./db');
const { backupChannelId, backupIntervalHours } = require('../config.json');

const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const MAX_BACKUPS_KEPT = 3; // rotação: mantém só os N mais recentes em disco

const timestamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
};

// Nomes começam com timestamp (ano-mês-dia_hora-min-seg), então ordem
// alfabética já é ordem cronológica — não precisa parsear data de novo.
const pruneOldBackups = () => {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db.gz')).sort();
    const excess = files.length - MAX_BACKUPS_KEPT;
    for (let i = 0; i < excess; i++) {
        fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
    }
};

const runBackup = async (client = null) => {
    const rawPath = path.join(BACKUP_DIR, `bot-${timestamp()}.db`);
    const gzPath = `${rawPath}.gz`;

    try {
        await db.backup(rawPath);

        const compressed = zlib.gzipSync(fs.readFileSync(rawPath));
        fs.writeFileSync(gzPath, compressed);
        fs.unlinkSync(rawPath);

        pruneOldBackups();
        logger.success(`Backup do banco criado: ${path.basename(gzPath)} (${(compressed.length / 1024).toFixed(0)} KB)`);

        if (backupChannelId && client) {
            try {
                const channel = await client.channels.fetch(backupChannelId);
                await channel.send({
                    content: `🗄️ Backup automático do banco — ${new Date().toLocaleString('pt-BR')}`,
                    files: [{ attachment: gzPath, name: path.basename(gzPath) }],
                });
            } catch (err) {
                logger.warn(`Falha ao enviar backup pro canal configurado: ${err.message}`);
            }
        }

        return gzPath;
    } catch (err) {
        logger.error(`Falha ao gerar backup do banco: ${err.message}`);
        if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath); // limpa sobra parcial
        return null;
    }
};

const scheduleBackups = (client) => {
    const hours = Number(backupIntervalHours) > 0 ? Number(backupIntervalHours) : 6;
    const intervalMs = hours * 60 * 60 * 1000;

    // Primeiro backup logo depois de ligar (com um delay curto pra não
    // competir com o resto da inicialização), depois repete no intervalo.
    setTimeout(() => runBackup(client), 60_000);
    setInterval(() => runBackup(client), intervalMs).unref();

    logger.info(`Backup automático do banco ativado (a cada ${hours}h${backupChannelId ? ', enviando pro canal configurado' : ''})`);
};

module.exports = { runBackup, scheduleBackups };
