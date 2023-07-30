import schedule from './schedule.js';
import Queue from './queue.js';
// import ASSERT from './assert.js';
// import { LATE_QUEUE_CAPACITY, NO_ASYNC_SCHEDULER, NORMAL_QUEUE_CAPACITY } from "./constant.js";
class Async {
  constructor() {
    this._customScheduler = false;
    this._isTickUsed = false;
    // this._lateQueue = new Queue(LATE_QUEUE_CAPACITY);
    // this._normalQueue = new Queue(NORMAL_QUEUE_CAPACITY);
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._schedule = schedule;
    this.drainQueues = () => {
      this._drainQueues();
    };
  }

  setScheduler(fn) {
    const prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
  }

  hasCustomScheduler() {
    return this._customScheduler;
  }

  haveItemsQueued() {
    return this._isTickUsed || this._haveDrainedQueues;
  }

  fatalError(e, isNode) {
    if (isNode) {
      process.stderr.write(`Fatal ${e instanceof Error ? e.stack : e}\n`);
      process.exit(2);
    } else {
      this.throwLater(e);
    }
  }

  throwLater(fn, arg) {
    if (arguments.length === 1) {
      arg = fn;
      fn = () => { throw arg; };
    }
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        fn(arg);
      }, 0);
    } else {
      try {
        this._schedule(() => {
          fn(arg);
        });
      } catch (e) {
        // throw new Error(NO_ASYNC_SCHEDULER);
        throw new Error('No async scheduler available');
      }
    }
  }

  invokeLater(fn, receiver, arg) {
    // ASSERT(arguments.length === 3);
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
  }

  invoke(fn, receiver, arg) {
    // ASSERT(arguments.length === 3);
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
  }

  settlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
  }

  _drainQueues() {
    // ASSERT(this._isTickUsed);
    _drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    _drainQueue(this._lateQueue);
  }

  _queueTick() {
    if (!this._isTickUsed) {
      this._isTickUsed = true;
      this._schedule(this.drainQueues);
    }
  }

  _reset() {
    this._isTickUsed = false;
  }
}

function _drainQueue(queue) {
  while (queue.length() > 0) {
    _drainQueueStep(queue);
  }
}

function _drainQueueStep(queue) {
  const fn = queue.shift();
  if (typeof fn !== 'function') {
    fn._settlePromises();
  } else {
    const receiver = queue.shift();
    const arg = queue.shift();
    fn.call(receiver, arg);
  }
}

const firstLineError = (() => {
  try {
    throw new Error();
  } catch (e) {
    return e;
  }
})();

export { firstLineError };
export default Async;
