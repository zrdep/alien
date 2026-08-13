const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { supportToken } = require('../config.json');
const logger = require('../utils/logger');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();
client.cooldowns = new Collection();

client.on(Events.Error, (error) => {
    logger.error('Erro no cliente Discord (Support Bot):');
    console.error(error.stack ?? error.message);
});

logger.info('Inicializando Support Bot...');
logger.br();

const foldersPath = path.join(__dirname, 'commands');
if (fs.existsSync(foldersPath)) {
    const commandFolders = fs.readdirSync(foldersPath);
    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        if (fs.lstatSync(commandsPath).isDirectory()) {
            const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    logger.success(`[Support] Comando carregado: /${command.data.name}`);
                }
            }
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        logger.info(`[Support] Evento carregado: ${event.name}${event.once ? ' (once)' : ''}`);
    }
}

if (supportToken) {
    logger.info('Conectando Support Bot ao Discord...');
    client.login(supportToken);
} else {
    logger.warn('Token do Support Bot não configurado no config.json.');
}
