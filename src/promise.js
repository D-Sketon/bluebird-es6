import util from './util.js';
import Async from './async.js';
import { firstLineError } from './async.js';
import errors from './errors.js';
import _thenables from './thenables.js';
import _promise_array from './promise_array.js';
import _context from './context.js';
import _debuggability from './debuggability.js';
import _finally from './finally.js';
import _catch_filter from './catch_filter.js';
import _method from './method.js';
import _bind from './bind.js';
import _cancel from './cancel.js';
import _direct_resolve from './direct_resolve.js';
import _synchronous_inspection from './synchronous_inspection.js';
import _join from './join.js';

import _call_get from './call_get.js';
import _generators from './generators.js';
import _map from './map.js';
import _nodeify from './nodeify.js';
import _promisify from './promisify.js';
import _props from './props.js';
import _race from './race.js';
import _reduce from './reduce.js';
import _settle from './settle.js';
import _some from './some.js';
import _timers from './timers.js';
import _using from './using.js';
import _any from './any.js';
import _each from './each.js';
import _filter from './filter.js';
import nodebackForPromise from './nodeback.js';

import { AsyncResource as asyncRsc } from 'async_hooks';
// import {
//   ASYNC_GUARANTEE_SHIFT,
//   CALLBACK_FULFILL_OFFSET,
//   CALLBACK_PROMISE_OFFSET,
//   CALLBACK_RECEIVER_OFFSET,
//   CALLBACK_REJECT_OFFSET,
//   CALLBACK_SIZE,
//   CIRCULAR_RESOLUTION_ERROR, CONSTRUCT_ERROR_INVOCATION,
//   FUNCTION_ERROR,
//   IS_ASYNC_GUARANTEED,
//   IS_BOUND,
//   IS_CANCELLED,
//   IS_FATE_SEALED,
//   IS_FINAL,
//   IS_FOLLOWING,
//   IS_FULFILLED,
//   IS_PENDING_AND_WAITING_NEG,
//   IS_REJECTED,
//   IS_REJECTED_OR_CANCELLED,
//   LATE_CANCELLATION_OBSERVER,
//   LENGTH_CLEAR_MASK,
//   LENGTH_MASK,
//   MAX_LENGTH,
//   NO_ASYNC_GUARANTEE, NO_STATE,
//   OBJECT_ERROR,
//   PROPAGATE_ALL,
//   PROPAGATE_BIND,
//   WILL_BE_CANCELLED
// } from "./constant.js";
// import ASSERT from './assert.js';
// import { BIT_FIELD_CHECK, BIT_FIELD_READ } from "./macro.js";

const makeSelfResolutionError = () => {
  // return new TypeError(CIRCULAR_RESOLUTION_ERROR);
  return new TypeError("circular promise resolution chain");
}

const reflectHandler = function () {
  return new Promise.PromiseInspection(this._target());
}

const apiRejection = (msg) => {
  return Promise.reject(new TypeError(msg));
}

function Proxyable() { }
const UNDEFINED_BINDING = {};
util.setReflectHandler(reflectHandler);

const getDomain = () => process.domain || null;

const getContextDefault = () => null;

const getContextDomain = () => ({
  domain: getDomain(),
  async: null
});

const AsyncResource = util.isNode && util.nodeSupportsAsyncResource ?
  asyncRsc : null;
const getContextAsyncHooks = () => {
  return {
    domain: getDomain(),
    async: new AsyncResource("Bluebird::Promise")
  };
};


class Promise {
  constructor(executor) {
    if (executor !== INTERNAL) {
      check(this, executor);
    }
    // this._bitField = NO_STATE;
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._resolveFromExecutor(executor);
    this._promiseCreated();
    this._fireEvent('promiseCreated', this);
  }

  toString() {
    return '[object Promise]';
  }

  reflect() {
    return this._then(reflectHandler, reflectHandler, undefined, this, undefined);
  }

  then(didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
      typeof didFulfill !== "function" &&
      typeof didReject !== "function") {
      let msg = ".then() only accepts functions but was passed: " +
        util.classString(didFulfill);
      if (arguments.length > 1) {
        msg += ", " + util.classString(didReject);
      }
      this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
  }

  done(didFulfill, didReject) {
    const promise = this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
  }

