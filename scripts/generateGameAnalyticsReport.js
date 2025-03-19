#!/usr/bin/env node

/**
 * Game Analytics Report Generator
 *
 * This script:
 * 1. Executes GraphQL queries to fetch player activity data
 * 2. Performs data analysis on the results
 * 3. Generates a comprehensive report in HTML and JSON formats
 *
 * Usage: node generateGameAnalyticsReport.js --worldId=world-123 --startDate=2023-01-01 --endDate=2023-01-31
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import { program } from "commander";
import dotenv from "dotenv";
import { format as formatDate } from "date-fns";

// Load environment variables
dotenv.config();

// Set up command line arguments
program
  .option("--worldId <worldId>", "World ID to analyze")
  .option("--startDate <startDate>", "Start date (YYYY-MM-DD)")
  .option("--endDate <endDate>", "End date (YYYY-MM-DD)")
  .option(
    "--outputDir <outputDir>",
    "Output directory for reports",
    "./reports"
  )
  .option("--format <format>", "Output format (html, json, csv)", "html")
  .option("--sessionInterval <minutes>", "Session interval in minutes", "30")
  .option("--username <username>", "Username for authentication")
  .option("--password <password>", "Password for authentication")
  .parse(process.argv);

const options = program.opts();

// Validate required parameters
if (!options.worldId) {
  console.error("Error: worldId is required");
  process.exit(1);
}

// Set default dates if not provided
if (!options.startDate) {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  options.startDate = formatDate(lastWeek, "yyyy-MM-dd");
}

if (!options.endDate) {
  options.endDate = formatDate(new Date(), "yyyy-MM-dd");
}

// Format dates for GraphQL queries
const startDate = `${options.startDate}T00:00:00Z`;
const endDate = `${options.endDate}T23:59:59Z`;

// GraphQL API endpoint
const API_URL = process.env.GRAPHQL_API_URL || "http://localhost:4000/graphql";
const API_KEY = process.env.GRAPHQL_API_KEY;
const AUTH_URL = process.env.AUTH_URL || "http://localhost:4000/auth/login";

// GraphQL queries
const PLAYER_SESSION_ANALYTICS_QUERY = `
  query GetPlayerSessionAnalytics($worldId: String!, $startDate: String, $endDate: String) {
    playerSessionAnalytics(
      worldId: $worldId
      startDate: $startDate
      endDate: $endDate
    ) {
      totalPlayers
      totalSessions
      averageSessionLength
      sessionLengthDistribution {
        durationRange
        sessionCount
        percentage
      }
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
      sessionsByDayPerWeek {
        day
        weekStart
        sessionCount
        totalPlayTime
      }
      playerSessions {
        playerId
        playerName
        totalSessions
        averageSessionLength
        totalPlayTime
        firstSession
        lastSession
        sessions {
          sessionId
          startTime
          endTime
          duration
          eventCount
          eventTypes
          areas
          areaDetails {
            area_id
            area_name
            island_id
            island_name
          }
          events {
            event_type
            timestamp
            details
          }
        }
      }
      activityTypeBreakdown {
        activityType
        count
        percentage
      }
      playerActivityPreferences {
        playerId
        playerName
        dominantActivity
        diversityScore
        activityBreakdown {
          activityType
          count
          percentage
        }
      }
    }
  }
`;

const PLAYER_ACTIVITY_TIMELINE_QUERY = `
  query GetPlayerActivityTimeline($worldId: String!, $startDate: String, $endDate: String, $sessionIntervalMinutes: Int) {
    playerActivityTimeline(
      worldId: $worldId
      startDate: $startDate
      endDate: $endDate
      sessionIntervalMinutes: $sessionIntervalMinutes
    ) {
      totalPlayers
      totalTimePeriods
      playerSummaries {
        playerId
        playerName
        totalActivePeriods
        activePeriodsPercentage
        mostActiveTimeOfDay
        mostActiveDay
      }
      playerCopresence {
        player1Id
        player1Name
        player2Id
        player2Name
        periodsTogetherCount
        copresencePercentage
      }
    }
  }
`;

/**
 * Authenticate with the server and get a JWT token
 */
async function authenticate(username, password) {
  try {
    if (!username || !password) {
      console.log(
        "No username/password provided, attempting to use API key if available"
      );
      return null;
    }

    console.log(`Authenticating as ${username}...`);
    const response = await axios.post(AUTH_URL, {
      username,
      password,
    });

    if (response.data && response.data.token) {
      console.log("Authentication successful");
      return response.data.token;
    } else {
      console.error("Authentication failed: No token received");
      return null;
    }
  } catch (error) {
    console.error("Authentication failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    return null;
  }
}

/**
 * Execute a GraphQL query
 */
async function executeQuery(query, variables, token) {
  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Use the development bypass token if in development mode
    if (process.env.NODE_ENV === "development") {
      console.log("Using development authentication bypass");
      headers["Authorization"] = "Bearer test-user-123";
    } else if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    console.log(`Sending GraphQL request to: ${API_URL}`);
    console.log(`Variables: ${JSON.stringify(variables)}`);

    const response = await axios.post(
      API_URL,
      {
        query,
        variables,
      },
      { headers }
    );

    if (response.data.errors) {
      console.error(
        "GraphQL Errors:",
        JSON.stringify(response.data.errors, null, 2)
      );
      throw new Error("GraphQL query failed");
    }

    return response.data.data;
  } catch (error) {
    console.error("Error executing GraphQL query:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else if (error.request) {
      console.error("No response received. Request:", error.request);
    } else {
      console.error("Error details:", error);
    }
    throw error;
  }
}

/**
 * Analyze player session data
 *
 * Metrics calculated:
 * - Total players: Count of unique players with activity
 * - Total sessions: Count of all player sessions
 * - Average session length: Mean duration of all sessions in minutes
 * - Total play time: Sum of all player session durations in minutes
 * - Engagement level: Categorized as Low (<60 min), Medium (60-120 min), High (>120 min) based on total play time
 * - Most active day/hour: Day/hour with the highest number of sessions
 */
