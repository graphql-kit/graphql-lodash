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

export const transformations = {
  Array: {
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
  }
};

export const transformationToType = {};
for (const type in transformations) {
  for (const name in transformations[type]) {
    transformationToType[name] = type;
  }
}

