import { mergeResolvers } from "@graphql-tools/merge";

import adminResolvers from "./adminResolvers.js";
import { apiDataResolvers } from "./apiDataResolvers.js";
import callsToActionResolvers from "./callsToActionResolvers.js";
import creatureStatsResolvers from "./creatureStatsResolvers.js";
import currentStateResolvers from "./currentStateResolvers.js";
import gameGoalResolvers from "./gameGoalResolvers.js";
import gameStateResolvers from "./gameStateResolvers.js";
import guildLeaderboardResolvers from "./guildLeaderboardResolvers.js";

import itemGivingResolvers from "./itemGivingResolvers.js";
import foragingProgressionResolvers from "./foragingProgressionResolvers.js";
import itemGivingProgressionResolvers from "./itemGivingProgressionResolvers.js";

import playerRecordsResolvers from "./playerRecordsResolvers.js";
import playerAnalyticsResolvers from "./playerAnalyticsResolvers.js";
import potionsClinicResolvers from "./potionsClinicResolvers.js";
import userResolvers from "./userResolvers.js";

// Import LLM resolvers
import { llmVisualizationResolvers } from "./llm/visualizationResolvers.js";

const resolvers = mergeResolvers([
  adminResolvers,
  apiDataResolvers,
  callsToActionResolvers,
  creatureStatsResolvers,
  currentStateResolvers,
  gameGoalResolvers,
  gameStateResolvers,
  guildLeaderboardResolvers,
  foragingProgressionResolvers,
  itemGivingResolvers,
  itemGivingProgressionResolvers,
  llmVisualizationResolvers,
  playerRecordsResolvers,
  playerAnalyticsResolvers,
  potionsClinicResolvers,
  userResolvers,
]);

export default resolvers;
