import { ensureAuthenticated, handleErrors } from "./utils.js";

// Known constants
const REQUIRED_CATEGORIES = [1, 2, 3, 4];
const REQUIRED_VARIETIES = [1, 2, 3, 4];
const REQUIRED_ISLANDS = [1, 2, 3, 4];
const REQUIRED_RESOURCE_COUNT = 16; // Total unique category-variety combos

const QUALITY_THRESHOLDS = {
  NOVICE: 50,
  INTERMEDIATE: 60,
  ADVANCED: 75,
  EXPERT: 90,
};

const PROGRESSION_LEVELS = {
  LEVEL_1: {
    id: 1,
    name: "Resource Explorer",
    description: "Forage at least one resource",
    threshold: 1,
  },
  LEVEL_2: {
    id: 2,
    name: "Category Collector",
    description: "Forage all categories (bug, plant, mushroom, rock)",
    threshold: REQUIRED_CATEGORIES.length,
  },
  LEVEL_3: {
    id: 3,
    name: "Variety Seeker",
    description: "Forage all varieties (magic, fruit, sweet, material)",
    threshold: REQUIRED_VARIETIES.length,
  },
  LEVEL_4: {
    id: 4,
    name: "Island Traveler",
    description: "Forage at least one resource from each island",
    threshold: REQUIRED_ISLANDS.length,
  },
  LEVEL_5: {
    id: 5,
    name: "Quality Apprentice",
    description: `Forage any resource ≥${QUALITY_THRESHOLDS.NOVICE} quality`,
    threshold: QUALITY_THRESHOLDS.NOVICE,
  },
  LEVEL_6: {
    id: 6,
    name: "Island Master",
    description: "For each island, forage all 4 categories",
    threshold: 4,
  },
  LEVEL_7: {
    id: 7,
    name: "Quality Seeker",
    description: `In each category, forage at least one resource ≥${QUALITY_THRESHOLDS.INTERMEDIATE} quality`,
    threshold: QUALITY_THRESHOLDS.INTERMEDIATE,
  },
  LEVEL_8: {
    id: 8,
    name: "Resource Master",
    description: `Forage all ${REQUIRED_RESOURCE_COUNT} unique category-variety combinations`,
    threshold: REQUIRED_RESOURCE_COUNT,
  },
  LEVEL_9: {
    id: 9,
    name: "Quality Expert",
    description: `Obtain ≥${QUALITY_THRESHOLDS.ADVANCED} quality in all 16 resource combos`,
    threshold: QUALITY_THRESHOLDS.ADVANCED,
  },
  LEVEL_10: {
    id: 10,
    name: "Foraging Legend",
    description: `Achieve ≥${QUALITY_THRESHOLDS.EXPERT} quality in all 16 resource combos`,
    threshold: QUALITY_THRESHOLDS.EXPERT,
  },
};

const foragingProgressionResolvers = {
  Query: {
    playerForagingProgression: async (_, { playerId }, { prisma, userId }) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const foragingActions = await prisma.foraging_actions.findMany({
          where: { player_id: playerId },
          include: {
            resources: {
              include: {
                resource_types: {
                  include: {
                    resource_categories: true,
                    resource_varieties: true,
                  },
                },
              },
            },
            patches: {
              include: {
                plots: {
                  include: {
                    areas: true,
                  },
                },
              },
            },
          },
        });

        const progressData = calculateProgressionData(foragingActions);
        const levels = Object.values(PROGRESSION_LEVELS).map((level) => ({
          ...level,
          completed: checkLevelCompletion(level.id, progressData),
          progress: calculateLevelProgress(level.id, progressData),
        }));

        return {
          currentLevel: levels.filter((l) => l.completed).length,
          totalLevels: levels.length,
          levels,
          details: progressData,
        };
      });
    },

    foragingLevelDetails: async (
      _,
      { playerId, levelId },
      { prisma, userId },
    ) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        const foragingActions = await prisma.foraging_actions.findMany({
          where: { player_id: playerId },
          include: {
            resources: {
              include: {
                resource_types: {
                  include: {
                    resource_categories: true,
                    resource_varieties: true,
                  },
                },
              },
            },
            patches: {
              include: {
                plots: {
                  include: {
                    areas: true,
                  },
                },
              },
            },
          },
        });

        const progressData = calculateProgressionData(foragingActions);
        const level = PROGRESSION_LEVELS[`LEVEL_${levelId}`];

        return {
          ...level,
          completed: checkLevelCompletion(levelId, progressData),
          progress: calculateLevelProgress(levelId, progressData),
          detailedProgress: getLevelDetails(levelId, progressData),
        };
      });
    },
  },
};

