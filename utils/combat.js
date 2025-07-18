const logger = require('./logger');
const { pool } = require('../config/database');
const { enemyTypes, enemyDescriptions } = require('../data');

/**
 * Get enemies from database by rank
 */
async function getEnemiesByRank(rank) {
    const connection = await pool.getConnection();
    try {
        const [enemies] = await connection.execute(
            'SELECT * FROM combat_enemies WHERE rank = ?',
            [rank]
        );
        return enemies;
    } catch (error) {
        logger.error('Error fetching enemies from database:', error);
        return [];
    } finally {
        connection.release();
    }
}

// Remove hardcoded enemy types - now using database + fallback from data folder
const fallbackEnemyTypes = enemyTypes || {
    // Normal enemies (CP: 50-100)
    normal: [
        { name: 'Pure Titan', power: 70, type: 'titan', description: 'Mindless titan driven by hunger' },
        { name: 'Abnormal Titan', power: 80, type: 'titan', description: 'Unpredictable titan with unusual behavior' },
        { name: 'Marley Soldier', power: 60, type: 'human', description: 'Trained Marleyan military soldier' },
        { name: 'Garrison Soldier', power: 50, type: 'human', description: 'Wall defense specialist' },
        { name: 'Military Police', power: 65, type: 'human', description: 'Interior police force member' },
        { name: 'Scout Recruit', power: 55, type: 'human', description: 'New Survey Corps member' },
        { name: 'Wall Cultist', power: 45, type: 'human', description: 'Wall worshipper fanatic' },
        { name: 'Titan Researcher', power: 58, type: 'human', description: 'Scientist studying titans' },
        { name: 'Marley Cadet', power: 52, type: 'human', description: 'Marleyan military trainee' },
        { name: 'Underground Thug', power: 48, type: 'human', description: 'Criminal from underground city' },
        { name: 'Small Titan', power: 75, type: 'titan', description: '3-meter class titan' },
        { name: 'Wall Titan Fragment', power: 85, type: 'titan', description: 'Piece of wall titan' },
        { name: 'Eldian Restorationist', power: 62, type: 'human', description: 'Grisha\'s rebellion member' },
        { name: 'Marley Citizen', power: 40, type: 'human', description: 'Civilian turned hostile' },
        { name: 'Titan Worshipper', power: 56, type: 'human', description: 'Religious fanatic' },
        { name: 'Merchant Guard', power: 54, type: 'human', description: 'Caravan protector' },
        { name: 'Bandit Leader', power: 68, type: 'human', description: 'Outlaw gang leader' },
        { name: 'Titan Spotter', power: 46, type: 'human', description: 'Wall observation specialist' },
        { name: 'Marley Propagandist', power: 42, type: 'human', description: 'Anti-Eldian activist' },
        { name: 'Paradis Civilian', power: 35, type: 'human', description: 'Panicked island resident' }
    ],
    
    // Rare enemies (CP: 100-200)
    rare: [
        { name: 'Deviant Titan', power: 120, type: 'titan', description: 'Highly intelligent abnormal titan' },
        { name: 'Titan Shifter', power: 140, type: 'titan', description: 'Human with titan transformation ability' },
        { name: 'Marley Warrior', power: 130, type: 'human', description: 'Elite Marleyan warrior candidate' },
        { name: 'Kenny\'s Squad', power: 110, type: 'human', description: 'Anti-Personnel Control Squad member' },
        { name: 'Ackerman Descendant', power: 160, type: 'human', description: 'Awakened Ackerman bloodline' },
        { name: 'Royal Guard', power: 125, type: 'human', description: 'Fritz family protector' },
        { name: 'Titan Serum Subject', power: 135, type: 'titan', description: 'Experimental titan creation' },
        { name: 'Marley Commander', power: 155, type: 'human', description: 'High-ranking military officer' },
        { name: 'Scout Veteran', power: 145, type: 'human', description: 'Experienced Survey Corps member' },
        { name: 'Eldian Spy', power: 118, type: 'human', description: 'Double agent infiltrator' },
        { name: 'Titan Hybrid', power: 165, type: 'titan', description: 'Partially transformed human' },
        { name: 'Marley Scientist', power: 105, type: 'human', description: 'Titan research specialist' },
        { name: 'Underground King', power: 150, type: 'human', description: 'Ruler of underground city' },
        { name: 'Yeagerist Officer', power: 140, type: 'human', description: 'Eren faction commander' },
        { name: 'Titan Cultist', power: 115, type: 'human', description: 'Fanatical titan worshipper' },
        { name: 'Marley Infiltrator', power: 128, type: 'human', description: 'Paradis island spy' },
        { name: 'Enhanced Soldier', power: 138, type: 'human', description: 'Experimentally enhanced warrior' },
        { name: 'Titan Summoner', power: 122, type: 'human', description: 'Can attract titans' },
        { name: 'Wall Breach Titan', power: 148, type: 'titan', description: 'Titan that broke through walls' },
        { name: 'Marley Elite', power: 158, type: 'human', description: 'Top-tier Marleyan fighter' }
    ],
    
    // Epic enemies (CP: 200-400)
    epic: [
        { name: 'Rod Reiss Titan', power: 250, type: 'titan', description: 'Massive abnormal titan' },
        { name: 'Titan Cultist Leader', power: 220, type: 'human', description: 'Fanatical titan worshipper chief' },
        { name: 'Yeagerist Commander', power: 240, type: 'human', description: 'Eren Yeager faction leader' },
        { name: 'Marley General', power: 280, type: 'human', description: 'High-ranking Marleyan officer' },
        { name: 'Nine Titans Fragment', power: 320, type: 'titan', description: 'Piece of one of the Nine Titans' },
        { name: 'Titan Experiment Alpha', power: 290, type: 'titan', description: 'Advanced titan creation' },
        { name: 'Ackerman Warrior', power: 350, type: 'human', description: 'Fully awakened Ackerman fighter' },
        { name: 'Royal Bloodline', power: 300, type: 'human', description: 'Direct Fritz family descendant' },
        { name: 'Marley Warchief', power: 310, type: 'human', description: 'Supreme Marleyan commander' },
        { name: 'Titan Shifter Elite', power: 340, type: 'titan', description: 'Master of titan transformation' },
        { name: 'Wall Titan Shard', power: 270, type: 'titan', description: 'Fragment of colossal wall titan' },
        { name: 'Coordinate Fragment', power: 360, type: 'titan', description: 'Piece of Founding Titan power' },
        { name: 'Marley Titan Unit', power: 285, type: 'titan', description: 'Military titan squadron' },
        { name: 'Eldian King\'s Guard', power: 295, type: 'human', description: 'Ancient royal protector' },
        { name: 'Titan War Veteran', power: 330, type: 'human', description: 'Survivor of Great Titan War' },
        { name: 'Paths Manifestation', power: 315, type: 'titan', description: 'Entity from paths dimension' },
        { name: 'Marley Super Soldier', power: 275, type: 'human', description: 'Genetically enhanced warrior' },
        { name: 'Titan Fusion Beast', power: 345, type: 'titan', description: 'Multiple titans combined' },
        { name: 'Yeagerist Fanatic', power: 235, type: 'human', description: 'Extreme Eren loyalist' },
        { name: 'Underground Titan', power: 305, type: 'titan', description: 'Titan from beneath the city' }
    ],
    
    // Legendary enemies (CP: 400-600)
    legendary: [
        { name: 'Founding Titan Echo', power: 480, type: 'titan', description: 'Remnant of the Founding Titan' },
        { name: 'Marley Titan General', power: 450, type: 'human', description: 'Supreme titan warfare commander' },
        { name: 'Ackerman Clan Leader', power: 520, type: 'human', description: 'Head of the Ackerman family' },
        { name: 'Royal Fritz Heir', power: 490, type: 'human', description: 'Direct heir to royal bloodline' },
        { name: 'Coordinate Guardian', power: 550, type: 'titan', description: 'Protector of coordinate power' },
        { name: 'Titan Shifter Master', power: 470, type: 'titan', description: 'Perfect control over multiple titans' },
        { name: 'Marley War Machine', power: 440, type: 'human', description: 'Ultimate Marleyan weapon' },
        { name: 'Paths Warden', power: 580, type: 'titan', description: 'Guardian of paths dimension' },
        { name: 'Eldian Progenitor', power: 510, type: 'human', description: 'Ancient Eldian ancestor' },
        { name: 'Titan Nexus Core', power: 560, type: 'titan', description: 'Central titan connection point' },
        { name: 'Rumbling Herald', power: 530, type: 'titan', description: 'Precursor to the rumbling' },
        { name: 'Marley Titan Lord', power: 460, type: 'human', description: 'Master of all Marleyan titans' },
        { name: 'Wall Titan Prime', power: 495, type: 'titan', description: 'Original wall titan' },
        { name: 'Coordinate Keeper', power: 540, type: 'titan', description: 'Maintains coordinate stability' },
        { name: 'Titan King\'s Shadow', power: 485, type: 'titan', description: 'Reflection of ancient titan king' },
        { name: 'Marley Apex Warrior', power: 475, type: 'human', description: 'Peak of Marleyan evolution' },
        { name: 'Eldian Memory Keeper', power: 505, type: 'human', description: 'Holds ancient Eldian memories' },
        { name: 'Titan Dimension Gate', power: 570, type: 'titan', description: 'Portal to titan realm' },
        { name: 'Paths Sovereign', power: 590, type: 'titan', description: 'Ruler of paths dimension' },
        { name: 'Coordinate Overlord', power: 600, type: 'titan', description: 'Supreme coordinate authority' }
    ],
    
    // Mythic enemies (CP: 600-1000)
    mythic: [
        { name: 'Ymir Fritz Echo', power: 750, type: 'titan', description: 'Manifestation of the first titan' },
        { name: 'Coordinate Absolute', power: 820, type: 'titan', description: 'Ultimate coordinate power' },
        { name: 'Titan Progenitor', power: 680, type: 'titan', description: 'Source of all titans' },
        { name: 'Marley God-Emperor', power: 720, type: 'human', description: 'Divine Marleyan ruler' },
        { name: 'Eldian Titan King', power: 780, type: 'human', description: 'Ancient king of all Eldians' },
        { name: 'Paths Omnipotence', power: 890, type: 'titan', description: 'Ultimate paths entity' },
        { name: 'Founding Titan Prime', power: 850, type: 'titan', description: 'Original Founding Titan' },
        { name: 'Coordinate Genesis', power: 800, type: 'titan', description: 'Birth of coordinate power' },
        { name: 'Titan Apocalypse', power: 920, type: 'titan', description: 'End of titan era' },
        { name: 'Marley Final Weapon', power: 700, type: 'human', description: 'Ultimate Marleyan creation' },
        { name: 'Eldian Ancestor Spirit', power: 740, type: 'human', description: 'Ancient Eldian ghost' },
        { name: 'Rumbling Incarnate', power: 880, type: 'titan', description: 'Physical form of rumbling' },
        { name: 'Paths Transcendence', power: 950, type: 'titan', description: 'Beyond paths dimension' },
        { name: 'Titan Singularity', power: 990, type: 'titan', description: 'All titans unified' },
        { name: 'Coordinate Infinity', power: 1000, type: 'titan', description: 'Infinite coordinate power' },
        { name: 'Ymir\'s Will', power: 860, type: 'titan', description: 'Ymir Fritz\'s true intention' },
        { name: 'Marley Titan God', power: 760, type: 'human', description: 'Deified Marleyan titan user' },
        { name: 'Eldian Prime Soul', power: 810, type: 'human', description: 'Purest Eldian essence' },
        { name: 'Titan Omega', power: 940, type: 'titan', description: 'Final titan evolution' },
        { name: 'Paths Eternity', power: 970, type: 'titan', description: 'Eternal paths guardian' }
    ],
    
    // Divine enemies (CP: 1000-2000)
    divine: [
        { name: 'Ymir Fritz Avatar', power: 1200, type: 'titan', description: 'Direct manifestation of the first titan shifter' },
        { name: 'Coordinate Nexus', power: 1400, type: 'titan', description: 'Central hub of all coordinate power' },
        { name: 'Eldian God-King', power: 1100, type: 'human', description: 'Divine ruler of all Eldians' },
        { name: 'Paths Deity', power: 1600, type: 'titan', description: 'God-like entity from paths dimension' },
        { name: 'Titan Genesis Core', power: 1300, type: 'titan', description: 'Origin point of all titans' },
        { name: 'Marley Divine Emperor', power: 1050, type: 'human', description: 'Godly Marleyan supreme leader' },
        { name: 'Founding Titan God', power: 1500, type: 'titan', description: 'Divine form of the Founding Titan' },
        { name: 'Coordinate Ascendant', power: 1350, type: 'titan', description: 'Ascended coordinate consciousness' },
        { name: 'Rumbling Deity', power: 1450, type: 'titan', description: 'Divine manifestation of the rumbling' },
        { name: 'Paths Seraph', power: 1250, type: 'titan', description: 'Angelic paths guardian' },
        { name: 'Titan Divinity', power: 1550, type: 'titan', description: 'Divine essence of all titans' },
        { name: 'Eldian Godhood', power: 1150, type: 'human', description: 'Divine Eldian ascension' },
        { name: 'Coordinate Godhead', power: 1700, type: 'titan', description: 'Supreme coordinate divinity' },
        { name: 'Ymir\'s Divine Will', power: 1400, type: 'titan', description: 'God-like will of Ymir Fritz' },
        { name: 'Titan Pantheon', power: 1650, type: 'titan', description: 'Collection of titan gods' },
        { name: 'Paths Omniscience', power: 1800, type: 'titan', description: 'All-knowing paths entity' },
        { name: 'Divine Rumbling', power: 1500, type: 'titan', description: 'God-tier rumbling power' },
        { name: 'Coordinate Divinity', power: 1750, type: 'titan', description: 'Divine coordinate essence' },
        { name: 'Titan God Supreme', power: 1900, type: 'titan', description: 'Supreme deity of all titans' },
        { name: 'Paths Creator', power: 2000, type: 'titan', description: 'Divine creator of paths dimension' }
    ],
    
    // Cosmic enemies (CP: 2000-4000)
    cosmic: [
        { name: 'Universal Titan', power: 2500, type: 'titan', description: 'Titan with cosmic power' },
        { name: 'Galactic Coordinate', power: 3000, type: 'titan', description: 'Coordinate power spanning galaxies' },
        { name: 'Cosmic Ymir', power: 2200, type: 'titan', description: 'Ymir Fritz with universal power' },
        { name: 'Starborne Paths Entity', power: 3500, type: 'titan', description: 'Paths consciousness from the stars' },
        { name: 'Dimensional Titan', power: 2800, type: 'titan', description: 'Titan existing across dimensions' },
        { name: 'Cosmic Founding Titan', power: 3200, type: 'titan', description: 'Founding Titan with cosmic scope' },
        { name: 'Universal Rumbling', power: 3600, type: 'titan', description: 'Rumbling that spans the universe' },
        { name: 'Stellar Coordinate', power: 2900, type: 'titan', description: 'Coordinate power of the stars' },
        { name: 'Cosmic Eldian Emperor', power: 2400, type: 'human', description: 'Eldian ruler of the cosmos' },
        { name: 'Galactic Paths Guardian', power: 3400, type: 'titan', description: 'Guardian of cosmic paths' },
        { name: 'Universal Titan God', power: 3800, type: 'titan', description: 'God-titan of the universe' },
        { name: 'Cosmic Memory Keeper', power: 2600, type: 'titan', description: 'Keeper of universal memories' },
        { name: 'Stellar Titan Genesis', power: 3100, type: 'titan', description: 'Birth of titans among stars' },
        { name: 'Dimensional Coordinate', power: 3300, type: 'titan', description: 'Coordinate across dimensions' },
        { name: 'Cosmic Titan Singularity', power: 3700, type: 'titan', description: 'Universal titan convergence' },
        { name: 'Galactic Founding Power', power: 3900, type: 'titan', description: 'Founding power across galaxies' },
        { name: 'Universal Paths Nexus', power: 4000, type: 'titan', description: 'Central hub of cosmic paths' },
        { name: 'Stellar Rumbling Core', power: 3500, type: 'titan', description: 'Core of stellar rumbling' },
        { name: 'Cosmic Titan Omega', power: 3800, type: 'titan', description: 'Final cosmic titan evolution' },
        { name: 'Universal Ymir Avatar', power: 4000, type: 'titan', description: 'Universal manifestation of Ymir' }
    ],
    
    // Transcendent enemies (CP: 4000-8000)
    transcendent: [
        { name: 'Reality Titan', power: 5000, type: 'titan', description: 'Titan that transcends reality' },
        { name: 'Transcendent Coordinate', power: 6000, type: 'titan', description: 'Coordinate beyond existence' },
        { name: 'Omniversal Ymir', power: 4500, type: 'titan', description: 'Ymir across all realities' },
        { name: 'Conceptual Titan', power: 5500, type: 'titan', description: 'Titan existing as pure concept' },
        { name: 'Transcendent Paths Entity', power: 7000, type: 'titan', description: 'Paths entity beyond dimension' },
        { name: 'Reality-Warping Founding Titan', power: 6500, type: 'titan', description: 'Founding Titan that reshapes reality' },
        { name: 'Transcendent Rumbling', power: 7500, type: 'titan', description: 'Rumbling beyond reality' },
        { name: 'Omniversal Coordinate', power: 6800, type: 'titan', description: 'Coordinate across all realities' },
        { name: 'Conceptual Eldian God', power: 4800, type: 'human', description: 'Eldian deity beyond concepts' },
        { name: 'Transcendent Titan Genesis', power: 5800, type: 'titan', description: 'Genesis beyond reality' },
        { name: 'Reality Titan Omega', power: 7200, type: 'titan', description: 'Final reality titan form' },
        { name: 'Omniversal Paths Guardian', power: 6200, type: 'titan', description: 'Guardian of all paths' },
        { name: 'Transcendent Memory Core', power: 5200, type: 'titan', description: 'Core of transcendent memories' },
        { name: 'Conceptual Coordinate', power: 6600, type: 'titan', description: 'Coordinate as pure concept' },
        { name: 'Reality Titan Singularity', power: 7800, type: 'titan', description: 'Singularity of all realities' },
        { name: 'Transcendent Ymir Will', power: 5600, type: 'titan', description: 'Ymir\'s will beyond existence' },
        { name: 'Omniversal Titan God', power: 7400, type: 'titan', description: 'God-titan of all realities' },
        { name: 'Conceptual Paths Nexus', power: 6400, type: 'titan', description: 'Paths nexus as concept' },
        { name: 'Transcendent Rumbling Core', power: 7600, type: 'titan', description: 'Core of transcendent rumbling' },
        { name: 'Reality Founding God', power: 8000, type: 'titan', description: 'Founding god of reality' }
    ],
    
    // Omnipotent enemies (CP: 8000-15000)
    omnipotent: [
        { name: 'Omnipotent Titan', power: 10000, type: 'titan', description: 'All-powerful titan entity' },
        { name: 'Infinite Coordinate', power: 12000, type: 'titan', description: 'Coordinate with infinite power' },
        { name: 'Omnipotent Ymir', power: 9000, type: 'titan', description: 'All-powerful Ymir Fritz' },
        { name: 'Absolute Paths Entity', power: 13000, type: 'titan', description: 'Paths entity with absolute power' },
        { name: 'Omnipotent Founding Titan', power: 11500, type: 'titan', description: 'All-powerful Founding Titan' },
        { name: 'Infinite Rumbling', power: 14000, type: 'titan', description: 'Rumbling with infinite scope' },
        { name: 'Omnipotent Titan Genesis', power: 10500, type: 'titan', description: 'All-powerful titan origin' },
        { name: 'Absolute Coordinate God', power: 12500, type: 'titan', description: 'Coordinate god with absolute power' },
        { name: 'Omnipotent Eldian Prime', power: 9500, type: 'human', description: 'All-powerful Eldian being' },
        { name: 'Infinite Paths Guardian', power: 13500, type: 'titan', description: 'Guardian with infinite power' },
        { name: 'Omnipotent Titan Omega', power: 14500, type: 'titan', description: 'All-powerful final titan' },
        { name: 'Absolute Memory Core', power: 11000, type: 'titan', description: 'Core with absolute memory' },
        { name: 'Omnipotent Coordinate Nexus', power: 12800, type: 'titan', description: 'All-powerful coordinate hub' },
        { name: 'Infinite Ymir Avatar', power: 10800, type: 'titan', description: 'Infinite manifestation of Ymir' },
        { name: 'Omnipotent Titan Singularity', power: 14800, type: 'titan', description: 'All-powerful titan convergence' },
        { name: 'Absolute Paths Creator', power: 13800, type: 'titan', description: 'Creator with absolute power' },
        { name: 'Omnipotent Rumbling God', power: 14200, type: 'titan', description: 'All-powerful rumbling deity' },
        { name: 'Infinite Coordinate Prime', power: 12200, type: 'titan', description: 'Prime coordinate with infinite power' },
        { name: 'Omnipotent Titan Supreme', power: 15000, type: 'titan', description: 'Supreme all-powerful titan' },
        { name: 'Absolute Founding God', power: 15000, type: 'titan', description: 'Founding god with absolute power' }
    ],
    
    // Absolute enemies (CP: 15000+)
    absolute: [
        { name: 'Absolute Titan Entity', power: 18000, type: 'titan', description: 'The ultimate titan existence' },
        { name: 'Perfect Coordinate', power: 20000, type: 'titan', description: 'Coordinate in its perfect form' },
        { name: 'Absolute Ymir Prime', power: 16000, type: 'titan', description: 'Ymir Fritz in absolute form' },
        { name: 'Ultimate Paths Being', power: 22000, type: 'titan', description: 'Ultimate entity of paths' },
        { name: 'Absolute Founding Titan', power: 19000, type: 'titan', description: 'Founding Titan in absolute form' },
        { name: 'Perfect Rumbling', power: 25000, type: 'titan', description: 'Rumbling in its perfect state' },
        { name: 'Absolute Titan Genesis', power: 17000, type: 'titan', description: 'Ultimate titan origin' },
        { name: 'Perfect Coordinate God', power: 21000, type: 'titan', description: 'Coordinate god in perfect form' },
        { name: 'Absolute Eldian Prime', power: 15500, type: 'human', description: 'Ultimate Eldian existence' },
        { name: 'Ultimate Paths Guardian', power: 23000, type: 'titan', description: 'Ultimate guardian of paths' },
        { name: 'Absolute Titan Omega', power: 24000, type: 'titan', description: 'Ultimate final titan form' },
        { name: 'Perfect Memory Core', power: 18500, type: 'titan', description: 'Core with perfect memory' },
        { name: 'Absolute Coordinate Nexus', power: 20500, type: 'titan', description: 'Ultimate coordinate hub' },
        { name: 'Perfect Ymir Avatar', power: 17500, type: 'titan', description: 'Perfect manifestation of Ymir' },
        { name: 'Absolute Titan Singularity', power: 26000, type: 'titan', description: 'Ultimate titan convergence' },
        { name: 'Perfect Paths Creator', power: 22500, type: 'titan', description: 'Perfect creator of paths' },
        { name: 'Absolute Rumbling God', power: 24500, type: 'titan', description: 'Ultimate rumbling deity' },
        { name: 'Perfect Coordinate Prime', power: 19500, type: 'titan', description: 'Prime coordinate in perfect form' },
        { name: 'Absolute Titan Supreme', power: 28000, type: 'titan', description: 'Supreme ultimate titan' },
        { name: 'Perfect Founding God', power: 30000, type: 'titan', description: 'Perfect founding god - ultimate power' }
    ]
};

