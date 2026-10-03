// Lógica dos consumíveis ao iniciar uma missão. Os DADOS (quais itens
// existem, efeito, receita) ficam em gameConfig/consumables.js.

const { getConsumable } = require('../gameConfig/consumables');

// Arredondamento estocástico: 3 × 1.25 = 3.75 vira 4 em 75% das vezes e 3
// em 25%. O valor ESPERADO é exatamente o bônus anunciado, mesmo nos
// recursos raros que caem de 1 em 1 (onde Math.round engoliria o +25%).
const applyPercentBonus = (amount, percent) => {
    const exact = amount * (1 + percent / 100);
    const floor = Math.floor(exact);
    return floor + (Math.random() < exact - floor ? 1 : 0);
};

/**
 * Aplica os consumíveis escolhidos sobre os dados da missão (antes de
 * salvá-la). Não gasta nada — quem chama já gastou com consumeUserItems.
 * Retorna { resources, travelSeconds } novos.
 */
const applyConsumablesToMission = (itemKeys, { resources, travelSeconds }) => {
    let outResources = resources.map((r) => ({ ...r }));
    let outTravel = travelSeconds;

    for (const key of itemKeys) {
        const effect = getConsumable(key)?.effect ?? {};
        if (effect.resourceBonusPercent) {
            outResources = outResources.map((r) => ({
                ...r,
                amount: applyPercentBonus(r.amount, effect.resourceBonusPercent),
            }));
        }
        if (effect.travelReductionPercent) {
            outTravel = Math.max(1, Math.ceil(outTravel * (1 - effect.travelReductionPercent / 100)));
        }
    }

    return { resources: outResources, travelSeconds: outTravel };
};

module.exports = {
    applyConsumablesToMission,
};
