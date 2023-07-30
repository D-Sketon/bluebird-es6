'use strict';

var async_hooks = require('async_hooks');

var es5 = {
  propertyIsWritable: (obj, prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    return !!(!descriptor || descriptor.writable || descriptor.set);
  }
};

const canEvaluate$1 = typeof navigator === "undefined";
const errorObj$2 = { e: {} };
let tryCatchTarget;
const globalObject =
  typeof self !== "undefined"
    ? self
    : typeof window !== "undefined"
      ? window
      : typeof global !== "undefined"
        ? global
        : undefined !== undefined
          ? undefined
          : null;
function tryCatcher() {
  try {
    const target = tryCatchTarget;
    tryCatchTarget = null;
    return target.apply(this, arguments);
  } catch (e) {
    errorObj$2.e = e;
    return errorObj$2;
  }
}
function tryCatch$2(fn) {
  tryCatchTarget = fn;
  return tryCatcher;
}
const inherits$1 = (Child, Parent) => {
  const hasProp = {}.hasOwnProperty;
  function T() {
    this.constructor = Child;
    this.constructor$ = Parent;
    for (const propertyName in Parent.prototype) {
      if (
        hasProp.call(Parent.prototype, propertyName) &&
        propertyName.charAt(propertyName.length - 1) !== "$"
      ) {
        this[propertyName + "$"] = Parent.prototype[propertyName];
      }
    }
  }
  T.prototype = Parent.prototype;
  Child.prototype = new T();
  return Child.prototype;
};
function isPrimitive(val) {
  return (
    val == null ||
    val === true ||
    val === false ||
    typeof val === "string" ||
    typeof val === "number"
  );
}
function isObject(value) {
  return typeof value === "function" || typeof value === "object" && value !== null;
}
function maybeWrapAsError$1(maybeError) {
  if (!isPrimitive(maybeError)) return maybeError;
  return new Error(safeToString(maybeError));
}
function withAppended(target, appendee) {
  const len = target.length;
  const ret = new Array(len + 1);
  let i;
  for (i = 0; i < len; ++i) {
    ret[i] = target[i];
  }
  ret[i] = appendee;
  return ret;
}
function getDataPropertyOrDefault(obj, key, defaultValue) {
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  if (desc != null) {
    return desc.get == null && desc.set == null ? desc.value : defaultValue;
  }
}
function notEnumerableProp$1(obj, name, value) {
  if (isPrimitive(obj)) return obj;
  const descriptor = {
    value: value,
    configurable: true,
    enumerable: false,
    writable: true,
  };
  Object.defineProperty(obj, name, descriptor);
  return obj;
}
function thrower(r) {
  throw r;
}
const inheritedDataKeys = (() => {
  const excludedPrototypes = [
    Array.prototype,
    Object.prototype,
    Function.prototype,
  ];
  const isExcludedProto = (val) => excludedPrototypes.includes(val);
  const getKeys = Object.getOwnPropertyNames;
  return (obj) => {
    const ret = [];
    const visitedKeys = Object.create(null);
    while (obj !== null && !isExcludedProto(obj)) {
      let keys;
      try {
        keys = getKeys(obj);
      } catch (e) {
        return ret;
      }
      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (visitedKeys[key]) continue;
        visitedKeys[key] = true;
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc != null && desc.get == null && desc.set == null) {
          ret.push(key);
        }
      }
      obj = Object.getPrototypeOf(obj);
    }
    return ret;
  };
})();
function isClass(fn) {
  return !!fn?.prototype && !!fn?.prototype.constructor.name;
}
let fastProto = null;
const kInlineCacheCutoff = 10;
function FastObject(o) {
  if (fastProto !== null && typeof fastProto.property) {
    const result = fastProto;
    fastProto = FastObject.prototype = null;
    return result;
  }
  fastProto = FastObject.prototype = o == null ? Object.create(null) : o;
  return new FastObject();
}
for (let i = 0; i <= kInlineCacheCutoff; i++) {
  FastObject({});
}
function toFastProperties(obj) {
  FastObject(obj);
  return obj;
}
const rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
  return rident.test(str);
}
function filledRange(count, prefix, suffix) {
  const ret = new Array(count);
  for (let i = 0; i < count; ++i) {
    ret[i] = prefix + i + suffix;
  }
  return ret;
}
function safeToString(obj) {
  try {
    return String(obj);
  } catch (e) {
    return "[no string representation]";
  }
}
function isError(obj) {
  return (
    obj instanceof Error ||
    (obj !== null &&
      typeof obj === "object" &&
      typeof obj.message === "string" &&
      typeof obj.name === "string")
  );
}
function markAsOriginatingFromRejection$1(e) {
  try {
    notEnumerableProp$1(e, "isOperational", true);
  } catch (ignore) { }
}
function originatesFromRejection(e) {
  if (e == null) return false;
  return (
    (e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
    e["isOperational"] === true
  );
}
function canAttachTrace(obj) {
  return isError(obj) && es5.propertyIsWritable(obj, "stack");
}
const ensureErrorObject = (() => {
  if (!("stack" in new Error())) {
    return (value) => {
      if (canAttachTrace(value)) return value;
      try {
        throw new Error(safeToString(value));
      } catch (err) {
        return err;
      }
    };
  } else {
    return (value) => {
      if (canAttachTrace(value)) return value;
      return new Error(safeToString(value));
    };
  }
})();
function classString(obj) {
  return Object.prototype.toString.call(obj);
}
function copyDescriptors(from, to, filter) {
  const keys = Object.getOwnPropertyNames(from);
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    if (filter(key)) {
      try {
        Object.defineProperty(to, key, Object.getOwnPropertyDescriptor(from, key));
      } catch (ignore) { }
    }
  }
}
const asArray = (v) => {
  if (Array.isArray(v)) {
    return v;
  } else if (v != null && typeof v[Symbol.iterator] === "function") {
    return Array.from(v);
  }
  return null;
};
const isNode =
  typeof process !== "undefined" &&
  classString(process).toLowerCase() === "[object process]";
const hasEnvVariables =
  typeof process !== "undefined" && typeof process.env !== "undefined";
const env = (key) => (hasEnvVariables ? process.env[key] : undefined);
function getNativePromise() {
  if (typeof Promise === "function") {
    try {
      const promise = new Promise(() => { });
      if (classString(promise) === "[object Promise]") {
        return Promise;
      }
    } catch (e) { }
  }
}
let reflectHandler$1;
const contextBind = (ctx, cb) => {
  if (
    ctx === null ||
    typeof cb !== "function" ||
    cb === reflectHandler$1
  ) {
    return cb;
  }
  if (ctx.domain !== null) {
    cb = ctx.domain.bind(cb);
  }
  const async = ctx.async;
  if (async !== null) {
    const old = cb;
    cb = function () {
      const len = arguments.length + 2;
      const args = new Array(len);
      for (let i = 2; i < len; ++i) {
        args[i] = arguments[i - 2];
      }      args[0] = old;
      args[1] = this;
      return async.runInAsyncScope.apply(async, args);
    };
  }
  return cb;
};
const ret = {
  setReflectHandler: (fn) => reflectHandler$1 = fn,
  isClass,
  isIdentifier,
  inheritedDataKeys,
  getDataPropertyOrDefault,
  thrower,
  asArray,
  notEnumerableProp: notEnumerableProp$1,
  isPrimitive,
  isObject,
  isError,
  canEvaluate: canEvaluate$1,
  errorObj: errorObj$2,
  tryCatch: tryCatch$2,
  inherits: inherits$1,
  withAppended,
  maybeWrapAsError: maybeWrapAsError$1,
  toFastProperties,
  filledRange,
  toString: safeToString,
  canAttachTrace,
  ensureErrorObject,
  originatesFromRejection,
  markAsOriginatingFromRejection: markAsOriginatingFromRejection$1,
  classString,
  copyDescriptors,
  isNode,
  hasEnvVariables,
  env,
  global: globalObject,
  getNativePromise,
  contextBind
};
ret.isRecentNode = ret.isNode && (() => {
  let version;
  if (process.versions && process.versions.node) {
    version = process.versions.node.split(".").map(Number);
  } else if (process.version) {
    version = process.version.split(".").map(Number);
  }
  return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();
ret.nodeSupportsAsyncResource = ret.isNode && (() => {
  let supportsAsync;
  try {
    const res = async_hooks.AsyncResource;
    supportsAsync = typeof res.prototype?.runInAsyncScope === "function";
  } catch (e) {
    supportsAsync = false;
  }
  return supportsAsync;
})();
if (ret.isNode) ret.toFastProperties(process);
try {
  throw new Error();
} catch (e) {
  ret.lastLineError = e;
}

let schedule;
const noAsyncScheduler = () => {
  throw new Error("No async scheduler available");
};
const NativePromise = ret.getNativePromise();
if (ret.isNode && typeof MutationObserver === "undefined") {
  const GlobalSetImmediate = global.setImmediate;
  const ProcessNextTick = process.nextTick;
  schedule = ret.isRecentNode
    ? (fn) => GlobalSetImmediate.call(global, fn)
    : (fn) => ProcessNextTick.call(process, fn);
} else if (typeof NativePromise === "function" &&
  typeof NativePromise.resolve === "function") {
  const nativePromise = NativePromise.resolve();
  schedule = (fn) => nativePromise.then(fn);
} else if ((typeof MutationObserver !== "undefined") &&
  !(typeof window !== "undefined" &&
    window.navigator &&
    (window.navigator.standalone || window.cordova)) &&
  ("classList" in document.documentElement)) {
  schedule = (() => {
    const div = document.createElement("div");
    const opts = { attributes: true };
    let toggleScheduled = false;
    const div2 = document.createElement("div");
    const o2 = new MutationObserver(function () {
      div.classList.toggle("foo");
      toggleScheduled = false;
    });
    o2.observe(div2, opts);
    const scheduleToggle = function () {
      if (toggleScheduled) return;
      toggleScheduled = true;
      div2.classList.toggle("foo");
    };
    return function schedule(fn) {
      const o = new MutationObserver(function () {
        o.disconnect();
        fn();
      });
      o.observe(div, opts);
      scheduleToggle();
    };
  })();
} else if (typeof setImmediate !== "undefined") {
  schedule = function (fn) {
    setImmediate(fn);
  };
} else if (typeof setTimeout !== "undefined") {
  schedule = function (fn) {
    setTimeout(fn, 0);
  };
} else {
  schedule = noAsyncScheduler;
}
var schedule$1 = schedule;

function arrayMove(src, srcIndex, dst, dstIndex, len) {
  for (let j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = undefined;
  }
}
class Queue {
  constructor(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
  }
  _willBeOverCapacity(size) {
    return this._capacity < size;
  }
  _pushOne(arg) {
    const length = this.length();
    this._checkCapacity(length + 1);
    const i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
  }
  push(fn, receiver, arg) {
    const length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
      this._pushOne(fn);
      this._pushOne(receiver);
      this._pushOne(arg);
      return;
    }
    const j = this._front + length - 3;
    this._checkCapacity(length);
    const wrapMask = this._capacity - 1;
    this[(j) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
  }
  shift() {
    const front = this._front;
    const ret = this[front];
    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
  }
  length() {
    return this._length;
  }
  _checkCapacity(size) {
    if (this._capacity < size) {
      this._resizeTo(this._capacity << 1);
    }
  }
  _resizeTo(capacity) {
    const oldCapacity = this._capacity;
    this._capacity = capacity;
    const front = this._front;
    const length = this._length;
    const moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
  }
}

class Async {
  constructor() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._schedule = schedule$1;
    this.drainQueues = () => {
      this._drainQueues();
    };
  }
  setScheduler(fn) {
    const prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
  }
  hasCustomScheduler() {
    return this._customScheduler;
  }
  haveItemsQueued() {
    return this._isTickUsed || this._haveDrainedQueues;
  }
  fatalError(e, isNode) {
    if (isNode) {
      process.stderr.write(`Fatal ${e instanceof Error ? e.stack : e}\n`);
      process.exit(2);
    } else {
      this.throwLater(e);
    }
  }
  throwLater(fn, arg) {
    if (arguments.length === 1) {
      arg = fn;
      fn = () => { throw arg; };
    }
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        fn(arg);
      }, 0);
    } else {
      try {
        this._schedule(() => {
          fn(arg);
        });
      } catch (e) {
        throw new Error('No async scheduler available');
      }
    }
  }
  invokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
  }
  invoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
  }
  settlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
  }
  _drainQueues() {
    _drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    _drainQueue(this._lateQueue);
  }
  _queueTick() {
    if (!this._isTickUsed) {
      this._isTickUsed = true;
      this._schedule(this.drainQueues);
    }
  }
  _reset() {
    this._isTickUsed = false;
  }
}
function _drainQueue(queue) {
  while (queue.length() > 0) {
    _drainQueueStep(queue);
  }
}
function _drainQueueStep(queue) {
  const fn = queue.shift();
  if (typeof fn !== 'function') {
    fn._settlePromises();
  } else {
    const receiver = queue.shift();
    const arg = queue.shift();
    fn.call(receiver, arg);
  }
}
const firstLineError = (() => {
  try {
    throw new Error();
  } catch (e) {
    return e;
  }
})();

