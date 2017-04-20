import {
  Source,
  Kind,
  parse,
  GraphQLError,
  visit,
  getOperationAST,
  print,
  concatAST,
  buildASTSchema,
} from 'graphql';

import {
  getArgumentValues,
} from 'graphql/execution/values';

import * as _ from 'lodash';

export function graphqlLodash(query, operationName?) {
  const pathToArgs = {};
  const queryAST = typeof query === 'string' ? parse(query) : query;
  traverseOperationFields(queryAST, operationName, (node, resultPath) => {
    var args = getLodashDirectiveArgs(node);
    if (args === null)
      return;

    // TODO: error if transformation applied on field that already
    // seen without any transformation
    const argsSetPath = [...resultPath, '@_'];
    const previousArgsValue = _.get(pathToArgs, argsSetPath, null);
    if (previousArgsValue !== null && !_.isEqual(previousArgsValue, args))
      throw Error(`Different "@_" args for the "${resultPath.join('.')}" path`);
    _.set(pathToArgs, argsSetPath, args);
  });

  return {
    query: print(stripQuery(queryAST)),
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
  for (const name of argsNames)
    orderedArgs[name] = args[name];
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

function stripQuery(queryAST) {
  return visit(queryAST, {
    [Kind.DIRECTIVE]: (node) => {
      if (node.name.value === '_')
        return null;
    },
  });
}

const lodashIDL = `
 scalar Path
 scalar JSON

 enum DummyArgument {
   _
 }

directive @_(
  map: Path
  keyBy: Path

  # Creates an array of elements split into groups the length of size.
  # If array can't be split evenly, the final chunk will be the remaining elements.
  chunk: Int

  # Creates a slice of array with n elements dropped from the beginning.
  drop: Int

  # Creates a slice of array with n elements dropped from the end.
  dropRight: Int

  # Creates a slice of array with n elements taken from the beginning.
  take: Int

  # Creates a slice of array with n elements taken from the end.
  takeRight: Int

  # Recursively flatten array up to depth times.
  flatten: Int

  # The inverse of \`toPairs\`; this method returns an object composed from key-value
  # pairs.
  fromPairs: DummyArgument

  # Gets the element at index n of array. If n is negative, the nth element from
  # the end is returned.
  nth: Int

  # Reverses array so that the first element becomes the last, the second element
  # becomes the second to last, and so on.
  reverse: DummyArgument

  # Creates a duplicate-free version of an array, in which only the first occurrence
  # of each element is kept. The order of result values is determined by the order
  # they occur in the array.
  uniq: DummyArgument

  uniqBy: Path

  countBy: Path
  filter: JSON
  reject: JSON
  groupBy: Path
  sortBy: [Path!]

  minBy: Path
  maxBy: Path
  meanBy: Path
  sumBy: Path

  # Converts all elements in array into a string separated by separator.
  join: String

  get: Path
  mapValues: Path

  # Creates an array of values corresponding to paths of object.
  at: [Path!]
  # Creates an array of own enumerable string keyed-value pairs for object.
  toPairs: DummyArgument

  # Creates an object composed of the inverted keys and values of object.
  # If object contains duplicate values, subsequent values overwrite property
  # assignments of previous values.
  invert: DummyArgument

  invertBy: Path
  # Creates an array of the own enumerable property names of object.
  keys: DummyArgument
  # Creates an array of the own enumerable string keyed property values of object.
  values: DummyArgument
) on FIELD
`;

const transformations = {
  Array: {
    map: (array, path) => _.map(array, path),
    keyBy: (array, path) => _.keyBy(array, path),
    join: (array, sep) => _.join(array, sep),
  },
  Object: {
    get: (object, path) => _.get(object, path),
    mapValues: (object, path) => _.mapValues(object, path),
  }
};

const transformationToType = {};
for (const type in transformations) {
  for (const name in transformations[type]) {
    transformationToType[name] = type;
  }
}

export const lodashDirectiveAST = parse(new Source(lodashIDL, 'lodashIDL'));
const lodashDirectiveDef = getDirectivesFromAST(lodashDirectiveAST)[0];

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
