// Example Resolver Implementations
// Note: Requires Prisma client instance named "prisma" in context
import { ensureAuthenticated, handleErrors } from "./utils.js";

const resolvers = {
  Query: {
    currentPlayerLocations: async (_, { worldId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const data = await prisma.$queryRaw`
          SELECT DISTINCT ON (p.player_id) p.player_id, p.player_name,
                 plr.player_location_record_time,
                 a.area_x,
                 a.area_y
          FROM player_location_records plr
          JOIN players p ON p.player_id = plr.player_id
          LEFT JOIN areas a ON a.area_id = plr.area_id
          WHERE plr.world_id = ${worldId}
          ORDER BY p.player_id, plr.player_location_record_time DESC
        `;
        return data.map((row) => ({
          playerId: row.player_id,
          playerName: row.player_name,
          x: row.area_x,
          y: row.area_y,
          updatedAt: row.player_location_record_time.toISOString(),
        }));
      });
    },

    currentCreatureLocations: async (_, { worldId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const data = await prisma.$queryRaw`
          SELECT DISTINCT ON (c.creature_id) c.creature_id, f.faction_name, c.creature_name,
                 csr.creature_state_record_time,
                 a.area_x,
                 a.area_y
          FROM creature_state_records csr
          JOIN creatures c ON c.creature_id = csr.creature_id
          JOIN factions f ON f.faction_id = c.faction_id
          LEFT JOIN areas a ON a.area_id = csr.area_id
          WHERE csr.world_id = ${worldId}
          ORDER BY c.creature_id, csr.creature_state_record_time DESC
        `;
        return data.map((row) => ({
          creatureId: row.creature_id,
          creatureName: row.creature_name,
          faction: row.faction_name,
          x: row.area_x,
          y: row.area_y,
          updatedAt: row.creature_state_record_time.toISOString(),
        }));
      });
    },

    creaturesCurrentStats: async (_, { worldId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const data = await prisma.$queryRaw`
      SELECT DISTINCT ON (c.creature_id) c.creature_id, f.faction_name, creature_state_record_health, creature_state_record_mood, creature_state_record_social, creature_state_record_time, c.creature_name
      FROM creature_state_records csr
      JOIN creatures c ON c.creature_id = csr.creature_id
      JOIN factions f ON f.faction_id = c.faction_id
      WHERE csr.world_id = ${worldId}
      ORDER BY creature_id, creature_state_record_time DESC
    `;

        const averages = await prisma.$queryRaw`
      SELECT f.faction_name,
             AVG(creature_state_record_health) AS avg_health,
             AVG(creature_state_record_mood) AS avg_mood,
             AVG(creature_state_record_social) AS avg_social
      FROM creature_state_records csr
      JOIN creatures c ON c.creature_id = csr.creature_id
      JOIN factions f ON f.faction_id = c.faction_id
      WHERE csr.world_id = ${worldId}
      GROUP BY f.faction_name
    `;

        console.log(averages);

        const factions = averages.map((row) => ({
          faction_name: row.faction_name,
          avg_health: row.avg_health,
          avg_mood: row.avg_mood,
          avg_social: row.avg_social,
        }));

        const creatures = data.map((row) => ({
          creatureId: row.creature_id,
          creatureName: row.creature_name,
          faction: row.faction_name,
          health: row.creature_state_record_health,
          mood: row.creature_state_record_mood,
          social: row.creature_state_record_social,
          updatedAt: row.creature_state_record_time.toISOString(),
        }));

        return {
          creatures,
          factions,
        };
      });
    },

    plotsCurrentHealth: async (_, { worldId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        // Latest patch health per plot
        const data = await prisma.$queryRaw`
          SELECT DISTINCT ON (p.plot_id) p.plot_id,
                              phr.patch_health_record_time,
                              phr.patch_health_record_growth_level,
                              phr.patch_health_record_light_level,
                              phr.patch_health_record_shadow_level,
                              phr.patch_health_record_stability_level
          FROM patch_health_records phr
          JOIN patches pa ON pa.patch_id = phr.patch_id
          JOIN plots p ON p.plot_id = pa.plot_id
          WHERE phr.world_id = ${worldId}
          ORDER BY p.plot_id, phr.patch_health_record_time DESC
        `;
        return data.map((row) => ({
          plotId: row.plot_id,
          growthLevel: row.patch_health_record_growth_level,
          lightLevel: row.patch_health_record_light_level,
          shadowLevel: row.patch_health_record_shadow_level,
          stabilityLevel: row.patch_health_record_stability_level,
          updatedAt: row.patch_health_record_time.toISOString(),
        }));
      });
    },

    currentPlotHealthWithCoords: async (_, { worldId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const data = await prisma.$queryRaw`
          SELECT DISTINCT ON (p.plot_id) p.plot_id,
                 phr.patch_health_record_time,
                 phr.patch_health_record_growth_level,
                 phr.patch_health_record_light_level,
                 phr.patch_health_record_shadow_level,
                 phr.patch_health_record_stability_level,
                 a.area_x,
                 a.area_y
          FROM patch_health_records phr
          JOIN patches pa ON pa.patch_id = phr.patch_id
          JOIN plots p ON p.plot_id = pa.plot_id
          LEFT JOIN areas a ON a.area_id = p.area_id
          WHERE phr.world_id = ${worldId}
          ORDER BY p.plot_id, phr.patch_health_record_time DESC
        `;
        return data.map((row) => ({
          plotId: row.plot_id,
          growthLevel: row.patch_health_record_growth_level,
          lightLevel: row.patch_health_record_light_level,
          shadowLevel: row.patch_health_record_shadow_level,
          stabilityLevel: row.patch_health_record_stability_level,
          x: row.area_x,
          y: row.area_y,
          updatedAt: row.patch_health_record_time.toISOString(),
        }));
      });
    },

    // move this elsewhere
    worldDayAverages: async (_, { worldId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        // Average health/mood/social by day
        // We join creature_state_records to game_times to days
        const data = await prisma.$queryRaw`
          SELECT d.day_number,
                 AVG(csr.creature_state_record_health) AS avg_health,
                 AVG(csr.creature_state_record_mood)   AS avg_mood,
                 AVG(csr.creature_state_record_social) AS avg_social
          FROM creature_state_records csr
          JOIN game_times gt ON gt.game_time_id = csr.game_time_id
          JOIN days d ON d.day_id = gt.day_id
          WHERE csr.world_id = ${worldId}
          GROUP BY d.day_number
          ORDER BY d.day_number ASC
        `;
        return data.map((row) => ({
          dayNumber: row.day_number,
          avgHealth: parseFloat(row.avg_health),
          avgMood: parseFloat(row.avg_mood),
          avgSocial: parseFloat(row.avg_social),
        }));
      });
    },
  },
};

export default resolvers;
