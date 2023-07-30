export const __BROWSER__ = false;

//async.js
export const LATE_QUEUE_CAPACITY = 16;
export const NORMAL_QUEUE_CAPACITY = 16;

//errors.js
export const ERROR_HANDLED_KEY = "__promiseHandled__";
export const OPERATIONAL_ERROR_KEY = "isOperational";
export const DEFAULT_STATE = 0;
export const STACK_ATTACHED = 1;
export const ERROR_HANDLED = 2;

//error.js
export const BLUEBIRD_ERRORS = "__BluebirdErrorTypes__";

//join.js
export const GENERATED_CLASS_COUNT = 8;

//promise.js
export const USE_BOUND = true;
export const DONT_USE_BOUND = false;

export const PROPAGATE_CANCEL = 1;
export const PROPAGATE_BIND = 2;
export const PROPAGATE_ALL = PROPAGATE_CANCEL | PROPAGATE_BIND;

export const CALLBACK_FULFILL_OFFSET = 0;
export const CALLBACK_REJECT_OFFSET = 1;
export const CALLBACK_PROMISE_OFFSET = 2;
export const CALLBACK_RECEIVER_OFFSET = 3;
export const CALLBACK_SIZE = 4;
//Layout for ._bitField
//[RR]XO GWFN CTBH IUDE LLLL LLLL LLLL LLLL
//[RR] = [Reserved] (Both bits are either on or off to represent
//                    1 bit due to 31-bit integers in 32-bit v8)
//R = [Reserved]
//X = noAsyncGuarantee
//O = returnedNonUndefined
//G = isAsyncGuaranteed
//W = isFollowing (The promise that is being followed is not stored explicitly)
//F = isFulfilled
//N = isRejected
//C = willBeCancelled
//T = isFinal (used for .done() implementation)
//B = isBound
//I = isRejectionIgnored
//H = isRejectionUnhandled
//U = isUnhanldedRejectionNotified
//D = isDisposable
//E = isCancelled
//L = Length, 16 bit unsigned
export const ASYNC_GUARANTEE_SHIFT = 2;
export const NO_STATE = 0x0 | 0;
export const NO_ASYNC_GUARANTEE = 0x20000000 | 0;
export const RETURNED_NON_UNDEFINED = 0x10000000 | 0;
export const IS_ASYNC_GUARANTEED = 0x8000000 | 0;
export const IS_FOLLOWING = 0x4000000 | 0;
export const IS_FULFILLED = 0x2000000 | 0;
export const IS_REJECTED = 0x1000000 | 0;
export const WILL_BE_CANCELLED = 0x800000 | 0;
export const IS_FINAL = 0x400000 | 0;
export const IS_BOUND = 0x200000 | 0;
export const IS_REJECTION_UNHANDLED = 0x100000 | 0;
export const IS_REJECTION_IGNORED = 0x80000 | 0;
export const IS_UNHANDLED_REJECTION_NOTIFIED = 0x40000 | 0;
export const IS_DISPOSABLE = 0x20000 | 0;
export const IS_CANCELLED = 0x10000 | 0;
export const IS_CANCELLED_OR_WILL_BE_CANCELLED = IS_CANCELLED | WILL_BE_CANCELLED;
export const LENGTH_MASK = 0xFFFF | 0;
export const LENGTH_CLEAR_MASK = ~LENGTH_MASK;
export const MAX_LENGTH = LENGTH_MASK;
export const IS_REJECTED_OR_CANCELLED = IS_REJECTED | IS_CANCELLED;
export const IS_REJECTED_OR_FULFILLED = IS_REJECTED | IS_FULFILLED;
export const IS_REJECTED_OR_FULFILLED_OR_CANCELLED = IS_REJECTED | IS_FULFILLED | IS_CANCELLED;
export const IS_PENDING_AND_WAITING_NEG = IS_REJECTED_OR_FULFILLED_OR_CANCELLED;

export const IS_FATE_SEALED = IS_REJECTED | IS_FULFILLED | IS_FOLLOWING | IS_CANCELLED;

export const AFTER_PROMISIFIED_SUFFIX = "Async";
export const UNHANDLED_REJECTION_EVENT = "unhandledRejection";
export const REJECTION_HANDLED_EVENT = "rejectionHandled";

