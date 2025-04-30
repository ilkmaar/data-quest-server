/**
 * Prompt templates for guiding LLM visualization generation
 */

/**
 * Template for visualization type selection
 * @param {String} question - Research question to answer
 * @returns {String} Formatted prompt
 */
export const visualizationTypePrompt = (question) => {
  return `Given this research question about game analytics: "${question}"

Please determine the most appropriate visualization type to answer this question effectively.

Consider the following options:
1. Bar chart - For comparing quantities across categories
2. Line chart - For showing trends over time
3. Heatmap - For showing relationships between two categorical variables and a numeric value
4. Timeline - For visualizing temporal events and their sequence

Provide your recommendation in JSON format with the following structure:
{
  "visualizationType": "the recommended type",
  "justification": "brief explanation of why this visualization is best",
  "dataRequirements": [
    "list of data fields needed for this visualization"
  ],
  "suggestedTitle": "A clear title for the visualization",
  "suggestedDescription": "A brief description of what this visualization will show"
}`;
};

/**
 * Template for GraphQL query generation
 * @param {String} question - Research question to answer
 * @param {Object} visualizationSpec - Visualization specification
 * @returns {String} Formatted prompt
 */
export const graphqlQueryPrompt = (question, visualizationSpec) => {
  return `You need to generate a GraphQL query to fetch data for a visualization that answers this research question: "${question}"

The visualization type selected is: ${visualizationSpec.visualizationType}

The data requirements are: ${visualizationSpec.dataRequirements.join(', ')}

Based on the schema, here are the available GraphQL endpoints:

1. playerSessionAnalytics(worldId, startDate, endDate)
   This provides session-based metrics including:
   - totalPlayers, totalSessions, averageSessionLength
   - sessionLengthDistribution, sessionsByDay, sessionsByHour
   - playerSessions with details on individual sessions
   - activityTypeBreakdown and playerActivityPreferences

2. playerActivityTimeline(worldId, startDate, endDate, sessionIntervalMinutes)
   This provides time-interval based metrics including:
   - activityPeriods showing player activity in specific time windows
   - playerSummaries with activity patterns
   - playerCopresence showing players active at the same times

Generate a complete GraphQL query that will fetch the necessary data for the visualization. Return ONLY the GraphQL query with no explanation.`;
};

/**
 * Template for data transformation guidance
 * @param {Object} queryResult - GraphQL query result
 * @param {Object} visualizationSpec - Visualization specification
 * @returns {String} Formatted prompt
 */
export const dataTransformPrompt = (queryResult, visualizationSpec) => {
  return `You have received this data from a GraphQL query to answer the research question: "${visualizationSpec.question}"

The data structure is:
${JSON.stringify(queryResult, null, 2)}

You need to transform this data for a ${visualizationSpec.visualizationType} visualization.

Provide a JavaScript transformation recipe in this format:
{
  "transformationSteps": [
    "Detailed step-by-step instructions for transforming the data"
  ],
  "expectedDataStructure": {
    "An example of the expected data structure after transformation"
  },
  "visualizationParameters": {
    "required parameters for the visualization function"
  }
}`;
};

/**
 * Template for visualization code generation
 * @param {Object} transformedData - Data prepared for visualization
 * @param {Object} visualizationSpec - Visualization specification
 * @returns {String} Formatted prompt
 */
export const visualizationCodePrompt = (transformedData, visualizationSpec) => {
  return `Generate JavaScript code using D3.js to create a ${visualizationSpec.visualizationType} visualization for this data:

\`\`\`json
${JSON.stringify(transformedData, null, 2)}
\`\`\`

The visualization should effectively answer the question: "${visualizationSpec.question}"

Title: ${visualizationSpec.suggestedTitle}
Description: ${visualizationSpec.suggestedDescription}

Please provide complete, functioning code using modern ES6+ JavaScript. Include proper axis labels, legends, and tooltips for the best user experience.`;
};
