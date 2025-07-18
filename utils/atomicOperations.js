const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * Atomic Operations Manager
 * Handles database transactions with proper locking and concurrency control
 */

class AtomicOperations {
    constructor() {
        this.lockManager = new Map();
        this.transactionQueue = new Map();
        this.maxRetries = 3;
        this.lockTimeout = 30000; // 30 seconds
    }

    /**
     * Execute atomic transaction with proper locking
     * @param {Function} operation - Operation to execute
     * @param {string} lockKey - Unique key for locking
     * @param {object} options - Transaction options
     * @returns {Promise<any>} Operation result
     */
    async executeWithLock(operation, lockKey, options = {}) {
        const { timeout = this.lockTimeout, retries = this.maxRetries } = options;
        
        let attempt = 0;
        while (attempt < retries) {
            try {
                // Acquire lock
                await this.acquireLock(lockKey, timeout);
                
                // Execute operation in transaction
                const result = await this.executeTransaction(operation);
                
                // Release lock
                this.releaseLock(lockKey);
                
                return result;
            } catch (error) {
                this.releaseLock(lockKey);
                attempt++;
                
                if (attempt >= retries) {
                    logger.error(`Atomic operation failed after ${retries} attempts`, {
                        lockKey,
                        error: error.message,
                        stack: error.stack
                    });
                    throw error;
                }
                
                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 100);
            }
        }
    }

    /**
     * Execute database transaction with rollback on failure
     * @param {Function} operation - Operation to execute
     * @returns {Promise<any>} Operation result
     */
    async executeTransaction(operation) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const result = await operation(connection);
            
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Acquire distributed lock
     * @param {string} lockKey - Lock key
     * @param {number} timeout - Lock timeout
     */
    async acquireLock(lockKey, timeout) {
        const lockId = `${Date.now()}_${Math.random()}`;
        const expiry = Date.now() + timeout;
        
        // Try to acquire lock with database-level locking
        const connection = await pool.getConnection();
        
        try {
            // Use database advisory lock
            const [result] = await connection.execute(
                'SELECT GET_LOCK(?, ?) as acquired',
                [lockKey, Math.ceil(timeout / 1000)]
            );
            
            if (result[0].acquired !== 1) {
                throw new Error(`Failed to acquire lock for ${lockKey}`);
            }
            
            // Store lock info
            this.lockManager.set(lockKey, {
                id: lockId,
                expiry,
                connection
            });
            
            logger.debug(`Lock acquired: ${lockKey}`, { lockId, timeout });
        } catch (error) {
            connection.release();
            throw error;
        }
    }

    /**
     * Release distributed lock
     * @param {string} lockKey - Lock key
     */
    releaseLock(lockKey) {
        const lockInfo = this.lockManager.get(lockKey);
        
        if (lockInfo) {
            try {
                // Release database advisory lock
                lockInfo.connection.execute('SELECT RELEASE_LOCK(?)', [lockKey]);
                lockInfo.connection.release();
            } catch (error) {
                logger.warn(`Error releasing lock ${lockKey}:`, error.message);
            }
            
            this.lockManager.delete(lockKey);
            logger.debug(`Lock released: ${lockKey}`);
        }
    }

    /**
     * Atomic redeem code operation
     * @param {string} code - Redeem code
     * @param {string} userId - User ID
     * @returns {Promise<object>} Redeem result
     */
    async atomicRedeemCode(code, userId) {
        const lockKey = `redeem_${code}`;
        
        return this.executeWithLock(async (connection) => {
            // Check if code exists and is valid
            const [codeRows] = await connection.execute(
                'SELECT * FROM redeem_codes WHERE code = ? FOR UPDATE',
                [code]
            );
            
            if (codeRows.length === 0) {
                throw new Error('Invalid redeem code');
            }
            
            const redeemCode = codeRows[0];
            
            // Check if code is still active
            if (redeemCode.is_active === 0) {
                throw new Error('Redeem code has been deactivated');
            }
            
            // Check expiry
            if (redeemCode.expires_at && new Date(redeemCode.expires_at) < new Date()) {
                throw new Error('Redeem code has expired');
            }
            
            // Check usage limit
            if (redeemCode.max_uses && redeemCode.used_count >= redeemCode.max_uses) {
                throw new Error('Redeem code has reached maximum usage limit');
            }
            
            // Check if user already used this code
            const [usageRows] = await connection.execute(
                'SELECT * FROM code_usage WHERE code_id = ? AND user_id = ?',
                [redeemCode.id, userId]
            );
            
            if (usageRows.length > 0) {
                throw new Error('You have already used this redeem code');
            }
            
            // Apply rewards atomically
            const rewards = JSON.parse(redeemCode.rewards);
            const rewardResults = [];
            
            for (const reward of rewards) {
                switch (reward.type) {
                    case 'coins':
                        await connection.execute(
                            'UPDATE users SET coins = coins + ? WHERE id = ?',
                            [reward.amount, userId]
                        );
                        rewardResults.push({ type: 'coins', amount: reward.amount });
                        break;
                        
                    case 'gacha_draws':
                        await connection.execute(
                            'UPDATE users SET gacha_draws = gacha_draws + ? WHERE id = ?',
                            [reward.amount, userId]
                        );
                        rewardResults.push({ type: 'gacha_draws', amount: reward.amount });
                        break;
                        
                    case 'power':
                        // Add power to user
                        const [powerRows] = await connection.execute(
                            'SELECT * FROM powers WHERE id = ?',
                            [reward.power_id]
                        );
                        
                        if (powerRows.length > 0) {
                            const power = powerRows[0];
                            const cp = reward.cp || power.base_cp;
                            
                            // Calculate correct rank for the combat power
                            const { determineRankByCP } = require('./databaseHelpers');
                            const correctRank = await determineRankByCP(cp);
                            
                            await connection.execute(
                                'INSERT INTO user_powers (user_id, power_id, combat_power, rank) VALUES (?, ?, ?, ?)',
                                [userId, reward.power_id, cp, correctRank]
                            );
                            rewardResults.push({ type: 'power', power: power.name, cp });
                        }
                        break;
                }
            }
            
            // Record usage
            await connection.execute(
                'INSERT INTO code_usage (code_id, user_id, redeemed_at) VALUES (?, ?, NOW())',
                [redeemCode.id, userId]
            );
            
            // Update usage count
            await connection.execute(
                'UPDATE redeem_codes SET used_count = used_count + 1 WHERE id = ?',
                [redeemCode.id]
            );
            
            // Deactivate code if max uses reached
            if (redeemCode.max_uses && redeemCode.used_count + 1 >= redeemCode.max_uses) {
                await connection.execute(
                    'UPDATE redeem_codes SET is_active = 0 WHERE id = ?',
                    [redeemCode.id]
                );
            }
            
            return {
                success: true,
                rewards: rewardResults,
                code: redeemCode.code,
                description: redeemCode.description
            };
        }, lockKey);
    }

    /**
     * Atomic gacha draw operation
     * @param {string} userId - User ID
     * @param {string} drawType - Draw type
     * @returns {Promise<object>} Draw result
     */
    async atomicGachaDraw(userId, drawType = 'free') {
        const lockKey = `gacha_${userId}`;
        
        return this.executeWithLock(async (connection) => {
            // Get user with lock
            const [userRows] = await connection.execute(
                'SELECT * FROM users WHERE id = ? FOR UPDATE',
                [userId]
            );
            
            if (userRows.length === 0) {
                throw new Error('User not found');
            }
            
            const user = userRows[0];
            
            // Check if user has draws available
            if (user.gacha_draws <= 0) {
                return {
                    success: false,
                    error: 'No gacha draws available',
                    remainingDraws: 0
                };
            }
            
            // Deduct draw
            await connection.execute(
                'UPDATE users SET gacha_draws = gacha_draws - 1 WHERE id = ?',
                [userId]
            );
            
            // Perform draw logic
            const drawResult = await this.performGachaDrawLogic(connection, userId);
            
            // Record draw history
            await connection.execute(
                'INSERT INTO gacha_history (user_id, power_id, power_name, power_rank, combat_power, draw_type, drawn_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [userId, drawResult.power.id, drawResult.power.name, drawResult.power.rank, drawResult.powerCP, drawType]
            );
            
            return {
                success: true,
                power: drawResult.power,
                powerCP: drawResult.powerCP,
                rank: drawResult.rank,
                remainingDraws: user.gacha_draws - 1,
                pityCounter: drawResult.pityCounter,
                isPityTriggered: drawResult.isPityTriggered
            };
        }, lockKey);
    }

    /**
     * Atomic coin transfer operation
     * @param {string} fromUserId - Sender user ID
     * @param {string} toUserId - Receiver user ID
     * @param {number} amount - Transfer amount
     * @returns {Promise<object>} Transfer result
     */
    async atomicCoinTransfer(fromUserId, toUserId, amount) {
        const lockKey = `transfer_${Math.min(fromUserId, toUserId)}_${Math.max(fromUserId, toUserId)}`;
        
        return this.executeWithLock(async (connection) => {
            // Get both users with locks (ordered to prevent deadlocks)
            const userIds = [fromUserId, toUserId].sort();
            
            const [fromUserRows] = await connection.execute(
                'SELECT * FROM users WHERE id = ? FOR UPDATE',
                [fromUserId]
            );
            
            const [toUserRows] = await connection.execute(
                'SELECT * FROM users WHERE id = ? FOR UPDATE',
                [toUserId]
            );
            
            if (fromUserRows.length === 0 || toUserRows.length === 0) {
                throw new Error('One or both users not found');
            }
            
            const fromUser = fromUserRows[0];
            const toUser = toUserRows[0];
            
            // Check if sender has enough coins
            if (fromUser.coins < amount) {
                throw new Error('Insufficient coins');
            }
            
            // Perform transfer
            await connection.execute(
                'UPDATE users SET coins = coins - ? WHERE id = ?',
                [amount, fromUserId]
            );
            
            await connection.execute(
                'UPDATE users SET coins = coins + ? WHERE id = ?',
                [amount, toUserId]
            );
            
            // Record transaction
            await connection.execute(
                'INSERT INTO transactions (from_user_id, to_user_id, amount, transaction_type, created_at) VALUES (?, ?, ?, ?, NOW())',
                [fromUserId, toUserId, amount, 'coin_transfer']
            );
            
            return {
                success: true,
                fromUser: fromUser.username,
                toUser: toUser.username,
                amount,
                fromBalance: fromUser.coins - amount,
                toBalance: toUser.coins + amount
            };
        }, lockKey);
    }

    /**
     * Atomic power equipment operation
     * @param {string} userId - User ID
     * @param {string} userPowerId - User power ID
     * @returns {Promise<object>} Equipment result
     */
    async atomicEquipPower(userId, userPowerId) {
        const lockKey = `equip_${userId}`;
        
        return this.executeWithLock(async (connection) => {
            // Get user with lock
            const [userRows] = await connection.execute(
                'SELECT * FROM users WHERE id = ? FOR UPDATE',
                [userId]
            );
            
            if (userRows.length === 0) {
                throw new Error('User not found');
            }
            
            // Verify user owns the power
            const [powerRows] = await connection.execute(
                'SELECT up.*, p.name, p.description, p.rank FROM user_powers up JOIN powers p ON up.power_id = p.id WHERE up.id = ? AND up.user_id = ?',
                [userPowerId, userId]
            );
            
            if (powerRows.length === 0) {
                throw new Error('Power not found or not owned by user');
            }
            
            const power = powerRows[0];
            
            // Unequip current power if any
            await connection.execute(
                'UPDATE users SET equipped_power_id = NULL WHERE id = ?',
                [userId]
            );
            
            // Equip new power
            await connection.execute(
                'UPDATE users SET equipped_power_id = ? WHERE id = ?',
                [userPowerId, userId]
            );
            
            // Update arena rankings
            await this.updateArenaRankings(connection, userId);
            
            return {
                success: true,
                power: {
                    id: power.id,
                    name: power.name,
                    description: power.description,
                    rank: power.rank,
                    combatPower: power.combat_power
                }
            };
        }, lockKey);
    }

    /**
     * Atomic battle operation
     * @param {string} userId - User ID
     * @param {object} enemy - Enemy data
     * @returns {Promise<object>} Battle result
     */
    async atomicBattle(userId, enemy) {
        const lockKey = `battle_${userId}`;
        
        return this.executeWithLock(async (connection) => {
            // Get user with equipped power
            const [userRows] = await connection.execute(
                `SELECT u.*, up.combat_power as equipped_cp, p.name as power_name, p.rank as power_rank
                 FROM users u
                 LEFT JOIN user_powers up ON u.equipped_power_id = up.id
                 LEFT JOIN powers p ON up.power_id = p.id
                 WHERE u.id = ? FOR UPDATE`,
                [userId]
            );
            
            if (userRows.length === 0) {
                throw new Error('User not found');
            }
            
            const user = userRows[0];
            const userCP = user.equipped_cp || 0;
            
            // Battle logic
            const battleResult = this.calculateBattleResult(userCP, enemy.combat_power);
            
            if (battleResult.victory) {
                // Award coins only (exp and level system removed)
                const coinGain = Math.floor(enemy.combat_power * 0.05) + Math.floor(Math.random() * 20) + 20;
                
                await connection.execute(
                    'UPDATE users SET coins = coins + ?, battles_won = battles_won + 1 WHERE id = ?',
                    [coinGain, userId]
                );
                
                return {
                    victory: true,
                    enemy: enemy.name,
                    coinGain,
                    battleDetails: battleResult
                };
            } else {
                // Update loss count
                await connection.execute(
                    'UPDATE users SET battles_lost = battles_lost + 1 WHERE id = ?',
                    [userId]
                );
                
                return {
                    victory: false,
                    enemy: enemy.name,
                    battleDetails: battleResult
                };
            }
        }, lockKey);
    }

    /**
     * Calculate battle result
     * @param {number} userCP - User combat power
     * @param {number} enemyCP - Enemy combat power
     * @returns {object} Battle result
     */
    calculateBattleResult(userCP, enemyCP) {
        const userRoll = Math.random() * userCP;
        const enemyRoll = Math.random() * enemyCP;
        
        return {
            victory: userRoll > enemyRoll,
            userRoll: Math.floor(userRoll),
            enemyRoll: Math.floor(enemyRoll),
            userCP,
            enemyCP
        };
    }

    // Level calculation function removed

    /**
     * Update arena rankings
     * @param {object} connection - Database connection
     * @param {string} userId - User ID
     */
    async updateArenaRankings(connection, userId) {
        const [userCP] = await connection.execute(`
            SELECT 
                COALESCE(up.combat_power, 0) + COALESCE(u.bonus_cp, 0) as total_cp
            FROM users u
            LEFT JOIN user_powers up ON u.equipped_power_id = up.id
            WHERE u.id = ?
        `, [userId]);
        
        if (userCP.length > 0) {
            await connection.execute(
                'INSERT INTO arena_rankings (user_id, total_cp, rank_position) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE total_cp = ?',
                [userId, userCP[0].total_cp, userCP[0].total_cp]
            );
        }
    }

    /**
     * Perform gacha draw logic
     * @param {object} connection - Database connection
     * @param {string} userId - User ID
     * @returns {object} Draw result
     */
    async performGachaDrawLogic(connection, userId) {
        // Get user's current pity counter
        const [userRows] = await connection.execute(
            'SELECT pity_counter FROM users WHERE id = ?',
            [userId]
        );
        
        if (userRows.length === 0) {
            throw new Error('User not found');
        }
        
        const currentPityCounter = userRows[0].pity_counter;
        const newPityCounter = currentPityCounter + 1;
        
        // Get all powers
        const [powers] = await connection.execute(
            'SELECT * FROM powers ORDER BY base_cp ASC'
        );
        
        let selectedRank = 'Normal';
        let isPityTriggered = false;
        
        // Check if pity system triggers (100th pull gets guaranteed mythic)
        if (newPityCounter >= 100) {
            selectedRank = 'Mythic';
            isPityTriggered = true;
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
        
        // Get random power of selected rank (only include powers up to Mythic rank)
        const gachaEligiblePowers = powers.filter(p => 
            p.rank === selectedRank && 
            ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic'].includes(p.rank)
        );
        
        if (gachaEligiblePowers.length === 0) {
            throw new Error(`No powers available for rank: ${selectedRank}`);
        }
        
        const selectedPower = gachaEligiblePowers[Math.floor(Math.random() * gachaEligiblePowers.length)];
        
        // Calculate CP variation (±30%) based on the power's base_cp
        const baseCP = selectedPower.base_cp;
        const variation = 0.3;
        const minCP = Math.floor(baseCP * (1 - variation));
        const maxCP = Math.floor(baseCP * (1 + variation));
        const finalCP = Math.floor(Math.random() * (maxCP - minCP + 1)) + minCP;
        
        // Update pity counter - reset to 0 if mythic was pulled, otherwise increment
        const updatedPityCounter = (selectedRank === 'Mythic') ? 0 : newPityCounter;
        await connection.execute(
            'UPDATE users SET pity_counter = ? WHERE id = ?',
            [updatedPityCounter, userId]
        );
        
        // Add power to user - use the power's existing rank and details from database
        await connection.execute(
            'INSERT INTO user_powers (user_id, power_id, combat_power) VALUES (?, ?, ?)',
            [userId, selectedPower.id, finalCP]
        );
        
        return {
            power: selectedPower, // Use the power directly from database with all its details
            powerCP: finalCP,
            rank: selectedPower.rank, // Use the rank from database
            pityCounter: updatedPityCounter,
            isPityTriggered: isPityTriggered
        };
    }

    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup expired locks
     */
    cleanupExpiredLocks() {
        const now = Date.now();
        
        for (const [lockKey, lockInfo] of this.lockManager.entries()) {
            if (now > lockInfo.expiry) {
                this.releaseLock(lockKey);
                logger.warn(`Cleaned up expired lock: ${lockKey}`);
            }
        }
    }

    /**
     * Get system statistics
     * @returns {object} System statistics
     */
    getSystemStats() {
        return {
            activeLocks: this.lockManager.size,
            queuedTransactions: this.transactionQueue.size,
            timestamp: new Date().toISOString()
        };
    }
}

// Create singleton instance
const atomicOperations = new AtomicOperations();

// Cleanup expired locks every 5 minutes
setInterval(() => {
    atomicOperations.cleanupExpiredLocks();
}, 300000);

module.exports = atomicOperations;