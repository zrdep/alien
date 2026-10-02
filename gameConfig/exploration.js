// =============================================================================
// EXPLORAÇÃO — fonte única de verdade
// =============================================================================
// Regras gerais do /planet que não pertencem a uma raridade ou a um upgrade
// de nave específico.
// =============================================================================

const EXPLORATION_CONFIG = {
    // Quantos planetas o jogador pode VISUALIZAR (/planet + botão "Próximo")
    // por ciclo de 1 hora (horário de Brasília). Cada visualização consome 1
    // uso, explorando ou não. Reseta na virada de cada hora.
    planetViewsPerHour: 10,
};

module.exports = {
    EXPLORATION_CONFIG,
};
