# Data Quest Visualizers

A modular system for generating research-driven visualizations from game analytics data.

## Overview

This visualization system allows researchers to:

1. Ask questions about player behavior or game activity in natural language
2. Automatically generate appropriate visualizations to answer these questions
3. Leverage existing GraphQL endpoints for data access
4. Output interactive HTML reports with D3.js visualizations

## Usage

```javascript
import { generateVisualization } from "./visualizers/index.js";

// Example: Generate a visualization to answer a research question
const visualization = await generateVisualization({
  question: "How much time did players spend on each game area?",
  graphqlClient: "http://localhost:4000/graphql", // URL or GraphQL client object
  llmClient: async (prompt) => {
    // Function that sends prompt to LLM and returns response
    // This can be any LLM integration (OpenAI, Anthropic, etc.)
    const response = await someAIClient.complete(prompt);
    return response.text;
  },
  parameters: {
    worldId: "world_prod_LEAP2",
    startDate: "2025-03-22T00:00:00Z",
    endDate: "2025-03-31T23:59:59Z",
  },
  outputPath: "./reports/area-time-analysis.html",
});

console.log(`Visualization saved to: ${visualization.outputPath}`);
```

## Features

- **Automatic Visualization Selection**: Uses LLM to select the most appropriate chart type
- **GraphQL Integration**: Generates and executes GraphQL queries to our analytics endpoints
- **Multiple Chart Types**: Bar charts, line charts, heatmaps, and timelines
- **Data Transformation**: Automatically processes raw data into visualization-ready format
- **Interactive Outputs**: HTML reports with interactive D3.js visualizations
- **Metadata**: Summary metrics and data tables alongside visualizations

## Components

- **Templates**: Reusable visualization templates with D3.js
- **Utils**: Data formatting and HTML rendering utilities
- **LLM**: Prompt templates and response processing for LLM integration

## Example Questions

- "How much time did players spend on each game area?"
- "Which data tables did players interact with while foraging?"
- "What's the distribution of activity types across all players?"
- "When are players most active during the day?"
- "Which players tend to be online at the same time?"
