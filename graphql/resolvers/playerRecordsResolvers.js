import { ensureAuthenticated, handleErrors } from "./utils.js";

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

    playerMovementEvents: async (
      _,
      { worldId, startTime, endTime, limit = 100, offset = 0 },
      { prisma, userId }
    ) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        // Build the query conditions
        const whereConditions = {
          world_id: worldId,
        };

        // Add time range conditions if provided
        if (startTime) {
          whereConditions.player_location_record_time = {
            ...(whereConditions.player_location_record_time || {}),
            gte: new Date(startTime),
          };
        }

        if (endTime) {
          whereConditions.player_location_record_time = {
            ...(whereConditions.player_location_record_time || {}),
            lte: new Date(endTime),
          };
        }

        // Get the total count for pagination
        const totalCount = await prisma.player_location_records.count({
          where: whereConditions,
        });

        // Get the movement events with player and area information
        const events = await prisma.player_location_records.findMany({
          where: whereConditions,
          include: {
            players: true,
            areas: true,
          },
          orderBy: {
            player_location_record_time: "desc",
          },
          take: limit,
          skip: offset,
        });

        // Format the response
        const formattedEvents = events.map((event) => ({
          id: event.player_location_record_id,
          playerId: event.player_id,
          playerName: event.players?.player_name || "Unknown",
          x: event.player_location_record_x,
          y: event.player_location_record_y,
          areaId: event.area_id,
          areaName: event.areas?.area_name || null,
          timestamp: event.player_location_record_time.toISOString(),
          gameTimeId: event.game_time_id,
        }));

        return {
          totalCount,
          events: formattedEvents,
        };
      });
    },
  },
};

export default playerRecordsResolvers;
