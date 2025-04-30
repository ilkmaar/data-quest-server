/**
 * Main module for the visualization system
 */

import axios from "axios";

// Import template components
import { generateChartContainer } from "./templates/baseTemplate.js";
import {
  generateBarChart,
  generateGroupedBarChart,
} from "./templates/barChart.js";
import {
  generateLineChart,
  generateMultiLineChart,
} from "./templates/lineChart.js";
import { generateHeatmap } from "./templates/heatmap.js";
import { generateTimeline } from "./templates/timeline.js";

// Import utility functions
import {
  renderVisualization,
  generateDataTable,
  generateMetrics,
  generateChartId,
} from "./utils/htmlRenderer.js";

// Import LLM utilities
import { visualizationTypePrompt } from "./llm/promptTemplates.js";
import { validateVisualizationSpec } from "./llm/schemaValidator.js";
import { generateQuery } from "./llm/queryGenerator.js";

/**
 * Generate a visualization to answer a research question
 * @param {Object} options - Visualization options
 * @param {String} options.question - Research question to answer
 * @param {Object} options.graphqlClient - GraphQL client for data fetching
 * @param {Function} options.llmClient - LLM client for query generation (optional)
 * @param {Object} options.parameters - Additional parameters (worldId, startDate, endDate, etc.)
 * @param {String} options.outputPath - Path to save the visualization (optional)
 * @returns {Promise<Object>} Visualization result {html, outputPath}
 */
export async function generateVisualization({
  question,
  graphqlClient,
  llmClient,
  parameters = {},
  outputPath,
}) {
  try {
    // Step 1: Determine the best visualization type using LLM
    const visualizationType = await determineVisualizationType(
      question,
      llmClient
    );
    console.log(
      `Recommended visualization: ${visualizationType.visualizationType}`
    );

    // Step 2: Generate appropriate GraphQL query
    const graphqlQuery = await generateQuery(
      question,
      visualizationType,
      llmClient
    );
    console.log("Generated GraphQL query:", graphqlQuery);

    // Step 3: Execute the query to get data
    const queryVariables = {
      worldId: parameters.worldId || "default-world",
      startDate: parameters.startDate,
      endDate: parameters.endDate,
      sessionIntervalMinutes: parameters.sessionIntervalMinutes || 30,
    };

    const data = await executeGraphQLQuery(
      graphqlClient,
      graphqlQuery,
      queryVariables
    );
    console.log("Received data:", JSON.stringify(data).slice(0, 200) + "...");

    // Step 4: Process the data and generate the visualization
    const visualization = createVisualization(
      data,
      visualizationType,
      question
    );

    // Step a HTML report
    const title =
      visualizationType.suggestedTitle || `Visualization: ${question}`;
    const description = visualizationType.suggestedDescription || question;

    const html = renderVisualization({
      title,
      description,
      content: visualization,
      outputPath: outputPath || `./reports/visualization-${Date.now()}.html`,
    });

    return {
      html: html,
      outputPath,
    };
  } catch (error) {
    console.error("Error generating visualization:", error);
    throw error;
  }
}

/**
 * Determine the most appropriate visualization type using LLM
 * @param {String} question - Research question
 * @param {Function} llmClient - LLM client
 * @returns {Promise<Object>} Visualization specification
 */
async function determineVisualizationType(question, llmClient) {
  if (!llmClient) {
    // If no LLM client provided, make a best guess based on keywords
    return inferVisualizationType(question);
  }

  try {
    const prompt = visualizationTypePrompt(question);
    const response = await llmClient(prompt);

    // Parse JSON response from LLM
    let spec;
    try {
      // Extract JSON from response if it's wrapped in a code block
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      spec = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON:", parseError);
      return inferVisualizationType(question);
    }

    // Validate the spec
    const validation = validateVisualizationSpec(spec);
    if (!validation.valid) {
      console.warn("Invalid visualization spec from LLM:", validation.errors);
      return inferVisualizationType(question);
    }

    // Add the original question to the spec
    spec.question = question;

    return spec;
  } catch (error) {
    console.error("Error determining visualization type with LLM:", error);
    return inferVisualizationType(question);
  }
}

