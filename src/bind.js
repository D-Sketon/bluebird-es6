// import { IS_BOUND, IS_PENDING_AND_WAITING_NEG, PROPAGATE_CANCEL } from "./constant.js";
// import { BIT_FIELD_CHECK } from "./macro.js";

export default (Promise, INTERNAL, tryConvertToPromise, debug) => {
  let calledBind = false;
  const rejectThis = function (_, e) {
    this._reject(e);
  };

  const targetRejected = function (e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
  };

  const bindingResolved = function (thisArg, context) {
    // if (BIT_FIELD_CHECK(IS_PENDING_AND_WAITING_NEG, this._bitField, true)) {
    if (((this._bitField & 50397184) === 0)) {
      this._resolveCallback(context.target);
    }
  };

  const bindingRejected = function (e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
  };

  Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
      calledBind = true;
      Promise.prototype._propagateFrom = debug.propagateFromFunction();
      Promise.prototype._boundValue = debug.boundValueFunction();
    }
    const maybePromise = tryConvertToPromise(thisArg);
    const ret = new Promise(INTERNAL);
    // ret._propagateFrom(this, PROPAGATE_CANCEL);
    ret._propagateFrom(this, 1);
    const target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
      const context = {
        promiseRejectionQueued: false,
        promise: ret,
        target: target,
        bindingPromise: maybePromise
      };
      target._then(INTERNAL, targetRejected, undefined, ret, context);
      maybePromise._then(
        bindingResolved, bindingRejected, undefined, ret, context);
      ret._setOnCancel(maybePromise);
    } else {
      ret._resolveCallback(target);
    }
    return ret;
  };

  Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
      // this._bitField = this._bitField | IS_BOUND;
      this._bitField = this._bitField | 2097152;
      this._boundTo = obj;
    } else {
      // this._bitField = this._bitField & (~IS_BOUND);
      this._bitField = this._bitField & (~2097152);
    }
  };

  Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
    // return (this._bitField & IS_BOUND) === IS_BOUND;
  };

  Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
  };
};