const OPERATIONAL_ERROR_KEY = "isOperational";
const BLUEBIRD_ERRORS = "__BluebirdErrorTypes__";
const PROPAGATE_CANCEL = 1;
const PROPAGATE_BIND = 2;
const PROPAGATE_ALL = PROPAGATE_CANCEL | PROPAGATE_BIND;
const IS_FULFILLED = 0x2000000 | 0;
const IS_REJECTED = 0x1000000 | 0;
const FINALLY_TYPE = 0;
const TAP_TYPE = 1;
const LATE_CANCELLATION_OBSERVER = "late cancellation observer";
const COLLECTION_ERROR = "expecting an array or an iterable object but got ";
const OBJECT_ERROR = "expecting an object but got ";

const { inherits, notEnumerableProp } = ret;
function subError(nameProperty, defaultMessage) {
  function SubError(message) {
    if (!(this instanceof SubError)) return new SubError(message);
    notEnumerableProp(this, "message",
      typeof message === "string" ? message : defaultMessage);
    notEnumerableProp(this, "name", nameProperty);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      Error.call(this);
    }
  }
  inherits(SubError, Error);
  return SubError;
}
let _TypeError, _RangeError;
const Warning = subError("Warning", "warning");
const CancellationError$1 = subError("CancellationError", "cancellation error");
const TimeoutError = subError("TimeoutError", "timeout error");
const AggregateError = subError("AggregateError", "aggregate error");
try {
  _TypeError = TypeError;
  _RangeError = RangeError;
} catch (e) {
  _TypeError = subError("TypeError", "type error");
  _RangeError = subError("RangeError", "range error");
}
const methods = [
  "join",
  "pop",
  "push",
  "shift",
  "unshift",
  "slice",
  "filter",
  "forEach",
  "some",
  "every",
  "map",
  "indexOf",
  "lastIndexOf",
  "reduce",
  "reduceRight",
  "sort",
  "reverse",
];
methods.forEach((method) => {
  if (typeof Array.prototype[method] === "function") {
    AggregateError.prototype[method] = Array.prototype[method];
  }
});
Object.defineProperty(AggregateError.prototype, "length", {
  value: 0,
  configurable: false,
  writable: true,
  enumerable: true,
});
AggregateError.prototype[OPERATIONAL_ERROR_KEY] = true;
let level = 0;
AggregateError.prototype.toString = function () {
  const indent = Array(level * 4 + 1).join(" ");
  let ret = "\n" + indent + "AggregateError of:" + "\n";
  level++;
  for (let i = 0; i < this.length; ++i) {
    const str =
      this[i] === this ? "[Circular AggregateError]" : this[i] + "";
    const lines = str.split("\n");
    for (let j = 0; j < lines.length; ++j) {
      lines[j] = indent + lines[j];
    }
    const formattedStr = lines.join("\n");
    ret += formattedStr + "\n";
  }
  level--;
  return ret;
};
function OperationalError$1(message) {
  if (!(this instanceof OperationalError$1))
    return new OperationalError$1(message);
  notEnumerableProp(this, "name", "OperationalError");
  notEnumerableProp(this, "message", message);
  this.cause = message;
  this[OPERATIONAL_ERROR_KEY] = true;
  if (message instanceof Error) {
    notEnumerableProp(this, "message", message.message);
    notEnumerableProp(this, "stack", message.stack);
  } else if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  }
}
inherits(OperationalError$1, Error);
let errorTypes = Error[BLUEBIRD_ERRORS];
if (!errorTypes) {
  errorTypes = Object.freeze({
    CancellationError: CancellationError$1,
    TimeoutError,
    OperationalError: OperationalError$1,
    RejectionError: OperationalError$1,
    AggregateError,
  });
  Object.defineProperty(Error, BLUEBIRD_ERRORS, {
    value: errorTypes,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}
var errors = {
  Error: Error,
  TypeError: _TypeError,
  RangeError: _RangeError,
  CancellationError: errorTypes.CancellationError,
  OperationalError: errorTypes.OperationalError,
  TimeoutError: errorTypes.TimeoutError,
  AggregateError: errorTypes.AggregateError,
  Warning: Warning,
};

var _thenables = (Promise, INTERNAL) => {
  const errorObj = ret.errorObj;
  const isObject = ret.isObject;
  function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
      if (obj instanceof Promise) return obj;
      const then = getThen(obj);
      if (then === errorObj) {
        if (context) context._pushContext();
        const ret = Promise.reject(then.e);
        if (context) context._popContext();
        return ret;
      } else if (typeof then === "function") {
        if (isAnyBluebirdPromise(obj)) {
          const ret = new Promise(INTERNAL);
          obj._then(ret._fulfill, ret._reject, undefined, ret, null);
          return ret;
        }
        return doThenable(obj, then, context);
      }
    }
    return obj;
  }
  function doGetThen(obj) {
    return obj.then;
  }
  function getThen(obj) {
    try {
      return doGetThen(obj);
    } catch (e) {
      errorObj.e = e;
      return errorObj;
    }
  }
  const hasProp = Object.prototype.hasOwnProperty;
  function isAnyBluebirdPromise(obj) {
    try {
      return hasProp.call(obj, "_promise0");
    } catch (e) {
      return false;
    }
  }
  function doThenable(x, then, context) {
    let promise = new Promise(INTERNAL);
    const ret$1 = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    let synchronous = true;
    const result = ret.tryCatch(then).call(x, resolve, reject);
    synchronous = false;
    if (promise && result === errorObj) {
      promise._rejectCallback(result.e, true, true);
      promise = null;
    }
    function resolve(value) {
      if (!promise) return;
      promise._resolveCallback(value);
      promise = null;
    }
    function reject(reason) {
      if (!promise) return;
      promise._rejectCallback(reason, synchronous, true);
      promise = null;
    }
    return ret$1;
  }
  return tryConvertToPromise;
};

var _promise_array = (Promise, INTERNAL, tryConvertToPromise, apiRejection, Proxyable) => {
  function toResolutionValue(val) {
    switch (val) {
      case -2: return [];
      case -3: return {};
      case -6: return new Map();
    }
  }
  function PromiseArray(values) {
    const promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
      promise._propagateFrom(values, 3);
      values.suppressUnhandledRejections();
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
  }
  ret.inherits(PromiseArray, Proxyable);
  PromiseArray.prototype.length = function () {
    return this._length;
  };
  PromiseArray.prototype.promise = function () {
    return this._promise;
  };
  PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    let values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
      values = values._target();
      const bitField = values._bitField;
      this._values = values;
      if (((bitField & 50397184) === 0)) {
        this._promise._setAsyncGuaranteed();
        return values._then(this._init, this._reject, undefined, this, resolveValueIfEmpty);
      } else if (((bitField & 33554432) !== 0)) {
        values = values._value();
      } else if (((bitField & 16777216) !== 0)) {
        return this._reject(values._reason());
      } else {
        return this._cancel();
      }
    }
    values = ret.asArray(values);
    if (values === null) {
      const err = apiRejection(
        "expecting an array or an iterable object but got " + ret.classString(values)).reason();
      this._promise._rejectCallback(err, false);
      return;
    }
    if (values.length === 0) {
      if (resolveValueIfEmpty === -5) {
        this._resolveEmptyArray();
      } else {
        this._resolve(toResolutionValue(resolveValueIfEmpty));
      }
      return;
    }
    this._iterate(values);
  };
  PromiseArray.prototype._iterate = function (values) {
    const len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    const result = this._promise;
    let isResolved = false;
    let bitField = null;
    for (let i = 0; i < len; ++i) {
      let maybePromise = tryConvertToPromise(values[i], result);
      if (maybePromise instanceof Promise) {
        maybePromise = maybePromise._target();
        bitField = maybePromise._bitField;
      } else {
        bitField = null;
      }
      if (isResolved) {
        if (bitField !== null) {
          maybePromise.suppressUnhandledRejections();
        }
      } else if (bitField !== null) {
        if (((bitField & 50397184) === 0)) {
          maybePromise._proxy(this, i);
          this._values[i] = maybePromise;
        } else if (((bitField & 33554432) !== 0)) {
          isResolved = this._promiseFulfilled(maybePromise._value(), i);
        } else if (((bitField & 16777216) !== 0)) {
          isResolved = this._promiseRejected(maybePromise._reason(), i);
        } else {
          isResolved = this._promiseCancelled(i);
        }
      } else {
        isResolved = this._promiseFulfilled(maybePromise, i);
      }
    }
    if (!isResolved) result._setAsyncGuaranteed();
  };
  PromiseArray.prototype._isResolved = function () {
    return this._values === null;
  };
  PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
  };
  PromiseArray.prototype._cancel = function () {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
  };
  PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
  };
  PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    const totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
      this._resolve(this._values);
      return true;
    }
    return false;
  };
  PromiseArray.prototype._promiseCancelled = function () {
    this._cancel();
    return true;
  };
  PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
  };
  PromiseArray.prototype._resultCancelled = function () {
    if (this._isResolved()) return;
    const values = this._values;
    this._cancel();
    if (values instanceof Promise) {
      values.cancel();
    } else {
      for (let i = 0; i < values.length; ++i) {
        if (values[i] instanceof Promise) {
          values[i].cancel();
        }
      }
    }
  };
  PromiseArray.prototype.shouldCopyValues = function () {
    return true;
  };
  PromiseArray.prototype.getActualLength = function (len) {
    return len;
  };
  return PromiseArray;
};

var _context = (Promise) => {
  let longStackTraces = false;
  const contextStack = [];
  Promise.prototype._promiseCreated = function () { };
  Promise.prototype._pushContext = function () { };
  Promise.prototype._popContext = function () { return null; };
  Promise._peekContext = Promise.prototype._peekContext = function () { };
  class Context {
    constructor() {
      this._trace = new Context.CapturedTrace(peekContext());
    }
    static deactivateLongStackTraces() { }
    static activateLongStackTraces() {
      const Promise_pushContext = Promise.prototype._pushContext;
      const Promise_popContext = Promise.prototype._popContext;
      const Promise_PeekContext = Promise._peekContext;
      const Promise_peekContext = Promise.prototype._peekContext;
      const Promise_promiseCreated = Promise.prototype._promiseCreated;
      Context.deactivateLongStackTraces = function () {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
      };
      longStackTraces = true;
      Promise.prototype._pushContext = Context.prototype._pushContext;
      Promise.prototype._popContext = Context.prototype._popContext;
      Promise._peekContext = Promise.prototype._peekContext = peekContext;
      Promise.prototype._promiseCreated = function () {
        const ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
      };
    }
    _pushContext() {
      if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
      }
    }
    _popContext() {
      if (this._trace !== undefined) {
        const trace = contextStack.pop();
        const ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
      }
      return null;
    }
  }
  function createContext() {
    if (longStackTraces) return new Context();
  }
  function peekContext() {
    const lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
      return contextStack[lastIndex];
    }
    return undefined;
  }
  Context.CapturedTrace = null;
  Context.create = createContext;
  return Context;
};

