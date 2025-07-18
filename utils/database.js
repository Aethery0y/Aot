const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('./logger');
const securityManager = require('./security');
const errorHandler = require('./errorHandler');
const performanceMonitor = require('./performanceMonitor');
const atomicOperations = require('./atomicOperations');
const configManager = require('./configManager');


/**
 * Initialize database tables
 */
async function initializeDatabase() {
    const connection = await pool.getConnection();
    
    try {
        // Users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                discord_id VARCHAR(50) UNIQUE NOT NULL,
                username VARCHAR(50) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                creator_discord_id VARCHAR(20) NOT NULL,
                level INT DEFAULT 1,
                exp BIGINT DEFAULT 0,
                coins BIGINT DEFAULT 1000,
                bank_balance BIGINT DEFAULT 0,
                bonus_cp INT DEFAULT 0,
                gacha_draws INT DEFAULT 10,
                pity_counter INT DEFAULT 0,
                equipped_power_id INT NULL,
                battles_won INT DEFAULT 0,
                battles_lost INT DEFAULT 0,
                arena_rank INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_discord_id (discord_id),
                INDEX idx_username (username),
                INDEX idx_creator_discord_id (creator_discord_id),
                INDEX idx_arena_rank (arena_rank)
            )
        `);

        // Powers table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS powers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute') NOT NULL,
                base_cp INT DEFAULT 50,
                base_price INT DEFAULT 1000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User powers table (create after powers table)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_powers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                power_id INT NOT NULL,
                combat_power INT NOT NULL,
                acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_power_id (power_id)
            )
        `);

        // Arena rankings table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS arena_rankings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                rank_position INT NOT NULL,
                total_cp INT DEFAULT 0,
                wins INT NOT NULL DEFAULT 0,
                losses INT NOT NULL DEFAULT 0,
                last_battle TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_rank (rank_position),
                UNIQUE KEY unique_user (user_id),
                INDEX idx_rank_position (rank_position),
                INDEX idx_total_cp (total_cp DESC)
            )
        `);

        // Command cooldowns table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS command_cooldowns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(20) NOT NULL,
                command_name VARCHAR(50) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                INDEX idx_user_command (user_id, command_name),
                INDEX idx_expires (expires_at)
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

        // Gacha history table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS gacha_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                power_id INT NOT NULL,
                power_name VARCHAR(100) NOT NULL,
                power_rank VARCHAR(20) NOT NULL,
                combat_power INT NOT NULL,
                draw_type ENUM('free', 'paid', 'bonus') DEFAULT 'paid',
                drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_drawn_at (drawn_at)
            )
        `);

        // Insert default powers if table is empty
        const [powerCount] = await connection.execute('SELECT COUNT(*) as count FROM powers');
        if (powerCount[0].count === 0) {
            await insertDefaultPowers(connection);
        }

        logger.info('Database tables initialized successfully');
    } finally {
        connection.release();
    }
}

/**
 * Insert default Attack on Titan powers
 */
