// apollo server
import { ApolloServer } from "apollo-server-express";
import { PrismaClient } from "@prisma/client";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";
import resolvers from "./graphql/resolvers/index.js";
import authDirectiveTransformer from "./graphql/authDirective.js";

// express server
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getUser } from "./middleware/getUser.js";

dotenv.config();

const CLIENT_URL = "https://data-quest-client.replit.app";
const SERVER_URL =
  process.env.SERVER_URL || "https://data-quest-server.replit.app";

const STUDIO_URL = "https://studio.apollographql.com";
const PORT = process.env.PORT || 4000;

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOptions = {
  origin: [CLIENT_URL, STUDIO_URL],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "Set-Cookie",
    "Accept",
    "X-Requested-With",
    "Cache-Control",
    "User-Agent",
    "X-CSRF-Token",
    "X-Frame-Options",
  ],
};

async function startServer() {
  // Load and merge GraphQL type definitions
  const typesArray = loadFilesSync(
    [path.join(__dirname, "./graphql/types/users.graphql")],
    { loaders: [new GraphQLFileLoader()] },
  );
  const typeDefs = mergeTypeDefs(typesArray);

  // Create executable schema
  let schema = makeExecutableSchema({ typeDefs, resolvers });

  // Apply the auth directive transformer
  schema = authDirectiveTransformer(schema, "auth");

  // Initialize Apollo Server
  const server = new ApolloServer({
    schema,
    context: ({ req }) => ({
      prisma,
      userId: req.user?.id,
      role: req.user?.role,
    }),
    introspection: true,
    playground: true,
    plugins: [
      {
        requestDidStart(requestContext) {
          // console.log(
          //   "Request started! Query:\n" + requestContext.request.query,
          // );
          // if (requestContext.request.variables) {
          //   console.log(
          //     "Variables:\n" +
          //       JSON.stringify(requestContext.request.variables, null, 2),
          //   );
          // }

          return {
            didResolveOperation(context) {
              console.log(`Resolved operation for ${context.operationName}`);
            },
            // willSendResponse(context) {
            //   console.log(
            //     "Response sent for operation " + context.operationName,
            //   );
            //   console.log(
            //     "Response data:\n" +
            //       JSON.stringify(context.response.data, null, 2),
            //   );
            // },
            didEncounterErrors(context) {
              console.error(
                "An error occurred during the request:",
                context.errors,
              );
            },
          };
        },
      },
    ],
  });

  const app = express();

  // Middleware
  app.use(cors(corsOptions)); // CORS middleware should be before others that use credentials
  app.use(express.json()); // Parses JSON payloads
  app.use(express.urlencoded({ extended: true })); // Parses URL-encoded payloads
  app.use(cookieParser()); // Parses cookies

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Apply authentication middleware to GraphQL route
  app.use("/graphql", getUser);

  // Start the Apollo server
  server.start().then((res) => {
    server.applyMiddleware({ app, path: "/graphql", cors: false });

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server running at ${SERVER_URL}`);
      console.log(`GraphQL endpoint: ${SERVER_URL}/graphql`);
    });
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
