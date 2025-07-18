const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * Transaction Manager for Atomic Operations
 * Prevents race conditions and ensures data consistency
 */

class TransactionManager {
    constructor() {
        this.activeLocks = new Map();
        this.lockTimeout = 30000; // 30 seconds
    }

    /**
     * Execute operation with distributed lock
     */
    async executeWithLock(lockKey, operation, timeout = this.lockTimeout) {
        const lockId = `${Date.now()}_${Math.random()}`;
        
        try {
            // Acquire lock
            await this.acquireLock(lockKey, lockId, timeout);
            
            // Execute operation
            const result = await operation();
            
            return result;
        } finally {
            // Always release lock
            await this.releaseLock(lockKey, lockId);
        }
    }

    /**
     * Acquire distributed lock using database
     */
    async acquireLock(lockKey, lockId, timeout) {
        const connection = await pool.getConnection();
        
        try {
            const timeoutSeconds = Math.ceil(timeout / 1000);
            const [result] = await connection.execute(
                'SELECT GET_LOCK(?, ?) as acquired',
                [lockKey, timeoutSeconds]
            );
            
            if (result[0].acquired !== 1) {
                throw new Error(`Failed to acquire lock: ${lockKey}`);
            }
            
            this.activeLocks.set(lockKey, { lockId, connection, acquired: Date.now() });
            logger.debug(`Lock acquired: ${lockKey}`);
        } catch (error) {
            connection.release();
            throw error;
        }
    }

    /**
     * Release distributed lock
     */
    async releaseLock(lockKey, lockId) {
        const lockInfo = this.activeLocks.get(lockKey);
        
        if (lockInfo && lockInfo.lockId === lockId) {
            try {
                await lockInfo.connection.execute('SELECT RELEASE_LOCK(?)', [lockKey]);
                lockInfo.connection.release();
                this.activeLocks.delete(lockKey);
                logger.debug(`Lock released: ${lockKey}`);
            } catch (error) {
                logger.warn(`Error releasing lock ${lockKey}:`, error);
            }
        }
    }

    /**
     * Execute atomic coin transfer
     */
    async atomicCoinTransfer(fromUserId, toUserId, amount, description = 'transfer') {
        const lockKey = `coin_transfer_${Math.min(fromUserId, toUserId)}_${Math.max(fromUserId, toUserId)}`;
        
        return this.executeWithLock(lockKey, async () => {
            const connection = await pool.getConnection();
            
            try {
                await connection.beginTransaction();
                
                // Get both users with locks
                const [fromUserRows] = await connection.execute(
                    'SELECT coins FROM users WHERE id = ? FOR UPDATE',
                    [fromUserId]
                );
                
                const [toUserRows] = await connection.execute(
                    'SELECT coins FROM users WHERE id = ? FOR UPDATE',
                    [toUserId]
                );
                
                if (fromUserRows.length === 0 || toUserRows.length === 0) {
                    throw new Error('One or both users not found');
                }
                
                const fromUser = fromUserRows[0];
                const toUser = toUserRows[0];
                
                if (fromUser.coins < amount) {
                    throw new Error(`Insufficient coins. Have: ${fromUser.coins}, Need: ${amount}`);
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
                
                await connection.commit();
                
                logger.info(`Atomic coin transfer: ${fromUserId} -> ${toUserId}, Amount: ${amount}`);
                
                return {
                    success: true,
                    fromBalance: fromUser.coins - amount,
                    toBalance: toUser.coins + amount
                };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        });
    }

    /**
     * Execute atomic gambling operation
     */
    async atomicGambling(userId, betAmount, winAmount, gameType) {
        const lockKey = `gambling_${userId}`;
        
        return this.executeWithLock(lockKey, async () => {
            const connection = await pool.getConnection();
            
            try {
                await connection.beginTransaction();
                
                // Get user with lock
                const [userRows] = await connection.execute(
                    'SELECT coins FROM users WHERE id = ? FOR UPDATE',
                    [userId]
                );
                
                if (userRows.length === 0) {
                    throw new Error('User not found');
                }
                
                const user = userRows[0];
                
                if (user.coins < betAmount) {
                    throw new Error(`Insufficient coins for ${gameType}. Have: ${user.coins}, Need: ${betAmount}`);
                }
                
                // Calculate net change
                const netChange = winAmount - betAmount;
                const newBalance = user.coins + netChange;
                
                if (newBalance < 0) {
                    throw new Error('Operation would result in negative balance');
                }
                
                // Update balance
                await connection.execute(
                    'UPDATE users SET coins = ? WHERE id = ?',
                    [newBalance, userId]
                );
                
                await connection.commit();
                
                logger.info(`Atomic gambling: ${userId}, Game: ${gameType}, Bet: ${betAmount}, Win: ${winAmount}, Net: ${netChange}, New Balance: ${newBalance}`);
                
                return {
                    success: true,
                    newBalance,
                    netChange,
                    won: winAmount > betAmount
                };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        });
    }

    /**
     * Clean up expired locks
     */
    cleanupExpiredLocks() {
        const now = Date.now();
        
        for (const [lockKey, lockInfo] of this.activeLocks.entries()) {
            if (now - lockInfo.acquired > this.lockTimeout) {
                this.releaseLock(lockKey, lockInfo.lockId);
                logger.warn(`Cleaned up expired lock: ${lockKey}`);
            }
        }
    }
}

// Create singleton instance
const transactionManager = new TransactionManager();

// Clean up expired locks every 5 minutes
setInterval(() => {
    transactionManager.cleanupExpiredLocks();
}, 300000);

module.exports = transactionManager;