import util from './util.js';
const { canEvaluate, tryCatch, errorObj } = util;

// import { __BROWSER__, GENERATED_CLASS_COUNT, IS_FULFILLED, IS_PENDING_AND_WAITING_NEG, IS_REJECTED } from "./constant.js";
// import { BIT_FIELD_CHECK } from "./macro.js";

export default (Promise, PromiseArray, tryConvertToPromise, INTERNAL, async) => {
  let reject;
  const holderClasses = [];
  const thenCallbacks = [];
  const promiseSetters = [];

  // if (!__BROWSER__) {
  if (true) {
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
          (tryCatch, errorObj, Promise, async);
      };

      // for (let i = 0; i < GENERATED_CLASS_COUNT; ++i) {
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
      // if (!__BROWSER__) {
      if (true) {
        // if (last <= GENERATED_CLASS_COUNT && canEvaluate) {
        if (last <= 8 && canEvaluate) {
          const ret = new Promise(INTERNAL);
          ret._captureStackTrace();
          const HolderClass = holderClasses[last - 1];
          const holder = new HolderClass(fn);
          const callbacks = thenCallbacks;

          for (let i = 0; i < last; ++i) {
            let maybePromise = tryConvertToPromise(arguments[i], ret);
            if (maybePromise instanceof Promise) {
              maybePromise = maybePromise._target();
              const bitField = maybePromise._bitField;
              // if (BIT_FIELD_CHECK(IS_PENDING_AND_WAITING_NEG, bitField, true)) {
              if (((bitField & 50397184) === 0)) {
                maybePromise._then(callbacks[i], reject,
                  undefined, ret, holder);
                promiseSetters[i](maybePromise, holder);
                holder.asyncNeeded = false;
                // } else if (BIT_FIELD_CHECK(IS_FULFILLED, bitField)) {
              } else if (((bitField & 33554432) !== 0)) {
                callbacks[i].call(ret,
                  maybePromise._value(), holder);
                // } else if (BIT_FIELD_CHECK(IS_REJECTED, bitField)) {
              } else if (((bitField & 16777216) !== 0)) {
                ret._reject(maybePromise._reason());
              } else {
                ret._cancel();
              }
            } else {
              callbacks[i].call(ret, maybePromise, holder);
            }
          }

          if (!ret._isFateSealed()) {
            if (holder.asyncNeeded) {
              const context = Promise._getContext();
              holder.fn = util.contextBind(context, holder.fn);
            }
            ret._setAsyncGuaranteed();
            ret._setOnCancel(holder);
          }
          return ret;
        }
      }
    }
    // ...args
    const len = arguments.length;
    const args = new Array(len);
    for (let i = 0; i < len; ++i) {
      args[i] = arguments[i];
    };
    if (fn) args.pop();
    const ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
  };

};
