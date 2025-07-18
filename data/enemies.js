/**
 * Centralized Enemy Data Management
 * All combat enemy data and configurations
 */



const enemyTypes = {
    normal: [
        { name: 'Mindless Pure Titan', power: 75, type: 'titan', description: 'Basic mindless titan driven by hunger' },
        { name: 'Wandering Pure Titan', power: 70, type: 'titan', description: 'Aimlessly roaming titan' },
        { name: 'Aggressive Pure Titan', power: 85, type: 'titan', description: 'Unusually hostile pure titan' },
        { name: 'Small Pure Titan', power: 60, type: 'titan', description: '3-meter class pure titan' },
        { name: 'Medium Pure Titan', power: 80, type: 'titan', description: '7-meter class pure titan' },
        { name: 'Large Pure Titan', power: 95, type: 'titan', description: '12-meter class pure titan' },
        { name: 'Crawler Titan', power: 65, type: 'titan', description: 'Titan that moves on all fours' },
        { name: 'Jumping Titan', power: 88, type: 'titan', description: 'Titan with enhanced leaping ability' },
        { name: 'Running Titan', power: 92, type: 'titan', description: 'Unusually fast pure titan' },
        { name: 'Climbing Titan', power: 78, type: 'titan', description: 'Titan that scales walls efficiently' },
        { name: 'Garrison Recruit', power: 52, type: 'human', description: 'New wall defense trainee' },
        { name: 'Garrison Soldier', power: 58, type: 'human', description: 'Standard wall defender' },
        { name: 'Garrison Veteran', power: 67, type: 'human', description: 'Experienced wall guard' },
        { name: 'Garrison Captain', power: 75, type: 'human', description: 'Wall defense unit leader' },
        { name: 'Military Police Cadet', power: 55, type: 'human', description: 'Interior police trainee' },
        { name: 'Military Police Officer', power: 62, type: 'human', description: 'Interior law enforcement' },
        { name: 'Military Police Sergeant', power: 70, type: 'human', description: 'Mid-rank police officer' },
        { name: 'Military Police Commander', power: 78, type: 'human', description: 'High-rank police leader' },
        { name: 'Scout Cadet', power: 53, type: 'human', description: 'Survey Corps trainee' },
        { name: 'Scout Soldier', power: 60, type: 'human', description: 'Standard survey member' }
    ],
    rare: [
        { name: 'Abnormal Titan Alpha', power: 250, type: 'titan', description: 'Highly intelligent abnormal titan' },
        { name: 'Deviant Titan Prime', power: 280, type: 'titan', description: 'Unpredictable behavior titan' },
        { name: 'Berserker Titan Elite', power: 320, type: 'titan', description: 'Frenzied combat titan' },
        { name: 'Stalker Titan Advanced', power: 240, type: 'titan', description: 'Silent hunting titan' },
        { name: 'Climber Titan Master', power: 260, type: 'titan', description: 'Wall scaling specialist' },
        { name: 'Runner Titan Swift', power: 290, type: 'titan', description: 'Extremely fast titan' },
        { name: 'Jumper Titan High', power: 270, type: 'titan', description: 'Enhanced leaping titan' },
        { name: 'Grabber Titan Strong', power: 300, type: 'titan', description: 'Powerful grasping titan' },
        { name: 'Biter Titan Fierce', power: 310, type: 'titan', description: 'Devastating bite titan' },
        { name: 'Screamer Titan Loud', power: 230, type: 'titan', description: 'Sonic attack titan' },
        { name: 'Marley Warrior Candidate', power: 320, type: 'human', description: 'Elite titan inheritance candidate' },
        { name: 'Ackerman Descendant', power: 380, type: 'human', description: 'Awakened superhuman bloodline' },
        { name: 'Royal Guard Elite', power: 350, type: 'human', description: 'Fritz family protector' },
        { name: 'Anti-Personnel Squad', power: 340, type: 'human', description: 'Kenny\'s special forces' },
        { name: 'Survey Corps Veteran', power: 310, type: 'human', description: 'Battle-hardened explorer' },
        { name: 'Military Police Captain', power: 330, type: 'human', description: 'Interior police commander' },
        { name: 'Garrison Commander', power: 325, type: 'human', description: 'Wall defense leader' },
        { name: 'Marley General', power: 370, type: 'human', description: 'High military command' },
        { name: 'Yeagerist Officer', power: 315, type: 'human', description: 'Eren faction commander' },
        { name: 'Eldian Spy Master', power: 290, type: 'human', description: 'Intelligence network head' }
    ],
    epic: [
        { name: 'Attack Titan Fragment', power: 950, type: 'titan', description: 'Piece of Attack Titan power' },
        { name: 'Colossal Titan Fragment', power: 1100, type: 'titan', description: 'Piece of Colossal Titan power' },
        { name: 'Armored Titan Fragment', power: 1050, type: 'titan', description: 'Piece of Armored Titan power' },
        { name: 'Female Titan Fragment', power: 900, type: 'titan', description: 'Piece of Female Titan power' },
        { name: 'Beast Titan Fragment', power: 1000, type: 'titan', description: 'Piece of Beast Titan power' },
        { name: 'Jaw Titan Fragment', power: 850, type: 'titan', description: 'Piece of Jaw Titan power' },
        { name: 'Cart Titan Fragment', power: 800, type: 'titan', description: 'Piece of Cart Titan power' },
        { name: 'Warhammer Titan Fragment', power: 1150, type: 'titan', description: 'Piece of Warhammer Titan power' },
        { name: 'Founding Titan Echo', power: 1200, type: 'titan', description: 'Echo of Founding Titan power' },
        { name: 'Titan Shifter Elite', power: 980, type: 'titan', description: 'Master of titan transformation' },
        { name: 'Warrior Candidate Alpha', power: 920, type: 'human', description: 'Top-tier Marley candidate' },
        { name: 'Nine Titans Hybrid', power: 1080, type: 'titan', description: 'Multiple titan power fusion' },
        { name: 'Paths Touched Shifter', power: 1040, type: 'titan', description: 'Paths dimension influenced' },
        { name: 'Royal Blood Shifter', power: 1120, type: 'titan', description: 'Royal bloodline titan' },
        { name: 'Coordinate Fragment', power: 1180, type: 'titan', description: 'Piece of coordinate power' },
        { name: 'Marley Supreme Commander', power: 880, type: 'human', description: 'Highest military authority' },
        { name: 'Ackerman Clan Leader', power: 1100, type: 'human', description: 'Head of Ackerman family' },
        { name: 'Royal Family Guardian', power: 950, type: 'human', description: 'Ultimate royal protector' },
        { name: 'Yeagerist Supreme', power: 920, type: 'human', description: 'Faction supreme leader' },
        { name: 'Eldian Resistance Chief', power: 890, type: 'human', description: 'Underground resistance head' }
    ],
    legendary: [
        { name: 'Nine Titans Wielder', power: 2500, type: 'titan', description: 'Multiple powers' },
        { name: 'Marley\'s Finest', power: 2200, type: 'human', description: 'Nation\'s champion' },
        { name: 'Ackerman Patriarch', power: 2800, type: 'human', description: 'Clan leader' },
        { name: 'Titan War Veteran', power: 2400, type: 'titan', description: 'Ancient warrior' },
        { name: 'Founding Titan User', power: 2600, type: 'titan', description: 'Royal power' },
        { name: 'Paths Wanderer', power: 2300, type: 'human', description: 'Reality traveler' },
        { name: 'Coordinate Master', power: 2700, type: 'titan', description: 'Coordinate power master' },
        { name: 'Ymir\'s Inheritor', power: 2900, type: 'titan', description: 'Direct Ymir power' },
        { name: 'Rumbling Controller', power: 2800, type: 'titan', description: 'Wall titan commander' },
        { name: 'Paths Dimension Walker', power: 2500, type: 'human', description: 'Dimensional traveler' }
    ],
    mythic: [
        { name: 'Ymir\'s Descendant', power: 5500, type: 'titan', description: 'Original bloodline' },
        { name: 'Progenitor Fragment', power: 5200, type: 'titan', description: 'Ancient essence' },
        { name: 'Coordinate Master', power: 5400, type: 'human', description: 'Reality controller' },
        { name: 'Titan God', power: 5800, type: 'titan', description: 'Divine being' },
        { name: 'Founding Titan Prime', power: 6000, type: 'titan', description: 'Ultimate Founding power' },
        { name: 'Paths Sovereign', power: 5900, type: 'human', description: 'Paths dimension ruler' },
        { name: 'Rumbling God', power: 6100, type: 'titan', description: 'Divine rumbling power' },
        { name: 'Coordinate Deity', power: 5700, type: 'titan', description: 'Coordinate divinity' }
    ],
    divine: [
        { name: 'Ymir Fritz', power: 10500, type: 'titan', description: 'First titan' },
        { name: 'Paths Ruler', power: 9800, type: 'human', description: 'Dimension master' },
        { name: 'Founding God', power: 11200, type: 'titan', description: 'Ultimate creator' },
        { name: 'Divine Coordinate', power: 12000, type: 'titan', description: 'Divine coordinate power' },
        { name: 'Titan Creator', power: 11800, type: 'titan', description: 'Creator of titans' },
        { name: 'Reality Sovereign', power: 10900, type: 'human', description: 'Reality controller' }
    ],
    cosmic: [
        { name: 'Universal Titan', power: 22000, type: 'titan', description: 'Cosmic entity' },
        { name: 'Reality Shaper', power: 20000, type: 'human', description: 'Universe bender' },
        { name: 'Cosmic Founder', power: 24000, type: 'titan', description: 'Cosmic Founding power' },
        { name: 'Dimensional Sovereign', power: 23000, type: 'human', description: 'Dimensional ruler' }
    ],
    transcendent: [
        { name: 'Omnipotent Founder', power: 42000, type: 'titan', description: 'Beyond reality' },
        { name: 'Dimensional Lord', power: 45000, type: 'human', description: 'Reality controller' },
        { name: 'Transcendent Entity', power: 48000, type: 'titan', description: 'Beyond existence' }
    ],
    omnipotent: [
        { name: 'Absolute Being', power: 85000, type: 'titan', description: 'Perfect existence' },
        { name: 'Supreme Entity', power: 90000, type: 'human', description: 'Ultimate power' },
        { name: 'Omnipotent God', power: 95000, type: 'titan', description: 'True omnipotence' }
    ],
    absolute: [
        { name: 'Creator\'s Avatar', power: 750000, type: 'titan', description: 'Divine manifestation' },
        { name: 'Primordial God', power: 850000, type: 'human', description: 'Source of all' },
        { name: 'The Absolute', power: 1000000, type: 'titan', description: 'Ultimate existence' }
    ]
};

const enemyDescriptions = {
    titan: 'Giant humanoid creature',
    human: 'Skilled fighter',
    shifter: 'Human-titan hybrid',
    enhanced: 'Artificially boosted',
    divine: 'Godlike entity'
};

module.exports = {
    enemyTypes,
    enemyDescriptions
};