/**
 * Centralized Power Data Management
 * All power-related data and configurations
 */

const powerRarities = {
    'Normal': { weight: 70, cpMultiplier: 1.0, baseCPMin: 50, baseCPMax: 150 },
    'Rare': { weight: 20, cpMultiplier: 2.5, baseCPMin: 200, baseCPMax: 400 },
    'Epic': { weight: 7, cpMultiplier: 4.0, baseCPMin: 800, baseCPMax: 1200 },
    'Legendary': { weight: 2.5, cpMultiplier: 6.5, baseCPMin: 2000, baseCPMax: 3000 },
    'Mythic': { weight: 0.5, cpMultiplier: 10.0, baseCPMin: 5000, baseCPMax: 6000 },
    'Divine': { weight: 0, cpMultiplier: 15.0, baseCPMin: 9000, baseCPMax: 12000 },
    'Cosmic': { weight: 0, cpMultiplier: 25.0, baseCPMin: 18000, baseCPMax: 25000 },
    'Transcendent': { weight: 0, cpMultiplier: 40.0, baseCPMin: 35000, baseCPMax: 50000 },
    'Omnipotent': { weight: 0, cpMultiplier: 60.0, baseCPMin: 75000, baseCPMax: 100000 },
    'Absolute': { weight: 0, cpMultiplier: 100.0, baseCPMin: 500000, baseCPMax: 1000000 }
};

const rankEmojis = {
    'Normal': '⚪',
    'Rare': '🔵',
    'Epic': '🟣',
    'Legendary': '🟡',
    'Mythic': '🔴',
    'Divine': '🟢',
    'Cosmic': '🟠',
    'Transcendent': '⚫',
    'Omnipotent': '✨',
    'Absolute': '💎'
};

const rankColors = {
    'Normal': '#999999',
    'Rare': '#0099ff',
    'Epic': '#9932cc',
    'Legendary': '#ffaa00',
    'Mythic': '#ff0000',
    'Divine': '#00ff00',
    'Cosmic': '#ff6600',
    'Transcendent': '#000000',
    'Omnipotent': '#ffffff',
    'Absolute': '#ff69b4'
};

