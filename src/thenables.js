import util from './util.js';
// import ASSERT from './assert.js';

export default (Promise, INTERNAL) => {
  const errorObj = util.errorObj;
  const isObject = util.isObject;

  function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
      if (obj instanceof Promise) return obj;
      const then = getThen(obj);
      if (then === errorObj) {
        if (context) context._pushContext();
        const ret = Promise.reject(then.e);
        if (context) context._popContext();
        return ret;
      } else if (typeof then === "function") {
        if (isAnyBluebirdPromise(obj)) {
          const ret = new Promise(INTERNAL);
          obj._then(ret._fulfill, ret._reject, undefined, ret, null);
          return ret;
        }
        return doThenable(obj, then, context);
      }
    }
    return obj;
  }

  function doGetThen(obj) {
    return obj.then;
  }

  function getThen(obj) {
    try {
      return doGetThen(obj);
    } catch (e) {
      errorObj.e = e;
      return errorObj;
    }
  }

  const hasProp = Object.prototype.hasOwnProperty;
  function isAnyBluebirdPromise(obj) {
    try {
      return hasProp.call(obj, "_promise0");
    } catch (e) {
      return false;
    }
  }

  function doThenable(x, then, context) {
    // ASSERT(typeof then === "function");
    let promise = new Promise(INTERNAL);
    const ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    let synchronous = true;
    const result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
      promise._rejectCallback(result.e, true, true);
      promise = null;
    }

    function resolve(value) {
      if (!promise) return;
      promise._resolveCallback(value);
      promise = null;
    }

    function reject(reason) {
      if (!promise) return;
      promise._rejectCallback(reason, synchronous, true);
      promise = null;
    }
    return ret;
  }

  return tryConvertToPromise;
};