/**
 * Get user's power rank based on their equipped power CP (matches power system)
 */
function getUserPowerRank(userCP) {
    if (userCP <= 150) return 'Normal';
    else if (userCP <= 400) return 'Rare';
    else if (userCP <= 1200) return 'Epic';
    else if (userCP <= 3000) return 'Legendary';
    else if (userCP <= 6000) return 'Mythic';
    else if (userCP <= 12000) return 'Divine';
    else if (userCP <= 25000) return 'Cosmic';
    else if (userCP <= 50000) return 'Transcendent';
    else if (userCP <= 100000) return 'Omnipotent';
    else return 'Absolute';
}

/**
 * Get enemy rank based on CP for balanced fights (CP-based matching)
 */
function getCPBasedEnemyRank(userCP) {
    // Find the rank that has enemies with similar CP to the user
    const rankRanges = [
        { rank: 'Normal', min: 50, max: 150 },
        { rank: 'Rare', min: 200, max: 400 },
        { rank: 'Epic', min: 800, max: 1200 },
        { rank: 'Legendary', min: 2000, max: 3000 },
        { rank: 'Mythic', min: 5000, max: 6000 },
        { rank: 'Divine', min: 9000, max: 12000 },
        { rank: 'Cosmic', min: 18000, max: 25000 },
        { rank: 'Transcendent', min: 35000, max: 50000 },
        { rank: 'Omnipotent', min: 75000, max: 100000 },
        { rank: 'Absolute', min: 500000, max: 1000000 }
    ];
    
    // Find the rank where user CP falls within or is closest to the enemy range
    for (let i = 0; i < rankRanges.length; i++) {
        const range = rankRanges[i];
        // If user CP is within this rank's range, use this rank
        if (userCP >= range.min && userCP <= range.max) {
            return range.rank;
        }
        // If user CP is below this rank's minimum, use this rank (user faces slightly stronger enemies)
        if (userCP < range.min) {
            return range.rank;
        }
    }
    
    // If user CP is higher than all ranges, use the highest rank
    return 'Absolute';
}

