const { executeQuery, executeTransaction } = require('../database/connection');
const { securityManager } = require('../security/securityManager');
const { cacheManager } = require('../cache/cacheManager');
const logger = require('../utils/logger');
const config = require('../config/config');

class UserService {
    async createUser(userData) {
        try {
            // Validate input
            const schemas = securityManager.getValidationSchemas();
            const validation = securityManager.validateInput(userData, schemas.user);
            
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            const { discord_id, username, password, creator_discord_id } = validation.data;

            // Check if user already exists
            const existingUser = await this.getUserByDiscordId(discord_id);
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Check if username is taken
            const existingUsername = await this.getUserByUsername(username);
            if (existingUsername) {
                throw new Error('Username already taken');
            }

            // Hash password
            const passwordHash = await securityManager.hashPassword(password);

            // Create user in transaction
            const operations = [
                {
                    sql: `INSERT INTO users (discord_id, username, password_hash, creator_discord_id, coins, gacha_draws) 
                          VALUES (?, ?, ?, ?, ?, ?)`,
                    params: [discord_id, username, passwordHash, creator_discord_id, config.game.startingCoins, config.game.startingDraws]
                }
            ];

            const results = await executeTransaction(operations);
            const userId = results[0][0].insertId;

            // Log transaction
            await this.logTransaction(userId, 'coins_earned', config.game.startingCoins, 'Starting coins');

            // Log security event
            securityManager.logSecurityEvent(discord_id, 'user_registered', {
                username,
                startingCoins: config.game.startingCoins,
                startingDraws: config.game.startingDraws
            });

            logger.info(`User registered: ${username} (${discord_id})`);

            return await this.getUserById(userId);

        } catch (error) {
            logger.error('User creation failed:', error);
            throw error;
        }
    }

