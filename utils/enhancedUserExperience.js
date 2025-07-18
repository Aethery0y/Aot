const logger = require('./logger');
const { EmbedBuilder } = require('discord.js');

/**
 * Enhanced User Experience System
 * Provides improved feedback, guidance, and quality of life features
 */

class EnhancedUserExperience {
    constructor() {
        this.userPreferences = new Map();
        this.helpCache = new Map();
        this.tutorialProgress = new Map();
    }

    /**
     * Create contextual help embed for any command
     */
    createContextualHelp(commandName, userLevel = 1, userPowers = 0) {
        const helpData = this.getHelpData(commandName);
        
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle(`📖 ${helpData.title}`)
            .setDescription(helpData.description);

        // Add relevant tips based on user progress
        if (userLevel < 5 && commandName === 'fight') {
            embed.addFields({
                name: '💡 Beginner Tip',
                value: 'Start with Normal rank enemies to gain experience safely. Use `ot fight normal` to target weaker opponents.',
                inline: false
            });
        }

        if (userPowers === 0 && ['store', 'gacha'].includes(commandName)) {
            embed.addFields({
                name: '🎯 Getting Started',
                value: 'You need powers to battle effectively! Use `ot gacha` to draw your first powers or check `ot store` for direct purchases.',
                inline: false
            });
        }

        // Add usage examples
        if (helpData.examples && helpData.examples.length > 0) {
            embed.addFields({
                name: '📝 Examples',
                value: helpData.examples.join('\n'),
                inline: false
            });
        }

        // Add related commands
        if (helpData.related && helpData.related.length > 0) {
            embed.addFields({
                name: '🔗 Related Commands',
                value: helpData.related.join(' • '),
                inline: false
            });
        }

        embed.setFooter({ text: 'Need more help? Use /otreport to contact support' });
        embed.setTimestamp();

        return embed;
    }

    /**
     * Get help data for specific commands
     */
    getHelpData(commandName) {
        const helpDatabase = {
            'register': {
                title: 'Account Registration',
                description: 'Create your Attack on Titan RPG account to start your journey.',
                examples: ['/register'],
                related: ['/login', '/logout']
            },
            'login': {
                title: 'Account Login',
                description: 'Access your existing Attack on Titan RPG account.',
                examples: ['/login'],
                related: ['/register', '/logout', '/fpassword']
            },
            'fight': {
                title: 'Battle System',
                description: 'Fight against titans and enemies to gain experience and rewards.',
                examples: ['ot fight', 'ot fight normal', 'ot fight legendary'],
                related: ['ot battle', 'ot character', '/otequip']
            },
            'gacha': {
                title: 'Power Drawing',
                description: 'Draw random powers using your gacha draws. Different rarities have different chances.',
                examples: ['ot gacha', 'ot gacha 10'],
                related: ['ot store', 'ot buy draw', '/otequip']
            },
            'store': {
                title: 'Power Store',
                description: 'Browse and purchase specific powers directly with coins.',
                examples: ['ot store', 'ot store normal', 'ot store legendary'],
                related: ['ot gacha', 'ot buy', '/otcharacter']
            },
            'character': {
                title: 'Character Profile',
                description: 'View your character stats, equipped power, and progress.',
                examples: ['/otcharacter', '/otcharacter @user'],
                related: ['/otequip', 'ot arena', 'ot inv']
            },
            'equip': {
                title: 'Power Equipment',
                description: 'Equip powers from your inventory to use them in battle.',
                examples: ['/otequip <power_name>'],
                related: ['/otunequip', 'ot inv', '/otcharacter']
            },
            'merge': {
                title: 'Power Merging',
                description: 'Combine multiple powers to create stronger ones. Has a 1-hour cooldown.',
                examples: ['/otmerge'],
                related: ['/otequip', 'ot inv', 'ot gacha']
            }
        };

        return helpDatabase[commandName] || {
            title: 'Command Help',
            description: 'Use `ot help` to see all available commands.',
            examples: [],
            related: []
        };
    }

