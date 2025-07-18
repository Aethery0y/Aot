const { EmbedBuilder } = require('discord.js');
const { getRankEmoji, getRankColor, getPowerCP } = require('./powers');

/**
 * Create store rank embed for pagination
 */
function createStoreRankEmbed(user, powers, rank, page = 1, totalPages = 1) {
    
    const embed = new EmbedBuilder()
        .setColor(getRankColor(rank))
        .setTitle(`🏪 ${getRankEmoji(rank)} ${rank} Rank Powers`)
        .setDescription(`**${user.username}** • Level ${user.level} • **${(user.coins || 0).toLocaleString()}** coins\n\n**Available ${rank} Powers:**`);
    
    // Ensure powers is an array
    const powersArray = Array.isArray(powers) ? powers : [];
    
    if (powersArray.length === 0) {
        embed.setDescription(`**${user.username}** • Level ${user.level} • **${(user.coins || 0).toLocaleString()}** coins\n\n❌ No powers available in this rank.`);
        return embed;
    }
    
    let powersList = '';
    powersArray.forEach((power, index) => {
        const globalItemNum = ((page - 1) * 10) + index + 1; // Global item number for purchase
        
        // Ensure all values are defined before using them
        const price = calculatePowerPrice(power, user.level) || 0;
        const cp = getPowerCP(power) || 0;
        const powerName = power.name || 'Unknown Power';
        const powerDesc = power.description || 'No description available';
        const affordable = (user.coins || 0) >= price ? '✅' : '❌';
        
        powersList += `${affordable} **${globalItemNum}.** ${powerName} (${cp.toLocaleString()} CP)\n`;
        powersList += `   ${powerDesc}\n`;
        powersList += `   💰 **${price.toLocaleString()}** coins\n\n`;
    });
    
    if (powersList.length > 4000) {
        powersList = powersList.substring(0, 3900) + '\n...and more!';
    }
    
    // Ensure powersList is valid and doesn't exceed Discord limits
    let validPowersList = powersList && powersList.trim().length > 0 ? powersList : 'No powers available';
    
    // Discord field value limit is 1024 characters
    if (validPowersList.length > 1024) {
        validPowersList = validPowersList.substring(0, 1000) + '\n...and more!';
    }
    
    embed.addFields(
        {
            name: '⚡ Powers Available',
            value: validPowersList,
            inline: false
        },
        {
            name: '💡 How to Purchase',
            value: `Use \`ot buy <number> ${rank}\`\nExample: \`ot buy 1 ${rank}\``,
            inline: false
        }
    );
    
    if (totalPages > 1) {
        embed.setFooter({ text: `Page ${page}/${totalPages} • Use buttons to navigate • ✅ = Affordable` });
    } else {
        embed.setFooter({ text: `${powersArray.length} powers available • ✅ = Affordable` });
    }
    
    return embed;
}

function calculatePowerPrice(power, userLevel) {
    const basePrices = {
        'Normal': 100000,      // 100k coins
        'Rare': 500000,       // 500k coins  
        'Epic': 2000000,      // 2M coins
        'Legendary': 8000000, // 8M coins
        'Mythic': 25000000,   // 25M coins
        'Divine': 75000000,   // 75M coins
        'Cosmic': 200000000,  // 200M coins
        'Transcendent': 500000000,  // 500M coins
        'Omnipotent': 1500000000,   // 1.5B coins
        'Absolute': 5000000000      // 5B coins
    };
    
    const basePrice = basePrices[power.rank] || 100000;
    const levelMultiplier = Math.max(1, userLevel / 10); // Reduced level impact
    
    return Math.floor(basePrice * levelMultiplier);
}

module.exports = {
    createStoreRankEmbed
};