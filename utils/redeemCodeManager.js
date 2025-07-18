const atomicOperations = require('./atomicOperations');
const configManager = require('./configManager');
const logger = require('./logger');
const { pool } = require('../config/database');

/**
 * Redeem Code Manager with Atomic Operations
 * Handles concurrent redeem code operations safely
 */

class RedeemCodeManager {
    constructor() {
        this.activeRedemptions = new Map();
        this.redemptionHistory = new Map();
        this.maxConcurrentRedemptions = 100;
    }

    /**
     * Create redeem code with validation
     * @param {object} codeData - Code data
     * @returns {Promise<object>} Created code
     */
    async createRedeemCode(codeData) {
        const {
            code,
            description,
            rewards,
            maxUses,
            expiresAt,
            createdBy,
            isActive = true
        } = codeData;

        // Validate inputs
        if (!code || !rewards || !Array.isArray(rewards) || rewards.length === 0) {
            throw new Error('Invalid code data provided');
        }

        // Validate rewards format
        for (const reward of rewards) {
            if (!reward.type || !reward.amount) {
                throw new Error('Invalid reward format');
            }
            
            if (reward.type === 'power' && !reward.power_id) {
                throw new Error('Power reward requires power_id');
            }
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Check if code already exists
            const [existingCode] = await connection.execute(
                'SELECT id FROM redeem_codes WHERE code = ?',
                [code]
            );

            if (existingCode.length > 0) {
                throw new Error('Redeem code already exists');
            }

            // Create code
            const [result] = await connection.execute(`
                INSERT INTO redeem_codes (
                    code, description, rewards, max_uses, expires_at, 
                    created_by, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                code,
                description,
                JSON.stringify(rewards),
                maxUses,
                expiresAt,
                createdBy,
                isActive
            ]);

            await connection.commit();

            logger.info(`Redeem code created: ${code}`, {
                codeId: result.insertId,
                createdBy,
                rewards: rewards.length,
                maxUses
            });

            return {
                id: result.insertId,
                code,
                description,
                rewards,
                maxUses,
                expiresAt,
                isActive
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Redeem code atomically
     * @param {string} code - Redeem code
     * @param {string} userId - User ID
     * @param {string} discordId - Discord ID
     * @returns {Promise<object>} Redeem result
     */
    async redeemCode(code, userId, discordId) {
        // Check if user is already redeeming this code
        const redemptionKey = `${userId}_${code}`;
        if (this.activeRedemptions.has(redemptionKey)) {
            throw new Error('You are already redeeming this code. Please wait.');
        }

        // Check concurrent redemptions limit
        if (this.activeRedemptions.size >= this.maxConcurrentRedemptions) {
            throw new Error('Too many concurrent redemptions. Please try again later.');
        }

        // Mark as active redemption
        this.activeRedemptions.set(redemptionKey, {
            userId,
            code,
            startTime: Date.now()
        });

        try {
            const result = await atomicOperations.atomicRedeemCode(code, userId);
            
            // Record successful redemption
            this.recordRedemption(userId, code, true, result);
            
            logger.info(`Code redeemed successfully: ${code}`, {
                userId,
                discordId,
                rewards: result.rewards.length
            });

            return result;
        } catch (error) {
            // Record failed redemption
            this.recordRedemption(userId, code, false, { error: error.message });
            
            logger.warn(`Code redemption failed: ${code}`, {
                userId,
                discordId,
                error: error.message
            });

            throw error;
        } finally {
            // Remove from active redemptions
            this.activeRedemptions.delete(redemptionKey);
        }
    }

    /**
     * Record redemption attempt
     * @param {string} userId - User ID
     * @param {string} code - Redeem code
     * @param {boolean} success - Success status
     * @param {object} result - Redemption result
     */
    recordRedemption(userId, code, success, result) {
        const key = `${userId}_${code}`;
        
        if (!this.redemptionHistory.has(userId)) {
            this.redemptionHistory.set(userId, []);
        }

        const userHistory = this.redemptionHistory.get(userId);
        userHistory.push({
            code,
            success,
            result,
            timestamp: Date.now()
        });

        // Keep only last 50 redemptions per user
        if (userHistory.length > 50) {
            userHistory.shift();
        }
    }

    /**
     * Get redeem code by code
     * @param {string} code - Redeem code
     * @returns {Promise<object>} Code data
     */
    async getRedeemCodeByCode(code) {
        const connection = await pool.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM redeem_codes WHERE code = ?',
                [code]
            );
            
            if (rows.length === 0) {
                return null;
            }

            const codeData = rows[0];
            
            // Parse rewards
            try {
                codeData.rewards = JSON.parse(codeData.rewards);
            } catch (error) {
                logger.warn(`Failed to parse rewards for code ${code}:`, error);
                codeData.rewards = [];
            }

            return codeData;
        } finally {
            connection.release();
        }
    }

    /**
     * Get active redeem codes
     * @param {number} limit - Maximum number of codes
     * @returns {Promise<Array>} Active codes
     */
    async getActiveRedeemCodes(limit = 50) {
        const connection = await pool.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM redeem_codes WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?',
                [limit]
            );
            
            return rows.map(row => {
                try {
                    row.rewards = JSON.parse(row.rewards);
                } catch (error) {
                    row.rewards = [];
                }
                return row;
            });
        } finally {
            connection.release();
        }
    }

    /**
     * Check if user has used code
     * @param {string} userId - User ID
     * @param {string} code - Redeem code
     * @returns {Promise<boolean>} Usage status
     */
    async hasUserUsedCode(userId, code) {
        const connection = await pool.getConnection();
        
        try {
            const [codeRows] = await connection.execute(
                'SELECT id FROM redeem_codes WHERE code = ?',
                [code]
            );
            
            if (codeRows.length === 0) {
                return false;
            }

            const [usageRows] = await connection.execute(
                'SELECT id FROM code_usage WHERE code_id = ? AND user_id = ?',
                [codeRows[0].id, userId]
            );
            
            return usageRows.length > 0;
        } finally {
            connection.release();
        }
    }

    /**
     * Get code usage statistics
     * @param {string} code - Redeem code
     * @returns {Promise<object>} Usage stats
     */
    async getCodeUsageStats(code) {
        const connection = await pool.getConnection();
        
        try {
            const [codeRows] = await connection.execute(
                'SELECT * FROM redeem_codes WHERE code = ?',
                [code]
            );
            
            if (codeRows.length === 0) {
                throw new Error('Code not found');
            }

            const codeData = codeRows[0];
            
            const [usageRows] = await connection.execute(
                'SELECT COUNT(*) as usage_count FROM code_usage WHERE code_id = ?',
                [codeData.id]
            );
            
            const [recentUsage] = await connection.execute(
                'SELECT COUNT(*) as recent_usage FROM code_usage WHERE code_id = ? AND redeemed_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
                [codeData.id]
            );
            
            return {
                code: codeData.code,
                description: codeData.description,
                maxUses: codeData.max_uses,
                currentUses: usageRows[0].usage_count,
                recentUses: recentUsage[0].recent_usage,
                isActive: codeData.is_active === 1,
                expiresAt: codeData.expires_at,
                createdAt: codeData.created_at
            };
        } finally {
            connection.release();
        }
    }

    /**
     * Deactivate redeem code
     * @param {string} code - Redeem code
     * @param {string} deactivatedBy - Who deactivated
     * @returns {Promise<boolean>} Success status
     */
    async deactivateCode(code, deactivatedBy = 'system') {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(
                'UPDATE redeem_codes SET is_active = 0, updated_at = NOW() WHERE code = ?',
                [code]
            );

            if (result.affectedRows === 0) {
                throw new Error('Code not found');
            }

            // Log deactivation
            await connection.execute(
                'INSERT INTO config_history (config_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?)',
                [`redeem_code_${code}`, 'active', 'inactive', deactivatedBy]
            );

            await connection.commit();

            logger.info(`Redeem code deactivated: ${code}`, {
                deactivatedBy
            });

            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get user redemption history
     * @param {string} userId - User ID
     * @param {number} limit - Maximum number of records
     * @returns {Promise<Array>} Redemption history
     */
    async getUserRedemptionHistory(userId, limit = 20) {
        const connection = await pool.getConnection();
        
        try {
            const [rows] = await connection.execute(`
                SELECT 
                    rc.code,
                    rc.description,
                    rc.rewards,
                    rcu.redeemed_at
                FROM code_usage rcu
                JOIN redeem_codes rc ON rcu.code_id = rc.id
                WHERE rcu.user_id = ?
                ORDER BY rcu.redeemed_at DESC
                LIMIT ?
            `, [userId, limit]);
            
            return rows.map(row => {
                try {
                    row.rewards = JSON.parse(row.rewards);
                } catch (error) {
                    row.rewards = [];
                }
                return row;
            });
        } finally {
            connection.release();
        }
    }

    /**
     * Clean up expired codes
     * @returns {Promise<number>} Number of cleaned codes
     */
    async cleanupExpiredCodes() {
        const connection = await pool.getConnection();
        
        try {
            const [result] = await connection.execute(
                'UPDATE redeem_codes SET is_active = 0 WHERE expires_at < NOW() AND is_active = 1'
            );

            if (result.affectedRows > 0) {
                logger.info(`Cleaned up ${result.affectedRows} expired redeem codes`);
            }

            return result.affectedRows;
        } finally {
            connection.release();
        }
    }

    /**
     * Get system statistics
     * @returns {object} System statistics
     */
    getSystemStats() {
        return {
            activeRedemptions: this.activeRedemptions.size,
            maxConcurrentRedemptions: this.maxConcurrentRedemptions,
            totalUsersInHistory: this.redemptionHistory.size,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Clear old redemption history
     */
    clearOldHistory() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const [userId, history] of this.redemptionHistory.entries()) {
            const filtered = history.filter(entry => now - entry.timestamp < maxAge);
            
            if (filtered.length === 0) {
                this.redemptionHistory.delete(userId);
            } else {
                this.redemptionHistory.set(userId, filtered);
            }
        }
    }
}

// Create singleton instance
const redeemCodeManager = new RedeemCodeManager();

// Clean up expired codes every hour
setInterval(async () => {
    try {
        await redeemCodeManager.cleanupExpiredCodes();
        redeemCodeManager.clearOldHistory();
    } catch (error) {
        logger.error('Error during redeem code cleanup:', error);
    }
}, 3600000);

module.exports = redeemCodeManager;