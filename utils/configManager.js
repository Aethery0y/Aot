const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * Configuration Manager
 * Handles dynamic configuration without hardcoded values
 */

class ConfigManager {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize configuration system
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Create configuration table if it doesn't exist
            await this.createConfigTable();
            
            // Load default configurations
            await this.loadDefaults();
            
            this.initialized = true;
            logger.info('Configuration manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize configuration manager:', error);
            throw error;
        }
    }

    /**
     * Create configuration table
     */
    async createConfigTable() {
        const connection = await pool.getConnection();
        
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS bot_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    config_key VARCHAR(100) UNIQUE NOT NULL,
                    config_value TEXT NOT NULL,
                    config_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
                    description TEXT,
                    is_system BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_config_key (config_key),
                    INDEX idx_system (is_system)
                )
            `);
            
            // Create configuration history table for audit trail
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS config_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    config_key VARCHAR(100) NOT NULL,
                    old_value TEXT,
                    new_value TEXT NOT NULL,
                    changed_by VARCHAR(50),
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_config_key (config_key),
                    INDEX idx_changed_at (changed_at)
                )
            `);
        } finally {
            connection.release();
        }
    }

    /**
     * Load default configurations
     */
    async loadDefaults() {
        const defaults = {
            // Bot Settings
            'bot.name': { value: 'AOT - Battle for Paradise', type: 'string', description: 'Bot display name' },
            'bot.prefix': { value: 'ot ', type: 'string', description: 'Command prefix' },
            'bot.max_commands_per_minute': { value: 10, type: 'number', description: 'Rate limit per user' },
            'bot.command_timeout': { value: 30000, type: 'number', description: 'Command timeout in milliseconds' },
            
            // Database Settings
            'db.connection_timeout': { value: 60000, type: 'number', description: 'Database connection timeout' },
            'db.max_retries': { value: 3, type: 'number', description: 'Maximum database retry attempts' },
            'db.lock_timeout': { value: 30000, type: 'number', description: 'Database lock timeout' },
            
            // Battle System
            'battle.max_cp_difference': { value: 0.5, type: 'number', description: 'Maximum CP difference for matchmaking' },
            'battle.base_exp_reward': { value: 50, type: 'number', description: 'Base experience reward' },
            'battle.base_coin_reward': { value: 20, type: 'number', description: 'Base coin reward' },
            'battle.cooldown_seconds': { value: 300, type: 'number', description: 'Battle cooldown in seconds' },
            
            // Gacha System
            'gacha.rates': {
                value: JSON.stringify({
                    'Normal': 40.0,
                    'Rare': 30.0,
                    'Epic': 20.0,
                    'Legendary': 7.5,
                    'Mythic': 2.0,
                    'Divine': 0.4,
                    'Cosmic': 0.08,
                    'Transcendent': 0.015,
                    'Omnipotent': 0.004,
                    'Absolute': 0.001
                }),
                type: 'json',
                description: 'Gacha draw rates by rank'
            },
            'gacha.cp_variation': { value: 0.3, type: 'number', description: 'CP variation percentage' },
            'gacha.starting_draws': { value: 10, type: 'number', description: 'Starting gacha draws for new users' },
            
            // Economy System
            'economy.starting_coins': { value: 1000, type: 'number', description: 'Starting coins for new users' },
            'economy.daily_bonus': { value: 100, type: 'number', description: 'Daily login bonus' },
            'economy.max_coin_transfer': { value: 100000, type: 'number', description: 'Maximum coin transfer amount' },
            'economy.transfer_fee': { value: 0.05, type: 'number', description: 'Transfer fee percentage' },
            
            // Security Settings
            'security.max_login_attempts': { value: 5, type: 'number', description: 'Maximum login attempts' },
            'security.lockout_duration': { value: 3600, type: 'number', description: 'Lockout duration in seconds' },
            'security.password_min_length': { value: 8, type: 'number', description: 'Minimum password length' },
            'security.session_timeout': { value: 86400, type: 'number', description: 'Session timeout in seconds' },
            
            // Arena System
            'arena.rank_update_interval': { value: 3600, type: 'number', description: 'Arena rank update interval' },
            'arena.top_players_count': { value: 100, type: 'number', description: 'Number of top players to track' },
            'arena.season_length': { value: 2592000, type: 'number', description: 'Arena season length in seconds' },
            
            // Discord Settings
            'discord.main_guild_id': { value: '931429251184484364', type: 'string', description: 'Main guild ID' },
            'discord.report_channel_id': { value: '1394740400803287231', type: 'string', description: 'Report channel ID' },
            'discord.redeem_channel_id': { value: '1394740660245893182', type: 'string', description: 'Redeem channel ID' },
            'discord.admin_role_id': { value: 'admin', type: 'string', description: 'Admin role ID' },
            
            // Performance Settings
            'performance.cache_ttl': { value: 300, type: 'number', description: 'Cache TTL in seconds' },
            'performance.log_level': { value: 'info', type: 'string', description: 'Logging level' },
            'performance.metrics_interval': { value: 60, type: 'number', description: 'Metrics collection interval' },
            
            // Feature Flags
            'features.gacha_enabled': { value: true, type: 'boolean', description: 'Enable gacha system' },
            'features.pvp_enabled': { value: true, type: 'boolean', description: 'Enable PvP battles' },
            'features.trading_enabled': { value: false, type: 'boolean', description: 'Enable power trading' },
            'features.guilds_enabled': { value: false, type: 'boolean', description: 'Enable guild system' },
            'features.events_enabled': { value: true, type: 'boolean', description: 'Enable special events' },
            
            // Maintenance Settings
            'maintenance.enabled': { value: false, type: 'boolean', description: 'Maintenance mode' },
            'maintenance.message': { value: 'The bot is currently under maintenance.', type: 'string', description: 'Maintenance message' },
            'maintenance.allowed_users': { value: JSON.stringify([]), type: 'array', description: 'Users allowed during maintenance' }
        };

        for (const [key, config] of Object.entries(defaults)) {
            await this.setDefault(key, config.value, config.type, config.description);
        }
    }

    /**
     * Set default configuration value
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     * @param {string} type - Value type
     * @param {string} description - Configuration description
     */
    async setDefault(key, value, type = 'string', description = '') {
        const connection = await pool.getConnection();
        
        try {
            await connection.execute(`
                INSERT INTO bot_config (config_key, config_value, config_type, description, is_system)
                VALUES (?, ?, ?, ?, TRUE)
                ON DUPLICATE KEY UPDATE
                    description = VALUES(description),
                    config_type = VALUES(config_type)
            `, [key, JSON.stringify(value), type, description]);
        } finally {
            connection.release();
        }
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key
     * @param {any} defaultValue - Default value if not found
     * @returns {Promise<any>} Configuration value
     */
    async get(key, defaultValue = null) {
        const connection = await pool.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT config_value, config_type FROM bot_config WHERE config_key = ?',
                [key]
            );
            
            if (rows.length === 0) {
                return defaultValue;
            }
            
            const config = rows[0];
            let value;
            
            try {
                const parsedValue = JSON.parse(config.config_value);
                
                // Type conversion based on config_type
                switch (config.config_type) {
                    case 'number':
                        value = Number(parsedValue);
                        break;
                    case 'boolean':
                        value = Boolean(parsedValue);
                        break;
                    case 'json':
                    case 'array':
                        value = parsedValue;
                        break;
                    default:
                        value = parsedValue;
                }
            } catch (error) {
                logger.warn(`Failed to parse config value for ${key}:`, error);
                value = config.config_value;
            }
            
            return value;
        } finally {
            connection.release();
        }
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     * @param {string} changedBy - Who changed the value
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, changedBy = 'system') {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get current value for history
            const [currentRows] = await connection.execute(
                'SELECT config_value FROM bot_config WHERE config_key = ?',
                [key]
            );
            
            const oldValue = currentRows.length > 0 ? currentRows[0].config_value : null;
            const newValue = JSON.stringify(value);
            
            // Update configuration
            await connection.execute(`
                INSERT INTO bot_config (config_key, config_value, config_type)
                VALUES (?, ?, 'string')
                ON DUPLICATE KEY UPDATE
                    config_value = VALUES(config_value),
                    updated_at = CURRENT_TIMESTAMP
            `, [key, newValue]);
            
            // Record history
            await connection.execute(
                'INSERT INTO config_history (config_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?)',
                [key, oldValue, newValue, changedBy]
            );
            
            await connection.commit();
            
            logger.info(`Configuration updated: ${key}`, {
                oldValue,
                newValue,
                changedBy
            });
            
            return true;
        } catch (error) {
            await connection.rollback();
            logger.error(`Failed to set configuration ${key}:`, error);
            return false;
        } finally {
            connection.release();
        }
    }

    /**
     * Get multiple configuration values
     * @param {Array<string>} keys - Configuration keys
     * @returns {Promise<object>} Configuration values
     */
    async getMultiple(keys) {
        const result = {};
        
        for (const key of keys) {
            result[key] = await this.get(key);
        }
        
        return result;
    }

    /**
     * Get all configurations with prefix
     * @param {string} prefix - Key prefix
     * @returns {Promise<object>} Configuration values
     */
    async getByPrefix(prefix) {
        const connection = await pool.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT config_key, config_value, config_type FROM bot_config WHERE config_key LIKE ?',
                [`${prefix}%`]
            );
            
            const result = {};
            
            for (const row of rows) {
                try {
                    const parsedValue = JSON.parse(row.config_value);
                    
                    switch (row.config_type) {
                        case 'number':
                            result[row.config_key] = Number(parsedValue);
                            break;
                        case 'boolean':
                            result[row.config_key] = Boolean(parsedValue);
                            break;
                        case 'json':
                        case 'array':
                            result[row.config_key] = parsedValue;
                            break;
                        default:
                            result[row.config_key] = parsedValue;
                    }
                } catch (error) {
                    result[row.config_key] = row.config_value;
                }
            }
            
            return result;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete configuration
     * @param {string} key - Configuration key
     * @param {string} changedBy - Who deleted the value
     * @returns {Promise<boolean>} Success status
     */
    async delete(key, changedBy = 'system') {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get current value for history
            const [currentRows] = await connection.execute(
                'SELECT config_value FROM bot_config WHERE config_key = ?',
                [key]
            );
            
            if (currentRows.length === 0) {
                return false;
            }
            
            const oldValue = currentRows[0].config_value;
            
            // Delete configuration
            await connection.execute(
                'DELETE FROM bot_config WHERE config_key = ?',
                [key]
            );
            
            // Record history
            await connection.execute(
                'INSERT INTO config_history (config_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?)',
                [key, oldValue, null, changedBy]
            );
            
            await connection.commit();
            
            logger.info(`Configuration deleted: ${key}`, {
                oldValue,
                changedBy
            });
            
            return true;
        } catch (error) {
            await connection.rollback();
            logger.error(`Failed to delete configuration ${key}:`, error);
            return false;
        } finally {
            connection.release();
        }
    }

    /**
     * Get configuration history
     * @param {string} key - Configuration key
     * @param {number} limit - Maximum number of records
     * @returns {Promise<Array>} Configuration history
     */
    async getHistory(key, limit = 50) {
        const connection = await pool.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM config_history WHERE config_key = ? ORDER BY changed_at DESC LIMIT ?',
                [key, limit]
            );
            
            return rows;
        } finally {
            connection.release();
        }
    }

    /**
     * Reload configuration from database
     * @param {string} key - Configuration key to reload (optional)
     */
    async reload(key = null) {
        if (key) {
            logger.info(`Configuration reloaded: ${key}`);
        } else {
            logger.info('All configurations reloaded');
        }
    }

    /**
     * Validate configuration value
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     * @returns {object} Validation result
     */
    validateConfig(key, value) {
        const validations = {
            'bot.max_commands_per_minute': (v) => v > 0 && v <= 100,
            'bot.command_timeout': (v) => v >= 1000 && v <= 300000,
            'battle.max_cp_difference': (v) => v >= 0 && v <= 2,
            'economy.starting_coins': (v) => v >= 0 && v <= 1000000,
            'gacha.cp_variation': (v) => v >= 0 && v <= 1,
            'security.password_min_length': (v) => v >= 4 && v <= 128
        };

        const validator = validations[key];
        if (!validator) {
            return { valid: true };
        }

        const isValid = validator(value);
        return {
            valid: isValid,
            error: isValid ? null : `Invalid value for ${key}`
        };
    }

    /**
     * Get system statistics
     * @returns {object} System statistics
     */
    async getSystemStats() {
        const connection = await pool.getConnection();
        
        try {
            const [configCount] = await connection.execute(
                'SELECT COUNT(*) as count FROM bot_config'
            );
            
            const [historyCount] = await connection.execute(
                'SELECT COUNT(*) as count FROM config_history'
            );
            
            const [recentChanges] = await connection.execute(
                'SELECT COUNT(*) as count FROM config_history WHERE changed_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
            );
            
            return {
                totalConfigs: configCount[0].count,
                totalHistoryRecords: historyCount[0].count,
                recentChanges: recentChanges[0].count,
                initialized: this.initialized
            };
        } finally {
            connection.release();
        }
    }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = configManager;