/**
 * Generate random encounter based on user level and equipped power CP
 */
async function generateRandomEncounter(userEquippedCP, targetRank = null) {
    // Determine enemy rank based on user's equipped power rank
    let enemyRank;
    
    if (targetRank) {
        // User specified a rank
        enemyRank = targetRank;
    } else {
        // Auto-determine based on user's equipped power CP (CP-based matching)
        enemyRank = getCPBasedEnemyRank(userEquippedCP);
    }
    
    // Get enemies from database first, fallback to hardcoded if needed
    let enemies = await getEnemiesByRank(enemyRank);
    
    // If no enemies found in database, try fallback system
    if (!enemies || enemies.length === 0) {
        logger.warn(`No enemies found in database for rank: ${enemyRank}, trying fallback system`);
        enemies = enemyTypes[enemyRank] || enemyTypes[enemyRank.toLowerCase()] || enemyTypes[enemyRank.toUpperCase()];
        
        // Check if enemies exist in fallback
        if (!enemies || enemies.length === 0) {
            logger.warn(`No enemies found in fallback for rank: ${enemyRank}, using Normal rank`);
            // Try database Normal rank first
            enemies = await getEnemiesByRank('Normal');
            if (!enemies || enemies.length === 0) {
                // Ultimate fallback to hardcoded Normal
                enemies = enemyTypes['Normal'] || enemyTypes['normal'] || enemyTypes['NORMAL'] || [];
                if (enemies.length === 0) {
                    // Final fallback - create a basic enemy
                    logger.error('No enemies found anywhere, creating basic fallback enemy');
                    return {
                        name: 'Basic Titan',
                        power: 50 + Math.floor(Math.random() * 50),
                        description: 'A simple titan enemy',
                        type: 'titan',
                        rank: 'Normal',
                        level: 1
                    };
                }
            }
            enemyRank = 'Normal'; // Set rank to Normal for consistency
        }
    }
    
    const baseEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    
    // CP-BASED SCALING: Generate enemy CP similar to user CP but within rank constraints
    let scaledPower = baseEnemy.power;
    
    // Define enemy CP ranges matching power system (from powers.js)
    const rankCPRanges = {
        'Normal': { min: 50, max: 150 },
        'Rare': { min: 200, max: 400 },
        'Epic': { min: 800, max: 1200 },
        'Legendary': { min: 2000, max: 3000 },
        'Mythic': { min: 5000, max: 6000 },
        'Divine': { min: 9000, max: 12000 },
        'Cosmic': { min: 18000, max: 25000 },
        'Transcendent': { min: 35000, max: 50000 },
        'Omnipotent': { min: 75000, max: 100000 },
        'Absolute': { min: 500000, max: 1000000 }
    };
    
    const rankRange = rankCPRanges[enemyRank];
    if (rankRange) {
        if (targetRank) {
            // Manual rank selection: use full rank range
            scaledPower = Math.floor(Math.random() * (rankRange.max - rankRange.min + 1)) + rankRange.min;
        } else {
            // Auto CP-based matching: generate enemy CP similar to user CP but within rank limits
            // Make enemies slightly stronger to provide proper challenge
            const cpVariation = userEquippedCP * 0.7; // ±70% variation for more challenge
            const minCP = Math.max(rankRange.min, Math.floor(userEquippedCP - cpVariation * 0.3)); // Enemies can be 30% weaker
            const maxCP = Math.min(rankRange.max, Math.floor(userEquippedCP + cpVariation)); // But up to 70% stronger
            scaledPower = Math.floor(Math.random() * (maxCP - minCP + 1)) + minCP;
        }
    }
    
    return {
        name: baseEnemy.name,
        power: scaledPower || baseEnemy.combat_power || baseEnemy.power,
        description: baseEnemy.description,
        type: baseEnemy.type,
        rank: enemyRank,
        level: 1 // Level system removed
    };
}