const powerPools = {
    'Normal': [
        { name: 'Basic Combat Training', description: 'Foundation of all military combat', base_cp: 45 },
        { name: 'Vertical Maneuvering Equipment', description: 'Standard ODM gear for mobility', base_cp: 50 },
        { name: 'Thunder Spear', description: 'Explosive spear for titan combat', base_cp: 60 },
        { name: 'Blade Mastery', description: 'Expert dual blade techniques', base_cp: 55 },
        { name: 'Scout Regiment Training', description: 'Enhanced reconnaissance skills', base_cp: 52 },
        { name: 'Garrison Regiment Discipline', description: 'Wall defense expertise', base_cp: 48 },
        { name: 'Military Police Training', description: 'Advanced command techniques', base_cp: 58 },
        { name: 'Horse Riding Mastery', description: 'Expert cavalry skills', base_cp: 47 },
        { name: 'Signal Flare Expertise', description: 'Battlefield communication master', base_cp: 46 },
        { name: 'Cannon Operation', description: 'Artillery specialist training', base_cp: 54 },
        { name: 'Hand-to-Hand Combat', description: 'Unarmed fighting mastery', base_cp: 51 },
        { name: 'Stealth Operations', description: 'Silent infiltration techniques', base_cp: 49 },
        { name: 'Medical Training', description: 'Battlefield first aid expert', base_cp: 47 },
        { name: 'Engineering Skills', description: 'Fortification construction', base_cp: 53 },
        { name: 'Tactical Planning', description: 'Strategic battlefield analysis', base_cp: 56 },
        { name: 'Survival Instinct', description: 'Enhanced danger detection', base_cp: 50 },
        { name: 'Weather Reading', description: 'Mission weather prediction', base_cp: 45 },
        { name: 'Equipment Maintenance', description: 'ODM gear repair mastery', base_cp: 48 },
        { name: 'Formation Leadership', description: 'Troop commanding skills', base_cp: 57 },
        { name: 'Titan Tracking', description: 'Titan movement prediction', base_cp: 52 }
    ],
    'Rare': [
        { name: 'Enhanced Strength', description: 'Superhuman physical capabilities', base_cp: 250 },
        { name: 'Steam Release', description: 'Release scalding steam defense', base_cp: 230 },
        { name: 'Titan Hardening', description: 'Harden skin for defense and offense', base_cp: 280 },
        { name: 'Regeneration', description: 'Rapid healing of wounds', base_cp: 270 },
        { name: 'Titan Sensing', description: 'Detect nearby titans', base_cp: 240 },
        { name: 'Enhanced Reflexes', description: 'Lightning-fast reactions', base_cp: 260 },
        { name: 'Partial Transformation', description: 'Limited titan transformation', base_cp: 290 },
        { name: 'Memory Resistance', description: 'Resist memory manipulation', base_cp: 250 },
        { name: 'Enhanced Endurance', description: 'Vastly improved stamina', base_cp: 240 },
        { name: 'Bloodline Awakening', description: 'Unlock ancestral genetic potential', base_cp: 300 },
        { name: 'Thunder Spear Mastery', description: 'Expert explosive weaponry', base_cp: 220 },
        { name: 'Coordinate Prediction', description: 'Predict enemy movements', base_cp: 250 },
        { name: 'Adrenaline Surge', description: 'Temporary massive boost', base_cp: 280 },
        { name: 'Tactical Genius', description: 'Enhanced strategic thinking', base_cp: 260 },
        { name: 'Wall Combat Specialist', description: 'Master vertical maneuvering', base_cp: 270 },
        { name: 'Beast Taming', description: 'Communicate with animals', base_cp: 230 },
        { name: 'Titan Blood Absorption', description: 'Absorb titan blood for enhancement', base_cp: 265 },
        { name: 'Enhanced Recovery', description: 'Rapid fatigue recovery', base_cp: 255 },
        { name: 'Titan Weak Point Detection', description: 'Instinctively find weak points', base_cp: 275 },
        { name: 'Combat Precognition', description: 'Brief glimpses of future', base_cp: 285 },
        { name: 'Bloodlust Suppression', description: 'Maintain sanity in combat', base_cp: 245 },
        { name: 'Titan Mimicry Voice', description: 'Imitate titan sounds', base_cp: 235 },
        { name: 'Enhanced Grip Strength', description: 'Superhuman gripping power', base_cp: 265 },
        { name: 'Battle Meditation', description: 'Calm focus in chaos', base_cp: 255 },
        { name: 'Ackerman Awakening', description: 'Partial Ackerman bloodline power', base_cp: 320 }
    ],
    'Epic': [
        { name: 'Armored Titan Power', description: 'Massive armored defensive form', base_cp: 950 },
        { name: 'Colossal Titan Power', description: 'Enormous size with steam attacks', base_cp: 1100 },
        { name: 'Female Titan Power', description: 'Agile form with hardening', base_cp: 900 },
        { name: 'Beast Titan Power', description: 'Intelligent throwing abilities', base_cp: 1000 },
        { name: 'Cart Titan Power', description: 'Endurance with equipment carrying', base_cp: 850 },
        { name: 'Jaw Titan Power', description: 'Swift with powerful bite', base_cp: 950 },
        { name: 'War Hammer Titan Power', description: 'Create weapons from hardened material', base_cp: 1050 },
        { name: 'Titan Shifter Awakening', description: 'Awaken dormant shifter abilities', base_cp: 920 },
        { name: 'War Hammer Mastery', description: 'Master weapon creation', base_cp: 980 },
        { name: 'Partial Founding Power', description: 'Limited Founding Titan access', base_cp: 1100 },
        { name: 'Anti-Titan Artillery', description: 'Advanced anti-titan weaponry', base_cp: 800 },
        { name: 'Marleyan Warrior Elite', description: 'Elite Marley warrior training', base_cp: 890 },
        { name: 'Eldian Restorationist', description: 'Eldian restoration movement power', base_cp: 860 },
        { name: 'Paradis Devil Technology', description: 'Advanced Paradis technology', base_cp: 830 },
        { name: 'Survey Corps Elite', description: 'Ultimate Survey Corps training', base_cp: 900 },
        { name: 'Wall Rose Guardian', description: 'Sacred wall protection duty', base_cp: 870 },
        { name: 'Titan Research Mastery', description: 'Deep titan biology understanding', base_cp: 820 },
        { name: 'Memory Inheritance', description: 'Access previous holder memories', base_cp: 940 },
        { name: 'Coordinate Fragments', description: 'Partial coordinate power', base_cp: 1080 },
        { name: 'Wall Titan Command', description: 'Control wall colossal titans', base_cp: 1020 }
    ],
    'Legendary': [
        { name: 'Attack Titan Power', description: 'Attack Titan with future memories', base_cp: 2200 },
        { name: 'Warhammer Titan Power', description: 'Create weapons and structures', base_cp: 2300 },
        { name: 'Jaw Titan Elite', description: 'Enhanced Jaw Titan capabilities', base_cp: 2100 },
        { name: 'Cart Titan Advanced', description: 'Advanced Cart Titan abilities', base_cp: 2000 },
        { name: 'Progenitor Titan Fragment', description: 'Incomplete original Founding power', base_cp: 2500 },
        { name: 'Ymir Curse Breaking', description: 'Partially break 13-year curse', base_cp: 2400 },
        { name: 'Paths Manipulation', description: 'Limited paths dimension control', base_cp: 2350 },
        { name: 'Titan Shifter Evolution', description: 'Evolved Nine Titans form', base_cp: 2250 },
        { name: 'Marleyan Titan Science', description: 'Advanced titan biology control', base_cp: 2150 },
        { name: 'Eldian King Will', description: 'First king pacifist ideology', base_cp: 2450 },
        { name: 'Titan War Memories', description: 'Great Titan War memories', base_cp: 2200 },
        { name: 'Nine Titans Harmony', description: 'Unify multiple titan powers', base_cp: 2600 },
        { name: 'Coordinate Mastery', description: 'Advanced coordinate manipulation', base_cp: 2500 },
        { name: 'Titan Transformation Override', description: 'Force or prevent transformations', base_cp: 2300 },
        { name: 'Ancestral Titan Power', description: 'Ancient titan shifter connection', base_cp: 2250 },
        { name: 'Paths Communication', description: 'Direct paths dimension communication', base_cp: 2350 },
        { name: 'Titan Nexus Control', description: 'Control central titan connection point', base_cp: 2550 },
        { name: 'Marley Military Command', description: 'Supreme Marleyan authority', base_cp: 2050 },
        { name: 'Eldian Bloodline Purity', description: 'Purest Eldian bloodline connection', base_cp: 2400 },
        { name: 'Titan Serum Mastery', description: 'Ultimate serum control', base_cp: 2200 }
    ],
    'Mythic': [
        { name: 'Founding Titan Power', description: 'Ultimate titan control coordinate', base_cp: 5500 },
        { name: 'Ackerman Bloodline', description: 'Awakened superhuman Ackerman powers', base_cp: 5200 },
        { name: 'Royal Blood', description: 'Royal Fritz commanding authority', base_cp: 5000 },
        { name: 'Ymir Original Power', description: 'First titan source power', base_cp: 6000 },
        { name: 'Paths Dimension Mastery', description: 'Complete paths control', base_cp: 5800 },
        { name: 'Coordinate Absolute', description: 'Unlimited coordinate control', base_cp: 5600 },
        { name: 'Rumbling Command', description: 'Ultimate wall titan authority', base_cp: 5900 },
        { name: 'Titan Curse Origin', description: 'Original titan curse source', base_cp: 5400 },
        { name: 'Eldian Progenitor', description: 'Original Eldian descendant', base_cp: 5300 },
        { name: 'Nine Titans Unity', description: 'Combine all nine titan powers', base_cp: 6200 },
        { name: 'Ymir Bloodline', description: 'Direct Ymir Fritz connection', base_cp: 5900 },
        { name: 'Paths Tree Control', description: 'Master paths connection tree', base_cp: 5700 },
        { name: 'Titan Genesis', description: 'Create new titan types', base_cp: 5500 },
        { name: 'Coordinate Transcendence', description: 'Transcend coordinate limits', base_cp: 6000 },
        { name: 'Eldian God Authority', description: 'Divine Eldian authority', base_cp: 5800 },
        { name: 'Titan Dimension Gateway', description: 'Open titan realm gateways', base_cp: 5400 },
        { name: 'Progenitor Will', description: 'Ymir Fritz original will', base_cp: 5900 },
        { name: 'Original Founding Power', description: 'True first Founding Titan', base_cp: 5500 },
        { name: 'Ymir Fritz Legacy', description: 'Direct first titan inheritance', base_cp: 5800 },
        { name: 'Paths Dimension Lord', description: 'Absolute paths realm control', base_cp: 5200 }
    ],
    'Divine': [
        { name: 'Creator Titan Power', description: 'Divine power to create titan types', base_cp: 9500 },
        { name: 'Reality Coordinate', description: 'Alter reality through coordinate', base_cp: 10200 },
        { name: 'Dimensional Founder', description: 'Founding power across dimensions', base_cp: 9800 },
        { name: 'Titan God Authority', description: 'Divine authority over titan-kind', base_cp: 11000 },
        { name: 'Paths Tree Master', description: 'Control source tree of paths', base_cp: 10500 },
        { name: 'Memory Sovereign', description: 'Absolute memory control', base_cp: 9200 },
        { name: 'Time Manipulation Lord', description: 'Control past, present, future', base_cp: 11500 },
        { name: 'Universe Guardian', description: 'Protector of universal balance', base_cp: 10800 },
        { name: 'Divine Founding', description: 'Divine-level Founding Titan power', base_cp: 12000 },
        { name: 'Celestial Coordinate', description: 'Celestial coordinate authority', base_cp: 11200 },
        { name: 'Paths Divinity', description: 'Divine paths dimension control', base_cp: 10900 },
        { name: 'Titan Creator God', description: 'God of titan creation', base_cp: 11800 },
        { name: 'Memory Divinity', description: 'Divine memory manipulation', base_cp: 10400 },
        { name: 'Rumbling Divinity', description: 'Divine rumbling control', base_cp: 11600 },
        { name: 'Divine Authority', description: 'Supreme divine titan authority', base_cp: 12200 }
    ],
    'Cosmic': [
        { name: 'Conceptual Titan', description: 'Titan as pure concept', base_cp: 20000 },
        { name: 'Universal Coordinate', description: 'Coordinate spanning universes', base_cp: 22000 },
        { name: 'Reality Architect', description: 'Architect of reality structure', base_cp: 21000 },
        { name: 'Dimensional Sovereign', description: 'Ruler of all dimensions', base_cp: 23000 },
        { name: 'Cosmic Founding', description: 'Founding power across cosmos', base_cp: 24000 },
        { name: 'Universal Memory', description: 'Memory spanning all existence', base_cp: 20500 },
        { name: 'Cosmic Paths', description: 'Paths network across cosmos', base_cp: 22500 },
        { name: 'Reality Titan', description: 'Titan form of reality itself', base_cp: 25000 },
        { name: 'Cosmic Authority', description: 'Authority over cosmic order', base_cp: 23500 },
        { name: 'Universal Creator', description: 'Creator of universes', base_cp: 24500 }
    ],
    'Transcendent': [
        { name: 'Meta-Titan', description: 'Titan beyond titan concepts', base_cp: 40000 },
        { name: 'Transcendent Coordinate', description: 'Coordinate beyond reality', base_cp: 42000 },
        { name: 'Beyond Existence', description: 'Power beyond existence itself', base_cp: 45000 },
        { name: 'Conceptual Absolute', description: 'Absolute as pure concept', base_cp: 47500 },
        { name: 'Transcendent Authority', description: 'Authority beyond comprehension', base_cp: 48000 },
        { name: 'Meta-Absolute', description: 'Absolute beyond absolute', base_cp: 49500 },
        { name: 'Transcendent Omnipotence', description: 'Omnipotence beyond limits', base_cp: 50000 }
    ],
    'Omnipotent': [
        { name: 'Omnipotent Titan', description: 'Titan with unlimited power', base_cp: 75000 },
        { name: 'Absolute Authority', description: 'Authority that cannot be challenged', base_cp: 80000 },
        { name: 'Perfect Omnipotence', description: 'Omnipotence in perfect form', base_cp: 85000 },
        { name: 'Absolute Reality', description: 'Reality control without restriction', base_cp: 83000 },
        { name: 'Omnipotent Creator', description: 'Creator with unlimited power', base_cp: 90000 },
        { name: 'Absolute Control', description: 'Control over everything', base_cp: 87000 },
        { name: 'Perfect Authority', description: 'Authority in its perfect form', base_cp: 92000 },
        { name: 'Omnipotent Supreme', description: 'Supreme omnipotent power', base_cp: 95000 },
        { name: 'Absolute Omnipotence', description: 'Omnipotence in its purest form', base_cp: 98000 }
    ],
    'Absolute': [
        { name: 'The One Above All', description: 'The ultimate power that created everything', base_cp: 500000 },
        { name: 'Source of All Existence', description: 'The original source from which all reality springs', base_cp: 750000 },
        { name: 'The Absolute', description: 'Power beyond description, concept, or comprehension', base_cp: 1000000 }
    ]
};

module.exports = {
    powerRarities,
    rankEmojis,
    rankColors,
    powerPools
};