// import ASSERT from './assert.js';

export default (Promise) => {
  const SomePromiseArray = Promise._SomePromiseArray;

  const any = (promises) => {
    const ret = new SomePromiseArray(promises);
    const promise = ret.promise();
    // ASSERT(promise.isPending());
    // ASSERT(ret instanceof SomePromiseArray);
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
  };

  Promise.any = (promises) => any(promises);
  Promise.prototype.any = function () {
    return any(this);
  };
};
