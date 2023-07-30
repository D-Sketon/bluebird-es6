import util from './util.js';
// import ASSERT from './assert.js';
import nodebackForPromise from './nodeback.js';
import errors from './errors.js';
// import {
//   __BROWSER__,
//   AFTER_PROMISIFIED_SUFFIX,
//   FUNCTION_ERROR,
//   MAX_PARAM_COUNT,
//   PARAM_COUNTS_TO_TRY,
//   PROMISIFICATION_NORMAL_METHODS_ERROR,
//   PROMISIFY_TYPE_ERROR,
//   SUFFIX_NOT_IDENTIFIER
// } from "./constant.js";

export default (Promise, INTERNAL) => {
  const THIS = {};
  const withAppended = util.withAppended;
  const maybeWrapAsError = util.maybeWrapAsError;
  const canEvaluate = util.canEvaluate;
  const TypeError = errors.TypeError;
  // const defaultSuffix = AFTER_PROMISIFIED_SUFFIX;
  const defaultSuffix = "Async";
  const defaultPromisified = { __isPromisified__: true };
  const noCopyProps = [
    "arity", // Firefox 4
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
    return util.isIdentifier(name) &&
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
    const val = util.getDataPropertyOrDefault(obj, key + suffix, defaultPromisified);
    return val ? isPromisified(val) : false;
  }
  function checkValid(ret, suffix, suffixRegexp) {
    // Verify that in the list of methods to promisify there is no
    // method that has a name ending in "Async"-suffix while
    // also having a method with the same name but no Async suffix
    for (let i = 0; i < ret.length; i += 2) {
      const key = ret[i];
      if (suffixRegexp.test(key)) {
        const keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
        for (let j = 0; j < ret.length; j += 2) {
          if (ret[j] === keyWithoutAsyncSuffix) {
            // throw new TypeError(PROMISIFICATION_NORMAL_METHODS_ERROR
            //   .replace("%s", suffix));
            throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
              .replace("%s", suffix));
          }
        }
      }
    }
  }

  function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    const keys = util.inheritedDataKeys(obj);
    const ret = [];
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      const value = obj[key];
      const passesDefaultFilter = filter === defaultFilter
        ? true : defaultFilter(key, value, obj);
      if (typeof value === "function" &&
        !isPromisified(value) &&
        !hasPromisified(obj, key, suffix) &&
        filter(key, value, obj, passesDefaultFilter)) {
        ret.push(key, value);
      }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
  }

  const escapeIdentRegex = function (str) {
    return str.replace(/([$])/, "\\$");
  };

  let makeNodePromisifiedEval;
  // if (!__BROWSER__) {
  if (true) {
    //Gives an optimal sequence of argument count to try given a formal parameter
    //.length for a function
    const switchCaseArgumentOrder = function (likelyArgumentCount) {
      const ret = [likelyArgumentCount];
      // const min = Math.max(0, likelyArgumentCount - 1 - PARAM_COUNTS_TO_TRY);
      const min = Math.max(0, likelyArgumentCount - 1 - 3);
      let i;
      for (i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
      }
      // for (i = likelyArgumentCount + 1; i <= PARAM_COUNTS_TO_TRY; ++i) {
      for (i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
      }
      return ret;
    };

    const argumentSequence = function (argumentCount) {
      return util.filledRange(argumentCount, "_arg", "");
    };

    const parameterDeclaration = function (parameterCount) {
      // return util.filledRange(
      //   Math.max(parameterCount, PARAM_COUNTS_TO_TRY), "_arg", "");
      return util.filledRange(Math.max(parameterCount, 3), "_arg", "");
    };

    const parameterCount = function (fn) {
      if (typeof fn.length === "number") {
        // return Math.max(Math.min(fn.length, MAX_PARAM_COUNT + 1), 0);
        return Math.max(Math.min(fn.length, 1024), 0);
      }
      //Unsupported .length for functions
      return 0;
    };

    makeNodePromisifiedEval =
      function (callback, receiver, originalName, fn, _, multiArgs) {
        //-1 for the callback parameter
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
            util.tryCatch,
            util.errorObj,
            util.notEnumerableProp,
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
      // ASSERT(typeof callback === "function");
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
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
  }

  const makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

  function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    // ASSERT(typeof suffix === "string");
    // ASSERT(typeof filter === "function");
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
        util.notEnumerableProp(promisified, "__isPromisified__", true);
        obj[promisifiedKey] = promisified;
      }
    }
    util.toFastProperties(obj);
    return obj;
  }

  function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
      callback, null, multiArgs);
  }

  Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
      // throw new TypeError(FUNCTION_ERROR + util.classString(fn));
      throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
      return fn;
    }
    options = Object(options);
    const receiver = options.context === undefined ? THIS : options.context;
    const multiArgs = !!options.multiArgs;
    const ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
  };

  Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
      // throw new TypeError(PROMISIFY_TYPE_ERROR);
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

    if (!util.isIdentifier(suffix)) {
      // throw new RangeError(SUFFIX_NOT_IDENTIFIER);
      throw new RangeError("suffix must be a valid identifier");
    }

    const keys = util.inheritedDataKeys(target);
    for (let i = 0; i < keys.length; ++i) {
      const value = target[keys[i]];
      if (keys[i] !== "constructor" &&
        util.isClass(value)) {
        promisifyAll(value.prototype, suffix, filter, promisifier,
          multiArgs);
        promisifyAll(value, suffix, filter, promisifier, multiArgs);
      }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
  };
};

