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

const generatePlayerId = () => {
  return Math.floor(Math.random() * 10000000);
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
    worlds: (_, __, { prisma }) => {
      return handleErrors(() =>
        prisma.worlds
          .findMany({
            include: {
              players: {
                include: {
                  user_players: {
                    include: {
                      users: true,
                    },
                  },
                },
              },
            },
          })
          .then((worlds) =>
            worlds.map((world) => ({
              id: world.world_id,
              name: world.world_name,
              players: world.players?.length
                ? world.players.map((player) => ({
                    id: player.player_id,
                    name: player.player_name,
                    user: player.user_players.length
                      ? {
                          id: player.user_players[0].users.id,
                          email: player.user_players[0].users.email,
                          name:
                            player.user_players[0].users.raw_user_meta_data
                              ?.full_name || null,
                        }
                      : null,
                  }))
                : [],
            })),
          ),
      );
    },
    users: (_, __, { prisma }) => {
      return handleErrors(() =>
        prisma.users
          .findMany({
            include: {
              user_players: {
                include: {
                  players: {
                    include: {
                      worlds: true,
                    },
                  },
                },
              },
            },
          })
          .then((users) =>
            users.map((user) => ({
              id: user.id,
              email: user.email,
              name: user.raw_user_meta_data?.full_name || null,
              avatar_url: user.raw_user_meta_data?.avatar_url || null,
              players: user.user_players.length
                ? user.user_players.map((userPlayer) => ({
                    id: userPlayer.player_id,
                    name: userPlayer.players.player_name,
                    world: {
                      id: userPlayer.players.worlds.world_id,
                      name: userPlayer.players.worlds.world_name,
                    },
                  }))
                : [],
            })),
          ),
      );
    },
  },
  Mutation: {
    inviteUserToWorld: (_, { userId, worldId }, { prisma }) => {
      return handleErrors(() =>
        prisma.user_world_access.create({
          data: {
            user_id: userId,
            world_id: worldId,
          },
          include: {
            users: true,
            worlds: true,
          },
        }),
      );
    },
    createPlayer: (_, { playerName, worldId }, { prisma }) => {
      return handleErrors(() => {
        const playerId = generatePlayerId();

        return prisma.players.create({
          data: {
            player_id: playerId,
            player_name: playerName,
            world_id: worldId,
          },
          include: {
            worlds: true,
          },
        });
      });
    },
    linkPlayerWithUser: (_, { playerId, userId }, { prisma }) => {
      return handleErrors(() =>
        prisma.user_players.create({
          data: {
            player_id: playerId,
            user_id: userId,
          },
          include: {
            players: true,
            users: true,
          },
        }),
      );
    },
    removeUserFromWorld: (_, { userId, worldId }, { prisma }) => {
      return handleErrors(() =>
        prisma.user_world_access
          .delete({
            where: {
              user_id_world_id: {
                user_id: userId,
                world_id: worldId,
              },
            },
          })
          .then(() => true),
      );
    },
    updateUserRole: (_, { userId, roleId }, { prisma }) => {
      return handleErrors(() =>
        prisma.user_roles.upsert({
          where: {
            user_id_role_id: {
              user_id: userId,
              role_id: roleId,
            },
          },
          update: {},
          create: {
            user_id: userId,
            role_id: roleId,
          },
          include: {
            users: true,
            roles: true,
          },
        }),
      );
    },
  },
};

export default resolvers;
