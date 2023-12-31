export default (Promise, INTERNAL) => {
  const PromiseReduce = Promise.reduce;
  const PromiseAll = Promise.all;

  function promiseAllThis() {
    return PromiseAll(this);
  }

  function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
  }

  Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
      ._then(promiseAllThis, undefined, undefined, this, undefined);
  };

  Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
  };

  Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
      ._then(promiseAllThis, undefined, undefined, promises, undefined);
  };

  Promise.mapSeries = PromiseMapSeries;
};

