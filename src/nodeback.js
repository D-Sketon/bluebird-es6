import util from "./util.js";
import errors from './errors.js';
const { maybeWrapAsError, markAsOriginatingFromRejection } = util;
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
      };
      promise._fulfill(args);
    }
    promise = null;
  };
}

export default nodebackForPromise;
