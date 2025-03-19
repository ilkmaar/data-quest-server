import { mergeResolvers } from "@graphql-tools/merge";

import adminResolvers from "./adminResolvers.js";
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

const resolvers = mergeResolvers([
  adminResolvers,
  callsToActionResolvers,
  creatureStatsResolvers,
  currentStateResolvers,
  gameGoalResolvers,
  gameStateResolvers,
  guildLeaderboardResolvers,
  foragingProgressionResolvers,
  itemGivingResolvers,
  itemGivingProgressionResolvers,
  playerRecordsResolvers,
  playerAnalyticsResolvers,
  potionsClinicResolvers,
  userResolvers,
]);

export default resolvers;
