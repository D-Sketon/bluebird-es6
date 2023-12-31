import util from './util.js';
import ASSERT from './assert.js';
import { IS_FULFILLED, IS_REJECTED } from "./constant.js";
export default (Promise, PromiseArray, debug) => {
  const PromiseInspection = Promise.PromiseInspection;

  function SettledPromiseArray(values) {
    this.constructor$(values);
  }
  util.inherits(SettledPromiseArray, PromiseArray);

  SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    // ASSERT(typeof index === "number");
    this._values[index] = inspection;
    const totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
      this._resolve(this._values);
      return true;
    }
    return false;
  };

  //override
  SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    // ASSERT(!this._isResolved());
    // ASSERT(typeof index === "number");
    const ret = new PromiseInspection();
    ret._bitField = IS_FULFILLED;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
  };
  //override
  SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    // ASSERT(!this._isResolved());
    // ASSERT(typeof index === "number");
    const ret = new PromiseInspection();
    ret._bitField = IS_REJECTED;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
  };

  Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
  };

  Promise.allSettled = function (promises) {
    return new SettledPromiseArray(promises).promise();
  };

  Promise.prototype.settle = function () {
    return Promise.settle(this);
  };
};
