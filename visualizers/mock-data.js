/**
 * Mock data generator for visualization testing
 */

/**
 * Generate mock player session data
 * @returns {Object} Mock player session analytics data
 */
export function generateMockSessionData() {
  return {
    playerSessionAnalytics: {
      totalPlayers: 25,
      totalSessions: 150,
      averageSessionLength: 32.5,
      activityTypeBreakdown: [
        { activityType: 'movement', count: 450, percentage: 30 },
        { activityType: 'data_collection', count: 350, percentage: 23 },
        { activityType: 'foraging', count: 280, percentage: 19 },
        { activityType: 'giving', count: 220, percentage: 15 },
        { activityType: 'crafting', count: 150, percentage: 10 },
        { activityType: 'treatment', count: 50, percentage: 3 }
      ],
      playerSessions: generatePlayerSessions(25)
    }
  };
}

/**
 * Generate mock player sessions
 * @param {Number} count - Number of players to generate
 * @returns {Array} Array of player session data
 */
function generatePlayerSessions(count) {
  const players = [];
  const areas = ['Forest', 'Village', 'Mountain', 'Laboratory', 'Beach', 'Caves', 'Garden'];
  const eventTypes = ['movement', 'data_collection', 'foraging', 'giving', 'crafting', 'treatment'];
  
  for (let i = 0; i < count; i++) {
    const sessionCount = Math.floor(Math.random() * 10) + 1;
    const totalPlayTime = Math.random() * 120 + 30; // 30-150 minutes
    
    players.push({
      playerId: `player_${i}`,
      playerName: `Player${i}`,
      totalSessions: sessionCount,
      averageSessionLength: totalPlayTime / sessionCount,
      totalPlayTime: totalPlayTime,
      firstSession: '2023-03-22T10:00:00Z',
      lastSession: '2023-03-30T15:30:00Z',
      sessions: generateSessions(sessionCount, areas, eventTypes)
    });
  }
  
  return players;
}

/**
 * Generate mock sessions for a player
 * @param {Number} count - Number of sessions to generate
 * @param {Array} areas - Available areas
 * @param {Array} eventTypes - Available event types
 * @returns {Array} Array of session data
 */
function generateSessions(count, areas, eventTypes) {
  const sessions = [];
  
  for (let i = 0; i < count; i++) {
    // Random subset of areas for this session
    const sessionAreas = [...areas]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);
    
    // Random subset of event types for this session
    const sessionEventTypes = [...eventTypes]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 4) + 1);
    
    const duration = Math.random() * 30 + 5; // 5-35 minutes
    
    sessions.push({
      sessionId: `session_${i}`,
      startTime: '2023-03-22T10:00:00Z',
      endTime: '2023-03-22T10:30:00Z',
      duration: duration,
      eventCount: Math.floor(duration * 2), // ~2 events per minute
      areas: sessionAreas,
      eventTypes: sessionEventTypes
    });
  }
  
  return sessions;
}

/**
 * Mock GraphQL client that returns predefined data
 */
export const mockGraphQLClient = {
  execute: async () => {
    return {
      data: generateMockSessionData()
    };
  }
};