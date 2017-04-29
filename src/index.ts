import {
  Source,
  Kind,
  parse,
  visit,
  print,
  DocumentNode,
} from 'graphql/language';

import { GraphQLError } from 'graphql/error/GraphQLError';

import { getOperationAST } from 'graphql/utilities/getOperationAST';
import { concatAST } from 'graphql/utilities/concatAST';
import { buildASTSchema } from 'graphql/utilities/buildASTSchema';

import {
  getArgumentValues,
} from 'graphql/execution/values';

import get from 'lodash/get.js';
import set from 'lodash/set.js';
import isEqual from 'lodash/isEqual.js';

import {
  transformations,
  transformationToType
} from './transformations';

import { lodashIDL } from './lodash_idl';

export function graphqlLodash(query:string|DocumentNode, operationName?:string) {
  const pathToArgs = {};
  const queryAST = typeof query === 'string' ? parse(query) : query;
  traverseOperationFields(queryAST, operationName, (node, resultPath) => {
    var args = getLodashDirectiveArgs(node);
    if (args === null)
      return;

    // TODO: error if transformation applied on field that already
    // seen without any transformation
    const argsSetPath = [...resultPath, '@_'];
    const previousArgsValue = get(pathToArgs, argsSetPath, null);
    if (previousArgsValue !== null && !isEqual(previousArgsValue, args))
      throw Error(`Different "@_" args for the "${resultPath.join('.')}" path`);
    set(pathToArgs, argsSetPath, args);
  });

  const stripedQuery = stripQuery(queryAST);
  return {
    query: typeof query === 'string' ? print(stripedQuery) : stripedQuery,
    transform: data => applyLodashDirective(pathToArgs, data)
  };
}

function getLodashDirectiveArgs(fieldNode) {
  let lodashNode = null;

  for (let directive of fieldNode.directives) {
    if (directive.name.value !== lodashDirectiveDef.name)
      continue;
    if (lodashNode)
      throw Error(`Duplicating "@_" on the "${fieldNode.name.value}"`);
    lodashNode = directive;
  }

  if (lodashNode === null)
    return null;


  const args = getArgumentValues(lodashDirectiveDef, lodashNode);
  //Restore order of arguments
  const argsNames = lodashNode.arguments.map(node => node.name.value);
  const orderedArgs = {};
  for (const name of argsNames) {
    if (lodashDirectiveArgTypes[name].name === 'DummyArgument')
      orderedArgs[name] = undefined;
    else
      orderedArgs[name] = args[name];
  }

  return orderedArgs;
}

function applyLodashDirective(pathToArgs, data) {
  if (data === null)
    return null;

  const changedData = applyOnPath(data, pathToArgs, (path, object, lodashArgs) => {
    for (const op in lodashArgs) {
      const arg = lodashArgs[op];
      const type = transformationToType[op];
      const actualType = object.constructor.name;
      if (type !== actualType) {
        const pathStr = path.join('.');
        throw Error(
          `${pathStr}: "${op}" transformation expect "${type}" but got "${actualType}"`
        );
      }
      object = transformations[type][op](object, arg);
    }
    return object;
  });
  return changedData;
}

function applyOnPath(result, pathToArgs, cb) {
  const currentPath = [];
  return traverse(result, pathToArgs);

  function traverse(root, pathRoot) {
    if (root === null || root === undefined)
      return null;
    if (Array.isArray(root))
      return root.map(item => traverse(item, pathRoot));

    const changedObject = Object.assign(root);
    for (const key in pathRoot) {
      if (key === '@_')
        continue;
      currentPath.push(key);

      let changedValue = traverse(root[key], pathRoot[key]);
      if (changedValue === null || changedValue === undefined)
        continue;

      const lodashArgs = pathRoot[key]['@_'];
      if (lodashArgs)
        changedValue = cb(currentPath, changedValue, lodashArgs);
      changedObject[key] = changedValue;
      currentPath.pop();
    }
    return changedObject;
  }
}

function stripQuery(queryAST):DocumentNode {
  return visit(queryAST, {
    [Kind.DIRECTIVE]: (node) => {
      if (node.name.value === '_')
        return null;
    },
  });
}

export const lodashDirectiveAST:DocumentNode = parse(new Source(lodashIDL, 'lodashIDL'));
const lodashDirectiveDef = getDirectivesFromAST(lodashDirectiveAST)[0];
const lodashDirectiveArgTypes = lodashDirectiveDef.args.reduce((obj, arg) => {
  obj[arg.name] = arg.type;
  return obj;
}, {});

function getDirectivesFromAST(ast) {
  const dummyIDL = `
    type Query {
      dummy: String
    }
  `;
  const fullAST = concatAST([ast, parse(dummyIDL)]);
  const schema = buildASTSchema(fullAST);

  schema.getTypeMap()['Path'].parseLiteral = (x => x.value);
  schema.getTypeMap()['JSON'].parseLiteral = astToJSON;

  return schema.getDirectives();
}

// TODO: copy-pasted from JSON Faker move to graphql-js or separate lib
function astToJSON(ast) {
  switch (ast.kind) {
    case Kind.NULL:
      return null;
    case Kind.INT:
      return parseInt(ast.value, 10);
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.LIST:
      return ast.values.map(astToJSON);
    case Kind.OBJECT:
      return ast.fields.reduce((object, {name, value}) => {
        object[name.value] = astToJSON(value);
        return object;
      }, {});
  }
}

function traverseOperationFields(queryAST, operationName, cb) {
  const fragments = {};
  const operationAST = getOperationAST(queryAST, operationName);
  if (!operationAST) {
    throw new GraphQLError(
      'Must provide operation name if query contains multiple operations.'
    );
  }

  queryAST.definitions.forEach(definition => {
    if (definition.kind === Kind.FRAGMENT_DEFINITION)
      fragments[definition.name.value] = definition;
  });

  const resultPath = [];
  traverse(operationAST);

  function traverse(root) {
    visit(root, {
      enter(node) {
        if (node.kind === Kind.FIELD)
          resultPath.push((node.alias || node.name).value);

        if (node.kind === Kind.FRAGMENT_SPREAD) {
          const fragmentName = node.name.value;
          const fragment = fragments[fragmentName];
          if (!fragment)
            throw Error(`Unknown fragment: ${fragmentName}`);
          traverse(fragment);
        }
      },
      leave(node) {
        if (node.kind !== Kind.FIELD)
          return;
        cb(node, resultPath);
        resultPath.pop();
      }
    });
  }
}
