import util from './util.js';
// import { TIMEOUT_ERROR } from "./constant.js";

export default (Promise, INTERNAL, debug) => {
  const TimeoutError = Promise.TimeoutError;

  class HandleWrapper {
    constructor(handle) {
      this.handle = handle;
    }
    _resultCancelled() {
      clearTimeout(this.handle);
    }
  }


  const afterValue = function (value) { return delay(+this).thenReturn(value); };
  const delay = Promise.delay = function (ms, value) {
    let ret;
    let handle;
    if (value !== undefined) {
      ret = Promise.resolve(value)
        ._then(afterValue, null, null, ms, undefined);
      if (debug.cancellation() && value instanceof Promise) {
        ret._setOnCancel(value);
      }
    } else {
      ret = new Promise(INTERNAL);
      handle = setTimeout(function () { ret._fulfill(); }, +ms);
      if (debug.cancellation()) {
        ret._setOnCancel(new HandleWrapper(handle));
      }
      ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
  };

  Promise.prototype.delay = function (ms) {
    return delay(ms, this);
  };

  const afterTimeout = function (promise, message, parent) {
    let err;
    if (typeof message !== "string") {
      if (message instanceof Error) {
        err = message;
      } else {
        // err = new TimeoutError(TIMEOUT_ERROR);
        err = new TimeoutError("operation timed out");
      }
    } else {
      err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);

    if (parent != null) {
      parent.cancel();
    }
  };

  function successClear(value) {
    clearTimeout(this.handle);
    return value;
  }

  function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
  }

  Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    let ret, parent;

    const handleWrapper = new HandleWrapper(setTimeout(() => {
      if (ret.isPending()) {
        afterTimeout(ret, message, parent);
      }
    }, ms));

    if (debug.cancellation()) {
      parent = this.then();
      ret = parent._then(successClear, failureClear, undefined, handleWrapper, undefined);
      ret._setOnCancel(handleWrapper);
    } else {
      ret = this._then(successClear, failureClear, undefined, handleWrapper, undefined);
    }

    return ret;
  };

};
