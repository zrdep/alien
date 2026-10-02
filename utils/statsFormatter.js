/**
 * Helper to format large numbers (distances, counts) for user profile and stats.
 */

function formatDistance(distanceKm, lang = 'pt-BR') {
    const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

    if (distanceKm >= 1_000_000_000) {
        const val = (distanceKm / 1_000_000_000).toLocaleString(numLoc, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
        });
        return lang === 'pt-BR' ? `${val} bilhões de km` : `${val} billion km`;
    }

    if (distanceKm >= 1_000_000) {
        const val = (distanceKm / 1_000_000).toLocaleString(numLoc, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
        });
        return lang === 'pt-BR' ? `${val} milhões de km` : `${val} million km`;
    }

    return `${distanceKm.toLocaleString(numLoc)} km`;
}

function formatCount(num, lang = 'pt-BR') {
    const numLoc = lang === 'pt-BR' ? 'pt-BR' : 'en-US';

    if (num >= 1_000_000_000) {
        const val = (num / 1_000_000_000).toLocaleString(numLoc, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
        });
        return lang === 'pt-BR' ? `${val} bilhões` : `${val} billion`;
    }

    if (num >= 10_000_000) {
        const val = (num / 1_000_000).toLocaleString(numLoc, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
        });
        return lang === 'pt-BR' ? `${val} milhões` : `${val} million`;
    }

    return num.toLocaleString(numLoc);
}

// Emoji de posição usado em listas ranqueadas (/ranking, /market,
// /hatmarket): top 3 usam os emojis de raridade (lendário → épico → raro)
// como "pódio" e o resto mostra só o número da posição.
const PODIUM_EMOJIS = [
    '<:legendary:1536459814475927653>',
    '<:epic:1536459798269395044>',
    '<:rare:1536459780166647878>',
];

function formatPlace(index) {
    return PODIUM_EMOJIS[index] ?? `\`#${index + 1}\``;
}

module.exports = {
    formatDistance,
    formatCount,
    formatPlace,
};
