/* eslint-disable no-console */
const { userService, tokenService } = require('../services');

const getBearerTokenFromHeaders = (headers) => {
  try {
    if (!Object.prototype.hasOwnProperty.call(headers, 'authorization')) throw new Error('No authorization');
    const authorization = headers.authorization.split(' ');
    if (authorization[0] !== 'Bearer') throw new Error('Not bearer token');
    else {
      return authorization[1];
    }
  } catch (e) {
    console.log(e);
    return null;
  }
};

const auth = async (req, res, next) => {
  const token = getBearerTokenFromHeaders(req.headers);
  if (token) {
    try {
      const userId = await tokenService.getIdByToken(token);
      const user = await userService.getUserById(userId);
      req.user = user;
      next();
    } catch (e) {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = auth;
