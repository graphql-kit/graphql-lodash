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

export function graphqlLodash(graphQLParams) {
  const pathToArgs = [];
  const queryAST = parse(graphQLParams.query);
  traverseOperation(queryAST, graphQLParams.operationName, {
    [Kind.DIRECTIVE]: (node, _0, _1, _2, _3, resultPath) => {
      if (node.name.value !== lodashDirective.name)
        return;

      const args = getArgumentValues(lodashDirective, node);
      //Restore order of arguments
      const argsNames = node.arguments.map(node => node.name.value);
      const orderedArgs = {};
      for (const name of argsNames)
        orderedArgs[name] = args[name];

      pathToArgs.push([resultPath, orderedArgs]);
    },
  });

  pathToArgs.sort(([a], [b]) => b.length - a.length);
  // TODO: detect duplicates

  return [
    print(stripQuery(queryAST)),
    result => applyLodashDirective(pathToArgs, result)
  ];
}

function applyLodashDirective(pathToArgs, result) {
  const data = result.data;
  for (const [path, operations] of pathToArgs) {
    applyOnPath(data, path, object => {
      for (const op in operations) {
        const args = operations[op];
        switch (op) {
          case 'get':
            object = _.get(object, args.path);
            break;
          case 'keyBy':
            object = (_ as any).keyBy(object, args.path);
            break;
          case 'mapValues':
            object = _.mapValues(object, args.path);
            break;
          case 'map':
            object = _.map(object, args.path);
        }
      }
      return object;
    });
  }
  return result;
}

function applyOnPath(root, path, cb) {
  traverse(root, 0);

  function traverse(root, pathIndex) {
    const key = path[pathIndex];
    const value = root[key];

    if (value === null || value === undefined)
      return;

    if (pathIndex + 1 === path.length) {
      root[key] = cb(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value)
        traverse(item, pathIndex + 1);
    }
    else
      traverse(value, pathIndex + 1);
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
input lodash__get {
  path: String!
}

input lodash__map {
  path: String!
}

input lodash__mapValues {
  path: String!
}

input lodash__keyBy {
  path: String!
}

input lodash__join {
  separator: String = ","
}

directive @_(
  get: lodash__get
  map: lodash__map
  keyBy: lodash__keyBy
  mapValues: lodash__mapValues
  join: lodash__join
) on FIELD
`;

export const lodashDirectiveAST = parse(new Source(lodashIDL, 'lodashIDL'));
const lodashDirective = getDirectivesFromAST(lodashDirectiveAST)[0];

function getDirectivesFromAST(ast) {
  const dummyIDL = `
    type Query {
      dummy: String
    }
  `;
  const fullAST = concatAST([ast, parse(dummyIDL)]);
  const schema = buildASTSchema(fullAST);
  return schema.getDirectives();
}

function traverseOperation(queryAST, operationName, visitor) {
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

  // TODO: account for field aliases
  function traverse(root) {
    visit(root, {
      enter(...args) {
        const node = args[0];

        if (node.kind === Kind.FIELD)
          resultPath.push((node.alias || node.name).value);

        const fn = getVisitFn(visitor, node.kind, /* isLeaving */ false);
        if (fn) {
          const result = fn.apply(visitor, [...args, resultPath.slice()]);
          if (result !== undefined)
            throw new GraphQLError('Can not change operation during traverse.');
        }
      },
      leave(...args) {
        const node = args[0];

        if (node.kind === Kind.FIELD)
          resultPath.pop();

        const fn = getVisitFn(visitor, node.kind, /* isLeaving */ true);
        if (fn) {
          const result = fn.apply(visitor, [...args, resultPath.slice()]);
          if (result !== undefined)
            throw new GraphQLError('Can not change operation during traverse.');
        }
      }
    });
  }
}

/**
 * Given a visitor instance, if it is leaving or not, and a node kind, return
 * the function the visitor runtime should call.
 */
function getVisitFn(visitor, kind, isLeaving) {
  const kindVisitor = visitor[kind];
  if (kindVisitor) {
    if (!isLeaving && typeof kindVisitor === 'function') {
      // { Kind() {} }
      return kindVisitor;
    }
    const kindSpecificVisitor =
      isLeaving ? kindVisitor.leave : kindVisitor.enter;
    if (typeof kindSpecificVisitor === 'function') {
      // { Kind: { enter() {}, leave() {} } }
      return kindSpecificVisitor;
    }
  } else {
    const specificVisitor = isLeaving ? visitor.leave : visitor.enter;
    if (specificVisitor) {
      if (typeof specificVisitor === 'function') {
        // { enter() {}, leave() {} }
        return specificVisitor;
      }
      const specificKindVisitor = specificVisitor[kind];
      if (typeof specificKindVisitor === 'function') {
        // { enter: { Kind() {} }, leave: { Kind() {} } }
        return specificKindVisitor;
      }
    }
  }
}