/**
 * Generate encounter based on user level and power rank (backwards compatibility)
 */
async function generateEncounter(userPowerRank) {
    // Convert old system to new system (level system removed)
    const userEquippedCP = 100; // Default CP estimate
    return await generateRandomEncounter(userEquippedCP);
}

/**
 * Calculate battle result between user and encounter
 */
function calculateBattleResult(user, equippedPower, encounter) {
    // Calculate user's total combat power
    const userCP = equippedPower.combat_power + (user.bonus_cp || 0);
    const userTotal = userCP; // Level bonuses removed
    
    // Calculate enemy total power (level bonuses removed)
    const enemyTotal = encounter.power;
    
    // Add meaningful randomness to battle (±40% for more varied outcomes)
    const userRoll = userTotal * (0.6 + Math.random() * 0.8);
    const enemyRoll = enemyTotal * (0.6 + Math.random() * 0.8);
    
    const victory = userRoll > enemyRoll;
    const powerDifference = Math.abs(userRoll - enemyRoll);
    
    // Generate battle log
    const log = generateBattleLog(user, equippedPower, encounter, userRoll, enemyRoll, victory, powerDifference);
    
    return {
        victory,
        userRoll: Math.round(userRoll),
        enemyRoll: Math.round(enemyRoll),
        powerDifference: Math.round(powerDifference),
        log
    };
}

