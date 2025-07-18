/**
 * Centralized Response Templates
 * Optimized for mobile and desktop viewing
 */

const responseTemplates = {
    // Character responses
    character: {
        notRegistered: '❌ Register first: `/register`',
        loading: '🔄 Loading profile...',
        equipped: (name, rank, cp) => `⚡ **${name}** (${rank} • ${cp} CP)`,
        noEquipped: '❌ No power equipped\n💡 Use `/otequip` to equip one',
        stats: (level, exp, coins, wins, losses) => 
            `**Lv.${level}** | **${exp}** EXP\n💰 **${coins.toLocaleString()}** | 🏆 **${wins}**W/${losses}L`
    },

    // Battle responses
    battle: {
        notRegistered: '❌ Register first: `/register`',
        noPower: '❌ Equip power first: `/otequip`',
        cooldown: (time) => `⏰ Wait **${time}** before fighting again`,
        victory: (enemy, exp, coins) => `🏆 **VICTORY!**\n⚔️ vs ${enemy}\n📈 +${exp} EXP | 💰 +${coins} coins`,
        defeat: (enemy) => `💀 **DEFEAT**\n⚔️ vs ${enemy}\n💪 Train harder!`,
        enemyNotFound: '❌ Enemy rank not found\n💡 Use: normal, rare, epic, legendary...'
    },

    // Power responses
    power: {
        equipped: (name, rank, cp) => `⚡ **Equipped!**\n**${name}** (${rank} • ${cp} CP)`,
        unequipped: (name) => `✅ **Unequipped!**\n**${name}** removed`,
        notFound: '❌ Power not found in inventory',
        alreadyEquipped: '⚠️ Already equipped!',
        noEquipped: '❌ No power equipped'
    },

    // Gacha responses
    gacha: {
        noDraws: '❌ No draws left\n💡 Buy more or wait for daily reset',
        newPower: (name, rank, cp) => `🎉 **${name}**\n${rank} • **${cp} CP**`,
        duplicate: (name, rank, cp) => `📦 **${name}**\n${rank} • **${cp} CP** (duplicate)`
    },

    // Store responses
    store: {
        purchased: (name, price) => `✅ **Purchased!**\n**${name}** for **${price.toLocaleString()}** coins`,
        notEnoughCoins: (need, have) => `❌ Need **${need.toLocaleString()}** coins\n💰 You have **${have.toLocaleString()}**`,
        itemNotFound: '❌ Item not found in store'
    },

    // Economy responses
    economy: {
        deposited: (amount, balance) => `✅ **Deposited ${amount.toLocaleString()}**\n🏦 Bank: **${balance.toLocaleString()}** coins`,
        withdrew: (amount, balance) => `✅ **Withdrew ${amount.toLocaleString()}**\n💰 Wallet: **${balance.toLocaleString()}** coins`,
        notEnoughCoins: (need, have) => `❌ Need **${need.toLocaleString()}**\n💰 Have **${have.toLocaleString()}**`
    },

    // Error responses
    error: {
        generic: '❌ Something went wrong\n💡 Try again later',
        database: '❌ Database error\n💡 Contact support',
        timeout: '❌ Request timed out\n💡 Try again',
        permission: '❌ No permission\n💡 Admin only'
    }
};

const embedDefaults = {
    color: '#ff4444',
    footer: 'AOT RPG',
    maxFieldLength: 1024,
    maxDescriptionLength: 4096,
    maxTitleLength: 256
};

module.exports = {
    responseTemplates,
    embedDefaults
};