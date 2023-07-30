import util from './util.js';
import errors from './errors.js';
// import ASSERT from './assert.js';
// import {
//   FROM_PREVIOUS_EVENT,
//   IS_REJECTION_IGNORED,
//   IS_REJECTION_UNHANDLED,
//   IS_UNHANDLED_REJECTION_NOTIFIED,
//   LENGTH_MASK,
//   LONG_STACK_TRACES_ERROR,
//   NO_STACK_TRACE,
//   PROPAGATE_BIND,
//   PROPAGATE_CANCEL,
//   REJECTION_HANDLED_EVENT,
//   RETURNED_NON_UNDEFINED,
//   UNHANDLED_REJECTION_EVENT,
//   UNHANDLED_REJECTION_HEADER
// } from "./constant.js";
// import { BIT_FIELD_READ } from "./macro.js";

export default (Promise, Context, enableAsyncHooks, disableAsyncHooks) => {
  const async = Promise._async;
  const Warning = errors.Warning;
  const canAttachTrace = util.canAttachTrace;
  let unhandledRejectionHandled;
  let possiblyUnhandledRejection;
  const bluebirdFramePattern = /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
  const nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
  const parseLinePattern = /[\/<(](.+?):(\d+):(\d+)\)?\s*$/;
  let stackFramePattern = null;
  let formatStack = null;
  let indentStackFrames = false;
  let printWarning;
  let debugging = !!(util.env("BLUEBIRD_DEBUG") !== 0 &&
    (util.env("BLUEBIRD_DEBUG") || util.env("NODE_ENV") === "development"));

  let warnings = !!(util.env("BLUEBIRD_WARNINGS") !== 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

  let longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") !== 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

  let wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") !== 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

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
    // target._bitField = ((target._bitField & (~IS_REJECTION_UNHANDLED)) |
    //   IS_REJECTION_IGNORED);
    target._bitField = ((target._bitField & (~1048576)) | 524288);
  };

  Promise.prototype._ensurePossibleRejectionHandled = function () {
    // if ((this._bitField & IS_REJECTION_IGNORED) !== 0) return;
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    deferUnhandledRejectionCheck(this);
  };

  Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    // fireRejectionEvent(REJECTION_HANDLED_EVENT,
    //   unhandledRejectionHandled, undefined, this);
    fireRejectionEvent("rejectionHandled",
      unhandledRejectionHandled, undefined, this);
  };

  Promise.prototype._setReturnedNonUndefined = function () {
    // this._bitField = this._bitField | RETURNED_NON_UNDEFINED;
    this._bitField = this._bitField | 268435456;
  };

  Promise.prototype._returnedNonUndefined = function () {
    // return (this._bitField & RETURNED_NON_UNDEFINED) !== 0;
    return (this._bitField & 268435456) !== 0;
  };

  Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
      const reason = this._settledValue();
      this._setUnhandledRejectionIsNotified();
      // fireRejectionEvent(UNHANDLED_REJECTION_EVENT,
      //   possiblyUnhandledRejection, reason, this);
      fireRejectionEvent("unhandledRejection",
        possiblyUnhandledRejection, reason, this);
    }
  };

  Promise.prototype._setUnhandledRejectionIsNotified = function () {
    // this._bitField = this._bitField | IS_UNHANDLED_REJECTION_NOTIFIED;
    this._bitField = this._bitField | 262144;
  };

  Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    // this._bitField = this._bitField & (~IS_UNHANDLED_REJECTION_NOTIFIED);
    this._bitField = this._bitField & (~262144);
  };

  Promise.prototype._isUnhandledRejectionNotified = function () {
    // return (this._bitField & IS_UNHANDLED_REJECTION_NOTIFIED) > 0;
    return (this._bitField & 262144) > 0;
  };

  Promise.prototype._setRejectionIsUnhandled = function () {
    // ASSERT(!this._isFollowing());
    // this._bitField = this._bitField | IS_REJECTION_UNHANDLED;
    this._bitField = this._bitField | 1048576;
  };

  Promise.prototype._unsetRejectionIsUnhandled = function () {
    // ASSERT(!this._isFollowing());
    // this._bitField = this._bitField & (~IS_REJECTION_UNHANDLED);
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
      this._unsetUnhandledRejectionIsNotified();
      this._notifyUnhandledRejectionIsHandled();
    }
  };

  Promise.prototype._isRejectionUnhandled = function () {
    // ASSERT(!this._isFollowing());
    // return (this._bitField & IS_REJECTION_UNHANDLED) > 0;
    return (this._bitField & 1048576) > 0;
  };

  Promise.prototype._warn = function (message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
  };

  Promise.onPossiblyUnhandledRejection = function (fn) {
    const context = Promise._getContext();
    possiblyUnhandledRejection = util.contextBind(context, fn);
  };

  Promise.onUnhandledRejectionHandled = function (fn) {
    const context = Promise._getContext();
    unhandledRejectionHandled = util.contextBind(context, fn);
  };

  let disableLongStackTraces = function () { };
  Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
      // throw new Error(LONG_STACK_TRACES_ERROR);
      throw new Error("cannot enable long stack traces after promises have been created");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
      const Promise_captureStackTrace = Promise.prototype._captureStackTrace;
      const Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
      const Promise_dereferenceTrace = Promise.prototype._dereferenceTrace;
      config.longStackTraces = true;
      disableLongStackTraces = function () {
        if (async.haveItemsQueued() && !config.longStackTraces) {
          // throw new Error(LONG_STACK_TRACES_ERROR);
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
        const ret = util.global.onunhandledrejection;
        util.global.onunhandledrejection = null;
        return ret;
      },
      after: function (fn) {
        util.global.onunhandledrejection = fn;
      }
    },
    rejectionhandled: {
      before: function () {
        const ret = util.global.onrejectionhandled;
        util.global.onrejectionhandled = null;
        return ret;
      },
      after: function (fn) {
        util.global.onrejectionhandled = fn;
      }
    }
  };

  const fireDomEvent = (function () {
    const dispatch = function (legacy, e) {
      if (legacy) {
        let fn;
        try {
          fn = legacy.before();
          return !util.global.dispatchEvent(e);
        } finally {
          legacy.after(fn);
        }
      } else {
        return !util.global.dispatchEvent(e);
      }
    };
    try {
      if (typeof CustomEvent === "function") {
        const event = new CustomEvent("CustomEvent");
        util.global.dispatchEvent(event);
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
        // In Firefox < 48 CustomEvent is not available in workers but
        // Event is.
      } else if (typeof Event === "function") {
        const event = new Event("CustomEvent");
        util.global.dispatchEvent(event);
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
        util.global.dispatchEvent(event);
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
    if (util.isNode) {
      return function () {
        return process.emit.apply(process, arguments);
      };
    } else {
      if (!util.global) {
        return () => false;
      }
      return function (name) {
        const methodName = "on" + name.toLowerCase();
        const method = util.global[methodName];
        if (!method) return false;
        method.apply(util.global, Array.prototype.slice.call(arguments, 1));
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

      if (util.isObject(warningsOption)) {
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
    if ("asyncHooks" in opts && util.nodeSupportsAsyncResource) {
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
            util.toString(onCancel));
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
    // ASSERT(this._isCancellable());
    return this._onCancelField;
  }

  function cancellationSetOnCancel(onCancel) {
    // ASSERT(this._isCancellable());
    this._onCancelField = onCancel;
  }

  function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
  }

  function cancellationPropagateFrom(parent, flags) {
    // ASSERT(flags !== 0);
    // if ((flags & PROPAGATE_CANCEL) !== 0) {
    if ((flags & 1) !== 0) {
      this._cancellationParent = parent;
      let branchesRemainingToCancel = parent._branchesRemainingToCancel;
      if (branchesRemainingToCancel === undefined) {
        branchesRemainingToCancel = 0;
      }
      parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    // if ((flags & PROPAGATE_BIND) !== 0 && parent._isBound()) {
    if ((flags & 2) !== 0 && parent._isBound()) {
      this._setBoundTo(parent._boundTo);
    }
  }

  function bindingPropagateFrom(parent, flags) {
    // ASSERT(flags !== 0);
    // if ((flags & PROPAGATE_BIND) !== 0 && parent._isBound()) {
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
    // ASSERT(this._trace == null);
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
        util.notEnumerableProp(error, "stack",
          parsed.message + "\n" + parsed.stack.join("\n"));
        util.notEnumerableProp(error, "__stackCleaned__", true);
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
      // if (BIT_FIELD_READ(LENGTH_MASK, promise._bitField) === 0) return;
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
      // stacks[i].push(FROM_PREVIOUS_EVENT);
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
      // const isTraceLine = NO_STACK_TRACE === line ||
      //   stackFramePattern.test(line);
      const isTraceLine = "    (No stack trace)" === line ||
        stackFramePattern.test(line);
      const isInternalFrame = isTraceLine && shouldIgnore(line);
      if (isTraceLine && !isInternalFrame) {
        if (indentStackFrames && line.charAt(0) !== " ") {
          // Make Firefox stack traces readable...it is almost
          // impossible to see the event boundaries without
          // indentation.
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
      // if (NO_STACK_TRACE === line || stackFramePattern.test(line)) {
      if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
        break;
      }
    }
    // Chrome and IE include the error message in the stack
    if (i > 0 && error.name !== "SyntaxError") {
      stack = stack.slice(i);
    }
    return stack;
  }

  function parseStackAndMessage(error) {
    let stack = error.stack;
    const message = error.toString();
    // stack = typeof stack === "string" && stack.length > 0
    //   ? stackFramesAsArray(error) : [NO_STACK_TRACE];
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
      if (util.isObject(error)) {
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
        // if (name === REJECTION_HANDLED_EVENT) {
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
      // if (name === UNHANDLED_REJECTION_EVENT) {
      if (!activeFireEvent(name, reason, promise) && !localEventFired) {
        // formatAndLogError(reason, UNHANDLED_REJECTION_HEADER);
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
        ? obj.toString() : util.toString(obj);
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

  // For filtering out internal calls from stack traces
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
    // ASSERT(parent === undefined || parent instanceof CapturedTrace);
    this._parent = parent;
    this._promisesCreated = 0;
    const length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    // Unless the user manually nested > 32 indentation levels,
    // there must be cycles
    if (length > 32) this.uncycle();
  }
  util.inherits(CapturedTrace, Error);
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
    // the node length is only used as heuristic to decide when to decycle, as
    // there may be multiple linked lists that share members and decycling one
    // will fail to update lenghts in the other. This is the correct length.
    length = this._length = i;
    // ASSERT(nodes[0] === this);
    // ASSERT(nodes[nodes.length - 1] instanceof CapturedTrace);

    for (let i = length - 1; i >= 0; --i) {
      const stack = nodes[i].stack;
      if (stackToIndex[stack] === undefined) {
        stackToIndex[stack] = i;
      }
    }
    for (let i = 0; i < length; ++i) {
      const currentStack = nodes[i].stack;
      const index = stackToIndex[currentStack];
      // ASSERT(currentStack === nodes[index].stack);

      if (index !== undefined && index !== i) {
        if (index > 0) {
          // ASSERT(nodes[index - 1]._parent === nodes[index]);
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
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
  };

  const captureStackTrace = (function stackDetection() {
    const v8stackFramePattern = /^\s*at\s*/;
    const v8stackFormatter = function (stack, error) {
      // ASSERT(error !== null);

      if (typeof stack === "string") return stack;

      if (error.name !== undefined &&
        error.message !== undefined) {
        return error.toString();
      }
      return formatNonError(error);
    };

    //V8
    if (typeof Error.stackTraceLimit === "number" &&
      typeof Error.captureStackTrace === "function") {
      Error.stackTraceLimit += 6;
      stackFramePattern = v8stackFramePattern;
      formatStack = v8stackFormatter;
      const captureStackTrace = Error.captureStackTrace;

      // For node
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

    //SpiderMonkey
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
    // IE 10+
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

  })([]);

  if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
      console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
      printWarning = function (message, isSoft) {
        const color = isSoft ? "\u001b[33m" : "\u001b[31m";
        console.warn(color + message + "\u001b[0m\n");
      };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
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
