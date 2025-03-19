import { ensureAuthenticated, handleErrors } from "./utils.js";

// Helper function to identify sessions based on player activity events
// A session is defined as a sequence of events where the gap between consecutive events is less than the session timeout
const identifySessions = (events, sessionTimeoutMinutes = 15) => {
  if (!events.length) return [];

  // Sort events by time
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const filteredEvents = sortedEvents;

  // Log the filtering effect
  console.log(
    `Movement filtering: ${sortedEvents.length} events reduced to ${filteredEvents.length} events (${Math.round((1 - filteredEvents.length / sortedEvents.length) * 100)}% reduction)`
  );

  const sessions = [];
  if (filteredEvents.length === 0) return sessions;

  let currentSession = {
    events: [filteredEvents[0]],
    areas: new Set([filteredEvents[0].area_id].filter(Boolean)),
    areaDetails: new Map(),
    eventTypes: new Set([filteredEvents[0].event_type]),
    startTime: new Date(filteredEvents[0].timestamp),
    endTime: new Date(filteredEvents[0].timestamp),
  };

  // Add area details if available
  if (filteredEvents[0].area_id && filteredEvents[0].area_name) {
    currentSession.areaDetails.set(filteredEvents[0].area_id, {
      area_id: filteredEvents[0].area_id,
      area_name: filteredEvents[0].area_name || "Unknown Area",
      island_id: filteredEvents[0].island_id,
      island_name: filteredEvents[0].island_name || "Unknown Island",
    });
  }

  // Session timeout in milliseconds
  const sessionTimeout = sessionTimeoutMinutes * 60 * 1000;

  for (let i = 1; i < filteredEvents.length; i++) {
    const event = filteredEvents[i];
    const eventTime = new Date(event.timestamp);
    const timeSinceLastEvent = eventTime - currentSession.endTime;

    // If the gap is less than the timeout, extend the current session
    if (timeSinceLastEvent < sessionTimeout) {
      currentSession.events.push(event);
      if (event.area_id) currentSession.areas.add(event.area_id);
      currentSession.eventTypes.add(event.event_type);
      currentSession.endTime = eventTime;

      // Add area details if available and not already tracked
      if (
        event.area_id &&
        event.area_name &&
        !currentSession.areaDetails.has(event.area_id)
      ) {
        currentSession.areaDetails.set(event.area_id, {
          area_id: event.area_id,
          area_name: event.area_name || "Unknown Area",
          island_id: event.island_id,
          island_name: event.island_name || "Unknown Island",
        });
      }
    } else {
      // Otherwise, end the current session and start a new one
      sessions.push({
        ...currentSession,
        duration:
          (currentSession.endTime - currentSession.startTime) / (1000 * 60), // in minutes
        eventCount: currentSession.events.length,
        areas: Array.from(currentSession.areas),
        areaDetails: Array.from(currentSession.areaDetails.values()),
        eventTypes: Array.from(currentSession.eventTypes),
      });

      currentSession = {
        events: [event],
        areas: new Set([event.area_id].filter(Boolean)),
        areaDetails: new Map(),
        eventTypes: new Set([event.event_type]),
        startTime: eventTime,
        endTime: eventTime,
      };

      // Add area details for the new session
      if (event.area_id && event.area_name) {
        currentSession.areaDetails.set(event.area_id, {
          area_id: event.area_id,
          area_name: event.area_name || "Unknown Area",
          island_id: event.island_id,
          island_name: event.island_name || "Unknown Island",
        });
      }
    }
  }

  // Add the last session
  sessions.push({
    ...currentSession,
    duration: (currentSession.endTime - currentSession.startTime) / (1000 * 60), // in minutes
    eventCount: currentSession.events.length,
    areas: Array.from(currentSession.areas),
    areaDetails: Array.from(currentSession.areaDetails.values()),
    eventTypes: Array.from(currentSession.eventTypes),
  });

  // Filter out very short sessions (less than 1 minute)
  const filteredSessions = sessions.filter((session) => session.duration >= 1);

  // Log the filtering effect
  if (sessions.length !== filteredSessions.length) {
    console.log(
      `Filtered out ${sessions.length - filteredSessions.length} very short sessions (< 1 minute)`
    );
  }

  return filteredSessions;
};

