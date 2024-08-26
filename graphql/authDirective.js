import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";
import { defaultFieldResolver } from "graphql";

function authDirectiveTransformer(schema, directiveName) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(
        schema,
        fieldConfig,
        directiveName,
      )?.[0];
      if (authDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        const { role } = authDirective;

        fieldConfig.resolve = async function (source, args, context, info) {
          const { userId, prisma } = context;

          if (!userId) {
            throw new Error("You must be logged in to access this resource.");
          }

          const user_roles = await prisma.user_roles
            .findMany({
              where: { user_id: userId },
              include: {
                roles: true,
              },
            })
            .then((roles) => {
              return roles.map((role) => role.roles.name);
            });

          if (!user_roles.includes(role)) {
            throw new Error("You are not authorized to access this resource.");
          }

          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
}

export default authDirectiveTransformer;
