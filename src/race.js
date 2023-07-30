import util from './util.js';
import { COLLECTION_ERROR, PROPAGATE_ALL } from "./constant.js";
export default (
  Promise, INTERNAL, tryConvertToPromise, apiRejection) => {


  const raceLater = function (promise) {
    return promise.then(function (array) {
      return race(array, promise);
    });
  };

  function race(promises, parent) {
    const maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
      return raceLater(maybePromise);
    } else {
      promises = util.asArray(promises);
      if (promises === null)
        return apiRejection(COLLECTION_ERROR + util.classString(promises));
    }

    const ret = new Promise(INTERNAL);
    if (parent !== undefined) {
      ret._propagateFrom(parent, PROPAGATE_ALL);
    }
    const fulfill = ret._fulfill;
    const reject = ret._reject;
    for (let i = 0, len = promises.length; i < len; ++i) {
      const val = promises[i];

      if (val === undefined && !(i in promises)) {
        continue;
      }

      Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    //Yes, if promises were empty, it will be forever pending :-)
    return ret;
  }

  Promise.race = function (promises) {
    return race(promises, undefined);
  };

  Promise.prototype.race = function () {
    return race(this, undefined);
  };

};
