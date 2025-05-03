require('dotenv').config();

module.exports = {
  database: require('./database'),
  firebase: require('./firebase'),
  s3: require('./s3')
};