async function insertDefaultPowers(connection) {
    const defaultPowers = [
        // Normal Rank (24 powers)
        { name: 'Vertical Maneuvering Equipment', description: 'Standard ODM gear for mobility and titan combat', rank: 'Normal', base_cp: 50, base_price: 500 },
        { name: 'Thunder Spear', description: 'Explosive spear designed to pierce titan armor', rank: 'Normal', base_cp: 60, base_price: 600 },
        { name: 'Blade Mastery', description: 'Expert swordsmanship with dual blades', rank: 'Normal', base_cp: 55, base_price: 550 },
        { name: 'Scout Regiment Training', description: 'Enhanced combat reflexes and tactics', rank: 'Normal', base_cp: 45, base_price: 450 },
        { name: 'Garrison Regiment Discipline', description: 'Defensive formations and wall combat expertise', rank: 'Normal', base_cp: 52, base_price: 520 },
        { name: 'Military Police Training', description: 'Advanced combat techniques and leadership skills', rank: 'Normal', base_cp: 58, base_price: 580 },
        { name: 'Horse Riding Mastery', description: 'Expert equestrian skills for rapid deployment', rank: 'Normal', base_cp: 48, base_price: 480 },
        { name: 'Signal Flare Expertise', description: 'Master of battlefield communication and coordination', rank: 'Normal', base_cp: 46, base_price: 460 },
        { name: 'Cannon Operation', description: 'Skilled artillery operator for wall defense', rank: 'Normal', base_cp: 54, base_price: 540 },
        { name: 'Hand-to-Hand Combat', description: 'Unarmed fighting techniques and grappling', rank: 'Normal', base_cp: 51, base_price: 510 },
        { name: 'Stealth Operations', description: 'Silent movement and infiltration techniques', rank: 'Normal', base_cp: 49, base_price: 490 },
        { name: 'Medical Training', description: 'Battlefield first aid and wound treatment', rank: 'Normal', base_cp: 47, base_price: 470 },
        { name: 'Engineering Skills', description: 'Wall maintenance and fortification construction', rank: 'Normal', base_cp: 53, base_price: 530 },
        { name: 'Tactical Planning', description: 'Strategic battlefield analysis and planning', rank: 'Normal', base_cp: 56, base_price: 560 },
        { name: 'Survival Instinct', description: 'Enhanced awareness and danger detection', rank: 'Normal', base_cp: 50, base_price: 500 },
        { name: 'Weather Reading', description: 'Ability to predict weather patterns for missions', rank: 'Normal', base_cp: 45, base_price: 450 },
        { name: 'Equipment Maintenance', description: 'Expert care and repair of ODM gear', rank: 'Normal', base_cp: 48, base_price: 480 },
        { name: 'Formation Leadership', description: 'Commanding troops in battle formations', rank: 'Normal', base_cp: 57, base_price: 570 },
        { name: 'Titan Tracking', description: 'Ability to track and predict titan movements', rank: 'Normal', base_cp: 52, base_price: 520 },
        { name: 'Urban Combat', description: 'Specialized fighting in city environments', rank: 'Normal', base_cp: 54, base_price: 540 },
        { name: 'Forest Navigation', description: 'Expert pathfinding through dense forests', rank: 'Normal', base_cp: 49, base_price: 490 },
        { name: 'Supply Management', description: 'Efficient resource allocation and logistics', rank: 'Normal', base_cp: 46, base_price: 460 },
        { name: 'Horseback Archery', description: 'Ranged combat while mounted on horseback', rank: 'Normal', base_cp: 51, base_price: 510 },
        { name: 'Night Operations', description: 'Combat effectiveness in darkness', rank: 'Normal', base_cp: 50, base_price: 500 },
        
        // Rare Rank (16 powers - expanding from current 4)
        { name: 'Enhanced Strength', description: 'Superhuman physical capabilities', rank: 'Rare', base_cp: 250, base_price: 2000 },
        { name: 'Steam Release', description: 'Release scalding steam as defense mechanism', rank: 'Rare', base_cp: 230, base_price: 1800 },
        { name: 'Titan Hardening', description: 'Ability to harden skin for defense and offense', rank: 'Rare', base_cp: 280, base_price: 2200 },
        { name: 'Regeneration', description: 'Rapid healing of wounds and lost limbs', rank: 'Rare', base_cp: 270, base_price: 2100 },
        { name: 'Titan Sensing', description: 'Ability to detect nearby titans through unknown means', rank: 'Rare', base_cp: 240, base_price: 1900 },
        { name: 'Enhanced Reflexes', description: 'Lightning-fast reaction times in combat', rank: 'Rare', base_cp: 260, base_price: 2000 },
        { name: 'Partial Transformation', description: 'Limited titan transformation of body parts', rank: 'Rare', base_cp: 290, base_price: 2300 },
        { name: 'Memory Resistance', description: 'Natural resistance to memory manipulation', rank: 'Rare', base_cp: 250, base_price: 1950 },
        { name: 'Enhanced Endurance', description: 'Vastly improved stamina and fatigue resistance', rank: 'Rare', base_cp: 240, base_price: 1850 },
        { name: 'Bloodline Awakening', description: 'Unlocked genetic potential from ancestral bloodline', rank: 'Rare', base_cp: 300, base_price: 2400 },
        { name: 'Thunder Spear Mastery', description: 'Expert handling of explosive anti-titan weaponry', rank: 'Rare', base_cp: 220, base_price: 1750 },
        { name: 'Coordinate Prediction', description: 'Ability to predict enemy movement patterns', rank: 'Rare', base_cp: 250, base_price: 2000 },
        { name: 'Adrenaline Surge', description: 'Temporary massive boost to physical capabilities', rank: 'Rare', base_cp: 280, base_price: 2200 },
        { name: 'Tactical Genius', description: 'Enhanced strategic thinking and battlefield analysis', rank: 'Rare', base_cp: 260, base_price: 2050 },
        { name: 'Wall Combat Specialist', description: 'Master of vertical maneuvering and wall-based fighting', rank: 'Rare', base_cp: 270, base_price: 2100 },
        { name: 'Beast Taming', description: 'Ability to communicate with and command animals', rank: 'Rare', base_cp: 230, base_price: 1800 },
        { name: 'Titan Coordination', description: 'Command and control over mindless titans', rank: 'Rare', base_cp: 128, base_price: 2150 },
        { name: 'Enhanced Endurance', description: 'Superhuman stamina and fatigue resistance', rank: 'Rare', base_cp: 114, base_price: 1850 },
        { name: 'Crystallization', description: 'Ability to encase oneself in hardened crystal', rank: 'Rare', base_cp: 132, base_price: 2250 },
        { name: 'Titan Scream', description: 'Powerful roar that can summon or control titans', rank: 'Rare', base_cp: 126, base_price: 2100 },
        { name: 'Enhanced Agility', description: 'Supernatural speed and acrobatic abilities', rank: 'Rare', base_cp: 120, base_price: 2000 },
        { name: 'Titan Mimicry', description: 'Ability to copy other titan abilities temporarily', rank: 'Rare', base_cp: 133, base_price: 2280 },
        { name: 'Heat Resistance', description: 'Immunity to extreme temperatures and steam', rank: 'Rare', base_cp: 112, base_price: 1820 },
        { name: 'Enhanced Senses', description: 'Dramatically improved sight, hearing, and smell', rank: 'Rare', base_cp: 116, base_price: 1900 },
        { name: 'Titan Extraction', description: 'Ability to extract humans from titan bodies', rank: 'Rare', base_cp: 124, base_price: 2080 },
        { name: 'Bone Manipulation', description: 'Control over bone structure and density', rank: 'Rare', base_cp: 129, base_price: 2180 },
        { name: 'Titan Camouflage', description: 'Ability to blend with titan appearance', rank: 'Rare', base_cp: 117, base_price: 1930 },
        { name: 'Enhanced Durability', description: 'Increased resistance to physical damage', rank: 'Rare', base_cp: 121, base_price: 2020 },
        { name: 'Titan Communication', description: 'Telepathic link with other titan shifters', rank: 'Rare', base_cp: 123, base_price: 2070 },
        { name: 'Size Manipulation', description: 'Limited control over titan form size', rank: 'Rare', base_cp: 131, base_price: 2220 },
        { name: 'Titan Fusion', description: 'Temporary combination with other titan powers', rank: 'Rare', base_cp: 134, base_price: 2300 },
        { name: 'Enhanced Intelligence', description: 'Retained human intelligence in titan form', rank: 'Rare', base_cp: 119, base_price: 1980 },
        
        // Epic Rank (24 powers)
        { name: 'Armored Titan Power', description: 'Massive armored form with incredible defensive capabilities', rank: 'Epic', base_cp: 250, base_price: 8000 },
        { name: 'Colossal Titan Power', description: 'Enormous size with devastating steam attacks', rank: 'Epic', base_cp: 280, base_price: 9000 },
        { name: 'Female Titan Power', description: 'Agile titan form with hardening and calling abilities', rank: 'Epic', base_cp: 230, base_price: 7500 },
        { name: 'Beast Titan Power', description: 'Intelligent titan with throwing and commanding abilities', rank: 'Epic', base_cp: 260, base_price: 8500 },
        { name: 'Warrior Titan Training', description: 'Marleyan warrior combat techniques and discipline', rank: 'Epic', base_cp: 240, base_price: 7800 },
        { name: 'Eldian Restoration', description: 'Power to restore Eldian memories and abilities', rank: 'Epic', base_cp: 255, base_price: 8200 },
        { name: 'Wall Titan Command', description: 'Control over the colossal titans within the walls', rank: 'Epic', base_cp: 270, base_price: 8800 },
        { name: 'Titan Serum Creation', description: 'Ability to create and modify titan transformation serum', rank: 'Epic', base_cp: 245, base_price: 7900 },
        { name: 'Memory Inheritance', description: 'Access to memories of previous power holders', rank: 'Epic', base_cp: 235, base_price: 7600 },
        { name: 'Coordinate Fragments', description: 'Partial access to the Founding Titan\'s coordinate power', rank: 'Epic', base_cp: 275, base_price: 8900 },
        { name: 'Anti-Titan Weaponry', description: 'Mastery of advanced anti-titan combat technology', rank: 'Epic', base_cp: 225, base_price: 7300 },
        { name: 'Titan Shifter Mastery', description: 'Perfect control over titan transformation abilities', rank: 'Epic', base_cp: 265, base_price: 8600 },
        { name: 'Marleyan Technology', description: 'Advanced military technology and tactics', rank: 'Epic', base_cp: 220, base_price: 7200 },
        { name: 'Eldian Heritage', description: 'Awakened connection to the Eldian bloodline', rank: 'Epic', base_cp: 250, base_price: 8000 },
        { name: 'Titan Research', description: 'Deep understanding of titan biology and weaknesses', rank: 'Epic', base_cp: 230, base_price: 7500 },
        { name: 'War Hammer Creation', description: 'Ability to create weapons from hardened titan material', rank: 'Epic', base_cp: 260, base_price: 8500 },
        { name: 'Paradis Technology', description: 'Island devil technology and innovations', rank: 'Epic', base_cp: 235, base_price: 7600 },
        { name: 'Titan Experiments', description: 'Knowledge from horrific titan experimentation', rank: 'Epic', base_cp: 240, base_price: 7800 },
        { name: 'Royal Guard Training', description: 'Elite protection techniques for royal bloodline', rank: 'Epic', base_cp: 245, base_price: 7900 },
        { name: 'Titan Cult Knowledge', description: 'Secret knowledge from titan-worshipping cults', rank: 'Epic', base_cp: 255, base_price: 8200 },
        { name: 'Anti-Personnel ODM', description: 'Advanced ODM gear designed for human combat', rank: 'Epic', base_cp: 225, base_price: 7300 },
        { name: 'Titan Serum Immunity', description: 'Resistance to forced titan transformation', rank: 'Epic', base_cp: 265, base_price: 8600 },
        { name: 'Marley Warrior Spirit', description: 'Unbreakable will forged in Marleyan training', rank: 'Epic', base_cp: 270, base_price: 8800 },
        { name: 'Eldian Resistance', description: 'Underground resistance movement tactics', rank: 'Epic', base_cp: 250, base_price: 8000 },
        
        // Legendary Rank (24 powers)
        { name: 'Attack Titan Power', description: 'The Attack Titan with future memory inheritance', rank: 'Legendary', base_cp: 400, base_price: 25000 },
        { name: 'Warhammer Titan Power', description: 'Create weapons and structures from hardened titan material', rank: 'Legendary', base_cp: 420, base_price: 27000 },
        { name: 'Jaw Titan Power', description: 'Swift titan with powerful jaws and claws', rank: 'Legendary', base_cp: 380, base_price: 23000 },
        { name: 'Cart Titan Power', description: 'Endurance-focused titan with equipment carrying capability', rank: 'Legendary', base_cp: 350, base_price: 20000 },
        { name: 'Progenitor Titan Fragment', description: 'Incomplete fragment of the original Founding Titan', rank: 'Legendary', base_cp: 450, base_price: 30000 },
        { name: 'Ymir\'s Curse Breaking', description: 'Ability to partially break the 13-year curse', rank: 'Legendary', base_cp: 430, base_price: 28000 },
        { name: 'Paths Manipulation', description: 'Limited control over the invisible paths connecting Eldians', rank: 'Legendary', base_cp: 410, base_price: 26000 },
        { name: 'Titan Shifter Evolution', description: 'Evolved form of any of the Nine Titans', rank: 'Legendary', base_cp: 395, base_price: 24500 },
        { name: 'Marleyan Titan Science', description: 'Advanced understanding of titan biology and control', rank: 'Legendary', base_cp: 375, base_price: 22500 },
        { name: 'Eldian King\'s Will', description: 'Manifestation of the first king\'s pacifist ideology', rank: 'Legendary', base_cp: 440, base_price: 29000 },
        { name: 'Titan War Memories', description: 'Access to memories from the Great Titan War', rank: 'Legendary', base_cp: 385, base_price: 23500 },
        { name: 'Nine Titans Harmony', description: 'Ability to briefly unify powers of multiple titans', rank: 'Legendary', base_cp: 460, base_price: 31000 },
        { name: 'Coordinate Mastery', description: 'Advanced manipulation of the Founding Titan\'s coordinate', rank: 'Legendary', base_cp: 435, base_price: 28500 },
        { name: 'Titan Transformation Override', description: 'Ability to force or prevent titan transformations', rank: 'Legendary', base_cp: 405, base_price: 25500 },
        { name: 'Ancestral Titan Power', description: 'Connection to the power of ancient titan shifters', rank: 'Legendary', base_cp: 390, base_price: 24000 },
        { name: 'Paths Communication', description: 'Direct communication through the paths dimension', rank: 'Legendary', base_cp: 415, base_price: 26500 },
        { name: 'Titan Nexus Control', description: 'Control over the central point connecting all titans', rank: 'Legendary', base_cp: 455, base_price: 30500 },
        { name: 'Marley Military Command', description: 'Supreme authority over Marleyan military forces', rank: 'Legendary', base_cp: 365, base_price: 21500 },
        { name: 'Eldian Bloodline Purity', description: 'Purest connection to the original Eldian bloodline', rank: 'Legendary', base_cp: 425, base_price: 27500 },
        { name: 'Titan Serum Mastery', description: 'Ultimate control over titan transformation serums', rank: 'Legendary', base_cp: 380, base_price: 23000 },
        { name: 'Wall Titan Awakening', description: 'Power to awaken the colossal titans in the walls', rank: 'Legendary', base_cp: 445, base_price: 29500 },
        { name: 'Rumbling Preparation', description: 'Ability to prepare for the ultimate titan awakening', rank: 'Legendary', base_cp: 465, base_price: 31500 },
        { name: 'Titan Shifter Perfection', description: 'Perfect mastery of all titan transformation abilities', rank: 'Legendary', base_cp: 400, base_price: 25000 },
        { name: 'Paths Dimension Access', description: 'Direct access to the paths dimension realm', rank: 'Legendary', base_cp: 420, base_price: 27000 },
        
        // Mythic Rank (23 powers)
        { name: 'Founding Titan Power', description: 'The ultimate power to control all titans and coordinate', rank: 'Mythic', base_cp: 800, base_price: 100000 },
        { name: 'Ackerman Bloodline', description: 'Awakened Ackerman powers with superhuman combat abilities', rank: 'Mythic', base_cp: 750, base_price: 90000 },
        { name: 'Royal Blood', description: 'Royal Fritz bloodline with titan commanding authority', rank: 'Mythic', base_cp: 700, base_price: 85000 },
        { name: 'Ymir\'s Original Power', description: 'The source of all titan powers from the first titan', rank: 'Mythic', base_cp: 900, base_price: 120000 },
        { name: 'Paths Dimension Mastery', description: 'Complete control over the paths connecting all Eldians', rank: 'Mythic', base_cp: 850, base_price: 110000 },
        { name: 'Coordinate Absolute', description: 'Unlimited power to coordinate and control all titans', rank: 'Mythic', base_cp: 820, base_price: 105000 },
        { name: 'Rumbling Command', description: 'Ultimate authority to unleash the wall titans', rank: 'Mythic', base_cp: 880, base_price: 115000 },
        { name: 'Titan Curse Origin', description: 'Connection to the original source of the titan curse', rank: 'Mythic', base_cp: 780, base_price: 95000 },
        { name: 'Eldian Progenitor', description: 'Direct descendant of the original Eldian people', rank: 'Mythic', base_cp: 760, base_price: 92000 },
        { name: 'Nine Titans Unity', description: 'Ability to combine all nine titan powers simultaneously', rank: 'Mythic', base_cp: 950, base_price: 130000 },
        { name: 'Ymir\'s Bloodline', description: 'Direct connection to Ymir Fritz, the first titan', rank: 'Mythic', base_cp: 870, base_price: 112000 },
        { name: 'Paths Tree Control', description: 'Mastery over the tree that connects all paths', rank: 'Mythic', base_cp: 840, base_price: 108000 },
        { name: 'Titan Genesis', description: 'Power to create new types of titans', rank: 'Mythic', base_cp: 810, base_price: 102000 },
        { name: 'Coordinate Transcendence', description: 'Power that transcends the coordinate itself', rank: 'Mythic', base_cp: 890, base_price: 118000 },
        { name: 'Eldian God Authority', description: 'Divine authority over all Eldian people', rank: 'Mythic', base_cp: 830, base_price: 107000 },
        { name: 'Titan Dimension Gateway', description: 'Ability to open gateways to the titan realm', rank: 'Mythic', base_cp: 770, base_price: 93000 },
        { name: 'Progenitor\'s Will', description: 'Manifestation of Ymir Fritz\'s original will', rank: 'Mythic', base_cp: 860, base_price: 111000 },
        { name: 'Paths Omniscience', description: 'All-knowing awareness through the paths network', rank: 'Mythic', base_cp: 800, base_price: 100000 },
        { name: 'Titan Apocalypse', description: 'Ultimate power to end or reshape the world', rank: 'Mythic', base_cp: 920, base_price: 125000 },
        { name: 'Curse Transcendence', description: 'Power to transcend the 13-year titan curse', rank: 'Mythic', base_cp: 790, base_price: 97000 },
        { name: 'Founding Authority', description: 'Supreme authority over all titan-related powers', rank: 'Mythic', base_cp: 880, base_price: 115000 },
        { name: 'Paths Omnipotence', description: 'Unlimited power within the paths dimension', rank: 'Mythic', base_cp: 940, base_price: 128000 },
        { name: 'Titan Singularity', description: 'The ultimate convergence of all titan powers', rank: 'Mythic', base_cp: 1000, base_price: 150000 }
    ];

    for (const power of defaultPowers) {
        await connection.execute(
            'INSERT INTO powers (name, description, rank, base_cp, base_price) VALUES (?, ?, ?, ?, ?)',
            [power.name, power.description, power.rank, power.base_cp, power.base_price]
        );
    }

    logger.info(`Inserted ${defaultPowers.length} default powers`);
}