// Helper function to create session distribution data
const createSessionDistribution = (sessions) => {
  // Define duration ranges in minutes
  const ranges = [
    { min: 0, max: 5, label: "0-5 min" },
    { min: 5, max: 15, label: "5-15 min" },
    { min: 15, max: 30, label: "15-30 min" },
    { min: 30, max: 60, label: "30-60 min" },
    { min: 60, max: 120, label: "1-2 hours" },
    { min: 120, max: Infinity, label: "2+ hours" },
  ];

  // Count sessions in each range
  const distribution = ranges.map((range) => ({
    durationRange: range.label,
    sessionCount: sessions.filter(
      (s) => s.duration >= range.min && s.duration < range.max
    ).length,
    percentage: 0, // Will calculate after counting
  }));

  // Calculate percentages
  if (sessions.length > 0) {
    distribution.forEach((item) => {
      item.percentage = (item.sessionCount / sessions.length) * 100;
    });
  }

  return distribution;
};

// Helper function to group sessions by day of week
const groupSessionsByDay = (sessions) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const sessionsByDay = days.map((day) => ({
    day,
    sessionCount: 0,
    totalDuration: 0,
    averageDuration: 0,
  }));

  sessions.forEach((session) => {
    const dayIndex = session.startTime.getDay();
    sessionsByDay[dayIndex].sessionCount++;
    sessionsByDay[dayIndex].totalDuration += session.duration;
  });

  // Calculate average durations
  sessionsByDay.forEach((day) => {
    if (day.sessionCount > 0) {
      day.averageDuration = day.totalDuration / day.sessionCount;
    }
    delete day.totalDuration; // Remove the helper property
  });

  return sessionsByDay;
};

// Helper function to group sessions by day of week per week
const groupSessionsByDayPerWeek = (sessions) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Group sessions by week
  const sessionsByWeek = {};

  sessions.forEach((session) => {
    // Get the week number (using ISO week)
    const weekStart = new Date(session.startTime);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split("T")[0]; // Format: YYYY-MM-DD

    if (!sessionsByWeek[weekKey]) {
      sessionsByWeek[weekKey] = days.map((day) => ({
        day,
        weekStart: weekKey,
        sessionCount: 0,
        totalPlayTime: 0,
      }));
    }

    const dayIndex = session.startTime.getDay();
    sessionsByWeek[weekKey][dayIndex].sessionCount++;
    sessionsByWeek[weekKey][dayIndex].totalPlayTime += session.duration;
  });

  // Convert to array and sort by week
  const result = Object.values(sessionsByWeek).flat();
  result.sort((a, b) => {
    // First sort by week
    const weekDiff = new Date(a.weekStart) - new Date(b.weekStart);
    if (weekDiff !== 0) return weekDiff;

    // Then sort by day of week
    const dayOrder = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    return dayOrder[a.day] - dayOrder[b.day];
  });

  return result;
};

// Helper function to group sessions by hour of day
const groupSessionsByHour = (sessions) => {
  const sessionsByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    sessionCount: 0,
    totalDuration: 0,
    averageDuration: 0,
  }));

  sessions.forEach((session) => {
    const hour = session.startTime.getHours();
    sessionsByHour[hour].sessionCount++;
    sessionsByHour[hour].totalDuration += session.duration;
  });

  // Calculate average durations
  sessionsByHour.forEach((hourData) => {
    if (hourData.sessionCount > 0) {
      hourData.averageDuration = hourData.totalDuration / hourData.sessionCount;
    }
    delete hourData.totalDuration; // Remove the helper property
  });

  return sessionsByHour;
};

