import util from './util.js';
import _catch_filter from './catch_filter.js';
import { FINALLY_TYPE, LATE_CANCELLATION_OBSERVER, OBJECT_ERROR, TAP_TYPE } from "./constant.js";
export default (Promise, tryConvertToPromise, NEXT_FILTER) => {
  const CancellationError = Promise.CancellationError;
  const errorObj = util.errorObj;
  const catchFilter = _catch_filter(NEXT_FILTER);

  class PassThroughHandlerContext {
    constructor(promise, type, handler) {
      this.promise = promise;
      this.type = type;
      this.handler = handler;
      this.called = false;
      this.cancelPromise = null;
    }
    isFinallyHandler() {
      return this.type === FINALLY_TYPE;
    }
  }


  class FinallyHandlerCancelReaction {
    constructor(finallyHandler) {
      this.finallyHandler = finallyHandler;
    }
    _resultCancelled() {
      checkCancel(this.finallyHandler);
    }
  }


  function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
      if (arguments.length > 1) {
        ctx.cancelPromise._reject(reason);
      } else {
        ctx.cancelPromise._cancel();
      }
      ctx.cancelPromise = null;
      return true;
    }
    return false;
  }

  function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
  }
  function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
  }

  function finallyHandler(reasonOrValue) {
    const promise = this.promise;
    const handler = this.handler;

    if (!this.called) {
      this.called = true;
      const ret = this.isFinallyHandler()
        ? handler.call(promise._boundValue())
        : handler.call(promise._boundValue(), reasonOrValue);
      if (ret === NEXT_FILTER) {
        return ret;
      } else if (ret !== undefined) {
        promise._setReturnedNonUndefined();
        const maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
          if (this.cancelPromise != null) {
            if (maybePromise._isCancelled()) {
              const reason = new CancellationError(LATE_CANCELLATION_OBSERVER);
              promise._attachExtraTrace(reason);
              errorObj.e = reason;
              return errorObj;
            } else if (maybePromise.isPending()) {
              maybePromise._attachCancellationCallback(
                new FinallyHandlerCancelReaction(this));
            }
          }
          return maybePromise._then(
            succeed, fail, undefined, this, undefined);
        }
      }
    }

    if (promise.isRejected()) {
      checkCancel(this);
      errorObj.e = reasonOrValue;
      return errorObj;
    } else {
      checkCancel(this);
      return reasonOrValue;
    }
  }

  Promise.prototype._passThrough = function (handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
      fail,
      undefined,
      new PassThroughHandlerContext(this, type, handler),
      undefined);
  };

  Promise.prototype.lastly =
    Promise.prototype["finally"] = function (handler) {
      return this._passThrough(handler,
        FINALLY_TYPE,
        finallyHandler,
        finallyHandler);
    };


  Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, TAP_TYPE, finallyHandler);
  };

  Promise.prototype.tapCatch = function (handlerOrPredicate) {
    let len = arguments.length;
    if (len === 1) {
      return this._passThrough(handlerOrPredicate,
        TAP_TYPE,
        undefined,
        finallyHandler);
    } else {
      const catchInstances = new Array(len - 1);
      let j = 0;
      let i;
      for (i = 0; i < len - 1; ++i) {
        const item = arguments[i];
        if (util.isObject(item)) {
          catchInstances[j++] = item;
        } else {
          return Promise.reject(new TypeError(
            "tapCatch statement predicate: "
            + OBJECT_ERROR + util.classString(item)
          ));
        }
      }
      catchInstances.length = j;
      const handler = arguments[i];
      return this._passThrough(catchFilter(catchInstances, handler, this),
        TAP_TYPE,
        undefined,
        finallyHandler);
    }

  };

  return PassThroughHandlerContext;
};
