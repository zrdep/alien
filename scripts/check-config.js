// Roda só a validação de config/dados do jogo, sem conectar no Discord.
// Útil pra checar rapidamente depois de editar gameConfig/*.js ou
// utils/craftRecipes.js: `npm run check-config`.

const { validateGameConfig } = require('../gameConfig');

const { errors, warnings } = validateGameConfig({ throwOnError: false });

if (warnings.length) {
    console.warn(`${warnings.length} aviso(s):`);
    for (const w of warnings) console.warn(' -', w);
}

if (errors.length) {
    console.error(`${errors.length} erro(s):`);
    for (const e of errors) console.error(' -', e);
    process.exit(1);
}

console.log('Configuração do jogo OK — nenhum problema encontrado.');
