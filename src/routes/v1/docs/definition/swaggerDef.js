const { version } = require('../../../../../package.json');
const config = require('../../../../config/config');

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'Backend API documentation',
    version,
  },
  servers: [
    {
      url: `http://localhost:${config.port}/v1`,
      description: 'Local development server',
    },
    {
      url: `${config.backendUrl}/v1`,
      description: 'Backend GCP server',
    },
  ],
};

module.exports = swaggerDef;
