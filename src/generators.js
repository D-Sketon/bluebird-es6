import errors from "./errors.js";
// import ASSERT from "./assert.js";
import util from "./util.js";
// import {
//   FROM_COROUTINE_CREATED_AT,
//   FUNCTION_ERROR,
//   IS_FULFILLED,
//   IS_PENDING_AND_WAITING_NEG,
//   IS_REJECTED,
//   NOT_GENERATOR_ERROR,
//   YIELDED_NON_PROMISE_ERROR
// } from "./constant.js";
// import { BIT_FIELD_CHECK } from "./macro.js";

export default (Promise,
  apiRejection,
  INTERNAL,
  tryConvertToPromise,
  Proxyable,
  debug) => {
  const TypeError = errors.TypeError;
  const errorObj = util.errorObj;
  const tryCatch = util.tryCatch;
  const yieldHandlers = [];

  function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (let i = 0; i < yieldHandlers.length; ++i) {
      traceParent._pushContext();
      const result = tryCatch(yieldHandlers[i])(value);
      traceParent._popContext();
      if (result === errorObj) {
        traceParent._pushContext();
        const ret = Promise.reject(errorObj.e);
        traceParent._popContext();
        return ret;
      }
      const maybePromise = tryConvertToPromise(result, traceParent);
      if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
  }

  class PromiseSpawn extends Proxyable{
    constructor(generatorFunction, receiver, yieldHandler, stack) {
      super();
      if (debug.cancellation()) {
        const internal = new Promise(INTERNAL);
        const _finallyPromise = this._finallyPromise = new Promise(INTERNAL);
        this._promise = internal.lastly(function () {
          return _finallyPromise;
        });
        internal._captureStackTrace();
        internal._setOnCancel(this);
      } else {
        const promise = this._promise = new Promise(INTERNAL);
        promise._captureStackTrace();
      }
      this._stack = stack;
      this._generatorFunction = generatorFunction;
      this._receiver = receiver;
      this._generator = undefined;
      this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
      this._yieldedPromise = null;
      this._cancellationPhase = false;
    }
    _isResolved() {
      return this._promise === null;
    }
    _cleanup() {
      this._promise = this._generator = null;
      if (debug.cancellation() && this._finallyPromise !== null) {
        this._finallyPromise._fulfill();
        this._finallyPromise = null;
      }
    }
    _promiseCancelled() {
      if (this._isResolved()) return;
      const implementsReturn = typeof this._generator["return"] !== "undefined";

      let result;
      if (!implementsReturn) {
        const reason = new Promise.CancellationError(
          "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
          reason);
        this._promise._popContext();
      } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
          undefined);
        this._promise._popContext();
      }
      this._cancellationPhase = true;
      this._yieldedPromise = null;
      this._continue(result);
    }
    _promiseFulfilled(value) {
      this._yieldedPromise = null;
      this._promise._pushContext();
      const result = tryCatch(this._generator.next).call(this._generator, value);
      this._promise._popContext();
      this._continue(result);
    }
    _promiseRejected(reason) {
      this._yieldedPromise = null;
      this._promise._attachExtraTrace(reason);
      this._promise._pushContext();
      const result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
      this._promise._popContext();
      this._continue(result);
    }
    _resultCancelled() {
      if (this._yieldedPromise instanceof Promise) {
        const promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
      }
    }
    promise() {
      return this._promise;
    }
    _run() {
      this._generator = this._generatorFunction.call(this._receiver);
      this._receiver =
        this._generatorFunction = undefined;
      this._promiseFulfilled(undefined);
    }
    _continue(result) {
      // ASSERT(this._yieldedPromise == null);
      const promise = this._promise;
      if (result === errorObj) {
        this._cleanup();
        if (this._cancellationPhase) {
          return promise.cancel();
        } else {
          return promise._rejectCallback(result.e, false);
        }
      }

      const value = result.value;
      if (result.done === true) {
        this._cleanup();
        if (this._cancellationPhase) {
          return promise.cancel();
        } else {
          return promise._resolveCallback(value);
        }
      } else {
        let maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
          maybePromise =
            promiseFromYieldHandler(maybePromise,
              this._yieldHandlers,
              this._promise);
          // ASSERT(maybePromise === null || maybePromise instanceof Promise);
          if (maybePromise === null) {
            this._promiseRejected(
              // new TypeError(
              //   YIELDED_NON_PROMISE_ERROR.replace("%s", String(value)) +
              //   FROM_COROUTINE_CREATED_AT +
              //   this._stack.split("\n").slice(1, -7).join("\n")
              // )
              new TypeError(
                "A value %s was yielded that could not be treated as a promise".replace("%s", String(value)) +
                "From coroutine:\n" +
                this._stack.split("\n").slice(1, -7).join("\n")
            )
            );
            return;
          }
        }
        maybePromise = maybePromise._target();
        const bitField = maybePromise._bitField;
        // if (BIT_FIELD_CHECK(IS_PENDING_AND_WAITING_NEG, bitField, true)) {
        if (((bitField & 50397184) === 0)) {
          this._yieldedPromise = maybePromise;
          maybePromise._proxy(this, null);
          // } else if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
        } else if (((bitField & 33554432) !== 0)) {
          Promise._async.invoke(
            this._promiseFulfilled, this, maybePromise._value()
          );
          // } else if (BIT_FIELD_CHECK(IS_REJECTED, bitField)) {
        } else if (((bitField & 16777216) !== 0)) {
          Promise._async.invoke(
            this._promiseRejected, this, maybePromise._reason()
          );
        } else {
          this._promiseCancelled();
        }
      }
    }
  }

  Promise.coroutine = function (generatorFunction, options) {
    //Throw synchronously because Promise.coroutine is semantically
    //something you call at "compile time" to annotate static functions
    if (typeof generatorFunction !== "function") {
      // throw new TypeError(NOT_GENERATOR_ERROR);
      throw new TypeError("generatorFunction must be a function");
    }
    const yieldHandler = Object(options).yieldHandler;
    const PromiseSpawn$ = PromiseSpawn;
    const stack = new Error().stack;
    return function () {
      const generator = generatorFunction.apply(this, arguments);
      const spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
        stack);
      const ret = spawn.promise();
      spawn._generator = generator;
      spawn._promiseFulfilled(undefined);
      return ret;
    };
  };

  Promise.coroutine.addYieldHandler = function (fn) {
    if (typeof fn !== "function") {
      // throw new TypeError(FUNCTION_ERROR + util.classString(fn));
      throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
  };

  Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    //Return rejected promise because Promise.spawn is semantically
    //something that will be called at runtime with possibly dynamic values
    if (typeof generatorFunction !== "function") {
      // return apiRejection(NOT_GENERATOR_ERROR);
      return apiRejection("generatorFunction must be a function");
    }
    const spawn = new PromiseSpawn(generatorFunction, this);
    const ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
  };
};
