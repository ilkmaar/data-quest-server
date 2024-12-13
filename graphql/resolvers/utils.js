import {
  AuthenticationError,
  UserInputError,
  ApolloError,
} from "apollo-server-express";

export const handleErrors = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    console.error("Error:", error);
    throw new ApolloError("An error occurred while processing the request.");
  }
};

export const ensureAuthenticated = (userId) => {
  if (!userId) {
    throw new AuthenticationError("You must be logged in.");
  }
};