/**
 * Generate detailed battle log
 */
function generateBattleLog(user, power, encounter, userRoll, enemyRoll, victory, difference) {
    const battleScenarios = {
        titans: {
            victory: [
                `${user.username} expertly uses ${power.name} to target the titan's nape, delivering a decisive blow!`,
                `With precise maneuvering, ${user.username} outflanks the ${encounter.name} and strikes its weak point!`,
                `${user.username}'s ${power.name} proves superior as they slice through the titan's defenses!`,
                `The ${encounter.name} falls as ${user.username} executes a perfect attack using ${power.name}!`
            ],
            defeat: [
                `The ${encounter.name} overwhelms ${user.username}, despite their ${power.name}!`,
                `${user.username}'s ${power.name} isn't enough to penetrate the titan's defenses!`,
                `The massive ${encounter.name} crushes ${user.username}'s attack attempt!`,
                `${user.username} is forced to retreat as the ${encounter.name} proves too powerful!`
            ]
        },
        humans: {
            victory: [
                `${user.username} outmaneuvers the ${encounter.name} with superior ${power.name} technique!`,
                `The ${encounter.name} is no match for ${user.username}'s ${power.name} mastery!`,
                `${user.username} defeats the ${encounter.name} in an intense combat exchange!`,
                `Using ${power.name}, ${user.username} gains the upper hand against the ${encounter.name}!`
            ],
            defeat: [
                `The ${encounter.name}'s experience shows as they defeat ${user.username}!`,
                `${user.username}'s ${power.name} falls short against the skilled ${encounter.name}!`,
                `The ${encounter.name} outfights ${user.username} in brutal combat!`,
                `${user.username} is overwhelmed by the ${encounter.name}'s superior tactics!`
            ]
        }
    };
    
    const scenarios = battleScenarios[encounter.type] || battleScenarios.titans;
    const outcomeScenarios = victory ? scenarios.victory : scenarios.defeat;
    const scenario = outcomeScenarios[Math.floor(Math.random() * outcomeScenarios.length)];
    
    let intensityDescription = '';
    if (difference < 50) {
        intensityDescription = victory ? '⚔️ **CLOSE VICTORY!**' : '💔 **NARROW DEFEAT!**';
    } else if (difference < 150) {
        intensityDescription = victory ? '🏆 **SOLID WIN!**' : '💥 **CLEAR DEFEAT!**';
    } else {
        intensityDescription = victory ? '💪 **DOMINANT VICTORY!**' : '💀 **CRUSHING DEFEAT!**';
    }
    
    return `${scenario}\n\n${intensityDescription}\n\n🎲 **Battle Rolls:**\n${user.username}: ${Math.round(userRoll)}\n${encounter.name}: ${Math.round(enemyRoll)}`;
}

