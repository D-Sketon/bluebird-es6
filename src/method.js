import util from './util.js';
// import ASSERT from './assert.js';
// import { FUNCTION_ERROR } from "./constant.js";

export default (Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) => {
  const tryCatch = util.tryCatch;

  Promise.method = function (fn) {
    if (typeof fn !== "function") {
      // throw new Promise.TypeError(FUNCTION_ERROR + util.classString(fn));
      throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
      const ret = new Promise(INTERNAL);
      ret._captureStackTrace();
      ret._pushContext();
      const value = tryCatch(fn).apply(this, arguments);
      const promiseCreated = ret._popContext();
      debug.checkForgottenReturns(
        value, promiseCreated, "Promise.method", ret);
      ret._resolveFromSyncValue(value);
      return ret;
    };
  };

  Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
      // return apiRejection(FUNCTION_ERROR + util.classString(fn));
      return apiRejection("expecting a function but got " + util.classString(fn));
    }
    const ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    let value;
    if (arguments.length > 1) {
      debug.deprecated("calling Promise.try with more than 1 argument");
      const arg = arguments[1];
      const ctx = arguments[2];
      value = Array.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
        : tryCatch(fn).call(ctx, arg);
    } else {
      value = tryCatch(fn)();
    }
    const promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
      value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
  };

  Promise.prototype._resolveFromSyncValue = function (value) {
    // ASSERT(!this._isFollowing());
    if (value === util.errorObj) {
      this._rejectCallback(value.e, false);
    } else {
      this._resolveCallback(value, true);
    }
  };
};
