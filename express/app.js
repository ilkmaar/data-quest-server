import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { APP_URL } from "../config.js";
import { getUser } from "../middleware/getUser.js";
import { authRoutes } from "./auth.js";

export const startExpressApp = (server) => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: [APP_URL, "https://studio.apollographql.com"],
      credentials: true,
    }),
  );

  authRoutes(app);

  // Apply the authentication middleware only to the GraphQL route
  app.use("/graphql", getUser);

  // Apply Apollo middleware
  server.applyMiddleware({ app, path: "/graphql", cors: false });

  return app;
};
