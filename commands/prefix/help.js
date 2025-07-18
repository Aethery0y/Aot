const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/bot');

module.exports = {
    name: 'help',
    description: 'Display all available commands and their descriptions',
    usage: 'help [command]',
    cooldown: 8, // 8 seconds cooldown
    aliases: ['h', 'commands'],
    
    async execute(message, args) {
        try {
            const prefix = config.prefix;
            
            // If specific command requested
            if (args.length > 0) {
                const commandName = args[0].toLowerCase();
                const command = message.client.prefixCommands.get(commandName) ||
                               message.client.prefixCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
                
                if (command) {
                    const commandEmbed = new EmbedBuilder()
                        .setColor('#4CAF50')
                        .setTitle(`📖 Command: ${prefix}${command.name}`)
                        .setDescription(command.description || 'No description available')
                        .addFields(
                            { name: '📝 Usage', value: `\`${prefix}${command.usage || command.name}\``, inline: true },
                            { name: '⏱️ Cooldown', value: command.cooldown ? `${command.cooldown}s` : 'None', inline: true },
                            { name: '🏷️ Aliases', value: command.aliases ? command.aliases.map(alias => `\`${alias}\``).join(', ') : 'None', inline: true }
                        )
                        .setFooter({ text: 'Attack on Titan RPG Bot' })
                        .setTimestamp();

                    return message.reply({ embeds: [commandEmbed] });
                } else {
                    return message.reply(`❌ Command \`${commandName}\` not found. Use \`${prefix}help\` to see all commands.`);
                }
            }

            // Main help embed with all commands
            const helpEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('⚔️ Attack on Titan RPG - Command Guide')
                .setDescription(`Welcome to the world of Attack on Titan! Use \`${prefix}\` before each command.`)
                .addFields(
                    {
                        name: '👤 **Character & Profile**',
                        value: `\`${prefix}character\` - View your character profile and stats
                        \`/otcharacter\` - View character profile (slash command)
                        \`${prefix}inventory\` - View your powers and equipment`,
                        inline: false
                    },
                    {
                        name: '⚔️ **Combat & Battles**',
                        value: `\`${prefix}battle @user\` - Challenge another player to PvP (8s cooldown)
                        \`${prefix}fight [rank]\` - Battle against titans and humans (10s cooldown)
                        \`${prefix}fight mythic\` - Target specific rank enemies
                        \`${prefix}afight <rank>\` - Challenge arena ranked players (8s cooldown)
                        \`${prefix}eat @user\` - Steal power from another user (8s cooldown)`,
                        inline: false
                    },
                    {
                        name: '⚡ **Powers & Equipment**',
                        value: `\`${prefix}gacha\` - Access gacha system (primary way to get powers!)
                        \`${prefix}gacha draw\` - Use one gacha draw (8s cooldown)
                        \`${prefix}gacha history\` - View your gacha pull history
                        \`${prefix}store\` - Buy powers from the store (alternative source)
                        \`/otequip\` - Equip power (dropdown selection)
                        \`/otunequip\` - Unequip power (dropdown selection)  
                        \`/otmerge\` - Merge multiple powers into one stronger power
                        \`${prefix}recalculate\` - Recalculate CP for all powers (30s cooldown)`,
                        inline: false
                    },
                    {
                        name: '🏟️ **Arena & Rankings**',
                        value: `\`${prefix}arena\` - View top 200 arena rankings
                        \`${prefix}afight <rank>\` - Challenge specific arena rank (e.g., \`${prefix}afight 1\`)
                        💡 Win arena battles to climb the rankings!`,
                        inline: false
                    },
                    {
                        name: '💰 **Economy & Banking**',
                        value: `\`${prefix}cash\` - Check your wallet and bank balance
                        \`${prefix}deposit <amount>\` - Deposit coins to bank
                        \`${prefix}withdraw <amount>\` - Withdraw coins from bank
                        \`${prefix}give @user <amount>\` - Give coins to another user
                        \`${prefix}store\` - Buy gacha draws (1,000 coins each)`,
                        inline: false
                    },
                    {
                        name: '🎲 **Gambling & Games**',
                        value: `\`${prefix}bet <amount>\` - Simple betting game (5s cooldown)
                        \`${prefix}cf <amount> <heads/tails>\` - Coinflip gambling (3s cooldown)
                        \`${prefix}slot <amount>\` - Slot machine game (8s cooldown)
                        \`${prefix}hr <amount>\` - High-risk, high-reward gambling (5s cooldown)
                        \`${prefix}rob @user\` - Attempt to rob another player (8s cooldown)`,
                        inline: false
                    },
                    {
                        name: '🛠️ **Utility & Account**',
                        value: `\`${prefix}help\` - Show this help menu (8s cooldown)
                        \`${prefix}help <command>\` - Get detailed info about a command
                        \`${prefix}daily\` - Claim daily rewards and bonuses (6h cooldown)
                        \`/register\` - Register a new account
                        \`/login\` - Login to existing account
                        \`/logout\` - Logout from current account
                        \`/fpassword\` - Change account password
                        \`/redeem <code>\` - Redeem special codes for rewards`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: `🎰 Gacha rates made much harder! Store still available for direct purchases.` 
                })
                .setTimestamp();

            // Add action buttons
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('action_quick_battle')
                        .setLabel('Quick Battle')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⚔️'),
                    new ButtonBuilder()
                        .setCustomId('action_quick_shop')
                        .setLabel('Power Store')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏪'),
                    new ButtonBuilder()
                        .setCustomId('action_quick_arena')
                        .setLabel('Arena Rankings')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🏟️')
                );

            await message.reply({ 
                embeds: [helpEmbed],
                components: [actionRow]
            });

            // Set cooldown after help display
            const { setCooldownAfterSuccess } = require('../../utils/database');
            await setCooldownAfterSuccess(message.author.id, 'help', 8);

        } catch (error) {
            logger.error('Error in help command:', error);
            await message.reply('❌ An error occurred while displaying the help menu.');
        }
    }
};