/**
 * Get user by Discord ID
 */
async function getUserByDiscordId(discordId) {
    const [rows] = await pool.execute(`
        SELECT u.*, 
               COALESCE(up.combat_power, 0) + COALESCE(u.bonus_cp, 0) as total_cp
        FROM users u
        LEFT JOIN user_powers up ON u.equipped_power_id = up.power_id AND up.user_id = u.id
        WHERE u.discord_id = ?
    `, [discordId]);
    
    return rows[0] || null;
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
    const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
    );
    return rows[0] || null;
}

/**
 * Get user by arena rank
 */
async function getUserByArenaRank(rank) {
    const [rows] = await pool.execute(`
        SELECT u.* FROM users u 
        JOIN arena_rankings ar ON u.id = ar.user_id 
        WHERE ar.rank_position = ?
    `, [rank]);
    return rows[0] || null;
}

/**
 * Create new user
 */
async function createUser(discordId, username, hashedPassword) {
    const [result] = await pool.execute(
        'INSERT INTO users (discord_id, username, password_hash, creator_discord_id) VALUES (?, ?, ?, ?)',
        [discordId, username, hashedPassword, discordId]
    );
    return result.insertId;
}

/**
 * Update user statistics
 */
async function updateUserStats(userId, stats) {
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(stats)) {
        updates.push(`${key} = ?`);
        values.push(value);
    }
    
    if (updates.length === 0) return;
    
    values.push(userId);
    
    await pool.execute(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
    );

    // Level system removed
}

