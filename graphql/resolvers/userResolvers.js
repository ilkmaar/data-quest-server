import {
  AuthenticationError,
  UserInputError,
  ApolloError,
} from "apollo-server-express";

const handleErrors = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    console.error("Error:", error);
    throw new ApolloError("An error occurred while processing the request.");
  }
};

const ensureAuthenticated = (userId) => {
  if (!userId) {
    throw new AuthenticationError("You must be logged in.");
  }
};

const fetchSingleRecord = async (prismaMethod, query, errorMessage) => {
  const record = await prismaMethod(query);
  if (!record) {
    throw new UserInputError(errorMessage);
  }
  return record;
};

const resolvers = {
  Query: {
    currentUser: (_, __, { prisma, userId }) => {
      ensureAuthenticated(userId);

      return handleErrors(() =>
        prisma.users
          .findUnique({
            where: { id: userId },
            include: {
              user_roles: {
                include: {
                  roles: true,
                },
              },
            },
          })
          .then((user) => {
            if (!user) {
              throw new UserInputError("User not found.");
            }

            return {
              id: user.id,
              email: user.email,
              name: user.raw_user_meta_data?.full_name || null,
              avatar_url: user.raw_user_meta_data?.avatar_url || null,
              roles:
                user.user_roles.length > 0
                  ? user.user_roles.map((userRole) => ({
                      id: userRole.roles.id,
                      name: userRole.roles.name,
                    }))
                  : [],
            };
          }),
      );
    },

    userPlayers: (_, __, { prisma, userId }) => {
      ensureAuthenticated(userId);

      return handleErrors(() =>
        prisma.user_players
          .findMany({
            where: { user_id: userId },
            include: {
              players: {
                include: {
                  worlds: true,
                },
              },
            },
          })
          .then((userPlayers) =>
            userPlayers.length > 0
              ? userPlayers.map((userPlayer) => ({
                  id: userPlayer.player_id,
                  name: userPlayer.players.player_name,
                  world: {
                    id: userPlayer.players.worlds.world_id,
                    name: userPlayer.players.worlds.world_name,
                  },
                }))
              : [],
          ),
      );
    },
  },
};

export default resolvers;
