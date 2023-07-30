import util from './util.js';
// import ASSERT from './assert.js';
// import { PROPAGATE_BIND, PROPS_TYPE_ERROR, RESOLVE_MAP, RESOLVE_OBJECT } from "./constant.js";

export default (Promise, PromiseArray, tryConvertToPromise, apiRejection) => {
  const isObject = util.isObject;

  const mapToEntries = (function () {
    let index = 0;
    let size = 0;

    function extractEntry(value, key) {
      this[index] = value;
      this[index + size] = key;
      index++;
    }

    return function mapToEntries(map) {
      size = map.size;
      index = 0;
      const ret = new Array(map.size * 2);
      map.forEach(extractEntry, ret);
      return ret;
    };
  })();

  const entriesToMap = function (entries) {
    const ret = new Map();
    const length = entries.length / 2 | 0;
    for (let i = 0; i < length; ++i) {
      const key = entries[length + i];
      const value = entries[i];
      ret.set(key, value);
    }
    return ret;
  };

  function PropertiesPromiseArray(obj) {
    let isMap = false;
    let entries;
    if (obj instanceof Map) {
      entries = mapToEntries(obj);
      isMap = true;
    } else {
      const keys = Object.keys(obj);
      const len = keys.length;
      entries = new Array(len * 2);
      for (let i = 0; i < len; ++i) {
        const key = keys[i];
        entries[i] = obj[key];
        entries[i + len] = key;
      }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    // this._init$(undefined, isMap ? RESOLVE_MAP : RESOLVE_OBJECT);
    this._init$(undefined, isMap ? -6 : -3);
  }
  util.inherits(PropertiesPromiseArray, PromiseArray);

  //Override
  PropertiesPromiseArray.prototype._init = function () { };

  //Override
  PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    // ASSERT(!this._isResolved());
    // ASSERT(!(value instanceof Promise));
    this._values[index] = value;
    const totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
      let val;
      if (this._isMap) {
        val = entriesToMap(this._values);
      } else {
        val = {};
        const keyOffset = this.length();
        for (let i = 0, len = this.length(); i < len; ++i) {
          val[this._values[i + keyOffset]] = this._values[i];
        }
      }
      this._resolve(val);
      return true;
    }
    return false;
  };

  // Override
  PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
  };

  // Override
  PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
  };

  function props(promises) {
    let ret;
    const castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
      // return apiRejection(PROPS_TYPE_ERROR);
      return apiRejection("cannot await properties of a non-object");
    } else if (castValue instanceof Promise) {
      ret = castValue._then(
        Promise.props, undefined, undefined, undefined, undefined);
    } else {
      ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
      // ret._propagateFrom(castValue, PROPAGATE_BIND);
      ret._propagateFrom(castValue, 2);
    }
    return ret;
  }

  Promise.prototype.props = function () {
    return props(this);
  };

  Promise.props = function (promises) {
    return props(promises);
  };
};
