import util from './util.js';
// import ASSERT from './assert.js';
// import { BIT_FIELD_CHECK } from "./macro.js";
// import { FUNCTION_ERROR, IS_FULFILLED, IS_PENDING_AND_WAITING_NEG, IS_REJECTED, RESOLVE_ARRAY } from "./constant.js";

export default (Promise,
  PromiseArray,
  apiRejection,
  tryConvertToPromise,
  INTERNAL,
  debug) => {
  const tryCatch = util.tryCatch;
  const errorObj = util.errorObj;
  const async = Promise._async;

  function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    const context = Promise._getContext();
    this._callback = util.contextBind(context, fn);
    this._preservedValues = _filter === INTERNAL
      ? new Array(this.length())
      : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
    if (Array.isArray(promises)) {
      for (let i = 0; i < promises.length; ++i) {
        const maybePromise = promises[i];
        if (maybePromise instanceof Promise) {
          maybePromise.suppressUnhandledRejections();
        }
      }
    }
  }
  util.inherits(MappingPromiseArray, PromiseArray);

  MappingPromiseArray.prototype._asyncInit = function () {
    // this._init$(undefined, RESOLVE_ARRAY);
    this._init$(undefined, -2);
  };

  // The following hack is required because the super constructor
  // might call promiseFulfilled before this.callback = fn is set
  //
  // The super constructor call must always be first so that fields
  // are initialized in the same order so that the sub-class instances
  // will share same memory layout as the super class instances

  // Override
  MappingPromiseArray.prototype._init = function () { };

  // Override
  MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    // ASSERT(!this._isResolved());
    const values = this._values;
    const length = this.length();
    const preservedValues = this._preservedValues;
    const limit = this._limit;

    // Callback has been called for this index if it's negative
    if (index < 0) {
      // Restore the actual index value
      index = (index * -1) - 1;
      values[index] = value;
      if (limit >= 1) {
        this._inFlight--;
        this._drainQueue();
        if (this._isResolved()) return true;
      }
    } else {
      if (limit >= 1 && this._inFlight >= limit) {
        values[index] = value;
        this._queue.push(index);
        return false;
      }
      if (preservedValues !== null) preservedValues[index] = value;

      const promise = this._promise;
      const callback = this._callback;
      const receiver = promise._boundValue();
      promise._pushContext();
      let ret = tryCatch(callback).call(receiver, value, index, length);
      const promiseCreated = promise._popContext();
      debug.checkForgottenReturns(
        ret,
        promiseCreated,
        preservedValues !== null ? "Promise.filter" : "Promise.map",
        promise
      );
      if (ret === errorObj) {
        this._reject(ret.e);
        return true;
      }

      // If the mapper function returned a promise we simply reuse
      // The MappingPromiseArray as a PromiseArray for round 2.
      // To mark an index as "round 2" its inverted by adding +1 and
      // multiplying by -1
      let maybePromise = tryConvertToPromise(ret, this._promise);
      if (maybePromise instanceof Promise) {
        maybePromise = maybePromise._target();
        const bitField = maybePromise._bitField;
        // if (BIT_FIELD_CHECK(IS_PENDING_AND_WAITING_NEG, bitField, true)) {
        if (((bitField & 50397184) === 0)) {
          if (limit >= 1) this._inFlight++;
          values[index] = maybePromise;
          maybePromise._proxy(this, (index + 1) * -1);
          return false;
        // } else if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
      } else if (((bitField & 33554432) !== 0)) {
          ret = maybePromise._value();
        // } else if (BIT_FIELD_CHECK(IS_REJECTED, bitField)) {
      } else if (((bitField & 16777216) !== 0)) {
          this._reject(maybePromise._reason());
          return true;
        } else {
          this._cancel();
          return true;
        }
      }
      values[index] = ret;
    }
    const totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
      if (preservedValues !== null) {
        this._filter(values, preservedValues);
      } else {
        this._resolve(values);
      }
      return true;
    }
    return false;
  };

  MappingPromiseArray.prototype._drainQueue = function () {
    const queue = this._queue;
    const limit = this._limit;
    const values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
      if (this._isResolved()) return;
      const index = queue.pop();
      this._promiseFulfilled(values[index], index);
    }
  };

  MappingPromiseArray.prototype._filter = function (booleans, values) {
    const len = values.length;
    const ret = new Array(len);
    let j = 0;
    for (let i = 0; i < len; ++i) {
      if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
  };

  MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
  };

  function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
      // return apiRejection(FUNCTION_ERROR + util.classString(fn));
      return apiRejection("expecting a function but got " + util.classString(fn));
    }

    let limit = 0;
    if (options !== undefined) {
      if (typeof options === "object" && options !== null) {
        if (typeof options.concurrency !== "number") {
          return Promise.reject(
            new TypeError("'concurrency' must be a number but it is " +
              util.classString(options.concurrency)));
        }
        limit = options.concurrency;
      } else {
        return Promise.reject(new TypeError(
          "options argument must be an object but it is " +
          util.classString(options)));
      }
    }
    limit = typeof limit === "number" &&
      isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
  }

  Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
  };

  Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
  };
};
