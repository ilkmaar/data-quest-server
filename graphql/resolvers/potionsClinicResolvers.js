const resolvers = {
  Query: {
    patientRecords: async (_, { worldId }, { prisma }) => {
      // Assume sickness can be inferred from faction_name or creature_type_name
      // For demonstration, let's just pick faction_name as sickness category
      const creatures = await prisma.creatures.findMany({
        where: { world_id: worldId },
        include: {
          factions: true,
          creature_types: true,
          colors: true,
          creature_state_records: {
            orderBy: { creature_state_record_time: "desc" },
            take: 1,
          },
        },
      });

      return creatures.map((c) => ({
        creatureId: c.creature_id,
        creatureName: c.creature_name,
        factionName: c.factions?.faction_name || null,
        creatureType: c.creature_types?.creature_type_name || null,
        color: c.colors?.color_name || null,
        sickness: c.factions?.faction_name
          ? `${c.factions?.faction_name} Flu`
          : "Unknown Flu",
        currentHealth:
          c.creature_state_records[0]?.creature_state_record_health ?? null,
        lastUpdated:
          c.creature_state_records[0]?.creature_state_record_time?.toISOString() ??
          null,
      }));
    },

    patientsCuredCount: async (_, { playerId }, { prisma }) => {
      // Count how many creatures this player has cured
      // Assume a "cure" is giving_actions with a positive health effect above some threshold
      const treatedCount = await prisma.giving_actions.count({
        where: {
          player_id: playerId,
          giving_action_health_effect: { gt: 10.0 }, // Arbitrary threshold for "cured"
        },
      });
      return treatedCount;
    },

    averageWaitTime: async (_, { playerId }, { prisma }) => {
      // For demonstration, assume "wait time" = time between creature creation and cure action
      // We'll pick all giving_actions by player, join creature creation time, and average differences.
      const cures = await prisma.giving_actions.findMany({
        where: {
          player_id: playerId,
          giving_action_health_effect: { gt: 10.0 },
        },
        include: {
          creatures: true,
        },
      });
      if (cures.length === 0) return 0.0;
      const differences = cures.map((c) => {
        const createTime = c.creatures?.creature_created_date.getTime();
        const cureTime = c.giving_action_time.getTime();
        return (cureTime - createTime) / 1000; // difference in seconds
      });
      const avg = differences.reduce((a, b) => a + b, 0) / differences.length;
      return avg;
    },

    visitorLog: async (_, { worldId }, { prisma }) => {
      // Show when players entered certain areas
      const logs = await prisma.player_location_records.findMany({
        where: { world_id: worldId },
        include: {
          players: true,
          areas: true,
        },
        orderBy: { player_location_record_time: "desc" },
        take: 50, // Limit results
      });
      return logs.map((l) => ({
        playerId: l.player_id,
        playerName: l.players.player_name,
        visitTime: l.player_location_record_time.toISOString(),
        areaName: l.areas?.area_name || "Unknown",
      }));
    },

    diseaseFrequency: async (_, { worldId }, { prisma }) => {
      // Count how many creatures currently have each "sickness"
      // Using faction_name as sickness indicator
      const creatures = await prisma.creatures.findMany({
        where: { world_id: worldId },
        include: { factions: true },
      });
      const counts = {};
      creatures.forEach((c) => {
        const sickness = c.factions?.faction_name
          ? `${c.factions.faction_name} Flu`
          : "Unknown Flu";
        counts[sickness] = (counts[sickness] || 0) + 1;
      });
      return Object.entries(counts).map(([sickness, count]) => ({
        sickness,
        count,
      }));
    },

    potionEffects: async (_, { playerId, worldId }, { prisma }) => {
      const whereClause = {};
      if (playerId !== undefined && playerId !== null) {
        whereClause.player_id = playerId;
      }
      if (worldId !== undefined && worldId !== null) {
        whereClause.world_id = worldId;
      }

      const events = await prisma.treatment_events.findMany({
        where: whereClause,
        include: {
          creatures: true,
          items: {
            include: {
              item_types: true,
            },
          },
        },
      });

      return events.map((e) => ({
        treatmentEventId: e.treatment_event_id,
        creatureId: e.creature_id,
        creatureName: e.creatures?.creature_name || "Unknown",
        potionItemId: e.item_id,
        potionItemName: e.items?.item_types?.item_type_name || "Unknown Potion",
        healthDelta: e.treatment_health_delta,
        moodDelta: e.treatment_mood_delta,
        socialDelta: e.treatment_social_delta,
        treatmentTime: e.raw_time.toISOString(),
      }));
    },

    potionCrafting: async (_, { playerId, worldId }, { prisma }) => {
      const whereClause = {};
      if (playerId !== undefined && playerId !== null) {
        whereClause.player_id = playerId;
      }
      if (worldId !== undefined && worldId !== null) {
        whereClause.world_id = worldId;
      }

      const craftActions = await prisma.crafting_actions.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              item_types: true,
            },
          },
          resources_crafting_actions_ingredient1_resource_idToresources: {
            include: {
              resource_types: true,
            },
          },
          resources_crafting_actions_ingredient2_resource_idToresources: {
            include: {
              resource_types: true,
            },
          },
        },
      });

      return craftActions.map((c) => ({
        craftingActionId: c.crafting_action_id,
        playerId: c.player_id ? parseInt(c.player_id, 10) : null,
        worldId: c.world_id || null,
        craftingTime: c.crafting_action_time.toISOString(),
        ingredient1Name:
          c.resources_crafting_actions_ingredient1_resource_idToresources
            ?.resource_types?.resource_type_name || null,
        ingredient2Name:
          c.resources_crafting_actions_ingredient2_resource_idToresources
            ?.resource_types?.resource_type_name || null,
        outputItemType: c.items?.item_types?.item_type_name || null,
        outputItemQuality: c.items?.item_quality || null,
      }));
    },
  },
};

export default resolvers;