function calculateProgressionData(foragingActions) {
  const resourcesByCategory = new Map(); // categoryId -> Set(resourceId)
  const resourcesByVariety = new Map(); // varietyId -> Set(resourceId)
  const resourcesByIsland = new Map(); // islandId -> Set(resourceId)
  const resourceQualities = new Map(); // resourceId -> maxQuality
  const allResources = new Set();

  // Track unique category-variety combos and their best qualities
  const uniqueResourceTypes = new Set();
  const typeQualities = new Map(); // "catId-varId" -> maxQuality

  foragingActions.forEach((action) => {
    const resource = action.resources;
    const type = resource.resource_types;
    const category = type.resource_categories;
    const variety = type.resource_varieties;
    const island = action.patches.plots.areas.island_id;

    const catId = category.resource_category_id;
    const varId = variety.resource_variety_id;
    const comboKey = `${catId}-${varId}`;

    allResources.add(resource.resource_id);

    if (!resourcesByCategory.has(catId))
      resourcesByCategory.set(catId, new Set());
    resourcesByCategory.get(catId).add(resource.resource_id);

    if (!resourcesByVariety.has(varId))
      resourcesByVariety.set(varId, new Set());
    resourcesByVariety.get(varId).add(resource.resource_id);

    if (!resourcesByIsland.has(island))
      resourcesByIsland.set(island, new Set());
    resourcesByIsland.get(island).add(resource.resource_id);

    // Update resource quality
    const currentQuality = resourceQualities.get(resource.resource_id) || 0;
    resourceQualities.set(
      resource.resource_id,
      Math.max(currentQuality, resource.resource_quality),
    );

    // Track unique category-variety combo
    uniqueResourceTypes.add(comboKey);
    const currentTypeQuality = typeQualities.get(comboKey) || 0;
    typeQualities.set(
      comboKey,
      Math.max(currentTypeQuality, resource.resource_quality),
    );
  });

  return {
    resourcesByCategory,
    resourcesByVariety,
    resourcesByIsland,
    resourceQualities,
    allResources,
    uniqueResourceTypes,
    typeQualities,
  };
}

function checkAllPresent(requiredIds, map) {
  return requiredIds.every((id) => map.has(id) && map.get(id).size > 0);
}

function checkAllQuality(requiredIds, map, qualities, threshold) {
  return requiredIds.every((id) =>
    Array.from(map.get(id) || []).some(
      (resId) => qualities.get(resId) >= threshold,
    ),
  );
}