var _debuggability = (Promise, Context, enableAsyncHooks, disableAsyncHooks) => {
  const async = Promise._async;
  const Warning = errors.Warning;
  const canAttachTrace = ret.canAttachTrace;
  let unhandledRejectionHandled;
  let possiblyUnhandledRejection;
  const bluebirdFramePattern = /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
  const nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
  const parseLinePattern = /[\/<(](.+?):(\d+):(\d+)\)?\s*$/;
  let stackFramePattern = null;
  let formatStack = null;
  let indentStackFrames = false;
  let printWarning;
  let debugging = !!(ret.env("BLUEBIRD_DEBUG") !== 0 &&
    (ret.env("BLUEBIRD_DEBUG") || ret.env("NODE_ENV") === "development"));
  let warnings = !!(ret.env("BLUEBIRD_WARNINGS") !== 0 &&
    (debugging || ret.env("BLUEBIRD_WARNINGS")));
  let longStackTraces = !!(ret.env("BLUEBIRD_LONG_STACK_TRACES") !== 0 &&
    (debugging || ret.env("BLUEBIRD_LONG_STACK_TRACES")));
  let wForgottenReturn = ret.env("BLUEBIRD_W_FORGOTTEN_RETURN") !== 0 &&
    (warnings || !!ret.env("BLUEBIRD_W_FORGOTTEN_RETURN"));
  let deferUnhandledRejectionCheck;
  (function () {
    const promises = [];
    function unhandledRejectionCheck() {
      for (let i = 0; i < promises.length; ++i) {
        promises[i]._notifyUnhandledRejection();
      }
      unhandledRejectionClear();
    }
    function unhandledRejectionClear() {
      promises.length = 0;
    }
    deferUnhandledRejectionCheck = function (promise) {
      promises.push(promise);
      setTimeout(unhandledRejectionCheck, 1);
    };
    Object.defineProperty(Promise, "_unhandledRejectionCheck", {
      value: unhandledRejectionCheck
    });
    Object.defineProperty(Promise, "_unhandledRejectionClear", {
      value: unhandledRejectionClear
    });
  })();
  Promise.prototype.suppressUnhandledRejections = function () {
    const target = this._target();
    target._bitField = ((target._bitField & (~1048576)) | 524288);
  };
  Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    deferUnhandledRejectionCheck(this);
  };
  Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
      unhandledRejectionHandled, undefined, this);
  };
  Promise.prototype._setReturnedNonUndefined = function () {
    this._bitField = this._bitField | 268435456;
  };
  Promise.prototype._returnedNonUndefined = function () {
    return (this._bitField & 268435456) !== 0;
  };
  Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
      const reason = this._settledValue();
      this._setUnhandledRejectionIsNotified();
      fireRejectionEvent("unhandledRejection",
        possiblyUnhandledRejection, reason, this);
    }
  };
  Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
  };
  Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
  };
  Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
  };
  Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
  };
  Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
      this._unsetUnhandledRejectionIsNotified();
      this._notifyUnhandledRejectionIsHandled();
    }
  };
  Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
  };
  Promise.prototype._warn = function (message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
  };
  Promise.onPossiblyUnhandledRejection = function (fn) {
    const context = Promise._getContext();
    possiblyUnhandledRejection = ret.contextBind(context, fn);
  };
  Promise.onUnhandledRejectionHandled = function (fn) {
    const context = Promise._getContext();
    unhandledRejectionHandled = ret.contextBind(context, fn);
  };
  let disableLongStackTraces = function () { };
  Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
      throw new Error("cannot enable long stack traces after promises have been created");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
      const Promise_captureStackTrace = Promise.prototype._captureStackTrace;
      const Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
      const Promise_dereferenceTrace = Promise.prototype._dereferenceTrace;
      config.longStackTraces = true;
      disableLongStackTraces = function () {
        if (async.haveItemsQueued() && !config.longStackTraces) {
          throw new Error("cannot enable long stack traces after promises have been created");
        }
        Promise.prototype._captureStackTrace = Promise_captureStackTrace;
        Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
        Promise.prototype._dereferenceTrace = Promise_dereferenceTrace;
        Context.deactivateLongStackTraces();
        config.longStackTraces = false;
      };
      Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
      Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
      Promise.prototype._dereferenceTrace = longStackTracesDereferenceTrace;
      Context.activateLongStackTraces();
    }
  };
  Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
  };
  const legacyHandlers = {
    unhandledrejection: {
      before: function () {
        const ret$1 = ret.global.onunhandledrejection;
        ret.global.onunhandledrejection = null;
        return ret$1;
      },
      after: function (fn) {
        ret.global.onunhandledrejection = fn;
      }
    },
    rejectionhandled: {
      before: function () {
        const ret$1 = ret.global.onrejectionhandled;
        ret.global.onrejectionhandled = null;
        return ret$1;
      },
      after: function (fn) {
        ret.global.onrejectionhandled = fn;
      }
    }
  };
  const fireDomEvent = (function () {
    const dispatch = function (legacy, e) {
      if (legacy) {
        let fn;
        try {
          fn = legacy.before();
          return !ret.global.dispatchEvent(e);
        } finally {
          legacy.after(fn);
        }
      } else {
        return !ret.global.dispatchEvent(e);
      }
    };
    try {
      if (typeof CustomEvent === "function") {
        const event = new CustomEvent("CustomEvent");
        ret.global.dispatchEvent(event);
        return function (name, event) {
          name = name.toLowerCase();
          const eventData = {
            detail: event,
            cancelable: true
          };
          const domEvent = new CustomEvent(name, eventData);
          Object.defineProperty(
            domEvent, "promise", { value: event.promise });
          Object.defineProperty(
            domEvent, "reason", { value: event.reason });
          return dispatch(legacyHandlers[name], domEvent);
        };
      } else if (typeof Event === "function") {
        const event = new Event("CustomEvent");
        ret.global.dispatchEvent(event);
        return function (name, event) {
          name = name.toLowerCase();
          const domEvent = new Event(name, {
            cancelable: true
          });
          domEvent.detail = event;
          Object.defineProperty(domEvent, "promise", { value: event.promise });
          Object.defineProperty(domEvent, "reason", { value: event.reason });
          return dispatch(legacyHandlers[name], domEvent);
        };
      } else {
        const event = document.createEvent("CustomEvent");
        event.initCustomEvent("testingtheevent", false, true, {});
        ret.global.dispatchEvent(event);
        return function (name, event) {
          name = name.toLowerCase();
          const domEvent = document.createEvent("CustomEvent");
          domEvent.initCustomEvent(name, false, true, event);
          return dispatch(legacyHandlers[name], domEvent);
        };
      }
    } catch (e) { }
    return () => false;
  })();
  const fireGlobalEvent = (function () {
    if (ret.isNode) {
      return function () {
        return process.emit.apply(process, arguments);
      };
    } else {
      if (!ret.global) {
        return () => false;
      }
      return function (name) {
        const methodName = "on" + name.toLowerCase();
        const method = ret.global[methodName];
        if (!method) return false;
        method.apply(ret.global, Array.prototype.slice.call(arguments, 1));
        return true;
      };
    }
  })();
  function generatePromiseLifecycleEventObject(name, promise) {
    return { promise: promise };
  }
  const eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function (name, promise, child) {
      return { promise: promise, child: child };
    },
    warning: function (name, warning) {
      return { warning: warning };
    },
    unhandledRejection: function (name, reason, promise) {
      return { reason: reason, promise: promise };
    },
    rejectionHandled: generatePromiseLifecycleEventObject
  };
  const activeFireEvent = function (name) {
    let globalEventFired;
    try {
      globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
      async.throwLater(e);
      globalEventFired = true;
    }
    let domEventFired;
    try {
      domEventFired = fireDomEvent(name,
        eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
      async.throwLater(e);
      domEventFired = true;
    }
    return domEventFired || globalEventFired;
  };
  Promise.config = function (opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
      if (opts.longStackTraces) {
        Promise.longStackTraces();
      } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
        disableLongStackTraces();
      }
    }
    if ("warnings" in opts) {
      const warningsOption = opts.warnings;
      config.warnings = !!warningsOption;
      wForgottenReturn = config.warnings;
      if (ret.isObject(warningsOption)) {
        if ("wForgottenReturn" in warningsOption) {
          wForgottenReturn = !!warningsOption.wForgottenReturn;
        }
      }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
      if (async.haveItemsQueued()) {
        throw new Error(
          "cannot enable cancellation after promises are in use");
      }
      Promise.prototype._clearCancellationData =
        cancellationClearCancellationData;
      Promise.prototype._propagateFrom = cancellationPropagateFrom;
      Promise.prototype._onCancel = cancellationOnCancel;
      Promise.prototype._setOnCancel = cancellationSetOnCancel;
      Promise.prototype._attachCancellationCallback =
        cancellationAttachCancellationCallback;
      Promise.prototype._execute = cancellationExecute;
      propagateFromFunction = cancellationPropagateFrom;
      config.cancellation = true;
    }
    if ("monitoring" in opts) {
      if (opts.monitoring && !config.monitoring) {
        config.monitoring = true;
        Promise.prototype._fireEvent = activeFireEvent;
      } else if (!opts.monitoring && config.monitoring) {
        config.monitoring = false;
        Promise.prototype._fireEvent = defaultFireEvent;
      }
    }
    if ("asyncHooks" in opts && ret.nodeSupportsAsyncResource) {
      const prev = config.asyncHooks;
      const cur = !!opts.asyncHooks;
      if (prev !== cur) {
        config.asyncHooks = cur;
        if (cur) {
          enableAsyncHooks();
        } else {
          disableAsyncHooks();
        }
      }
    }
    return Promise;
  };
  function defaultFireEvent() { return false; }
  Promise.prototype._fireEvent = defaultFireEvent;
  Promise.prototype._execute = function (executor, resolve, reject) {
    try {
      executor(resolve, reject);
    } catch (e) {
      return e;
    }
  };
  Promise.prototype._onCancel = function () { };
  Promise.prototype._setOnCancel = function (handler) { };
  Promise.prototype._attachCancellationCallback = function (onCancel) { };
  Promise.prototype._captureStackTrace = function () { };
  Promise.prototype._attachExtraTrace = function () { };
  Promise.prototype._dereferenceTrace = function () { };
  Promise.prototype._clearCancellationData = function () { };
  Promise.prototype._propagateFrom = function (parent, flags) { };
  function cancellationExecute(executor, resolve, reject) {
    const promise = this;
    try {
      executor(resolve, reject, function (onCancel) {
        if (typeof onCancel !== "function") {
          throw new TypeError("onCancel must be a function, got: " +
            ret.toString(onCancel));
        }
        promise._attachCancellationCallback(onCancel);
      });
    } catch (e) {
      return e;
    }
  }
  function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;
    const previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
      if (Array.isArray(previousOnCancel)) {
        previousOnCancel.push(onCancel);
      } else {
        this._setOnCancel([previousOnCancel, onCancel]);
      }
    } else {
      this._setOnCancel(onCancel);
    }
  }
  function cancellationOnCancel() {
    return this._onCancelField;
  }
  function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
  }
  function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
  }
  function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
      this._cancellationParent = parent;
      let branchesRemainingToCancel = parent._branchesRemainingToCancel;
      if (branchesRemainingToCancel === undefined) {
        branchesRemainingToCancel = 0;
      }
      parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
      this._setBoundTo(parent._boundTo);
    }
  }
  function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
      this._setBoundTo(parent._boundTo);
    }
  }
  let propagateFromFunction = bindingPropagateFrom;
  function boundValueFunction() {
    const ret = this._boundTo;
    if (ret !== undefined) {
      if (ret instanceof Promise) {
        if (ret.isFulfilled()) {
          return ret.value();
        } else {
          return undefined;
        }
      }
    }
    return ret;
  }
  function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
  }
  function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
      let trace = this._trace;
      if (trace !== undefined) {
        if (ignoreSelf) trace = trace._parent;
      }
      if (trace !== undefined) {
        trace.attachExtraTrace(error);
      } else if (!error.__stackCleaned__) {
        const parsed = parseStackAndMessage(error);
        ret.notEnumerableProp(error, "stack",
          parsed.message + "\n" + parsed.stack.join("\n"));
        ret.notEnumerableProp(error, "__stackCleaned__", true);
      }
    }
  }
  function longStackTracesDereferenceTrace() {
    this._trace = undefined;
  }
  function checkForgottenReturns(returnValue, promiseCreated, name, promise,
    parent) {
    if (returnValue === undefined && promiseCreated !== null &&
      wForgottenReturn) {
      if (parent !== undefined && parent._returnedNonUndefined()) return;
      if ((promise._bitField & 65535) === 0) return;
      if (name) name = name + " ";
      let handlerLine = "";
      let creatorLine = "";
      if (promiseCreated._trace) {
        const traceLines = promiseCreated._trace.stack.split("\n");
        const stack = cleanStack(traceLines);
        for (let i = stack.length - 1; i >= 0; --i) {
          const line = stack[i];
          if (!nodeFramePattern.test(line)) {
            const lineMatches = line.match(parseLinePattern);
            if (lineMatches) {
              handlerLine = "at " + lineMatches[1] +
                ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
            }
            break;
          }
        }
        if (stack.length > 0) {
          const firstUserLine = stack[0];
          for (let i = 0; i < traceLines.length; ++i) {
            if (traceLines[i] === firstUserLine) {
              if (i > 0) {
                creatorLine = "\n" + traceLines[i - 1];
              }
              break;
            }
          }
        }
      }
      const msg = "a promise was created in a " + name +
        "handler " + handlerLine + "but was not returned from it, " +
        "see http://goo.gl/rRqMUw" +
        creatorLine;
      promise._warn(msg, true, promiseCreated);
    }
  }
  function deprecated(name, replacement) {
    let message = name +
      " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
  }
  function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    const warning = new Warning(message);
    let ctx;
    if (shouldUseOwnTrace) {
      promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
      ctx.attachExtraTrace(warning);
    } else {
      const parsed = parseStackAndMessage(warning);
      warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    if (!activeFireEvent("warning", warning)) {
      formatAndLogError(warning, "", true);
    }
  }
  function reconstructStack(message, stacks) {
    let i;
    for (i = 0; i < stacks.length - 1; ++i) {
      stacks[i].push("From previous event:");
      stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
      stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
  }
  function removeDuplicateOrEmptyJumps(stacks) {
    for (let i = 0; i < stacks.length; ++i) {
      if (stacks[i].length === 0 ||
        ((i + 1 < stacks.length) && stacks[i][0] === stacks[i + 1][0])) {
        stacks.splice(i, 1);
        i--;
      }
    }
  }
  function removeCommonRoots(stacks) {
    let current = stacks[0];
    for (let i = 1; i < stacks.length; ++i) {
      const prev = stacks[i];
      let currentLastIndex = current.length - 1;
      const currentLastLine = current[currentLastIndex];
      let commonRootMeetPoint = -1;
      for (let j = prev.length - 1; j >= 0; --j) {
        if (prev[j] === currentLastLine) {
          commonRootMeetPoint = j;
          break;
        }
      }
      for (let j = commonRootMeetPoint; j >= 0; --j) {
        const line = prev[j];
        if (current[currentLastIndex] === line) {
          current.pop();
          currentLastIndex--;
        } else {
          break;
        }
      }
      current = prev;
    }
  }
  function cleanStack(stack) {
    const ret = [];
    for (let i = 0; i < stack.length; ++i) {
      let line = stack[i];
      const isTraceLine = "    (No stack trace)" === line ||
        stackFramePattern.test(line);
      const isInternalFrame = isTraceLine && shouldIgnore(line);
      if (isTraceLine && !isInternalFrame) {
        if (indentStackFrames && line.charAt(0) !== " ") {
          line = "    " + line;
        }
        ret.push(line);
      }
    }
    return ret;
  }
  function stackFramesAsArray(error) {
    let stack = error.stack.replace(/\s+$/g, "").split("\n");
    let i;
    for (i = 0; i < stack.length; ++i) {
      const line = stack[i];
      if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
        break;
      }
    }
    if (i > 0 && error.name !== "SyntaxError") {
      stack = stack.slice(i);
    }
    return stack;
  }
  function parseStackAndMessage(error) {
    let stack = error.stack;
    const message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
      ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
      message: message,
      stack: error.name === "SyntaxError" ? stack : cleanStack(stack)
    };
  }
  function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
      let message;
      if (ret.isObject(error)) {
        const stack = error.stack;
        message = title + formatStack(stack, error);
      } else {
        message = title + String(error);
      }
      if (typeof printWarning === "function") {
        printWarning(message, isSoft);
      } else if (typeof console.log === "function" ||
        typeof console.log === "object") {
        console.log(message);
      }
    }
  }
  function fireRejectionEvent(name, localHandler, reason, promise) {
    let localEventFired = false;
    try {
      if (typeof localHandler === "function") {
        localEventFired = true;
        if (name === "rejectionHandled") {
          localHandler(promise);
        } else {
          localHandler(reason, promise);
        }
      }
    } catch (e) {
      async.throwLater(e);
    }
    if (name === "unhandledRejection") {
      if (!activeFireEvent(name, reason, promise) && !localEventFired) {
        formatAndLogError(reason, "Unhandled rejection ");
      }
    } else {
      activeFireEvent(name, promise);
    }
  }
  function formatNonError(obj) {
    let str;
    if (typeof obj === "function") {
      str = "[function " +
        (obj.name || "anonymous") +
        "]";
    } else {
      str = obj && typeof obj.toString === "function"
        ? obj.toString() : ret.toString(obj);
      const ruselessToString = /\[object [a-zA-Z0-9$_]+]/;
      if (ruselessToString.test(str)) {
        try {
          str = JSON.stringify(obj);
        }
        catch (e) {
        }
      }
      if (str.length === 0) {
        str = "(empty array)";
      }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
  }
  function snip(str) {
    const maxChars = 41;
    if (str.length < maxChars) {
      return str;
    }
    return str.substr(0, maxChars - 3) + "...";
  }
  function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
  }
  let shouldIgnore = function () { return false; };
  const parseLineInfoRegex = /[\/<(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
  function parseLineInfo(line) {
    const matches = line.match(parseLineInfoRegex);
    if (matches) {
      return {
        fileName: matches[1],
        line: parseInt(matches[2], 10)
      };
    }
  }
  function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    const firstStackLines = (firstLineError.stack || "").split("\n");
    const lastStackLines = (lastLineError.stack || "").split("\n");
    let firstIndex = -1;
    let lastIndex = -1;
    let firstFileName;
    let lastFileName;
    for (let i = 0; i < firstStackLines.length; ++i) {
      const result = parseLineInfo(firstStackLines[i]);
      if (result) {
        firstFileName = result.fileName;
        firstIndex = result.line;
        break;
      }
    }
    for (let i = 0; i < lastStackLines.length; ++i) {
      const result = parseLineInfo(lastStackLines[i]);
      if (result) {
        lastFileName = result.fileName;
        lastIndex = result.line;
        break;
      }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
      firstFileName !== lastFileName || firstIndex >= lastIndex) {
      return;
    }
    shouldIgnore = function (line) {
      if (bluebirdFramePattern.test(line)) return true;
      const info = parseLineInfo(line);
      if (info) {
        if (info.fileName === firstFileName &&
          (firstIndex <= info.line && info.line <= lastIndex)) {
          return true;
        }
      }
      return false;
    };
  }
  function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    const length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
  }
  ret.inherits(CapturedTrace, Error);
  Context.CapturedTrace = CapturedTrace;
  CapturedTrace.prototype.uncycle = function () {
    let length = this._length;
    if (length < 2) return;
    const nodes = [];
    const stackToIndex = {};
    let i, node;
    for (i = 0, node = this; node !== undefined; ++i) {
      nodes.push(node);
      node = node._parent;
    }
    length = this._length = i;
    for (let i = length - 1; i >= 0; --i) {
      const stack = nodes[i].stack;
      if (stackToIndex[stack] === undefined) {
        stackToIndex[stack] = i;
      }
    }
    for (let i = 0; i < length; ++i) {
      const currentStack = nodes[i].stack;
      const index = stackToIndex[currentStack];
      if (index !== undefined && index !== i) {
        if (index > 0) {
          nodes[index - 1]._parent = undefined;
          nodes[index - 1]._length = 1;
        }
        nodes[i]._parent = undefined;
        nodes[i]._length = 1;
        const cycleEdgeNode = i > 0 ? nodes[i - 1] : this;
        if (index < length - 1) {
          cycleEdgeNode._parent = nodes[index + 1];
          cycleEdgeNode._parent.uncycle();
          cycleEdgeNode._length =
            cycleEdgeNode._parent._length + 1;
        } else {
          cycleEdgeNode._parent = undefined;
          cycleEdgeNode._length = 1;
        }
        let currentChildLength = cycleEdgeNode._length + 1;
        for (let j = i - 2; j >= 0; --j) {
          nodes[j]._length = currentChildLength;
          currentChildLength++;
        }
        return;
      }
    }
  };
  CapturedTrace.prototype.attachExtraTrace = function (error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    const parsed = parseStackAndMessage(error);
    const message = parsed.message;
    const stacks = [parsed.stack];
    let trace = this;
    while (trace !== undefined) {
      stacks.push(cleanStack(trace.stack.split("\n")));
      trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    ret.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    ret.notEnumerableProp(error, "__stackCleaned__", true);
  };
  const captureStackTrace = (function stackDetection() {
    const v8stackFramePattern = /^\s*at\s*/;
    const v8stackFormatter = function (stack, error) {
      if (typeof stack === "string") return stack;
      if (error.name !== undefined &&
        error.message !== undefined) {
        return error.toString();
      }
      return formatNonError(error);
    };
    if (typeof Error.stackTraceLimit === "number" &&
      typeof Error.captureStackTrace === "function") {
      Error.stackTraceLimit += 6;
      stackFramePattern = v8stackFramePattern;
      formatStack = v8stackFormatter;
      const captureStackTrace = Error.captureStackTrace;
      shouldIgnore = function (line) {
        return bluebirdFramePattern.test(line);
      };
      return function (receiver, ignoreUntil) {
        Error.stackTraceLimit += 6;
        captureStackTrace(receiver, ignoreUntil);
        Error.stackTraceLimit -= 6;
      };
    }
    const err = new Error();
    if (typeof err.stack === "string" &&
      err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
      stackFramePattern = /@/;
      formatStack = v8stackFormatter;
      indentStackFrames = true;
      return function captureStackTrace(o) {
        o.stack = new Error().stack;
      };
    }
    let hasStackAfterThrow;
    try { throw new Error(); }
    catch (e) {
      hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
      typeof Error.stackTraceLimit === "number") {
      stackFramePattern = v8stackFramePattern;
      formatStack = v8stackFormatter;
      return function captureStackTrace(o) {
        Error.stackTraceLimit += 6;
        try { throw new Error(); }
        catch (e) { o.stack = e.stack; }
        Error.stackTraceLimit -= 6;
      };
    }
    formatStack = function (stack, error) {
      if (typeof stack === "string") return stack;
      if ((typeof error === "object" ||
        typeof error === "function") &&
        error.name !== undefined &&
        error.message !== undefined) {
        return error.toString();
      }
      return formatNonError(error);
    };
    return null;
  })();
  if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
      console.warn(message);
    };
    if (ret.isNode && process.stderr.isTTY) {
      printWarning = function (message, isSoft) {
        const color = isSoft ? "\u001b[33m" : "\u001b[31m";
        console.warn(color + message + "\u001b[0m\n");
      };
    } else if (!ret.isNode && typeof (new Error().stack) === "string") {
      printWarning = function (message, isSoft) {
        console.warn("%c" + message,
          isSoft ? "color: darkorange" : "color: red");
      };
    }
  }
  const config = {
    warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false,
    asyncHooks: false
  };
  if (longStackTraces) Promise.longStackTraces();
  return {
    asyncHooks() {
      return config.asyncHooks;
    },
    longStackTraces() {
      return config.longStackTraces;
    },
    warnings() {
      return config.warnings;
    },
    cancellation() {
      return config.cancellation;
    },
    monitoring() {
      return config.monitoring;
    },
    propagateFromFunction() {
      return propagateFromFunction;
    },
    boundValueFunction() {
      return boundValueFunction;
    },
    checkForgottenReturns,
    setBounds,
    warn,
    deprecated,
    CapturedTrace,
    fireDomEvent,
    fireGlobalEvent
  };
};

