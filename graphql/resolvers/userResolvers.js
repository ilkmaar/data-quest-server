import { AuthenticationError } from "apollo-server-express";

const resolvers = {
  Query: {
    currentUser: async (_, __, { prisma, userId }) => {
      if (!userId) {
        throw new AuthenticationError("You must be logged in.");
      }
      const user = await prisma.users.findUnique({ where: { id: userId } });
      return {
        id: user.id,
        email: user.email,
      };
    },
    users: async (_, __, { prisma }) => {
      const users = await prisma.users.findMany();
      const filteredUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        name: user.raw_user_meta_data.name,
        avatar_url: user.raw_user_meta_data.avatar_url,
      }));
      return filteredUsers;
    },
    worlds: async (_, __, { prisma }) => {
      return prisma.worlds.findMany();
    },
    availableWorlds: async (_, { userId }, { prisma }) => {
      const userWorlds = await prisma.user_world_access.findMany({
        where: { user_id: userId },
        select: { world_id: true },
      });
      const userWorldIds = userWorlds.map((uw) => uw.world_id);
      return prisma.worlds.findMany({
        where: {
          id: { notIn: userWorldIds },
        },
      });
    },
    playerProfile: async (_, __, { prisma, userId }) => {
      console.log("playerProfile: ", userId);
      if (!userId) {
        throw new AuthenticationError("You must be logged in.");
      }
      return prisma.players.findFirst({ where: { user_id: userId } });
    },
  },
  Mutation: {
    addUserToWorld: async (_, { userId, worldId }, { prisma }) => {
      return prisma.user_world_access.create({
        data: {
          user_id: userId,
          world_id: worldId,
        },
        include: {
          users: true,
          worlds: true,
        },
      });
    },
    removeUserFromWorld: async (_, { userId, worldId }, { prisma }) => {
      await prisma.user_world_access.delete({
        where: {
          user_id_world_id: {
            user_id: userId,
            world_id: worldId,
          },
        },
      });
      return true;
    },
    updateUserRole: async (_, { userId, roleId }, { prisma }) => {
      return prisma.user_roles.upsert({
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
          user: true,
          role: true,
        },
      });
    },
  },
  User: {
    roles: (parent, _, { prisma }) =>
      prisma.roles.findMany({
        where: { user_roles: { some: { user_id: parent.id } } },
      }),
    worlds: (parent, _, { prisma }) =>
      prisma.worlds.findMany({
        where: { user_world_access: { some: { user_id: parent.id } } },
      }),
    players: (parent, _, { prisma }) =>
      prisma.players.findMany({
        where: { user_id: parent.id },
      }),
  },
  World: {
    users: (parent, _, { prisma }) =>
      prisma.users.findMany({
        where: { user_world_access: { some: { world_id: parent.id } } },
      }),
  },
  Player: {
    world: (parent, _, { prisma }) =>
      prisma.worlds.findUnique({ where: { id: parent.world_id } }),
    user: (parent, _, { prisma }) =>
      prisma.users.findUnique({ where: { id: parent.user_id } }),
  },
  PlayerProfile: {
    world: (parent, _, { prisma }) =>
      prisma.worlds.findUnique({ where: { id: parent.world_id } }),
  },
};

export default resolvers;