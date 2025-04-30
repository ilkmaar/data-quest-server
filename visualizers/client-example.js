/**
 * Example usage of the visualization system
 * 
 * This demonstrates how to:
 * 1. Setup GraphQL client connection
 * 2. Create a simple LLM client function
 * 3. Generate visualizations for research questions
 */

import { generateVisualization } from './index.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Example demo function
async function generateResearchVisualization() {
  try {
    // GraphQL endpoint
    const GRAPHQL_ENDPOINT = process.env.GRAPHQL_API_URL || 'http://localhost:4000/graphql';
    
    // Simple mock LLM client for demo purposes
    // In production, this would connect to OpenAI, Anthropic, or other LLM provider
    const mockLlmClient = async (prompt) => {
      console.log('Prompt sent to LLM:', prompt);
      
      // Simple keyword-based response generation
      // In production, this would be a real LLM API call
      if (prompt.includes('visualization type')) {
        if (prompt.toLowerCase().includes('time') || prompt.toLowerCase().includes('spend')) {
          return JSON.stringify({
            visualizationType: "bar chart",
            justification: "Bar charts are ideal for comparing quantities across categories like game areas",
            dataRequirements: ["area name", "time value"],
            suggestedTitle: "Time Spent by Game Area",
            suggestedDescription: "Analysis of how much time players spent in different game areas"
          });
        } else {
          return JSON.stringify({
            visualizationType: "line chart",
            justification: "Line charts show trends over time",
            dataRequirements: ["timestamp", "metric value"],
            suggestedTitle: "Activity Trends",
            suggestedDescription: "Trends in player activity over time"
          });
        }
      }
      
      // Mock response for query generation requests
      if (prompt.includes('GraphQL query')) {
        if (prompt.toLowerCase().includes('time') || prompt.toLowerCase().includes('area')) {
          return `
          query GetAreaTimeAnalysis($worldId: String!, $startDate: String, $endDate: String) {
            playerSessionAnalytics(
              worldId: $worldId
              startDate: $startDate
              endDate: $endDate
            ) {
              totalPlayers
              totalSessions
              averageSessionLength
              playerSessions {
                playerName
                sessions {
                  duration
                  areas
                }
              }
            }
          }`;
        } else {
          return `
          query GetActivityTimeline($worldId: String!, $startDate: String, $endDate: String) {
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
            }
          }`;
        }
      }
      
      return "I couldn't generate a specific response for this prompt.";
    };
    
    // Generate area time visualization
    const areaTimeResult = await generateVisualization({
      question: "How much time did players spend on each game area?",
      graphqlClient: GRAPHQL_ENDPOINT,
      llmClient: mockLlmClient,
      parameters: {
        worldId: "demo-world-123",
        startDate: "2023-01-01T00:00:00Z",
        endDate: "2023-01-31T23:59:59Z"
      },
      outputPath: "./reports/area-time-analysis.html"
    });
    
    console.log(`Area time visualization saved to: ${areaTimeResult.outputPath}`);
    
    // Generate activity timeline visualization
    const activityResult = await generateVisualization({
      question: "When are players most active during the day?",
      graphqlClient: GRAPHQL_ENDPOINT,
      llmClient: mockLlmClient,
      parameters: {
        worldId: "demo-world-123",
        startDate: "2023-01-01T00:00:00Z",
        endDate: "2023-01-31T23:59:59Z"
      },
      outputPath: "./reports/player-activity-analysis.html"
    });
    
    console.log(`Activity pattern visualization saved to: ${activityResult.outputPath}`);
    
    return {
      areaTimeResult,
      activityResult
    };
  } catch (error) {
    console.error('Error generating visualizations:', error);
    throw error;
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateResearchVisualization()
    .then(() => console.log('Demo completed successfully'))
    .catch(err => console.error('Demo failed:', err));
}

export { generateResearchVisualization };