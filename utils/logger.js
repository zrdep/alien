const picocolors = require('picocolors');

const c = picocolors;

const horario = () => {
    const data = new Date();
    const h = String(data.getHours()).padStart(2, '0');
    const m = String(data.getMinutes()).padStart(2, '0');
    const s = String(data.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const prefix = (tag, cor) => cor(c.bold(`[${tag}]`));

const logger = {
    info(...args) {
        console.log(
            c.gray(`[${horario()}]`) + ' ' +
            prefix('INFO', c.cyan) + ' ' +
            args.join(' ')
        );
    },
    success(...args) {
        console.log(
            c.gray(`[${horario()}]`) + ' ' +
            prefix('OK', c.green) + ' ' +
            args.join(' ')
        );
    },
    warn(...args) {
        console.log(
            c.gray(`[${horario()}]`) + ' ' +
            prefix('AVISO', c.yellow) + ' ' +
            c.yellow(args.join(' '))
        );
    },
    error(...args) {
        console.log(
            c.gray(`[${horario()}]`) + ' ' +
            prefix('ERRO', c.red) + ' ' +
            c.red(args.join(' '))
        );
    },
    command(user, command, guild) {
        console.log(
            c.gray(`[${horario()}]`) + ' ' +
            prefix('CMD', c.magenta) + ' ' +
            `${c.bold(user)} executou /${c.bold(command)}` +
            (guild ? c.gray(` em ${guild}`) : '')
        );
    },
    ascii(...args) {
        console.log(args.join(' '));
    },
    br() {
        console.log('');
    },
    div() {
        console.log(c.gray('─'.repeat(60)));
    },
};

module.exports = logger;
