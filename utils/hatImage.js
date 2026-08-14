// =============================================================================
// COMPOSIÇÃO ALIEN + CHAPÉU
// =============================================================================
// images/hats/*.png já vem no MESMO tamanho (400x650) que images/aliens/*.png,
// com a área do chapéu recortada/transparente — então basta sobrepor as duas
// imagens (chapéu por cima) que elas se encaixam perfeitamente.
//
// Não usamos uma lib de manipulação de imagem (sharp/canvas) porque o projeto
// já traz @resvg/resvg-js (usado pra gerar as imagens de planeta). Ele também
// serve pra "compor" duas imagens: montamos um SVG mínimo com as duas PNGs
// embutidas em base64, uma por cima da outra, e deixamos o resvg rasterizar
// isso (o compositing alpha padrão do SVG já faz o chapéu se encaixar sobre
// o alien e respeitar a transparência).
//
// O resultado é cacheado em memória por combinação (cor do alien + chapéu),
// já que o total de combinações é pequeno (poucas cores x poucos chapéus).
// =============================================================================

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const logger = require('./logger');

const ALIENS_DIR = path.join(__dirname, '..', 'images', 'aliens');
const HATS_DIR = path.join(__dirname, '..', 'images', 'hats');

const WIDTH = 400;
const HEIGHT = 650;

const cache = new Map();

const toBase64 = (filePath) => fs.readFileSync(filePath).toString('base64');

/**
 * Retorna um Buffer PNG do alien da `colorFile` com o chapéu `hatFile`
 * sobreposto, ou null se algo der errado (arquivo faltando etc — quem chama
 * deve cair de volta pra imagem do alien sem chapéu nesse caso).
 */
const composeAlienWithHat = (colorFile, hatFile) => {
    if (!colorFile || !hatFile) return null;

    const cacheKey = `${colorFile}::${hatFile}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const alienPath = path.join(ALIENS_DIR, colorFile);
    const hatPath = path.join(HATS_DIR, hatFile);

    if (!fs.existsSync(alienPath) || !fs.existsSync(hatPath)) {
        return null;
    }

    try {
        const alienB64 = toBase64(alienPath);
        const hatB64 = toBase64(hatPath);

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <image x="0" y="0" width="${WIDTH}" height="${HEIGHT}" href="data:image/png;base64,${alienB64}" />
    <image x="0" y="0" width="${WIDTH}" height="${HEIGHT}" href="data:image/png;base64,${hatB64}" />
</svg>`.trim();

        const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
        const pngBuffer = resvg.render().asPng();

        cache.set(cacheKey, pngBuffer);
        return pngBuffer;
    } catch (err) {
        logger.error(`Falha ao compor alien+chapéu (${colorFile} + ${hatFile}): ${err.message}`);
        return null;
    }
};

module.exports = {
    composeAlienWithHat,
};