/**
 * Infer visualization type based on keywords in the question
 * @param {String} question - Research question
 * @returns {Object} Visualization specification
 */
function inferVisualizationType(question) {
  const q = question.toLowerCase();

  // Time-based visualizations
  if (
    q.includes("over time") ||
    q.includes("trend") ||
    q.includes("history") ||
    q.includes("duration")
  ) {
    return {
      visualizationType: "line chart",
      justification: "The question is asking about changes over time",
      dataRequirements: ["timestamp", "metric value"],
      suggestedTitle: "Temporal Analysis: " + question,
      suggestedDescription: "Trends and patterns over time",
      question,
    };
  }

  // Comparisons between categories
  if (
    q.includes("compare") ||
    q.includes("difference between") ||
    q.includes("most") ||
    q.includes("distribution")
  ) {
    return {
      visualizationType: "bar chart",
      justification:
        "The question is asking about comparisons between categories",
      dataRequirements: ["category", "value"],
      suggestedTitle: "Comparative Analysis: " + question,
      suggestedDescription: "Comparison across different categories",
      question,
    };
  }

  // Relationship between entities
  if (
    q.includes("relationship") ||
    q.includes("correlation") ||
    q.includes("between") ||
    q.includes("impact of")
  ) {
    return {
      visualizationType: "heatmap",
      justification: "The question is about relationships between variables",
      dataRequirements: ["category 1", "category 2", "value"],
      suggestedTitle: "Relationship Analysis: " + question,
      suggestedDescription: "Examining relationships between variables",
      question,
    };
  }

  // Sequences and event flows
  if (
    q.includes("sequence") ||
    q.includes("order of") ||
    q.includes("timeline") ||
    q.includes("when did")
  ) {
    return {
      visualizationType: "timeline",
      justification: "The question is about event sequences or timelines",
      dataRequirements: ["entity", "start time", "end time", "category"],
      suggestedTitle: "Sequential Analysis: " + question,
      suggestedDescription: "Temporal sequence of events",
      question,
    };
  }

  // Default to bar chart as it's most broadly applicable
  return {
    visualizationType: "bar chart",
    justification: "General comparison of values across categories",
    dataRequirements: ["category", "value"],
    suggestedTitle: "Analysis: " + question,
    suggestedDescription: "Visual analysis of the data",
    question,
  };
}

/**
 * Execute a GraphQL query using the provided client
 * @param {Object} graphqlClient - GraphQL client
 * @param {String} query - GraphQL query
 * @param {Object} variables - Query variables
 * @returns {Promise<Object>} Query result data
 */
