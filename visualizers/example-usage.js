/**
 * Example usage of the visualization system
 */

import { generateVisualization } from './index.js';
import { mockGraphQLClient } from './mock-data.js';
import fs from 'fs';
import path from 'path';

/**
 * Generate visualizations to explore game analytics
 * This demonstrates usage of the visualization system with example questions
 */
async function generateExampleVisualizations() {
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Common parameters for all visualizations
  const commonParams = {
    graphqlClient: mockGraphQLClient,
    parameters: {
      worldId: 'world_example',
      startDate: '2025-03-01T00:00:00Z',
      endDate: '2025-03-31T23:59:59Z'
    }
  };
  
  // Generate multiple visualizations for different research questions
  const visualizations = [
    {
      question: 'How much time did players spend on each game area?',
      outputPath: './reports/area-time-analysis.html'
    },
    {
      question: 'What are the most common activity types performed by players?',
      outputPath: './reports/activity-distribution.html'
    },
    {
      question: 'Which players are most engaged based on session frequency?',
      outputPath: './reports/player-engagement.html'
    }
  ];
  
  // Generate visualizations sequentially 
  const results = [];
  for (const viz of visualizations) {
    try {
      console.log(`Generating visualization for: "${viz.question}"`);
      const result = await generateVisualization({
        ...commonParams,
        question: viz.question,
        outputPath: viz.outputPath
      });
      
      results.push(result);
      console.log(`✓ Visualization saved to: ${result.outputPath}`);
    } catch (error) {
      console.error(`Error generating visualization for "${viz.question}":`, error.message);
    }
  }
  
  return results;
}

// Run the examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateExampleVisualizations()
    .then(() => console.log('All example visualizations completed'))
    .catch(err => console.error('Error generating examples:', err));
}

export { generateExampleVisualizations };