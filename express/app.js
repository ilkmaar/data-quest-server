import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { CLIENT_APP_URL } from "../config.js";
import { getUser } from "../middleware/getUser.js";
import { authRoutes } from "./auth.js";

export const startExpressApp = (server) => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const corsOptions = {
    origin: [CLIENT_APP_URL, "https://studio.apollographql.com"],
    credentials: true,
  };
  app.use(cors(corsOptions));

  authRoutes(app);

  app.use("/graphql", getUser);
  server.applyMiddleware({ app, path: "/graphql", cors: false });

  return app;
};
