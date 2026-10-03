// =============================================================================
// DEPLOY DOS SLASH COMMANDS
// =============================================================================
// Roda sozinho toda vez que o bot inicia (index.js chama deployCommands()),
// mas só fala com a API do Discord quando algum comando MUDOU: guarda um
// hash dos comandos em data/commands-hash.txt e compara. Assim reiniciar o
// bot não gasta o limite diário de criação de comandos do Discord à toa.
//
// Rodar na mão continua funcionando e SEMPRE força o envio:
//   npm run deploy-commands
// =============================================================================

const { REST, Routes, ApplicationIntegrationType, InteractionContextType } = require('discord.js');
const { clientId, guildId, token } = require('../config.json');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const logger = require('../utils/logger');

const HASH_FILE = path.join(__dirname, '..', 'data', 'commands-hash.txt');

const loadCommandsJson = () => {
    const commands = [];
    const foldersPath = path.join(__dirname, '..', 'commands');

    for (const folder of fs.readdirSync(foldersPath)) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if (!('data' in command && 'execute' in command)) {
                logger.warn(`O comando em ${filePath} está sem a propriedade obrigatória "data" ou "execute".`);
                continue;
            }

            const json = command.data.toJSON();

            // Deixa TODO comando disponível também como instalação de
            // usuário (funciona em qualquer servidor mesmo sem o bot estar
            // adicionado formalmente, em DM e em grupos) — não só na
            // instalação de servidor tradicional. Restrições específicas
            // (tipo /config server só fazer sentido dentro de um servidor
            // com permissão de Gerenciar Servidor) continuam sendo
            // aplicadas em código (utils/guildGuard.js + dentro do próprio
            // comando), já que a API do Discord não permite restringir um
            // subcomando individual por contexto.
            json.integration_types = [
                ApplicationIntegrationType.GuildInstall,
                ApplicationIntegrationType.UserInstall,
            ];
            json.contexts = [
                InteractionContextType.Guild,
                InteractionContextType.BotDM,
                InteractionContextType.PrivateChannel,
            ];

            commands.push(json);
        }
    }

    return commands;
};

const readSavedHash = () => {
    try {
        return fs.readFileSync(HASH_FILE, 'utf-8').trim();
    } catch {
        return null;
    }
};

const saveHash = (hash) => {
    fs.mkdirSync(path.dirname(HASH_FILE), { recursive: true });
    fs.writeFileSync(HASH_FILE, hash);
};

/**
 * Registra os slash commands globalmente. Sem `force`, pula o envio se nada
 * mudou desde o último deploy. Nunca lança erro — falhar aqui não deve
 * derrubar o bot (os comandos antigos continuam registrados no Discord).
 */
const deployCommands = async ({ force = false } = {}) => {
    try {
        const commands = loadCommandsJson();
        const hash = crypto
            .createHash('sha256')
            .update(JSON.stringify({ clientId, commands }))
            .digest('hex');

        if (!force && readSavedHash() === hash) {
            logger.info(`Slash commands sem alteração (${commands.length}) — deploy pulado`);
            return { deployed: false, count: commands.length };
        }

        const rest = new REST().setToken(token);

        // Comandos de instalação de usuário PRECISAM ser globais — o Discord
        // não permite user install em comandos registrados só numa guild
        // específica. O PUT em lote mantém o ID dos comandos que já existem
        // (as menções </comando:id> do bot continuam funcionando).
        logger.info(`Enviando ${commands.length} slash commands ao Discord (registro GLOBAL)...`);
        const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
        logger.success(`${data.length} slash commands registrados globalmente (podem levar até 1h pra aparecer em todo lugar)`);

        // Remove os comandos antigos registrados só nessa guild (do jeito
        // anterior), pra não ficar duplicado agora que tudo é global.
        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        }

        saveHash(hash);
        return { deployed: true, count: data.length };
    } catch (error) {
        logger.error(`Falha no deploy dos slash commands: ${error.message}`);
        return { deployed: false, error };
    }
};

module.exports = { deployCommands };

if (require.main === module) {
    deployCommands({ force: true });
}