// Helper function to divide time range into fixed intervals and identify active players in each
const createActivityTimeline = (events, intervalMinutes = 30) => {
  if (!events.length) return [];

  // Find the overall time range
  const allTimes = events.map((e) => new Date(e.timestamp).getTime());
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);

  // Create time periods with fixed intervals
  const intervalMs = intervalMinutes * 60 * 1000;
  const periods = [];

  for (
    let periodStart = minTime;
    periodStart < maxTime;
    periodStart += intervalMs
  ) {
    const periodEnd = periodStart + intervalMs;
    const periodEvents = events.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime();
      return eventTime >= periodStart && eventTime < periodEnd;
    });

    if (periodEvents.length > 0) {
      // Group events by player
      const playerEvents = {};
      periodEvents.forEach((event) => {
        if (!event.player_id) return;

        if (!playerEvents[event.player_id]) {
          playerEvents[event.player_id] = {
            playerId: event.player_id,
            playerName: event.player_name || "Unknown",
            events: [],
            areas: new Set(),
            eventTypes: new Set(),
          };
        }

        playerEvents[event.player_id].events.push(event);
        if (event.area_id)
          playerEvents[event.player_id].areas.add(event.area_id);
        playerEvents[event.player_id].eventTypes.add(event.event_type);
      });

      // Format active players for this period
      const activePlayers = Object.values(playerEvents).map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        eventCount: player.events.length,
        areas: Array.from(player.areas),
        eventTypes: Array.from(player.eventTypes),
      }));

      periods.push({
        periodId: `period-${new Date(periodStart).toISOString()}`,
        startTime: new Date(periodStart).toISOString(),
        endTime: new Date(periodEnd).toISOString(),
        activePlayers,
        totalActivePlayers: activePlayers.length,
      });
    }
  }

  return periods;
};

// Helper function to create player activity summaries
const createPlayerSummaries = (activityPeriods) => {
  // Create a map of all players
  const playerMap = {};

  // Track activity by hour and day for each player
  activityPeriods.forEach((period) => {
    const periodStart = new Date(period.startTime);
    const hour = periodStart.getHours();
    const day = periodStart.getDay();

    period.activePlayers.forEach((player) => {
      if (!playerMap[player.playerId]) {
        playerMap[player.playerId] = {
          playerId: player.playerId,
          playerName: player.playerName,
          activePeriods: 0,
          hourCounts: Array(24).fill(0),
          dayCounts: Array(7).fill(0),
        };
      }

      playerMap[player.playerId].activePeriods++;
      playerMap[player.playerId].hourCounts[hour]++;
      playerMap[player.playerId].dayCounts[day]++;
    });
  });

  // Convert to summaries
  const totalPeriods = activityPeriods.length;
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return Object.values(playerMap).map((player) => {
    // Find most active hour
    const maxHourCount = Math.max(...player.hourCounts);
    const maxHourIndex = player.hourCounts.indexOf(maxHourCount);
    const formattedHour =
      maxHourIndex < 12
        ? `${maxHourIndex === 0 ? 12 : maxHourIndex}am`
        : `${maxHourIndex === 12 ? 12 : maxHourIndex - 12}pm`;

    // Find most active day
    const maxDayCount = Math.max(...player.dayCounts);
    const maxDayIndex = player.dayCounts.indexOf(maxDayCount);

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      totalActivePeriods: player.activePeriods,
      activePeriodsPercentage: (player.activePeriods / totalPeriods) * 100,
      mostActiveTimeOfDay: formattedHour,
      mostActiveDay: days[maxDayIndex],
    };
  });
};

