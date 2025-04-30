const creatureStatsResolvers = {
  Query: {
    // topCreaturesByStats: async (_, { stat, limit, worldId }, { prisma }) => {
    //   const statField = `creature_state_record_${stat.toLowerCase()}`;

    //   const creatures = await prisma.creatures.findMany({
    //     where: { world_id: worldId },
    //     include: {
    //       creature_state_records: {
    //         orderBy: { creature_state_record_time: "desc" },
    //         take: 1,
    //       },
    //       factions: true,
    //     },
    //   });

    //   const sortedCreatures = creatures
    //     .map((creature) => ({
    //       ...creature,
    //       latestStat: creature.creature_state_records[0]?.[statField] || 0,
    //     }))
    //     .sort((a, b) => b.latestStat - a.latestStat)
    //     .slice(0, limit);

    //   return sortedCreatures.map((creature, index) => ({
    //     creatureId: creature.creature_id,
    //     creatureName: creature.creature_name,
    //     factionName: creature.factions.faction_name,
    //     statValue: creature.latestStat,
    //     rank: index + 1,
    //   }));
    // },

    playerCreatureFriendshipRankings: async (
      _,
      { playerId, limit },
      { prisma },
    ) => {
      const friendships = await prisma.friendship_records.findMany({
        where: { player_id: playerId },
        orderBy: { friendship_level: "desc" },
        take: limit,
        include: {
          creatures: {
            include: { factions: true },
          },
        },
      });

      return friendships.map((friendship, index) => ({
        creatureId: friendship.creature_id,
        creatureName: friendship.creatures.creature_name,
        factionName: friendship.creatures.factions.faction_name,
        friendshipLevel: friendship.friendship_level,
        rank: index + 1,
      }));
    },

    topPlayerFriendships: async (_, { worldId, limit }, { prisma }) => {
      const friendships = await prisma.friendship_records.findMany({
        where: { world_id: worldId },
        orderBy: { friendship_level: "desc" },
        take: limit,
        include: {
          players: true,
          creatures: {
            include: { factions: true },
          },
        },
      });

      return friendships.map((friendship) => ({
        playerId: friendship.player_id,
        playerName: friendship.players.player_name,
        creatureId: friendship.creature_id,
        creatureName: friendship.creatures.creature_name,
        factionName: friendship.creatures.factions.faction_name,
        friendshipLevel: friendship.friendship_level,
      }));
    },

    creaturePopularityRankings: async (_, { worldId, limit }, { prisma }) => {
      const creatures = await prisma.creatures.findMany({
        where: { world_id: worldId },
        include: {
          friendship_records: true,
          factions: true,
        },
      });

      const popularityRankings = creatures
        .map((creature) => {
          const totalFriendship = creature.friendship_records.reduce(
            (sum, record) => sum + record.friendship_level,
            0,
          );
          const averageFriendship =
            creature.friendship_records.length > 0
              ? totalFriendship / creature.friendship_records.length
              : 0;

          return {
            creatureId: creature.creature_id,
            creatureName: creature.creature_name,
            factionName: creature.factions.faction_name,
            averageFriendshipLevel: averageFriendship,
            totalFriends: creature.friendship_records.length,
          };
        })
        .sort((a, b) => b.averageFriendshipLevel - a.averageFriendshipLevel)
        .slice(0, limit);

      return popularityRankings.map((ranking, index) => ({
        ...ranking,
        rank: index + 1,
      }));
    },

    // statTrendAnalysis: async (
    //   _,
    //   { worldId, startTime, endTime, interval },
    //   { prisma },
    // ) => {
    //   const oneMonthAgo = new Date();
    //   oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    //   // This query might be quite complex and potentially slow for large datasets
    //   // Consider using a pre-aggregated table or materialized view for better performance
    //   const records = await prisma.creature_state_records.findMany({
    //     where: {
    //       world_id: worldId,
    //       creature_state_record_time: {
    //         gte: startTime ? new Date(startTime) : oneMonthAgo,
    //         lte: endTime ? new Date(endTime) : new Date(),
    //       },
    //     },
    //     orderBy: { creature_state_record_time: "asc" },
    //   });

    //   // Group records by interval
    //   const groupedRecords = records.reduce((groups, record) => {
    //     const timeKey = getIntervalKey(
    //       record.creature_state_record_time,
    //       interval,
    //     );
    //     if (!groups[timeKey]) {
    //       groups[timeKey] = [];
    //     }
    //     groups[timeKey].push(record);
    //     return groups;
    //   }, {});

    //   // Calculate averages for each interval
    //   return Object.entries(groupedRecords).map(
    //     ([timeKey, intervalRecords]) => {
    //       const avgHealth = average(
    //         intervalRecords.map((r) => r.creature_state_record_health),
    //       );
    //       const avgMood = average(
    //         intervalRecords.map((r) => r.creature_state_record_mood),
    //       );
    //       const avgSocial = average(
    //         intervalRecords.map((r) => r.creature_state_record_social),
    //       );

    //       return {
    //         timestamp: new Date(timeKey),
    //         averageHealth: avgHealth,
    //         averageMood: avgMood,
    //         averageSocial: avgSocial,
    //         totalCreatures: intervalRecords.length,
    //       };
    //     },
    //   );
    // },
  },
};

// Helper functions
function getIntervalKey(date, interval) {
  const d = new Date(date);
  switch (interval) {
    case "HOURLY":
      return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
      ).toISOString();
    case "DAILY":
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    case "WEEKLY":
      d.setDate(d.getDate() - d.getDay());
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    default:
      throw new Error("Invalid interval");
  }
}

function average(numbers) {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

export default creatureStatsResolvers;
