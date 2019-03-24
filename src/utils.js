

/**
 * Implementation of a binary search algorithm which knows how to use both
 * comparison functions and evaluators. If an evaluator is provided, will call
 * the evaluator with the given optional data object, conforming to the
 * interface defined in binarySelect. Otherwise, if a comparison function is
 * provided, will call the comparison function against the given data object.
 *
 * This implementation purposefully does not use goog.bind or goog.partial for
 * performance reasons.
 *
 * Runtime: O(log n)
 *
 * @param {IArrayLike<?>} arr The array to be searched.
 * @param {function(?, ?, ?): number | function(?, ?): number} compareFn
 *     Either an evaluator or a comparison function, as defined by binarySearch
 *     and binarySelect above.
 * @param {boolean} isEvaluator Whether the function is an evaluator or a
 *     comparison function.
 * @param {?=} opt_target If the function is a comparison function, then
 *     this is the target to binary search for.
 * @param {Object=} opt_selfObj If the function is an evaluator, this is an
 *     optional this object for the evaluator.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 * @private
 */
const binarySearch_ = function(
    arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;            // inclusive
  var right = arr.length;  // exclusive
  var found;
  while (left < right) {
    var middle = (left + right) >> 1;
    var compareResult;
    if (isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr);
    } else {
      // NOTE(dimvar): To avoid this cast, we'd have to use function overloading
      // for the type of binarySearch_, which the type system can't express yet.
      compareResult = /** @type {function(?, ?): number} */ (compareFn)(
          opt_target, arr[middle]);
    }
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      // We are looking for the lowest index so we can't return immediately.
      found = !compareResult;
    }
  }
  // left is the index if found, or the insertion point otherwise.
  // ~left is a shorthand for -left - 1.
  return found ? left : ~left;
};

/**
 * Searches the specified array for the specified target using the binary
 * search algorithm.  If no opt_compareFn is specified, elements are compared
 * using <code>goog.array.defaultCompare</code>, which compares the elements
 * using the built in < and > operators.  This will produce the expected
 * behavior for homogeneous arrays of String(s) and Number(s). The array
 * specified <b>must</b> be sorted in ascending order (as defined by the
 * comparison function).  If the array is not sorted, results are undefined.
 * If the array contains multiple instances of the specified target value, any
 * of these instances may be found.
 *
 * Runtime: O(log n)
 *
 * @param {IArrayLike<VALUE>} arr The array to be searched.
 * @param {TARGET} target The sought value.
 * @param {function(TARGET, VALUE): number=} opt_compareFn Optional comparison
 *     function by which the array is ordered. Should take 2 arguments to
 *     compare, the target value and an element from your array, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 * @template TARGET, VALUE
 */
const binarySearch = function(arr, target, opt_compareFn) {
  return binarySearch_(
      arr, opt_compareFn || defaultCompare, false /* isEvaluator */,
      target);
};

/**
 * Compares its two arguments for order, using the built in < and >
 * operators.
 * @param {VALUE} a The first object to be compared.
 * @param {VALUE} b The second object to be compared.
 * @return {number} A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second,
 *     respectively.
 * @template VALUE
 */
const defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};


/**
 * Inserts a value into a sorted array. The array is not modified if the
 * value is already present.
 * @param {IArrayLike<VALUE>} array The array to modify.
 * @param {VALUE} value The object to insert.
 * @param {function(VALUE, VALUE): number=} opt_compareFn Optional comparison
 *     function by which the array is ordered. Should take 2 arguments to
 *     compare, and return a negative number, zero, or a positive number
 *     depending on whether the first argument is less than, equal to, or
 *     greater than the second.
 * @return {boolean} True if an element was inserted.
 * @template VALUE
 */
export const binaryInsert = function(array, value, opt_compareFn) {
  var index = binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};

/**
 * Inserts an object at the given index of the array.
 * @param {IArrayLike<?>} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
const insertAt = function(arr, obj, opt_i) {
  splice(arr, opt_i, 0, obj);
};

/**
 * Adds or removes elements from an array. This is a generic version of Array
 * splice. This means that it might work on other objects similar to arrays,
 * such as the arguments object.
 *
 * @param {IArrayLike<T>} arr The array to modify.
 * @param {number|undefined} index The index at which to start changing the
 *     array. If not defined, treated as 0.
 * @param {number} howMany How many elements to remove (0 means no removal. A
 *     value below 0 is treated as zero and so is any other non number. Numbers
 *     are floored).
 * @param {...T} var_args Optional, additional elements to insert into the
 *     array.
 * @return {!Array<T>} the removed elements.
 * @template T
 */
const splice = function(arr, index, howMany, var_args) {
  return Array.prototype.splice.apply(arr, slice(arguments, 1));
};

/**
 * Returns a new array from a segment of an array. This is a generic version of
 * Array slice. This means that it might work on other objects similar to
 * arrays, such as the arguments object.
 *
 * @param {IArrayLike<T>|string} arr The array from
 * which to copy a segment.
 * @param {number} start The index of the first element to copy.
 * @param {number=} opt_end The index after the last element to copy.
 * @return {!Array<T>} A new array containing the specified segment of the
 *     original array.
 * @template T
 */
const slice = function(arr, start, opt_end) {

  // passing 1 arg to slice is not the same as passing 2 where the second is
  // null or undefined (in that case the second argument is treated as 0).
  // we could use slice on the arguments object and then use apply instead of
  // testing the length
  if (arguments.length <= 2) {
    return Array.prototype.slice.call(arr, start);
  } else {
    return Array.prototype.slice.call(arr, start, opt_end);
  }
};