// Level system removed

// Level calculation function removed

/**
 * Update user coins (ATOMIC VERSION) with cache invalidation
 */
async function updateUserCoins(userId, amount) {
    const result = await atomicOperations.executeWithLock(async (connection) => {
        await connection.execute(
            'UPDATE users SET coins = coins + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [amount, userId]
        );
    }, `coins_${userId}`);
    
    return result;
}

/**
 * Update user bank balance
 */
async function updateUserBank(userId, amount) {
    return atomicOperations.executeWithLock(async (connection) => {
        await connection.execute(
            'UPDATE users SET bank_balance = bank_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [amount, userId]
        );
    }, `bank_${userId}`);
}

// addUserCP function removed - CP purchasing discontinued

/**
 * Get all powers
 */
async function getAllPowers() {
    const [rows] = await pool.execute('SELECT * FROM powers ORDER BY rank, base_price');
    return rows;
}

/**
 * Get user's powers
 */
async function getUserPowers(userId) {
    const [rows] = await pool.execute(`
        SELECT up.id as user_power_id, up.power_id, up.combat_power, up.rank,
               p.name, p.description
        FROM user_powers up
        JOIN powers p ON up.power_id = p.id
        WHERE up.user_id = ?
        ORDER BY up.combat_power DESC
    `, [userId]);
    
    return rows;
}

