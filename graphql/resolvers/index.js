import { mergeResolvers } from "@graphql-tools/merge";
import userResolvers from "./userResolvers.js";

const resolvers = mergeResolvers([
  userResolvers
]);

export default resolvers;