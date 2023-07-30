import util from './util.js';
import errors from './errors.js'
// import { FUNCTION_ERROR, IS_DISPOSABLE } from "./constant.js";

export default (Promise, apiRejection, tryConvertToPromise,
  createContext, INTERNAL, debug) => {
  const TypeError = errors.TypeError;
  const inherits = util.inherits;
  const errorObj = util.errorObj;
  const tryCatch = util.tryCatch;
  const NULL = {};

  function thrower(e) {
    setTimeout(() => { throw e; }, 0);
  }

  function castPreservingDisposable(thenable) {
    const maybePromise = tryConvertToPromise(thenable);
    if (maybePromise !== thenable &&
      typeof thenable._isDisposable === "function" &&
      typeof thenable._getDisposer === "function" &&
      thenable._isDisposable()) {
      maybePromise._setDisposable(thenable._getDisposer());
    }
    return maybePromise;
  }
  function dispose(resources, inspection) {
    let i = 0;
    const len = resources.length;
    const ret = new Promise(INTERNAL);
    function iterator() {
      if (i >= len) return ret._fulfill();
      let maybePromise = castPreservingDisposable(resources[i++]);
      if (maybePromise instanceof Promise &&
        maybePromise._isDisposable()) {
        try {
          maybePromise = tryConvertToPromise(
            maybePromise._getDisposer().tryDispose(inspection),
            resources.promise);
        } catch (e) {
          return thrower(e);
        }
        if (maybePromise instanceof Promise) {
          return maybePromise._then(iterator, thrower,
            null, null, null);
        }
      }
      iterator();
    }
    iterator();
    return ret;
  }

  class Disposer {
    constructor(data, promise, context) {
      this._data = data;
      this._promise = promise;
      this._context = context;
    }
    static isDisposer(d) {
      return (d != null &&
        typeof d.resource === "function" &&
        typeof d.tryDispose === "function");
    }
    data() {
      return this._data;
    }
    promise() {
      return this._promise;
    }
    resource() {
      if (this.promise().isFulfilled()) {
        return this.promise().value();
      }
      return NULL;
    }
    tryDispose(inspection) {
      const resource = this.resource();
      const context = this._context;
      if (context !== undefined) context._pushContext();
      const ret = resource !== NULL
        ? this.doDispose(resource, inspection) : null;
      if (context !== undefined) context._popContext();
      this._promise._unsetDisposable();
      this._data = null;
      return ret;
    }
  }

  function FunctionDisposer(fn, promise, context) {
    this.constructor$(fn, promise, context);
  }
  inherits(FunctionDisposer, Disposer);

  FunctionDisposer.prototype.doDispose = function (resource, inspection) {
    const fn = this.data();
    return fn.call(resource, resource, inspection);
  };

  function maybeUnwrapDisposer(value) {
    if (Disposer.isDisposer(value)) {
      this.resources[this.index]._setDisposable(value);
      return value.promise();
    }
    return value;
  }

  class ResourceList {
    constructor(length) {
      this.length = length;
      this.promise = null;
      this[length - 1] = null;
    }

    _resultCancelled() {
      const len = this.length;
      for (let i = 0; i < len; ++i) {
        const item = this[i];
        if (item instanceof Promise) {
          item.cancel();
        }
      }
    }
  }

  Promise.using = function () {
    let len = arguments.length;
    if (len < 2) return apiRejection(
      "you must pass at least 2 arguments to Promise.using");
    let fn = arguments[len - 1];
    if (typeof fn !== "function") {
      // return apiRejection(FUNCTION_ERROR + util.classString(fn));
      return apiRejection("expecting a function but got " + util.classString(fn));
    }
    let input;
    let spreadArgs = true;
    if (len === 2 && Array.isArray(arguments[0])) {
      input = arguments[0];
      len = input.length;
      spreadArgs = false;
    } else {
      input = arguments;
      len--;
    }
    const resources = new ResourceList(len);
    for (let i = 0; i < len; ++i) {
      let resource = input[i];
      if (Disposer.isDisposer(resource)) {
        const disposer = resource;
        resource = resource.promise();
        resource._setDisposable(disposer);
      } else {
        const maybePromise = tryConvertToPromise(resource);
        if (maybePromise instanceof Promise) {
          resource =
            maybePromise._then(maybeUnwrapDisposer, null, null, {
              resources: resources,
              index: i
            }, undefined);
        }
      }
      resources[i] = resource;
    }

    const reflectedResources = new Array(resources.length);
    for (let i = 0; i < reflectedResources.length; ++i) {
      reflectedResources[i] = Promise.resolve(resources[i]).reflect();
    }

    const resultPromise = Promise.all(reflectedResources)
      .then(function (inspections) {
        for (let i = 0; i < inspections.length; ++i) {
          const inspection = inspections[i];
          if (inspection.isRejected()) {
            errorObj.e = inspection.error();
            return errorObj;
          } else if (!inspection.isFulfilled()) {
            resultPromise.cancel();
            return;
          }
          inspections[i] = inspection.value();
        }
        promise._pushContext();

        fn = tryCatch(fn);
        const ret = spreadArgs
          ? fn.apply(undefined, inspections) : fn(inspections);
        const promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
          ret, promiseCreated, "Promise.using", promise);
        return ret;
      });

    const promise = resultPromise.lastly(function () {
      const inspection = new Promise.PromiseInspection(resultPromise);
      return dispose(resources, inspection);
    });
    resources.promise = promise;
    promise._setOnCancel(resources);
    return promise;
  };

  Promise.prototype._setDisposable = function (disposer) {
    // this._bitField = this._bitField | IS_DISPOSABLE;
    this._bitField = this._bitField | 131072;
    this._disposer = disposer;
  };

  Promise.prototype._isDisposable = function () {
    // return (this._bitField & IS_DISPOSABLE) > 0;
    return (this._bitField & 131072) > 0;
  };

  Promise.prototype._getDisposer = function () {
    return this._disposer;
  };

  Promise.prototype._unsetDisposable = function () {
    // this._bitField = this._bitField & (~IS_DISPOSABLE);
    this._bitField = this._bitField & (~131072);
    this._disposer = undefined;
  };

  Promise.prototype.disposer = function (fn) {
    if (typeof fn === "function") {
      return new FunctionDisposer(fn, this, createContext());
    }
    throw new TypeError();
  };

};