/**
 * Calculate rewards for winning a battle
 */
function calculateRewards(encounter) {
    // Enhanced base rewards (level system removed)
    let baseCoins = 50;
    
    // Scale rewards based on encounter power and rank
    const powerScaling = Math.max(1, encounter.power / 100);
    
    // Rank-based bonus multipliers
    const rankMultipliers = {
        'Normal': 1.0,
        'Rare': 1.5,
        'Epic': 2.0,
        'Legendary': 2.5,
        'Mythic': 3.0,
        'Divine': 4.0,
        'Cosmic': 5.0,
        'Transcendent': 6.0,
        'Omnipotent': 7.0,
        'Absolute': 8.0
    };
    
    const rankMultiplier = rankMultipliers[encounter.rank] || 1.0;
    
    // Calculate final rewards with enhanced scaling (exp system removed)
    const coinReward = Math.floor(baseCoins * powerScaling * rankMultiplier * (0.8 + Math.random() * 0.4));
    
    // Additional bonus for very high power enemies
    let powerBonus = 1;
    if (encounter.power > 5000) {
        powerBonus = 1.5;
    } else if (encounter.power > 10000) {
        powerBonus = 2.0;
    } else if (encounter.power > 20000) {
        powerBonus = 2.5;
    }
    
    return {
        coins: Math.floor(coinReward * powerBonus)
    };
}