/**
 * Add power to user with cache invalidation
 */
async function addUserPower(userId, powerId, combatPower) {
    const { determineRankByCP } = require('./databaseHelpers');
    const rank = await determineRankByCP(combatPower);
    
    await pool.execute(
        'INSERT INTO user_powers (user_id, power_id, combat_power, rank) VALUES (?, ?, ?, ?)',
        [userId, powerId, combatPower, rank]
    );
}

/**
 * Equip power (ATOMIC VERSION)
 */
async function equipPower(userId, powerId) {
    return atomicOperations.atomicEquipPower(userId, powerId);
}

/**
 * Unequip power
 */
async function unequipPower(userId) {
    await pool.execute(
        'UPDATE users SET equipped_power_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
    );
}

/**
 * Purchase power from store
 */
async function purchasePower(userId, powerId, combatPower, price) {
    return atomicOperations.executeWithLock(async (connection) => {
        // Check if user has enough coins
        const [userResult] = await connection.execute(
            'SELECT coins FROM users WHERE id = ?',
            [userId]
        );
        
        if (userResult.length === 0) {
            throw new Error('User not found');
        }
        
        if (userResult[0].coins < price) {
            throw new Error('Insufficient coins');
        }
        
        // Deduct coins
        await connection.execute(
            'UPDATE users SET coins = coins - ? WHERE id = ?',
            [price, userId]
        );
        
        // Calculate correct rank for the combat power
        const { determineRankByCP } = require('./databaseHelpers');
        const correctRank = await determineRankByCP(combatPower);
        
        // Add power with correct rank
        await connection.execute(
            'INSERT INTO user_powers (user_id, power_id, combat_power, rank) VALUES (?, ?, ?, ?)',
            [userId, powerId, combatPower, correctRank]
        );
        
        return { success: true, newBalance: userResult[0].coins - price };
    }, `purchase_${userId}`);
}

