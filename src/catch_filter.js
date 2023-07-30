import util from './util.js';
export default (NEXT_FILTER) => {
  const tryCatch = util.tryCatch;
  const errorObj = util.errorObj;

  return function catchFilter(instances, cb, promise) {
    return function (e) {
      const boundTo = promise._boundValue();
      predicateLoop: for (let i = 0; i < instances.length; ++i) {
        const item = instances[i];

        if (item === Error ||
          (item != null && item.prototype instanceof Error)) {
          if (e instanceof item) {
            return tryCatch(cb).call(boundTo, e);
          }
        } else if (typeof item === "function") {
          const matchesPredicate = tryCatch(item).call(boundTo, e);
          if (matchesPredicate === errorObj) {
            return matchesPredicate;
          } else if (matchesPredicate) {
            return tryCatch(cb).call(boundTo, e);
          }
        } else if (util.isObject(e)) {
          const keys = Object.keys(item);
          for (let j = 0; j < keys.length; ++j) {
            const key = keys[j];
            if (item[key] !== e[key]) {
              continue predicateLoop;
            }
          }
          return tryCatch(cb).call(boundTo, e);
        }
      }
      return NEXT_FILTER;
    };
  }
};
