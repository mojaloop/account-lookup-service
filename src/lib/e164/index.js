'use strict';

module.exports.validate = num => null != num.match(/^\+?[1-9]\d{1,14}$/);
