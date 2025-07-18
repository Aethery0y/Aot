const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const logger = require('./logger');
const { pool } = require('../config/database');

/**
 * Enhanced Database Operations with Atomic Transactions and Bug Fixes
 */

// User Management Functions
async function getUserByDiscordId(discordId) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE discord_id = ?',
            [discordId]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        logger.error('Error getting user by Discord ID:', error);
        throw error;
    }
}

async function getUserByUsername(username) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        logger.error('Error getting user by username:', error);
        throw error;
    }
}

async function createUser(userData) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { username, password, discordId, creatorDiscordId } = userData;
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const [result] = await connection.execute(
            `INSERT INTO users (
                username, password, discord_id, creator_discord_id, 
                level, exp, coins, bank_balance, gacha_draws, 
                battles_won, battles_lost, bonus_cp, pity_counter,
                created_at
            ) VALUES (?, ?, ?, ?, 1, 0, 1000, 0, 10, 0, 0, 0, 0, NOW())`,
            [username, hashedPassword, discordId, creatorDiscordId]
        );
        
        await connection.commit();
        logger.info(`User created: ${username} (${discordId})`);
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        logger.error('Error creating user:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function loginUser(discordId, userId) {
    try {
        await pool.execute(
            'UPDATE users SET discord_id = ? WHERE id = ?',
            [discordId, userId]
        );
        logger.info(`User logged in: ${userId} -> ${discordId}`);
    } catch (error) {
        logger.error('Error logging in user:', error);
        throw error;
    }
}

async function logoutUser(discordId) {
    try {
        await pool.execute(
            'UPDATE users SET discord_id = NULL WHERE discord_id = ?',
            [discordId]
        );
        logger.info(`User logged out: ${discordId}`);
    } catch (error) {
        logger.error('Error logging out user:', error);
        throw error;
    }
}

