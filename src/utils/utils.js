/**
 * Convert hour to millisecond
 * @param {number} hour
 * @returns {number}
 */

const hourToMillisecond = (hour) => hour * 60 * 60 * 1000;

/**
 * Convert minute to millisecond
 * @param {number} hour
 * @returns {number}
 */

const minuteToMillisecond = (minute) => minute * 60 * 1000;

module.exports = {
  hourToMillisecond,
  minuteToMillisecond,
};
