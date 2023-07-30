import util from './util.js';
import { BLUEBIRD_ERRORS, OPERATIONAL_ERROR_KEY } from "./constant.js";
const { inherits, notEnumerableProp } = util;

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
const CancellationError = subError("CancellationError", "cancellation error");
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

function OperationalError(message) {
  if (!(this instanceof OperationalError))
    return new OperationalError(message);
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

inherits(OperationalError, Error);

//Ensure all copies of the library throw the same error types
let errorTypes = Error[BLUEBIRD_ERRORS];
if (!errorTypes) {
  errorTypes = Object.freeze({
    CancellationError,
    TimeoutError,
    OperationalError,
    RejectionError: OperationalError,
    AggregateError,
  });
  Object.defineProperty(Error, BLUEBIRD_ERRORS, {
    value: errorTypes,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

export default {
  Error: Error,
  TypeError: _TypeError,
  RangeError: _RangeError,
  CancellationError: errorTypes.CancellationError,
  OperationalError: errorTypes.OperationalError,
  TimeoutError: errorTypes.TimeoutError,
  AggregateError: errorTypes.AggregateError,
  Warning: Warning,
};