/**
 * Evolve power (Enhanced for Advanced Evolution System)
 */
async function evolvePower(userPowerId, newName, newDescription, newRank, newCP) {
    const { determineRankByCP } = require('./databaseHelpers');
    
    // Ensure parameters are not undefined
    const safeName = newName || 'Evolved Power';
    const safeDescription = newDescription || 'A powerful evolved ability';
    const safeCP = newCP || 100;
    const safeUserPowerId = userPowerId || null;
    
    if (!safeUserPowerId) {
        throw new Error('User power ID is required for evolution');
    }
    
    // Calculate correct rank based on CP
    const correctRank = await determineRankByCP(safeCP);
    
    // Create new power entry with correct rank
    const [powerResult] = await pool.execute(
        'INSERT INTO powers (name, description, rank, base_cp) VALUES (?, ?, ?, ?)',
        [safeName, safeDescription, correctRank, safeCP]
    );
    
    const newPowerId = powerResult.insertId;
    
    // Update user's power with correct rank
    await pool.execute(
        'UPDATE user_powers SET power_id = ?, combat_power = ?, rank = ? WHERE id = ?',
        [newPowerId, safeCP, correctRank, safeUserPowerId]
    );
}

/**
 * Remove power from user
 */
async function removePower(userPowerId) {
    if (!userPowerId) {
        throw new Error('User power ID is required for removal');
    }
    
    await pool.execute(
        'DELETE FROM user_powers WHERE id = ?',
        [userPowerId]
    );
}

/**
 * Get arena rankings
 */
async function getArenaRankings(limit = 200) {
    const [rows] = await pool.execute(`
        SELECT 
            u.username, u.level, u.battles_won, u.battles_lost,
            ar.rank_position, 
            COALESCE(up.combat_power, 0) as equipped_power_cp,
            COALESCE(up.combat_power, 0) + COALESCE(u.bonus_cp, 0) as total_combat_power
        FROM arena_rankings ar
        JOIN users u ON ar.user_id = u.id
        LEFT JOIN user_powers up ON u.equipped_power_id = up.id AND up.user_id = u.id
        ORDER BY ar.rank_position
        LIMIT ?
    `, [limit]);
    return rows;
}

/**
 * Get user's arena rank
 */
async function getUserArenaRank(userId) {
    const [rows] = await pool.execute(
        'SELECT rank_position FROM arena_rankings WHERE user_id = ?',
        [userId]
    );
    return rows[0]?.rank_position || null;
}

/**
 * Update arena ranking after PvP battle
 */
async function updateArenaRanking(winnerId, loserId) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Get current ranks
        const [winnerRank] = await connection.execute(
            'SELECT rank_position FROM arena_rankings WHERE user_id = ?',
            [winnerId]
        );
        const [loserRank] = await connection.execute(
            'SELECT rank_position FROM arena_rankings WHERE user_id = ?',
            [loserId]
        );
        
        // If winner doesn't have rank, add them
        if (winnerRank.length === 0) {
            const [maxRank] = await connection.execute(
                'SELECT COALESCE(MAX(rank_position), 0) + 1 as next_rank FROM arena_rankings'
            );
            await connection.execute(
                'INSERT INTO arena_rankings (user_id, rank_position, total_cp) VALUES (?, ?, ?)',
                [winnerId, maxRank[0].next_rank, 0]
            );
        }
        
        // If loser doesn't have rank, add them  
        if (loserRank.length === 0) {
            const [maxRank] = await connection.execute(
                'SELECT COALESCE(MAX(rank_position), 0) + 1 as next_rank FROM arena_rankings'
            );
            await connection.execute(
                'INSERT INTO arena_rankings (user_id, rank_position, total_cp) VALUES (?, ?, ?)',
                [loserId, maxRank[0].next_rank, 0]
            );
        }
        
        // If loser has a rank and winner's rank is lower (higher number), swap them
        if (loserRank.length > 0 && winnerRank.length > 0) {
            const winnerPos = winnerRank[0].rank_position;
            const loserPos = loserRank[0].rank_position;
            
            if (winnerPos > loserPos) {
                // Use temporary position to avoid unique constraint violation
                const tempPos = -1;
                
                // Move winner to temp position first
                await connection.execute(
                    'UPDATE arena_rankings SET rank_position = ? WHERE user_id = ?',
                    [tempPos, winnerId]
                );
                
                // Move loser to winner's old position
                await connection.execute(
                    'UPDATE arena_rankings SET rank_position = ? WHERE user_id = ?',
                    [winnerPos, loserId]
                );
                
                // Move winner to loser's old position
                await connection.execute(
                    'UPDATE arena_rankings SET rank_position = ? WHERE user_id = ?',
                    [loserPos, winnerId]
                );
            }
        }
        
        // Update total CP for both users
        await updateUserTotalCP(connection, winnerId);
        await updateUserTotalCP(connection, loserId);
        
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Update user's total CP in arena rankings
 */
async function updateUserTotalCP(connection, userId) {
    const [userCP] = await connection.execute(`
        SELECT 
            COALESCE(up.combat_power, 0) + COALESCE(u.bonus_cp, 0) as total_cp
        FROM users u
        LEFT JOIN user_powers up ON u.equipped_power_id = up.power_id AND up.user_id = u.id
        WHERE u.id = ?
    `, [userId]);
    
    if (userCP.length > 0) {
        await connection.execute(
            'UPDATE arena_rankings SET total_cp = ? WHERE user_id = ?',
            [userCP[0].total_cp, userId]
        );
    }
}

/**
 * Get top 10 arena players for daily rewards
 */