var _catch_filter = (NEXT_FILTER) => {
  const tryCatch = ret.tryCatch;
  const errorObj = ret.errorObj;
  return function catchFilter(instances, cb, promise) {
    return function (e) {
      const boundTo = promise._boundValue();
      predicateLoop: for (let i = 0; i < instances.length; ++i) {
        const item = instances[i];
        if (item === Error ||
          (item != null && item.prototype instanceof Error)) {
          if (e instanceof item) {
            return tryCatch(cb).call(boundTo, e);
          }
        } else if (typeof item === "function") {
          const matchesPredicate = tryCatch(item).call(boundTo, e);
          if (matchesPredicate === errorObj) {
            return matchesPredicate;
          } else if (matchesPredicate) {
            return tryCatch(cb).call(boundTo, e);
          }
        } else if (ret.isObject(e)) {
          const keys = Object.keys(item);
          for (let j = 0; j < keys.length; ++j) {
            const key = keys[j];
            if (item[key] !== e[key]) {
              continue predicateLoop;
            }
          }
          return tryCatch(cb).call(boundTo, e);
        }
      }
      return NEXT_FILTER;
    };
  }
};

var _finally = (Promise, tryConvertToPromise, NEXT_FILTER) => {
  const CancellationError = Promise.CancellationError;
  const errorObj = ret.errorObj;
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
        if (ret.isObject(item)) {
          catchInstances[j++] = item;
        } else {
          return Promise.reject(new TypeError(
            "tapCatch statement predicate: "
            + OBJECT_ERROR + ret.classString(item)
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

var _method = (Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) => {
  const tryCatch = ret.tryCatch;
  Promise.method = function (fn) {
    if (typeof fn !== "function") {
      throw new Promise.TypeError("expecting a function but got " + ret.classString(fn));
    }
    return function () {
      const ret = new Promise(INTERNAL);
      ret._captureStackTrace();
      ret._pushContext();
      const value = tryCatch(fn).apply(this, arguments);
      const promiseCreated = ret._popContext();
      debug.checkForgottenReturns(
        value, promiseCreated, "Promise.method", ret);
      ret._resolveFromSyncValue(value);
      return ret;
    };
  };
  Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
      return apiRejection("expecting a function but got " + ret.classString(fn));
    }
    const ret$1 = new Promise(INTERNAL);
    ret$1._captureStackTrace();
    ret$1._pushContext();
    let value;
    if (arguments.length > 1) {
      debug.deprecated("calling Promise.try with more than 1 argument");
      const arg = arguments[1];
      const ctx = arguments[2];
      value = Array.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
        : tryCatch(fn).call(ctx, arg);
    } else {
      value = tryCatch(fn)();
    }
    const promiseCreated = ret$1._popContext();
    debug.checkForgottenReturns(
      value, promiseCreated, "Promise.try", ret$1);
    ret$1._resolveFromSyncValue(value);
    return ret$1;
  };
  Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === ret.errorObj) {
      this._rejectCallback(value.e, false);
    } else {
      this._resolveCallback(value, true);
    }
  };
};

