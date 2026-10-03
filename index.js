const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const logger = require('./utils/logger');
const express = require('express');
const app = express();
require('./utils/db');

const { validateGameConfig } = require('./gameConfig');
try {
    validateGameConfig();
    logger.success('Configuração do jogo validada (gameConfig/)');
} catch (err) {
    logger.error('Configuração do jogo inválida — corrija antes de continuar:');
    console.error(err.message);
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.cooldowns = new Collection();

client.on(Events.Error, (error) => {
    logger.error('Erro no cliente Discord:');
    console.error(error.stack ?? error.message);
});

logger.info('Inicializando...');
logger.br();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.success(`Comando carregado: /${command.data.name}`);
        } else {
            logger.warn(`O comando em ${filePath} não possui "data" ou "execute".`);
        }
    }
}

logger.br();
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info(`Evento carregado: ${event.name}${event.once ? ' (once)' : ''}`);
}

// Site simples (public/index.html)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.success(`Site rodando na porta ${PORT}`);
});

// Registra os slash commands no Discord — só envia de verdade quando algum
// comando mudou (ver scripts/deploy-commands.js). Roda em paralelo com o
// login e nunca derruba o bot se falhar.
const { deployCommands } = require('./scripts/deploy-commands');
deployCommands();

logger.br();
logger.info('Conectando ao Discord...');
client.login(token);

// Gera um backup final antes de encerrar (ex.: redeploy na Square Cloud) —
// cobre a janela entre o último backup periódico e o exato momento em que o
// processo é derrubado.
const { runBackup } = require('./utils/backup');
const encerrarComBackup = async (signal) => {
    logger.info(`Recebido ${signal} — gerando backup final do banco antes de encerrar...`);
    try {
        await runBackup(client);
    } catch (err) {
        logger.warn(`Backup final falhou: ${err.message}`);
    }
    process.exit(0);
};
process.on('SIGINT', () => encerrarComBackup('SIGINT'));
process.on('SIGTERM', () => encerrarComBackup('SIGTERM'));

require('./support_bot/index.js');