async function getTop10ArenaPlayers() {
    const [rows] = await pool.execute(`
        SELECT ar.user_id, ar.rank_position, u.discord_id, u.username
        FROM arena_rankings ar
        JOIN users u ON ar.user_id = u.id
        WHERE ar.rank_position <= 10
        ORDER BY ar.rank_position
    `);
    return rows;
}

/**
 * Check command cooldown (only checks, never sets)
 */
async function checkCooldown(userId, commandName, cooldownSeconds, setCooldownOnCheck = false) {
    // Clean expired cooldowns
    await pool.execute(
        'DELETE FROM command_cooldowns WHERE expires_at < NOW()'
    );
    
    // Check if user has active cooldown
    const [rows] = await pool.execute(
        'SELECT expires_at FROM command_cooldowns WHERE user_id = ? AND command_name = ?',
        [userId, commandName]
    );
    
    if (rows.length > 0) {
        const timeLeft = new Date(rows[0].expires_at) - new Date();
        if (timeLeft > 0) {
            return { 
                canUse: false, 
                timeLeft: Math.max(0, timeLeft),
                onCooldown: true
            };
        }
    }
    
    return { 
        canUse: true, 
        timeLeft: 0,
        onCooldown: false
    };
}

/**
 * Set cooldown after successful command execution
 */
async function setCooldownAfterSuccess(userId, commandName, cooldownSeconds) {
    // Only set cooldown if it's greater than 0
    if (cooldownSeconds > 0) {
        const expiresAt = new Date(Date.now() + cooldownSeconds * 1000);
        await pool.execute(
            'INSERT INTO command_cooldowns (user_id, command_name, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires_at = ?',
            [userId, commandName, expiresAt, expiresAt]
        );
    }
}

/**
 * Login user to account
 */
async function loginUser(discordId, username, password) {
    // Check if account exists
    const user = await getUserByUsername(username);
    if (!user) {
        return { success: false, error: 'Account not found' };
    }

    // Check if account is already logged in by another Discord user
    if (user.discord_id !== discordId) {
        // Skip check if account is in logged out state
        if (!user.discord_id.endsWith('_LOGGED_OUT')) {
            const currentSession = await getUserByDiscordId(user.discord_id);
            if (currentSession && currentSession.username === username) {
                return { 
                    success: false, 
                    error: 'Account is already logged in by another user',
                    loggedInBy: user.discord_id
                };
            }
        }
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
        return { success: false, error: 'Invalid password' };
    }

    // Update discord_id to current user (login session)
    await pool.execute(
        'UPDATE users SET discord_id = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
        [discordId, username]
    );

    // Return updated user data
    const updatedUser = await getUserByUsername(username);
    return { success: true, user: updatedUser };
}

/**
 * Logout user
 */
async function logoutUser(discordId) {
    // Set discord_id to a unique logged-out state using creator_discord_id with '_LOGGED_OUT' suffix
    // This ensures the account is not accessible by any Discord user until they log back in
    
    // First get the user's creator_discord_id
    const [userRows] = await pool.execute(
        'SELECT creator_discord_id FROM users WHERE discord_id = ?',
        [discordId]
    );
    
    if (userRows.length > 0) {
        const loggedOutId = userRows[0].creator_discord_id + '_LOGGED_OUT';
        await pool.execute(
            'UPDATE users SET discord_id = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?',
            [loggedOutId, discordId]
        );
    }
}

/**
 * Change user password
 */
