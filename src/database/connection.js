const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const config = require('../config/config');

class DatabaseManager {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
        this.reconnectDelay = 5000;
    }

    async initialize() {
        try {
            logger.info('🔗 Initializing database connection...');
            
            this.pool = mysql.createPool({
                host: config.database.host,
                port: config.database.port,
                user: config.database.user,
                password: config.database.password,
                database: config.database.database,
                connectionLimit: config.database.connectionLimit,
                acquireTimeout: config.database.acquireTimeout,
                timeout: config.database.timeout,
                reconnect: config.database.reconnect,
                charset: config.database.charset,
                multipleStatements: false,
                namedPlaceholders: true,
                timezone: 'Z'
            });

            // Test connection
            await this.testConnection();
            
            // Run migrations
            await this.runMigrations();
            
            this.isConnected = true;
            logger.info('✅ Database initialized successfully');
            
        } catch (error) {
            logger.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            await connection.execute('SELECT 1');
            connection.release();
            logger.info('✅ Database connection test successful');
        } catch (error) {
            logger.error('❌ Database connection test failed:', error);
            throw error;
        }
    }

    async runMigrations() {
        try {
            logger.info('🔄 Running database migrations...');
            
            const connection = await this.pool.getConnection();
            
            try {
                // Create migrations table if it doesn't exist
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS migrations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE,
                        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_name (name)
                    )
                `);

                // Run all migrations
                await this.executeMigrations(connection);
                
                logger.info('✅ Database migrations completed');
                
            } finally {
                connection.release();
            }
            
        } catch (error) {
            logger.error('❌ Database migrations failed:', error);
            throw error;
        }
    }

    async executeMigrations(connection) {
        const migrations = [
            {
                name: '001_create_users_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        discord_id VARCHAR(20) NOT NULL UNIQUE,
                        username VARCHAR(32) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        creator_discord_id VARCHAR(20) NOT NULL,
                        level INT DEFAULT 1,
                        exp INT DEFAULT 0,
                        coins BIGINT DEFAULT 2000,
                        bank_balance BIGINT DEFAULT 0,
                        gacha_draws INT DEFAULT 15,
                        equipped_power_id INT NULL,
                        battles_won INT DEFAULT 0,
                        battles_lost INT DEFAULT 0,
                        last_daily TIMESTAMP NULL,
                        last_login TIMESTAMP NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT TRUE,
                        security_flags JSON DEFAULT NULL,
                        INDEX idx_discord_id (discord_id),
                        INDEX idx_username (username),
                        INDEX idx_level (level),
                        INDEX idx_active (is_active)
                    )
                `
            },
            {
                name: '002_create_powers_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS powers (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        description TEXT NOT NULL,
                        rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute') NOT NULL,
                        base_cp INT NOT NULL,
                        base_price BIGINT NOT NULL,
                        rarity_weight DECIMAL(5,2) DEFAULT 0.00,
                        is_obtainable BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_rank (rank),
                        INDEX idx_base_cp (base_cp),
                        INDEX idx_obtainable (is_obtainable)
                    )
                `
            },
            {
                name: '003_create_user_powers_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS user_powers (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        power_id INT NOT NULL,
                        combat_power INT NOT NULL,
                        rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute') NOT NULL,
                        obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_evolved BOOLEAN DEFAULT FALSE,
                        evolution_history JSON DEFAULT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (power_id) REFERENCES powers(id) ON DELETE CASCADE,
                        INDEX idx_user_id (user_id),
                        INDEX idx_power_id (power_id),
                        INDEX idx_combat_power (combat_power),
                        INDEX idx_rank (rank)
                    )
                `
            },
            {
                name: '004_create_arena_rankings_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS arena_rankings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL UNIQUE,
                        rank_position INT NOT NULL UNIQUE,
                        total_cp BIGINT NOT NULL,
                        wins INT DEFAULT 0,
                        losses INT DEFAULT 0,
                        last_battle TIMESTAMP NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_rank_position (rank_position),
                        INDEX idx_total_cp (total_cp),
                        INDEX idx_last_battle (last_battle)
                    )
                `
            },
            {
                name: '005_create_command_cooldowns_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS command_cooldowns (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id VARCHAR(20) NOT NULL,
                        command_name VARCHAR(50) NOT NULL,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_user_command (user_id, command_name),
                        INDEX idx_expires_at (expires_at),
                        INDEX idx_user_command (user_id, command_name)
                    )
                `
            },
            {
                name: '006_create_gacha_history_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS gacha_history (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        power_id INT NOT NULL,
                        power_name VARCHAR(100) NOT NULL,
                        power_rank VARCHAR(20) NOT NULL,
                        combat_power INT NOT NULL,
                        draw_type ENUM('free', 'paid') DEFAULT 'free',
                        pity_counter INT DEFAULT 0,
                        drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (power_id) REFERENCES powers(id) ON DELETE CASCADE,
                        INDEX idx_user_id (user_id),
                        INDEX idx_drawn_at (drawn_at),
                        INDEX idx_power_rank (power_rank)
                    )
                `
            },
            {
                name: '007_create_security_logs_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS security_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id VARCHAR(20) NOT NULL,
                        action VARCHAR(100) NOT NULL,
                        details JSON DEFAULT NULL,
                        ip_address VARCHAR(45) NULL,
                        user_agent TEXT NULL,
                        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_user_id (user_id),
                        INDEX idx_action (action),
                        INDEX idx_severity (severity),
                        INDEX idx_created_at (created_at)
                    )
                `
            },
            {
                name: '008_create_transactions_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS transactions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        transaction_type ENUM('coins_earned', 'coins_spent', 'power_obtained', 'power_lost', 'battle_reward', 'daily_reward', 'gacha_purchase') NOT NULL,
                        amount BIGINT NOT NULL,
                        description TEXT NULL,
                        metadata JSON DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_user_id (user_id),
                        INDEX idx_transaction_type (transaction_type),
                        INDEX idx_created_at (created_at)
                    )
                `
            },
            {
                name: '009_create_redeem_codes_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS redeem_codes (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        code VARCHAR(20) NOT NULL UNIQUE,
                        description TEXT NULL,
                        rewards JSON NOT NULL,
                        max_uses INT NULL,
                        current_uses INT DEFAULT 0,
                        expires_at TIMESTAMP NULL,
                        created_by VARCHAR(20) NOT NULL,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_code (code),
                        INDEX idx_active (is_active),
                        INDEX idx_expires_at (expires_at)
                    )
                `
            },
            {
                name: '010_create_code_usage_table',
                sql: `
                    CREATE TABLE IF NOT EXISTS code_usage (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        code_id INT NOT NULL,
                        user_id INT NOT NULL,
                        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (code_id) REFERENCES redeem_codes(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE KEY unique_code_user (code_id, user_id),
                        INDEX idx_code_user (code_id, user_id)
                    )
                `
            }
        ];

        for (const migration of migrations) {
            try {
                // Check if migration already executed
                const [existing] = await connection.execute(
                    'SELECT id FROM migrations WHERE name = ?',
                    [migration.name]
                );

                if (existing.length === 0) {
                    // Execute migration
                    await connection.execute(migration.sql);
                    
                    // Record migration
                    await connection.execute(
                        'INSERT INTO migrations (name) VALUES (?)',
                        [migration.name]
                    );
                    
                    logger.info(`✅ Migration executed: ${migration.name}`);
                } else {
                    logger.debug(`⏭️ Migration skipped (already executed): ${migration.name}`);
                }
            } catch (error) {
                logger.error(`❌ Migration failed: ${migration.name}`, error);
                throw error;
            }
        }
    }

    async executeQuery(sql, params = []) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }

        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('Database query failed:', { sql, params, error: error.message });
            throw error;
        }
    }

    async executeTransaction(operations) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const results = [];
            for (const operation of operations) {
                const result = await connection.execute(operation.sql, operation.params);
                results.push(result);
            }
            
            await connection.commit();
            return results;
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async closeConnections() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            logger.info('✅ Database connections closed');
        }
    }

    getPool() {
        return this.pool;
    }

    isHealthy() {
        return this.isConnected && this.pool;
    }
}

const databaseManager = new DatabaseManager();

module.exports = {
    initializeDatabase: () => databaseManager.initialize(),
    executeQuery: (sql, params) => databaseManager.executeQuery(sql, params),
    executeTransaction: (operations) => databaseManager.executeTransaction(operations),
    closeConnections: () => databaseManager.closeConnections(),
    getPool: () => databaseManager.getPool(),
    isHealthy: () => databaseManager.isHealthy()
};