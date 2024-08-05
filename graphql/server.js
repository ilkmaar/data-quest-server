import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadTypeDefs } from './schema.js';
import resolvers from './resolvers/index.js';
import { context } from './context.js';

export const startApolloServer = async () => {
  const typeDefs = loadTypeDefs();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const server = new ApolloServer({
    schema,
    introspection: true,
    playground: true,
    context,
  });
  await server.start();
  return server;
};