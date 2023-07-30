import es5 from './es5.js';
// import ASSERT from './assert.js';
// import { BLUEBIRD_ERRORS, OPERATIONAL_ERROR_KEY } from "./constant.js";

import { AsyncResource } from 'async_hooks'
// Assume CSP if browser
const canEvaluate = typeof navigator === "undefined";

// Try catch is not supported in optimizing
// compiler, so it is isolated
const errorObj = { e: {} };
let tryCatchTarget;
const globalObject =
  typeof self !== "undefined"
    ? self
    : typeof window !== "undefined"
      ? window
      : typeof global !== "undefined"
        ? global
        : this !== undefined
          ? this
          : null;

function tryCatcher() {
  try {
    const target = tryCatchTarget;
    tryCatchTarget = null;
    return target.apply(this, arguments);
  } catch (e) {
    errorObj.e = e;
    return errorObj;
  }
}

function tryCatch(fn) {
  // ASSERT(typeof fn === "function");
  tryCatchTarget = fn;
  return tryCatcher;
}

// Un-magical enough that using this doesn't prevent
// extending classes from outside using any convention
const inherits = (Child, Parent) => {
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

function maybeWrapAsError(maybeError) {
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

function notEnumerableProp(obj, name, value) {
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

// 有问题，例如function p(){console.log("this.a = 1")}也被认为是class
// const thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;

// function isClass(fn) {
//   try {
//     if (typeof fn === "function") {
//       const keys = Object.getOwnPropertyNames(fn.prototype);
//       const hasMethods = keys.length > 1;
//       const hasMethodsOtherThanConstructor =
//         keys.length > 0 && !(keys.length === 1 && keys[0] === "constructor");
//       const hasThisAssignmentAndStaticMethods =
//         thisAssignmentPattern.test(fn + "") && Object.getOwnPropertyNames(fn).length > 0;
//       if (
//         hasMethods ||
//         hasMethodsOtherThanConstructor ||
//         hasThisAssignmentAndStaticMethods
//       ) {
//         return true;
//       }
//     }
//     return false;
//   } catch (e) {
//     return false;fn
//   }
// }

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

// Initialize the inline property cache of FastObject
for (let i = 0; i <= kInlineCacheCutoff; i++) {
  FastObject({});
}

function toFastProperties(obj) {
  FastObject(obj);
  // ASSERT("%HasFastProperties", true, obj);
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

function markAsOriginatingFromRejection(e) {
  try {
    // notEnumerableProp(e, OPERATIONAL_ERROR_KEY, true);
    notEnumerableProp(e, "isOperational", true);
  } catch (ignore) { }
}

function originatesFromRejection(e) {
  if (e == null) return false;
  return (
    // e instanceof Error[BLUEBIRD_ERRORS].OperationalError ||
    // e[OPERATIONAL_ERROR_KEY] === true
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

let reflectHandler;
const contextBind = (ctx, cb) => {
  if (
    ctx === null ||
    typeof cb !== "function" ||
    cb === reflectHandler
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
      };
      args[0] = old;
      args[1] = this;
      return async.runInAsyncScope.apply(async, args);
    };
  }
  return cb;
};

const ret = {
  setReflectHandler: (fn) => reflectHandler = fn,
  isClass,
  isIdentifier,
  inheritedDataKeys,
  getDataPropertyOrDefault,
  thrower,
  asArray,
  notEnumerableProp,
  isPrimitive,
  isObject,
  isError,
  canEvaluate,
  errorObj,
  tryCatch,
  inherits,
  withAppended,
  maybeWrapAsError,
  toFastProperties,
  filledRange,
  toString: safeToString,
  canAttachTrace,
  ensureErrorObject,
  originatesFromRejection,
  markAsOriginatingFromRejection,
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
    const res = AsyncResource;
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

export default ret;
