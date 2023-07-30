export default (Promise) => {
  function returner() {
    return this.value;
  }
  function thrower() {
    throw this.reason;
  }

  Promise.prototype["return"] =
    Promise.prototype.thenReturn = function (value) {
      if (value instanceof Promise) value.suppressUnhandledRejections();
      return this._then(
        returner, undefined, undefined, { value: value }, undefined);
    };

  Promise.prototype["throw"] =
    Promise.prototype.thenThrow = function (reason) {
      return this._then(
        thrower, undefined, undefined, { reason: reason }, undefined);
    };

  Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
      return this._then(
        undefined, thrower, undefined, { reason: reason }, undefined);
    } else {
      const _reason = arguments[1];
      const handler = function () { throw _reason; };
      return this.caught(reason, handler);
    }
  };

  Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
      if (value instanceof Promise) value.suppressUnhandledRejections();
      return this._then(
        undefined, returner, undefined, { value: value }, undefined);
    } else {
      const _value = arguments[1];
      if (_value instanceof Promise) _value.suppressUnhandledRejections();
      const handler = function () { return _value; };
      return this.caught(value, handler);
    }
  };
};
