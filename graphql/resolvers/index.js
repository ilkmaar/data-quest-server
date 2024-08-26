import { mergeResolvers } from "@graphql-tools/merge";
import userResolvers from "./userResolvers.js";
import adminResolvers from "./adminResolvers.js";

const resolvers = mergeResolvers([userResolvers, adminResolvers]);

export default resolvers;
