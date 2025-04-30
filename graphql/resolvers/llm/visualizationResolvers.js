/**
 * Visualization resolvers for LLM integration
 * 
 * These resolvers help LLMs generate visualizations based on research questions
 * about game data. They provide recommendations and context about which data sources
 * and visualization types would best answer specific questions.
 */

import { handleErrors, ensureAuthenticated } from "../utils.js";
import { fetchFromEndpoint } from "../../../db/apiConnector.js";

export const llmVisualizationResolvers = {
  Query: {
    /**
     * Suggests the best visualization type and data source for a research question
     */
    suggestVisualization: handleErrors(
      ensureAuthenticated(async (_, { question }) => {
        // Analyze the question to determine appropriate visualization type
        const visualizationType = determineVisualizationType(question);

        // Determine which data source would be best for this question
        const dataSource = determineDataSource(question, visualizationType);

        // Generate data requirements
        const dataRequirements = generateDataRequirements(
          question,
          visualizationType
        );

        return {
          question,
          visualizationType,
          dataSource,
          dataRequirements,
          suggestedTitle: generateTitle(question, visualizationType),
          suggestedDescription: question,
        };
      })
    ),

    /**
     * Get data for a visualization from the best source (API or database)
     */
    visualizationData: handleErrors(
      ensureAuthenticated(async (_, { question, visualizationType, params }, context) => {
        // Determine the best data source for this visualization
        const dataSource = determineDataSource(question, visualizationType);

        // Fetch the data from the appropriate source
        if (dataSource === "api") {
          const endpoint = mapQuestionToApiEndpoint(question, visualizationType);
          return {
            source: "api",
            endpoint,
            data: await fetchFromEndpoint(endpoint, params || {}),
          };
        } else {
          // Use database query
          const queryDetails = mapQuestionToDatabaseQuery(
            question,
            visualizationType
          );
          return {
            source: "database",
            query: queryDetails.query,
            data: await executeDbQuery(queryDetails, params || {}, context),
          };
        }
      })
    ),

    /**
     * Get a list of available data sources for visualizations
     */
    visualizationDataSources: handleErrors(
      ensureAuthenticated(async () => {
        return [
          {
            name: "api",
            endpoints: [
              {
                name: "player-move-events",
                description:
                  "Player movement data including position and area",
              },
              {
                name: "creature-interactions",
                description:
                  "Player interactions with creatures including effects",
              },
              {
                name: "foraging-actions",
                description: "Resource gathering activities",
              },
              {
                name: "giving-actions",
                description: "Item giving interactions with creatures",
              },
              {
                name: "treatment-actions",
                description: "Medical treatments performed on creatures",
              },
              {
                name: "data-actions",
                description: "Player interactions with data tables",
              },
            ],
          },
          {
            name: "database",
            tables: [
              {
                name: "player_location_records",
                description: "Historical player position data",
              },
              {
                name: "player_trade_item_events",
                description: "Item trading between players",
              },
              {
                name: "creature_interactions",
                description: "Detailed creature interaction records",
              },
              {
                name: "creature_state_records",
                description:
                  "Creature health, mood, and social states over time",
              },
              {
                name: "creature_activity_records",
                description: "Records of creatures performing activities",
              },
              {
                name: "data_actions",
                description: "Detailed data science activities by players",
              },
            ],
          },
        ];
      })
    ),
  },
};

/**
 * Helper function to determine the best visualization type for a question
 */
function determineVisualizationType(question) {
  const q = question.toLowerCase();

  // Time-based visualizations
  if (
    q.includes("over time") ||
    q.includes("trend") ||
    q.includes("history") ||
    q.includes("duration")
  ) {
    return "line chart";
  }

  // Comparisons between categories
  if (
    q.includes("compare") ||
    q.includes("difference between") ||
    q.includes("distribution") ||
    q.includes("most") ||
    q.includes("how many")
  ) {
    return "bar chart";
  }

  // Relationship between entities
  if (
    q.includes("relationship") ||
    q.includes("correlation") ||
    q.includes("between") ||
    q.includes("heatmap") ||
    q.includes("matrix")
  ) {
    return "heatmap";
  }

  // Sequences and event flows
  if (
    q.includes("sequence") ||
    q.includes("order of") ||
    q.includes("timeline") ||
    q.includes("when did")
  ) {
    return "timeline";
  }

  // Default to bar chart as it's most broadly applicable
  return "bar chart";
}

