import bluebird from './promise.js';
let old;
if (typeof Promise !== "undefined") {
  old = Promise;
}

function noConflict() {
  try {
    if (Promise === bluebird) {
      Promise = old;
    }
  } catch (e) { }

  return bluebird;
}

bluebird.noConflict = noConflict;
export default bluebird;
