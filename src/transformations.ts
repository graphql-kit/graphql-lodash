import every from 'lodash-es/every';
import some from 'lodash-es/some';
import startsWith from 'lodash-es/startsWith';
import endsWith from 'lodash-es/endsWith';
import lt from 'lodash-es/lt';
import lte from 'lodash-es/lte';
import gt from 'lodash-es/gt';
import gte from 'lodash-es/gte';
import eq from 'lodash-es/eq';
import map from 'lodash-es/map';
import keyBy from 'lodash-es/keyBy';
import chunk from 'lodash-es/chunk';
import drop from 'lodash-es/drop';
import dropRight from 'lodash-es/dropRight';
import take from 'lodash-es/take';
import takeRight from 'lodash-es/takeRight';
import flattenDepth from 'lodash-es/flattenDepth';
import fromPairs from 'lodash-es/fromPairs';
import nth from 'lodash-es/nth';
import reverse from 'lodash-es/reverse';
import uniq from 'lodash-es/uniq';
import uniqBy from 'lodash-es/uniqBy';
import countBy from 'lodash-es/countBy';
import filter from 'lodash-es/filter';
import reject from 'lodash-es/reject';
import groupBy from 'lodash-es/groupBy';
import sortBy from 'lodash-es/sortBy';
import minBy from 'lodash-es/minBy';
import maxBy from 'lodash-es/maxBy';
import meanBy from 'lodash-es/meanBy';
import sumBy from 'lodash-es/sumBy';
import join from 'lodash-es/join';
import expression from 'lodash-es/join';

import get from 'lodash-es/get';
import mapValues from 'lodash-es/mapValues';
import at from 'lodash-es/at';
import toPairs from 'lodash-es/toPairs';
import invert from 'lodash-es/invert';
import invertBy from 'lodash-es/invertBy';
import keys from 'lodash-es/keys';
import values from 'lodash-es/values';

const compute = function(scope, expression) {
  return _.template("<%= " + expression + " %>")(scope);
}

const transformations = {
  Array: {
    each: (array, arg) => {
      return map(array, item => applyTransformations(item, arg));
    },  
    mapCompute: (array, arg) => {
      return compute(array, item => applyTransformations(item, arg));
    },
    map,
    keyBy,
    chunk,
    drop,
    dropRight,
    take,
    takeRight,
    flattenDepth,
    fromPairs,
    nth,
    reverse,
    uniq,
    uniqBy,
    countBy,
    filter,
    reject,
    filterIf: (array, arg) => {
      return filter(array, item => applyTransformations(item, arg));
    },
    rejectIf: (array, arg) => {
      return reject(array, item => applyTransformations(item, arg));
    },
    groupBy,
    sortBy,
    minBy,
    maxBy,
    meanBy,
    sumBy,
    join,
  },
  Object: {
    get,
    mapValues,
    at,
    toPairs,
    invert,
    invertBy,
    keys,
    values,
    compute,
  },
  Number: {
    lt,
    lte,
    gt,
    gte,
    eq,
  },
  String: {
    startsWith,
    endsWith,
  },
};

const opToExpectedType = {};
for (const type in transformations)
  for (const name in transformations[type])
     opToExpectedType[name] = type;

export function applyTransformations(object, args) {
  if (!args)
    return object;

  for (const op in args) {
    if (object === null)
      break;

    const arg = args[op];

    if (op === 'and') {
      object = every(arg, predicateArgs => applyTransformations(object, predicateArgs));
      continue;
    }
    if (op === 'or') {
      object = some(arg, predicateArgs => applyTransformations(object, predicateArgs));
      continue;
    }

    const expectedType = opToExpectedType[op];
    let type = object.constructor && object.constructor.name;
    // handle objects created with Object.create(null)
    if (!type && (typeof object === 'object'))
      type = 'Object';

    if (expectedType !== type)
      throw Error(`"${op}" transformation expect "${expectedType}" but got "${type}"`);

    object = transformations[type][op](object, arg);
  }
  return object;
}
