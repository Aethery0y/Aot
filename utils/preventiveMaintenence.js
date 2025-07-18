const logger = require('./logger');
const { pool } = require('../config/database');

/**
 * Preventive Maintenance System
 * Automatically detects and fixes common issues before they become problems
 */

class PreventiveMaintenance {
    constructor() {
        this.checks = new Map();
        this.autoFixEnabled = true;
        this.lastMaintenanceRun = null;
    }

    /**
     * Run comprehensive maintenance checks
     */
    async runMaintenanceCheck() {
        logger.info('Starting preventive maintenance check...');
        
        try {
            const issues = [];
            
            // Basic database connectivity check
            try {
                const { pool } = require('../config/database');
                const connection = await pool.getConnection();
                await connection.execute('SELECT 1');
                connection.release();
                logger.debug('Database connectivity verified');
            } catch (error) {
                issues.push('Database connectivity issues detected');
                logger.warn('Database connectivity check failed:', error.message);
            }

            // Check for users with negative coins/draws (safe check)
            try {
                const negativeBalances = await this.checkNegativeBalances();
                if (negativeBalances.length > 0) {
                    issues.push(`Found ${negativeBalances.length} users with negative balances`);
                    if (this.autoFixEnabled) {
                        await this.fixNegativeBalances(negativeBalances);
                        logger.info(`Fixed ${negativeBalances.length} negative balances`);
                    }
                }
            } catch (error) {
                logger.error('Error checking negative balances:', error);
                issues.push('Unable to check user balances');
            }

            // Check for orphaned user powers (safe check)
            try {
                const orphanedPowers = await this.checkOrphanedUserPowers();
                if (orphanedPowers.length > 0) {
                    issues.push(`Found ${orphanedPowers.length} orphaned user powers`);
                    if (this.autoFixEnabled) {
                        await this.fixOrphanedUserPowers(orphanedPowers);
                        logger.info(`Fixed ${orphanedPowers.length} orphaned user powers`);
                    }
                }
            } catch (error) {
                logger.error('Error checking orphaned powers:', error);
                issues.push('Unable to check orphaned powers');
            }

            this.lastMaintenanceRun = new Date();
            
            if (issues.length === 0) {
                logger.info('✅ All systems healthy - no maintenance required');
            } else {
                logger.info(`✅ Maintenance completed - found ${issues.length} issue(s)`);
            }

            return {
                issuesFound: issues.length,
                issuesFixed: this.autoFixEnabled ? Math.max(0, issues.length - issues.filter(i => i.includes('Unable')).length) : 0,
                issues: issues,
                timestamp: this.lastMaintenanceRun
            };

        } catch (error) {
            logger.error('Error during preventive maintenance:', error);
            return {
                issuesFound: 1,
                issuesFixed: 0,
                issues: [`Maintenance check failed: ${error.message}`],
                timestamp: new Date()
            };
        }
    }

    /**
     * Check for orphaned user powers (powers belonging to non-existent users)
     */
    async checkOrphanedUserPowers() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT up.id, up.user_id, up.power_id 
                FROM user_powers up 
                LEFT JOIN users u ON up.user_id = u.id 
                WHERE u.id IS NULL
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    /**
     * Fix orphaned user powers by removing them
     */
    async fixOrphanedUserPowers(orphanedPowers) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            for (const power of orphanedPowers) {
                await connection.execute('DELETE FROM user_powers WHERE id = ?', [power.id]);
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Check for users with invalid equipped power references
     */
    async checkInvalidEquippedPowers() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT u.id, u.username, u.equipped_power_id 
                FROM users u 
                LEFT JOIN user_powers up ON u.equipped_power_id = up.id AND up.user_id = u.id
                WHERE u.equipped_power_id IS NOT NULL AND up.id IS NULL
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    /**
     * Fix invalid equipped powers by clearing the reference
     */
    async fixInvalidEquippedPowers(invalidUsers) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            for (const user of invalidUsers) {
                await connection.execute('UPDATE users SET equipped_power_id = NULL WHERE id = ?', [user.id]);
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Check for users with negative balances
     */
    async checkNegativeBalances() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT id, username, coins, bank_balance, gacha_draws 
                FROM users 
                WHERE coins < 0 OR bank_balance < 0 OR gacha_draws < 0
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    /**
     * Fix negative balances by setting them to 0
     */
    async fixNegativeBalances(negativeUsers) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            for (const user of negativeUsers) {
                await connection.execute(`
                    UPDATE users 
                    SET coins = GREATEST(coins, 0), 
                        bank_balance = GREATEST(bank_balance, 0), 
                        gacha_draws = GREATEST(gacha_draws, 0) 
                    WHERE id = ?
                `, [user.id]);
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Check for powers with ranks that don't match their CP values
     */
    async checkCorruptedPowerRanks() {
        // Skip this check for now to avoid database schema issues
        // This can be re-enabled once the exact schema is confirmed
        return [];
    }

    /**
     * Fix corrupted power ranks
     */
    async fixCorruptedPowerRanks(corruptedPowers) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            for (const power of corruptedPowers) {
                await connection.execute(`
                    UPDATE user_powers 
                    SET rank = ? 
                    WHERE id = ?
                `, [power.correct_rank, power.user_power_id]);
            }
            
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Schedule automatic maintenance runs
     */
    startAutoMaintenance(intervalHours = 6) {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        
        setInterval(async () => {
            try {
                await this.runMaintenanceCheck();
            } catch (error) {
                logger.error('Auto maintenance failed:', error);
            }
        }, intervalMs);
        
        logger.info(`Auto maintenance scheduled every ${intervalHours} hours`);
    }
}

module.exports = new PreventiveMaintenance();