/**
 * Helper function to determine the best data source for a question and visualization type
 */
function determineDataSource(question, visualizationType) {
  const q = question.toLowerCase();

  // Questions about real-time or recent events are better from API
  if (q.includes("current") || q.includes("recent") || q.includes("latest")) {
    return "api";
  }

  // Questions needing complex joins work better with DB
  if (
    q.includes("relationship between") ||
    visualizationType === "heatmap" ||
    q.includes("across multiple")
  ) {
    return "database";
  }

  // Movement data specific questions
  if (
    q.includes("movement") ||
    q.includes("position") ||
    q.includes("location")
  ) {
    return "api";
  }

  // Data analytics questions
  if (
    q.includes("data table") ||
    q.includes("data science") ||
    q.includes("analysis")
  ) {
    return "api";
  }

  // Interactive object questions
  if (
    q.includes("creature") ||
    q.includes("giving") ||
    q.includes("treatment")
  ) {
    return "api";
  }

  // Default to API for newer data
  return "api";
}

/**
 * Generate data requirements based on question and visualization type
 */
function generateDataRequirements(question, visualizationType) {
  const q = question.toLowerCase();
  const requirements = [];

  // Time dimension
  if (visualizationType === "line chart" || visualizationType === "timeline") {
    requirements.push("timestamp");
  }

  // Entity identifiers
  if (q.includes("player")) requirements.push("player_id");
  if (q.includes("creature")) requirements.push("creature_id");
  if (q.includes("area") || q.includes("location"))
    requirements.push("area_id");

  // Activity types
  if (q.includes("activity") || q.includes("action"))
    requirements.push("activity_type");

  // Measurement values
  if (q.includes("health")) requirements.push("health_value");
  if (q.includes("mood")) requirements.push("mood_value");
  if (q.includes("social")) requirements.push("social_value");

  // Data analysis
  if (q.includes("data table") || q.includes("data science")) {
    requirements.push("data_action_type");
    requirements.push("data_table_name");
  }

  // Always include world_id as a contextual filter
  requirements.push("world_id");

  return requirements;
}

/**
 * Map a question to an API endpoint
 */
function mapQuestionToApiEndpoint(question, visualizationType) {
  const q = question.toLowerCase();

  if (
    q.includes("movement") ||
    q.includes("location") ||
    q.includes("position") ||
    q.includes("area")
  ) {
    return "player-move-events/";
  }

  if (
    q.includes("creature") &&
    (q.includes("interaction") || q.includes("talk"))
  ) {
    return "creature-interactions/";
  }

  if (
    q.includes("forag") ||
    q.includes("resource") ||
    q.includes("collect")
  ) {
    return "foraging-actions/";
  }

  if (q.includes("give") || q.includes("giving") || q.includes("gift")) {
    return "giving-actions/";
  }

  if (
    q.includes("treat") ||
    q.includes("clinic") ||
    q.includes("heal") ||
    q.includes("cure")
  ) {
    return "treatment-actions/";
  }

  if (q.includes("data") || q.includes("table") || q.includes("database")) {
    return "data-actions/";
  }

  // Default endpoint based on visualization type
  switch (visualizationType) {
    case "line chart":
    case "timeline":
      return "player-move-events/";
    case "bar chart":
      return "data-actions/";
    case "heatmap":
      return "creature-interactions/";
    default:
      return "player-move-events/";
  }
}

/**
 * Map a question to a database query
 */
