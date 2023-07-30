import ASSERT from './assert.js';

function arrayMove(src, srcIndex, dst, dstIndex, len) {
  for (let j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = undefined;
  }
}

class Queue {
  constructor(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
  }

  _willBeOverCapacity(size) {
    return this._capacity < size;
  }

  _pushOne(arg) {
    const length = this.length();
    this._checkCapacity(length + 1);
    const i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
  }

  push(fn, receiver, arg) {
    // ASSERT(arguments.length === 3);
    // ASSERT(typeof fn === "function");
    const length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
      // The fast array copies expect the
      // underlying array to be filled completely
      this._pushOne(fn);
      this._pushOne(receiver);
      this._pushOne(arg);
      return;
    }
    const j = this._front + length - 3;
    this._checkCapacity(length);
    const wrapMask = this._capacity - 1;
    this[(j) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
  }

  shift() {
    // ASSERT(this.length() > 0);
    const front = this._front;
    const ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
  }

  length() {
    return this._length;
  }

  _checkCapacity(size) {
    if (this._capacity < size) {
      this._resizeTo(this._capacity << 1);
    }
  }

  _resizeTo(capacity) {
    const oldCapacity = this._capacity;
    this._capacity = capacity;
    const front = this._front;
    const length = this._length;
    const moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
  }
}

export default Queue;
