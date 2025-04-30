const gameStateResolvers = {
  Query: {
    factionStats: async (_, { worldId }, { prisma }) => {
      const factions = await prisma.factions.findMany();
      return Promise.all(
        factions.map(async (faction) => {
          const creatureCount = await prisma.creatures.count({
            where: { world_id: worldId, faction_id: faction.faction_id },
          });
          const averageStats = await prisma.creature_state_records.aggregate({
            where: {
              world_id: worldId,
              creatures: { faction_id: faction.faction_id },
            },
            _avg: {
              creature_state_record_health: true,
              creature_state_record_mood: true,
              creature_state_record_social: true,
            },
          });
          return {
            factionName: faction.faction_name,
            creatureCount,
            averageHealth: averageStats._avg.creature_state_record_health || 0,
            averageMood: averageStats._avg.creature_state_record_mood || 0,
            averageSocial: averageStats._avg.creature_state_record_social || 0,
          };
        })
      );
    },
    // islandHealth: async (_, { worldId }, { prisma }) => {
    //   const islands = await prisma.islands.findMany({
    //     where: {
    //       areas: {
    //         some: {
    //           plots: {
    //             some: {
    //               patches: {
    //                 some: {
    //                   patch_health_records: { some: { world_id: worldId } },
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //     include: {
    //       areas: {
    //         include: {
    //           plots: {
    //             include: {
    //               patches: {
    //                 include: {
    //                   patch_health_records: {
    //                     where: { world_id: worldId },
    //                     orderBy: { patch_health_record_time: "desc" },
    //                     take: 1,
    //                   },
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //   });
    //   return islands.map((island) => {
    //     let totalGrowth = 0;
    //     let totalStability = 0;
    //     let totalShadow = 0;
    //     let totalLight = 0;
    //     let patchCount = 0;
    //     island.areas.forEach((area) => {
    //       area.plots.forEach((plot) => {
    //         plot.patches.forEach((patch) => {
    //           if (patch.patch_health_records.length > 0) {
    //             const healthRecord = patch.patch_health_records[0];
    //             totalGrowth += healthRecord.patch_health_record_growth_level;
    //             totalStability +=
    //               healthRecord.patch_health_record_stability_level;
    //             totalShadow += healthRecord.patch_health_record_shadow_level;
    //             totalLight += healthRecord.patch_health_record_light_level;
    //             patchCount++;
    //           }
    //         });
    //       });
    //     });
    //     const averageHealth =
    //       patchCount > 0
    //         ? (totalGrowth + totalStability + totalShadow + totalLight) /
    //           (4 * patchCount)
    //         : 0;
    //     return {
    //       islandName: island.island_name,
    //       averageHealth,
    //       growthLevel: patchCount > 0 ? totalGrowth / patchCount : 0,
    //       stabilityLevel: patchCount > 0 ? totalStability / patchCount : 0,
    //       shadowLevel: patchCount > 0 ? totalShadow / patchCount : 0,
    //       lightLevel: patchCount > 0 ? totalLight / patchCount : 0,
    //     };
    //   });
    // },
    // creatureLocations: async (_, { worldId, limit }, { prisma }) => {
    //   const creatureLocations = await prisma.creature_activity_records.findMany(
    //     {
    //       where: { world_id: worldId },
    //       orderBy: { creature_activity_record_time: "desc" },
    //       take: limit,
    //       include: {
    //         creatures: {
    //           include: { factions: true },
    //         },
    //         areas: true,
    //       },
    //       distinct: ["creature_id"],
    //     },
    //   );
    //   return creatureLocations.map((record) => ({
    //     creatureId: record.creature_id,
    //     creatureName: record.creatures.creature_name,
    //     faction: record.creatures.factions.faction_name,
    //     lastKnownArea: record.areas.area_name,
    //     lastKnownTime: record.creature_activity_record_time,
    //   }));
    // },
    // playerLocations: async (_, { worldId, limit }, { prisma }) => {
    //   const playerLocations = await prisma.player_location_records.findMany({
    //     where: { world_id: worldId },
    //     orderBy: { player_location_record_time: "desc" },
    //     take: limit,
    //     include: {
    //       players: true,
    //       areas: true,
    //     },
    //     distinct: ["player_id"],
    //   });
    //   return playerLocations.map((record) => ({
    //     playerId: record.player_id,
    //     playerName: record.players.player_name,
    //     lastKnownArea: record.areas.area_name,
    //     lastKnownTime: record.player_location_record_time,
    //   }));
    // },
    // worldResourceInventory: async (_, { worldId }, { prisma }) => {
    //   // Get all resources in the world
    //   const resources = await prisma.resources.findMany({
    //     where: { world_id: worldId },
    //     include: {
    //       resource_types: true,
    //       foraging_actions: {
    //         select: {
    //           player_id: true,
    //           foraging_action_time: true,
    //         },
    //         orderBy: {
    //           foraging_action_time: "desc",
    //         },
    //         take: 1,
    //       },
    //       inventory_actions: {
    //         orderBy: {
    //           inventory_action_time: "desc",
    //         },
    //         take: 1,
    //       },
    //       crafting_actions_crafting_actions_ingredient1_resource_idToresources:
    //         {
    //           orderBy: {
    //             crafting_action_time: "desc",
    //           },
    //           take: 1,
    //         },
    //       crafting_actions_crafting_actions_ingredient2_resource_idToresources:
    //         {
    //           orderBy: {
    //             crafting_action_time: "desc",
    //           },
    //           take: 1,
    //         },
    //     },
    //   });
    //   return resources.map((resource) => {
    //     const forageAction = resource.foraging_actions[0];
    //     const inventoryAction = resource.inventory_actions[0];
    //     const craftingAction1 =
    //       resource
    //         .crafting_actions_crafting_actions_ingredient1_resource_idToresources[0];
    //     const craftingAction2 =
    //       resource
    //         .crafting_actions_crafting_actions_ingredient2_resource_idToresources[0];
    //     let currentLocation = null;
    //     let locationTime = null;
    //     if (forageAction) {
    //       currentLocation = { type: "player", id: forageAction.player_id };
    //       locationTime = forageAction.foraging_action_time;
    //     }
    //     if (
    //       inventoryAction &&
    //       (!locationTime ||
    //         inventoryAction.inventory_action_time > locationTime)
    //     ) {
    //       if (inventoryAction.inventory_action_type === "ADD") {
    //         currentLocation = {
    //           type: "inventory",
    //           id: inventoryAction.inventory_id,
    //         };
    //       } else if (inventoryAction.inventory_action_type === "REMOVE") {
    //         currentLocation = { type: "player", id: inventoryAction.player_id };
    //       }
    //       locationTime = inventoryAction.inventory_action_time;
    //     }
    //     if (
    //       craftingAction1 &&
    //       (!locationTime || craftingAction1.crafting_action_time > locationTime)
    //     ) {
    //       currentLocation = { type: "consumed", id: null };
    //       locationTime = craftingAction1.crafting_action_time;
    //     }
    //     if (
    //       craftingAction2 &&
    //       (!locationTime || craftingAction2.crafting_action_time > locationTime)
    //     ) {
    //       currentLocation = { type: "consumed", id: null };
    //       locationTime = craftingAction2.crafting_action_time;
    //     }
    //     return {
    //       resourceId: resource.resource_id,
    //       resourceQuality: resource.resource_quality,
    //       resourceType: resource.resource_types.resource_type_name,
    //       currentlyHeldBy: currentLocation ? currentLocation.type : "unknown",
    //       holderId: currentLocation ? currentLocation.id : null,
    //       lastActionTime: locationTime,
    //     };
    //   });
    // },
  },
};

export default gameStateResolvers;
