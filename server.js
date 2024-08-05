import { startApolloServer } from './graphql/server.js';
import { startExpressApp } from './express/app.js';
import { PORT } from './config.js';

export const startServer = async () => {
  try {
    const server = await startApolloServer();
    const app = startExpressApp(server);

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}${server.graphqlPath}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};