async function changeUserPassword(userId, currentPassword, newPassword) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const [userRows] = await connection.execute(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const isValidPassword = await bcrypt.compare(currentPassword, userRows[0].password);
        if (!isValidPassword) {
            throw new Error('Current password is incorrect');
        }
        
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedNewPassword, userId]
        );
        
        await connection.commit();
        logger.info(`Password changed for user: ${userId}`);
        return true;
    } catch (error) {
        await connection.rollback();
        logger.error('Error changing password:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// FIXED: Atomic coin operations to prevent race conditions and incorrect balances
async function updateUserCoins(userId, amount) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get current balance with lock
        const [userRows] = await connection.execute(
            'SELECT coins FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const currentCoins = userRows[0].coins;
        const newBalance = currentCoins + amount;
        
        // Prevent negative balances
        if (newBalance < 0) {
            throw new Error(`Insufficient coins. Current: ${currentCoins}, Attempted change: ${amount}`);
        }
        
        // Update with exact amount
        await connection.execute(
            'UPDATE users SET coins = ? WHERE id = ?',
            [newBalance, userId]
        );
        
        await connection.commit();
        logger.info(`Coins updated for user ${userId}: ${currentCoins} -> ${newBalance} (change: ${amount})`);
        return newBalance;
    } catch (error) {
        await connection.rollback();
        logger.error('Error updating user coins:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// FIXED: Atomic bank operations to prevent money duplication/loss
async function updateUserBank(userId, amount) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get current balance with lock
        const [userRows] = await connection.execute(
            'SELECT bank_balance FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const currentBank = userRows[0].bank_balance;
        const newBalance = currentBank + amount;
        
        // Prevent negative bank balances
        if (newBalance < 0) {
            throw new Error(`Insufficient bank balance. Current: ${currentBank}, Attempted change: ${amount}`);
        }
        
        // Update with exact amount
        await connection.execute(
            'UPDATE users SET bank_balance = ? WHERE id = ?',
            [newBalance, userId]
        );
        
        await connection.commit();
        logger.info(`Bank updated for user ${userId}: ${currentBank} -> ${newBalance} (change: ${amount})`);
        return newBalance;
    } catch (error) {
        await connection.rollback();
        logger.error('Error updating user bank:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// FIXED: Atomic deposit operation to prevent money loss/duplication
async function depositCoins(userId, amount) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get current balances with lock
        const [userRows] = await connection.execute(
            'SELECT coins, bank_balance FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const currentCoins = userRows[0].coins;
        const currentBank = userRows[0].bank_balance;
        
        // Validate deposit amount
        if (amount <= 0) {
            throw new Error('Deposit amount must be positive');
        }
        
        if (currentCoins < amount) {
            throw new Error(`Insufficient wallet balance. Have: ${currentCoins}, Need: ${amount}`);
        }
        
        // Perform atomic transfer
        const newCoins = currentCoins - amount;
        const newBank = currentBank + amount;
        
        await connection.execute(
            'UPDATE users SET coins = ?, bank_balance = ? WHERE id = ?',
            [newCoins, newBank, userId]
        );
        
        await connection.commit();
        logger.info(`Deposit successful for user ${userId}: ${amount} coins (Wallet: ${currentCoins} -> ${newCoins}, Bank: ${currentBank} -> ${newBank})`);
        
        return {
            success: true,
            newWalletBalance: newCoins,
            newBankBalance: newBank,
            depositedAmount: amount
        };
    } catch (error) {
        await connection.rollback();
        logger.error('Error depositing coins:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// FIXED: Atomic withdrawal operation to prevent money loss/duplication
async function withdrawCoins(userId, amount) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get current balances with lock
        const [userRows] = await connection.execute(
            'SELECT coins, bank_balance FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const currentCoins = userRows[0].coins;
        const currentBank = userRows[0].bank_balance;
        
        // Validate withdrawal amount
        if (amount <= 0) {
            throw new Error('Withdrawal amount must be positive');
        }
        
        if (currentBank < amount) {
            throw new Error(`Insufficient bank balance. Have: ${currentBank}, Need: ${amount}`);
        }
        
        // Perform atomic transfer
        const newCoins = currentCoins + amount;
        const newBank = currentBank - amount;
        
        await connection.execute(
            'UPDATE users SET coins = ?, bank_balance = ? WHERE id = ?',
            [newCoins, newBank, userId]
        );
        
        await connection.commit();
        logger.info(`Withdrawal successful for user ${userId}: ${amount} coins (Wallet: ${currentCoins} -> ${newCoins}, Bank: ${currentBank} -> ${newBank})`);
        
        return {
            success: true,
            newWalletBalance: newCoins,
            newBankBalance: newBank,
            withdrawnAmount: amount
        };
    } catch (error) {
        await connection.rollback();
        logger.error('Error withdrawing coins:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// FIXED: Atomic gacha draw purchase to prevent draw loss/duplication
async function updateUserGachaDraws(userId, amount) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get current draws with lock
        const [userRows] = await connection.execute(
            'SELECT gacha_draws FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const currentDraws = userRows[0].gacha_draws;
        const newDraws = currentDraws + amount;
        
        // Prevent negative draws
        if (newDraws < 0) {
            throw new Error(`Insufficient gacha draws. Current: ${currentDraws}, Attempted change: ${amount}`);
        }
        
        // Update with exact amount
        await connection.execute(
            'UPDATE users SET gacha_draws = ? WHERE id = ?',
            [newDraws, userId]
        );
        
        await connection.commit();
        logger.info(`Gacha draws updated for user ${userId}: ${currentDraws} -> ${newDraws} (change: ${amount})`);
        return newDraws;
    } catch (error) {
        await connection.rollback();
        logger.error('Error updating gacha draws:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// FIXED: Atomic stats update to prevent inconsistencies
async function updateUserStats(userId, updates) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        
        for (const [field, value] of Object.entries(updates)) {
            updateFields.push(`${field} = ?`);
            updateValues.push(value);
        }
        
        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }
        
        updateValues.push(userId);
        
        await connection.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
        
        await connection.commit();
        logger.info(`Stats updated for user ${userId}:`, updates);
    } catch (error) {
        await connection.rollback();
        logger.error('Error updating user stats:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Power Management Functions
async function getUserPowers(userId) {
    try {
        const [rows] = await pool.execute(
            `SELECT up.*, p.name, p.description, p.rank, p.base_cp 
             FROM user_powers up 
             JOIN powers p ON up.power_id = p.id 
             WHERE up.user_id = ? 
             ORDER BY up.combat_power DESC`,
            [userId]
        );
        return rows;
    } catch (error) {
        logger.error('Error getting user powers:', error);
        throw error;
    }
}

async function addUserPower(userId, powerId, combatPower, rank = null) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get power details if rank not provided
        if (!rank) {
            const [powerRows] = await connection.execute(
                'SELECT rank FROM powers WHERE id = ?',
                [powerId]
            );
            
            if (powerRows.length === 0) {
                throw new Error('Power not found');
            }
            
            rank = powerRows[0].rank;
        }
        
        const [result] = await connection.execute(
            'INSERT INTO user_powers (user_id, power_id, combat_power, rank) VALUES (?, ?, ?, ?)',
            [userId, powerId, combatPower, rank]
        );
        
        await connection.commit();
        logger.info(`Power added to user ${userId}: Power ${powerId} with ${combatPower} CP`);
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        logger.error('Error adding user power:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function removePower(userPowerId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Check if power is equipped before removing
        const [equippedCheck] = await connection.execute(
            'SELECT id FROM users WHERE equipped_power_id = ?',
            [userPowerId]
        );
        
        if (equippedCheck.length > 0) {
            // Unequip the power first
            await connection.execute(
                'UPDATE users SET equipped_power_id = NULL WHERE equipped_power_id = ?',
                [userPowerId]
            );
        }
        
        // Remove the power
        await connection.execute(
            'DELETE FROM user_powers WHERE id = ?',
            [userPowerId]
        );
        
        await connection.commit();
        logger.info(`Power removed: ${userPowerId}`);
    } catch (error) {
        await connection.rollback();
        logger.error('Error removing power:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function equipPower(userId, userPowerId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Verify user owns the power
        const [powerCheck] = await connection.execute(
            'SELECT id FROM user_powers WHERE id = ? AND user_id = ?',
            [userPowerId, userId]
        );
        
        if (powerCheck.length === 0) {
            throw new Error('Power not found or not owned by user');
        }
        
        // Equip the power
        await connection.execute(
            'UPDATE users SET equipped_power_id = ? WHERE id = ?',
            [userPowerId, userId]
        );
        
        await connection.commit();
        logger.info(`Power equipped for user ${userId}: ${userPowerId}`);
    } catch (error) {
        await connection.rollback();
        logger.error('Error equipping power:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function unequipPower(userId) {
    try {
        await pool.execute(
            'UPDATE users SET equipped_power_id = NULL WHERE id = ?',
            [userId]
        );
        logger.info(`Power unequipped for user ${userId}`);
    } catch (error) {
        logger.error('Error unequipping power:', error);
        throw error;
    }
}

// Gacha System Functions
async function performGachaDraw(userId, drawType = 'free') {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get user data with lock
        const [userRows] = await connection.execute(
            'SELECT gacha_draws, pity_counter FROM users WHERE id = ? FOR UPDATE',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const user = userRows[0];
        
        if (user.gacha_draws <= 0) {
            throw new Error('No gacha draws available');
        }
        
        // Deduct draw
        await connection.execute(
            'UPDATE users SET gacha_draws = gacha_draws - 1 WHERE id = ?',
            [userId]
        );
        
        // Perform draw logic
        const drawResult = await performDrawLogic(connection, userId, user.pity_counter);
        
        await connection.commit();
        return {
            success: true,
            power: drawResult.power,
            powerCP: drawResult.powerCP,
            remainingDraws: user.gacha_draws - 1,
            pityCounter: drawResult.pityCounter
        };
    } catch (error) {
        await connection.rollback();
        logger.error('Error performing gacha draw:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function performDrawLogic(connection, userId, currentPityCounter) {
    const newPityCounter = currentPityCounter + 1;
    
    // Get all available powers
    const [powers] = await connection.execute(
        'SELECT * FROM powers WHERE rank IN (?, ?, ?, ?, ?) ORDER BY base_cp ASC',
        ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic']
    );
    
    let selectedRank = 'Normal';
    
    // Pity system - guaranteed Mythic at 100 pulls
    if (newPityCounter >= 100) {
        selectedRank = 'Mythic';
    } else {
        // Normal gacha rates
        const rates = {
            'Normal': 70.0,
            'Rare': 20.0,
            'Epic': 7.0,
            'Legendary': 2.5,
            'Mythic': 0.5
        };
        
        const roll = Math.random() * 100;
        let cumulativeRate = 0;
        
        for (const [rank, rate] of Object.entries(rates)) {
            cumulativeRate += rate;
            if (roll <= cumulativeRate) {
                selectedRank = rank;
                break;
            }
        }
    }
    
    // Get powers of selected rank
    const rankPowers = powers.filter(p => p.rank === selectedRank);
    if (rankPowers.length === 0) {
        throw new Error(`No powers available for rank: ${selectedRank}`);
    }
    
    const selectedPower = rankPowers[Math.floor(Math.random() * rankPowers.length)];
    
    // Calculate CP with variation
    const baseCP = selectedPower.base_cp;
    const variation = 0.1; // ±10%
    const randomMultiplier = 1 + (Math.random() - 0.5) * 2 * variation;
    const powerCP = Math.max(1, Math.round(baseCP * randomMultiplier));
    
    // Reset pity counter if Mythic was drawn
    const finalPityCounter = (selectedRank === 'Mythic') ? 0 : newPityCounter;
    
    // Update pity counter
    await connection.execute(
        'UPDATE users SET pity_counter = ? WHERE id = ?',
        [finalPityCounter, userId]
    );
    
    // Add power to user
    await connection.execute(
        'INSERT INTO user_powers (user_id, power_id, combat_power, rank) VALUES (?, ?, ?, ?)',
        [userId, selectedPower.id, powerCP, selectedPower.rank]
    );
    
    // Record draw history
    await connection.execute(
        'INSERT INTO gacha_history (user_id, power_id, power_name, power_rank, combat_power, draw_type, drawn_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [userId, selectedPower.id, selectedPower.name, selectedPower.rank, powerCP, 'free']
    );
    
    return {
        power: selectedPower,
        powerCP: powerCP,
        pityCounter: finalPityCounter
    };
}

async function getGachaHistory(userId, limit = 10) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM gacha_history WHERE user_id = ? ORDER BY drawn_at DESC LIMIT ?',
            [userId, limit]
        );
        return rows;
    } catch (error) {
        logger.error('Error getting gacha history:', error);
        throw error;
    }
}

// Arena and Rankings Functions
async function getArenaRankings(limit = 100) {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                ar.rank_position,
                ar.total_cp,
                u.username,
                u.level,
                u.battles_won,
                u.battles_lost,
                COALESCE(up.combat_power, 0) as equipped_power_cp
             FROM arena_rankings ar
             JOIN users u ON ar.user_id = u.id
             LEFT JOIN user_powers up ON u.equipped_power_id = up.id
             ORDER BY ar.rank_position ASC
             LIMIT ?`,
            [limit]
        );
        return rows;
    } catch (error) {
        logger.error('Error getting arena rankings:', error);
        throw error;
    }
}

async function getUserArenaRank(userId) {
    try {
        const [rows] = await pool.execute(
            'SELECT rank_position FROM arena_rankings WHERE user_id = ?',
            [userId]
        );
        return rows.length > 0 ? rows[0].rank_position : null;
    } catch (error) {
        logger.error('Error getting user arena rank:', error);
        throw error;
    }
}

async function getUserByArenaRank(rank) {
    try {
        const [rows] = await pool.execute(
            `SELECT u.*, ar.total_cp
             FROM users u
             JOIN arena_rankings ar ON u.id = ar.user_id
             WHERE ar.rank_position = ?`,
            [rank]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        logger.error('Error getting user by arena rank:', error);
        throw error;
    }
}

async function updateArenaRanking(winnerId, loserId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Get current rankings
        const [winnerRank] = await connection.execute(
            'SELECT rank_position FROM arena_rankings WHERE user_id = ?',
            [winnerId]
        );
        
        const [loserRank] = await connection.execute(
            'SELECT rank_position FROM arena_rankings WHERE user_id = ?',
            [loserId]
        );
        
        // If winner has lower rank (higher number), swap positions
        if (winnerRank.length > 0 && loserRank.length > 0) {
            const winnerPos = winnerRank[0].rank_position;
            const loserPos = loserRank[0].rank_position;
            
            if (winnerPos > loserPos) {
                // Swap rankings
                await connection.execute(
                    'UPDATE arena_rankings SET rank_position = ? WHERE user_id = ?',
                    [loserPos, winnerId]
                );
                
                await connection.execute(
                    'UPDATE arena_rankings SET rank_position = ? WHERE user_id = ?',
                    [winnerPos, loserId]
                );
            }
        }
        
        await connection.commit();
        logger.info(`Arena rankings updated: Winner ${winnerId}, Loser ${loserId}`);
    } catch (error) {
        await connection.rollback();
        logger.error('Error updating arena ranking:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Cooldown Management Functions
async function checkCooldown(userId, commandName, cooldownSeconds, setCooldown = false) {
    const connection = await pool.getConnection();
    try {
        const now = new Date();
        
        // Check existing cooldown
        const [rows] = await connection.execute(
            'SELECT expires_at FROM command_cooldowns WHERE user_id = ? AND command_name = ?',
            [userId, commandName]
        );
        
        if (rows.length > 0) {
            const expiresAt = new Date(rows[0].expires_at);
            if (now < expiresAt) {
                const timeLeft = expiresAt.getTime() - now.getTime();
                return {
                    onCooldown: true,
                    timeLeft: timeLeft,
                    canUse: false
                };
            }
        }
        
        // Set cooldown if requested
        if (setCooldown) {
            const expiresAt = new Date(now.getTime() + (cooldownSeconds * 1000));
            
            await connection.execute(
                `INSERT INTO command_cooldowns (user_id, command_name, expires_at) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
                [userId, commandName, expiresAt]
            );
        }
        
        return {
            onCooldown: false,
            timeLeft: 0,
            canUse: true
        };
    } catch (error) {
        logger.error('Error checking cooldown:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function setCooldownAfterSuccess(userId, commandName, cooldownSeconds) {
    try {
        const expiresAt = new Date(Date.now() + (cooldownSeconds * 1000));
        
        await pool.execute(
            `INSERT INTO command_cooldowns (user_id, command_name, expires_at) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)`,
            [userId, commandName, expiresAt]
        );
        
        logger.debug(`Cooldown set for ${userId}:${commandName} - ${cooldownSeconds}s`);
    } catch (error) {
        logger.error('Error setting cooldown:', error);
        throw error;
    }
}

// Power and Store Functions
async function getAllPowers() {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM powers ORDER BY rank, base_cp ASC'
        );
        return rows;
    } catch (error) {
        logger.error('Error getting all powers:', error);
        throw error;
    }
}

async function updateUserPowerCP(userPowerId, newCP) {
    try {
        await pool.execute(
            'UPDATE user_powers SET combat_power = ? WHERE id = ?',
            [newCP, userPowerId]
        );
        logger.info(`User power CP updated: ${userPowerId} -> ${newCP}`);
    } catch (error) {
        logger.error('Error updating user power CP:', error);
        throw error;
    }
}

// Database Initialization
async function initializeDatabase() {
    const connection = await pool.getConnection();
    try {
        logger.info('Initializing database tables...');
        
        // Users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(32) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                discord_id VARCHAR(20) UNIQUE,
                creator_discord_id VARCHAR(20) NOT NULL,
                level INT DEFAULT 1,
                exp INT DEFAULT 0,
                coins BIGINT DEFAULT 1000,
                bank_balance BIGINT DEFAULT 0,
                gacha_draws INT DEFAULT 10,
                battles_won INT DEFAULT 0,
                battles_lost INT DEFAULT 0,
                bonus_cp INT DEFAULT 0,
                equipped_power_id INT NULL,
                pity_counter INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_discord_id (discord_id),
                INDEX idx_username (username),
                INDEX idx_equipped_power (equipped_power_id)
            )
        `);
        
        // Powers table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS powers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute') NOT NULL,
                base_cp INT NOT NULL,
                base_price INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_rank (rank),
                INDEX idx_base_cp (base_cp)
            )
        `);
        
        // User powers table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_powers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                power_id INT NOT NULL,
                combat_power INT NOT NULL,
                rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute'),
                acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (power_id) REFERENCES powers(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_power_id (power_id),
                INDEX idx_combat_power (combat_power)
            )
        `);
        
        // Command cooldowns table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS command_cooldowns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                command_name VARCHAR(50) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_command (user_id, command_name),
                INDEX idx_expires_at (expires_at)
            )
        `);
        
        // Arena rankings table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS arena_rankings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                rank_position INT NOT NULL UNIQUE,
                total_cp INT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_rank_position (rank_position),
                INDEX idx_total_cp (total_cp)
            )
        `);
        
        // Gacha history table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS gacha_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                power_id INT NOT NULL,
                power_name VARCHAR(100) NOT NULL,
                power_rank VARCHAR(20) NOT NULL,
                combat_power INT NOT NULL,
                draw_type ENUM('free', 'paid') DEFAULT 'free',
                drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_drawn_at (drawn_at)
            )
        `);
        
        // Redeem codes table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS redeem_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(11) NOT NULL UNIQUE,
                description TEXT,
                rewards JSON NOT NULL,
                max_uses INT NULL,
                used_count INT DEFAULT 0,
                expires_at DATETIME NULL,
                created_by VARCHAR(100) NOT NULL,
                created_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                INDEX idx_code (code),
                INDEX idx_active (is_active)
            )
        `);
        
        // Code usage table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS code_usage (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code_id INT NOT NULL,
                user_id INT NOT NULL,
                redeemed_at DATETIME NOT NULL,
                FOREIGN KEY (code_id) REFERENCES redeem_codes(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_usage (code_id, user_id),
                INDEX idx_code_user (code_id, user_id)
            )
        `);
        
        logger.info('Database tables initialized successfully');
    } catch (error) {
        logger.error('Error initializing database:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    // User functions
    getUserByDiscordId,
    getUserByUsername,
    createUser,
    loginUser,
    logoutUser,
    changeUserPassword,
    
    // Coin functions (FIXED)
    updateUserCoins,
    updateUserBank,
    depositCoins,
    withdrawCoins,
    updateUserGachaDraws,
    updateUserStats,
    
    // Power functions
    getUserPowers,
    addUserPower,
    removePower,
    equipPower,
    unequipPower,
    getAllPowers,
    updateUserPowerCP,
    
    // Gacha functions
    performGachaDraw,
    getGachaHistory,
    
    // Arena functions
    getArenaRankings,
    getUserArenaRank,
    getUserByArenaRank,
    updateArenaRanking,
    
    // Cooldown functions
    checkCooldown,
    setCooldownAfterSuccess,
    
    // Database initialization
    initializeDatabase
};