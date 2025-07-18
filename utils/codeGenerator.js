const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * Generate a random code in format XXX-XXX-XXX
 */
function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 3; i++) {
        if (i > 0) code += '-';
        for (let j = 0; j < 3; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    
    return code;
}

/**
 * Check if code already exists
 */
async function codeExists(code) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT COUNT(*) as count FROM redeem_codes WHERE code = ?',
            [code]
        );
        return rows[0].count > 0;
    } finally {
        connection.release();
    }
}

/**
 * Generate unique code
 */
async function generateUniqueCode() {
    let code;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        code = generateRandomCode();
        attempts++;
        
        if (attempts > maxAttempts) {
            throw new Error('Failed to generate unique code after maximum attempts');
        }
    } while (await codeExists(code));
    
    return code;
}

/**
 * Create a new redeem code
 */
async function createRedeemCode(options) {
    const {
        description = 'No description',
        rewards = [],
        maxUses = null,
        expiresAt = null,
        createdBy = 'System'
    } = options;

    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Generate unique code
        const code = await generateUniqueCode();
        
        // Insert code into database
        const [result] = await connection.execute(
            `INSERT INTO redeem_codes (
                code, description, rewards, max_uses, expires_at, 
                created_by, created_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)`,
            [
                code,
                description,
                JSON.stringify(rewards),
                maxUses,
                expiresAt,
                createdBy
            ]
        );

        await connection.commit();
        
        logger.info(`Created redeem code: ${code} by ${createdBy}`);
        
        return {
            id: result.insertId,
            code,
            description,
            rewards,
            maxUses,
            expiresAt,
            createdBy
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Initialize redeem codes table
 */
async function initializeRedeemTables() {
    const connection = await pool.getConnection();
    
    try {
        // Create redeem_codes table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS redeem_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(11) NOT NULL UNIQUE,
                description TEXT,
                rewards JSON NOT NULL,
                max_uses INT NULL,
                expires_at DATETIME NULL,
                created_by VARCHAR(100) NOT NULL,
                created_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                INDEX idx_code (code),
                INDEX idx_active (is_active)
            )
        `);

        // Create code_usage table
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

        logger.info('Redeem code tables initialized successfully');

    } catch (error) {
        logger.error('Error initializing redeem tables:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Predefined code templates
 */
const codeTemplates = {
    welcome: {
        description: 'Welcome bonus for new players',
        rewards: [
            { type: 'coins', amount: 1000 },
            { type: 'draw_chances', amount: 2 }
        ],
        maxUses: 100
    },
    
    draw2x: {
        description: 'Double draw chances',
        rewards: [
            { type: 'draw_chances', amount: 2 }
        ],
        maxUses: 50
    },
    
    mega_reward: {
        description: 'Mega reward pack',
        rewards: [
            { type: 'coins', amount: 5000 },
            { type: 'draw_chances', amount: 5 }
        ],
        maxUses: 25
    },
    
    daily_bonus: {
        description: 'Daily bonus reward',
        rewards: [
            { type: 'coins', amount: 500 },
            { type: 'draw_chances', amount: 1 }
        ],
        maxUses: 200
    }
};

/**
 * Quick create predefined codes
 */
async function createPredefinedCode(templateName, createdBy = 'Admin') {
    const template = codeTemplates[templateName];
    
    if (!template) {
        throw new Error(`Template '${templateName}' not found`);
    }
    
    return await createRedeemCode({
        ...template,
        createdBy
    });
}

/**
 * Get active codes (admin function)
 */
async function getActiveCodes() {
    const connection = await pool.getConnection();
    
    try {
        const [rows] = await connection.execute(`
            SELECT 
                r.*,
                COUNT(u.id) as usage_count
            FROM redeem_codes r
            LEFT JOIN code_usage u ON r.id = u.code_id
            WHERE r.is_active = 1
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);
        
        return rows;
    } finally {
        connection.release();
    }
}

module.exports = {
    generateRandomCode,
    generateUniqueCode,
    createRedeemCode,
    createPredefinedCode,
    initializeRedeemTables,
    getActiveCodes,
    codeTemplates
};