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

      const values = getArgumentValues(lodashDirective, node);
      pathToArgs.push([resultPath, values]);
    },
  });

  pathToArgs.sort(([a], [b]) => b.length - a.length);
  // TODO: detect duplicates

  return [print(stripQuery(queryAST)), result => {
    const data = result.data;
    for (const [path, operations] of pathToArgs) {
      const key = path.pop();
      // FIXME: skip arrays in path
      const parentObject = getObjectByPath(data, path);
      if (parentObject === null)
        continue;

      let object = parentObject[key];
      if (object === null)
        continue;

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
        }
      }
      parentObject[key] = object;
    }
    return result;
  }];
}

function getObjectByPath(root, path) {
  let result = root;
  for (const key of path) {
    result = result[key];
    if (result === null)
      break;
  }
  return result;
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
