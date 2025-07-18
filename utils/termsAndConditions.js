const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Get Terms and Conditions embed
 */
function getTermsAndConditionsEmbed() {
    return new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📋 Attack on Titan Bot - Terms & Conditions')
        .setDescription('Please read and accept our Terms & Conditions to use this bot.')
        .addFields(
            {
                name: '🐛 Bug Reporting Requirement',
                value: 'You are **required** to report any bugs, glitches, or issues you encounter using `/otreport`',
                inline: false
            },
            {
                name: '⚠️ Exploit Policy',
                value: 'Using exploits, cheats, or abusing bugs will result in **immediate account reset** and potential ban',
                inline: false
            },
            {
                name: '🎮 Fair Play',
                value: 'Play fairly and respect other users. Harassment or toxic behavior is not tolerated',
                inline: false
            },
            {
                name: '📊 Data Usage',
                value: 'Your game data (username, stats, powers) is stored to provide bot functionality',
                inline: false
            },
            {
                name: '🔄 Account Management',
                value: 'Admins reserve the right to reset accounts for rule violations or maintenance',
                inline: false
            },
            {
                name: '📞 Support',
                value: 'For issues, use `/otreport` or contact administrators directly',
                inline: false
            },
            {
                name: '📝 Updates',
                value: 'Terms may be updated. Continued use indicates acceptance of changes',
                inline: false
            }
        )
        .setFooter({ text: 'By clicking "Accept", you agree to these terms and conditions' })
        .setTimestamp();
}

/**
 * Get Terms acceptance buttons
 */
function getTermsButtons() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('accept_terms')
                .setLabel('✅ Accept Terms')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('decline_terms')
                .setLabel('❌ Decline')
                .setStyle(ButtonStyle.Danger)
        );
}

/**
 * Get registration restriction embed
 */
function getRegistrationRequiredEmbed() {
    return new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🔒 Account Required')
        .setDescription('You must be registered to use this command!')
        .addFields(
            {
                name: '📝 New User?',
                value: 'Use `/register` to create your account',
                inline: true
            },
            {
                name: '🔑 Existing User?',
                value: 'Use `/login` to access your account',
                inline: true
            },
            {
                name: '📋 Terms Required',
                value: 'You must accept our Terms & Conditions during registration',
                inline: false
            }
        )
        .setFooter({ text: 'Only registered users can access bot features' })
        .setTimestamp();
}

module.exports = {
    getTermsAndConditionsEmbed,
    getTermsButtons,
    getRegistrationRequiredEmbed
};