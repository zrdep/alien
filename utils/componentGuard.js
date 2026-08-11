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

const isWrongComponentUser = (interaction) => {
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
