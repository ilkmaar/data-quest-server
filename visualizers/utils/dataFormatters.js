/**
 * Data formatter utilities for visualization data preparation
 */

/**
 * Formats data for bar charts by grouping and aggregating data
 * @param {Array} data - Raw data array
 * @param {String} groupBy - Field to group by
 * @param {String} valueField - Field to aggregate
 * @param {Function} aggregator - Aggregation function (default: sum)
 * @returns {Array} Formatted data for bar chart
 */
export const formatBarChartData = (data, groupBy, valueField, aggregator = sum) => {
  const grouped = groupByField(data, groupBy);
  
  return Object.entries(grouped).map(([key, values]) => ({
    [groupBy]: key,
    [valueField]: aggregator(values, valueField)
  }));
};

/**
 * Formats data for timeline visualization
 * @param {Array} events - Event data with timestamps
 * @param {String} timeField - Field containing timestamp
 * @param {String} entityField - Field identifying the entity
 * @param {String} typeField - Field identifying event type
 * @returns {Array} Formatted data for timeline visualization
 */
export const formatTimelineData = (events, timeField, entityField, typeField) => {
  // Sort by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a[timeField]) - new Date(b[timeField])
  );
  
  // Group events by entity
  const eventsByEntity = groupByField(sortedEvents, entityField);
  
  // Convert to timeline format
  const timelineData = [];
  
  Object.entries(eventsByEntity).forEach(([entity, entityEvents]) => {
    // Group consecutive events of the same type
    let currentGroup = null;
    
    entityEvents.forEach(event => {
      const eventTime = new Date(event[timeField]);
      const eventType = event[typeField];
      
      if (!currentGroup || currentGroup.type !== eventType || 
          eventTime - new Date(currentGroup.end) > 30000) { // 30s gap starts new segment
        
        // Finish current group if it exists
        if (currentGroup) {
          timelineData.push({
            entity,
            type: currentGroup.type,
            start: currentGroup.start,
            end: currentGroup.end,
            count: currentGroup.count,
            details: currentGroup.events
          });
        }
        
        // Start new group
        currentGroup = {
          type: eventType,
          start: event[timeField],
          end: event[timeField],
          count: 1,
          events: [event]
        };
      } else {
        // Continue current group
        currentGroup.end = event[timeField];
        currentGroup.count++;
        currentGroup.events.push(event);
      }
    });
    
    // Add final group
    if (currentGroup) {
      timelineData.push({
        entity,
        type: currentGroup.type,
        start: currentGroup.start,
        end: currentGroup.end,
        count: currentGroup.count,
        details: currentGroup.events
      });
    }
  });
  
  return timelineData;
};

/**
 * Formats data for heatmap visualization
 * @param {Array} data - Raw data array 
 * @param {String} xField - Field for x-axis
 * @param {String} yField - Field for y-axis
 * @param {String} valueField - Field for cell values
 * @param {Function} aggregator - Aggregation function (default: sum)
 * @returns {Array} Formatted data for heatmap
 */
export const formatHeatmapData = (data, xField, yField, valueField, aggregator = sum) => {
  // Create a map for quick lookup using a composite key
  const heatmapData = {};
  
  // First pass: aggregate values
  data.forEach(item => {
    const xValue = item[xField];
    const yValue = item[yField];
    const key = `${xValue}|${yValue}`;
    
    if (!heatmapData[key]) {
      heatmapData[key] = {
        [xField]: xValue,
        [yField]: yValue,
        [valueField]: 0,
        items: []
      };
    }
    
    heatmapData[key].items.push(item);
  });
  
  // Second pass: apply aggregator function
  return Object.values(heatmapData).map(cell => ({
    [xField]: cell[xField],
    [yField]: cell[yField],
    [valueField]: aggregator(cell.items, valueField)
  }));
};

/**
 * Groups array items by a specific field
 * @param {Array} array - Array to group
 * @param {String} field - Field to group by
 * @returns {Object} Grouped object
 */
export const groupByField = (array, field) => {
  return array.reduce((groups, item) => {
    const value = item[field];
    groups[value] = groups[value] || [];
    groups[value].push(item);
    return groups;
  }, {});
};

/**
 * Sum aggregator function
 * @param {Array} items - Array of items
 * @param {String} field - Field to sum
 * @returns {Number} Sum of values
 */
export const sum = (items, field) => {
  return items.reduce((total, item) => {
    return total + (Number(item[field]) || 0);
  }, 0);
};

/**
 * Average aggregator function
 * @param {Array} items - Array of items
 * @param {String} field - Field to average
 * @returns {Number} Average of values
 */
export const average = (items, field) => {
  if (items.length === 0) return 0;
  return sum(items, field) / items.length;
};

/**
 * Count aggregator function
 * @param {Array} items - Array of items
 * @returns {Number} Count of items
 */
export const count = (items) => {
  return items.length;
};

/**
 * Max aggregator function
 * @param {Array} items - Array of items
 * @param {String} field - Field to find max
 * @returns {Number} Maximum value
 */
export const max = (items, field) => {
  if (items.length === 0) return 0;
  return Math.max(...items.map(item => Number(item[field]) || 0));
};

/**
 * Min aggregator function
 * @param {Array} items - Array of items
 * @param {String} field - Field to find min
 * @returns {Number} Minimum value
 */
export const min = (items, field) => {
  if (items.length === 0) return 0;
  return Math.min(...items.map(item => Number(item[field]) || 0));
};