//promise_array.js
//MUST BE NEGATIVE NUMBERS
export const RESOLVE_UNDEFINED = -1;
export const RESOLVE_ARRAY = -2;
export const RESOLVE_OBJECT = -3;
export const RESOLVE_FOREVER_PENDING = -4;
export const RESOLVE_CALL_METHOD = -5;
export const RESOLVE_MAP = -6;

//queue.js
export const QUEUE_MAX_CAPACITY = (1 << 30) | 0;
export const QUEUE_MIN_CAPACITY = 16;

//captured_trace.js
export const FROM_PREVIOUS_EVENT = "From previous event:";
export const NO_STACK_TRACE = "    (No stack trace)";
export const ADDITIONAL_STACK_TRACE = "^--- With additional stack trace: ";
export const UNHANDLED_REJECTION_HEADER = "Unhandled rejection ";

//finally.js
export const FINALLY_TYPE = 0;
export const TAP_TYPE = 1;

//direct_resolve.js
export const THROW = 1;
export const RETURN = 2;

//promisify.js
export const MAX_PARAM_COUNT = 1023;
export const PARAM_COUNTS_TO_TRY = 3;

//deprecated
export const OBJECT_PROMISIFY_DEPRECATED = "Promise.promisify for promisifying entire objects is deprecated. Use Promise.promisifyAll instead.\n\n\
    See http://goo.gl/MqrFmX";
export const SPAWN_DEPRECATED = "Promise.spawn is deprecated. Use Promise.coroutine instead.";

//errors
export const LATE_CANCELLATION_OBSERVER = "late cancellation observer";
export const TIMEOUT_ERROR = "operation timed out";
export const COLLECTION_ERROR = "expecting an array or an iterable object but got ";
export const OBJECT_ERROR = "expecting an object but got ";
export const FUNCTION_ERROR = "expecting a function but got ";
export const CONSTRUCT_ERROR_INVOCATION = "the promise constructor cannot be invoked directly\n\n\
    See http://goo.gl/MqrFmX\n";
export const NOT_GENERATOR_ERROR = "generatorFunction must be a function\n\n\
    See http://goo.gl/MqrFmX\n";
export const LONG_STACK_TRACES_ERROR = "cannot enable long stack traces after promises have been created\n\n\
    See http://goo.gl/MqrFmX\n";
export const INSPECTION_VALUE_ERROR = "cannot get fulfillment value of a non-fulfilled promise\n\n\
    See http://goo.gl/MqrFmX\n";
export const INSPECTION_REASON_ERROR = "cannot get rejection reason of a non-rejected promise\n\n\
    See http://goo.gl/MqrFmX\n";
export const PROMISIFY_TYPE_ERROR = "the target of promisifyAll must be an object or a function\n\n\
    See http://goo.gl/MqrFmX\n";
export const CIRCULAR_RESOLUTION_ERROR = "circular promise resolution chain\n\n\
    See http://goo.gl/MqrFmX\n";
export const PROPS_TYPE_ERROR = "cannot await properties of a non-object\n\n\
    See http://goo.gl/MqrFmX\n";
export const POSITIVE_INTEGER_ERROR = "expecting a positive integer\n\n\
    See http://goo.gl/MqrFmX\n";
export const YIELDED_NON_PROMISE_ERROR = "A value %s was yielded that could not be treated as a promise\n\n\
    See http://goo.gl/MqrFmX\n\n";
export const FROM_COROUTINE_CREATED_AT = "From coroutine:\n";
export const UNBOUND_RESOLVER_INVOCATION = "Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\n\n\
    See http://goo.gl/MqrFmX\n";
export const PROMISIFICATION_NORMAL_METHODS_ERROR = "Cannot promisify an API that has normal methods with '%s'-suffix\n\n\
    See http://goo.gl/MqrFmX\n";
export const SUFFIX_NOT_IDENTIFIER = "suffix must be a valid identifier\n\n\
    See http://goo.gl/MqrFmX\n";
export const NO_ASYNC_SCHEDULER = "No async scheduler available\n\n\
    See http://goo.gl/MqrFmX\n";