var _bind = (Promise, INTERNAL, tryConvertToPromise, debug) => {
  let calledBind = false;
  const rejectThis = function (_, e) {
    this._reject(e);
  };
  const targetRejected = function (e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
  };
  const bindingResolved = function (thisArg, context) {
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
      this._bitField = this._bitField | 2097152;
      this._boundTo = obj;
    } else {
      this._bitField = this._bitField & (~2097152);
    }
  };
  Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
  };
  Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
  };
};

var _cancel = (Promise, PromiseArray, apiRejection, debug) => {
  const tryCatch = ret.tryCatch;
  const errorObj = ret.errorObj;
  const async = Promise._async;
  Promise.prototype["break"] = Promise.prototype.cancel = function () {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");
    let promise = this;
    let child = promise;
    while (promise._isCancellable()) {
      if (!promise._cancelBy(child)) {
        if (child._isFollowing()) {
          child._followee().cancel();
        } else {
          child._cancelBranched();
        }
        break;
      }
      const parent = promise._cancellationParent;
      if (parent == null || !parent._isCancellable()) {
        if (promise._isFollowing()) {
          promise._followee().cancel();
        } else {
          promise._cancelBranched();
        }
        break;
      } else {
        if (promise._isFollowing()) promise._followee().cancel();
        promise._setWillBeCancelled();
        child = promise;
        promise = parent;
      }
    }
  };
  Promise.prototype._branchHasCancelled = function () {
    this._branchesRemainingToCancel--;
  };
  Promise.prototype._enoughBranchesHaveCancelled = function () {
    return this._branchesRemainingToCancel === undefined ||
      this._branchesRemainingToCancel <= 0;
  };
  Promise.prototype._cancelBy = function (canceller) {
    if (canceller === this) {
      this._branchesRemainingToCancel = 0;
      this._invokeOnCancel();
      return true;
    } else {
      this._branchHasCancelled();
      if (this._enoughBranchesHaveCancelled()) {
        this._invokeOnCancel();
        return true;
      }
    }
    return false;
  };
  Promise.prototype._cancelBranched = function () {
    if (this._enoughBranchesHaveCancelled()) {
      this._cancel();
    }
  };
  Promise.prototype._cancel = function () {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
  };
  Promise.prototype._cancelPromises = function () {
    if (this._length() > 0) this._settlePromises();
  };
  Promise.prototype._unsetOnCancel = function () {
    this._onCancelField = undefined;
  };
  Promise.prototype._isCancellable = function () {
    return this.isPending() && !this._isCancelled();
  };
  Promise.prototype.isCancellable = function () {
    return this.isPending() && !this.isCancelled();
  };
  Promise.prototype._doInvokeOnCancel = function (onCancelCallback, internalOnly) {
    if (Array.isArray(onCancelCallback)) {
      for (let i = 0; i < onCancelCallback.length; ++i) {
        this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
      }
    } else if (onCancelCallback !== undefined) {
      if (typeof onCancelCallback === "function") {
        if (!internalOnly) {
          const e = tryCatch(onCancelCallback).call(this._boundValue());
          if (e === errorObj) {
            this._attachExtraTrace(e.e);
            async.throwLater(e.e);
          }
        }
      } else {
        onCancelCallback._resultCancelled(this);
      }
    }
  };
  Promise.prototype._invokeOnCancel = function () {
    const onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
  };
  Promise.prototype._invokeInternalOnCancel = function () {
    if (this._isCancellable()) {
      this._doInvokeOnCancel(this._onCancel(), true);
      this._unsetOnCancel();
    }
  };
  Promise.prototype._resultCancelled = function () {
    this.cancel();
  };
};

var _direct_resolve = (Promise) => {
  function returner() {
    return this.value;
  }
  function thrower() {
    throw this.reason;
  }
  Promise.prototype["return"] =
    Promise.prototype.thenReturn = function (value) {
      if (value instanceof Promise) value.suppressUnhandledRejections();
      return this._then(
        returner, undefined, undefined, { value: value }, undefined);
    };
  Promise.prototype["throw"] =
    Promise.prototype.thenThrow = function (reason) {
      return this._then(
        thrower, undefined, undefined, { reason: reason }, undefined);
    };
  Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
      return this._then(
        undefined, thrower, undefined, { reason: reason }, undefined);
    } else {
      const _reason = arguments[1];
      const handler = function () { throw _reason; };
      return this.caught(reason, handler);
    }
  };
  Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
      if (value instanceof Promise) value.suppressUnhandledRejections();
      return this._then(
        undefined, returner, undefined, { value: value }, undefined);
    } else {
      const _value = arguments[1];
      if (_value instanceof Promise) _value.suppressUnhandledRejections();
      const handler = function () { return _value; };
      return this.caught(value, handler);
    }
  };
};