function checkLevelCompletion(levelId, progressData) {
  const level = PROGRESSION_LEVELS[`LEVEL_${levelId}`];
  const {
    resourcesByCategory,
    resourcesByVariety,
    resourcesByIsland,
    resourceQualities,
    allResources,
    uniqueResourceTypes,
    typeQualities,
  } = progressData;

  switch (levelId) {
    case 1:
      return allResources.size >= 1;
    case 2:
      return checkAllPresent(REQUIRED_CATEGORIES, resourcesByCategory);
    case 3:
      return checkAllPresent(REQUIRED_VARIETIES, resourcesByVariety);
    case 4:
      return checkAllPresent(REQUIRED_ISLANDS, resourcesByIsland);
    case 5:
      return Array.from(resourceQualities.values()).some(
        (q) => q >= level.threshold,
      );
    case 6:
      return REQUIRED_ISLANDS.every((islandId) => {
        const islandResources = resourcesByIsland.get(islandId) || new Set();
        return REQUIRED_CATEGORIES.every((catId) => {
          return Array.from(islandResources).some((resId) =>
            (resourcesByCategory.get(catId) || new Set()).has(resId),
          );
        });
      });
    case 7:
      return checkAllQuality(
        REQUIRED_CATEGORIES,
        resourcesByCategory,
        resourceQualities,
        level.threshold,
      );
    case 8:
      // Must have all 16 unique category-variety combos
      return uniqueResourceTypes.size >= level.threshold;
    case 9:
      // All 16 combos must meet quality threshold
      if (uniqueResourceTypes.size < REQUIRED_RESOURCE_COUNT) return false;
      return Array.from(uniqueResourceTypes).every(
        (key) => (typeQualities.get(key) || 0) >= level.threshold,
      );
    case 10:
      // All 16 combos must meet expert quality threshold
      if (uniqueResourceTypes.size < REQUIRED_RESOURCE_COUNT) return false;
      return Array.from(uniqueResourceTypes).every(
        (key) => (typeQualities.get(key) || 0) >= level.threshold,
      );
    default:
      return false;
  }
}

function calculateLevelProgress(levelId, progressData) {
  const level = PROGRESSION_LEVELS[`LEVEL_${levelId}`];
  const {
    resourcesByCategory,
    resourcesByVariety,
    resourcesByIsland,
    resourceQualities,
    allResources,
    uniqueResourceTypes,
    typeQualities,
  } = progressData;

  switch (levelId) {
    case 1:
      return Math.min(1, allResources.size / level.threshold);
    case 2: {
      const catCount = REQUIRED_CATEGORIES.filter(
        (c) =>
          resourcesByCategory.has(c) && resourcesByCategory.get(c).size > 0,
      ).length;
      return catCount / REQUIRED_CATEGORIES.length;
    }
    case 3: {
      const varCount = REQUIRED_VARIETIES.filter(
        (v) => resourcesByVariety.has(v) && resourcesByVariety.get(v).size > 0,
      ).length;
      return varCount / REQUIRED_VARIETIES.length;
    }
    case 4: {
      const islCount = REQUIRED_ISLANDS.filter(
        (i) => resourcesByIsland.has(i) && resourcesByIsland.get(i).size > 0,
      ).length;
      return islCount / REQUIRED_ISLANDS.length;
    }
    case 5:
      return Array.from(resourceQualities.values()).some(
        (q) => q >= level.threshold,
      )
        ? 1
        : 0;
    case 6: {
      const islandScores = REQUIRED_ISLANDS.map((islandId) => {
        const islandResources = resourcesByIsland.get(islandId) || new Set();
        const categoriesFound = REQUIRED_CATEGORIES.filter((catId) =>
          Array.from(islandResources).some((resId) =>
            (resourcesByCategory.get(catId) || new Set()).has(resId),
          ),
        ).length;
        return categoriesFound / REQUIRED_CATEGORIES.length;
      });
      return (
        islandScores.reduce((sum, v) => sum + v, 0) / REQUIRED_ISLANDS.length
      );
    }
    case 7: {
      const catQualCount = REQUIRED_CATEGORIES.filter((catId) =>
        Array.from(resourcesByCategory.get(catId) || []).some(
          (resId) => resourceQualities.get(resId) >= level.threshold,
        ),
      ).length;
      return catQualCount / REQUIRED_CATEGORIES.length;
    }
    case 8:
      return Math.min(1, uniqueResourceTypes.size / level.threshold);
    case 9:
    case 10: {
      const qualifiedCount = Array.from(uniqueResourceTypes).filter(
        (key) => (typeQualities.get(key) || 0) >= level.threshold,
      ).length;
      return Math.min(1, qualifiedCount / REQUIRED_RESOURCE_COUNT);
    }
    default:
      return 0;
  }
}

function getLevelDetails(levelId, progressData) {
  switch (levelId) {
    case 1:
      return { resourcesFound: progressData.allResources.size };
    default:
      return {};
  }
}

export default foragingProgressionResolvers;
