export default function (Promise, INTERNAL) {
  const PromiseMap = Promise.map;

  Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
  };

  Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
  };
};
