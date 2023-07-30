import util from './util.js';
// import ASSERT from './assert.js';

export default (Promise) => {
  const async = Promise._async;
  const tryCatch = util.tryCatch;
  const errorObj = util.errorObj;

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
    // ASSERT(typeof nodeback == "function");
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
      // ASSERT(!!reason);
    }
    // ASSERT(typeof nodeback == "function");
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
