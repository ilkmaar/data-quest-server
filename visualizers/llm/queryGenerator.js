/**
 * Query generator for transforming natural language into GraphQL
 */

import { validateGraphQLQuery } from './schemaValidator.js';

/**
 * Default GraphQL query patterns for different visualization types
 */
const DEFAULT_QUERIES = {
  'bar chart': `query GetPlayerActivityData($worldId: String!, $startDate: String, $endDate: String) {
    playerSessionAnalytics(
      worldId: $worldId
      startDate: $startDate
      endDate: $endDate
    ) {
      activityTypeBreakdown {
        activityType
        count
        percentage
      }
      playerSessions {
        playerId
        playerName
        totalPlayTime
        totalSessions
        sessions {
          areas
          eventTypes
          duration
        }
      }
    }
  }`,
  
  'line chart': `query GetPlayerActivityOverTime($worldId: String!, $startDate: String, $endDate: String) {
    playerSessionAnalytics(
      worldId: $worldId
      startDate: $startDate
      endDate: $endDate
    ) {
      sessionsByDay {
        day
        sessionCount
        averageDuration
      }
      sessionsByHour {
        hour
        sessionCount
        averageDuration
      }
    }
  }`,
  
  'heatmap': `query GetPlayerCopresence($worldId: String!, $startDate: String, $endDate: String, $sessionIntervalMinutes: Int) {
    playerActivityTimeline(
      worldId: $worldId
      startDate: $startDate
      endDate: $endDate
      sessionIntervalMinutes: $sessionIntervalMinutes
    ) {
      playerCopresence {
        player1Id
        player1Name
        player2Id
        player2Name
        periodsTogetherCount
        copresencePercentage
      }
    }
  }`,
  
  'timeline': `query GetPlayerDetailedSessions($worldId: String!, $startDate: String, $endDate: String) {
    playerSessionAnalytics(
      worldId: $worldId
      startDate: $startDate
      endDate: $endDate
    ) {
      playerSessions {
        playerId
        playerName
        sessions {
          sessionId
          startTime
          endTime
          duration
          eventCount
          eventTypes
          areas
          events {
            event_type
            timestamp
            details
          }
        }
      }
    }
  }`
};

/**
 * Generates a GraphQL query based on visualization type and research question
 * @param {String} question - Research question
 * @param {Object} visualizationSpec - Visualization specification
 * @param {Function} llmClient - LLM client for query generation
 * @returns {Promise<String>} Generated GraphQL query
 */
export const generateQuery = async (question, visualizationSpec, llmClient) => {
  // If we have an LLM client, use it to generate a custom query
  if (llmClient) {
    try {
      const prompt = `Generate a GraphQL query to answer this research question about a game: "${question}".

The query should use one of these endpoints:
- playerSessionAnalytics(worldId, startDate, endDate)
- playerActivityTimeline(worldId, startDate, endDate, sessionIntervalMinutes)

For a ${visualizationSpec.visualizationType} visualization that needs: ${visualizationSpec.dataRequirements.join(', ')}.

Provide ONLY the GraphQL query with no explanation.`;
      
      let query = await llmClient(prompt);
      
      // Clean up the response to extract just the query
      query = extractQueryFromLLMResponse(query);
      
      // Validate the query
      const validation = validateGraphQLQuery(query);
      if (validation.valid) {
        return query;
      }
      
      console.warn('LLM generated query validation failed:', validation.errors);
    } catch (error) {
      console.error('Error generating query with LLM:', error);
    }
  }
  
  // Fallback to default query if LLM generation fails
  return getDefaultQuery(visualizationSpec.visualizationType);
};

/**
 * Gets a default query for a given visualization type
 * @param {String} visualizationType - Type of visualization
 * @returns {String} Default GraphQL query
 */
export const getDefaultQuery = (visualizationType) => {
  // Normalize the visualization type
  const normalizedType = Object.keys(DEFAULT_QUERIES).find(key => 
    visualizationType.toLowerCase().includes(key)
  );
  
  if (normalizedType) {
    return DEFAULT_QUERIES[normalizedType];
  }
  
  // Default to bar chart if no match
  return DEFAULT_QUERIES['bar chart'];
};

/**
 * Extracts a GraphQL query from an LLM response
 * @param {String} response - LLM response text
 * @returns {String} Clean GraphQL query
 */
export const extractQueryFromLLMResponse = (response) => {
  // Look for query inside code blocks, common in LLM responses
  const codeBlockMatch = response.match(/```(?:graphql)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  
  // Look for query { ... } pattern
  const queryMatch = response.match(/query\s+[\w\s]*\{[\s\S]*\}/);
  if (queryMatch) {
    return queryMatch[0].trim();
  }
  
  // Look for just a block with GraphQL-like syntax
  const graphqlMatch = response.match(/\{[\s\S]*?\}/);
  if (graphqlMatch) {
    return `query AnalyticsQuery ${graphqlMatch[0].trim()}`;
  }
  
  // If none of the above patterns match, return the raw response
  return response.trim();
};