function analyzeSessionData(sessionData) {
  const analysis = {
    summary: {
      totalPlayers: sessionData.totalPlayers,
      totalSessions: sessionData.totalSessions,
      averageSessionLength:
        Math.round(sessionData.averageSessionLength * 10) / 10, // Round to 1 decimal
      totalPlayTime: 0,
      sessionTimeoutMinutes: 15, // This should match the value in playerAnalyticsResolvers.js
      movementEventMinGapSeconds: 30, // This should match the value in playerAnalyticsResolvers.js
    },
    insights: [],
    playerEngagement: [],
    activityBreakdown: sessionData.activityTypeBreakdown || [],
    playerActivityPreferences: sessionData.playerActivityPreferences || [],
  };

  // Calculate total play time across all players
  sessionData.playerSessions.forEach((player) => {
    analysis.summary.totalPlayTime += player.totalPlayTime;
  });

  // Round total play time to nearest hour
  analysis.summary.totalPlayTimeHours = Math.round(
    analysis.summary.totalPlayTime / 60
  );

  // Add play time calculation explanation to insights
  analysis.insights.push(
    `Sessions are identified when a player has continuous activity with no gaps longer than ${analysis.summary.sessionTimeoutMinutes} minutes. 
    To prevent inflation from frequent position updates, movement events are filtered to require a minimum gap of ${analysis.summary.movementEventMinGapSeconds} seconds.
    Sessions shorter than 1 minute are filtered out completely.
    Total play time is calculated as the time between the first and last event in each session.`
  );

  // Find most active day and hour
  let maxSessionsByDay = { day: "", sessionCount: 0 };
  sessionData.sessionsByDay.forEach((day) => {
    if (day.sessionCount > maxSessionsByDay.sessionCount) {
      maxSessionsByDay = day;
    }
  });

  let maxSessionsByHour = { hour: 0, sessionCount: 0 };
  sessionData.sessionsByHour.forEach((hour) => {
    if (hour.sessionCount > maxSessionsByHour.sessionCount) {
      maxSessionsByHour = hour;
    }
  });

  // Format hour for display
  const formattedHour =
    maxSessionsByHour.hour < 12
      ? `${maxSessionsByHour.hour === 0 ? 12 : maxSessionsByHour.hour}am`
      : `${maxSessionsByHour.hour === 12 ? 12 : maxSessionsByHour.hour - 12}pm`;

  // Add insights
  analysis.insights.push(
    `Most active day is ${maxSessionsByDay.day} with ${maxSessionsByDay.sessionCount} sessions`
  );
  analysis.insights.push(
    `Most active time is ${formattedHour} with ${maxSessionsByHour.sessionCount} sessions`
  );

  // Add activity type insights if present
  if (analysis.activityBreakdown && analysis.activityBreakdown.length > 0) {
    const dominantActivity = analysis.activityBreakdown[0]; // Already sorted by count
    analysis.insights.push(
      `Most common activity is "${dominantActivity.activityType}" (${Math.round(dominantActivity.percentage)}% of all activities)`
    );
  }

  // Add data action insights if present
  const dataActions = sessionData.activityTypeBreakdown
    .filter((activity) => activity.activityType.startsWith("data_"))
    .sort((a, b) => b.count - a.count);

  if (dataActions.length > 0) {
    const totalDataActions = dataActions.reduce(
      (sum, action) => sum + action.count,
      0
    );
    analysis.dataActionAnalysis = {
      totalDataActions,
      dataActionTypes: dataActions,
      playerDataActions: sessionData.playerActivityPreferences
        .filter((player) =>
          player.activityBreakdown.some((activity) =>
            activity.activityType.startsWith("data_")
          )
        )
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          dataActions: player.activityBreakdown.filter((activity) =>
            activity.activityType.startsWith("data_")
          ),
        })),
    };

    analysis.insights.push(
      `${totalDataActions} data actions recorded, with "${dataActions[0].activityType}" being the most common (${Math.round(dataActions[0].percentage)}% of data actions)`
    );
  }

  // Analyze session distribution
  const shortSessions = sessionData.sessionLengthDistribution.find(
    (d) => d.durationRange === "0-5 min"
  );
  const longSessions = sessionData.sessionLengthDistribution.find(
    (d) => d.durationRange === "1-2 hours" || d.durationRange === "2+ hours"
  );

  if (shortSessions && shortSessions.percentage > 30) {
    analysis.insights.push(
      `High percentage (${Math.round(shortSessions.percentage)}%) of very short sessions (0-5 min) may indicate usability issues or confusion`
    );
  }

  if (longSessions && longSessions.percentage > 20) {
    analysis.insights.push(
      `Good percentage (${Math.round(longSessions.percentage)}%) of long sessions (1+ hours) indicates strong engagement`
    );
  }

  // Player engagement analysis
  sessionData.playerSessions.forEach((player) => {
    // Calculate engagement level based on total play time:
    // - Low: < 60 minutes
    // - Medium: 60-120 minutes
    // - High: > 120 minutes
    let engagementLevel = "Low";
    if (player.totalPlayTime > 120) engagementLevel = "High";
    else if (player.totalPlayTime > 60) engagementLevel = "Medium";

    analysis.playerEngagement.push({
      playerId: player.playerId,
      playerName: player.playerName,
      totalSessions: player.totalSessions,
      totalPlayTimeMinutes: Math.round(player.totalPlayTime),
      averageSessionLength: Math.round(player.averageSessionLength),
      engagementLevel,
      firstSession: new Date(player.firstSession).toLocaleString(),
      lastSession: new Date(player.lastSession).toLocaleString(),
    });
  });

  // Sort players by total play time (descending)
  analysis.playerEngagement.sort(
    (a, b) => b.totalPlayTimeMinutes - a.totalPlayTimeMinutes
  );

  return analysis;
}

/**
 * Generate a visual timeline of session events
 *
 * This function:
 * 1. Processes session.events to extract chronological sequences
 * 2. Color-codes different action types (game vs data actions)
 * 3. Creates a visual timeline showing action sequences
 * 4. Includes timestamps to show timing between actions
 * 5. Groups similar consecutive actions to avoid clutter
 * 6. Adds filtering capabilities to focus on specific action types
 */
