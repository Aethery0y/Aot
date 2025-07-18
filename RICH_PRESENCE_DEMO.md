# Rich Presence System Demo - Attack on Titan Bot

## 🚀 Overview
The Rich Presence system has been successfully implemented in your Attack on Titan Discord bot! This feature provides live status updates for users, showing their current activities and game statistics in a dedicated status channel.

## 📊 Features Implemented

### 1. **Rich Presence Manager (`utils/richPresence.js`)**
- Comprehensive presence tracking and management
- Auto-cleanup of inactive presences (5 minutes)
- Support for multiple activity types with color coding
- Real-time status updates every 30 seconds

### 2. **Status Channel System**
- Creates and manages #aot-status channel automatically
- Beautiful embeds with user avatars and activity information
- Color-coded activities (battles = red, arena = green, shopping = blue, etc.)
- Live updates showing combat power, level, equipped power, and more

### 3. **Fully Automatic System**
- No manual commands needed - works automatically for all registered users
- Rich Presence activates automatically when users perform activities
- Auto-idle status when users aren't actively using commands
- Seamless integration with all existing bot features

### 4. **Integrated Activity Tracking**
- **Battle System**: Shows when users are fighting with opponent info
- **Arena System**: Displays arena rank and competitive status
- **Store System**: Shows when users are shopping for powers
- **Evolution System**: Tracks power evolution activities
- **Idle Status**: Default status showing level and CP

## 🎮 Activity Types

| Activity | Color | Description |
|----------|-------|-------------|
| 🔴 Battling | Red | User is in combat with titans/players |
| 🟢 In Arena | Green | User is viewing/participating in arena |
| 🔵 Shopping | Blue | User is browsing the power store |
| 🟣 Evolving | Purple | User is evolving powers |
| 🟡 Idle | Yellow | Default status when not active |
| 🔷 Exploring | Cyan | User is exploring other features |

## 📋 How to Use

### For Users:
1. Register with `/register` if not already registered
2. Start using bot commands - Rich Presence activates automatically
3. Perform activities (battle, shop, arena) to see live updates
4. Check #aot-status channel for your live status
5. Rich Presence works seamlessly in the background

### For Admins:
- The bot automatically creates #aot-status channel
- All user activities are tracked and displayed
- Rich presence data is stored temporarily (auto-cleanup after 5 minutes)
- No database storage needed - all in-memory for performance

## 🔧 Technical Implementation

### Database Integration
- Uses existing user system (no new tables needed)
- Fetches user data, combat power, equipped powers dynamically
- Integrates with existing cooldown and command systems

### Performance Optimizations
- In-memory presence storage for fast access
- Auto-cleanup of inactive sessions
- Efficient database queries with existing functions
- 30-second update intervals to prevent spam

### Error Handling
- Graceful fallbacks when Rich Presence is unavailable
- Proper error logging for debugging
- Non-blocking implementation (won't break existing features)

## 🎯 Status Examples

### Battle Status:
```
🎮 In Battle
Fighting Ancient Titan
⚔️ Activity: Battling
💪 Combat Power: 15,420 CP
📊 Level: 25
🔥 Equipped Power: Titan's Wrath
    Legendary • 3,200 CP
```

### Arena Status:
```
🎮 In Arena
Rank #5
⚔️ Activity: In Arena
💪 Combat Power: 28,750 CP
📊 Level: 42
🔥 Equipped Power: Colossal Strike
    Divine • 11,500 CP
```

### Shopping Status:
```
🎮 Shopping
Browsing Power Store
⚔️ Activity: Shopping
💪 Combat Power: 8,900 CP
📊 Level: 18
💰 Coins: 45,000
```

## 🛠️ Commands Added

### New Slash Commands:
- `/richstatus` - Main Rich Presence management command
  - Subcommands: `enable`, `disable`, `view`, `set`

### Updated Commands:
- `ot battle @user` - Now sets battle presence
- `ot fight` - Now sets battle presence
- `ot store` - Now sets shopping presence
- `ot arena` - Now sets arena presence
- `/otevolve` - Now sets evolution presence

## 🔄 Auto-Updates

The system automatically updates user presence when they:
- Start a battle (PvE or PvP)
- View the arena leaderboard
- Browse the power store
- Begin power evolution
- Go idle after 5 minutes

## 🎉 Benefits

1. **Enhanced User Engagement**: Users can see what others are doing
2. **Community Building**: Encourages interaction and competition
3. **Live Activity Feed**: Real-time updates in status channel
4. **Personalization**: Users can customize their presence
5. **No Performance Impact**: Efficient implementation with minimal overhead

## 🚀 Ready to Use!

The Rich Presence system is now fully integrated and operational! Users can immediately start using `/richstatus enable` to begin showcasing their activities in the #aot-status channel.

The system enhances the overall user experience by providing transparency into what other players are doing, creating a more engaging and social gaming environment within your Discord server.