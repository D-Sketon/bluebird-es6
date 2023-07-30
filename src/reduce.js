import util from './util.js';
// import { FUNCTION_ERROR, RESOLVE_CALL_METHOD } from "./constant.js";
export default (Promise,
  PromiseArray,
  apiRejection,
  tryConvertToPromise,
  INTERNAL,
  debug) => {
  const tryCatch = util.tryCatch;

  function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    const context = Promise._getContext();
    this._fn = util.contextBind(context, fn);
    if (initialValue !== undefined) {
      initialValue = Promise.resolve(initialValue);
      initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    if (_each === INTERNAL) {
      this._eachValues = Array(this._length);
    } else if (_each === 0) {
      this._eachValues = null;
    } else {
      this._eachValues = undefined;
    }
    this._promise._captureStackTrace();
    // this._init$(undefined, RESOLVE_CALL_METHOD);
    this._init$(undefined, -5);
  }
  util.inherits(ReductionPromiseArray, PromiseArray);

  ReductionPromiseArray.prototype._gotAccum = function (accum) {
    if (this._eachValues !== undefined &&
      this._eachValues !== null &&
      accum !== INTERNAL) {
      this._eachValues.push(accum);
    }
  };

  ReductionPromiseArray.prototype._eachComplete = function (value) {
    if (this._eachValues !== null) {
      this._eachValues.push(value);
    }
    return this._eachValues;
  };

  // Override
  ReductionPromiseArray.prototype._init = function () { };

  // Override
  ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    this._resolve(this._eachValues !== undefined ? this._eachValues
      : this._initialValue);
  };

  // Override
  ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
  };

  // Override
  ReductionPromiseArray.prototype._resolve = function (value) {
    this._promise._resolveCallback(value);
    this._values = null;
  };

  // Override
  ReductionPromiseArray.prototype._resultCancelled = function (sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
      this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
      this._initialValue.cancel();
    }
  };

  // Override
  ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    let value;
    let i;
    let length = values.length;
    if (this._initialValue !== undefined) {
      value = this._initialValue;
      i = 0;
    } else {
      value = Promise.resolve(values[0]);
      i = 1;
    }

    this._currentCancellable = value;

    for (let j = i; j < length; ++j) {
      const maybePromise = values[j];
      if (maybePromise instanceof Promise) {
        maybePromise.suppressUnhandledRejections();
      }
    }

    if (!value.isRejected()) {
      for (; i < length; ++i) {
        const ctx = {
          accum: null,
          value: values[i],
          index: i,
          length: length,
          array: this
        };

        value = value._then(gotAccum, undefined, undefined, ctx, undefined);

        // Too many promises chained with asyncGuaranteed will result in
        // stack overflow. Break up long chains to reset stack.
        if ((i & 127) === 0) {
          value._setNoAsyncGuarantee();
        }
      }
    }

    if (this._eachValues !== undefined) {
      value = value
        ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
  };

  Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
  };

  Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
  };

  function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
      array._resolve(valueOrReason);
    } else {
      array._reject(valueOrReason);
    }
  }

  function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
      // return apiRejection(FUNCTION_ERROR + util.classString(fn));
      return apiRejection("expecting a function but got " + util.classString(fn));
    }
    const array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
  }

  function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    const value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
      this.array._currentCancellable = value;
      return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
      return gotValue.call(this, value);
    }
  }

  function gotValue(value) {
    const array = this.array;
    const promise = array._promise;
    const fn = tryCatch(array._fn);
    promise._pushContext();
    let ret;
    if (array._eachValues !== undefined) {
      ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
      ret = fn.call(promise._boundValue(),
        this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
      array._currentCancellable = ret;
    }
    const promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
      ret,
      promiseCreated,
      array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
      promise
    );
    return ret;
  }
};
