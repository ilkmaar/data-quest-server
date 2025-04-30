const itemGivingResolvers = {
  Query: {
    // Pragmatic: Creature gift preferences
    // creatureGiftPreferences: async (_, { creatureId, limit }, { prisma }) => {
    //   const preferences = await prisma.giving_actions.groupBy({
    //     by: ["item_id"],
    //     where: { creature_id: creatureId },
    //     _avg: {
    //       giving_action_health_effect: true,
    //       giving_action_mood_effect: true,
    //       giving_action_social_effect: true,
    //     },
    //     orderBy: {
    //       _avg: {
    //         giving_action_health_effect: "desc",
    //         giving_action_mood_effect: "desc",
    //         giving_action_social_effect: "desc",
    //       },
    //     },
    //     take: limit,
    //   });
    //   return Promise.all(
    //     preferences.map(async (pref) => {
    //       const item = await prisma.items.findUnique({
    //         where: { item_id: pref.item_id },
    //         include: { item_types: true },
    //       });
    //       return {
    //         itemId: pref.item_id,
    //         itemName: item.item_types.item_type_name,
    //         averageHealthEffect: pref._avg.giving_action_health_effect,
    //         averageMoodEffect: pref._avg.giving_action_mood_effect,
    //         averageSocialEffect: pref._avg.giving_action_social_effect,
    //       };
    //     }),
    //   );
    // },
    // // Insightful: Best items for each stat
    // bestItemsForStats: async (_, { worldId, limit }, { prisma }) => {
    //   const statTypes = ["health", "mood", "social"];
    //   const results = {};
    //   for (const stat of statTypes) {
    //     const bestItems = await prisma.giving_actions.groupBy({
    //       by: ["item_id"],
    //       where: { world_id: worldId },
    //       _avg: { [`giving_action_${stat}_effect`]: true },
    //       orderBy: { [`_avg_giving_action_${stat}_effect`]: "desc" },
    //       take: limit,
    //     });
    //     results[stat] = await Promise.all(
    //       bestItems.map(async (item) => {
    //         const itemDetails = await prisma.items.findUnique({
    //           where: { item_id: item.item_id },
    //           include: { item_types: true },
    //         });
    //         return {
    //           itemId: item.item_id,
    //           itemName: itemDetails.item_types.item_type_name,
    //           averageEffect: item[`_avg_giving_action_${stat}_effect`],
    //         };
    //       }),
    //     );
    //   }
    //   return results;
    // },
    // // Insightful: Item preference trends by creature type
    // itemPreferenceTrends: async (_, { worldId }, { prisma }) => {
    //   const givingActions = await prisma.giving_actions.findMany({
    //     where: { world_id: worldId },
    //     include: {
    //       items: { include: { item_types: true } },
    //       creatures: { include: { creature_types: true } },
    //     },
    //   });
    //   const trends = givingActions.reduce((acc, action) => {
    //     const key = `${action.creatures.creature_types.creature_type_id}_${action.items.item_types.item_type_id}`;
    //     if (!acc[key]) {
    //       acc[key] = {
    //         creatureType: action.creatures.creature_types.creature_type_name,
    //         itemType: action.items.item_types.item_type_name,
    //         totalGiven: 0,
    //         averageEffect: 0,
    //       };
    //     }
    //     acc[key].totalGiven++;
    //     acc[key].averageEffect +=
    //       (action.giving_action_health_effect +
    //         action.giving_action_mood_effect +
    //         action.giving_action_social_effect) /
    //       3;
    //     return acc;
    //   }, {});
    //   return Object.values(trends).map((trend) => ({
    //     ...trend,
    //     averageEffect: trend.averageEffect / trend.totalGiven,
    //   }));
    // },
  },
};

export default itemGivingResolvers;
