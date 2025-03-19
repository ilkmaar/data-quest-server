# Isles of Ilkmaar Data Quest Server

A GraphQL server and analytics platform for querying and analyzing game data from Isles of Ilkmaar. This server provides both real-time data access through GraphQL APIs and generates detailed analytics reports for game insights.

## Features

- **GraphQL API**: Access game data through a flexible GraphQL interface
- **Data Analytics**: Generate comprehensive game analytics reports
- **Authentication**: Secure endpoint access with JWT authentication
- **Prisma ORM**: Robust database interactions using Prisma
- **Express Server**: Built on Express.js with Apollo Server integration

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- PostgreSQL database (via Supabase)
- Environment variables configured (see `.env.example`)

## Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd data-quest-server
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/data_quest?schema=public"
   JWT_SECRET="your-jwt-secret"
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

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `PORT`: Server port (default: 4000)
- `CLIENT_APP_URL`: Client application URL
- `SERVER_URL`: Server URL
- `DATABASE_URL`: PostgreSQL database connection string
- Additional authentication and service-specific variables

## Project Structure

- `/graphql`: GraphQL schema definitions and resolvers
  - `/queries`: GraphQL query definitions
  - `/resolvers`: Query resolvers
  - `/types`: GraphQL type definitions
- `/middleware`: Express middleware
- `/prisma`: Prisma schema and migrations
- `/scripts`: Analytics and report generation scripts
- `/context`: GraphQL context and shared utilities
- `/express`: Express route handlers
- `/db`: Database utilities and helpers
- `index.js`: Main application entry point

## API Documentation

The GraphQL API provides access to game data including:

- Player statistics
- Game sessions
- In-game events
- Player progression
- Resource management

Access the GraphQL Playground at `http://localhost:4000/graphql` when running locally.

## Analytics Reports

Generate game analytics reports using:

```bash
npm run generate-report
```

Reports include:

- Player engagement metrics
- Game progression analysis
- Resource utilization statistics
- Player behavior patterns

## Development

The server is built with:

- Express.js for the web server
- Apollo Server for GraphQL implementation
- Prisma for database operations
- JWT for authentication
- CORS enabled for specified origins

## Security

- JWT-based authentication
- CORS configuration for allowed origins
- Cookie-based session management
- Secure headers implementation

## License

ISC License

## Support

For support, please [create an issue](repository-issues-url) or contact the development team.