// Helper function to calculate co-presence between players
const calculatePlayerCopresence = (activityPeriods) => {
  // Create a map to track which periods each player was active in
  const playerPeriods = {};

  activityPeriods.forEach((period) => {
    period.activePlayers.forEach((player) => {
      if (!playerPeriods[player.playerId]) {
        playerPeriods[player.playerId] = {
          playerId: player.playerId,
          playerName: player.playerName,
          periods: new Set(),
        };
      }

      playerPeriods[player.playerId].periods.add(period.periodId);
    });
  });

  // Calculate co-presence for each pair of players
  const playerIds = Object.keys(playerPeriods);
  const copresenceData = [];
  const totalPeriods = activityPeriods.length;

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      const player1 = playerPeriods[playerIds[i]];
      const player2 = playerPeriods[playerIds[j]];

      // Find periods where both players were active
      const player1Periods = player1.periods;
      const player2Periods = player2.periods;

      let periodsTogetherCount = 0;
      player1Periods.forEach((periodId) => {
        if (player2Periods.has(periodId)) {
          periodsTogetherCount++;
        }
      });

      if (periodsTogetherCount > 0) {
        copresenceData.push({
          player1Id: player1.playerId,
          player1Name: player1.playerName,
          player2Id: player2.playerId,
          player2Name: player2.playerName,
          periodsTogetherCount,
          copresencePercentage: (periodsTogetherCount / totalPeriods) * 100,
        });
      }
    }
  }

  // Sort by co-presence percentage (highest first)
  return copresenceData.sort(
    (a, b) => b.copresencePercentage - a.copresencePercentage
  );
};

// Helper function to calculate activity type breakdown
const calculateActivityTypeBreakdown = (events) => {
  const activityCounts = {};

  events.forEach((event) => {
    if (!activityCounts[event.event_type]) {
      activityCounts[event.event_type] = 0;
    }
    activityCounts[event.event_type]++;
  });

  // Convert to percentage
  const total = events.length;
  return Object.entries(activityCounts)
    .map(([type, count]) => ({
      activityType: type,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
};

// Helper function to calculate player activity preferences
const calculatePlayerActivityPreferences = (playerEvents) => {
  return Object.values(playerEvents).map((player) => {
    const activityCounts = {};

    player.events.forEach((event) => {
      if (!activityCounts[event.event_type]) {
        activityCounts[event.event_type] = 0;
      }
      activityCounts[event.event_type]++;
    });

    // Find dominant activity
    let dominantActivity = null;
    let maxCount = 0;

    Object.entries(activityCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantActivity = type;
      }
    });

    // Calculate diversity score (how many different activities)
    const diversityScore = Object.keys(activityCounts).length;

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      dominantActivity,
      diversityScore,
      activityBreakdown: Object.entries(activityCounts)
        .map(([type, count]) => ({
          activityType: type,
          count,
          percentage: (count / player.events.length) * 100,
        }))
        .sort((a, b) => b.count - a.count), // Sort by count descending
    };
  });
};

