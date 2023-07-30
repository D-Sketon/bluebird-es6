export default (Promise) => {
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
