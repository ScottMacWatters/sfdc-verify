(function() {

  var soap = require('soap');
  var fs = require('fs');
  var enterprise_wsdl = './sfdc/wsdl/sfdc_enterprise_wsdl.xml';

  module.exports.sfdcLogin = function(creds, callback){

    //For some reason, order of this object, matters, so we should ensure that username and password are present and rearrange as necessary.
    var loginOptions = {};
    if(creds.username && creds.password){
      loginOptions.username = creds.username;
      loginOptions.password = creds.password;
    }
    else{
      callback('Credentials not specified');
    }

    //create client to login via Enterprise SOAP API
    soap.createClient(enterprise_wsdl, function(err, ent_client){
      if(err){
        callback(err.body);
        return;
      }

      //login
      ent_client.login(loginOptions, function(err, loginResult){
        if(err){
          callback(err.body);
          return;
        }

        callback(null,loginResult);

      });
    });
  }

}());
