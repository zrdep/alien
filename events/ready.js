const { Events, ActivityType } = require('discord.js');
const figlet = require('figlet');
const picocolors = require('picocolors');
const logger = require('../utils/logger');
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

        atualizarStatus(client);
        setInterval(() => atualizarStatus(client), 30_000);
        logger.info('Sistema de status rotativo ativado (30s)');

        logger.success('Pronto para uso!');
        logger.br();
    },
};