    /**
     * Create improved error message with suggestions
     */
    createImprovedErrorMessage(error, context, userInfo = {}) {
        const suggestions = this.getErrorSuggestions(error.message, context);
        
        const embed = new EmbedBuilder()
            .setColor('#FF5722')
            .setTitle('❌ Oops! Something went wrong')
            .setDescription('Don\'t worry, here\'s what you can try:')
            .addFields({
                name: '🔧 Quick Fixes',
                value: suggestions.join('\n'),
                inline: false
            });

        // Add context-specific help
        if (context === 'payment' || context === 'purchase') {
            embed.addFields({
                name: '💰 Payment Issues?',
                value: '• Check your coin balance with `ot cash`\n• Ensure you have enough coins for the purchase\n• Try `ot bank` to check your savings',
                inline: false
            });
        }

        if (context === 'battle' || context === 'fight') {
            embed.addFields({
                name: '⚔️ Battle Issues?',
                value: '• Make sure you have a power equipped with `/otequip`\n• Check your character status with `/otcharacter`\n• Try fighting a lower rank enemy first',
                inline: false
            });
        }

        embed.addFields({
            name: '🆘 Still Need Help?',
            value: 'Use `/otreport` to contact our support team with details about what you were trying to do.',
            inline: false
        });

        embed.setFooter({ text: 'Error ID: ' + Date.now().toString(36) });
        embed.setTimestamp();

        return embed;
    }

    /**
     * Get contextual error suggestions
     */
    getErrorSuggestions(errorMessage, context) {
        const suggestions = ['• Wait a moment and try again'];
        
        if (errorMessage.includes('insufficient') || errorMessage.includes('not enough')) {
            suggestions.push('• Check your balance and ensure you have enough resources');
        }
        
        if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
            suggestions.push('• Double-check the spelling of names/commands');
            suggestions.push('• Use autocomplete to select valid options');
        }
        
        if (errorMessage.includes('cooldown') || errorMessage.includes('wait')) {
            suggestions.push('• This command has a cooldown - wait before using it again');
        }
        
        if (errorMessage.includes('permission') || errorMessage.includes('access')) {
            suggestions.push('• Make sure you have the required permissions');
            suggestions.push('• Some commands require account registration');
        }

        if (context === 'database') {
            suggestions.push('• The issue might be temporary - please try again');
            suggestions.push('• Check your internet connection');
        }

        return suggestions;
    }

    /**
     * Create success message with next steps
     */
    createSuccessMessage(action, details, nextSteps = []) {
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('✅ Success!')
            .setDescription(details);

        if (nextSteps.length > 0) {
            embed.addFields({
                name: '🎯 What\'s Next?',
                value: nextSteps.join('\n'),
                inline: false
            });
        }

        embed.setTimestamp();
        return embed;
    }

    /**
     * Create onboarding sequence for new users
     */
    createOnboardingMessage(step = 1) {
        const steps = {
            1: {
                title: '🎮 Welcome to Attack on Titan RPG!',
                description: 'Let\'s get you started on your journey.',
                nextSteps: [
                    '• Use `/register` to create your account',
                    '• Draw your first power with `ot gacha`',
                    '• Equip it using `/otequip <power_name>`',
                    '• Start battling with `ot fight`'
                ]
            },
            2: {
                title: '⚡ Your First Power!',
                description: 'Great! You\'ve drawn your first power. Now let\'s put it to use.',
                nextSteps: [
                    '• Equip your power with `/otequip <power_name>`',
                    '• Check your character stats with `/otcharacter`',
                    '• Start your first battle with `ot fight normal`'
                ]
            },
            3: {
                title: '⚔️ Battle Ready!',
                description: 'You\'re equipped and ready for combat!',
                nextSteps: [
                    '• Fight enemies to gain experience and coins',
                    '• Use `ot store` to browse more powers',
                    '• Check `ot arena` to see rankings',
                    '• Use `ot help` anytime for assistance'
                ]
            }
        };

        const stepData = steps[step] || steps[1];
        
        const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle(stepData.title)
            .setDescription(stepData.description)
            .addFields({
                name: '📋 Next Steps',
                value: stepData.nextSteps.join('\n'),
                inline: false
            })
            .setFooter({ text: `Step ${step} of 3 • Attack on Titan RPG` })
            .setTimestamp();

        return embed;
    }

    /**
     * Track user preferences for personalized experience
     */
    setUserPreference(userId, preference, value) {
        if (!this.userPreferences.has(userId)) {
            this.userPreferences.set(userId, {});
        }
        this.userPreferences.get(userId)[preference] = value;
        logger.info(`User preference set: ${userId} - ${preference}: ${value}`);
    }

    /**
     * Get user preference with fallback
     */
    getUserPreference(userId, preference, defaultValue = null) {
        const userPrefs = this.userPreferences.get(userId);
        return userPrefs ? (userPrefs[preference] || defaultValue) : defaultValue;
    }
}

module.exports = new EnhancedUserExperience();