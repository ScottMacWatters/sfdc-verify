(function() {

  var DB_DEFAULT = process.env.db_type ? process.env.db_type : 'firebase';

  module.exports = require('./data-access-' + DB_DEFAULT);

}());
