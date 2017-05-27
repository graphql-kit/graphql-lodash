import every from 'lodash/every.js';
import some from 'lodash/some.js';
import startsWith from 'lodash/startsWith.js';
import endsWith from 'lodash/endsWith.js';
import lt from 'lodash/lt.js';
import lte from 'lodash/lte.js';
import gt from 'lodash/gt.js';
import gte from 'lodash/gte.js';
import eq from 'lodash/eq.js';
import map from 'lodash/map.js';
import keyBy from 'lodash/keyBy.js';
import chunk from 'lodash/chunk.js';
import drop from 'lodash/drop.js';
import dropRight from 'lodash/dropRight.js';
import take from 'lodash/take.js';
import takeRight from 'lodash/takeRight.js';
import flattenDepth from 'lodash/flattenDepth.js';
import fromPairs from 'lodash/fromPairs.js';
import nth from 'lodash/nth.js';
import reverse from 'lodash/reverse.js';
import uniq from 'lodash/uniq.js';
import uniqBy from 'lodash/uniqBy.js';
import countBy from 'lodash/countBy.js';
import filter from 'lodash/filter.js';
import reject from 'lodash/reject.js';
import groupBy from 'lodash/groupBy.js';
import sortBy from 'lodash/sortBy.js';
import minBy from 'lodash/minBy.js';
import maxBy from 'lodash/maxBy.js';
import meanBy from 'lodash/meanBy.js';
import sumBy from 'lodash/sumBy.js';
import join from 'lodash/join.js';

import get from 'lodash/get.js';
import mapValues from 'lodash/mapValues.js';
import at from 'lodash/at.js';
import toPairs from 'lodash/toPairs.js';
import invert from 'lodash/invert.js';
import invertBy from 'lodash/invertBy.js';
import keys from 'lodash/keys.js';
import values from 'lodash/values.js';

const transformations = {
  Array: {
    each: (array, arg) => {
      return map(array, item => applyTransformations(item, arg));
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