var _synchronous_inspection = (Promise) => {
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
      throw new TypeError("cannot get rejection reason of a non-rejected promise");
    }
    return this._settledValue();
  };
  const reason = PromiseInspection.prototype.error =
    PromiseInspection.prototype.reason = function () {
      if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise");
      }
      return this._settledValue();
    };
  const isFulfilled = PromiseInspection.prototype.isFulfilled = function () {
    return (this._bitField & 33554432) !== 0;
  };
  const isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
  };
  const isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
  };
  const isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
  };
  PromiseInspection.prototype.isCancelled = function () {
    return (this._bitField & 8454144) !== 0;
  };
  Promise.prototype.__isCancelled = function () {
    return (this._bitField & 65536) === 65536;
  };
  Promise.prototype._isCancelled = function () {
    return this._target().__isCancelled();
  };
  Promise.prototype.isCancelled = function () {
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

const { canEvaluate, tryCatch: tryCatch$1, errorObj: errorObj$1 } = ret;
var _join = (Promise, PromiseArray, tryConvertToPromise, INTERNAL, async) => {
  let reject;
  const holderClasses = [];
  const thenCallbacks = [];
  const promiseSetters = [];
  {
    if (canEvaluate) {
      const thenCallback = function (i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
      };
      const promiseSetter = function (i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
      };
      const generateHolderClass = function (total) {
        const props = new Array(total);
        for (let i = 0; i < props.length; ++i) {
          props[i] = "this.p" + (i + 1);
        }
        let assignment = props.join(" = ") + " = null;";
        const cancellationCode = "let promise;\n" + props.map(function (prop) {
          return "                                                           \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        let passedArguments = props.join(", ");
        let name = "Holder$" + total;
        let code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                let ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                let now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";
        code = code.replace(/\[TheName]/g, name)
          .replace(/\[TheTotal]/g, total)
          .replace(/\[ThePassedArguments]/g, passedArguments)
          .replace(/\[TheProperties]/g, assignment)
          .replace(/\[CancellationCode]/g, cancellationCode);
        return new Function("tryCatch", "errorObj", "Promise", "async", code)
          (tryCatch$1, errorObj$1, Promise, async);
      };
      for (let i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
      }
      reject = function (reason) {
        this._reject(reason);
      };
    }
  }
  Promise.join = function () {
    const last = arguments.length - 1;
    let fn;
    if (last > 0 && typeof arguments[last] === "function") {
      fn = arguments[last];
      {
        if (last <= 8 && canEvaluate) {
          const ret$1 = new Promise(INTERNAL);
          ret$1._captureStackTrace();
          const HolderClass = holderClasses[last - 1];
          const holder = new HolderClass(fn);
          const callbacks = thenCallbacks;
          for (let i = 0; i < last; ++i) {
            let maybePromise = tryConvertToPromise(arguments[i], ret$1);
            if (maybePromise instanceof Promise) {
              maybePromise = maybePromise._target();
              const bitField = maybePromise._bitField;
              if (((bitField & 50397184) === 0)) {
                maybePromise._then(callbacks[i], reject,
                  undefined, ret$1, holder);
                promiseSetters[i](maybePromise, holder);
                holder.asyncNeeded = false;
              } else if (((bitField & 33554432) !== 0)) {
                callbacks[i].call(ret$1,
                  maybePromise._value(), holder);
              } else if (((bitField & 16777216) !== 0)) {
                ret$1._reject(maybePromise._reason());
              } else {
                ret$1._cancel();
              }
            } else {
              callbacks[i].call(ret$1, maybePromise, holder);
            }
          }
          if (!ret$1._isFateSealed()) {
            if (holder.asyncNeeded) {
              const context = Promise._getContext();
              holder.fn = ret.contextBind(context, holder.fn);
            }
            ret$1._setAsyncGuaranteed();
            ret$1._setOnCancel(holder);
          }
          return ret$1;
        }
      }
    }
    const len = arguments.length;
    const args = new Array(len);
    for (let i = 0; i < len; ++i) {
      args[i] = arguments[i];
    }    if (fn) args.pop();
    const ret$1 = new PromiseArray(args).promise();
    return fn !== undefined ? ret$1.spread(fn) : ret$1;
  };
};

const cr = Object.create;
const callerCache = cr(null);
const getterCache = cr(null);
callerCache[" size"] = getterCache[" size"] = 0;
var _call_get = (Promise) => {
  const canEvaluate = ret.canEvaluate;
  const isIdentifier = ret.isIdentifier;
  let getMethodCaller;
  let getGetter;
  {
    let makeMethodCaller = function (methodName) {
      return new Function("ensureMethod", "                                  \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            let len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
    };
    const makeGetter = function (propertyName) {
      return new Function("obj", "                                           \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
    };
    const getCompiled = function (name, compiler, cache) {
      let ret = cache[name];
      if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
          return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
          const keys = Object.keys(cache);
          for (let i = 0; i < 256; ++i) delete cache[keys[i]];
          cache[" size"] = keys.length - 256;
        }
      }
      return ret;
    };
    getMethodCaller = function (name) {
      return getCompiled(name, makeMethodCaller, callerCache);
    };
    getGetter = function (name) {
      return getCompiled(name, makeGetter, getterCache);
    };
  }
  function ensureMethod(obj, methodName) {
    let fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
      const message = "Object " + ret.classString(obj) + " has no method '" +
        ret.toString(methodName) + "'";
      throw new Promise.TypeError(message);
    }
    return fn;
  }
  function caller(obj) {
    const methodName = this.pop();
    const fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
  }
  Promise.prototype.call = function (methodName) {
    const [_, args] = arguments;
    {
      if (canEvaluate) {
        const maybeCaller = getMethodCaller(methodName);
        if (maybeCaller !== null) {
          return this._then(
            maybeCaller, undefined, undefined, args, undefined);
        }
      }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
  };
  function namedGetter(obj) {
    return obj[this];
  }
  function indexedGetter(obj) {
    let index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
  }
  Promise.prototype.get = function (propertyName) {
    const isIndex = (typeof propertyName === "number");
    let getter;
    if (!isIndex) {
      if (canEvaluate) {
        const maybeGetter = getGetter(propertyName);
        getter = maybeGetter !== null ? maybeGetter : namedGetter;
      } else {
        getter = namedGetter;
      }
    } else {
      getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
  };
};

var _generators = (Promise,
  apiRejection,
  INTERNAL,
  tryConvertToPromise,
  Proxyable,
  debug) => {
  const TypeError = errors.TypeError;
  const errorObj = ret.errorObj;
  const tryCatch = ret.tryCatch;
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
          if (maybePromise === null) {
            this._promiseRejected(
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
        if (((bitField & 50397184) === 0)) {
          this._yieldedPromise = maybePromise;
          maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
          Promise._async.invoke(
            this._promiseFulfilled, this, maybePromise._value()
          );
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
    if (typeof generatorFunction !== "function") {
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
      throw new TypeError("expecting a function but got " + ret.classString(fn));
    }
    yieldHandlers.push(fn);
  };
  Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
      return apiRejection("generatorFunction must be a function");
    }
    const spawn = new PromiseSpawn(generatorFunction, this);
    const ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
  };
};

var _map = (Promise,
  PromiseArray,
  apiRejection,
  tryConvertToPromise,
  INTERNAL,
  debug) => {
  const tryCatch = ret.tryCatch;
  const errorObj = ret.errorObj;
  const async = Promise._async;
  function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    const context = Promise._getContext();
    this._callback = ret.contextBind(context, fn);
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
  ret.inherits(MappingPromiseArray, PromiseArray);
  MappingPromiseArray.prototype._asyncInit = function () {
    this._init$(undefined, -2);
  };
  MappingPromiseArray.prototype._init = function () { };
  MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    const values = this._values;
    const length = this.length();
    const preservedValues = this._preservedValues;
    const limit = this._limit;
    if (index < 0) {
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
      let maybePromise = tryConvertToPromise(ret, this._promise);
      if (maybePromise instanceof Promise) {
        maybePromise = maybePromise._target();
        const bitField = maybePromise._bitField;
        if (((bitField & 50397184) === 0)) {
          if (limit >= 1) this._inFlight++;
          values[index] = maybePromise;
          maybePromise._proxy(this, (index + 1) * -1);
          return false;
      } else if (((bitField & 33554432) !== 0)) {
          ret = maybePromise._value();
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
      return apiRejection("expecting a function but got " + ret.classString(fn));
    }
    let limit = 0;
    if (options !== undefined) {
      if (typeof options === "object" && options !== null) {
        if (typeof options.concurrency !== "number") {
          return Promise.reject(
            new TypeError("'concurrency' must be a number but it is " +
              ret.classString(options.concurrency)));
        }
        limit = options.concurrency;
      } else {
        return Promise.reject(new TypeError(
          "options argument must be an object but it is " +
          ret.classString(options)));
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

var _nodeify = (Promise) => {
  const async = Promise._async;
  const tryCatch = ret.tryCatch;
  const errorObj = ret.errorObj;
  function spreadAdapter(val, nodeback) {
    const promise = this;
    if (!Array.isArray(val)) return successAdapter.call(promise, val, nodeback);
    const ret =
      tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
      async.throwLater(ret.e);
    }
  }
  function successAdapter(val, nodeback) {
    const promise = this;
    const receiver = promise._boundValue();
    const ret = val === undefined
      ? tryCatch(nodeback).call(receiver, null)
      : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
      async.throwLater(ret.e);
    }
  }
  function errorAdapter(reason, nodeback) {
    const promise = this;
    if (!reason) {
      const newReason = new Error(String(reason));
      newReason.cause = reason;
      reason = newReason;
    }
    const ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
      async.throwLater(ret.e);
    }
  }
  Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
    options) {
    if (typeof nodeback == "function") {
      let adapter = successAdapter;
      if (options !== undefined && Object(options).spread) {
        adapter = spreadAdapter;
      }
      this._then(
        adapter,
        errorAdapter,
        undefined,
        this,
        nodeback
      );
    }
    return this;
  };
};

const { maybeWrapAsError, markAsOriginatingFromRejection } = ret;
const { OperationalError } = errors;
function isUntypedError(obj) {
  return obj instanceof Error && Object.getPrototypeOf(obj) === Error.prototype;
}
const rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
  if (isUntypedError(obj)) {
    const ret = new OperationalError(obj);
    ret.name = obj.name;
    ret.message = obj.message;
    ret.stack = obj.stack;
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      if (!rErrorKey.test(key)) {
        ret[key] = obj[key];
      }
    }
    return ret;
  }
  markAsOriginatingFromRejection(obj);
  return obj;
}
function nodebackForPromise(promise, multiArgs) {
  return function (err, value) {
    if (promise === null) return;
    if (err) {
      const wrapped = wrapAsOperationalError(maybeWrapAsError(err));
      promise._attachExtraTrace(wrapped);
      promise._reject(wrapped);
    } else if (!multiArgs) {
      promise._fulfill(value);
    } else {
      const len = arguments.length;
      const args = new Array(Math.max(len - 1, 0));
      for (let i = 1; $_i < len; ++i) {
        args[i - 1] = arguments[i];
      }      promise._fulfill(args);
    }
    promise = null;
  };
}

var _promisify = (Promise, INTERNAL) => {
  const THIS = {};
  const withAppended = ret.withAppended;
  const maybeWrapAsError = ret.maybeWrapAsError;
  const canEvaluate = ret.canEvaluate;
  const TypeError = errors.TypeError;
  const defaultSuffix = "Async";
  const defaultPromisified = { __isPromisified__: true };
  const noCopyProps = [
    "arity",
    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
  ];
  const noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");
  const defaultFilter = function (name) {
    return ret.isIdentifier(name) &&
      name.charAt(0) !== "_" &&
      name !== "constructor";
  };
  function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
  }
  function isPromisified(fn) {
    try {
      return fn.__isPromisified__ === true;
    }
    catch (e) {
      return false;
    }
  }
  function hasPromisified(obj, key, suffix) {
    const val = ret.getDataPropertyOrDefault(obj, key + suffix, defaultPromisified);
    return val ? isPromisified(val) : false;
  }
  function checkValid(ret, suffix, suffixRegexp) {
    for (let i = 0; i < ret.length; i += 2) {
      const key = ret[i];
      if (suffixRegexp.test(key)) {
        const keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
        for (let j = 0; j < ret.length; j += 2) {
          if (ret[j] === keyWithoutAsyncSuffix) {
            throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
              .replace("%s", suffix));
          }
        }
      }
    }
  }
  function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    const keys = ret.inheritedDataKeys(obj);
    const ret$1 = [];
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      const value = obj[key];
      const passesDefaultFilter = filter === defaultFilter
        ? true : defaultFilter(key);
      if (typeof value === "function" &&
        !isPromisified(value) &&
        !hasPromisified(obj, key, suffix) &&
        filter(key, value, obj, passesDefaultFilter)) {
        ret$1.push(key, value);
      }
    }
    checkValid(ret$1, suffix, suffixRegexp);
    return ret$1;
  }
  const escapeIdentRegex = function (str) {
    return str.replace(/([$])/, "\\$");
  };
  let makeNodePromisifiedEval;
  {
    const switchCaseArgumentOrder = function (likelyArgumentCount) {
      const ret = [likelyArgumentCount];
      const min = Math.max(0, likelyArgumentCount - 1 - 3);
      let i;
      for (i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
      }
      for (i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
      }
      return ret;
    };
    const argumentSequence = function (argumentCount) {
      return ret.filledRange(argumentCount, "_arg", "");
    };
    const parameterDeclaration = function (parameterCount) {
      return ret.filledRange(Math.max(parameterCount, 3), "_arg", "");
    };
    const parameterCount = function (fn) {
      if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1024), 0);
      }
      return 0;
    };
    makeNodePromisifiedEval =
      function (callback, receiver, originalName, fn, _, multiArgs) {
        const newParameterCount = Math.max(0, parameterCount(fn) - 1);
        const argumentOrder = switchCaseArgumentOrder(newParameterCount);
        const shouldProxyThis = typeof callback === "string" || receiver === THIS;
        function generateCallForArgumentCount(count) {
          const args = argumentSequence(count).join(", ");
          const comma = count > 0 ? ", " : "";
          let ret;
          if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
          } else {
            ret = receiver === undefined
              ? "ret = callback({{args}}, nodeback); break;\n"
              : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
          }
          return ret.replace("{{args}}", args).replace(", ", comma);
        }
        function generateArgumentSwitchCase() {
          let ret = "";
          for (let i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] + ":" +
              generateCallForArgumentCount(argumentOrder[i]);
          }
          ret += "                                                           \n\
        default:                                                             \n\
            let args = new Array(len + 1);                                   \n\
            let i = 0;                                                       \n\
            for (let i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
            ? "ret = callback.apply(this, args);\n"
            : "ret = callback.apply(receiver, args);\n"));
          return ret;
        }
        const getFunctionCode = typeof callback === "string"
          ? ("this != null ? this['" + callback + "'] : fn")
          : "fn";
        let body = "'use strict';                                            \n\
        const ret = function (Parameters) {                                  \n\
            'use strict';                                                    \n\
            const len = arguments.length;                                    \n\
            const promise = new Promise(INTERNAL);                           \n\
            promise._captureStackTrace();                                    \n\
            const nodeback = nodebackForPromise(promise, " + multiArgs + "); \n\
            let ret;                                                         \n\
            const callback = tryCatch([GetFunctionCode]);                    \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
            .replace("[GetFunctionCode]", getFunctionCode);
        body = body.replace("Parameters", parameterDeclaration(newParameterCount));
        return new Function("Promise",
          "fn",
          "receiver",
          "withAppended",
          "maybeWrapAsError",
          "nodebackForPromise",
          "tryCatch",
          "errorObj",
          "notEnumerableProp",
          "INTERNAL",
          body)(
            Promise,
            fn,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            ret.tryCatch,
            ret.errorObj,
            ret.notEnumerableProp,
            INTERNAL);
      };
  }
  function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    const defaultThis = (function () { return this; })();
    const method = callback;
    if (typeof method === "string") {
      callback = fn;
    }
    function promisified() {
      let _receiver = receiver;
      if (receiver === THIS) _receiver = this;
      const promise = new Promise(INTERNAL);
      promise._captureStackTrace();
      const cb = typeof method === "string" && this !== defaultThis
        ? this[method] : callback;
      const fn = nodebackForPromise(promise, multiArgs);
      try {
        cb.apply(_receiver, withAppended(arguments, fn));
      } catch (e) {
        promise._rejectCallback(maybeWrapAsError(e), true, true);
      }
      if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
      return promise;
    }
    ret.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
  }
  const makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;
  function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    const suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    const methods =
      promisifiableMethods(obj, suffix, suffixRegexp, filter);
    for (let i = 0, len = methods.length; i < len; i += 2) {
      const key = methods[i];
      const fn = methods[i + 1];
      const promisifiedKey = key + suffix;
      if (promisifier === makeNodePromisified) {
        obj[promisifiedKey] =
          makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
      } else {
        const promisified = promisifier(fn, function () {
          return makeNodePromisified(key, THIS, key,
            fn, suffix, multiArgs);
        });
        ret.notEnumerableProp(promisified, "__isPromisified__", true);
        obj[promisifiedKey] = promisified;
      }
    }
    ret.toFastProperties(obj);
    return obj;
  }
  function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
      callback, null, multiArgs);
  }
  Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
      throw new TypeError("expecting a function but got " + ret.classString(fn));
    }
    if (isPromisified(fn)) {
      return fn;
    }
    options = Object(options);
    const receiver = options.context === undefined ? THIS : options.context;
    const multiArgs = !!options.multiArgs;
    const ret$1 = promisify(fn, receiver, multiArgs);
    ret.copyDescriptors(fn, ret$1, propsFilter);
    return ret$1;
  };
  Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
      throw new TypeError("the target of promisifyAll must be an object or a function");
    }
    options = Object(options);
    const multiArgs = !!options.multiArgs;
    let suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    let filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    let promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;
    if (!ret.isIdentifier(suffix)) {
      throw new RangeError("suffix must be a valid identifier");
    }
    const keys = ret.inheritedDataKeys(target);
    for (let i = 0; i < keys.length; ++i) {
      const value = target[keys[i]];
      if (keys[i] !== "constructor" &&
        ret.isClass(value)) {
        promisifyAll(value.prototype, suffix, filter, promisifier,
          multiArgs);
        promisifyAll(value, suffix, filter, promisifier, multiArgs);
      }
    }
    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
  };
};

