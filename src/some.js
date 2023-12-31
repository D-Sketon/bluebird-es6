import util from './util.js';
import errors from './errors.js';
// import ASSERT from './assert.js';
// import { POSITIVE_INTEGER_ERROR, RESOLVE_CALL_METHOD } from "./constant.js";

export default
  function (Promise, PromiseArray, apiRejection) {
  const RangeError = errors.RangeError;
  const AggregateError = errors.AggregateError;
  const isArray = Array.isArray;
  const CANCELLATION = {};


  function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
  }
  util.inherits(SomePromiseArray, PromiseArray);

  SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
      return;
    }
    if (this._howMany === 0) {
      this._resolve([]);
      return;
    }
    // this._init$(undefined, RESOLVE_CALL_METHOD);
    this._init$(undefined, -5);
    const isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
      isArrayResolved &&
      this._howMany > this._canPossiblyFulfill()) {
      this._reject(this._getRangeError(this.length()));
    }
  };

  SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
  };

  SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
  };

  SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
  };

  SomePromiseArray.prototype.setHowMany = function (count) {
    // ASSERT(!this._isResolved());
    this._howMany = count;
  };

  //override
  SomePromiseArray.prototype._promiseFulfilled = function (value) {
    // ASSERT(!this._isResolved());
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
      this._values.length = this.howMany();
      if (this.howMany() === 1 && this._unwrap) {
        this._resolve(this._values[0]);
      } else {
        this._resolve(this._values);
      }
      return true;
    }
    return false;

  };
  //override
  SomePromiseArray.prototype._promiseRejected = function (reason) {
    // ASSERT(!this._isResolved());
    this._addRejected(reason);
    return this._checkOutcome();
  };

  //override
  SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
      return this._cancel();
    }
    // ASSERT(!this._isResolved());
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
  };

  SomePromiseArray.prototype._checkOutcome = function () {
    if (this.howMany() > this._canPossiblyFulfill()) {
      const e = new AggregateError();
      for (let i = this.length(); i < this._values.length; ++i) {
        if (this._values[i] !== CANCELLATION) {
          e.push(this._values[i]);
        }
      }
      if (e.length > 0) {
        this._reject(e);
      } else {
        this._cancel();
      }
      return true;
    }
    return false;
  };

  SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
  };

  SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
  };

  //Use the same array past .length() to store rejection reasons
  SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
  };

  SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
  };

  SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
  };

  SomePromiseArray.prototype._getRangeError = function (count) {
    const message = "Input array must contain at least " +
      this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
  };

  SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
  };

  function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
      // return apiRejection(POSITIVE_INTEGER_ERROR);
      return apiRejection("expecting a positive integer");
    }
    const ret = new SomePromiseArray(promises);
    const promise = ret.promise();
    // ASSERT(promise.isPending());
    // ASSERT(ret instanceof SomePromiseArray);
    ret.setHowMany(howMany);
    ret.init();
    return promise;
  }

  Promise.some = function (promises, howMany) {
    return some(promises, howMany);
  };

  Promise.prototype.some = function (howMany) {
    return some(this, howMany);
  };

  Promise._SomePromiseArray = SomePromiseArray;
};