async function changePassword(discordId, currentPassword, newPassword) {
    const user = await getUserByDiscordId(discordId);
    if (!user) {
        return { success: false, error: 'User not found' };
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
        return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.execute(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?',
        [hashedNewPassword, discordId]
    );

    return { success: true };
}

/**
 * Update user power CP
 */
async function updateUserPowerCP(userPowerId, newCP) {
    await pool.execute(
        'UPDATE user_powers SET combat_power = ? WHERE id = ?',
        [newCP, userPowerId]
    );
}

/**
 * Update user gacha draws with cache invalidation
 */
async function updateUserGachaDraws(userId, amount) {
    const result = await atomicOperations.executeWithLock(async (connection) => {
        await connection.execute(
            'UPDATE users SET gacha_draws = gacha_draws + ? WHERE id = ?',
            [amount, userId]
        );
    }, `gacha_${userId}`);
    
    return result;
}

/**
 * Perform gacha draw (ATOMIC VERSION)
 */
async function performGachaDraw(userId, drawType = 'paid') {
    return atomicOperations.atomicGachaDraw(userId, drawType);
}

/**
 * Get gacha history for user
 */
async function getGachaHistory(userId, limit = 10) {
    const [results] = await pool.execute(
        'SELECT * FROM gacha_history WHERE user_id = ? ORDER BY drawn_at DESC LIMIT ?',
        [userId, limit]
    );
    
    return results;
}

/**
 * Get user's equipped power by user power ID
 */
async function getUserPowerById(userPowerId) {
    const [rows] = await pool.execute(`
        SELECT up.id as user_power_id, up.power_id, up.combat_power, 
               p.name, p.description, p.rank 
        FROM user_powers up
        JOIN powers p ON up.power_id = p.id
        WHERE up.id = ?
    `, [userPowerId]);
    return rows[0] || null;
}

// Enhanced security wrapper for database operations
const secureDbWrapper = {
    // Secure user operations
    async createUser(discordId, username, password, creatorDiscordId) {
        const startTime = Date.now();
        try {
            // Rate limiting
            const rateLimitResult = securityManager.checkRateLimit(discordId, 'createUser');
            if (!rateLimitResult.allowed) {
                throw new Error(rateLimitResult.error);
            }

            // Input validation
            const validation = securityManager.validateQueryParams({
                discord_id: discordId,
                username: username,
                password: password,
                creator_discord_id: creatorDiscordId
            });

            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            const result = await createUser(validation.params.discord_id, validation.params.username, validation.params.password, validation.params.creator_discord_id);
            
            performanceMonitor.recordCommandExecution('createUser', Date.now() - startTime, true);
            return result;
        } catch (error) {
            performanceMonitor.recordCommandExecution('createUser', Date.now() - startTime, false);
            throw await errorHandler.handleDatabaseError(error, 'createUser');
        }
    },

    async getUserByDiscordId(discordId) {
        const startTime = Date.now();
        try {
            if (!securityManager.validateDiscordId(discordId)) {
                throw new Error('Invalid Discord ID format');
            }
            
            const result = await getUserByDiscordId(discordId);
            performanceMonitor.recordCommandExecution('getUserByDiscordId', Date.now() - startTime, true);
            return result;
        } catch (error) {
            performanceMonitor.recordCommandExecution('getUserByDiscordId', Date.now() - startTime, false);
            throw await errorHandler.handleDatabaseError(error, 'getUserByDiscordId');
        }
    },

    async updateUserStats(userId, stats) {
        const startTime = Date.now();
        try {
            // Validate user ID
            const userIdNum = securityManager.validateNumber(userId, 1, Number.MAX_SAFE_INTEGER);
            if (userIdNum === null) {
                throw new Error('Invalid user ID');
            }

            // Validate stats object
            const validation = securityManager.validateQueryParams(stats);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            const result = await updateUserStats(userIdNum, validation.params);
            performanceMonitor.recordCommandExecution('updateUserStats', Date.now() - startTime, true);
            return result;
        } catch (error) {
            performanceMonitor.recordCommandExecution('updateUserStats', Date.now() - startTime, false);
            throw await errorHandler.handleDatabaseError(error, 'updateUserStats');
        }
    },

    async updateUserCoins(userId, amount) {
        const startTime = Date.now();
        try {
            const userIdNum = securityManager.validateNumber(userId, 1, Number.MAX_SAFE_INTEGER);
            const amountNum = securityManager.validateNumber(amount, -1000000, 1000000);
            
            if (userIdNum === null || amountNum === null) {
                throw new Error('Invalid parameters for coin update');
            }

            const result = await updateUserCoins(userIdNum, amountNum);
            performanceMonitor.recordCommandExecution('updateUserCoins', Date.now() - startTime, true);
            return result;
        } catch (error) {
            performanceMonitor.recordCommandExecution('updateUserCoins', Date.now() - startTime, false);
            throw await errorHandler.handleDatabaseError(error, 'updateUserCoins');
        }
    },

    async addUserPower(userId, powerId, combatPower) {
        const startTime = Date.now();
        try {
            const userIdNum = securityManager.validateNumber(userId, 1, Number.MAX_SAFE_INTEGER);
            const powerIdNum = securityManager.validateNumber(powerId, 1, Number.MAX_SAFE_INTEGER);
            const cpNum = securityManager.validateNumber(combatPower, 1, 1000000);
            
            if (userIdNum === null || powerIdNum === null || cpNum === null) {
                throw new Error('Invalid parameters for power addition');
            }

            const result = await addUserPower(userIdNum, powerIdNum, cpNum);
            performanceMonitor.recordCommandExecution('addUserPower', Date.now() - startTime, true);
            return result;
        } catch (error) {
            performanceMonitor.recordCommandExecution('addUserPower', Date.now() - startTime, false);
            throw await errorHandler.handleDatabaseError(error, 'addUserPower');
        }
    },

    async performGachaDraw(userId, drawType = 'free') {
        const startTime = Date.now();
        try {
            // Rate limiting for gacha draws
            const rateLimitResult = securityManager.checkRateLimit(userId, 'gachaDraw');
            if (!rateLimitResult.allowed) {
                throw new Error(rateLimitResult.error);
            }

            const userIdNum = securityManager.validateNumber(userId, 1, Number.MAX_SAFE_INTEGER);
            if (userIdNum === null) {
                throw new Error('Invalid user ID for gacha draw');
            }

            const result = await performGachaDraw(userIdNum, drawType);
            performanceMonitor.recordCommandExecution('performGachaDraw', Date.now() - startTime, true);
            return result;
        } catch (error) {
            performanceMonitor.recordCommandExecution('performGachaDraw', Date.now() - startTime, false);
            throw await errorHandler.handleDatabaseError(error, 'performGachaDraw');
        }
    }
};

module.exports = {
    initializeDatabase,
    getUserByDiscordId: secureDbWrapper.getUserByDiscordId,
    getUserByUsername,
    getUserByArenaRank,
    createUser: secureDbWrapper.createUser,
    updateUserStats: secureDbWrapper.updateUserStats,
    updateUserCoins: secureDbWrapper.updateUserCoins,
    updateUserBank,
    // addUserCP removed
    getAllPowers,
    getUserPowers,
    getUserPowerById,
    addUserPower: secureDbWrapper.addUserPower,
    equipPower,
    unequipPower,
    purchasePower,
    evolvePower,
    removePower,
    getArenaRankings,
    getUserArenaRank,
    updateArenaRanking,
    getTop10ArenaPlayers,
    checkCooldown,
    setCooldownAfterSuccess,

    loginUser,
    logoutUser,
    changePassword,
    updateUserPowerCP,
    updateUserGachaDraws,
    performGachaDraw: secureDbWrapper.performGachaDraw,
    getGachaHistory,
    
    // Security utilities
    securityManager,
    errorHandler,
    performanceMonitor
};