var _props = (Promise, PromiseArray, tryConvertToPromise, apiRejection) => {
  const isObject = ret.isObject;
  const mapToEntries = (function () {
    let index = 0;
    let size = 0;
    function extractEntry(value, key) {
      this[index] = value;
      this[index + size] = key;
      index++;
    }
    return function mapToEntries(map) {
      size = map.size;
      index = 0;
      const ret = new Array(map.size * 2);
      map.forEach(extractEntry, ret);
      return ret;
    };
  })();
  const entriesToMap = function (entries) {
    const ret = new Map();
    const length = entries.length / 2 | 0;
    for (let i = 0; i < length; ++i) {
      const key = entries[length + i];
      const value = entries[i];
      ret.set(key, value);
    }
    return ret;
  };
  function PropertiesPromiseArray(obj) {
    let isMap = false;
    let entries;
    if (obj instanceof Map) {
      entries = mapToEntries(obj);
      isMap = true;
    } else {
      const keys = Object.keys(obj);
      const len = keys.length;
      entries = new Array(len * 2);
      for (let i = 0; i < len; ++i) {
        const key = keys[i];
        entries[i] = obj[key];
        entries[i + len] = key;
      }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, isMap ? -6 : -3);
  }
  ret.inherits(PropertiesPromiseArray, PromiseArray);
  PropertiesPromiseArray.prototype._init = function () { };
  PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    const totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
      let val;
      if (this._isMap) {
        val = entriesToMap(this._values);
      } else {
        val = {};
        const keyOffset = this.length();
        for (let i = 0, len = this.length(); i < len; ++i) {
          val[this._values[i + keyOffset]] = this._values[i];
        }
      }
      this._resolve(val);
      return true;
    }
    return false;
  };
  PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
  };
  PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
  };
  function props(promises) {
    let ret;
    const castValue = tryConvertToPromise(promises);
    if (!isObject(castValue)) {
      return apiRejection("cannot await properties of a non-object");
    } else if (castValue instanceof Promise) {
      ret = castValue._then(
        Promise.props, undefined, undefined, undefined, undefined);
    } else {
      ret = new PropertiesPromiseArray(castValue).promise();
    }
    if (castValue instanceof Promise) {
      ret._propagateFrom(castValue, 2);
    }
    return ret;
  }
  Promise.prototype.props = function () {
    return props(this);
  };
  Promise.props = function (promises) {
    return props(promises);
  };
};

var _race = (
  Promise, INTERNAL, tryConvertToPromise, apiRejection) => {
  const raceLater = function (promise) {
    return promise.then(function (array) {
      return race(array, promise);
    });
  };
  function race(promises, parent) {
    const maybePromise = tryConvertToPromise(promises);
    if (maybePromise instanceof Promise) {
      return raceLater(maybePromise);
    } else {
      promises = ret.asArray(promises);
      if (promises === null)
        return apiRejection(COLLECTION_ERROR + ret.classString(promises));
    }
    const ret$1 = new Promise(INTERNAL);
    if (parent !== undefined) {
      ret$1._propagateFrom(parent, PROPAGATE_ALL);
    }
    const fulfill = ret$1._fulfill;
    const reject = ret$1._reject;
    for (let i = 0, len = promises.length; i < len; ++i) {
      const val = promises[i];
      if (val === undefined && !(i in promises)) {
        continue;
      }
      Promise.cast(val)._then(fulfill, reject, undefined, ret$1, null);
    }
    return ret$1;
  }
  Promise.race = function (promises) {
    return race(promises, undefined);
  };
  Promise.prototype.race = function () {
    return race(this, undefined);
  };
};

var _reduce = (Promise,
  PromiseArray,
  apiRejection,
  tryConvertToPromise,
  INTERNAL,
  debug) => {
  const tryCatch = ret.tryCatch;
  function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    const context = Promise._getContext();
    this._fn = ret.contextBind(context, fn);
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
    this._init$(undefined, -5);
  }
  ret.inherits(ReductionPromiseArray, PromiseArray);
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
  ReductionPromiseArray.prototype._init = function () { };
  ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    this._resolve(this._eachValues !== undefined ? this._eachValues
      : this._initialValue);
  };
  ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
  };
  ReductionPromiseArray.prototype._resolve = function (value) {
    this._promise._resolveCallback(value);
    this._values = null;
  };
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
      return apiRejection("expecting a function but got " + ret.classString(fn));
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

var _settle = (Promise, PromiseArray, debug) => {
  const PromiseInspection = Promise.PromiseInspection;
  function SettledPromiseArray(values) {
    this.constructor$(values);
  }
  ret.inherits(SettledPromiseArray, PromiseArray);
  SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    const totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
      this._resolve(this._values);
      return true;
    }
    return false;
  };
  SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    const ret = new PromiseInspection();
    ret._bitField = IS_FULFILLED;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
  };
  SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
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

function _some (Promise, PromiseArray, apiRejection) {
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
  ret.inherits(SomePromiseArray, PromiseArray);
  SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
      return;
    }
    if (this._howMany === 0) {
      this._resolve([]);
      return;
    }
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
    this._howMany = count;
  };
  SomePromiseArray.prototype._promiseFulfilled = function (value) {
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
  SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
  };
  SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
      return this._cancel();
    }
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
      return apiRejection("expecting a positive integer");
    }
    const ret = new SomePromiseArray(promises);
    const promise = ret.promise();
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
}

var _timers = (Promise, INTERNAL, debug) => {
  const TimeoutError = Promise.TimeoutError;
  class HandleWrapper {
    constructor(handle) {
      this.handle = handle;
    }
    _resultCancelled() {
      clearTimeout(this.handle);
    }
  }
  const afterValue = function (value) { return delay(+this).thenReturn(value); };
  const delay = Promise.delay = function (ms, value) {
    let ret;
    let handle;
    if (value !== undefined) {
      ret = Promise.resolve(value)
        ._then(afterValue, null, null, ms, undefined);
      if (debug.cancellation() && value instanceof Promise) {
        ret._setOnCancel(value);
      }
    } else {
      ret = new Promise(INTERNAL);
      handle = setTimeout(function () { ret._fulfill(); }, +ms);
      if (debug.cancellation()) {
        ret._setOnCancel(new HandleWrapper(handle));
      }
      ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
  };
  Promise.prototype.delay = function (ms) {
    return delay(ms, this);
  };
  const afterTimeout = function (promise, message, parent) {
    let err;
    if (typeof message !== "string") {
      if (message instanceof Error) {
        err = message;
      } else {
        err = new TimeoutError("operation timed out");
      }
    } else {
      err = new TimeoutError(message);
    }
    ret.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);
    if (parent != null) {
      parent.cancel();
    }
  };
  function successClear(value) {
    clearTimeout(this.handle);
    return value;
  }
  function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
  }
  Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    let ret, parent;
    const handleWrapper = new HandleWrapper(setTimeout(() => {
      if (ret.isPending()) {
        afterTimeout(ret, message, parent);
      }
    }, ms));
    if (debug.cancellation()) {
      parent = this.then();
      ret = parent._then(successClear, failureClear, undefined, handleWrapper, undefined);
      ret._setOnCancel(handleWrapper);
    } else {
      ret = this._then(successClear, failureClear, undefined, handleWrapper, undefined);
    }
    return ret;
  };
};

var _using = (Promise, apiRejection, tryConvertToPromise,
  createContext, INTERNAL, debug) => {
  const TypeError = errors.TypeError;
  const inherits = ret.inherits;
  const errorObj = ret.errorObj;
  const tryCatch = ret.tryCatch;
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
      return apiRejection("expecting a function but got " + ret.classString(fn));
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
    this._bitField = this._bitField | 131072;
    this._disposer = disposer;
  };
  Promise.prototype._isDisposable = function () {
    return (this._bitField & 131072) > 0;
  };
  Promise.prototype._getDisposer = function () {
    return this._disposer;
  };
  Promise.prototype._unsetDisposable = function () {
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

var _any = (Promise) => {
  const SomePromiseArray = Promise._SomePromiseArray;
  const any = (promises) => {
    const ret = new SomePromiseArray(promises);
    const promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
  };
  Promise.any = (promises) => any(promises);
  Promise.prototype.any = function () {
    return any(this);
  };
};

var _each = (Promise, INTERNAL) => {
  const PromiseReduce = Promise.reduce;
  const PromiseAll = Promise.all;
  function promiseAllThis() {
    return PromiseAll(this);
  }
  function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
  }
  Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
      ._then(promiseAllThis, undefined, undefined, this, undefined);
  };
  Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
  };
  Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
      ._then(promiseAllThis, undefined, undefined, promises, undefined);
  };
  Promise.mapSeries = PromiseMapSeries;
};

function _filter (Promise, INTERNAL) {
  const PromiseMap = Promise.map;
  Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
  };
  Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
  };
}

const makeSelfResolutionError = () => {
  return new TypeError$1("circular promise resolution chain");
};
const reflectHandler = function () {
  return new Promise$1.PromiseInspection(this._target());
};
const apiRejection = (msg) => {
  return Promise$1.reject(new TypeError$1(msg));
};
function Proxyable() { }
const UNDEFINED_BINDING = {};
ret.setReflectHandler(reflectHandler);
const getDomain = () => process.domain || null;
const getContextDefault = () => null;
const getContextDomain = () => ({
  domain: getDomain(),
  async: null
});
const AsyncResource = ret.isNode && ret.nodeSupportsAsyncResource ?
  async_hooks.AsyncResource : null;
