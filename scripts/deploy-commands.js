const { REST, Routes, ApplicationIntegrationType, InteractionContextType } = require('discord.js');
const { clientId, guildId, token } = require('../config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, '..', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
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
		} else {
			console.log(`[AVISO] O comando em ${filePath} está sem a propriedade obrigatória "data" ou "execute".`);
		}
	}
}

const rest = new REST().setToken(token);

(async () => {
	try {
		// Comandos de instalação de usuário PRECISAM ser globais — o Discord
		// não permite user install em comandos registrados só numa guild
		// específica. Por isso registramos em Routes.applicationCommands
		// (global) em vez de applicationGuildCommands.
		console.log(`Iniciando atualização de ${commands.length} comandos de aplicação (/) — registro GLOBAL`);
		const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
		console.log(`Recarregados com sucesso ${data.length} comandos de aplicação (/) globalmente`);
		console.log('Obs: comandos globais podem levar até 1 hora pra propagar em todos os servidores/clientes.');

		// Remove os comandos antigos registrados só nessa guild (do jeito
		// anterior), pra não ficar duplicado agora que tudo é global.
		if (guildId) {
			await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
			console.log(`Comandos antigos específicos da guild ${guildId} removidos (agora usando os globais).`);
		}
	} catch (error) {
		console.error(error);
	}
})();