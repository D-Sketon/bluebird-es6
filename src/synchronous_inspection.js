// import {
//   INSPECTION_REASON_ERROR,
//   INSPECTION_VALUE_ERROR,
//   IS_CANCELLED,
//   IS_CANCELLED_OR_WILL_BE_CANCELLED, IS_FULFILLED, IS_REJECTED,
//   IS_REJECTED_OR_FULFILLED,
//   IS_REJECTED_OR_FULFILLED_OR_CANCELLED
// } from "./constant.js";

export default (Promise) => {
  function PromiseInspection(promise) {
    if (promise !== undefined) {
      promise = promise._target();
      this._bitField = promise._bitField;
      this._settledValueField = promise._isFateSealed()
        ? promise._settledValue() : undefined;
    }
    else {
      this._bitField = 0;
      this._settledValueField = undefined;
    }
  }

  PromiseInspection.prototype._settledValue = function () {
    return this._settledValueField;
  };

  const value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
      // throw new TypeError(INSPECTION_VALUE_ERROR);
      throw new TypeError("cannot get rejection reason of a non-rejected promise");
    }
    return this._settledValue();
  };

  const reason = PromiseInspection.prototype.error =
    PromiseInspection.prototype.reason = function () {
      if (!this.isRejected()) {
        // throw new TypeError(INSPECTION_REASON_ERROR);
        throw new TypeError("cannot get rejection reason of a non-rejected promise");
      }
      return this._settledValue();
    };

  const isFulfilled = PromiseInspection.prototype.isFulfilled = function () {
    // return (this._bitField & IS_FULFILLED) !== 0;
    return (this._bitField & 33554432) !== 0;
  };

  const isRejected = PromiseInspection.prototype.isRejected = function () {
    // return (this._bitField & IS_REJECTED) !== 0;
    return (this._bitField & 16777216) !== 0;
  };

  const isPending = PromiseInspection.prototype.isPending = function () {
    // return (this._bitField & IS_REJECTED_OR_FULFILLED_OR_CANCELLED) === 0;
    return (this._bitField & 50397184) === 0;
  };

  const isResolved = PromiseInspection.prototype.isResolved = function () {
    // return (this._bitField & IS_REJECTED_OR_FULFILLED) !== 0;
    return (this._bitField & 50331648) !== 0;
  };

  PromiseInspection.prototype.isCancelled = function () {
    // return (this._bitField & IS_CANCELLED_OR_WILL_BE_CANCELLED) !== 0;
    return (this._bitField & 8454144) !== 0;
  };

  Promise.prototype.__isCancelled = function () {
    // return (this._bitField & IS_CANCELLED) === IS_CANCELLED;
    return (this._bitField & 65536) === 65536;
  };

  Promise.prototype._isCancelled = function () {
    return this._target().__isCancelled();
  };

  Promise.prototype.isCancelled = function () {
    // return (this._target()._bitField & IS_CANCELLED_OR_WILL_BE_CANCELLED) !== 0;
    return (this._target()._bitField & 8454144) !== 0;
  };

  Promise.prototype.isPending = function () {
    return isPending.call(this._target());
  };

  Promise.prototype.isRejected = function () {
    return isRejected.call(this._target());
  };

  Promise.prototype.isFulfilled = function () {
    return isFulfilled.call(this._target());
  };

  Promise.prototype.isResolved = function () {
    return isResolved.call(this._target());
  };

  Promise.prototype.value = function () {
    return value.call(this._target());
  };

  Promise.prototype.reason = function () {
    const target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
  };

  Promise.prototype._value = function () {
    return this._settledValue();
  };

  Promise.prototype._reason = function () {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
  };

  Promise.PromiseInspection = PromiseInspection;
};
