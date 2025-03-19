# Data Quest Server Guidelines

## Commands
- Server: `npm run dev` - Start development server
- Prisma: 
  - `npx prisma generate` - Generate Prisma client
  - `npx prisma db pull` - Update schema from database
  - `npx prisma validate` - Validate schema
- Analytics: `npm run generate-report` - Generate game analytics report

## Code Style
- Use ES Modules (`import`/`export`) - project has `"type": "module"` in package.json
- Arrow functions preferred over traditional function declarations
- Destructuring for parameters and variables 
- Async/await for asynchronous operations
- Group imports by: external libraries first, then internal modules
- Error handling: Use `handleErrors` wrapper from `utils.js` for consistent error management
- Authentication: Use `ensureAuthenticated` from `utils.js` to verify user auth

## Naming Conventions
- camelCase for variables, functions, methods
- PascalCase for types, interfaces, and classes
- File organization follows domain-driven structure in `/graphql` directory
- Resolver files named after domain area (e.g., `playerAnalyticsResolvers.js`)

## Project Structure
- `/graphql`: Schema definitions, resolvers, types
- `/prisma`: Database schema and migrations
- `/express`: Server configuration
- GraphQL resolvers should be focused by domain and kept small