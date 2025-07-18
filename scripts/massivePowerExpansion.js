const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

async function massivePowerExpansion() {
    const connection = await mysql.createConnection({
        host: '217.21.91.253',
        user: 'u284410540_aether',
        database: 'u284410540_aethexiz',
        password: 'Aethexiz11122005#'
    });
    
    try {
        // Update the enum to include new ranks
        await connection.execute(`
            ALTER TABLE powers 
            MODIFY COLUMN rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute') NOT NULL
        `);
        logger.info('Powers table updated with all new ranks');

        // Massive power expansion - 40+ powers per rank
        const megaPowerList = [
            // Normal Rank Powers (45 total)
            { name: 'Basic Combat Training', description: 'Foundation of all military combat', rank: 'Normal', base_cp: 45, base_price: 450 },
            { name: 'Vertical Maneuvering Equipment', description: 'Standard ODM gear for mobility', rank: 'Normal', base_cp: 50, base_price: 500 },
            { name: 'Thunder Spear', description: 'Explosive spear for titan combat', rank: 'Normal', base_cp: 60, base_price: 600 },
            { name: 'Blade Mastery', description: 'Expert dual blade techniques', rank: 'Normal', base_cp: 55, base_price: 550 },
            { name: 'Scout Regiment Training', description: 'Enhanced reconnaissance skills', rank: 'Normal', base_cp: 52, base_price: 520 },
            { name: 'Garrison Regiment Discipline', description: 'Wall defense expertise', rank: 'Normal', base_cp: 48, base_price: 480 },
            { name: 'Military Police Training', description: 'Advanced command techniques', rank: 'Normal', base_cp: 58, base_price: 580 },
            { name: 'Horse Riding Mastery', description: 'Expert cavalry skills', rank: 'Normal', base_cp: 47, base_price: 470 },
            { name: 'Signal Flare Expertise', description: 'Battlefield communication master', rank: 'Normal', base_cp: 46, base_price: 460 },
            { name: 'Cannon Operation', description: 'Artillery specialist training', rank: 'Normal', base_cp: 54, base_price: 540 },
            { name: 'Hand-to-Hand Combat', description: 'Unarmed fighting mastery', rank: 'Normal', base_cp: 51, base_price: 510 },
            { name: 'Stealth Operations', description: 'Silent infiltration techniques', rank: 'Normal', base_cp: 49, base_price: 490 },
            { name: 'Medical Training', description: 'Battlefield first aid expert', rank: 'Normal', base_cp: 47, base_price: 470 },
            { name: 'Engineering Skills', description: 'Fortification construction', rank: 'Normal', base_cp: 53, base_price: 530 },
            { name: 'Tactical Planning', description: 'Strategic battlefield analysis', rank: 'Normal', base_cp: 56, base_price: 560 },
            { name: 'Survival Instinct', description: 'Enhanced danger detection', rank: 'Normal', base_cp: 50, base_price: 500 },
            { name: 'Weather Reading', description: 'Mission weather prediction', rank: 'Normal', base_cp: 45, base_price: 450 },
            { name: 'Equipment Maintenance', description: 'ODM gear repair mastery', rank: 'Normal', base_cp: 48, base_price: 480 },
            { name: 'Formation Leadership', description: 'Troop commanding skills', rank: 'Normal', base_cp: 57, base_price: 570 },
            { name: 'Titan Tracking', description: 'Titan movement prediction', rank: 'Normal', base_cp: 52, base_price: 520 },
            { name: 'Urban Combat', description: 'City environment fighting', rank: 'Normal', base_cp: 54, base_price: 540 },
            { name: 'Forest Navigation', description: 'Dense forest pathfinding', rank: 'Normal', base_cp: 49, base_price: 490 },
            { name: 'Supply Management', description: 'Resource allocation expertise', rank: 'Normal', base_cp: 46, base_price: 460 },
            { name: 'Horseback Archery', description: 'Mounted ranged combat', rank: 'Normal', base_cp: 51, base_price: 510 },
            { name: 'Night Operations', description: 'Darkness combat effectiveness', rank: 'Normal', base_cp: 50, base_price: 500 },
            { name: 'Advanced Horseback Combat', description: 'Master mounted combat techniques', rank: 'Normal', base_cp: 55, base_price: 550 },
            { name: 'Siege Warfare Tactics', description: 'Fortress assault specialist', rank: 'Normal', base_cp: 53, base_price: 530 },
            { name: 'Rapid Deployment', description: 'Quick battlefield positioning', rank: 'Normal', base_cp: 52, base_price: 520 },
            { name: 'Resource Optimization', description: 'Efficient supply usage', rank: 'Normal', base_cp: 48, base_price: 480 },
            { name: 'Scout Training Elite', description: 'Advanced reconnaissance', rank: 'Normal', base_cp: 56, base_price: 560 },
            { name: 'Combat Medicine', description: 'Battlefield surgery skills', rank: 'Normal', base_cp: 50, base_price: 500 },
            { name: 'Fortification Expert', description: 'Defense construction master', rank: 'Normal', base_cp: 54, base_price: 540 },
            { name: 'Squad Leadership', description: 'Small unit command', rank: 'Normal', base_cp: 57, base_price: 570 },
            { name: 'Urban Warfare Expert', description: 'City combat specialist', rank: 'Normal', base_cp: 53, base_price: 530 },
            { name: 'Wilderness Survival', description: 'Hostile environment survival', rank: 'Normal', base_cp: 49, base_price: 490 },
            { name: 'Signal Intelligence', description: 'Communication and code breaking', rank: 'Normal', base_cp: 51, base_price: 510 },
            { name: 'Equipment Specialist', description: 'Military equipment mastery', rank: 'Normal', base_cp: 52, base_price: 520 },
            { name: 'Explosive Ordnance Expert', description: 'Bomb and explosive specialist', rank: 'Normal', base_cp: 58, base_price: 580 },
            { name: 'Reconnaissance Master', description: 'Elite information gathering', rank: 'Normal', base_cp: 55, base_price: 550 },
            { name: 'Logistics Commander', description: 'Supply chain management', rank: 'Normal', base_cp: 47, base_price: 470 },
            { name: 'Cadet Training Instructor', description: 'Recruit training specialist', rank: 'Normal', base_cp: 54, base_price: 540 },
            { name: 'Wall Maintenance Expert', description: 'Wall repair and upkeep', rank: 'Normal', base_cp: 46, base_price: 460 },
            { name: 'Titan Research Assistant', description: 'Basic titan biology knowledge', rank: 'Normal', base_cp: 51, base_price: 510 },
            { name: 'Military Historian', description: 'Combat history and tactics', rank: 'Normal', base_cp: 48, base_price: 480 },
            { name: 'Field Medic Advanced', description: 'Advanced battlefield medicine', rank: 'Normal', base_cp: 52, base_price: 520 },

            // Rare Rank Powers (45 total)
            { name: 'Enhanced Strength', description: 'Superhuman physical capabilities', rank: 'Rare', base_cp: 250, base_price: 2000 },
            { name: 'Steam Release', description: 'Release scalding steam defense', rank: 'Rare', base_cp: 230, base_price: 1800 },
            { name: 'Titan Hardening', description: 'Harden skin for defense and offense', rank: 'Rare', base_cp: 280, base_price: 2200 },
            { name: 'Regeneration', description: 'Rapid healing of wounds', rank: 'Rare', base_cp: 270, base_price: 2100 },
            { name: 'Titan Sensing', description: 'Detect nearby titans', rank: 'Rare', base_cp: 240, base_price: 1900 },
            { name: 'Enhanced Reflexes', description: 'Lightning-fast reactions', rank: 'Rare', base_cp: 260, base_price: 2000 },
            { name: 'Partial Transformation', description: 'Limited titan transformation', rank: 'Rare', base_cp: 290, base_price: 2300 },
            { name: 'Memory Resistance', description: 'Resist memory manipulation', rank: 'Rare', base_cp: 250, base_price: 1950 },
            { name: 'Enhanced Endurance', description: 'Vastly improved stamina', rank: 'Rare', base_cp: 240, base_price: 1850 },
            { name: 'Bloodline Awakening', description: 'Unlock ancestral genetic potential', rank: 'Rare', base_cp: 300, base_price: 2400 },
            { name: 'Thunder Spear Mastery', description: 'Expert explosive weaponry', rank: 'Rare', base_cp: 220, base_price: 1750 },
            { name: 'Coordinate Prediction', description: 'Predict enemy movements', rank: 'Rare', base_cp: 250, base_price: 2000 },
            { name: 'Adrenaline Surge', description: 'Temporary massive boost', rank: 'Rare', base_cp: 280, base_price: 2200 },
            { name: 'Tactical Genius', description: 'Enhanced strategic thinking', rank: 'Rare', base_cp: 260, base_price: 2050 },
            { name: 'Wall Combat Specialist', description: 'Master vertical maneuvering', rank: 'Rare', base_cp: 270, base_price: 2100 },
            { name: 'Beast Taming', description: 'Communicate with animals', rank: 'Rare', base_cp: 230, base_price: 1800 },
            { name: 'Titan Blood Absorption', description: 'Absorb titan blood for enhancement', rank: 'Rare', base_cp: 265, base_price: 2100 },
            { name: 'Enhanced Recovery', description: 'Rapid fatigue recovery', rank: 'Rare', base_cp: 255, base_price: 2000 },
            { name: 'Titan Weak Point Detection', description: 'Instinctively find weak points', rank: 'Rare', base_cp: 275, base_price: 2200 },
            { name: 'Combat Precognition', description: 'Brief glimpses of future', rank: 'Rare', base_cp: 285, base_price: 2300 },
            { name: 'Bloodlust Suppression', description: 'Maintain sanity in combat', rank: 'Rare', base_cp: 245, base_price: 1900 },
            { name: 'Titan Mimicry Voice', description: 'Imitate titan sounds', rank: 'Rare', base_cp: 235, base_price: 1850 },
            { name: 'Enhanced Grip Strength', description: 'Superhuman gripping power', rank: 'Rare', base_cp: 265, base_price: 2100 },
            { name: 'Battle Meditation', description: 'Calm focus in chaos', rank: 'Rare', base_cp: 255, base_price: 2000 },
            { name: 'Ackerman Awakening', description: 'Partial Ackerman bloodline power', rank: 'Rare', base_cp: 320, base_price: 2500 },
            { name: 'Royal Blood Fragment', description: 'Trace royal Fritz bloodline', rank: 'Rare', base_cp: 310, base_price: 2400 },
            { name: 'Titan Shifter Instinct', description: 'Detect titan shifters', rank: 'Rare', base_cp: 280, base_price: 2200 },
            { name: 'Memory Flash', description: 'Brief inherited memory access', rank: 'Rare', base_cp: 270, base_price: 2150 },
            { name: 'Enhanced Speed', description: 'Superhuman movement speed', rank: 'Rare', base_cp: 275, base_price: 2180 },
            { name: 'Pain Suppression', description: 'Ignore physical pain', rank: 'Rare', base_cp: 260, base_price: 2050 },
            { name: 'Titan Scream', description: 'Powerful roar affecting titans', rank: 'Rare', base_cp: 290, base_price: 2300 },
            { name: 'Enhanced Agility', description: 'Supernatural acrobatic ability', rank: 'Rare', base_cp: 265, base_price: 2100 },
            { name: 'Heat Resistance', description: 'Immunity to extreme temperatures', rank: 'Rare', base_cp: 240, base_price: 1900 },
            { name: 'Enhanced Senses', description: 'Dramatically improved senses', rank: 'Rare', base_cp: 255, base_price: 2000 },
            { name: 'Titan Coordination', description: 'Basic control over mindless titans', rank: 'Rare', base_cp: 295, base_price: 2350 },
            { name: 'Crystallization', description: 'Encase in hardened crystal', rank: 'Rare', base_cp: 285, base_price: 2250 },
            { name: 'Bone Manipulation', description: 'Control bone structure', rank: 'Rare', base_cp: 270, base_price: 2150 },
            { name: 'Enhanced Durability', description: 'Increased damage resistance', rank: 'Rare', base_cp: 260, base_price: 2050 },
            { name: 'Titan Communication', description: 'Telepathic link with shifters', rank: 'Rare', base_cp: 275, base_price: 2180 },
            { name: 'Size Manipulation', description: 'Limited size control', rank: 'Rare', base_cp: 280, base_price: 2200 },
            { name: 'Enhanced Intelligence', description: 'Retained intelligence in titan form', rank: 'Rare', base_cp: 265, base_price: 2100 },
            { name: 'Titan Camouflage', description: 'Blend with titan appearance', rank: 'Rare', base_cp: 250, base_price: 2000 },
            { name: 'Memory Absorption', description: 'Absorb memories through contact', rank: 'Rare', base_cp: 285, base_price: 2250 },
            { name: 'Enhanced Healing', description: 'Accelerated wound recovery', rank: 'Rare', base_cp: 275, base_price: 2180 },
            { name: 'Titan Extraction', description: 'Extract humans from titans', rank: 'Rare', base_cp: 270, base_price: 2150 },

            // Epic Rank Powers (45 total)
            { name: 'Armored Titan Power', description: 'Massive armored defensive form', rank: 'Epic', base_cp: 950, base_price: 8000 },
            { name: 'Colossal Titan Power', description: 'Enormous size with steam attacks', rank: 'Epic', base_cp: 1100, base_price: 9000 },
            { name: 'Female Titan Power', description: 'Agile form with hardening', rank: 'Epic', base_cp: 900, base_price: 7500 },
            { name: 'Beast Titan Power', description: 'Intelligent throwing abilities', rank: 'Epic', base_cp: 1000, base_price: 8500 },
            { name: 'Cart Titan Power', description: 'Endurance with equipment carrying', rank: 'Epic', base_cp: 850, base_price: 7500 },
            { name: 'Jaw Titan Power', description: 'Swift with powerful bite', rank: 'Epic', base_cp: 950, base_price: 8200 },
            { name: 'War Hammer Titan Power', description: 'Create weapons from hardened material', rank: 'Epic', base_cp: 1050, base_price: 8800 },
            { name: 'Titan Shifter Awakening', description: 'Awaken dormant shifter abilities', rank: 'Epic', base_cp: 920, base_price: 8000 },
            { name: 'War Hammer Mastery', description: 'Master weapon creation', rank: 'Epic', base_cp: 980, base_price: 8500 },
            { name: 'Partial Founding Power', description: 'Limited Founding Titan access', rank: 'Epic', base_cp: 1100, base_price: 9500 },
            { name: 'Anti-Titan Artillery', description: 'Advanced anti-titan weaponry', rank: 'Epic', base_cp: 800, base_price: 7000 },
            { name: 'Marleyan Warrior Elite', description: 'Elite Marley warrior training', rank: 'Epic', base_cp: 890, base_price: 7800 },
            { name: 'Eldian Restorationist', description: 'Eldian restoration movement power', rank: 'Epic', base_cp: 860, base_price: 7300 },
            { name: 'Paradis Devil Technology', description: 'Advanced Paradis technology', rank: 'Epic', base_cp: 830, base_price: 7200 },
            { name: 'Survey Corps Elite', description: 'Ultimate Survey Corps training', rank: 'Epic', base_cp: 900, base_price: 7900 },
            { name: 'Wall Rose Guardian', description: 'Sacred wall protection duty', rank: 'Epic', base_cp: 870, base_price: 7600 },
            { name: 'Titan Research Mastery', description: 'Deep titan biology understanding', rank: 'Epic', base_cp: 820, base_price: 7100 },
            { name: 'Memory Inheritance', description: 'Access previous holder memories', rank: 'Epic', base_cp: 940, base_price: 8100 },
            { name: 'Coordinate Fragments', description: 'Partial coordinate power', rank: 'Epic', base_cp: 1080, base_price: 9200 },
            { name: 'Wall Titan Command', description: 'Control wall colossal titans', rank: 'Epic', base_cp: 1020, base_price: 8700 },
            { name: 'Titan Serum Creation', description: 'Create titan transformation serum', rank: 'Epic', base_cp: 880, base_price: 7700 },
            { name: 'Eldian Heritage', description: 'Awakened Eldian bloodline connection', rank: 'Epic', base_cp: 910, base_price: 7950 },
            { name: 'Marleyan Technology', description: 'Advanced military technology', rank: 'Epic', base_cp: 840, base_price: 7250 },
            { name: 'Royal Guard Training', description: 'Elite royal protection techniques', rank: 'Epic', base_cp: 920, base_price: 8000 },
            { name: 'Titan Cult Knowledge', description: 'Secret titan cult wisdom', rank: 'Epic', base_cp: 860, base_price: 7400 },
            { name: 'Anti-Personnel ODM', description: 'Human combat ODM gear', rank: 'Epic', base_cp: 850, base_price: 7300 },
            { name: 'Titan Serum Immunity', description: 'Resistance to forced transformation', rank: 'Epic', base_cp: 970, base_price: 8300 },
            { name: 'Marley Warrior Spirit', description: 'Unbreakable Marleyan will', rank: 'Epic', base_cp: 930, base_price: 8050 },
            { name: 'Eldian Resistance', description: 'Underground resistance tactics', rank: 'Epic', base_cp: 890, base_price: 7800 },
            { name: 'Titan Fusion Attempt', description: 'Experimental titan power fusion', rank: 'Epic', base_cp: 1050, base_price: 8800 },
            { name: 'Advanced Hardening', description: 'Master-level hardening technique', rank: 'Epic', base_cp: 960, base_price: 8250 },
            { name: 'Titan Form Mastery', description: 'Perfect titan transformation control', rank: 'Epic', base_cp: 980, base_price: 8400 },
            { name: 'Warrior Candidate Elite', description: 'Top-tier warrior candidate training', rank: 'Epic', base_cp: 870, base_price: 7500 },
            { name: 'Paths Sensitivity', description: 'Basic sensitivity to paths dimension', rank: 'Epic', base_cp: 1000, base_price: 8600 },
            { name: 'Memory Transmission', description: 'Send memories through contact', rank: 'Epic', base_cp: 920, base_price: 8000 },
            { name: 'Titan Ecology Master', description: 'Complete understanding of titan nature', rank: 'Epic', base_cp: 880, base_price: 7650 },
            { name: 'Royal Family Secret', description: 'Access to royal family secrets', rank: 'Epic', base_cp: 1020, base_price: 8700 },
            { name: 'Wall Construction', description: 'Knowledge of wall building techniques', rank: 'Epic', base_cp: 850, base_price: 7350 },
            { name: 'Titan Shifter Hunter', description: 'Specialist in hunting titan shifters', rank: 'Epic', base_cp: 940, base_price: 8100 },
            { name: 'Ancient Technology', description: 'Access to lost technological knowledge', rank: 'Epic', base_cp: 900, base_price: 7850 },
            { name: 'Coordinate Resonance', description: 'Resonate with coordinate power', rank: 'Epic', base_cp: 1060, base_price: 8900 },
            { name: 'Titan Evolution', description: 'Evolve titan abilities beyond normal', rank: 'Epic', base_cp: 1040, base_price: 8750 },
            { name: 'Memory Palace', description: 'Perfect memory storage and recall', rank: 'Epic', base_cp: 890, base_price: 7750 },
            { name: 'Wall Secrets', description: 'Knowledge of wall construction secrets', rank: 'Epic', base_cp: 870, base_price: 7550 },
            { name: 'Titan Whisperer', description: 'Communicate with all titan types', rank: 'Epic', base_cp: 950, base_price: 8150 },

            // Legendary Rank Powers (45 total)
            { name: 'Attack Titan Power', description: 'Attack Titan with future memories', rank: 'Legendary', base_cp: 2200, base_price: 25000 },
            { name: 'Warhammer Titan Power', description: 'Create weapons and structures', rank: 'Legendary', base_cp: 2300, base_price: 27000 },
            { name: 'Jaw Titan Elite', description: 'Enhanced Jaw Titan capabilities', rank: 'Legendary', base_cp: 2100, base_price: 23000 },
            { name: 'Cart Titan Advanced', description: 'Advanced Cart Titan abilities', rank: 'Legendary', base_cp: 2000, base_price: 20000 },
            { name: 'Progenitor Titan Fragment', description: 'Incomplete original Founding power', rank: 'Legendary', base_cp: 2500, base_price: 30000 },
            { name: 'Ymir Curse Breaking', description: 'Partially break 13-year curse', rank: 'Legendary', base_cp: 2400, base_price: 28000 },
            { name: 'Paths Manipulation', description: 'Limited paths dimension control', rank: 'Legendary', base_cp: 2350, base_price: 26000 },
            { name: 'Titan Shifter Evolution', description: 'Evolved Nine Titans form', rank: 'Legendary', base_cp: 2250, base_price: 24500 },
            { name: 'Marleyan Titan Science', description: 'Advanced titan biology control', rank: 'Legendary', base_cp: 2150, base_price: 22500 },
            { name: 'Eldian King Will', description: 'First king pacifist ideology', rank: 'Legendary', base_cp: 2450, base_price: 29000 },
            { name: 'Titan War Memories', description: 'Great Titan War memories', rank: 'Legendary', base_cp: 2200, base_price: 23500 },
            { name: 'Nine Titans Harmony', description: 'Unify multiple titan powers', rank: 'Legendary', base_cp: 2600, base_price: 31000 },
            { name: 'Coordinate Mastery', description: 'Advanced coordinate manipulation', rank: 'Legendary', base_cp: 2500, base_price: 28500 },
            { name: 'Titan Transformation Override', description: 'Force or prevent transformations', rank: 'Legendary', base_cp: 2300, base_price: 25500 },
            { name: 'Ancestral Titan Power', description: 'Ancient titan shifter connection', rank: 'Legendary', base_cp: 2250, base_price: 24000 },
            { name: 'Paths Communication', description: 'Direct paths dimension communication', rank: 'Legendary', base_cp: 2350, base_price: 26500 },
            { name: 'Titan Nexus Control', description: 'Control central titan connection point', rank: 'Legendary', base_cp: 2550, base_price: 30500 },
            { name: 'Marley Military Command', description: 'Supreme Marleyan authority', rank: 'Legendary', base_cp: 2050, base_price: 21500 },
            { name: 'Eldian Bloodline Purity', description: 'Purest Eldian bloodline connection', rank: 'Legendary', base_cp: 2400, base_price: 27500 },
            { name: 'Titan Serum Mastery', description: 'Ultimate serum control', rank: 'Legendary', base_cp: 2200, base_price: 23000 },
            { name: 'Wall Titan Awakening', description: 'Awaken wall colossal titans', rank: 'Legendary', base_cp: 2500, base_price: 29500 },
            { name: 'Rumbling Preparation', description: 'Prepare ultimate titan awakening', rank: 'Legendary', base_cp: 2650, base_price: 31500 },
            { name: 'Titan Shifter Perfection', description: 'Perfect titan mastery', rank: 'Legendary', base_cp: 2300, base_price: 25000 },
            { name: 'Paths Dimension Access', description: 'Direct paths realm access', rank: 'Legendary', base_cp: 2400, base_price: 27000 },
            { name: 'Founding Titan Fragment', description: 'Incomplete Founding Titan piece', rank: 'Legendary', base_cp: 2550, base_price: 30000 },
            { name: 'Paths Traveler', description: 'Travel through paths dimension', rank: 'Legendary', base_cp: 2350, base_price: 26000 },
            { name: 'Coordinate Echo', description: 'Residual coordinate power', rank: 'Legendary', base_cp: 2450, base_price: 28000 },
            { name: 'Wall Titan Communication', description: 'Communicate with wall titans', rank: 'Legendary', base_cp: 2400, base_price: 27000 },
            { name: 'Ackerman Clan Chief', description: 'Ackerman bloodline leadership', rank: 'Legendary', base_cp: 2500, base_price: 29000 },
            { name: 'Paradis Island King', description: 'Royal Paradis authority', rank: 'Legendary', base_cp: 2300, base_price: 25000 },
            { name: 'Royal Blood Awakening', description: 'Full royal bloodline awakening', rank: 'Legendary', base_cp: 2600, base_price: 31000 },
            { name: 'Memory God', description: 'Divine control over all memories', rank: 'Legendary', base_cp: 2450, base_price: 28500 },
            { name: 'Titan Origin', description: 'Connection to titan origin source', rank: 'Legendary', base_cp: 2550, base_price: 30000 },
            { name: 'Coordinate Supreme', description: 'Supreme coordinate authority', rank: 'Legendary', base_cp: 2650, base_price: 31500 },
            { name: 'Titan Creator', description: 'Ability to create new titan types', rank: 'Legendary', base_cp: 2500, base_price: 29000 },
            { name: 'Paths Master', description: 'Master of paths manipulation', rank: 'Legendary', base_cp: 2400, base_price: 27500 },
            { name: 'Rumbling Controller', description: 'Control rumbling activation', rank: 'Legendary', base_cp: 2700, base_price: 32000 },
            { name: 'Titan Fusion Master', description: 'Master titan power fusion', rank: 'Legendary', base_cp: 2550, base_price: 30500 },
            { name: 'Coordinate Transcendent', description: 'Transcendent coordinate power', rank: 'Legendary', base_cp: 2600, base_price: 31000 },
            { name: 'Time Memory', description: 'Access memories across time', rank: 'Legendary', base_cp: 2450, base_price: 28500 },
            { name: 'Titan Sovereign', description: 'Sovereign authority over titans', rank: 'Legendary', base_cp: 2500, base_price: 29500 },
            { name: 'Paths God', description: 'Godlike paths dimension power', rank: 'Legendary', base_cp: 2650, base_price: 31500 },
            { name: 'Universal Coordinate', description: 'Coordinate spanning universes', rank: 'Legendary', base_cp: 2700, base_price: 32000 },
            { name: 'Titan Ascension', description: 'Ascend beyond normal titan limits', rank: 'Legendary', base_cp: 2600, base_price: 31000 },
            { name: 'Memory Weaver', description: 'Weave and reshape memories', rank: 'Legendary', base_cp: 2450, base_price: 28500 },

            // Mythic Rank Powers (45 total)
            { name: 'Founding Titan Power', description: 'Ultimate titan control coordinate', rank: 'Mythic', base_cp: 5500, base_price: 100000 },
            { name: 'Ackerman Bloodline', description: 'Awakened superhuman Ackerman powers', rank: 'Mythic', base_cp: 5200, base_price: 90000 },
            { name: 'Royal Blood', description: 'Royal Fritz commanding authority', rank: 'Mythic', base_cp: 5000, base_price: 85000 },
            { name: 'Ymir Original Power', description: 'First titan source power', rank: 'Mythic', base_cp: 6000, base_price: 120000 },
            { name: 'Paths Dimension Mastery', description: 'Complete paths control', rank: 'Mythic', base_cp: 5800, base_price: 110000 },
            { name: 'Coordinate Absolute', description: 'Unlimited coordinate control', rank: 'Mythic', base_cp: 5600, base_price: 105000 },
            { name: 'Rumbling Command', description: 'Ultimate wall titan authority', rank: 'Mythic', base_cp: 5900, base_price: 115000 },
            { name: 'Titan Curse Origin', description: 'Original titan curse source', rank: 'Mythic', base_cp: 5400, base_price: 95000 },
            { name: 'Eldian Progenitor', description: 'Original Eldian descendant', rank: 'Mythic', base_cp: 5300, base_price: 92000 },
            { name: 'Nine Titans Unity', description: 'Combine all nine titan powers', rank: 'Mythic', base_cp: 6200, base_price: 130000 },
            { name: 'Ymir Bloodline', description: 'Direct Ymir Fritz connection', rank: 'Mythic', base_cp: 5900, base_price: 112000 },
            { name: 'Paths Tree Control', description: 'Master paths connection tree', rank: 'Mythic', base_cp: 5700, base_price: 108000 },
            { name: 'Titan Genesis', description: 'Create new titan types', rank: 'Mythic', base_cp: 5500, base_price: 102000 },
            { name: 'Coordinate Transcendence', description: 'Transcend coordinate limits', rank: 'Mythic', base_cp: 6000, base_price: 118000 },
            { name: 'Eldian God Authority', description: 'Divine Eldian authority', rank: 'Mythic', base_cp: 5800, base_price: 107000 },
            { name: 'Titan Dimension Gateway', description: 'Open titan realm gateways', rank: 'Mythic', base_cp: 5400, base_price: 93000 },
            { name: 'Progenitor Will', description: 'Ymir Fritz original will', rank: 'Mythic', base_cp: 5900, base_price: 115000 },
            { name: 'Original Founding Power', description: 'True first Founding Titan', rank: 'Mythic', base_cp: 5500, base_price: 90000 },
            { name: 'Ymir Fritz Legacy', description: 'Direct first titan inheritance', rank: 'Mythic', base_cp: 5800, base_price: 95000 },
            { name: 'Paths Dimension Lord', description: 'Absolute paths realm control', rank: 'Mythic', base_cp: 5200, base_price: 85000 },
            { name: 'Coordinate Supreme', description: 'Ultimate coordinate power', rank: 'Mythic', base_cp: 5900, base_price: 98000 },
            { name: 'Nine Titans Fusion', description: 'All nine titan combination', rank: 'Mythic', base_cp: 6000, base_price: 100000 },
            { name: 'Titan Origin Source', description: 'Original titan power source', rank: 'Mythic', base_cp: 5700, base_price: 92000 },
            { name: 'Memory Omniscience', description: 'All-knowing memory access', rank: 'Mythic', base_cp: 5600, base_price: 105000 },
            { name: 'Titan Overlord', description: 'Supreme titan ruler', rank: 'Mythic', base_cp: 6100, base_price: 125000 },
            { name: 'Paths Eternal', description: 'Eternal paths dimension power', rank: 'Mythic', base_cp: 5800, base_price: 110000 },
            { name: 'Coordinate Infinity', description: 'Infinite coordinate reach', rank: 'Mythic', base_cp: 6000, base_price: 120000 },
            { name: 'Titan Sovereign Supreme', description: 'Supreme titan sovereignty', rank: 'Mythic', base_cp: 5900, base_price: 115000 },
            { name: 'Universal Founder', description: 'Founding power across universes', rank: 'Mythic', base_cp: 6200, base_price: 130000 },
            { name: 'Memory Weaver God', description: 'Divine memory manipulation', rank: 'Mythic', base_cp: 5700, base_price: 108000 },
            { name: 'Titan Creation God', description: 'Divine titan creation power', rank: 'Mythic', base_cp: 5800, base_price: 112000 },
            { name: 'Paths Tree God', description: 'Divine paths tree control', rank: 'Mythic', base_cp: 5900, base_price: 115000 },
            { name: 'Rumbling God', description: 'Divine rumbling control', rank: 'Mythic', base_cp: 6100, base_price: 125000 },
            { name: 'Coordinate Nexus', description: 'Central coordinate nexus control', rank: 'Mythic', base_cp: 6000, base_price: 120000 },
            { name: 'Titan Multiverse', description: 'Multiverse titan authority', rank: 'Mythic', base_cp: 6300, base_price: 135000 },
            { name: 'Paths Omnipotence', description: 'Omnipotent paths power', rank: 'Mythic', base_cp: 6200, base_price: 130000 },
            { name: 'Memory Infinity', description: 'Infinite memory access', rank: 'Mythic', base_cp: 5800, base_price: 110000 },
            { name: 'Titan Eternity', description: 'Eternal titan power', rank: 'Mythic', base_cp: 6000, base_price: 118000 },
            { name: 'Coordinate Omniscience', description: 'All-knowing coordinate', rank: 'Mythic', base_cp: 5900, base_price: 115000 },
            { name: 'Universal Memory', description: 'Universal memory access', rank: 'Mythic', base_cp: 6100, base_price: 122000 },
            { name: 'Titan Ascendant', description: 'Ascended titan power', rank: 'Mythic', base_cp: 6200, base_price: 128000 },
            { name: 'Paths Supreme', description: 'Supreme paths authority', rank: 'Mythic', base_cp: 6000, base_price: 120000 },
            { name: 'Coordinate Eternal', description: 'Eternal coordinate power', rank: 'Mythic', base_cp: 6100, base_price: 125000 },
            { name: 'Titan Transcendent', description: 'Transcendent titan authority', rank: 'Mythic', base_cp: 6300, base_price: 135000 },
            { name: 'Memory Ascension', description: 'Ascended memory power', rank: 'Mythic', base_cp: 5900, base_price: 115000 },

            // Divine Rank Powers (45 total)
            { name: 'Creator Titan Power', description: 'Divine power to create titan types', rank: 'Divine', base_cp: 9500, base_price: 180000 },
            { name: 'Reality Coordinate', description: 'Alter reality through coordinate', rank: 'Divine', base_cp: 10200, base_price: 200000 },
            { name: 'Dimensional Founder', description: 'Founding power across dimensions', rank: 'Divine', base_cp: 9800, base_price: 190000 },
            { name: 'Titan God Authority', description: 'Divine authority over titan-kind', rank: 'Divine', base_cp: 11000, base_price: 220000 },
            { name: 'Paths Tree Master', description: 'Control source tree of paths', rank: 'Divine', base_cp: 10500, base_price: 210000 },
            { name: 'Memory Sovereign', description: 'Absolute memory control', rank: 'Divine', base_cp: 9200, base_price: 175000 },
            { name: 'Time Manipulation Lord', description: 'Control past, present, future', rank: 'Divine', base_cp: 11500, base_price: 230000 },
            { name: 'Universe Guardian', description: 'Protector of universal balance', rank: 'Divine', base_cp: 10800, base_price: 215000 },
            { name: 'Divine Founding', description: 'Divine-level Founding Titan power', rank: 'Divine', base_cp: 12000, base_price: 240000 },
            { name: 'Celestial Coordinate', description: 'Celestial coordinate authority', rank: 'Divine', base_cp: 11200, base_price: 225000 },
            { name: 'Paths Divinity', description: 'Divine paths dimension control', rank: 'Divine', base_cp: 10900, base_price: 220000 },
            { name: 'Titan Creator God', description: 'God of titan creation', rank: 'Divine', base_cp: 11800, base_price: 235000 },
            { name: 'Memory Divinity', description: 'Divine memory manipulation', rank: 'Divine', base_cp: 10400, base_price: 205000 },
            { name: 'Rumbling Divinity', description: 'Divine rumbling control', rank: 'Divine', base_cp: 11600, base_price: 232000 },
            { name: 'Divine Authority', description: 'Supreme divine titan authority', rank: 'Divine', base_cp: 12200, base_price: 245000 },
            { name: 'Celestial Paths', description: 'Celestial paths manipulation', rank: 'Divine', base_cp: 10700, base_price: 215000 },
            { name: 'Divine Transcendence', description: 'Transcend mortal limitations', rank: 'Divine', base_cp: 11400, base_price: 228000 },
            { name: 'God Emperor Titan', description: 'God Emperor of all titans', rank: 'Divine', base_cp: 12500, base_price: 250000 },
            { name: 'Divine Memory', description: 'Divine memory omniscience', rank: 'Divine', base_cp: 10600, base_price: 212000 },
            { name: 'Celestial Founding', description: 'Celestial Founding Titan power', rank: 'Divine', base_cp: 11900, base_price: 238000 },
            { name: 'Divine Coordinate', description: 'Divine coordinate mastery', rank: 'Divine', base_cp: 11300, base_price: 226000 },
            { name: 'Titan Deity', description: 'Titan deity powers', rank: 'Divine', base_cp: 12000, base_price: 240000 },
            { name: 'Divine Paths Master', description: 'Divine paths mastery', rank: 'Divine', base_cp: 11100, base_price: 222000 },
            { name: 'God of Titans', description: 'Supreme god of all titans', rank: 'Divine', base_cp: 12800, base_price: 255000 },
            { name: 'Divine Rumbling', description: 'Divine rumbling authority', rank: 'Divine', base_cp: 11700, base_price: 234000 },
            { name: 'Celestial Memory', description: 'Celestial memory control', rank: 'Divine', base_cp: 10800, base_price: 216000 },
            { name: 'Divine Titan Lord', description: 'Divine lord of titans', rank: 'Divine', base_cp: 12100, base_price: 242000 },
            { name: 'Sacred Coordinate', description: 'Sacred coordinate power', rank: 'Divine', base_cp: 11500, base_price: 230000 },
            { name: 'Divine Creation', description: 'Divine creation authority', rank: 'Divine', base_cp: 11800, base_price: 236000 },
            { name: 'Titan Godhead', description: 'Titan godhead consciousness', rank: 'Divine', base_cp: 12400, base_price: 248000 },
            { name: 'Divine Mastery', description: 'Divine mastery over reality', rank: 'Divine', base_cp: 12000, base_price: 240000 },
            { name: 'Celestial Authority', description: 'Celestial divine authority', rank: 'Divine', base_cp: 11600, base_price: 232000 },
            { name: 'Divine Omnipotence', description: 'Divine omnipotent power', rank: 'Divine', base_cp: 13000, base_price: 260000 },
            { name: 'Sacred Titan Power', description: 'Sacred divine titan power', rank: 'Divine', base_cp: 11900, base_price: 238000 },
            { name: 'Divine Universe', description: 'Divine universal authority', rank: 'Divine', base_cp: 12300, base_price: 246000 },
            { name: 'Celestial Titan', description: 'Celestial titan form', rank: 'Divine', base_cp: 12600, base_price: 252000 },
            { name: 'Divine Eternal', description: 'Divine eternal power', rank: 'Divine', base_cp: 12200, base_price: 244000 },
            { name: 'Sacred Memory', description: 'Sacred memory divinity', rank: 'Divine', base_cp: 11400, base_price: 228000 },
            { name: 'Divine Infinity', description: 'Divine infinite power', rank: 'Divine', base_cp: 13200, base_price: 265000 },
            { name: 'Celestial Creator', description: 'Celestial creation power', rank: 'Divine', base_cp: 12700, base_price: 254000 },
            { name: 'Divine Supremacy', description: 'Divine supreme authority', rank: 'Divine', base_cp: 12900, base_price: 258000 },
            { name: 'Sacred Founding', description: 'Sacred Founding Titan power', rank: 'Divine', base_cp: 12500, base_price: 250000 },
            { name: 'Divine Ascension', description: 'Divine ascension power', rank: 'Divine', base_cp: 12800, base_price: 256000 },
            { name: 'Celestial Mastery', description: 'Celestial mastery authority', rank: 'Divine', base_cp: 12400, base_price: 248000 },
            { name: 'Divine Transcendent', description: 'Divine transcendent power', rank: 'Divine', base_cp: 13100, base_price: 262000 },

            // Cosmic Rank Powers (45 total)
            { name: 'Universe Coordinate', description: 'Coordinate spanning multiple universes', rank: 'Cosmic', base_cp: 18000, base_price: 450000 },
            { name: 'Omniversal Founder', description: 'Founding power across all realities', rank: 'Cosmic', base_cp: 20000, base_price: 500000 },
            { name: 'Titan Multiverse Lord', description: 'Supreme ruler across all dimensions', rank: 'Cosmic', base_cp: 22000, base_price: 550000 },
            { name: 'Reality Shaper', description: 'Reshape reality at will', rank: 'Cosmic', base_cp: 19500, base_price: 480000 },
            { name: 'Existence Controller', description: 'Control fabric of existence', rank: 'Cosmic', base_cp: 21500, base_price: 530000 },
            { name: 'Infinite Paths Master', description: 'Master infinite dimensional paths', rank: 'Cosmic', base_cp: 17500, base_price: 420000 },
            { name: 'Omnipotent Titan', description: 'Ultimate titan beyond comprehension', rank: 'Cosmic', base_cp: 25000, base_price: 600000 },
            { name: 'Cosmic Balance Keeper', description: 'Maintain balance across realities', rank: 'Cosmic', base_cp: 18500, base_price: 460000 },
            { name: 'Universal Destroyer', description: 'Power to destroy universes', rank: 'Cosmic', base_cp: 23000, base_price: 570000 },
            { name: 'Cosmic Creator', description: 'Create new cosmic realities', rank: 'Cosmic', base_cp: 24000, base_price: 590000 },
            { name: 'Infinite Coordinate', description: 'Infinite coordinate authority', rank: 'Cosmic', base_cp: 20500, base_price: 510000 },
            { name: 'Omniversal Memory', description: 'Memory across all realities', rank: 'Cosmic', base_cp: 19000, base_price: 470000 },
            { name: 'Cosmic Titan God', description: 'God of cosmic titans', rank: 'Cosmic', base_cp: 26000, base_price: 610000 },
            { name: 'Reality Weaver', description: 'Weave reality like fabric', rank: 'Cosmic', base_cp: 21000, base_price: 520000 },
            { name: 'Dimensional Lord', description: 'Lord of all dimensions', rank: 'Cosmic', base_cp: 22500, base_price: 560000 },
            { name: 'Cosmic Founding', description: 'Cosmic-level Founding power', rank: 'Cosmic', base_cp: 24500, base_price: 595000 },
            { name: 'Universal Memory', description: 'Universal memory control', rank: 'Cosmic', base_cp: 18800, base_price: 465000 },
            { name: 'Infinite Titan', description: 'Infinite titan capabilities', rank: 'Cosmic', base_cp: 27000, base_price: 620000 },
            { name: 'Cosmic Paths', description: 'Cosmic paths manipulation', rank: 'Cosmic', base_cp: 19200, base_price: 475000 },
            { name: 'Omniversal Ruler', description: 'Ruler of all realities', rank: 'Cosmic', base_cp: 25500, base_price: 605000 },
            { name: 'Reality Emperor', description: 'Emperor of all reality', rank: 'Cosmic', base_cp: 23500, base_price: 575000 },
            { name: 'Cosmic Authority', description: 'Supreme cosmic authority', rank: 'Cosmic', base_cp: 21800, base_price: 535000 },
            { name: 'Universal Titan', description: 'Universal titan power', rank: 'Cosmic', base_cp: 20800, base_price: 515000 },
            { name: 'Infinite Reality', description: 'Infinite reality control', rank: 'Cosmic', base_cp: 24200, base_price: 590000 },
            { name: 'Cosmic Omnipotence', description: 'Cosmic omnipotent power', rank: 'Cosmic', base_cp: 28000, base_price: 630000 },
            { name: 'Dimensional Titan', description: 'Titan across dimensions', rank: 'Cosmic', base_cp: 22200, base_price: 545000 },
            { name: 'Universal Lord', description: 'Lord of universes', rank: 'Cosmic', base_cp: 21200, base_price: 525000 },
            { name: 'Cosmic Creator God', description: 'God of cosmic creation', rank: 'Cosmic', base_cp: 26500, base_price: 615000 },
            { name: 'Reality Sovereign', description: 'Sovereign of reality', rank: 'Cosmic', base_cp: 23800, base_price: 580000 },
            { name: 'Infinite Founding', description: 'Infinite Founding power', rank: 'Cosmic', base_cp: 25200, base_price: 600000 },
            { name: 'Cosmic Memory God', description: 'God of cosmic memory', rank: 'Cosmic', base_cp: 20200, base_price: 495000 },
            { name: 'Universal Paths', description: 'Universal paths control', rank: 'Cosmic', base_cp: 19800, base_price: 485000 },
            { name: 'Cosmic Transcendence', description: 'Cosmic transcendent power', rank: 'Cosmic', base_cp: 24800, base_price: 598000 },
            { name: 'Omniversal God', description: 'God of all realities', rank: 'Cosmic', base_cp: 29000, base_price: 640000 },
            { name: 'Reality Master', description: 'Master of all reality', rank: 'Cosmic', base_cp: 22800, base_price: 555000 },
            { name: 'Cosmic Eternity', description: 'Cosmic eternal power', rank: 'Cosmic', base_cp: 21500, base_price: 530000 },
            { name: 'Universal Creator', description: 'Creator of universes', rank: 'Cosmic', base_cp: 25800, base_price: 608000 },
            { name: 'Infinite Authority', description: 'Infinite cosmic authority', rank: 'Cosmic', base_cp: 23200, base_price: 565000 },
            { name: 'Cosmic Supremacy', description: 'Cosmic supreme power', rank: 'Cosmic', base_cp: 27500, base_price: 625000 },
            { name: 'Omniversal Creator', description: 'Creator of all realities', rank: 'Cosmic', base_cp: 28500, base_price: 635000 },
            { name: 'Reality God Emperor', description: 'God Emperor of reality', rank: 'Cosmic', base_cp: 26800, base_price: 618000 },
            { name: 'Cosmic Infinity', description: 'Cosmic infinite power', rank: 'Cosmic', base_cp: 24500, base_price: 595000 },
            { name: 'Universal Omnipotence', description: 'Universal omnipotent authority', rank: 'Cosmic', base_cp: 27200, base_price: 622000 },
            { name: 'Cosmic Ascension', description: 'Cosmic ascension power', rank: 'Cosmic', base_cp: 25000, base_price: 600000 },
            { name: 'Omniversal Master', description: 'Master of all existence', rank: 'Cosmic', base_cp: 29500, base_price: 645000 },

            // Transcendent Rank Powers (40 total)
            { name: 'Beyond Reality Power', description: 'Power that transcends reality itself', rank: 'Transcendent', base_cp: 35000, base_price: 800000 },
            { name: 'Conceptual Titan', description: 'Titan existing as pure concept', rank: 'Transcendent', base_cp: 38000, base_price: 850000 },
            { name: 'Meta-Coordinate', description: 'Coordinate power over coordinates', rank: 'Transcendent', base_cp: 40000, base_price: 900000 },
            { name: 'Transcendent Founding', description: 'Founding power beyond existence', rank: 'Transcendent', base_cp: 42000, base_price: 950000 },
            { name: 'Abstract Paths', description: 'Paths existing in abstract dimensions', rank: 'Transcendent', base_cp: 36000, base_price: 820000 },
            { name: 'Meta-Reality Controller', description: 'Control the concept of reality', rank: 'Transcendent', base_cp: 39000, base_price: 880000 },
            { name: 'Transcendent Memory', description: 'Memory beyond space and time', rank: 'Transcendent', base_cp: 34000, base_price: 780000 },
            { name: 'Conceptual Authority', description: 'Authority over concepts themselves', rank: 'Transcendent', base_cp: 41000, base_price: 920000 },
            { name: 'Meta-Existence', description: 'Existence beyond existence', rank: 'Transcendent', base_cp: 43000, base_price: 980000 },
            { name: 'Transcendent Creator', description: 'Creator beyond creation', rank: 'Transcendent', base_cp: 37000, base_price: 840000 },
            { name: 'Abstract Titan God', description: 'Titan god as abstract concept', rank: 'Transcendent', base_cp: 45000, base_price: 1000000 },
            { name: 'Meta-Omnipotence', description: 'Omnipotence over omnipotence', rank: 'Transcendent', base_cp: 46000, base_price: 1020000 },
            { name: 'Transcendent Paths', description: 'Paths transcending dimensions', rank: 'Transcendent', base_cp: 38500, base_price: 865000 },
            { name: 'Conceptual Founding', description: 'Founding as pure concept', rank: 'Transcendent', base_cp: 41500, base_price: 935000 },
            { name: 'Meta-Coordinate God', description: 'God of coordinate concepts', rank: 'Transcendent', base_cp: 44000, base_price: 990000 },
            { name: 'Transcendent Reality', description: 'Reality beyond reality', rank: 'Transcendent', base_cp: 42500, base_price: 960000 },
            { name: 'Abstract Memory', description: 'Memory as abstract force', rank: 'Transcendent', base_cp: 35500, base_price: 810000 },
            { name: 'Meta-Creation', description: 'Creation beyond creation', rank: 'Transcendent', base_cp: 39500, base_price: 890000 },
            { name: 'Transcendent Authority', description: 'Authority transcending power', rank: 'Transcendent', base_cp: 43500, base_price: 985000 },
            { name: 'Conceptual Universe', description: 'Universe as concept', rank: 'Transcendent', base_cp: 40500, base_price: 915000 },
            { name: 'Meta-Titan', description: 'Titan beyond titan concept', rank: 'Transcendent', base_cp: 47000, base_price: 1040000 },
            { name: 'Transcendent Infinity', description: 'Infinity beyond infinity', rank: 'Transcendent', base_cp: 48000, base_price: 1060000 },
            { name: 'Abstract Omnipotence', description: 'Omnipotence as abstract', rank: 'Transcendent', base_cp: 45500, base_price: 1010000 },
            { name: 'Meta-Existence God', description: 'God of existence concepts', rank: 'Transcendent', base_cp: 44500, base_price: 995000 },
            { name: 'Transcendent Supreme', description: 'Supreme transcendent power', rank: 'Transcendent', base_cp: 46500, base_price: 1030000 },
            { name: 'Conceptual Eternity', description: 'Eternity as pure concept', rank: 'Transcendent', base_cp: 41800, base_price: 940000 },
            { name: 'Meta-Reality God', description: 'God of reality concepts', rank: 'Transcendent', base_cp: 43800, base_price: 988000 },
            { name: 'Transcendent Mastery', description: 'Mastery beyond mastery', rank: 'Transcendent', base_cp: 42800, base_price: 965000 },
            { name: 'Abstract Creation', description: 'Creation as abstract force', rank: 'Transcendent', base_cp: 39800, base_price: 895000 },
            { name: 'Meta-Universe', description: 'Universe beyond universe', rank: 'Transcendent', base_cp: 45800, base_price: 1015000 },
            { name: 'Transcendent Omniscience', description: 'Omniscience beyond knowing', rank: 'Transcendent', base_cp: 44200, base_price: 992000 },
            { name: 'Conceptual Power', description: 'Power as pure concept', rank: 'Transcendent', base_cp: 38800, base_price: 870000 },
            { name: 'Meta-Authority', description: 'Authority over authority', rank: 'Transcendent', base_cp: 42200, base_price: 950000 },
            { name: 'Transcendent Eternal', description: 'Eternal beyond time', rank: 'Transcendent', base_cp: 45200, base_price: 1005000 },
            { name: 'Abstract Supremacy', description: 'Supremacy as concept', rank: 'Transcendent', base_cp: 46200, base_price: 1025000 },
            { name: 'Meta-Transcendence', description: 'Transcendence beyond transcendence', rank: 'Transcendent', base_cp: 48500, base_price: 1070000 },
            { name: 'Conceptual Absolute', description: 'Absolute as pure concept', rank: 'Transcendent', base_cp: 47500, base_price: 1050000 },
            { name: 'Transcendent Beyond', description: 'Beyond the concept of beyond', rank: 'Transcendent', base_cp: 49000, base_price: 1080000 },
            { name: 'Meta-Absolute', description: 'Absolute beyond absolute', rank: 'Transcendent', base_cp: 49500, base_price: 1090000 },
            { name: 'Transcendent Conceptual', description: 'Conceptual transcendence itself', rank: 'Transcendent', base_cp: 50000, base_price: 1100000 },

            // Omnipotent Rank Powers (20 total)
            { name: 'Pure Omnipotence', description: 'True omnipotence without limitation', rank: 'Omnipotent', base_cp: 75000, base_price: 1500000 },
            { name: 'Absolute Authority', description: 'Authority that cannot be challenged', rank: 'Omnipotent', base_cp: 80000, base_price: 1600000 },
            { name: 'Omnipotent Titan', description: 'Titan with true omnipotent power', rank: 'Omnipotent', base_cp: 85000, base_price: 1700000 },
            { name: 'Ultimate Coordinate', description: 'Coordinate with no limitations', rank: 'Omnipotent', base_cp: 78000, base_price: 1560000 },
            { name: 'Omnipotent Founding', description: 'Founding power without bounds', rank: 'Omnipotent', base_cp: 82000, base_price: 1640000 },
            { name: 'Infinite Power', description: 'Power truly without limits', rank: 'Omnipotent', base_cp: 90000, base_price: 1800000 },
            { name: 'Omnipotent Creator', description: 'Creator with unlimited power', rank: 'Omnipotent', base_cp: 88000, base_price: 1760000 },
            { name: 'Absolute Reality', description: 'Reality control without restriction', rank: 'Omnipotent', base_cp: 83000, base_price: 1660000 },
            { name: 'Omnipotent Memory', description: 'Memory power without bounds', rank: 'Omnipotent', base_cp: 76000, base_price: 1520000 },
            { name: 'Ultimate Existence', description: 'Existence beyond all concepts', rank: 'Omnipotent', base_cp: 92000, base_price: 1840000 },
            { name: 'Omnipotent Paths', description: 'Paths with infinite reach', rank: 'Omnipotent', base_cp: 79000, base_price: 1580000 },
            { name: 'Absolute Control', description: 'Control over everything', rank: 'Omnipotent', base_cp: 87000, base_price: 1740000 },
            { name: 'Omnipotent Supreme', description: 'Supreme omnipotent authority', rank: 'Omnipotent', base_cp: 95000, base_price: 1900000 },
            { name: 'Infinite Authority', description: 'Authority without boundaries', rank: 'Omnipotent', base_cp: 84000, base_price: 1680000 },
            { name: 'Omnipotent God', description: 'True god with omnipotent power', rank: 'Omnipotent', base_cp: 91000, base_price: 1820000 },
            { name: 'Ultimate Power', description: 'Power that surpasses all', rank: 'Omnipotent', base_cp: 89000, base_price: 1780000 },
            { name: 'Omnipotent Mastery', description: 'Mastery over all existence', rank: 'Omnipotent', base_cp: 86000, base_price: 1720000 },
            { name: 'Absolute Omnipotence', description: 'Omnipotence in its purest form', rank: 'Omnipotent', base_cp: 98000, base_price: 1960000 },
            { name: 'Omnipotent Eternal', description: 'Eternal omnipotent power', rank: 'Omnipotent', base_cp: 93000, base_price: 1860000 },
            { name: 'Ultimate Omnipotence', description: 'The ultimate omnipotent force', rank: 'Omnipotent', base_cp: 100000, base_price: 2000000 },

            // Absolute Rank Powers (3 total - final tier)
            { name: 'The One Above All', description: 'The ultimate power that created everything', rank: 'Absolute', base_cp: 500000, base_price: 10000000 },
            { name: 'Source of All Existence', description: 'The original source from which all reality springs', rank: 'Absolute', base_cp: 750000, base_price: 15000000 },
            { name: 'The Absolute', description: 'Power beyond description, concept, or comprehension', rank: 'Absolute', base_cp: 1000000, base_price: 20000000 }
        ];

        let added = 0;
        let skipped = 0;

        logger.info(`\nAttempting to add ${megaPowerList.length} powers...`);

        for (const power of megaPowerList) {
            try {
                await connection.execute(
                    'INSERT INTO powers (name, description, rank, base_cp, base_price) VALUES (?, ?, ?, ?, ?)',
                    [power.name, power.description, power.rank, power.base_cp, power.base_price]
                );
                logger.info(`✓ Added: ${power.name} (${power.rank}) - ${power.base_cp} CP`);
                added++;
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    skipped++;
                } else {
                    logger.error(`✗ Error adding ${power.name}:`, error.message);
                }
            }
        }

        // Show final counts
        const [finalCounts] = await connection.execute(`
            SELECT rank, COUNT(*) as count 
            FROM powers 
            GROUP BY rank 
            ORDER BY CASE rank 
                WHEN 'Normal' THEN 1 
                WHEN 'Rare' THEN 2 
                WHEN 'Epic' THEN 3 
                WHEN 'Legendary' THEN 4 
                WHEN 'Mythic' THEN 5 
                WHEN 'Divine' THEN 6 
                WHEN 'Cosmic' THEN 7 
                WHEN 'Transcendent' THEN 8 
                WHEN 'Omnipotent' THEN 9 
                WHEN 'Absolute' THEN 10 
            END
        `);
        
        logger.info('\n=== FINAL POWER COUNTS ===');
        finalCounts.forEach(row => {
            logger.info(`${row.rank}: ${row.count} powers`);
        });
        
        logger.info(`\nSummary: Added ${added} new powers, skipped ${skipped} duplicates`);
        logger.info('Power database now supports infinite expansion!');
        
    } catch (error) {
        logger.error('Error in massive power expansion:', error);
    } finally {
        await connection.end();
    }
}

// Run if called directly
if (require.main === module) {
    massivePowerExpansion()
        .then(() => {
            logger.info('Massive power expansion completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { massivePowerExpansion };