  spread(fn) {
    if (typeof fn !== "function") {
      // return apiRejection(FUNCTION_ERROR + util.classString(fn));
      return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
  }

  toJSON() {
    const ret = {
      isFulfilled: false,
      isRejected: false,
      fulfillmentValue: undefined,
      rejectionReason: undefined
    };
    if (this.isFulfilled()) {
      ret.fulfillmentValue = this.value();
      ret.isFulfilled = true;
    } else if (this.isRejected()) {
      ret.rejectionReason = this.reason();
      ret.isRejected = true;
    }
    return ret;
  }

  all(...args) {
    if (args.length > 0) {
      this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
  }

  error(fn) {
    return this.caught(util.originatesFromRejection, fn);
  }

  _then(didFulfill,
    didReject,
    _, // For fast-cast compatibility between bluebird versions
    receiver,
    internalData) {
    // // ASSERT(arguments.length === 5);
    const haveInternalData = internalData !== undefined;
    const promise = haveInternalData ? internalData : new Promise(INTERNAL);
    const target = this._target();
    const bitField = target._bitField;

    if (!haveInternalData) {
      // promise._propagateFrom(this, PROPAGATE_ALL);
      promise._propagateFrom(this, 3);
      promise._captureStackTrace();
      // if (receiver === undefined && BIT_FIELD_CHECK(IS_BOUND, this._bitField)) {
      if (receiver === undefined && ((this._bitField & 2097152) !== 0)) {
        // if (!BIT_FIELD_CHECK(IS_PENDING_AND_WAITING_NEG, bitField, true)) {
        if (!((bitField & 50397184) === 0)) {
          receiver = this._boundValue();
        } else {
          receiver = target === this ? undefined : this._boundTo;
        }
      }
      this._fireEvent("promiseChained", this, promise);
    }

    const context = getContext();
    // if (!BIT_FIELD_CHECK(IS_PENDING_AND_WAITING_NEG, bitField, true)) {
    if (!((bitField & 50397184) === 0)) {
      let handler, value, settler = target._settlePromiseCtx;
      // if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
      if (((bitField & 33554432) !== 0)) {
        value = target._rejectionHandler0;
        handler = didFulfill;
        // } else if (BIT_FIELD_CHECK(IS_REJECTED, bitField)) {
      } else if (((bitField & 16777216) !== 0)) {
        value = target._fulfillmentHandler0;
        handler = didReject;
        target._unsetRejectionIsUnhandled();
      } else {
        settler = target._settlePromiseLateCancellationObserver;
        // value = new CancellationError(LATE_CANCELLATION_OBSERVER);
        value = new CancellationError("late cancellation observer");
        target._attachExtraTrace(value);
        handler = didReject;
      }

      async.invoke(settler, target, {
        handler: util.contextBind(context, handler),
        promise: promise,
        receiver: receiver,
        value: value
      });
    } else {
      target._addCallbacks(didFulfill, didReject, promise, receiver, context);
    }

    return promise;
  }

  _length() {
    // ASSERT(arguments.length === 0);
    // return this._bitField & LENGTH_MASK;
    return this._bitField & 65535;
  }

  _isFateSealed() {
    // return (this._bitField & IS_FATE_SEALED) !== 0;
    return (this._bitField & 117506048) !== 0;
  }

  _isFollowing() {
    // return (this._bitField & IS_FOLLOWING) === IS_FOLLOWING;
    return (this._bitField & 67108864) === 67108864;
  }

  _setLength(len) {
    // this._bitField = (this._bitField & LENGTH_CLEAR_MASK) |
    //   (len & LENGTH_MASK);
    this._bitField = (this._bitField & -65536) |
      (len & 65535);
  }

  _setFulfilled() {
    // this._bitField = this._bitField | IS_FULFILLED;
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
  }

  _setRejected() {
    // this._bitField = this._bitField | IS_REJECTED;
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
  }

  _setFollowing() {
    // this._bitField = this._bitField | IS_FOLLOWING;
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
  }

  _setIsFinal() {
    // this._bitField = this._bitField | IS_FINAL;
    this._bitField = this._bitField | 4194304;
  }

  _isFinal() {
    // return (this._bitField & IS_FINAL) > 0;
    return (this._bitField & 4194304) > 0;
  }

  _unsetCancelled() {
    // this._bitField = this._bitField & (~IS_CANCELLED);
    this._bitField = this._bitField & (~65536);
  }

  _setCancelled() {
    // this._bitField = this._bitField | IS_CANCELLED;
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
  }

  _setWillBeCancelled() {
    // this._bitField = this._bitField | WILL_BE_CANCELLED;
    this._bitField = this._bitField | 8388608;
  }

  _setAsyncGuaranteed() {
    if (async.hasCustomScheduler()) return;
    const bitField = this._bitField;
    // this._bitField = bitField |
    //   (((bitField & NO_ASYNC_GUARANTEE) >> ASYNC_GUARANTEE_SHIFT) ^
    //     IS_ASYNC_GUARANTEED);
    this._bitField = bitField | (((bitField & 536870912) >> 2) ^ 134217728);
  }

  _setNoAsyncGuarantee() {
    // this._bitField = (this._bitField | NO_ASYNC_GUARANTEE) & (~IS_ASYNC_GUARANTEED);
    this._bitField = (this._bitField | 536870912) & (~134217728);
  }

  _receiverAt(index) {
    // ASSERT(!this._isFollowing());
    // const ret = index === 0 ? this._receiver0 : this[
    //   index * CALLBACK_SIZE - CALLBACK_SIZE + CALLBACK_RECEIVER_OFFSET];
    const ret = index === 0 ? this._receiver0 : this[index * 4 - 1];
    //Only use the bound value when not calling internal methods
    if (ret === UNDEFINED_BINDING) {
      return undefined;
    } else if (ret === undefined && this._isBound()) {
      return this._boundValue();
    }
    return ret;
  }

  _promiseAt(index) {
    // ASSERT(index > 0);
    // ASSERT(!this._isFollowing());
    // return this[index * CALLBACK_SIZE - CALLBACK_SIZE + CALLBACK_PROMISE_OFFSET];
    return this[index * 4 - 2];
  }

  _fulfillmentHandlerAt(index) {
    // ASSERT(!this._isFollowing());
    // ASSERT(index > 0);
    // return this[index * CALLBACK_SIZE - CALLBACK_SIZE + CALLBACK_FULFILL_OFFSET];
    return this[index * 4 - 4];
  }

  _rejectionHandlerAt(index) {
    // ASSERT(!this._isFollowing());
    // ASSERT(index > 0);
    // return this[index * CALLBACK_SIZE - CALLBACK_SIZE + CALLBACK_REJECT_OFFSET];
    return this[index * 4 - 3];
  }

  _boundValue() {
  }

  _migrateCallback0(follower) {
    // const bitField = follower._bitField;
    const fulfill = follower._fulfillmentHandler0;
    const reject = follower._rejectionHandler0;
    const promise = follower._promise0;
    let receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
  }

  _migrateCallbackAt(follower, index) {
    // ASSERT(index > 0);
    const fulfill = follower._fulfillmentHandlerAt(index);
    const reject = follower._rejectionHandlerAt(index);
    const promise = follower._promiseAt(index);
    let receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
  }

  _addCallbacks(fulfill, reject, promise, receiver, context) {
    // ASSERT(typeof context === "object");
    // ASSERT(!this._isFateSealed());
    // ASSERT(!this._isFollowing());
    let index = this._length();

    // if (index >= MAX_LENGTH - CALLBACK_SIZE) {
    if (index >= 65531) {
      index = 0;
      this._setLength(0);
    }

    if (index === 0) {
      // ASSERT(this._promise0 === undefined);
      // ASSERT(this._receiver0 === undefined);
      // ASSERT(this._fulfillmentHandler0 === undefined);
      // ASSERT(this._rejectionHandler0 === undefined);

      this._promise0 = promise;
      this._receiver0 = receiver;
      if (typeof fulfill === "function") {
        this._fulfillmentHandler0 = util.contextBind(context, fulfill);
      }
      if (typeof reject === "function") {
        this._rejectionHandler0 = util.contextBind(context, reject);
      }
    } else {
      // const base = index * CALLBACK_SIZE - CALLBACK_SIZE;
      const base = index * 4 - 4;
      // ASSERT(this[base + CALLBACK_PROMISE_OFFSET] === undefined);
      // ASSERT(this[base + CALLBACK_RECEIVER_OFFSET] === undefined);
      // ASSERT(this[base + CALLBACK_FULFILL_OFFSET] === undefined);
      // ASSERT(this[base + CALLBACK_REJECT_OFFSET] === undefined);
      // this[base + CALLBACK_PROMISE_OFFSET] = promise;
      // this[base + CALLBACK_RECEIVER_OFFSET] = receiver;
      this[base + 2] = promise;
      this[base + 3] = receiver;
      if (typeof fulfill === "function") {
        // this[base + CALLBACK_FULFILL_OFFSET] = util.contextBind(context, fulfill);
        this[base] = util.contextBind(context, fulfill);
      }
      if (typeof reject === "function") {
        // this[base + CALLBACK_REJECT_OFFSET] = util.contextBind(context, reject);
        this[base + 1] = util.contextBind(context, reject);
      }
    }
    this._setLength(index + 1);
    return index;
  }

  _proxy(proxyable, arg) {
    // ASSERT(proxyable instanceof Proxyable);
    // ASSERT(!(arg instanceof Promise));
    // ASSERT(!this._isFollowing());
    // ASSERT(arguments.length === 2);
    // ASSERT(!this._isFateSealed());
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
  }

  _resolveCallback(value, shouldBind) {
    // if (BIT_FIELD_CHECK(IS_FATE_SEALED, this._bitField)) return;
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
      return this._rejectCallback(makeSelfResolutionError(), false);
    const maybePromise = tryConvertToPromise(value, this);

    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    // if (shouldBind) this._propagateFrom(maybePromise, PROPAGATE_BIND);
    if (shouldBind) this._propagateFrom(maybePromise, 2);

    const promise = maybePromise._target();

    if (promise === this) {
      this._reject(makeSelfResolutionError());
      return;
    }

    const bitField = promise._bitField;
    // if (BIT_FIELD_CHECK(IS_PENDING_AND_WAITING_NEG, bitField, true)) {
    if (((bitField & 50397184) === 0)) {
      const len = this._length();
      if (len > 0) promise._migrateCallback0(this);
      for (let i = 1; i < len; ++i) {
        promise._migrateCallbackAt(this, i);
      }
      this._setFollowing();
      this._setLength(0);
      this._setFollowee(maybePromise);
      // } else if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
    } else if (((bitField & 33554432) !== 0)) {
      this._fulfill(promise._value());
      // } else if (BIT_FIELD_CHECK(IS_REJECTED, bitField)) {
    } else if (((bitField & 16777216) !== 0)) {
      this._reject(promise._reason());
    } else {
      // const reason = new CancellationError(LATE_CANCELLATION_OBSERVER);
      const reason = new CancellationError("late cancellation observer");
      promise._attachExtraTrace(reason);
      this._reject(reason);
    }
  }

  _rejectCallback(reason, synchronous, ignoreNonErrorWarnings) {
    const trace = util.ensureErrorObject(reason);
    const hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
      const message = "a promise was rejected with a non-error: " +
        util.classString(reason);
      this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
  }

  _resolveFromExecutor(executor) {
    if (executor === INTERNAL) return;
    // ASSERT(typeof executor === "function");
    const promise = this;
    this._captureStackTrace();
    this._pushContext();
    let synchronous = true;
    const r = this._execute(executor, function (value) {
      promise._resolveCallback(value);
    }, function (reason) {
      promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
      promise._rejectCallback(r, true);
    }
  }

  _settlePromiseFromHandler(handler, receiver, value, promise) {
    let bitField = promise._bitField;
    // if (BIT_FIELD_CHECK(IS_CANCELLED, bitField)) return;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    let x;
    if (receiver === APPLY) {
      if (!value || typeof value.length !== "number") {
        x = errorObj;
        x.e = new TypeError("cannot .spread() a non-array: " +
          util.classString(value));
      } else {
        x = tryCatch(handler).apply(this._boundValue(), value);
      }
    } else {
      x = tryCatch(handler).call(receiver, value);
    }
    const promiseCreated = promise._popContext();
    bitField = promise._bitField;
    // if (BIT_FIELD_CHECK(IS_CANCELLED, bitField)) return;
    if (((bitField & 65536) !== 0)) return;

    // ASSERT(!promise._isFateSealed());

    if (x === NEXT_FILTER) {
      promise._reject(value);
    } else if (x === errorObj) {
      promise._rejectCallback(x.e, false);
    } else {
      debug.checkForgottenReturns(x, promiseCreated, "", promise, this);
      promise._resolveCallback(x);
    }
  }

  _target() {
    let ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
  }

  _followee() {
    // ASSERT(this._isFollowing());
    // ASSERT(this._rejectionHandler0 instanceof Promise);
    return this._rejectionHandler0;
  }

  _setFollowee(promise) {
    // ASSERT(this._isFollowing());
    // ASSERT(!(this._rejectionHandler0 instanceof Promise));
    this._rejectionHandler0 = promise;
  }

  _settlePromise(promise, handler, receiver, value) {
    // ASSERT(!this._isFollowing());
    const isPromise = promise instanceof Promise;
    const bitField = this._bitField;
    // const asyncGuaranteed = BIT_FIELD_CHECK(IS_ASYNC_GUARANTEED, bitField);
    const asyncGuaranteed = ((bitField & 134217728) !== 0);
    // if (BIT_FIELD_CHECK(IS_CANCELLED, bitField)) {
    if (((bitField & 65536) !== 0)) {
      if (isPromise) promise._invokeInternalOnCancel();

      if (receiver instanceof PassThroughHandlerContext &&
        receiver.isFinallyHandler()) {
        receiver.cancelPromise = promise;
        if (tryCatch(handler).call(receiver, value) === errorObj) {
          promise._reject(errorObj.e);
        }
      } else if (handler === reflectHandler) {
        promise._fulfill(reflectHandler.call(receiver));
      } else if (receiver instanceof Proxyable) {
        receiver._promiseCancelled(promise);
      } else if (isPromise || promise instanceof PromiseArray) {
        promise._cancel();
      } else {
        receiver.cancel();
      }
    } else if (typeof handler === "function") {
      //if promise is not instanceof Promise
      //it is internally smuggled data
      if (!isPromise) {
        handler.call(receiver, value, promise);
      } else {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        this._settlePromiseFromHandler(handler, receiver, value, promise);
      }
    } else if (receiver instanceof Proxyable) {
      if (!receiver._isResolved()) {
        // if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
        if (((bitField & 33554432) !== 0)) {
          receiver._promiseFulfilled(value, promise);
        } else {
          receiver._promiseRejected(value, promise);
        }
      }
    } else if (isPromise) {
      if (asyncGuaranteed) promise._setAsyncGuaranteed();
      // if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
      if (((bitField & 33554432) !== 0)) {
        promise._fulfill(value);
      } else {
        promise._reject(value);
      }
    }
  }

  _settlePromiseLateCancellationObserver(ctx) {
    const handler = ctx.handler;
    const promise = ctx.promise;
    const receiver = ctx.receiver;
    const value = ctx.value;
    if (typeof handler === "function") {
      if (!(promise instanceof Promise)) {
        handler.call(receiver, value, promise);
      } else {
        this._settlePromiseFromHandler(handler, receiver, value, promise);
      }
    } else if (promise instanceof Promise) {
      promise._reject(value);
    }
  }

  _settlePromiseCtx(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
  }

  _settlePromise0(handler, value) {
    const promise = this._promise0;
    const receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
  }

  _clearCallbackDataAtIndex(index) {
    // ASSERT(!this._isFollowing());
    // ASSERT(index > 0);
    // const base = index * CALLBACK_SIZE - CALLBACK_SIZE;
    // this[base + CALLBACK_PROMISE_OFFSET] =
    //   this[base + CALLBACK_RECEIVER_OFFSET] =
    //   this[base + CALLBACK_FULFILL_OFFSET] =
    //   this[base + CALLBACK_REJECT_OFFSET] = undefined;
    const base = index * 4 - 4;
    this[base + 2] =
      this[base + 3] =
      this[base] =
      this[base + 1] = undefined;
  }

  _fulfill(value) {
    const bitField = this._bitField;
    // if (BIT_FIELD_READ(IS_FATE_SEALED, bitField)) return;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
      const err = makeSelfResolutionError();
      this._attachExtraTrace(err);
      return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    // if (BIT_FIELD_READ(LENGTH_MASK, bitField) > 0) {
    if ((bitField & 65535) > 0) {
      // if (BIT_FIELD_CHECK(IS_ASYNC_GUARANTEED, bitField)) {
      if (((bitField & 134217728) !== 0)) {
        this._settlePromises();
      } else {
        async.settlePromises(this);
      }
      this._dereferenceTrace();
    }
  }

  _reject(reason) {
    const bitField = this._bitField;
    // if (BIT_FIELD_READ(IS_FATE_SEALED, bitField)) return;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
      // ASSERT(this._length() === 0);
      return async.fatalError(reason, util.isNode);
    }

    // if (BIT_FIELD_READ(LENGTH_MASK, bitField) > 0) {
    if ((bitField & 65535) > 0) {
      async.settlePromises(this);
    } else {
      this._ensurePossibleRejectionHandled();
    }
  }

  _fulfillPromises(len, value) {
    for (let i = 1; i < len; i++) {
      const handler = this._fulfillmentHandlerAt(i);
      const promise = this._promiseAt(i);
      const receiver = this._receiverAt(i);
      this._clearCallbackDataAtIndex(i);
      this._settlePromise(promise, handler, receiver, value);
    }
  }

  _rejectPromises(len, reason) {
    for (let i = 1; i < len; i++) {
      const handler = this._rejectionHandlerAt(i);
      const promise = this._promiseAt(i);
      const receiver = this._receiverAt(i);
      this._clearCallbackDataAtIndex(i);
      this._settlePromise(promise, handler, receiver, reason);
    }
  }

  _settlePromises() {
    const bitField = this._bitField;
    // const len = BIT_FIELD_READ(LENGTH_MASK, bitField);
    const len = (bitField & 65535);

    if (len > 0) {
      // if (BIT_FIELD_CHECK(IS_REJECTED_OR_CANCELLED, bitField)) {
      if (((bitField & 16842752) !== 0)) {
        const reason = this._fulfillmentHandler0;
        this._settlePromise0(this._rejectionHandler0, reason, bitField);
        this._rejectPromises(len, reason);
      } else {
        const value = this._rejectionHandler0;
        this._settlePromise0(this._fulfillmentHandler0, value, bitField);
        this._fulfillPromises(len, value);
      }
      this._setLength(0);
    }
    this._clearCancellationData();
  }

  _settledValue() {
    // ASSERT(!this._isFollowing());
    // ASSERT(this._isFateSealed());
    const bitField = this._bitField;
    // if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
    if (((bitField & 33554432) !== 0)) {
      return this._rejectionHandler0;
      // } else if (BIT_FIELD_CHECK(IS_REJECTED, bitField)) {
    } else if (((bitField & 16777216) !== 0)) {
      return this._fulfillmentHandler0;
    }
    // Implicit undefined for cancelled promise.
  }


  static is(val) {
    return val instanceof Promise;
  }

  static all(promises) {
    return new PromiseArray(promises).promise();
  }

  static cast(obj) {
    let ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
      ret = new Promise(INTERNAL);
      ret._captureStackTrace();
      ret._setFulfilled();
      ret._rejectionHandler0 = obj;
    }
    return ret;
  }

  static setScheduler(fn) {
    if (typeof fn !== "function") {
      // throw new TypeError(FUNCTION_ERROR + util.classString(fn));
      throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
  }

}

let getContext = util.isNode ? getContextDomain : getContextDefault;
util.notEnumerableProp(Promise, "_getContext", getContext);
const enableAsyncHooks = () => {
  getContext = getContextAsyncHooks;
  util.notEnumerableProp(Promise, "_getContext", getContextAsyncHooks);
};
const disableAsyncHooks = () => {
  getContext = getContextDomain;
  util.notEnumerableProp(Promise, "_getContext", getContextDomain);
};

const async = new Async();
Object.defineProperty(Promise, "_async", { value: async });
const TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
const CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;

const INTERNAL = function () { };
const APPLY = {};
const NEXT_FILTER = {};
const tryConvertToPromise = _thenables(Promise, INTERNAL);
const PromiseArray = _promise_array(Promise, INTERNAL, tryConvertToPromise, apiRejection, Proxyable);
const Context = _context(Promise);
const createContext = Context.create;
const debug = _debuggability(Promise, Context, enableAsyncHooks, disableAsyncHooks);
// const CapturedTrace = debug.CapturedTrace;
const PassThroughHandlerContext = _finally(Promise, tryConvertToPromise, NEXT_FILTER);
const catchFilter = _catch_filter(NEXT_FILTER);
const errorObj = util.errorObj;
const tryCatch = util.tryCatch;

const check = (self, executor) => {
  if (self == null || self.constructor !== Promise) {
    // throw new TypeError(CONSTRUCT_ERROR_INVOCATION);
    throw new TypeError("the promise constructor cannot be invoked directly");
  }
  if (typeof executor !== "function") {
    // throw new TypeError(FUNCTION_ERROR + util.classString(executor));
    throw new TypeError("expecting a function but got " + util.classString(executor));
  }
};

Promise.prototype.caught = Promise.prototype.catch = function (...args) {
  const len = args.length;

  if (len > 1) {
    const catchInstances = [];
    for (let i = 0; i < len - 1; ++i) {
      const item = args[i];
      if (util.isObject(item)) {
        catchInstances.push(item);
      } else {
        // return apiRejection("Catch statement predicate: " +
        //   OBJECT_ERROR + util.classString(item));
        return apiRejection("Catch statement predicate: " +
          "expecting an object but got " + util.classString(item));
      }
    }

    const fn = args[len - 1];
    if (typeof fn !== "function") {
      throw new TypeError("The last argument to .catch() must be a function, got " + util.toString(fn));
    }

    return this.then(undefined, catchFilter(catchInstances, fn, this));
  }
  return this.then(undefined, args[0]);
};

Promise.fromNode = Promise.fromCallback = function (fn) {
  const ret = new Promise(INTERNAL);
  ret._captureStackTrace();
  const multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
    : false;
  const result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
  if (result === errorObj) {
    ret._rejectCallback(result.e, true);
  }
  if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
  return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
  const ret = new Promise(INTERNAL);
  ret._captureStackTrace();
  ret._rejectCallback(reason, true);
  return ret;
};


if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
  Object.defineProperty(Promise.prototype, Symbol.toStringTag, {
    get: function () {
      return "Object";
    }
  });
}

function deferResolve(v) { this.promise._resolveCallback(v); }
function deferReject(v) { this.promise._rejectCallback(v, false); }

Promise.defer = Promise.pending = function () {
  debug.deprecated("Promise.defer", "new Promise");
  const promise = new Promise(INTERNAL);
  return {
    promise: promise,
    resolve: deferResolve,
    reject: deferReject
  };
};

util.notEnumerableProp(Promise, "_makeSelfResolutionError", makeSelfResolutionError);

_method(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug);
_bind(Promise, INTERNAL, tryConvertToPromise, debug);
_cancel(Promise, PromiseArray, apiRejection, debug);
_direct_resolve(Promise);
_synchronous_inspection(Promise);
_join(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async);

Promise.Promise = Promise;
Promise.version = "0.0.1";

_call_get(Promise);
_generators(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_map(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_nodeify(Promise);
_promisify(Promise, INTERNAL);
_props(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_race(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_reduce(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_settle(Promise, PromiseArray, debug);
_some(Promise, PromiseArray, apiRejection);
_timers(Promise, INTERNAL, debug);
_using(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_any(Promise);
_each(Promise, INTERNAL);
_filter(Promise, INTERNAL);

util.toFastProperties(Promise);
util.toFastProperties(Promise.prototype);
function fillTypes(value) {
  const p = new Promise(INTERNAL);
  p._fulfillmentHandler0 = value;
  p._rejectionHandler0 = value;
  p._promise0 = value;
  p._receiver0 = value;
}
// Complete slack tracking, opt out of field-type tracking and
// stabilize map
fillTypes({ a: 1 });
fillTypes({ b: 2 });
fillTypes({ c: 3 });
fillTypes(1);
fillTypes(function () { });
fillTypes(undefined);
fillTypes(false);
fillTypes(new Promise(INTERNAL));
debug.setBounds(firstLineError, util.lastLineError);
export default Promise;