function mapQuestionToDatabaseQuery(question, visualizationType) {
  const q = question.toLowerCase();

  // Default query object
  const queryDetails = {
    query: "",
    model: "",
    fields: [],
    filters: {},
  };

  if (
    q.includes("player") &&
    (q.includes("location") || q.includes("movement"))
  ) {
    queryDetails.model = "player_location_records";
    queryDetails.fields = [
      "player_id",
      "player_location_record_time",
      "player_location_record_x",
      "player_location_record_y",
      "area_id",
    ];
    queryDetails.query = "SELECT player records by location";
  } else if (
    q.includes("creature") &&
    (q.includes("state") || q.includes("health") || q.includes("mood"))
  ) {
    queryDetails.model = "creature_state_records";
    queryDetails.fields = [
      "creature_id",
      "creature_state_record_time",
      "creature_state_record_health",
      "creature_state_record_mood",
      "creature_state_record_social",
    ];
    queryDetails.query = "SELECT creature state records";
  } else if (q.includes("data") && q.includes("action")) {
    queryDetails.model = "data_actions";
    queryDetails.fields = [
      "player_id",
      "data_action_time",
      "data_action_type",
      "data_action_table_name",
    ];
    queryDetails.query = "SELECT data action records";
  } else {
    // Default to player location for most queries
    queryDetails.model = "player_location_records";
    queryDetails.fields = [
      "player_id",
      "player_location_record_time",
      "player_location_record_x",
      "player_location_record_y",
      "area_id",
    ];
    queryDetails.query = "SELECT player location records";
  }

  return queryDetails;
}

/**
 * Execute a database query
 */
async function executeDbQuery(queryDetails, params, context) {
  // Check if prisma is available in context
  if (!context || !context.prisma) {
    console.warn("Prisma client not available in context - using mock data");
    // Return mock data for development
    return [
      {
        id: "mock-id-1",
        timestamp: new Date().toISOString(),
        player_id: "player-1",
        value: Math.random() * 100
      },
      {
        id: "mock-id-2",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        player_id: "player-2",
        value: Math.random() * 100
      }
    ];
  }
  
  // Using Prisma to query the database
  try {
    const prisma = context.prisma;
    
    // Example implementation - adapt based on your model structure
    // This is a simplified version - in practice, you'd build more complex queries
    // based on the queryDetails and params
    
    if (queryDetails.model === 'player_location_records') {
      return await prisma.player_location_records.findMany({
        where: params.filters || {},
        select: queryDetails.fields.reduce((obj, field) => {
          obj[field] = true;
          return obj;
        }, {}),
        take: params.limit || 100,
        skip: params.offset || 0,
        orderBy: { player_location_record_time: 'desc' }
      });
    }
    
    if (queryDetails.model === 'creature_state_records') {
      return await prisma.creature_state_records.findMany({
        where: params.filters || {},
        select: queryDetails.fields.reduce((obj, field) => {
          obj[field] = true;
          return obj;
        }, {}),
        take: params.limit || 100,
        skip: params.offset || 0,
        orderBy: { creature_state_record_time: 'desc' }
      });
    }
    
    if (queryDetails.model === 'data_actions') {
      return await prisma.data_actions.findMany({
        where: params.filters || {},
        select: queryDetails.fields.reduce((obj, field) => {
          obj[field] = true;
          return obj;
        }, {}),
        take: params.limit || 100,
        skip: params.offset || 0,
        orderBy: { data_action_time: 'desc' }
      });
    }
    
    // Fallback return empty array if model not recognized
    return [];
  } catch (error) {
    console.error('Error executing database query:', error);
    throw new Error(`Database query error: ${error.message}`);
  }
}

/**
 * Generate a title for the visualization
 */
function generateTitle(question, visualizationType) {
  // Extract key entity
  let entity = "Data";
  if (question.toLowerCase().includes("player")) entity = "Player";
  if (question.toLowerCase().includes("creature")) entity = "Creature";
  if (question.toLowerCase().includes("area")) entity = "Area";

  // Extract key action
  let action = "Analysis";
  if (question.toLowerCase().includes("movement")) action = "Movement";
  if (question.toLowerCase().includes("interaction")) action = "Interaction";
  if (question.toLowerCase().includes("activity")) action = "Activity";

  // Format by visualization type
  switch (visualizationType) {
    case "bar chart":
      return `${entity} ${action} Distribution`;
    case "line chart":
      return `${entity} ${action} Over Time`;
    case "heatmap":
      return `${entity} ${action} Relationship Matrix`;
    case "timeline":
      return `${entity} ${action} Timeline`;
    default:
      return `${entity} ${action} Analysis`;
  }
}