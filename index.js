const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const logger = require('./utils/logger');
require('./utils/db');

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

logger.br();
logger.info('Conectando ao Discord...');
client.login(token);

require('./support_bot/index.js');