    async authenticateUser(username, password) {
        try {
            // Rate limiting
            const rateLimitResult = await securityManager.checkRateLimit('login', username);
            if (!rateLimitResult.allowed) {
                throw new Error(rateLimitResult.error);
            }

            // Get user by username
            const user = await this.getUserByUsername(username);
            if (!user) {
                securityManager.logSecurityEvent(null, 'login_failed', { username, reason: 'user_not_found' }, 'medium');
                throw new Error('Invalid credentials');
            }

            // Verify password
            const isValidPassword = await securityManager.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                securityManager.logSecurityEvent(user.discord_id, 'login_failed', { username, reason: 'invalid_password' }, 'medium');
                throw new Error('Invalid credentials');
            }

            // Update last login
            await executeQuery(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );

            // Generate session token
            const token = securityManager.generateToken({
                userId: user.id,
                discordId: user.discord_id,
                username: user.username
            });

            // Log successful login
            securityManager.logSecurityEvent(user.discord_id, 'login_success', { username });
            logger.info(`User logged in: ${username} (${user.discord_id})`);

            return {
                user: this.sanitizeUser(user),
                token
            };

        } catch (error) {
            logger.error('Authentication failed:', error);
            throw error;
        }
    }

    async getUserByDiscordId(discordId) {
        try {
            // Try cache first
            const cached = await cacheManager.getUserData(discordId);
            if (cached) {
                return cached;
            }

            // Query database
            const users = await executeQuery(
                'SELECT * FROM users WHERE discord_id = ? AND is_active = TRUE',
                [discordId]
            );

            const user = users[0] || null;
            
            // Cache result
            if (user) {
                await cacheManager.set(`user:${discordId}`, user, 600);
            }

            return user;

        } catch (error) {
            logger.error('Failed to get user by Discord ID:', error);
            throw error;
        }
    }

    async getUserByUsername(username) {
        try {
            const users = await executeQuery(
                'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
                [username]
            );

            return users[0] || null;

        } catch (error) {
            logger.error('Failed to get user by username:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const users = await executeQuery(
                'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
                [userId]
            );

            return users[0] || null;

        } catch (error) {
            logger.error('Failed to get user by ID:', error);
            throw error;
        }
    }

    async updateUser(userId, updates) {
        try {
            // Validate updates
            const allowedFields = ['level', 'exp', 'coins', 'bank_balance', 'gacha_draws', 'equipped_power_id', 'battles_won', 'battles_lost'];
            const validUpdates = {};

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    validUpdates[key] = value;
                }
            }

            if (Object.keys(validUpdates).length === 0) {
                throw new Error('No valid fields to update');
            }

            // Build query
            const setClause = Object.keys(validUpdates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(validUpdates);
            values.push(userId);

            await executeQuery(
                `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                values
            );

            // Invalidate cache
            const user = await this.getUserById(userId);
            if (user) {
                await cacheManager.invalidateUserData(user.discord_id);
            }

            logger.info(`User updated: ${userId}`, validUpdates);
            return await this.getUserById(userId);

        } catch (error) {
            logger.error('User update failed:', error);
            throw error;
        }
    }

    async updateCoins(userId, amount, description = '') {
        try {
            if (amount === 0) return;

            const operations = [
                {
                    sql: 'UPDATE users SET coins = coins + ? WHERE id = ?',
                    params: [amount, userId]
                }
            ];

            // Log transaction
            if (description) {
                operations.push({
                    sql: 'INSERT INTO transactions (user_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
                    params: [userId, amount > 0 ? 'coins_earned' : 'coins_spent', Math.abs(amount), description]
                });
            }

            await executeTransaction(operations);

            // Invalidate cache
            const user = await this.getUserById(userId);
            if (user) {
                await cacheManager.invalidateUserData(user.discord_id);
            }

            logger.info(`Coins updated for user ${userId}: ${amount > 0 ? '+' : ''}${amount}`);

        } catch (error) {
            logger.error('Coin update failed:', error);
            throw error;
        }
    }

    async logTransaction(userId, type, amount, description = '') {
        try {
            await executeQuery(
                'INSERT INTO transactions (user_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
                [userId, type, amount, description]
            );
        } catch (error) {
            logger.error('Transaction logging failed:', error);
            // Don't throw - transaction logging shouldn't break main operations
        }
    }

    async getUserTransactions(userId, limit = 50) {
        try {
            return await executeQuery(
                'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
                [userId, limit]
            );
        } catch (error) {
            logger.error('Failed to get user transactions:', error);
            throw error;
        }
    }

    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Get user
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidPassword = await securityManager.verifyPassword(currentPassword, user.password_hash);
            if (!isValidPassword) {
                securityManager.logSecurityEvent(user.discord_id, 'password_change_failed', { reason: 'invalid_current_password' }, 'medium');
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = await securityManager.hashPassword(newPassword);

            // Update password
            await executeQuery(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newPasswordHash, userId]
            );

            // Log security event
            securityManager.logSecurityEvent(user.discord_id, 'password_changed', { username: user.username });

            logger.info(`Password changed for user: ${user.username} (${user.discord_id})`);

        } catch (error) {
            logger.error('Password change failed:', error);
            throw error;
        }
    }

    async deactivateUser(userId, reason = '') {
        try {
            await executeQuery(
                'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );

            // Invalidate cache
            const user = await this.getUserById(userId);
            if (user) {
                await cacheManager.invalidateUserData(user.discord_id);
                securityManager.logSecurityEvent(user.discord_id, 'user_deactivated', { reason });
            }

            logger.info(`User deactivated: ${userId} - ${reason}`);

        } catch (error) {
            logger.error('User deactivation failed:', error);
            throw error;
        }
    }

    sanitizeUser(user) {
        if (!user) return null;

        const { password_hash, security_flags, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    async getUserStats() {
        try {
            const stats = await executeQuery(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN last_login > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as active_24h,
                    COUNT(CASE WHEN last_login > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_7d,
                    AVG(level) as avg_level,
                    SUM(coins) as total_coins,
                    SUM(bank_balance) as total_banked
                FROM users 
                WHERE is_active = TRUE
            `);

            return stats[0];

        } catch (error) {
            logger.error('Failed to get user stats:', error);
            throw error;
        }
    }
}

const userService = new UserService();

module.exports = userService;