const getContextAsyncHooks = () => {
  return {
    domain: getDomain(),
    async: new AsyncResource("Bluebird::Promise")
  };
};
let Promise$1 = class Promise {
  constructor(executor) {
    if (executor !== INTERNAL) {
      check(this, executor);
    }
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
        ret.classString(didFulfill);
      if (arguments.length > 1) {
        msg += ", " + ret.classString(didReject);
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
      return apiRejection("expecting a function but got " + ret.classString(fn));
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
    return this.caught(ret.originatesFromRejection, fn);
  }
  _then(didFulfill,
    didReject,
    _,
    receiver,
    internalData) {
    const haveInternalData = internalData !== undefined;
    const promise = haveInternalData ? internalData : new Promise(INTERNAL);
    const target = this._target();
    const bitField = target._bitField;
    if (!haveInternalData) {
      promise._propagateFrom(this, 3);
      promise._captureStackTrace();
      if (receiver === undefined && ((this._bitField & 2097152) !== 0)) {
        if (!((bitField & 50397184) === 0)) {
          receiver = this._boundValue();
        } else {
          receiver = target === this ? undefined : this._boundTo;
        }
      }
      this._fireEvent("promiseChained", this, promise);
    }
    const context = getContext();
    if (!((bitField & 50397184) === 0)) {
      let handler, value, settler = target._settlePromiseCtx;
      if (((bitField & 33554432) !== 0)) {
        value = target._rejectionHandler0;
        handler = didFulfill;
      } else if (((bitField & 16777216) !== 0)) {
        value = target._fulfillmentHandler0;
        handler = didReject;
        target._unsetRejectionIsUnhandled();
      } else {
        settler = target._settlePromiseLateCancellationObserver;
        value = new CancellationError("late cancellation observer");
        target._attachExtraTrace(value);
        handler = didReject;
      }
      async.invoke(settler, target, {
        handler: ret.contextBind(context, handler),
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
    return this._bitField & 65535;
  }
  _isFateSealed() {
    return (this._bitField & 117506048) !== 0;
  }
  _isFollowing() {
    return (this._bitField & 67108864) === 67108864;
  }
  _setLength(len) {
    this._bitField = (this._bitField & -65536) |
      (len & 65535);
  }
  _setFulfilled() {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
  }
  _setRejected() {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
  }
  _setFollowing() {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
  }
  _setIsFinal() {
    this._bitField = this._bitField | 4194304;
  }
  _isFinal() {
    return (this._bitField & 4194304) > 0;
  }
  _unsetCancelled() {
    this._bitField = this._bitField & (~65536);
  }
  _setCancelled() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
  }
  _setWillBeCancelled() {
    this._bitField = this._bitField | 8388608;
  }
  _setAsyncGuaranteed() {
    if (async.hasCustomScheduler()) return;
    const bitField = this._bitField;
    this._bitField = bitField | (((bitField & 536870912) >> 2) ^ 134217728);
  }
  _setNoAsyncGuarantee() {
    this._bitField = (this._bitField | 536870912) & (~134217728);
  }
  _receiverAt(index) {
    const ret = index === 0 ? this._receiver0 : this[index * 4 - 1];
    if (ret === UNDEFINED_BINDING) {
      return undefined;
    } else if (ret === undefined && this._isBound()) {
      return this._boundValue();
    }
    return ret;
  }
  _promiseAt(index) {
    return this[index * 4 - 2];
  }
  _fulfillmentHandlerAt(index) {
    return this[index * 4 - 4];
  }
  _rejectionHandlerAt(index) {
    return this[index * 4 - 3];
  }
  _boundValue() {
  }
  _migrateCallback0(follower) {
    const fulfill = follower._fulfillmentHandler0;
    const reject = follower._rejectionHandler0;
    const promise = follower._promise0;
    let receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
  }
  _migrateCallbackAt(follower, index) {
    const fulfill = follower._fulfillmentHandlerAt(index);
    const reject = follower._rejectionHandlerAt(index);
    const promise = follower._promiseAt(index);
    let receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
  }
  _addCallbacks(fulfill, reject, promise, receiver, context) {
    let index = this._length();
    if (index >= 65531) {
      index = 0;
      this._setLength(0);
    }
    if (index === 0) {
      this._promise0 = promise;
      this._receiver0 = receiver;
      if (typeof fulfill === "function") {
        this._fulfillmentHandler0 = ret.contextBind(context, fulfill);
      }
      if (typeof reject === "function") {
        this._rejectionHandler0 = ret.contextBind(context, reject);
      }
    } else {
      const base = index * 4 - 4;
      this[base + 2] = promise;
      this[base + 3] = receiver;
      if (typeof fulfill === "function") {
        this[base] = ret.contextBind(context, fulfill);
      }
      if (typeof reject === "function") {
        this[base + 1] = ret.contextBind(context, reject);
      }
    }
    this._setLength(index + 1);
    return index;
  }
  _proxy(proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
  }
  _resolveCallback(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
      return this._rejectCallback(makeSelfResolutionError(), false);
    const maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);
    if (shouldBind) this._propagateFrom(maybePromise, 2);
    const promise = maybePromise._target();
    if (promise === this) {
      this._reject(makeSelfResolutionError());
      return;
    }
    const bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
      const len = this._length();
      if (len > 0) promise._migrateCallback0(this);
      for (let i = 1; i < len; ++i) {
        promise._migrateCallbackAt(this, i);
      }
      this._setFollowing();
      this._setLength(0);
      this._setFollowee(maybePromise);
    } else if (((bitField & 33554432) !== 0)) {
      this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
      this._reject(promise._reason());
    } else {
      const reason = new CancellationError("late cancellation observer");
      promise._attachExtraTrace(reason);
      this._reject(reason);
    }
  }
  _rejectCallback(reason, synchronous, ignoreNonErrorWarnings) {
    const trace = ret.ensureErrorObject(reason);
    const hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
      const message = "a promise was rejected with a non-error: " +
        ret.classString(reason);
      this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
  }
  _resolveFromExecutor(executor) {
    if (executor === INTERNAL) return;
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
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    let x;
    if (receiver === APPLY) {
      if (!value || typeof value.length !== "number") {
        x = errorObj;
        x.e = new TypeError$1("cannot .spread() a non-array: " +
          ret.classString(value));
      } else {
        x = tryCatch(handler).apply(this._boundValue(), value);
      }
    } else {
      x = tryCatch(handler).call(receiver, value);
    }
    const promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
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
    return this._rejectionHandler0;
  }
  _setFollowee(promise) {
    this._rejectionHandler0 = promise;
  }
  _settlePromise(promise, handler, receiver, value) {
    const isPromise = promise instanceof Promise;
    const bitField = this._bitField;
    const asyncGuaranteed = ((bitField & 134217728) !== 0);
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
      if (!isPromise) {
        handler.call(receiver, value, promise);
      } else {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        this._settlePromiseFromHandler(handler, receiver, value, promise);
      }
    } else if (receiver instanceof Proxyable) {
      if (!receiver._isResolved()) {
        if (((bitField & 33554432) !== 0)) {
          receiver._promiseFulfilled(value, promise);
        } else {
          receiver._promiseRejected(value, promise);
        }
      }
    } else if (isPromise) {
      if (asyncGuaranteed) promise._setAsyncGuaranteed();
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
    const base = index * 4 - 4;
    this[base + 2] =
      this[base + 3] =
      this[base] =
      this[base + 1] = undefined;
  }
  _fulfill(value) {
    const bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
      const err = makeSelfResolutionError();
      this._attachExtraTrace(err);
      return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;
    if ((bitField & 65535) > 0) {
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
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;
    if (this._isFinal()) {
      return async.fatalError(reason, ret.isNode);
    }
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
    const len = (bitField & 65535);
    if (len > 0) {
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
    const bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
      return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
      return this._fulfillmentHandler0;
    }
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
      throw new TypeError$1("expecting a function but got " + ret.classString(fn));
    }
    return async.setScheduler(fn);
  }
};
let getContext = ret.isNode ? getContextDomain : getContextDefault;
ret.notEnumerableProp(Promise$1, "_getContext", getContext);
const enableAsyncHooks = () => {
  getContext = getContextAsyncHooks;
  ret.notEnumerableProp(Promise$1, "_getContext", getContextAsyncHooks);
};
const disableAsyncHooks = () => {
  getContext = getContextDomain;
  ret.notEnumerableProp(Promise$1, "_getContext", getContextDomain);
};
const async = new Async();
Object.defineProperty(Promise$1, "_async", { value: async });
const TypeError$1 = Promise$1.TypeError = errors.TypeError;
Promise$1.RangeError = errors.RangeError;
const CancellationError = Promise$1.CancellationError = errors.CancellationError;
Promise$1.TimeoutError = errors.TimeoutError;
Promise$1.OperationalError = errors.OperationalError;
Promise$1.RejectionError = errors.OperationalError;
Promise$1.AggregateError = errors.AggregateError;
const INTERNAL = function () { };
const APPLY = {};
const NEXT_FILTER = {};
const tryConvertToPromise = _thenables(Promise$1, INTERNAL);
const PromiseArray = _promise_array(Promise$1, INTERNAL, tryConvertToPromise, apiRejection, Proxyable);
const Context = _context(Promise$1);
const createContext = Context.create;
const debug = _debuggability(Promise$1, Context, enableAsyncHooks, disableAsyncHooks);
const PassThroughHandlerContext = _finally(Promise$1, tryConvertToPromise, NEXT_FILTER);
const catchFilter = _catch_filter(NEXT_FILTER);
const errorObj = ret.errorObj;
const tryCatch = ret.tryCatch;
const check = (self, executor) => {
  if (self == null || self.constructor !== Promise$1) {
    throw new TypeError$1("the promise constructor cannot be invoked directly");
  }
  if (typeof executor !== "function") {
    throw new TypeError$1("expecting a function but got " + ret.classString(executor));
  }
};
Promise$1.prototype.caught = Promise$1.prototype.catch = function (...args) {
  const len = args.length;
  if (len > 1) {
    const catchInstances = [];
    for (let i = 0; i < len - 1; ++i) {
      const item = args[i];
      if (ret.isObject(item)) {
        catchInstances.push(item);
      } else {
        return apiRejection("Catch statement predicate: " +
          "expecting an object but got " + ret.classString(item));
      }
    }
    const fn = args[len - 1];
    if (typeof fn !== "function") {
      throw new TypeError$1("The last argument to .catch() must be a function, got " + ret.toString(fn));
    }
    return this.then(undefined, catchFilter(catchInstances, fn, this));
  }
  return this.then(undefined, args[0]);
};
Promise$1.fromNode = Promise$1.fromCallback = function (fn) {
  const ret = new Promise$1(INTERNAL);
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
Promise$1.resolve = Promise$1.fulfilled = Promise$1.cast;
Promise$1.reject = Promise$1.rejected = function (reason) {
  const ret = new Promise$1(INTERNAL);
  ret._captureStackTrace();
  ret._rejectCallback(reason, true);
  return ret;
};
if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
  Object.defineProperty(Promise$1.prototype, Symbol.toStringTag, {
    get: function () {
      return "Object";
    }
  });
}
function deferResolve(v) { this.promise._resolveCallback(v); }
function deferReject(v) { this.promise._rejectCallback(v, false); }
Promise$1.defer = Promise$1.pending = function () {
  debug.deprecated("Promise.defer", "new Promise");
  const promise = new Promise$1(INTERNAL);
  return {
    promise: promise,
    resolve: deferResolve,
    reject: deferReject
  };
};
ret.notEnumerableProp(Promise$1, "_makeSelfResolutionError", makeSelfResolutionError);
_method(Promise$1, INTERNAL, tryConvertToPromise, apiRejection, debug);
_bind(Promise$1, INTERNAL, tryConvertToPromise, debug);
_cancel(Promise$1, PromiseArray, apiRejection, debug);
_direct_resolve(Promise$1);
_synchronous_inspection(Promise$1);
_join(Promise$1, PromiseArray, tryConvertToPromise, INTERNAL, async);
Promise$1.Promise = Promise$1;
Promise$1.version = "0.0.1";
_call_get(Promise$1);
_generators(Promise$1, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_map(Promise$1, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_nodeify(Promise$1);
_promisify(Promise$1, INTERNAL);
_props(Promise$1, PromiseArray, tryConvertToPromise, apiRejection);
_race(Promise$1, INTERNAL, tryConvertToPromise, apiRejection);
_reduce(Promise$1, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_settle(Promise$1, PromiseArray, debug);
_some(Promise$1, PromiseArray, apiRejection);
_timers(Promise$1, INTERNAL, debug);
_using(Promise$1, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_any(Promise$1);
_each(Promise$1, INTERNAL);
_filter(Promise$1, INTERNAL);
ret.toFastProperties(Promise$1);
ret.toFastProperties(Promise$1.prototype);
function fillTypes(value) {
  const p = new Promise$1(INTERNAL);
  p._fulfillmentHandler0 = value;
  p._rejectionHandler0 = value;
  p._promise0 = value;
  p._receiver0 = value;
}
fillTypes({ a: 1 });
fillTypes({ b: 2 });
fillTypes({ c: 3 });
fillTypes(1);
fillTypes(function () { });
fillTypes(undefined);
fillTypes(false);
fillTypes(new Promise$1(INTERNAL));
debug.setBounds(firstLineError, ret.lastLineError);

let old;
if (typeof Promise !== "undefined") {
  old = Promise;
}
function noConflict() {
  try {
    if (Promise === Promise$1) {
      Promise = old;
    }
  } catch (e) { }
  return Promise$1;
}
Promise$1.noConflict = noConflict;

module.exports = Promise$1;
