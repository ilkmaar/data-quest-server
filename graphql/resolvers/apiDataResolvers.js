/**
 * API Data Resolvers
 *
 * These resolvers fetch data from the external Ilkmaar API endpoints.
 */

import { fetchFromEndpoint, fetchAllPages } from "../../db/apiConnector.js";
import { handleErrors, ensureAuthenticated } from "./utils.js";

export const apiDataResolvers = {
  Query: {
    /**
     * Fetch player movement events from the API
     * Optionally filter by world_id and player_id
     */
    playerMoveEvents: handleErrors(
      ensureAuthenticated(async (_, { worldId, playerId, limit, offset }) => {
        const params = {};

        // Add filters if provided
        if (worldId) params.world_id = worldId;
        if (playerId) params.player_id = playerId;
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;

        // Fetch data from API
        return fetchFromEndpoint("player-move-events/", params);
      })
    ),

    /**
     * Fetch all player movement events, handling pagination automatically
     */
    allPlayerMoveEvents: handleErrors(
      ensureAuthenticated(async (_, { worldId, playerId }) => {
        const params = {};

        // Add filters if provided
        if (worldId) params.world_id = worldId;
        if (playerId) params.player_id = playerId;

        // Fetch all pages of data
        return fetchAllPages("player-move-events/", params);
      })
    ),

    /**
     * Fetch creature interactions from the API
     */
    creatureInteractions: handleErrors(
      ensureAuthenticated(async (_, { worldId, creatureId, limit, offset }) => {
        const params = {};

        if (worldId) params.world_id = worldId;
        if (creatureId) params.creature_id = creatureId;
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;

        return fetchFromEndpoint("creature-interaction-events/", params);
      })
    ),

    /**
     * Fetch foraging actions from the API
     */
    foragingActions: handleErrors(
      ensureAuthenticated(async (_, { worldId, playerId, limit, offset }) => {
        const params = {};

        if (worldId) params.world_id = worldId;
        if (playerId) params.player_id = playerId;
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;

        return fetchFromEndpoint("foraging-actions/", params);
      })
    ),

    /**
     * Fetch item giving actions from the API
     */
    givingActions: handleErrors(
      ensureAuthenticated(
        async (_, { worldId, playerId, creatureId, limit, offset }) => {
          const params = {};

          if (worldId) params.world_id = worldId;
          if (playerId) params.player_id = playerId;
          if (creatureId) params.creature_id = creatureId;
          if (limit) params.limit = limit;
          if (offset) params.offset = offset;

          return fetchFromEndpoint("giving-actions/", params);
        }
      )
    ),

    /**
     * Fetch treatment actions from the API
     */
    treatmentActions: handleErrors(
      ensureAuthenticated(
        async (_, { worldId, playerId, creatureId, limit, offset }) => {
          const params = {};

          if (worldId) params.world_id = worldId;
          if (playerId) params.player_id = playerId;
          if (creatureId) params.creature_id = creatureId;
          if (limit) params.limit = limit;
          if (offset) params.offset = offset;

          return fetchFromEndpoint("treatment-actions/", params);
        }
      )
    ),

    /**
     * Fetch data actions (database interactions) from the API
     */
    dataActions: handleErrors(
      ensureAuthenticated(
        async (_, { worldId, playerId, dataActionType, limit, offset }) => {
          const params = {};

          if (worldId) params.world_id = worldId;
          if (playerId) params.player_id = playerId;
          if (dataActionType)
            params.player_manipulate_data_type = dataActionType;
          if (limit) params.limit = limit;
          if (offset) params.offset = offset;

          return fetchFromEndpoint("player-manipulate-data-events/", params);
        }
      )
    ),

    /**
     * Generic resolver to fetch from any API endpoint
     * This allows LLMs to access any endpoint they need
     */
    apiData: handleErrors(
      ensureAuthenticated(async (_, { endpoint, params }) => {
        // For security, validate endpoint to ensure it doesn't contain path traversal attempts
        if (!/^[a-zA-Z0-9-_/]+$/.test(endpoint)) {
          throw new Error("Invalid endpoint format");
        }

        return fetchFromEndpoint(endpoint, params || {});
      })
    ),
  },
};
