const callToActionResolvers = {
  Query: {
    creaturesNeedingHelp: async (_, { threshold, worldId }, { prisma }) => {
      const creatures = await prisma.creatures.findMany({
        where: { world_id: worldId },
        include: {
          creature_state_records: {
            orderBy: { creature_state_record_time: "desc" },
            take: 1,
          },
          factions: true,
        },
      });

      return creatures
        .filter((creature) => {
          const stats = creature.creature_state_records[0];
          return (
            stats &&
            (stats.creature_state_record_health < threshold ||
              stats.creature_state_record_mood < threshold ||
              stats.creature_state_record_social < threshold)
          );
        })
        .map((creature) => {
          const stats = creature.creature_state_records[0];
          const criticalStats = [
            { type: "HEALTH", value: stats.creature_state_record_health },
            { type: "MOOD", value: stats.creature_state_record_mood },
            { type: "SOCIAL", value: stats.creature_state_record_social },
          ];
          const mostCriticalStat = criticalStats.reduce((min, stat) =>
            stat.value < min.value ? stat : min,
          );

          return {
            creatureId: creature.creature_id,
            creatureName: creature.creature_name,
            factionName: creature.factions.faction_name,
            health: stats.creature_state_record_health,
            mood: stats.creature_state_record_mood,
            social: stats.creature_state_record_social,
            mostCriticalStat: mostCriticalStat.type,
          };
        });
    },

    factionImbalanceDetector: async (_, { worldId, threshold }, { prisma }) => {
      const factions = await prisma.factions.findMany({
        include: {
          creatures: {
            include: {
              creature_state_records: {
                orderBy: { creature_state_record_time: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      const factionStats = factions.map((faction) => {
        const totalPower = faction.creatures.reduce((sum, creature) => {
          const stats = creature.creature_state_records[0];
          return (
            sum +
            (stats
              ? (stats.creature_state_record_health +
                  stats.creature_state_record_mood +
                  stats.creature_state_record_social) /
                3
              : 0)
          );
        }, 0);
        const averagePower = totalPower / faction.creatures.length || 0;
        return {
          factionId: faction.faction_id,
          factionName: faction.faction_name,
          averagePower,
        };
      });

      const sortedFactions = factionStats.sort(
        (a, b) => b.averagePower - a.averagePower,
      );
      const powerDifference =
        sortedFactions[0].averagePower -
        sortedFactions[sortedFactions.length - 1].averagePower;
      const imbalanceDetected = powerDifference > threshold;

      return {
        imbalanceDetected,
        mostPowerfulFaction: sortedFactions[0],
        leastPowerfulFaction: sortedFactions[sortedFactions.length - 1],
        imbalanceDetails: imbalanceDetected
          ? `Power difference of ${powerDifference.toFixed(2)} exceeds threshold of ${threshold}`
          : null,
      };
    },
  },
};

export default callToActionResolvers;
