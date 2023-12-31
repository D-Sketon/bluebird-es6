import util from './util.js';
// import ASSERT from './assert.js';
export default (Promise, PromiseArray, apiRejection, debug) => {
  const tryCatch = util.tryCatch;
  const errorObj = util.errorObj;
  const async = Promise._async;

  Promise.prototype["break"] = Promise.prototype.cancel = function () {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    let promise = this;
    let child = promise;
    while (promise._isCancellable()) {
      if (!promise._cancelBy(child)) {
        if (child._isFollowing()) {
          child._followee().cancel();
        } else {
          child._cancelBranched();
        }
        break;
      }

      const parent = promise._cancellationParent;
      if (parent == null || !parent._isCancellable()) {
        if (promise._isFollowing()) {
          promise._followee().cancel();
        } else {
          promise._cancelBranched();
        }
        break;
      } else {
        if (promise._isFollowing()) promise._followee().cancel();
        promise._setWillBeCancelled();
        child = promise;
        promise = parent;
      }
    }
  };

  Promise.prototype._branchHasCancelled = function () {
    // ASSERT(typeof this._branchesRemainingToCancel === "number");
    this._branchesRemainingToCancel--;
  };

  Promise.prototype._enoughBranchesHaveCancelled = function () {
    return this._branchesRemainingToCancel === undefined ||
      this._branchesRemainingToCancel <= 0;
  };

  Promise.prototype._cancelBy = function (canceller) {
    if (canceller === this) {
      this._branchesRemainingToCancel = 0;
      this._invokeOnCancel();
      return true;
    } else {
      // ASSERT(canceller._cancellationParent === this);
      this._branchHasCancelled();
      if (this._enoughBranchesHaveCancelled()) {
        this._invokeOnCancel();
        return true;
      }
    }
    return false;
  };

  Promise.prototype._cancelBranched = function () {
    if (this._enoughBranchesHaveCancelled()) {
      this._cancel();
    }
  };

  Promise.prototype._cancel = function () {
    if (!this._isCancellable()) return;
    // ASSERT(!this._isFollowing());
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
  };

  Promise.prototype._cancelPromises = function () {
    if (this._length() > 0) this._settlePromises();
  };

  Promise.prototype._unsetOnCancel = function () {
    // ASSERT(this._isCancellable() || this._isCancelled());
    this._onCancelField = undefined;
  };

  Promise.prototype._isCancellable = function () {
    return this.isPending() && !this._isCancelled();
  };

  Promise.prototype.isCancellable = function () {
    return this.isPending() && !this.isCancelled();
  };

  Promise.prototype._doInvokeOnCancel = function (onCancelCallback, internalOnly) {
    if (Array.isArray(onCancelCallback)) {
      for (let i = 0; i < onCancelCallback.length; ++i) {
        this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
      }
    } else if (onCancelCallback !== undefined) {
      if (typeof onCancelCallback === "function") {
        if (!internalOnly) {
          const e = tryCatch(onCancelCallback).call(this._boundValue());
          if (e === errorObj) {
            this._attachExtraTrace(e.e);
            async.throwLater(e.e);
          }
        }
      } else {
        onCancelCallback._resultCancelled(this);
      }
    }
  };

  Promise.prototype._invokeOnCancel = function () {
    const onCancelCallback = this._onCancel();
    // The existence of onCancel handler on a promise signals that the handler
    // has not been queued for invocation yet.
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
  };

  Promise.prototype._invokeInternalOnCancel = function () {
    if (this._isCancellable()) {
      this._doInvokeOnCancel(this._onCancel(), true);
      this._unsetOnCancel();
    }
  };

  Promise.prototype._resultCancelled = function () {
    this.cancel();
  };

};