/**
 * Calculate PvP battle rewards
 */
function calculatePvPRewards(winner, loser, isWinner) {
    const baseCoins = isWinner ? 300 : 10; // Level and exp system removed
    
    // Scale based on opponent's CP instead of level
    const opponentCP = isWinner ? loser.equipped_cp || 100 : winner.equipped_cp || 100;
    const powerBonus = Math.max(1, opponentCP / 100);
    
    const finalCoins = Math.floor(baseCoins * powerBonus);
    
    return {
        coins: finalCoins
    };
}

/**
 * Validate battle eligibility
 */
function validateBattle(user, equippedPower) {
    const errors = [];
    
    if (!equippedPower) {
        errors.push('No power equipped');
    }
    
    // Level validation removed
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Calculate battle difficulty rating
 */
function calculateDifficulty(userCP, encounterCP) {
    const ratio = encounterCP / userCP;
    
    if (ratio <= 0.6) return 'Very Easy';
    if (ratio <= 0.8) return 'Easy';
    if (ratio <= 1.2) return 'Balanced';
    if (ratio <= 1.5) return 'Hard';
    if (ratio <= 2.0) return 'Very Hard';
    return 'Extreme';
}

/**
 * Generate special encounter (rare events)
 */
function generateSpecialEncounter() {
    // 5% chance for special encounters (level requirement removed)
    if (Math.random() > 0.05) {
        return null;
    }
    
    const specialEncounters = [
        {
            name: 'Rod Reiss Titan',
            power: 800,
            description: 'Massive abnormal titan crawling towards the walls',
            type: 'special',
            rewards: { coinMultiplier: 2 }
        },
        {
            name: 'Pure Titan Horde',
            power: 600,
            description: 'Multiple titans advancing together',
            type: 'special',
            rewards: { coinMultiplier: 1.8 }
        },
        {
            name: 'Titan Shifter',
            power: 1000,
            description: 'Intelligent titan with human consciousness',
            type: 'special',
            rewards: { coinMultiplier: 2.2 }
        }
    ];
    
    return specialEncounters[Math.floor(Math.random() * specialEncounters.length)];
}

module.exports = {
    getEnemiesByRank,
    generateEncounter,
    generateRandomEncounter,
    calculateBattleResult,
    calculateRewards,
    calculatePvPRewards,
    validateBattle,
    calculateDifficulty,
    generateSpecialEncounter
};
