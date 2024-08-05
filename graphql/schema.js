import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loadTypeDefs = () => {
  const typesArray = loadFilesSync(
    [
      path.join(__dirname, './types/basic/*.graphql'),
      path.join(__dirname, './types/computed/*.graphql'),
      path.join(__dirname, './types/*.graphql'),
      path.join(__dirname, './queries/*.graphql'),
    ],
    { loaders: [new GraphQLFileLoader()] }
  );
  return mergeTypeDefs(typesArray);
};