import util from './util.js';
// import { __BROWSER__ } from "./constant.js";

const cr = Object.create;
const callerCache = cr(null);
const getterCache = cr(null);
callerCache[" size"] = getterCache[" size"] = 0;

export default (Promise) => {
  const canEvaluate = util.canEvaluate;
  const isIdentifier = util.isIdentifier;

  let getMethodCaller;
  let getGetter;
  // if (!__BROWSER__) {
  if (true) {
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
      const message = "Object " + util.classString(obj) + " has no method '" +
        util.toString(methodName) + "'";
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
    // if (!__BROWSER__) {
    if (true) {
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
