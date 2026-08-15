// =============================================================================
// IMAGEM DE PÓDIO DO /ranking (Top 3)
// =============================================================================
// O fundo é uma arte fixa (images/logo/podio.png, 1254x1254) desenhada à mão
// com os 3 degraus do pódio. A gente só embuti ela em base64 num SVG junto
// com os avatares do Discord dos top 3 (recortados em círculo, com um anel
// colorido por posição), na posição de cada degrau, e deixa o resvg
// rasterizar tudo num PNG quadrado — usado como thumbnail do /ranking.
//
// Não tem mais alien/chapéu aqui — só a fotinha de cada jogador.
//
// As coordenadas de cada degrau (SLOTS abaixo) foram mapeadas a dedo em cima
// da arte original (1254x1254) e escaladas pro canvas final (SIZE). Se a
// arte em images/logo/podio.png for trocada por outra com proporções
// diferentes, essas coordenadas precisam ser remapeadas.
// =============================================================================

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const logger = require('./logger');

const BACKGROUND_PATH = path.join(__dirname, '..', 'images', 'logo', 'podio.png');

const SIZE = 512;

// Espaço entre o avatar e o topo do degrau (pra ele "flutuar" mais acima,
// sem encostar na numeração).
const AVATAR_GAP = 22;

// cx / topY em coordenadas já escaladas pro canvas de SIZE=512 (mapeados a
// partir da arte original 1254x1254 — ver cabeçalho do arquivo).
const SLOTS = [
    { rank: 2, cx: 111, topY: 331, avatarSize: 104, ring: '#C7CCD6', ringDark: '#8B93A0' },
    { rank: 1, cx: 268, topY: 266, avatarSize: 128, ring: '#FFD76A', ringDark: '#D97706' },
    { rank: 3, cx: 393, topY: 367, avatarSize: 90, ring: '#E3A467', ringDark: '#9A5F2E' },
];

const toBase64 = (buffer) => buffer.toString('base64');

// Fundo é estático — lê e converte pra base64 uma única vez.
let backgroundB64Cache = null;
const getBackgroundB64 = () => {
    if (backgroundB64Cache) return backgroundB64Cache;
    if (!fs.existsSync(BACKGROUND_PATH)) return null;
    backgroundB64Cache = toBase64(fs.readFileSync(BACKGROUND_PATH));
    return backgroundB64Cache;
};

const buildAvatarTag = (slot, avatarBuffer) => {
    if (!avatarBuffer) return '';

    const { cx, topY, avatarSize, ring, ringDark, rank } = slot;
    const r = avatarSize / 2;
    const cy = topY - AVATAR_GAP - r;

    const clipId = `avatarClip${rank}`;
    const ringId = `avatarRing${rank}`;

    return `
<defs>
    <clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${r}" /></clipPath>
    <linearGradient id="${ringId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${ring}" />
        <stop offset="100%" stop-color="${ringDark}" />
    </linearGradient>
</defs>
<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="url(#${ringId})" />
<circle cx="${cx}" cy="${cy}" r="${r + 1.5}" fill="#1c1440" />
<image x="${cx - r}" y="${cy - r}" width="${avatarSize}" height="${avatarSize}" href="data:image/png;base64,${toBase64(avatarBuffer)}" clip-path="url(#${clipId})" />`;
};

/**
 * entriesByRank: { 1: Entry|null, 2: Entry|null, 3: Entry|null }
 * Entry = { avatarBuffer: Buffer|null }
 *
 * Retorna um Buffer PNG quadrado (512x512) com o pódio, ou null se faltar a
 * arte de fundo ou algo der errado.
 */
const composeRankingPodium = (entriesByRank) => {
    try {
        const backgroundB64 = getBackgroundB64();
        if (!backgroundB64) {
            logger.error(`Arte de fundo do pódio não encontrada em ${BACKGROUND_PATH}`);
            return null;
        }

        const avatars = SLOTS
            .map((slot) => buildAvatarTag(slot, entriesByRank[slot.rank]?.avatarBuffer ?? null))
            .join('\n');

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <image x="0" y="0" width="${SIZE}" height="${SIZE}" href="data:image/png;base64,${backgroundB64}" />
    ${avatars}
</svg>`.trim();

        const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE } });
        return resvg.render().asPng();
    } catch (err) {
        logger.error(`Falha ao compor imagem de pódio do ranking: ${err.message}`);
        return null;
    }
};

module.exports = {
    composeRankingPodium,
};