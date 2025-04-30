// Example Resolver Implementations
// Note: Requires Prisma client instance named "prisma" in context
import { ensureAuthenticated, handleErrors } from "./utils.js";

const calculateAverageHappiness = (actions) => {
  if (actions.length === 0) return 0;
  const totalHappiness = actions.reduce(
    (sum, action) => sum + action.giving_action_mood_effect,
    0,
  );
  return totalHappiness / actions.length;
};

const calculateBestQuality = (actions) => {
  if (actions.length === 0) return 0;
  return Math.max(...actions.map((action) => action.items.item_quality));
};

const calculateCompletion = (matrix) => {
  const total = matrix.reduce(
    (sum, row) =>
      sum + row.categories ? row.categories.length : row.varieties.length,
    0,
  );
  const completed = matrix.reduce(
    (sum, row) =>
      sum +
      (row.categories || row.varieties).filter((item) => item.given).length,
    0,
  );
  return completed / total;
};

const itemGivingProgressionResolvers = {
  Query: {
    factionFoodCategoryGrid: async (_, { playerId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        // Fetch factions
        const factions = await prisma.factions.findMany({});
        // Fetch categories that are considered "food" (adjust this condition as needed)
        const foodCategories = await prisma.item_categories.findMany({
          where: {
            item_category_name: { contains: "food", mode: "insensitive" },
          },
        });

        const data = await prisma.$queryRaw`
          SELECT f.faction_name, c.item_category_name, COUNT(*) AS count
          FROM giving_actions ga
          JOIN creatures cr ON cr.creature_id = ga.creature_id
          JOIN factions f ON f.faction_id = cr.faction_id
          JOIN items i ON i.item_id = ga.item_id
          JOIN item_types it ON it.item_type_id = i.item_type_id
          JOIN item_categories c ON c.item_category_id = it.item_category_id
          WHERE ga.player_id = ${playerId}
            AND c.item_category_name ILIKE '%food%'
          GROUP BY f.faction_name, c.item_category_name
        `;

        // Initialize a result object
        const result = {};

        // Initialize all counts to 0
        for (const faction of factions) {
          result[faction.faction_name] = {};
          for (const category of foodCategories) {
            result[faction.faction_name][category.item_category_name] = 0;
          }
        }

        // Fill in actual counts
        for (const row of data) {
          const factionName = row.faction_name;
          const categoryName = row.item_category_name;
          result[factionName][categoryName] = Number(row.count);
        }

        return result;
      });
    },
    factionItemCategoryProgress: async (
      _,
      { playerId },
      { prisma, userId },
    ) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const factions = await prisma.factions.findMany();
        const itemCategories = await prisma.item_categories.findMany();

        const givingActions = await prisma.giving_actions.findMany({
          where: { player_id: playerId },
          include: {
            items: {
              include: {
                item_types: {
                  include: {
                    item_categories: true,
                  },
                },
              },
            },
            creatures: {
              include: {
                factions: true,
              },
            },
          },
        });

        console.log("givingActions: ", givingActions);
        const progressMatrix = factions.map((faction) => ({
          factionId: faction.faction_id,
          factionName: faction.faction_name,
          categories: itemCategories.map((category) => ({
            categoryId: category.item_category_id,
            categoryName: category.item_category_name,
            given: givingActions.some(
              (action) =>
                action.creatures.factions?.faction_id === faction.faction_id &&
                action.items.item_types.item_categories?.item_category_id ===
                  category.item_category_id,
            ),
            totalGiven: givingActions.filter(
              (action) =>
                action.creatures.factions?.faction_id === faction.faction_id &&
                action.items.item_types.item_categories?.item_category_id ===
                  category.item_category_id,
            ).length,
          })),
        }));

        const totalCombinations = factions.length * itemCategories.length;
        const completedCombinations = progressMatrix.reduce(
          (sum, faction) =>
            sum + faction.categories.filter((cat) => cat.given).length,
          0,
        );

        return {
          progressMatrix,
          completion: completedCombinations / totalCombinations,
        };
      });
    },

    // Creature Type by Item Category Matrix
    creatureTypeItemCategoryProgress: async (
      _,
      { playerId },
      { prisma, userId },
    ) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const creatureTypes = await prisma.creature_types.findMany();
        const itemCategories = await prisma.item_categories.findMany();

        const givingActions = await prisma.giving_actions.findMany({
          where: { player_id: playerId },
          include: {
            items: {
              include: {
                item_types: {
                  include: {
                    item_categories: true,
                  },
                },
              },
            },
            creatures: {
              include: {
                creature_types: true,
              },
            },
          },
        });

        const progressMatrix = creatureTypes.map((creatureType) => ({
          creatureTypeId: creatureType.creature_type_id,
          creatureTypeName: creatureType.creature_type_name,
          categories: itemCategories.map((category) => ({
            categoryId: category.item_category_id,
            categoryName: category.item_category_name,
            given: givingActions.some(
              (action) =>
                action.creatures.creature_types?.creature_type_id ===
                  creatureType.creature_type_id &&
                action.items.item_types.item_categories?.item_category_id ===
                  category.item_category_id,
            ),
            totalGiven: givingActions.filter(
              (action) =>
                action.creatures.creature_types?.creature_type_id ===
                  creatureType.creature_type_id &&
                action.items.item_types.item_categories?.item_category_id ===
                  category.item_category_id,
            ).length,
            averageHappiness: calculateAverageHappiness(
              givingActions.filter(
                (action) =>
                  action.creatures.creature_types?.creature_type_id ===
                    creatureType.creature_type_id &&
                  action.items.item_types.item_categories?.item_category_id ===
                    category.item_category_id,
              ),
            ),
          })),
        }));

        return {
          progressMatrix,
          completion: calculateCompletion(progressMatrix),
        };
      });
    },

    // Faction by Item Variety Matrix
    factionItemVarietyProgress: async (_, { playerId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const factions = await prisma.factions.findMany();
        const itemVarieties = await prisma.item_varieties.findMany();

        const givingActions = await prisma.giving_actions.findMany({
          where: { player_id: playerId },
          include: {
            items: {
              include: {
                item_types: {
                  include: {
                    item_varieties: true,
                  },
                },
              },
            },
            creatures: {
              include: {
                factions: true,
              },
            },
          },
        });

        const progressMatrix = factions.map((faction) => ({
          factionId: faction.faction_id,
          factionName: faction.faction_name,
          varieties: itemVarieties.map((variety) => ({
            varietyId: variety.item_variety_id,
            varietyName: variety.item_variety_name,
            given: givingActions.some(
              (action) =>
                action.creatures.factions?.faction_id === faction.faction_id &&
                action.items.item_types.item_varieties?.item_variety_id ===
                  variety.item_variety_id,
            ),
            totalGiven: givingActions.filter(
              (action) =>
                action.creatures.factions?.faction_id === faction.faction_id &&
                action.items.item_types.item_varieties?.item_variety_id ===
                  variety.item_variety_id,
            ).length,
            bestQualityGiven: calculateBestQuality(
              givingActions.filter(
                (action) =>
                  action.creatures.factions?.faction_id ===
                    faction.faction_id &&
                  action.items.item_types.item_varieties?.item_variety_id ===
                    variety.item_variety_id,
              ),
            ),
          })),
        }));

        return {
          progressMatrix,
          completion: calculateCompletion(progressMatrix),
        };
      });
    },

    creatureTypeItemTypeProgress: async (_, { playerId }, { prisma }) => {
      const itemTypes = await prisma.item_types.findMany();
      const creatureTypes = await prisma.creature_types.findMany();

      const givingActions = await prisma.giving_actions.findMany({
        where: { player_id: playerId },
        include: {
          items: { include: { item_types: true } },
          creatures: { include: { creature_types: true } },
        },
      });

      const completionMatrix = itemTypes.map((itemType) => ({
        itemTypeId: itemType.item_type_id,
        itemTypeName: itemType.item_type_name,
        creatureTypeStatus: creatureTypes.map((creatureType) => ({
          creatureTypeId: creatureType.creature_type_id,
          creatureTypeName: creatureType.creature_type_name,
          given: givingActions.some(
            (action) =>
              action.items.item_types.item_type_id === itemType.item_type_id &&
              action.creatures.creature_types.creature_type_id ===
                creatureType.creature_type_id,
          ),
        })),
      }));

      const totalCombinations = itemTypes.length * creatureTypes.length;
      const completedCombinations = completionMatrix.reduce(
        (sum, itemType) =>
          sum +
          itemType.creatureTypeStatus.filter((status) => status.given).length,
        0,
      );

      return {
        completionMatrix,
        overallCompletion: completedCombinations / totalCombinations,
      };
    },
  },
};

export default itemGivingProgressionResolvers;

// forage N things
// forage one of each resource type (16) Foraging COUNT BY: SWEET, FRUIT, MAGIC, MATERIAL
// forage a high quality resource of each type (16); SHOW: best quality of each type (sort by quality)

// meet N creatures

// craft one of each potion
// craft one of each gift
// craft one of each food
// craft one of each crystal

// serve X things in the Diner
// give a Cupake to each Faction type
// give a Cupake to each Faction type
// Goal-suggesting: Item giving completion status

// treat N creatures
