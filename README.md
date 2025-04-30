# Data Quest Server

A GraphQL server for educational game data analysis and visualization, developed as part of an NSF-funded project. This server connects to a Supabase database containing game log data from a multiplayer educational game, and provides interfaces for data science learning through game-based activities.

## Overview

The Data Quest Server serves as a bridge between educational game data stored in a Supabase database and client applications that need to analyze and visualize this data. It offers a robust GraphQL API that enables researchers, educators, and students to:

1. Query real-time and historical game data
2. Access comprehensive player analytics
3. Generate interactive data visualizations
4. Analyze player progression and engagement patterns

This server enables data-driven decision making and supports educational research by providing a structured interface to complex game data, making it accessible and actionable.

## Features

- **GraphQL API**: Strongly-typed, flexible API for all game data access
- **Real-time Game State**: Query current game world state, player positions, progression
- **Player Analytics**: 
  - Session tracking and analysis
  - Engagement metrics
  - Activity timelines and patterns
  - Co-presence and collaboration metrics
- **Data Visualization**: 
  - Pre-built visualization templates (bar charts, line charts, heatmaps, timelines)
  - Automatic data transformation and formatting
  - Interactive HTML reports
- **Authentication**: Secure endpoint access with JWT authentication via Supabase
- **Extensible Architecture**: Easy addition of new data sources and analytics

## Prerequisites

- Node.js (v18 or higher)
- npm
- Supabase account with appropriate database setup
- Environment variables configured (see below)

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/concord/data-quest-server.git
   cd data-quest-server
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with:

   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres?schema=public"
   SUPABASE_URL="https://your-supabase-project.supabase.co"
   SUPABASE_SERVICE_KEY="your-service-key"
   CLIENT_APP_URL="https://your-client-app.com"
   SERVER_URL="http://localhost:4000"
   PORT=4000
   ```

4. Generate Prisma client:

   ```
   npx prisma generate
   ```

5. Start the server:
   ```
   npm run dev
   ```

## Project Structure

- `/graphql`: GraphQL schema, resolvers, and types
  - `/queries`: GraphQL query definitions
  - `/resolvers`: Domain-specific query resolvers
  - `/types`: GraphQL type definitions
- `/express`: Server configuration and middleware
- `/prisma`: Database schema and migrations
- `/scripts`: Analytics and report generation scripts
- `/db`: Database connection and utilities
- `/middleware`: Express middleware components
- `/visualizers`: Data visualization components and utilities

## Data Model

The server connects to a Supabase database with a comprehensive schema capturing various aspects of educational gameplay. Key data tables include:

- **players**: Information about players in the game world
- **player_location_records**: Historical record of player movements
- **foraging_actions**: Player foraging activities
- **giving_actions**: Item-giving interactions between players and creatures
- **crafting_actions**: Item creation activities
- **data_actions**: Player interactions with data-related features (tables, graphs, etc.)
- **creatures**: Non-player characters in the game world
- **creature_interaction_events**: Interactions between players and creatures

## GraphQL API

The server provides access to:

- **Current game state**: Player and creature locations, plot health, world status
- **Player progression**: Foraging, item giving, crafting progress over time
- **Player analytics**: Session data, engagement metrics, activity timelines
- **Social dynamics**: Co-presence data, player interactions
- **Visualization endpoints**: Data processing for educational visualizations

### Example Queries

#### Player Session Analytics

```graphql
query PlayerSessionAnalytics {
  playerSessionAnalytics(
    worldId: "world_prod_123"
    startDate: "2023-01-01T00:00:00Z"
    endDate: "2023-01-31T23:59:59Z"
  ) {
    totalPlayers
    totalSessions
    averageSessionLength
    playerSessions {
      playerId
      playerName
      totalSessions
      averageSessionLength
      sessions {
        startTime
        endTime
        duration
        areas
      }
    }
    sessionLengthDistribution {
      durationRange
      sessionCount
      percentage
    }
  }
}
```

#### Player Activity Timeline

```graphql
query PlayerActivityTimeline {
  playerActivityTimeline(
    worldId: "world_prod_123"
    startDate: "2023-01-01T00:00:00Z"
    endDate: "2023-01-31T23:59:59Z"
    sessionIntervalMinutes: 30
  ) {
    totalPlayers
    totalTimePeriods
    activityPeriods {
      startTime
      endTime
      activePlayers {
        playerId
        playerName
        eventCount
      }
    }
    playerCopresence {
      player1Name
      player2Name
      periodsTogetherCount
      copresencePercentage
    }
  }
}
```

## Data Visualization

The server includes a built-in visualization system that can generate interactive HTML reports from game data. Visualizations can be generated programmatically or through the GraphQL API.

### Visualization Types

- **Bar Charts**: Distribution of activities, player counts, resource usage
- **Line Charts**: Trends over time, progression metrics, engagement patterns
- **Heatmaps**: Co-presence data, location heatmaps, activity intensity
- **Timelines**: Player sessions, event sequences, activity flows

### Example Usage

```javascript
import { generateVisualization } from "./visualizers/index.js";

// Generate a visualization answering a research question
const visualization = await generateVisualization({
  question: "How much time did players spend in each game area?",
  parameters: {
    worldId: "world_prod_123",
    startDate: "2023-01-01T00:00:00Z",
    endDate: "2023-01-31T23:59:59Z",
  },
  outputPath: "./reports/area-time-analysis.html",
});
```

## Commands

- **Server**: `npm run dev` - Start development server
- **Prisma**:
  - `npx prisma generate` - Generate Prisma client
  - `npx prisma db pull` - Update schema from database
  - `npx prisma validate` - Validate schema
- **Analytics**: `npm run generate-report` - Generate game analytics report
- **API Query**: `npm run query-api` - Run a query against the GraphQL API

## Authentication

This server uses Supabase Authentication for secure access to the GraphQL API:

1. Client applications authenticate with Supabase to obtain a JWT token
2. The JWT token is included in the `Authorization` header when making requests
3. Server middleware validates the token and adds user information to the request context
4. GraphQL resolvers can access user information for authorization and personalization

## Development Guidelines

- Use ES Modules (`import`/`export`) - project has `"type": "module"` in package.json
- Arrow functions preferred over traditional function declarations
- Async/await for asynchronous operations
- Group imports: external libraries first, then internal modules
- Use `handleErrors` wrapper for consistent error management
- Authentication: Use `ensureAuthenticated` to verify user auth

## License

MIT License

## Acknowledgments

This material is based upon work supported by the National Science Foundation under Grant No. 2214516. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the National Science Foundation.