const { MessageFlags } = require('discord.js');
const { tFor } = require('./i18n');

const NOT_YOUR_COMPONENT_KEYS = [
    'components.notYourButton.msg1',
    'components.notYourButton.msg2',
    'components.notYourButton.msg3',
    'components.notYourButton.msg4',
];

const getComponentOwnerId = (interaction) => {
    return interaction.message?.interaction?.user?.id ?? null;
};

// Botões de /presentear ficam visíveis pra DUAS pessoas (quem manda e quem
// recebe), não só pra quem rodou o comando — por isso viram um caso especial
// aqui: o ID de quem deve receber o presente vai embutido no customId
// (gift_confirm_<targetId>_<giftId> / gift_cancel_<targetId>_<giftId>), e é
// liberado tanto pra esse usuário quanto pro dono normal da mensagem.
const GIFT_BUTTON_PATTERN = /^gift_(?:confirm|cancel)_(\d+)_.+$/;

const isWrongComponentUser = (interaction) => {
    const customId = interaction.customId;
    if (typeof customId === 'string') {
        const giftMatch = customId.match(GIFT_BUTTON_PATTERN);
        if (giftMatch) {
            const targetId = giftMatch[1];
            const ownerId = getComponentOwnerId(interaction);
            if (interaction.user.id === targetId) return false;
            if (!ownerId) return false;
            return ownerId !== interaction.user.id;
        }
    }

    const ownerId = getComponentOwnerId(interaction);
    if (!ownerId) return false;
    return ownerId !== interaction.user.id;
};

const buildNotYourComponentReply = (interaction) => {
    const key = NOT_YOUR_COMPONENT_KEYS[
        Math.floor(Math.random() * NOT_YOUR_COMPONENT_KEYS.length)
    ];
    return {
        content: tFor(interaction, key),
        flags: MessageFlags.Ephemeral,
    };
};

const blockWrongComponentUser = async (interaction) => {
    if (!isWrongComponentUser(interaction)) return false;

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(buildNotYourComponentReply(interaction));
    } else {
        await interaction.reply(buildNotYourComponentReply(interaction));
    }
    return true;
};

module.exports = {
    getComponentOwnerId,
    isWrongComponentUser,
    buildNotYourComponentReply,
    blockWrongComponentUser,
};