// Function to fetch all player activity events
async function fetchAllPlayerActivityEvents(prisma, whereConditions) {
  // Base conditions for world_id
  const worldIdCondition = { world_id: whereConditions.world_id };

  // Player ID condition if provided
  const playerIdCondition = whereConditions.player_id
    ? { player_id: whereConditions.player_id }
    : {};

  // Date range for different timestamp fields
  const startDate = whereConditions.player_location_record_time?.gte;
  const endDate = whereConditions.player_location_record_time?.lte;

  // Get all player movement events
  const playerLocationRecords = await prisma.player_location_records.findMany({
    where: {
      ...worldIdCondition,
      ...playerIdCondition,
      ...(startDate ? { player_location_record_time: { gte: startDate } } : {}),
      ...(endDate ? { player_location_record_time: { lte: endDate } } : {}),
    },
    select: {
      player_id: true,
      player_location_record_time: true,
      players: {
        select: {
          player_name: true,
        },
      },
      area_id: true,
      areas: {
        select: {
          area_id: true,
          area_name: true,
          island_id: true,
          islands: {
            select: {
              island_id: true,
              island_name: true,
            },
          },
        },
      },
      player_location_record_x: true,
      player_location_record_y: true,
    },
  });

  // Map location records to a common activity format
  const locationEvents = playerLocationRecords.map((record) => ({
    player_id: record.player_id,
    timestamp: record.player_location_record_time,
    player_name: record.players?.player_name || "Unknown",
    area_id: record.area_id,
    area_name: record.areas?.area_name,
    island_id: record.areas?.island_id,
    island_name: record.areas?.islands?.island_name,
    event_type: "movement",
    details: {
      x: record.player_location_record_x,
      y: record.player_location_record_y,
    },
  }));

  // Get crafting actions
  const craftingActions = await prisma.crafting_actions.findMany({
    where: {
      ...worldIdCondition,
      ...playerIdCondition,
      ...(startDate ? { crafting_action_time: { gte: startDate } } : {}),
      ...(endDate ? { crafting_action_time: { lte: endDate } } : {}),
    },
    select: {
      player_id: true,
      crafting_action_time: true,
      players: {
        select: {
          player_name: true,
        },
      },
      item_id: true,
    },
  });

  // Map crafting actions to common format
  const craftingEvents = craftingActions.map((action) => ({
    player_id: action.player_id,
    timestamp: action.crafting_action_time,
    player_name: action.players?.player_name || "Unknown",
    event_type: "crafting",
    details: {
      item_id: action.item_id,
    },
  }));

  // Get foraging actions
  const foragingActions = await prisma.foraging_actions.findMany({
    where: {
      ...worldIdCondition,
      ...playerIdCondition,
      ...(startDate ? { foraging_action_time: { gte: startDate } } : {}),
      ...(endDate ? { foraging_action_time: { lte: endDate } } : {}),
    },
    select: {
      player_id: true,
      foraging_action_time: true,
      players: {
        select: {
          player_name: true,
        },
      },
      resource_id: true,
    },
  });

  // Map foraging actions to common format
  const foragingEvents = foragingActions.map((action) => ({
    player_id: action.player_id,
    timestamp: action.foraging_action_time,
    player_name: action.players?.player_name || "Unknown",
    event_type: "foraging",
    details: {
      resource_id: action.resource_id,
    },
  }));

  // Get giving actions
  const givingActions = await prisma.giving_actions.findMany({
    where: {
      ...worldIdCondition,
      ...playerIdCondition,
      ...(startDate ? { giving_action_time: { gte: startDate } } : {}),
      ...(endDate ? { giving_action_time: { lte: endDate } } : {}),
    },
    select: {
      player_id: true,
      giving_action_time: true,
      players: {
        select: {
          player_name: true,
        },
      },
      creature_id: true,
      item_id: true,
    },
  });

  // Map giving actions to common format
  const givingEvents = givingActions.map((action) => ({
    player_id: action.player_id,
    timestamp: action.giving_action_time,
    player_name: action.players?.player_name || "Unknown",
    event_type: "giving",
    details: {
      creature_id: action.creature_id,
      item_id: action.item_id,
    },
  }));

  // Get patch actions
  const patchActions = await prisma.patch_actions.findMany({
    where: {
      ...worldIdCondition,
      ...playerIdCondition,
      ...(startDate ? { patch_action_time: { gte: startDate } } : {}),
      ...(endDate ? { patch_action_time: { lte: endDate } } : {}),
    },
    select: {
      player_id: true,
      patch_action_time: true,
      players: {
        select: {
          player_name: true,
        },
      },
      patch_id: true,
      patch_action_growth_effect: true,
      patch_action_shadow_effect: true,
      patch_action_light_effect: true,
      patch_action_stability_effect: true,
    },
  });

  // Map patch actions to common format
  const patchEvents = patchActions.map((action) => ({
    player_id: action.player_id,
    timestamp: action.patch_action_time,
    player_name: action.players?.player_name || "Unknown",
    event_type: "patch_action",
    details: {
      patch_id: action.patch_id,
      growth_effect: action.patch_action_growth_effect,
      shadow_effect: action.patch_action_shadow_effect,
      light_effect: action.patch_action_light_effect,
      stability_effect: action.patch_action_stability_effect,
    },
  }));

  // Get inventory actions
  const inventoryActions = await prisma.inventory_actions.findMany({
    where: {
      ...worldIdCondition,
      ...playerIdCondition,
      ...(startDate ? { inventory_action_time: { gte: startDate } } : {}),
      ...(endDate ? { inventory_action_time: { lte: endDate } } : {}),
    },
    select: {
      player_id: true,
      inventory_action_time: true,
      players: {
        select: {
          player_name: true,
        },
      },
      inventory_action_type: true,
      item_id: true,
      resource_id: true,
    },
  });

  // Map inventory actions to common format
  const inventoryEvents = inventoryActions.map((action) => ({
    player_id: action.player_id,
    timestamp: action.inventory_action_time,
    player_name: action.players?.player_name || "Unknown",
    event_type: `inventory_${action.inventory_action_type || "action"}`,
    details: {
      action_type: action.inventory_action_type,
      item_id: action.item_id,
      resource_id: action.resource_id,
    },
  }));

  // Get data actions
  const dataActions = await prisma.data_actions.findMany({
    where: {
      ...worldIdCondition,
      ...playerIdCondition,
      ...(startDate ? { data_action_time: { gte: startDate } } : {}),
      ...(endDate ? { data_action_time: { lte: endDate } } : {}),
    },
    select: {
      player_id: true,
      data_action_time: true,
      data_action_type: true,
      data_action_table_name: true,
      data_action_axis: true,
      data_action_variable: true,
      data_action_source: true,
      players: {
        select: {
          player_name: true,
        },
      },
      data_table_id: true,
      data_tables_data_actions_data_table_idTodata_tables: {
        select: {
          data_table_id: true,
          data_table_name: true,
        },
      },
      merged_data_table_id: true,
      data_tables_data_actions_merged_data_table_idTodata_tables: {
        select: {
          data_table_id: true,
          data_table_name: true,
        },
      },
    },
  });

  // Map data actions to common format
  const dataEvents = dataActions.map((action) => ({
    player_id: action.player_id,
    timestamp: action.data_action_time,
    player_name: action.players?.player_name || "Unknown",
    event_type: `data_${action.data_action_type || "action"}`,
    details: {
      action_type: action.data_action_type,
      table_name: action.data_action_table_name,
      axis: action.data_action_axis,
      variable: action.data_action_variable,
      source: action.data_action_source,
      data_table_id: action.data_table_id,
      data_table_name:
        action.data_tables_data_actions_data_table_idTodata_tables
          ?.data_table_name,
      merged_data_table_id: action.merged_data_table_id,
      merged_data_table_name:
        action.data_tables_data_actions_merged_data_table_idTodata_tables
          ?.data_table_name,
    },
  }));

  // Combine all events and sort by timestamp
  const allEvents = [
    ...locationEvents,
    ...craftingEvents,
    ...foragingEvents,
    ...givingEvents,
    ...patchEvents,
    ...inventoryEvents,
    ...dataEvents,
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return allEvents;
}

const playerAnalyticsResolvers = {
  Query: {
    playerSessionAnalytics: async (
      _,
      { worldId, startDate, endDate, playerId },
      { prisma, userId }
    ) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        // Build the query conditions
        const whereConditions = {
          world_id: worldId,
        };

        // Add time range conditions if provided
        if (startDate) {
          whereConditions.player_location_record_time = {
            ...(whereConditions.player_location_record_time || {}),
            gte: new Date(startDate),
          };
        }

        if (endDate) {
          whereConditions.player_location_record_time = {
            ...(whereConditions.player_location_record_time || {}),
            lte: new Date(endDate),
          };
        }

        // Add player filter if provided
        if (playerId) {
          whereConditions.player_id = playerId;
        }

        // Get all player activity events
        const allActivityEvents = await fetchAllPlayerActivityEvents(
          prisma,
          whereConditions
        );

        // Group events by player
        const playerEvents = {};
        allActivityEvents.forEach((event) => {
          if (!event.player_id) return;

          if (!playerEvents[event.player_id]) {
            playerEvents[event.player_id] = {
              playerId: event.player_id,
              playerName: event.player_name || "Unknown",
              events: [],
            };
          }

          playerEvents[event.player_id].events.push(event);
        });

        // Identify sessions for each player
        const playerSessionsData = [];
        let allSessions = [];

        Object.values(playerEvents).forEach((player) => {
          const sessions = identifySessions(player.events);
          allSessions = [...allSessions, ...sessions];

          if (sessions.length > 0) {
            const totalPlayTime = sessions.reduce(
              (sum, session) => sum + session.duration,
              0
            );
            const averageSessionLength = totalPlayTime / sessions.length;

            playerSessionsData.push({
              playerId: player.playerId,
              playerName: player.playerName,
              totalSessions: sessions.length,
              averageSessionLength,
              totalPlayTime,
              firstSession: sessions[0].startTime.toISOString(),
              lastSession: sessions[sessions.length - 1].endTime.toISOString(),
              sessions: sessions.map((session) => ({
                sessionId: `${player.playerId}-${session.startTime.getTime()}`,
                startTime: session.startTime.toISOString(),
                endTime: session.endTime.toISOString(),
                duration: session.duration,
                eventCount: session.eventCount,
                areas: session.areas,
                areaDetails: session.areaDetails || [],
                eventTypes: session.eventTypes,
                events: session.events.map((event) => ({
                  event_type: event.event_type,
                  timestamp: event.timestamp,
                  details: event.details || {},
                })),
              })),
            });
          }
        });

        // Calculate overall statistics
        const totalPlayers = playerSessionsData.length;
        const totalSessions = allSessions.length;
        const averageSessionLength =
          totalSessions > 0
            ? allSessions.reduce((sum, session) => sum + session.duration, 0) /
              totalSessions
            : 0;

        // Create distribution data
        const sessionLengthDistribution =
          createSessionDistribution(allSessions);
        const sessionsByDay = groupSessionsByDay(allSessions);
        const sessionsByHour = groupSessionsByHour(allSessions);
        const sessionsByDayPerWeek = groupSessionsByDayPerWeek(allSessions);

        // Calculate activity type breakdown
        const activityTypeBreakdown =
          calculateActivityTypeBreakdown(allActivityEvents);

        // Calculate player activity preferences
        const playerActivityPreferences =
          calculatePlayerActivityPreferences(playerEvents);

        return {
          totalPlayers,
          totalSessions,
          averageSessionLength,
          playerSessions: playerSessionsData,
          sessionLengthDistribution,
          sessionsByDay,
          sessionsByHour,
          sessionsByDayPerWeek,
          activityTypeBreakdown,
          playerActivityPreferences,
        };
      });
    },

    playerActivityTimeline: async (
      _,
      { worldId, startDate, endDate, sessionIntervalMinutes = 30, playerId },
      { prisma, userId }
    ) => {
      ensureAuthenticated(userId);
      return handleErrors(async () => {
        // Build the query conditions
        const whereConditions = {
          world_id: worldId,
        };

        // Add time range conditions if provided
        if (startDate) {
          whereConditions.player_location_record_time = {
            ...(whereConditions.player_location_record_time || {}),
            gte: new Date(startDate),
          };
        }

        if (endDate) {
          whereConditions.player_location_record_time = {
            ...(whereConditions.player_location_record_time || {}),
            lte: new Date(endDate),
          };
        }

        // Add player filter if provided
        if (playerId) {
          whereConditions.player_id = playerId;
        }

        // Get all player activity events
        const allActivityEvents = await fetchAllPlayerActivityEvents(
          prisma,
          whereConditions
        );

        // Create activity timeline with fixed intervals
        const activityPeriods = createActivityTimeline(
          allActivityEvents,
          sessionIntervalMinutes
        );

        // Create player summaries
        const playerSummaries = createPlayerSummaries(activityPeriods);

        // Calculate co-presence between players
        const playerCopresence = calculatePlayerCopresence(activityPeriods);

        return {
          totalPlayers: playerSummaries.length,
          totalTimePeriods: activityPeriods.length,
          activityPeriods,
          playerSummaries,
          playerCopresence,
        };
      });
    },
  },
};

export default playerAnalyticsResolvers;
