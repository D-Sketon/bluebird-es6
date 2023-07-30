class AssertionError extends Error {
  constructor(a) {
    super(a);
    this.message = a;
    this.name = "AssertionError";
  }
}

function getParams(args) {
  const params = [];
  for (let i = 0; i < args.length; ++i) {
    params.push(`arg${i}`);
  }
  return params;
}

function nativeAssert(callName, args, expect) {
  try {
    const params = getParams(args);
    const constructorArgs = [...params, `return ${callName}(${params.join(",")});`];
    const fn = Function(...constructorArgs);
    return fn(...args);
  } catch (e) {
    if (!(e instanceof SyntaxError)) {
      throw e;
    } else {
      return expect;
    }
  }
}

export default function assert(boolExpr, message) {
  if (boolExpr === true) return;

  if (typeof boolExpr === "string" && boolExpr.charAt(0) === "%") {
    const nativeCallName = boolExpr;
    const args = [...arguments].slice(2);
    if (nativeAssert(nativeCallName, args, message) === message) return;
    message = `${nativeCallName} !== ${message}`;
  }

  const ret = new AssertionError(message);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(ret, assert);
  }
  throw ret;
}