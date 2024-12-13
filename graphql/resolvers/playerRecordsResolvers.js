const playerRecordsResolvers = {
  Query: {
    // Revised: Recent giving history for a player
    // playerGivingHistory: async (_, { playerId, limit }, { prisma }) => {
    //   try {
    //     const history = await prisma.giving_actions.findMany({
    //       where: { player_id: playerId },
    //       orderBy: { giving_action_time: "desc" },
    //       take: limit,
    //       include: {
    //         items: {
    //           include: {
    //             item_types: true,
    //           },
    //         },
    //         creatures: {
    //           include: {
    //             factions: true,
    //           },
    //         },
    //       },
    //     });
    //     return history.map((action) => ({
    //       givingActionId: action.giving_action_id,
    //       timestamp: action.giving_action_time.toISOString(),
    //       itemName: action.items?.item_types?.item_type_name || "Unknown Item",
    //       creatureName: action.creatures?.creature_name || "Unknown Creature",
    //       factionName:
    //         action.creatures?.factions?.faction_name || "Unknown Faction",
    //       healthEffect: action.giving_action_health_effect || 0,
    //       moodEffect: action.giving_action_mood_effect || 0,
    //       socialEffect: action.giving_action_social_effect || 0,
    //       x: action.giving_action_x || 0,
    //       y: action.giving_action_y || 0,
    //     }));
    //   } catch (error) {
    //     console.error("Error in playerGivingHistory resolver:", error);
    //     throw new Error("Failed to fetch player giving history");
    //   }
    // },
  },
};

export default playerRecordsResolvers;