async function executeGraphQLQuery(graphqlClient, query, variables) {
  if (!graphqlClient) {
    throw new Error("GraphQL client is required");
  }

  try {
    // If graphqlClient is a URL, use axios to execute the query
    if (typeof graphqlClient === "string") {
      const response = await axios.post(graphqlClient, {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(
          `GraphQL errors: ${JSON.stringify(response.data.errors)}`
        );
      }

      return response.data.data;
    }

    // Otherwise, assume graphqlClient is an object with an execute method
    const result = await graphqlClient.execute({
      document: query,
      variables,
    });

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  } catch (error) {
    console.error("GraphQL query execution failed:", error);
    throw new Error(`Failed to execute GraphQL query: ${error.message}`);
  }
}

/**
 * Create a visualization based on the data and type
 * @param {Object} data - Query result data
 * @param {Object} visualizationSpec - Visualization specification
 * @param {String} question - Original research question
 * @returns {String} HTML visualization content
 */
function createVisualization(data, visualizationSpec, question) {
  const type = visualizationSpec.visualizationType.toLowerCase();
  const chartId = generateChartId();
  let chartContent = "";
  let dataTableContent = "";
  let metricsContent = "";

  try {
    // Extract the relevant data from the GraphQL result
    const extractedData = extractRelevantData(data, type);

    // Generate metrics if applicable
    if (extractedData.metrics && extractedData.metrics.length > 0) {
      metricsContent = generateMetrics(extractedData.metrics);
    }

    // Generate the visualization based on type
    if (type.includes("bar chart")) {
      if (extractedData.grouped) {
        chartContent = generateGroupedBarChart({
          id: chartId,
          data: extractedData.data,
          groups: extractedData.groups,
          categories: extractedData.categories,
          xLabel: extractedData.xLabel || "Category",
          yLabel: extractedData.yLabel || "Value",
        });
      } else {
        chartContent = generateBarChart({
          id: chartId,
          data: extractedData.data,
          xKey: extractedData.xKey,
          yKey: extractedData.yKey,
          xLabel: extractedData.xLabel || "Category",
          yLabel: extractedData.yLabel || "Value",
        });
      }

      // Add data table below the chart
      if (extractedData.data && extractedData.data.length > 0) {
        const columns = [
          {
            key: extractedData.xKey,
            label: extractedData.xLabel || "Category",
          },
          { key: extractedData.yKey, label: extractedData.yLabel || "Value" },
        ];
        dataTableContent = generateDataTable(extractedData.data, columns);
      }
    } else if (type.includes("line chart")) {
      if (extractedData.multiline) {
        chartContent = generateMultiLineChart({
          id: chartId,
          data: extractedData.data,
          lines: extractedData.lines,
          xKey: extractedData.xKey,
          xLabel: extractedData.xLabel || "Time",
          yLabel: extractedData.yLabel || "Value",
        });
      } else {
        chartContent = generateLineChart({
          id: chartId,
          data: extractedData.data,
          xKey: extractedData.xKey,
          yKey: extractedData.yKey,
          xLabel: extractedData.xLabel || "Time",
          yLabel: extractedData.yLabel || "Value",
        });
      }
    } else if (type.includes("heatmap")) {
      chartContent = generateHeatmap({
        id: chartId,
        data: extractedData.data,
        xKey: extractedData.xKey,
        yKey: extractedData.yKey,
        valueKey: extractedData.valueKey,
        xLabel: extractedData.xLabel || "X Axis",
        yLabel: extractedData.yLabel || "Y Axis",
      });
    } else if (type.includes("timeline")) {
      chartContent = generateTimeline({
        id: chartId,
        data: extractedData.data,
        entityKey: extractedData.entityKey,
        startKey: extractedData.startKey,
        endKey: extractedData.endKey,
        labelKey: extractedData.labelKey,
        categoryKey: extractedData.categoryKey,
      });
    } else {
      // Fallback to a simple message if visualization type not supported
      return `<div class="info-box">Visualization type "${visualizationSpec.visualizationType}" not supported yet.</div>`;
    }

    // Combine components into a complete visualization
    return `
      ${metricsContent}
      ${generateChartContainer({
        title: visualizationSpec.suggestedTitle || question,
        description: visualizationSpec.suggestedDescription || "",
        content: chartContent,
      })}
      ${dataTableContent}
    `;
  } catch (error) {
    console.error("Error creating visualization:", error);
    return `
      <div class="warning-box">
        <p>Error creating visualization: ${error.message}</p>
        <p>Visualization type: ${visualizationSpec.visualizationType}</p>
        <pre>${JSON.stringify(data, null, 2).slice(0, 500)}...</pre>
      </div>
    `;
  }
}

/**
 * Extract relevant data from query results based on visualization type
 * @param {Object} data - Query result data
 * @param {String} visualizationType - Type of visualization
 * @returns {Object} Extracted and processed data
 */
function extractRelevantData(data, visualizationType) {
  // Bar chart data extraction
  if (visualizationType.includes("bar")) {
    if (data.playerSessionAnalytics?.activityTypeBreakdown) {
      return {
        data: data.playerSessionAnalytics.activityTypeBreakdown,
        xKey: "activityType",
        yKey: "count",
        xLabel: "Activity Type",
        yLabel: "Count",
        metrics: [
          {
            label: "Total Players",
            value: data.playerSessionAnalytics.totalPlayers,
          },
          {
            label: "Total Sessions",
            value: data.playerSessionAnalytics.totalSessions,
          },
          {
            label: "Avg. Session Length",
            value: `${Math.round(data.playerSessionAnalytics.averageSessionLength)} min`,
          },
        ],
      };
    }
    // Area time spent analysis
    if (data.playerSessionAnalytics?.playerSessions) {
      // Aggregate area time spent across all sessions
      const areaStats = {};

      data.playerSessionAnalytics.playerSessions.forEach((player) => {
        player.sessions.forEach((session) => {
          session.areas.forEach((area) => {
            if (!areaStats[area]) {
              areaStats[area] = {
                name: area,
                totalTime: 0,
                count: 0,
              };
            }
            areaStats[area].totalTime += session.duration;
            areaStats[area].count++;
          });
        });
      });

      const areaData = Object.values(areaStats).map((area) => ({
        area: area.name,
        totalMinutes: Math.round(area.totalTime),
        sessionCount: area.count,
      }));

      // Sort by time spent descending
      areaData.sort((a, b) => b.totalMinutes - a.totalMinutes);

      return {
        data: areaData,
        xKey: "area",
        yKey: "totalMinutes",
        xLabel: "Game Area",
        yLabel: "Time Spent (minutes)",
      };
    }
  }

  // Line chart data extraction
  else if (visualizationType.includes("line")) {
    if (data.playerSessionAnalytics?.sessionsByDay) {
      return {
        data: data.playerSessionAnalytics.sessionsByDay,
        xKey: "day",
        yKey: "sessionCount",
        xLabel: "Day",
        yLabel: "Number of Sessions",
      };
    }

    if (data.playerSessionAnalytics?.sessionsByHour) {
      return {
        data: data.playerSessionAnalytics.sessionsByHour,
        xKey: "hour",
        yKey: "sessionCount",
        xLabel: "Hour of Day",
        yLabel: "Number of Sessions",
      };
    }

    // Check if we can create a multi-line chart for session count vs average duration
    if (data.playerSessionAnalytics?.sessionsByDay) {
      return {
        multiline: true,
        data: data.playerSessionAnalytics.sessionsByDay,
        lines: [
          { key: "sessionCount", label: "Session Count" },
          { key: "averageDuration", label: "Avg Duration (min)" },
        ],
        xKey: "day",
        xLabel: "Day",
        yLabel: "Value",
      };
    }
  }

  // Heatmap data extraction
  else if (visualizationType.includes("heatmap")) {
    if (data.playerActivityTimeline?.playerCopresence) {
      // Format copresence data for heatmap
      const players = new Set();
      const heatmapData = [];

      data.playerActivityTimeline.playerCopresence.forEach((copresence) => {
        players.add(copresence.player1Name);
        players.add(copresence.player2Name);

        heatmapData.push({
          player1: copresence.player1Name,
          player2: copresence.player2Name,
          copresence: copresence.copresencePercentage,
        });
      });

      return {
        data: heatmapData,
        xKey: "player1",
        yKey: "player2",
        valueKey: "copresence",
        xLabel: "Player 1",
        yLabel: "Player 2",
      };
    }
  }

  // Timeline data extraction
  else if (visualizationType.includes("timeline")) {
    if (data.playerSessionAnalytics?.playerSessions) {
      const timelineData = [];

      // Extract events with timestamps
      data.playerSessionAnalytics.playerSessions.forEach((player) => {
        player.sessions.forEach((session) => {
          if (session.events && session.events.length > 0) {
            session.events.forEach((event) => {
              timelineData.push({
                player: player.playerName,
                eventType: event.event_type,
                startTime: event.timestamp,
                endTime: new Date(
                  new Date(event.timestamp).getTime() + 1000
                ).toISOString(), // Add 1 second for visibility
                details: JSON.stringify(event.details).slice(0, 100),
              });
            });
          } else {
            // If no detailed events, use the session itself
            timelineData.push({
              player: player.playerName,
              eventType: session.eventTypes[0] || "session",
              startTime: session.startTime,
              endTime: session.endTime,
              details: `Session: ${session.sessionId}`,
            });
          }
        });
      });

      return {
        data: timelineData,
        entityKey: "player",
        startKey: "startTime",
        endKey: "endTime",
        labelKey: "details",
        categoryKey: "eventType",
      };
    }
  }

  // If we couldn't extract specific data, return the raw data
  console.warn(
    "Could not extract specific data for visualization type:",
    visualizationType
  );
  console.warn("Returning raw data, client will need to process it");

  return {
    data: data,
    raw: true,
  };
}
