const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * Database-driven configuration system
 * All hardcoded values moved to database tables
 */

class ConfigDatabase {
    constructor() {
        this.initializeDatabase();
    }

    async initializeDatabase() {
        const connection = await pool.getConnection();
        
        try {
            // Configuration table for all bot settings
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS bot_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    config_key VARCHAR(100) NOT NULL UNIQUE,
                    config_value TEXT NOT NULL,
                    description TEXT,
                    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_config_key (config_key)
                )
            `);

            // Power rank configurations
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS power_rank_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    rank_name VARCHAR(50) NOT NULL UNIQUE,
                    rank_order INT NOT NULL,
                    min_cp INT NOT NULL,
                    max_cp INT NOT NULL,
                    gacha_weight DECIMAL(5,2) DEFAULT 0.00,
                    rank_color VARCHAR(7) NOT NULL,
                    rank_emoji VARCHAR(10) NOT NULL,
                    cp_multiplier DECIMAL(4,2) DEFAULT 1.00,
                    base_price INT DEFAULT 1000,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_rank_order (rank_order),
                    INDEX idx_min_cp (min_cp),
                    INDEX idx_max_cp (max_cp)
                )
            `);

            // Enemy configurations
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS enemy_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    rank VARCHAR(50) NOT NULL,
                    base_cp INT NOT NULL,
                    cp_variance DECIMAL(3,2) DEFAULT 0.20,
                    reward_multiplier DECIMAL(3,2) DEFAULT 1.00,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_rank (rank),
                    INDEX idx_base_cp (base_cp),
                    INDEX idx_active (is_active)
                )
            `);

            // Command configurations
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS command_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    command_name VARCHAR(50) NOT NULL UNIQUE,
                    cooldown_seconds INT DEFAULT 0,
                    cost_coins INT DEFAULT 0,
                    min_level INT DEFAULT 1,
                    is_enabled BOOLEAN DEFAULT TRUE,
                    success_rate DECIMAL(3,2) DEFAULT 1.00,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_command_name (command_name),
                    INDEX idx_enabled (is_enabled)
                )
            `);

            // Insert default configurations if tables are empty
            await this.insertDefaultConfigurations(connection);
            
            logger.info('Configuration database initialized successfully');
        } finally {
            connection.release();
        }
    }

    async insertDefaultConfigurations(connection) {
        // Check if configurations already exist
        const [configCount] = await connection.execute('SELECT COUNT(*) as count FROM bot_config');
        if (configCount[0].count > 0) return;

        // Insert default bot configurations
        const botConfigs = [
            { key: 'max_level', value: '100', type: 'number', description: 'Maximum user level' },
            { key: 'starting_coins', value: '1000', type: 'number', description: 'Starting coins for new users' },
            { key: 'starting_draws', value: '10', type: 'number', description: 'Starting gacha draws for new users' },
            { key: 'embed_color', value: '#ff4444', type: 'string', description: 'Default embed color' },
            { key: 'daily_reward_coins', value: '500', type: 'number', description: 'Daily reward coins' },
            { key: 'merge_cooldown_hours', value: '72', type: 'number', description: 'Merge cooldown in hours' },
            { key: 'gacha_draw_price', value: '1000', type: 'number', description: 'Price per gacha draw' },
            { key: 'battle_coin_multiplier', value: '0.05', type: 'number', description: 'Battle coin reward multiplier' },
            { key: 'evolution_success_base', value: '85', type: 'number', description: 'Base evolution success rate' },
            { key: 'bank_interest_rate', value: '0.02', type: 'number', description: 'Daily bank interest rate' }
        ];

        for (const config of botConfigs) {
            await connection.execute(
                'INSERT INTO bot_config (config_key, config_value, config_type, description) VALUES (?, ?, ?, ?)',
                [config.key, config.value, config.type, config.description]
            );
        }

        // Insert power rank configurations
        const rankConfigs = [
            { name: 'Normal', order: 1, min_cp: 45, max_cp: 150, weight: 70.0, color: '#999999', emoji: '⚪', multiplier: 1.0, price: 500 },
            { name: 'Rare', order: 2, min_cp: 200, max_cp: 400, weight: 20.0, color: '#0099ff', emoji: '🔵', multiplier: 2.5, price: 2000 },
            { name: 'Epic', order: 3, min_cp: 800, max_cp: 1200, weight: 7.0, color: '#9932cc', emoji: '🟣', multiplier: 4.0, price: 8000 },
            { name: 'Legendary', order: 4, min_cp: 2000, max_cp: 3000, weight: 2.5, color: '#ffaa00', emoji: '🟡', multiplier: 6.5, price: 25000 },
            { name: 'Mythic', order: 5, min_cp: 5000, max_cp: 6000, weight: 0.5, color: '#ff0000', emoji: '🔴', multiplier: 10.0, price: 100000 },
            { name: 'Divine', order: 6, min_cp: 9000, max_cp: 12000, weight: 0.0, color: '#00ff00', emoji: '🟢', multiplier: 15.0, price: 200000 },
            { name: 'Cosmic', order: 7, min_cp: 18000, max_cp: 25000, weight: 0.0, color: '#ff6600', emoji: '🟠', multiplier: 25.0, price: 400000 },
            { name: 'Transcendent', order: 8, min_cp: 35000, max_cp: 50000, weight: 0.0, color: '#000000', emoji: '⚫', multiplier: 40.0, price: 800000 },
            { name: 'Omnipotent', order: 9, min_cp: 75000, max_cp: 100000, weight: 0.0, color: '#ffffff', emoji: '✨', multiplier: 60.0, price: 1500000 },
            { name: 'Absolute', order: 10, min_cp: 500000, max_cp: 1000000, weight: 0.0, color: '#ff69b4', emoji: '💎', multiplier: 100.0, price: 5000000 }
        ];

        for (const rank of rankConfigs) {
            await connection.execute(
                'INSERT INTO power_rank_config (rank_name, rank_order, min_cp, max_cp, gacha_weight, rank_color, rank_emoji, cp_multiplier, base_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [rank.name, rank.order, rank.min_cp, rank.max_cp, rank.weight, rank.color, rank.emoji, rank.multiplier, rank.price]
            );
        }

        // Insert default command configurations
        const commandConfigs = [
            { name: 'fight', cooldown: 10, cost: 0, min_level: 1, success_rate: 1.0, description: 'Battle against enemies' },
            { name: 'battle', cooldown: 8, cost: 0, min_level: 1, success_rate: 1.0, description: 'PvP battle' },
            { name: 'afight', cooldown: 8, cost: 0, min_level: 1, success_rate: 1.0, description: 'Arena fight' },
            { name: 'gacha', cooldown: 8, cost: 0, min_level: 1, success_rate: 1.0, description: 'Gacha draw system' },
            { name: 'give', cooldown: 10, cost: 0, min_level: 1, success_rate: 1.0, description: 'Give power to another user' },
            { name: 'rob', cooldown: 8, cost: 0, min_level: 1, success_rate: 0.7, description: 'Rob another user' },
            { name: 'eat', cooldown: 8, cost: 0, min_level: 1, success_rate: 1.0, description: 'Challenge to eat power' },
            { name: 'slot', cooldown: 8, cost: 0, min_level: 1, success_rate: 1.0, description: 'Slot machine gambling' },
            { name: 'bet', cooldown: 8, cost: 0, min_level: 1, success_rate: 1.0, description: 'Coin betting' },
            { name: 'help', cooldown: 8, cost: 0, min_level: 1, success_rate: 1.0, description: 'Help command' },
            { name: 'merge', cooldown: 3600, cost: 0, min_level: 1, success_rate: 0.9, description: 'Merge powers (1 hour cooldown)' },
            { name: 'daily', cooldown: 86400, cost: 0, min_level: 1, success_rate: 1.0, description: 'Daily rewards (24h cooldown)' }
        ];

        for (const cmd of commandConfigs) {
            await connection.execute(
                'INSERT INTO command_config (command_name, cooldown_seconds, cost_coins, min_level, success_rate, description) VALUES (?, ?, ?, ?, ?, ?)',
                [cmd.name, cmd.cooldown, cmd.cost, cmd.min_level, cmd.success_rate, cmd.description]
            );
        }

        logger.info('Default configurations inserted successfully');
    }

    // Get configuration from database
    async getConfig(key) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT config_value, config_type FROM bot_config WHERE config_key = ?',
                [key]
            );

            if (rows.length === 0) {
                throw new Error(`Configuration key '${key}' not found`);
            }

            const { config_value, config_type } = rows[0];
            let value = config_value;

            // Type conversion
            switch (config_type) {
                case 'number':
                    value = parseFloat(config_value);
                    break;
                case 'boolean':
                    value = config_value.toLowerCase() === 'true';
                    break;
                case 'json':
                    value = JSON.parse(config_value);
                    break;
                default:
                    value = config_value;
            }

            return value;
        } finally {
            connection.release();
        }
    }

    // Get all power ranks
    async getPowerRanks() {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM power_rank_config ORDER BY rank_order ASC'
            );

            const ranks = {};
            for (const row of rows) {
                ranks[row.rank_name] = {
                    order: row.rank_order,
                    minCP: row.min_cp,
                    maxCP: row.max_cp,
                    weight: parseFloat(row.gacha_weight),
                    color: row.rank_color,
                    emoji: row.rank_emoji,
                    multiplier: parseFloat(row.cp_multiplier),
                    basePrice: row.base_price
                };
            }

            return ranks;
        } finally {
            connection.release();
        }
    }

    // Get command configuration
    async getCommandConfig(commandName) {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM command_config WHERE command_name = ?',
                [commandName]
            );

            if (rows.length === 0) {
                // Return default config if not found
                return {
                    cooldown: 0,
                    cost: 0,
                    minLevel: 1,
                    successRate: 1.0,
                    enabled: true
                };
            }

            const config = {
                cooldown: rows[0].cooldown_seconds,
                cost: rows[0].cost_coins,
                minLevel: rows[0].min_level,
                successRate: parseFloat(rows[0].success_rate),
                enabled: rows[0].is_enabled
            };

            return config;
        } finally {
            connection.release();
        }
    }

    // Determine rank by CP using database values
    async determineRankByCP(cp) {
        const ranks = await this.getPowerRanks();
        
        // Sort ranks by order (lowest to highest)
        const sortedRanks = Object.entries(ranks).sort((a, b) => a[1].order - b[1].order);
        
        // Find the highest rank that this CP qualifies for
        let appropriateRank = 'Normal';
        for (const [rankName, config] of sortedRanks) {
            if (cp >= config.minCP && cp <= config.maxCP) {
                return rankName;
            }
        }
        
        // If no exact match found, find the highest rank where CP >= minCP
        for (const [rankName, config] of sortedRanks.reverse()) {
            if (cp >= config.minCP) {
                return rankName;
            }
        }
        
        // If CP is below all ranges, return lowest rank
        return 'Normal';
    }

    // Get gacha rates from database
    async getGachaRates() {
        const ranks = await this.getPowerRanks();
        const rates = {};
        
        for (const [rankName, config] of Object.entries(ranks)) {
            if (config.weight > 0) {
                rates[rankName] = config.weight;
            }
        }
        
        return rates;
    }

    // Update configuration
    async updateConfig(key, value, type = 'string') {
        const connection = await pool.getConnection();
        try {
            await connection.execute(
                'UPDATE bot_config SET config_value = ?, config_type = ? WHERE config_key = ?',
                [value.toString(), type, key]
            );
            
            logger.info(`Configuration updated: ${key} = ${value}`);
        } finally {
            connection.release();
        }
    }
}

module.exports = new ConfigDatabase();