function generateSessionTimelineView(session) {
  if (!session.events || session.events.length === 0) {
    return `<div class="info-box">No detailed event data available for this session.</div>`;
  }

  // Sort events chronologically
  const sortedEvents = [...session.events].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Group consecutive similar actions to reduce clutter
  const groupedEvents = [];
  let currentGroup = {
    event_type: sortedEvents[0].event_type,
    startTime: new Date(sortedEvents[0].timestamp),
    endTime: new Date(sortedEvents[0].timestamp),
    count: 1,
    events: [sortedEvents[0]],
  };

  for (let i = 1; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventTime = new Date(event.timestamp);

    // If same type as previous and within 10 seconds, group together
    if (
      event.event_type === currentGroup.event_type &&
      eventTime - currentGroup.endTime < 10000 // 10 seconds in ms
    ) {
      currentGroup.endTime = eventTime;
      currentGroup.count++;
      currentGroup.events.push(event);
    } else {
      // Finish current group and start a new one
      groupedEvents.push(currentGroup);
      currentGroup = {
        event_type: event.event_type,
        startTime: eventTime,
        endTime: eventTime,
        count: 1,
        events: [event],
      };
    }
  }

  // Add the last group
  groupedEvents.push(currentGroup);

  // Determine event categories for color-coding
  const getEventCategory = (eventType) => {
    if (eventType.startsWith("data_")) return "data";
    if (eventType === "movement") return "movement";
    if (
      eventType.includes("craft") ||
      eventType.includes("foraging") ||
      eventType.includes("collect") ||
      eventType.includes("harvest")
    )
      return "gathering";
    return "game";
  };

  // Map categories to colors
  const categoryColors = {
    data: "#9c27b0", // purple
    movement: "#2196f3", // blue
    gathering: "#4caf50", // green
    game: "#ff9800", // orange
  };

  // Get unique event types for the filter
  const uniqueEventTypes = [...new Set(sortedEvents.map((e) => e.event_type))];

  // Calculate session duration in minutes
  const sessionStart = new Date(session.startTime);
  const sessionEnd = new Date(session.endTime);
  const sessionDurationMs = sessionEnd - sessionStart;
  const sessionDurationMin = Math.round(sessionDurationMs / 60000);

  // Build HTML for the timeline - don't include outer containers that will be provided by parent
  return `
    <div class="timeline-filters">
      <label>Filter by event type:</label>
      <select class="event-type-filter" onchange="filterTimelineEvents(this, '${session.sessionId}')">
        <option value="all">All Events</option>
        ${uniqueEventTypes.map((type) => `<option value="${type}">${type}</option>`).join("")}
      </select>
    </div>
    
    <div class="timeline-info">
      <small>Timeline shows ${sessionDurationMin} minutes with ${sortedEvents.length} events</small>
    </div>
    
    <div class="timeline-legend">
      <div class="legend-item"><span class="legend-color" style="background-color: ${categoryColors.data}"></span> Data Actions</div>
      <div class="legend-item"><span class="legend-color" style="background-color: ${categoryColors.movement}"></span> Movement</div>
      <div class="legend-item"><span class="legend-color" style="background-color: ${categoryColors.gathering}"></span> Gathering/Crafting</div>
      <div class="legend-item"><span class="legend-color" style="background-color: ${categoryColors.game}"></span> Other Game Actions</div>
    </div>
        
        <div class="timeline-events">
          ${groupedEvents
            .map((group, index) => {
              const category = getEventCategory(group.event_type);
              const color = categoryColors[category];
              const startTime = group.startTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              // Calculate the position based on time since session start
              const timeFromStart = group.startTime - sessionStart;
              const positionPercent = (timeFromStart / sessionDurationMs) * 100;

              // For tooltip content
              const eventDetails = group.events
                .map((evt) => {
                  // Format details for display
                  let detailsStr = "";
                  if (evt.details) {
                    try {
                      // If it's a string, try to parse it as JSON
                      if (typeof evt.details === "string") {
                        const details = JSON.parse(evt.details);
                        detailsStr = Object.entries(details)
                          .map(
                            ([key, value]) => `${key}: ${JSON.stringify(value)}`
                          )
                          .join(", ");
                      }
                      // If it's already an object
                      else if (typeof evt.details === "object") {
                        detailsStr = Object.entries(evt.details)
                          .map(
                            ([key, value]) => `${key}: ${JSON.stringify(value)}`
                          )
                          .join(", ");
                      }
                    } catch (e) {
                      // If parsing fails, use the original string
                      detailsStr = String(evt.details);
                    }
                  }

                  return `
                <div class="event-detail">
                  <div class="event-time">${new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                  <div class="event-type">${evt.event_type}</div>
                  ${detailsStr ? `<div class="event-props">${detailsStr}</div>` : ""}
                </div>
              `;
                })
                .join("");

              // Display single or grouped events differently
              const eventDisplay =
                group.count > 1
                  ? `${group.event_type} (${group.count})`
                  : group.event_type;

              return `
              <div 
                class="timeline-event event-type-${group.event_type}" 
                style="left: ${positionPercent}%; background-color: ${color};"
                title="${startTime}: ${eventDisplay}"
                data-toggle="tooltip"
              >
                <div class="event-tooltip">
                  <div class="event-tooltip-header">${group.event_type} (${group.count})</div>
                  <div class="event-tooltip-body">
                    ${eventDetails}
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
        
        <div class="timeline-axis">
          ${(() => {
            // Create time markers at regular intervals
            const markers = [];
            const numMarkers = 10; // Number of time markers to show

            for (let i = 0; i <= numMarkers; i++) {
              const markerTime = new Date(
                sessionStart.getTime() + sessionDurationMs * (i / numMarkers)
              );
              const markerPosition = (i / numMarkers) * 100;
              markers.push(`
                <div class="time-marker" style="left: ${markerPosition}%">
                  <div class="marker-time">${markerTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              `);
            }

            return markers.join("");
          })()}
        </div>
      </div>
    </div>
  `;
}

/**
 * Analyze player activity timeline data
 *
 * Metrics calculated:
 * - Active periods percentage: (player's active periods / total time periods) * 100
 * - Co-presence percentage: (periods two players were active together / total periods either was active) * 100
 * - Strong connections: Player pairs with > 50% co-presence
 * - Unusual activity: Players with < 10% activity across all time periods
 * - Most active time/day: Time of day/day of week with highest activity for each player
 */
function analyzeTimelineData(timelineData) {
  const analysis = {
    summary: {
      totalPlayers: timelineData.totalPlayers,
      totalTimePeriods: timelineData.totalTimePeriods,
    },
    insights: [],
    socialDynamics: [],
    playerPatterns: [],
  };

  // Analyze player co-presence
  if (timelineData.playerCopresence.length > 0) {
    // Find strongest player connections (>50% co-presence)
    // Co-presence % = (periods together / total periods either player was active) * 100
    const strongConnections = timelineData.playerCopresence
      .filter((connection) => connection.copresencePercentage > 50)
      .slice(0, 5);

    if (strongConnections.length > 0) {
      analysis.insights.push(
        `Found ${strongConnections.length} strong player connections (>50% co-presence)`
      );

      strongConnections.forEach((connection) => {
        analysis.socialDynamics.push({
          player1: connection.player1Name,
          player2: connection.player2Name,
          copresencePercentage: Math.round(connection.copresencePercentage),
          periodsTogetherCount: connection.periodsTogetherCount,
        });
      });
    } else {
      analysis.insights.push(
        "No strong player connections found, suggesting limited collaboration"
      );
    }
  }

  // Analyze player activity patterns
  timelineData.playerSummaries.forEach((player) => {
    analysis.playerPatterns.push({
      playerName: player.playerName,
      activePeriodsPercentage: Math.round(player.activePeriodsPercentage),
      mostActiveTimeOfDay: player.mostActiveTimeOfDay,
      mostActiveDay: player.mostActiveDay,
    });
  });

  // Sort players by activity percentage (descending)
  analysis.playerPatterns.sort(
    (a, b) => b.activePeriodsPercentage - a.activePeriodsPercentage
  );

  // Identify players with unusual patterns (< 10% activity)
  const lowActivityPlayers = analysis.playerPatterns
    .filter((player) => player.activePeriodsPercentage < 10)
    .map((player) => player.playerName);

  if (lowActivityPlayers.length > 0) {
    analysis.insights.push(
      `${lowActivityPlayers.length} players have very low activity (<10%): ${lowActivityPlayers.join(", ")}`
    );
  }

  return analysis;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(
  sessionAnalysis,
  timelineAnalysis,
  sessionData,
  options
) {
  const dateRange = `${options.startDate} to ${options.endDate}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Game Analytics Report - ${options.worldId}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        h1, h2, h3 {
          color: #2c3e50;
          margin: 0;
          font-weight: 500;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background-color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        }
        .report-header-left {
          flex: 1;
        }
        .report-header-right {
          text-align: right;
          color: #666;
          font-size: 0.9em;
        }
        .report-title {
          font-size: 1.5em;
          margin-bottom: 4px;
        }
        .report-subtitle {
          color: #666;
          font-size: 0.9em;
          margin-bottom: 8px;
        }
        .report-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .report-action-button {
          padding: 6px 12px;
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          color: #444;
          transition: all 0.2s;
        }
        .report-action-button:hover {
          background-color: #e9ecef;
          border-color: #ccc;
        }
        .insight-box {
          background-color: #e3f2fd;
          padding: 15px;
          border-left: 4px solid #2196f3;
          margin-bottom: 20px;
        }
        .info-box {
          background-color: #fff8e1;
          padding: 15px;
          border-left: 4px solid #ffc107;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        .stat-card {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #3498db;
        }
        .stat-label {
          font-size: 14px;
          color: #7f8c8d;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border-radius: 4px;
          overflow: hidden;
        }
        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f2f2f2;
          color: #333;
          font-weight: 600;
          position: sticky;
          top: 0;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tr:hover {
          background-color: #f5f5f5;
        }
        .session-table {
          font-size: 14px;
        }
        .session-table .time-column {
          white-space: nowrap;
          color: #444;
        }
        .session-table .session-id {
          color: #777;
          font-size: 11px;
          font-family: monospace;
        }
        .session-table .duration-column {
          font-weight: 600;
          text-align: center;
        }
        .session-table .count-column {
          text-align: center;
        }
        .session-table .event-types {
          max-width: 250px;
        }
        .tag {
          display: inline-block;
          padding: 2px 6px;
          margin: 2px;
          border-radius: 4px;
          font-size: 12px;
        }
        .event-tag {
          background-color: #f0f0f0;
          color: #444;
          border: 1px solid #ddd;
        }
        .area-tag {
          background-color: #f0f7f0;
          color: #444;
          border: 1px solid #ddd;
        }
        .data-tag {
          background-color: #f7f7f0;
          color: #444;
          border: 1px solid #ddd;
        }
        .island-header {
          font-weight: 600;
          color: #444;
          margin-top: 5px;
          margin-bottom: 3px;
        }
        .action-type {
          font-style: italic;
          color: #666;
        }
        .section {
          margin-bottom: 40px;
        }
        .metric-explanation {
          font-size: 14px;
          color: #666;
          font-style: italic;
          margin-top: 5px;
          margin-bottom: 15px;
        }
        .chart-container {
          margin-bottom: 30px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
        }
        .activity-bar {
          height: 25px;
          background-color: #3498db;
          margin-bottom: 5px;
          border-radius: 3px;
        }
        .activity-label {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }
        
        /* Session Timeline Styles */
        .session-timeline {
          margin-bottom: 30px;
          background-color: white;
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .session-timeline.collapsed .timeline-container {
          display: none;
        }
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #ddd;
        }
        .timeline-title {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .timeline-title .session-id {
          font-size: 11px;
          font-family: monospace;
          color: #777;
        }
        .timeline-filters {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .timeline-filters select {
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        .timeline-container {
          padding: 15px;
          position: relative;
        }
        .timeline-legend {
          display: flex;
          gap: 15px;
          margin-bottom: 10px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #666;
        }
        .legend-color {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 4px;
        }
        .timeline-events {
          height: 80px;
          position: relative;
          background-color: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 20px;
          border: 1px solid #ddd;
        }
        .timeline-event {
          position: absolute;
          top: 10px;
          width: 8px;
          height: 60px;
          border-radius: 4px;
          transform: translateX(-50%);
          cursor: pointer;
        }
        .timeline-event:hover {
          z-index: 10;
        }
        .timeline-event:hover .event-tooltip {
          display: block;
        }
        .event-tooltip {
          display: none;
          position: absolute;
          bottom: calc(100% + 5px);
          left: 50%;
          transform: translateX(-50%);
          background-color: white;
          min-width: 250px;
          max-width: 400px;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          z-index: 100;
          font-size: 12px;
          overflow: hidden;
        }
        .event-tooltip-header {
          background-color: #f0f0f0;
          padding: 8px 10px;
          font-weight: 600;
          color: #444;
          border-bottom: 1px solid #ddd;
        }
        .event-tooltip-body {
          padding: 10px;
          max-height: 300px;
          overflow-y: auto;
        }
        .event-detail {
          padding: 6px 0;
          border-bottom: 1px solid #eee;
        }
        .event-detail:last-child {
          border-bottom: none;
        }
        .event-time {
          font-family: monospace;
          color: #555;
          margin-bottom: 2px;
        }
        .event-type {
          font-weight: 600;
          margin-bottom: 2px;
        }
        .event-props {
          font-family: monospace;
          font-size: 10px;
          color: #666;
          word-break: break-word;
        }
        .timeline-axis {
          position: relative;
          height: 30px;
          border-top: 1px dashed #ddd;
        }
        .time-marker {
          position: absolute;
          transform: translateX(-50%);
        }
        .marker-time {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
        }
        .timeline-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          color: #3498db;
          display: flex;
          align-items: center;
          margin-left: auto;
        }
        .timeline-toggle:hover {
          text-decoration: underline;
        }
        .timeline-toggle-icon {
          margin-left: 4px;
          transition: transform 0.2s;
        }
        .collapsed .timeline-toggle-icon {
          transform: rotate(-90deg);
        }
        
        /* Tab Navigation Styles */
        .tabs {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        .tab-button {
          padding: 10px 20px;
          cursor: pointer;
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          border-bottom: none;
          border-radius: 4px 4px 0 0;
          margin-right: 5px;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .tab-button:hover {
          background-color: #e9ecef;
        }
        .tab-button.active {
          background-color: #fff;
          border-bottom: 2px solid #3498db;
          color: #3498db;
        }
        .tab-content {
          display: none;
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 4px 4px;
        }
        .tab-content.active {
          display: block;
        }
      </style>
      <script>
        // Tab switching functionality
        document.addEventListener('DOMContentLoaded', function() {
          // Function to switch tabs
          function switchTab(tabId) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
              content.classList.remove('active');
            });
            
            // Deactivate all tab buttons
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
              button.classList.remove('active');
            });
            
            // Show the selected tab content and activate button
            document.getElementById(tabId).classList.add('active');
            document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
            
            // Save active tab to localStorage
            localStorage.setItem('activeGameAnalyticsTab', tabId);
          }
          
          // Add click handlers to all tab buttons
          const tabButtons = document.querySelectorAll('.tab-button');
          tabButtons.forEach(button => {
            button.addEventListener('click', function() {
              switchTab(this.getAttribute('data-tab'));
            });
          });
          
          // Check if there's a saved tab preference
          const savedTab = localStorage.getItem('activeGameAnalyticsTab');
          if (savedTab && document.getElementById(savedTab)) {
            switchTab(savedTab);
          } else {
            // Default to first tab
            const firstTab = document.querySelector('.tab-button');
            if (firstTab) {
              switchTab(firstTab.getAttribute('data-tab'));
            }
          }
          
          // Print functionality
          const printButton = document.getElementById('print-report');
          if (printButton) {
            printButton.addEventListener('click', function() {
              window.print();
            });
          }
          
          // Initialize timeline toggle buttons
          const toggleButtons = document.querySelectorAll('.timeline-toggle');
          toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
              const timeline = this.closest('.session-timeline');
              timeline.classList.toggle('collapsed');
              
              // Update button text
              const isCollapsed = timeline.classList.contains('collapsed');
              this.innerHTML = isCollapsed 
                ? 'Expand <span class="timeline-toggle-icon">▼</span>' 
                : 'Collapse <span class="timeline-toggle-icon">▲</span>';
            });
          });
        });
        
        // Timeline event filtering
        function filterTimelineEvents(selectElement, sessionId) {
          const selectedType = selectElement.value;
          const timelineContainer = document.querySelector('.timeline-container[data-session-id="' + sessionId + '"]');
          const events = timelineContainer.querySelectorAll('.timeline-event');
          
          events.forEach(event => {
            if (selectedType === 'all' || event.classList.contains('event-type-' + selectedType)) {
              event.style.display = 'block';
            } else {
              event.style.display = 'none';
            }
          });
        }
      </script>
    </head>
    <body>
      <div class="report-header">
        <div class="report-header-left">
          <h1 class="report-title">Game Analytics Report</h1>
          <div class="report-subtitle">World ID: ${options.worldId}</div>
          <div class="report-actions">
            <button id="print-report" class="report-action-button">Print Report</button>
          </div>
        </div>
        <div class="report-header-right">
          <div>Date Range: ${dateRange}</div>
          <div>Generated: ${new Date().toLocaleString()}</div>
        </div>
      </div>
      
      <!-- Tab Navigation -->
      <div class="tabs">
        <button class="tab-button" data-tab="tab-overview">Overview</button>
        <button class="tab-button" data-tab="tab-player-engagement">Player Engagement</button>
        <button class="tab-button" data-tab="tab-activity-analysis">Activity Analysis</button>
        <button class="tab-button" data-tab="tab-data-actions">Data Actions</button>
        <button class="tab-button" data-tab="tab-social">Social Dynamics</button>
        <button class="tab-button" data-tab="tab-debug">Debug</button>
      </div>
      
      <!-- Tab 1: Overview -->
      <div id="tab-overview" class="tab-content">
        <div class="section">
          <h2>Key Metrics</h2>
          <p class="metric-explanation">These metrics are calculated from player session data over the specified time period.</p>
          <div class="info-box">
            <strong>How Play Time is Calculated:</strong> 
            <p>Sessions are identified when a player has continuous activity with no gaps longer than ${sessionAnalysis.summary.sessionTimeoutMinutes} minutes. 
            Sessions shorter than 1 minute are filtered out completely.
            Total play time is calculated as the time between the first and last event in each session.</p>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${sessionAnalysis.summary.totalPlayers}</div>
              <div class="stat-label">Active Players</div>
              <div class="metric-explanation">Count of unique players with activity</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${sessionAnalysis.summary.totalSessions}</div>
              <div class="stat-label">Total Sessions</div>
              <div class="metric-explanation">Count of all player sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${sessionAnalysis.summary.averageSessionLength} min</div>
              <div class="stat-label">Avg Session Length</div>
              <div class="metric-explanation">Mean duration of all sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${sessionAnalysis.summary.totalPlayTimeHours} hrs</div>
              <div class="stat-label">Total Play Time</div>
              <div class="metric-explanation">Sum of all player session durations</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Key Insights</h2>
          <div class="insight-box">
            <ul>
              ${sessionAnalysis.insights.map((insight) => `<li>${insight}</li>`).join("")}
              ${timelineAnalysis.insights.map((insight) => `<li>${insight}</li>`).join("")}
            </ul>
          </div>
        </div>

        <div class="section">
          <h2>Activity Breakdown</h2>
          <p class="metric-explanation">Distribution of different activity types across all players.</p>
          <div class="chart-container">
            ${sessionAnalysis.activityBreakdown
              .map(
                (activity) => `
              <div class="activity-label">
                <span>${activity.activityType}</span>
                <span>${activity.count} (${Math.round(activity.percentage)}%)</span>
              </div>
              <div class="activity-bar" style="width: ${activity.percentage}%;"></div>
            `
              )
              .join("")}
          </div>
        </div>
        
        <div class="section">
          <h2>Sessions by Day of Week</h2>
          <p class="metric-explanation">Distribution of play time across days of the week, grouped by week.</p>
          
          ${(() => {
            // Group by week for display
            const weekGroups = {};
            sessionData.sessionsByDayPerWeek.forEach((dayData) => {
              if (!weekGroups[dayData.weekStart]) {
                weekGroups[dayData.weekStart] = {
                  weekStart: dayData.weekStart,
                  days: [],
                };
              }
              weekGroups[dayData.weekStart].days.push(dayData);
            });

            // Sort weeks chronologically
            const sortedWeeks = Object.values(weekGroups).sort(
              (a, b) => new Date(a.weekStart) - new Date(b.weekStart)
            );

            // Generate HTML for each week
            return sortedWeeks
              .map((week) => {
                const formattedWeekStart = new Date(
                  week.weekStart
                ).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                // Find the maximum play time for scaling
                const maxPlayTime = Math.max(
                  ...week.days.map((d) => d.totalPlayTime)
                );

                return `
                <div class="chart-container">
                  <h3>Week of ${formattedWeekStart}</h3>
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${week.days
                      .map((day) => {
                        const barWidth =
                          maxPlayTime > 0
                            ? (day.totalPlayTime / maxPlayTime) * 100
                            : 0;
                        return `
                        <div>
                          <div class="activity-label">
                            <span>${day.day}</span>
                            <span>${Math.round(day.totalPlayTime)} min (${day.sessionCount} sessions)</span>
                          </div>
                          <div class="activity-bar" style="width: ${barWidth}%;"></div>
                        </div>
                      `;
                      })
                      .join("")}
                  </div>
                </div>
              `;
              })
              .join("");
          })()}
        </div>
      </div>
      
      <!-- Tab 2: Player Engagement -->
      <div id="tab-player-engagement" class="tab-content">
        <div class="section">
          <h2>Player Engagement</h2>
          <p class="metric-explanation">Engagement levels are categorized as: Low (&lt;60 min), Medium (60-120 min), High (&gt;120 min) based on total play time.</p>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Sessions</th>
                <th>Play Time</th>
                <th>Avg Session</th>
                <th>Engagement</th>
                <th>Dominant Activity</th>
              </tr>
            </thead>
            <tbody>
              ${sessionAnalysis.playerEngagement
                .map((player) => {
                  // Find this player's activity preferences
                  const activityPref =
                    sessionAnalysis.playerActivityPreferences.find(
                      (p) => p.playerId === player.playerId
                    );
                  const dominantActivity = activityPref
                    ? activityPref.dominantActivity
                    : "N/A";

                  return `
                  <tr>
                    <td>${player.playerName}</td>
                    <td>${player.totalSessions}</td>
                    <td>${player.totalPlayTimeMinutes} min</td>
                    <td>${player.averageSessionLength} min</td>
                    <td>${player.engagementLevel}</td>
                    <td>${dominantActivity}</td>
                  </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Session Action Sequences</h2>
          <p class="metric-explanation">Visual timeline of player actions within each session, color-coded by action type. Hover over events for details and use the filter to focus on specific action types.</p>
          
          ${(() => {
            // Find up to 10 most recent sessions with event data for displaying timelines
            let sessionsWithEvents = [];
            sessionData.playerSessions.forEach((player) => {
              if (player.sessions) {
                player.sessions.forEach((session) => {
                  if (session.events && session.events.length > 0) {
                    sessionsWithEvents.push({
                      playerName: player.playerName,
                      session: session,
                    });
                  }
                });
              }
            });

            // Sort by most recent sessions first
            sessionsWithEvents.sort(
              (a, b) =>
                new Date(b.session.startTime) - new Date(a.session.startTime)
            );

            // Limit to 10 sessions for performance reasons
            sessionsWithEvents = sessionsWithEvents.slice(0, 10);

            if (sessionsWithEvents.length === 0) {
              return `<div class="info-box">No detailed session event data available.</div>`;
            }

            return sessionsWithEvents
              .map((item) => {
                const sessionStart = new Date(item.session.startTime);
                const formattedDate = sessionStart.toLocaleDateString();
                const formattedTime = sessionStart.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const sessionId = item.session.sessionId;
                return `
                <div class="session-timeline">
                  <div class="timeline-header">
                    <div class="timeline-title">
                      <span>${item.playerName} - ${formattedDate} ${formattedTime}</span>
                      <span class="session-id">ID: ${sessionId}</span>
                    </div>
                    <button class="timeline-toggle">Collapse <span class="timeline-toggle-icon">▲</span></button>
                  </div>
                  <div class="timeline-container" data-session-id="${sessionId}">
                    ${generateSessionTimelineView(item.session)}
                  </div>
                </div>
              `;
              })
              .join("");
          })()}
        </div>

        <div class="section">
          <h2>Player Activity Preferences</h2>
          <p class="metric-explanation">Breakdown of activity types for each player, showing their preferred activities.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
            ${sessionAnalysis.playerActivityPreferences
              .map((player) => {
                // Filter out movement events for the bar chart
                const nonMovementActivities = player.activityBreakdown.filter(
                  (activity) => activity.activityType !== "movement"
                );

                // Find movement count
                const movementActivity = player.activityBreakdown.find(
                  (activity) => activity.activityType === "movement"
                );
                const movementCount = movementActivity
                  ? movementActivity.count
                  : 0;
                const movementPercentage = movementActivity
                  ? Math.round(movementActivity.percentage)
                  : 0;

                return `
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3>${player.playerName}</h3>
                    <p>Dominant Activity: ${player.dominantActivity || "None"}</p>
                    <p>Activity Diversity: ${player.diversityScore} different types</p>
                    <p><strong>Movement Events:</strong> ${movementCount} (${movementPercentage}% of all activities)</p>
                    <h4>Other Activities</h4>
                    <div class="chart-container">
                      ${
                        nonMovementActivities.length > 0
                          ? nonMovementActivities
                              .map(
                                (activity) => `
                            <div class="activity-label">
                              <span>${activity.activityType}</span>
                              <span>${activity.count} (${Math.round(activity.percentage)}%)</span>
                            </div>
                            <div class="activity-bar" style="width: ${activity.percentage}%;"></div>
                          `
                              )
                              .join("")
                          : "<p>No non-movement activities recorded</p>"
                      }
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
        
        <div class="section">
          <h2>Player Activity Patterns</h2>
          <p class="metric-explanation">Activity level = (player's active periods / total time periods) * 100. Most active time/day represents when each player shows peak activity.</p>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Activity Level</th>
                <th>Most Active Time</th>
                <th>Most Active Day</th>
              </tr>
            </thead>
            <tbody>
              ${timelineAnalysis.playerPatterns
                .map(
                  (pattern) => `
                <tr>
                  <td>${pattern.playerName}</td>
                  <td>${pattern.activePeriodsPercentage}%</td>
                  <td>${pattern.mostActiveTimeOfDay}</td>
                  <td>${pattern.mostActiveDay}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Tab 3: Activity Analysis -->
      <div id="tab-activity-analysis" class="tab-content">
        <div class="section">
          <h2>Activity Type Breakdown</h2>
          <p class="metric-explanation">Distribution of different activity types across all players.</p>
          <div class="chart-container">
            ${sessionAnalysis.activityBreakdown
              .map(
                (activity) => `
              <div class="activity-label">
                <span>${activity.activityType}</span>
                <span>${activity.count} (${Math.round(activity.percentage)}%)</span>
              </div>
              <div class="activity-bar" style="width: ${activity.percentage}%;"></div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
      
      <!-- Tab 4: Data Actions -->
      <div id="tab-data-actions" class="tab-content">
        <div class="section">
          <h2>Data Actions</h2>
          <p class="metric-explanation">Analysis of data actions performed by players, including action types and data tables involved.</p>
          
          ${(() => {
            // Filter for data actions only
            const dataActions = sessionAnalysis.activityBreakdown
              .filter((activity) => activity.activityType.startsWith("data_"))
              .sort((a, b) => b.count - a.count);

            if (dataActions.length === 0) {
              return "<p>No data actions recorded in this time period.</p>";
            }

            const totalDataActions = dataActions.reduce(
              (sum, action) => sum + action.count,
              0
            );

            return `
              <div class="chart-container">
                <h3>Data Action Types</h3>
                <p>Total data actions: ${totalDataActions}</p>
                ${dataActions
                  .map((action) => {
                    return `
                    <div class="activity-label">
                      <span>${action.activityType}</span>
                      <span>${action.count} (${Math.round(action.percentage)}%)</span>
                    </div>
                    <div class="activity-bar" style="width: ${action.percentage}%;"></div>
                  `;
                  })
                  .join("")}
              </div>
            `;
          })()}
          
          <div class="section">
            <h2>Data Actions by Player</h2>
            <p class="metric-explanation">Breakdown of data actions performed by each player.</p>
            
            ${(() => {
              // Filter for data actions only from all player activity preferences
              const playersWithDataActions =
                sessionAnalysis.playerActivityPreferences.filter((player) =>
                  player.activityBreakdown.some((activity) =>
                    activity.activityType.startsWith("data_")
                  )
                );

              if (playersWithDataActions.length === 0) {
                return "<p>No data actions recorded in this time period.</p>";
              }

              return `
                <div style="overflow-x: auto;">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Data Action Type</th>
                        <th>Count</th>
                        <th>Percentage of Player's Activities</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${playersWithDataActions
                        .flatMap((player) =>
                          player.activityBreakdown
                            .filter((activity) =>
                              activity.activityType.startsWith("data_")
                            )
                            .map(
                              (activity) => `
                            <tr>
                              <td>${player.playerName}</td>
                              <td>${activity.activityType}</td>
                              <td>${activity.count}</td>
                              <td>${Math.round(activity.percentage)}%</td>
                            </tr>
                          `
                            )
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
                
                <p class="metric-explanation">Note: Data action types are prefixed with 'data_' followed by the specific action type (e.g., 'data_create', 'data_update', etc.).</p>
              `;
            })()}
          </div>
        </div>
      </div>
      
      <!-- Tab 5: Social Dynamics -->
      <div id="tab-social" class="tab-content">
        <div class="section">
          <h2>Social Dynamics</h2>
          <p class="metric-explanation">Co-presence percentage = (periods two players were active together / total periods either was active) * 100. Strong connections are defined as &gt;50% co-presence.</p>
          ${
            timelineAnalysis.socialDynamics.length > 0
              ? `
            <table>
              <thead>
                <tr>
                  <th>Player 1</th>
                  <th>Player 2</th>
                  <th>Co-presence</th>
                  <th>Periods Together</th>
                </tr>
              </thead>
              <tbody>
                ${timelineAnalysis.socialDynamics
                  .map(
                    (connection) => `
                  <tr>
                    <td>${connection.player1}</td>
                    <td>${connection.player2}</td>
                    <td>${connection.copresencePercentage}%</td>
                    <td>${connection.periodsTogetherCount}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          `
              : "<p>No significant social connections detected in this time period.</p>"
          }
        </div>
      </div>
      
      <!-- Tab 6: Debug -->
      <div id="tab-debug" class="tab-content">
        <div class="section">
          <h2>Detailed Session Data (Debug)</h2>
          <p class="metric-explanation">Detailed information about each player's sessions for debugging purposes.</p>
          <div style="overflow-x: auto;">
            ${sessionData.playerSessions
              .map(
                (player) => `
              <h3>${player.playerName}</h3>
              ${
                player.sessions
                  ? `
              <table class="session-table">
                <thead>
                  <tr>
                    <th style="width: 18%;">Time Period</th>
                    <th style="width: 8%;">Duration</th>
                    <th style="width: 7%;">Events</th>
                    <th style="width: 22%;">Event Types</th>
                    <th style="width: 22%;">Areas Visited</th>
                    <th style="width: 23%;">Data Tables</th>
                  </tr>
                </thead>
                <tbody>
                  ${player.sessions
                    .map((session) => {
                      // Group areas by island
                      const areasByIsland = {};
                      if (
                        session.areaDetails &&
                        session.areaDetails.length > 0
                      ) {
                        session.areaDetails.forEach((area) => {
                          const islandName =
                            area.island_name || "Unknown Island";
                          if (!areasByIsland[islandName]) {
                            areasByIsland[islandName] = [];
                          }
                          areasByIsland[islandName].push(
                            area.area_name || area.area_id
                          );
                        });
                      }

                      // Format areas grouped by island
                      const formattedAreas = Object.entries(areasByIsland)
                        .map(
                          ([island, areas]) => `
                            <div class="island-header">${island}</div>
                            ${areas.map((area) => `<span class="tag area-tag">${area}</span>`).join(" ")}
                          `
                        )
                        .join("");

                      // Count event types
                      const eventTypeCounts = {};
                      if (session.events) {
                        session.events.forEach((event) => {
                          if (!eventTypeCounts[event.event_type]) {
                            eventTypeCounts[event.event_type] = 0;
                          }
                          eventTypeCounts[event.event_type]++;
                        });
                      } else {
                        // If events aren't available, just count each type as 1
                        session.eventTypes.forEach((type) => {
                          eventTypeCounts[type] = 1;
                        });
                      }

                      // Format event types with counts
                      const formattedEventTypes = session.eventTypes
                        .map((type) => {
                          const count = eventTypeCounts[type] || 0;
                          return `<span class="tag event-tag">${type} (${count})</span>`;
                        })
                        .join(" ");

                      // Extract data tables and interaction types
                      const dataTables = {};
                      if (session.events) {
                        session.events
                          .filter((event) =>
                            event.event_type.startsWith("data_")
                          )
                          .forEach((event) => {
                            if (event.details) {
                              const tableName =
                                event.details.data_table_name ||
                                event.details.merged_data_table_name ||
                                event.details.table_name ||
                                "Unknown Table";

                              if (!dataTables[tableName]) {
                                dataTables[tableName] = new Set();
                              }

                              // Extract action type (remove 'data_' prefix)
                              const actionType = event.event_type.replace(
                                "data_",
                                ""
                              );
                              dataTables[tableName].add(actionType);
                            }
                          });
                      }

                      // Format data tables with interaction types
                      const formattedDataTables = Object.entries(dataTables)
                        .map(
                          ([table, actions]) => `
                            <div class="tag data-tag">${table}</div>
                            <div>${Array.from(actions)
                              .map(
                                (action) =>
                                  `<span class="action-type">${action}</span>`
                              )
                              .join(", ")}</div>
                          `
                        )
                        .join("");

                      // Format start and end time with session ID as metadata
                      const startTime = new Date(session.startTime);
                      const endTime = new Date(session.endTime);
                      const formattedTimeRange = `
                        ${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <br>to<br>
                        ${endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <br><small>${startTime.toLocaleDateString()}</small>
                        <br><span class="session-id">ID: ${session.sessionId}</span>
                      `;

                      return `
                    <tr>
                      <td class="time-column">${formattedTimeRange}</td>
                      <td class="duration-column">${Math.round(session.duration)} min</td>
                      <td class="count-column">${session.eventCount}</td>
                      <td class="event-types">${formattedEventTypes}</td>
                      <td>${formattedAreas || session.areas.map((area) => `<span class="tag area-tag">${area}</span>`).join(" ")}</td>
                      <td>${formattedDataTables || "<em>No data tables</em>"}</td>
                    </tr>
                  `;
                    })
                    .join("")}
                </tbody>
              </table>
              `
                  : `<p>No detailed session data available</p>`
              }
            `
              )
              .join("")}
          </div>
        </div>

        <div class="section">
          <h2>Data Actions Details (Debug)</h2>
          <p class="metric-explanation">Detailed information about data actions, including the data tables involved.</p>
          
          ${(() => {
            // Filter for data actions only from all player activity preferences
            const playersWithDataActions =
              sessionAnalysis.playerActivityPreferences.filter((player) =>
                player.activityBreakdown.some((activity) =>
                  activity.activityType.startsWith("data_")
                )
              );

            if (playersWithDataActions.length === 0) {
              return "<p>No data actions recorded in this time period.</p>";
            }

            return `
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Data Action Type</th>
                      <th>Count</th>
                      <th>Percentage of Player's Activities</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${playersWithDataActions
                      .flatMap((player) =>
                        player.activityBreakdown
                          .filter((activity) =>
                            activity.activityType.startsWith("data_")
                          )
                          .map(
                            (activity) => `
                          <tr>
                            <td>${player.playerName}</td>
                            <td>${activity.activityType}</td>
                            <td>${activity.count}</td>
                            <td>${Math.round(activity.percentage)}%</td>
                          </tr>
                        `
                          )
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
              
              <p class="metric-explanation">Note: Data action types are prefixed with 'data_' followed by the specific action type (e.g., 'data_create', 'data_update', etc.).</p>
            `;
          })()}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate JSON report
 */
function generateJsonReport(sessionAnalysis, timelineAnalysis, options) {
  // Add metric explanations to the JSON output
  const metricExplanations = {
    totalPlayers: "Count of unique players with activity",
    totalSessions: "Count of all player sessions",
    averageSessionLength: "Mean duration of all sessions in minutes",
    totalPlayTime: "Sum of all player session durations in minutes",
    engagementLevel:
      "Categorized as Low (<60 min), Medium (60-120 min), High (>120 min) based on total play time",
    activePeriodsPercentage:
      "(player's active periods / total time periods) * 100",
    copresencePercentage:
      "(periods two players were active together / total periods either was active) * 100",
    strongConnections: "Player pairs with > 50% co-presence",
    mostActiveTimeOfDay: "Time of day with highest activity for each player",
    mostActiveDay: "Day of week with highest activity for each player",
    activityTypeBreakdown:
      "Distribution of different activity types across all players",
    dominantActivity: "The most frequent activity type for a player",
    diversityScore: "Number of different activity types a player engages in",
  };

  return JSON.stringify(
    {
      metadata: {
        worldId: options.worldId,
        startDate: options.startDate,
        endDate: options.endDate,
        generatedAt: new Date().toISOString(),
      },
      metricExplanations,
      sessionAnalysis,
      timelineAnalysis,
    },
    null,
    2
  );
}

/**
 * Generate CSV report
 */
function generateCsvReport(sessionAnalysis, timelineAnalysis, options) {
  let csvContent = "";

  // Add metadata
  csvContent += "# Game Analytics Report\n";
  csvContent += `# World ID: ${options.worldId}\n`;
  csvContent += `# Date Range: ${options.startDate} to ${options.endDate}\n`;
  csvContent += `# Generated: ${new Date().toLocaleString()}\n\n`;

  // Add metric explanations
  csvContent += "# Metric Explanations:\n";
  csvContent += "# - Total Players: Count of unique players with activity\n";
  csvContent += "# - Total Sessions: Count of all player sessions\n";
  csvContent +=
    "# - Average Session Length: Mean duration of all sessions in minutes\n";
  csvContent += "# - Total Play Time: Sum of all player session durations\n";
  csvContent +=
    "# - Engagement Level: Categorized as Low (<60 min), Medium (60-120 min), High (>120 min) based on total play time\n";
  csvContent +=
    "# - Activity Level: (player's active periods / total time periods) * 100\n";
  csvContent +=
    "# - Co-presence: (periods two players were active together / total periods either was active) * 100\n";
  csvContent += `# - Session Timeout: ${sessionAnalysis.summary.sessionTimeoutMinutes} minutes of inactivity ends a session\n`;
  csvContent += `# - Movement Events: Filtered to require a ${sessionAnalysis.summary.movementEventMinGapSeconds}-second gap to prevent inflation\n`;
  csvContent +=
    "# - Short Sessions: Sessions shorter than 1 minute are filtered out completely\n";
  csvContent +=
    "# - Play Time: Calculated as the time between the first and last event in each session\n\n";

  // Key Metrics
  csvContent += "## Key Metrics\n";
  csvContent += "Metric,Value\n";
  csvContent += `Active Players,${sessionAnalysis.summary.totalPlayers}\n`;
  csvContent += `Total Sessions,${sessionAnalysis.summary.totalSessions}\n`;
  csvContent += `Average Session Length (min),${sessionAnalysis.summary.averageSessionLength}\n`;
  csvContent += `Total Play Time (hrs),${sessionAnalysis.summary.totalPlayTimeHours}\n\n`;

  // Key Insights
  csvContent += "## Key Insights\n";
  sessionAnalysis.insights.forEach((insight) => {
    csvContent += `${insight}\n`;
  });
  timelineAnalysis.insights.forEach((insight) => {
    csvContent += `${insight}\n`;
  });
  csvContent += "\n";

  // Activity Type Breakdown
  csvContent += "## Activity Type Breakdown\n";
  csvContent += "Activity Type,Count,Percentage\n";
  sessionAnalysis.activityBreakdown.forEach((activity) => {
    csvContent += `${activity.activityType},${activity.count},${Math.round(activity.percentage)}\n`;
  });
  csvContent += "\n";

  // Player Engagement
  csvContent += "## Player Engagement\n";
  csvContent +=
    "Player,Sessions,Play Time (min),Avg Session (min),Engagement,Dominant Activity\n";
  sessionAnalysis.playerEngagement.forEach((player) => {
    // Find this player's activity preferences
    const activityPref = sessionAnalysis.playerActivityPreferences.find(
      (p) => p.playerId === player.playerId
    );
    const dominantActivity = activityPref
      ? activityPref.dominantActivity
      : "N/A";

    csvContent += `${player.playerName},${player.totalSessions},${player.totalPlayTimeMinutes},${player.averageSessionLength},${player.engagementLevel},${dominantActivity}\n`;
  });
  csvContent += "\n";

  // Player Activity Preferences
  csvContent += "## Player Activity Preferences\n";
  sessionAnalysis.playerActivityPreferences.forEach((player) => {
    csvContent += `# ${player.playerName} (Diversity Score: ${player.diversityScore})\n`;
    csvContent += "Activity Type,Count,Percentage\n";
    player.activityBreakdown.forEach((activity) => {
      csvContent += `${activity.activityType},${activity.count},${Math.round(activity.percentage)}\n`;
    });
    csvContent += "\n";
  });

  // Data Actions
  csvContent += "## Data Actions\n";
  const dataActions = sessionAnalysis.activityBreakdown
    .filter((activity) => activity.activityType.startsWith("data_"))
    .sort((a, b) => b.count - a.count);

  if (dataActions.length > 0) {
    const totalDataActions = dataActions.reduce(
      (sum, action) => sum + action.count,
      0
    );
    csvContent += `Total Data Actions: ${totalDataActions}\n\n`;

    csvContent += "Data Action Type,Count,Percentage\n";
    dataActions.forEach((action) => {
      csvContent += `${action.activityType},${action.count},${Math.round(action.percentage)}\n`;
    });

    // Player-specific data actions
    csvContent += "\n# Data Actions by Player\n";
    csvContent +=
      "Player,Data Action Type,Count,Percentage of Player's Activities\n";

    sessionAnalysis.playerActivityPreferences
      .filter((player) =>
        player.activityBreakdown.some((activity) =>
          activity.activityType.startsWith("data_")
        )
      )
      .forEach((player) => {
        player.activityBreakdown
          .filter((activity) => activity.activityType.startsWith("data_"))
          .forEach((activity) => {
            csvContent += `${player.playerName},${activity.activityType},${activity.count},${Math.round(activity.percentage)}\n`;
          });
      });
  } else {
    csvContent += "No data actions recorded in this time period.\n";
  }
  csvContent += "\n";

  // Social Dynamics
  csvContent += "## Social Dynamics\n";
  if (timelineAnalysis.socialDynamics.length > 0) {
    csvContent += "Player 1,Player 2,Co-presence (%),Periods Together\n";
    timelineAnalysis.socialDynamics.forEach((connection) => {
      csvContent += `${connection.player1},${connection.player2},${connection.copresencePercentage},${connection.periodsTogetherCount}\n`;
    });
  } else {
    csvContent +=
      "No significant social connections detected in this time period.\n";
  }
  csvContent += "\n";

  // Player Activity Patterns
  csvContent += "## Player Activity Patterns\n";
  csvContent += "Player,Activity Level (%),Most Active Time,Most Active Day\n";
  timelineAnalysis.playerPatterns.forEach((pattern) => {
    csvContent += `${pattern.playerName},${pattern.activePeriodsPercentage},${pattern.mostActiveTimeOfDay},${pattern.mostActiveDay}\n`;
  });

  return csvContent;
}

/**
 * Save report to file
 */
function saveReport(content, formatType, outputDir, worldId) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = formatDate(new Date(), "yyyyMMdd-HHmmss");
  const filename = `${worldId}_report_${timestamp}.${formatType}`;
  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, content);

  return filePath;
}

/**
 * Main function
 */
async function main() {
  console.log("Generating game analytics report...");
  console.log(`World ID: ${options.worldId}`);
  console.log(`Date Range: ${options.startDate} to ${options.endDate}`);

  try {
    // Authenticate if credentials are provided
    const token = await authenticate(options.username, options.password);

    // Execute GraphQL queries
    console.log("Fetching player session analytics...");
    const sessionData = await executeQuery(
      PLAYER_SESSION_ANALYTICS_QUERY,
      {
        worldId: options.worldId,
        startDate,
        endDate,
      },
      token
    );

    console.log("Fetching player activity timeline...");
    const timelineData = await executeQuery(
      PLAYER_ACTIVITY_TIMELINE_QUERY,
      {
        worldId: options.worldId,
        startDate,
        endDate,
        sessionIntervalMinutes: parseInt(options.sessionInterval, 10),
      },
      token
    );

    // Analyze data
    console.log("Analyzing session data...");
    const sessionAnalysis = analyzeSessionData(
      sessionData.playerSessionAnalytics
    );

    console.log("Analyzing timeline data...");
    const timelineAnalysis = analyzeTimelineData(
      timelineData.playerActivityTimeline
    );

    // Generate report
    let reportContent;
    if (options.format === "html") {
      console.log("Generating HTML report...");
      reportContent = generateHtmlReport(
        sessionAnalysis,
        timelineAnalysis,
        sessionData.playerSessionAnalytics,
        options
      );
    } else if (options.format === "json") {
      console.log("Generating JSON report...");
      reportContent = generateJsonReport(
        sessionAnalysis,
        timelineAnalysis,
        options
      );
    } else if (options.format === "csv") {
      console.log("Generating CSV report...");
      reportContent = generateCsvReport(
        sessionAnalysis,
        timelineAnalysis,
        options
      );
    } else {
      throw new Error(`Unsupported format: ${options.format}`);
    }

    // Save report
    const filePath = saveReport(
      reportContent,
      options.format,
      options.outputDir,
      options.worldId
    );
    console.log(`Report saved to: ${filePath}`);
  } catch (error) {
    console.error("Error generating report:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
