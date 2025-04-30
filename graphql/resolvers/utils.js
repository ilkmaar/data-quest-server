import {
  AuthenticationError,
  UserInputError,
  ApolloError,
} from "apollo-server-express";

export const handleErrors = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Error:", error);
      throw new ApolloError("An error occurred while processing the request.");
    }
  };
};

export const ensureAuthenticated = (fn) => {
  return async (_, args, context, info) => {
    if (!context.userId) {
      throw new AuthenticationError("You must be logged in.");
    }
    return fn(_, args, context, info);
  };
};
