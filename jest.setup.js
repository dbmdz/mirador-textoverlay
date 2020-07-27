/* eslint-disable require-jsdoc */

/** Makes navigator.userAgent writable for testing purposes */
Object.defineProperty(window.navigator, 'userAgent', ((initialValue) => {
  let value = initialValue;
  return {
    get() { return value; },
    set(v) { value = v; },
  };
})(window.navigator.userAgent));
