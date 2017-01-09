(function() {

  var soap = require('soap');
  var fs = require('fs');
  var enterprise = require('./enterprise');
  var tooling_wsdl = './sfdc/wsdl/sfdc_tooling_wsdl.xml';
  var runTestsOptions = {
    classIds: null,
    suiteIds: null,
    maxFailedTests: -1,
    testLevel: 'RunSpecifiedTests',
    classNames: 'SimpleDeployableTest',
    suiteNames: null
  };


  module.exports.beginRunTests = function(creds, callback){
    getToolingClient(creds, function(err, tool_client){
      if(err){
        callback(err);
        return;
      }
      tool_client.runTestsAsynchronous(runTestsOptions, function(err, runTestResult){
        if(err){
          callback(err.body)
          return;
        }
        console.log(runTestResult);
        callback('done!');
      })
    });
  }

  function getToolingClient(creds, callback){
    enterprise.sfdcLogin(creds, function(err, loginResult){

      if(err){
        callback(err);
        return;
      }

      //save the server and session
      var server = loginResult.result.serverUrl.replace(/\/c\//, '/T/');
      var session = loginResult.result.sessionId;

      soap.createClient(tooling_wsdl, function(err, tool_client){
        if(err){
          callback(err.body);
          return;
        }


        //set the session headers for metadata API use
        tool_client.setEndpoint(server);
        var sessionHeader = {SessionHeader: {sessionId: session}};
        tool_client.addSoapHeader(sessionHeader,'','tns','urn:tooling.soap.sforce.com');

        callback(null, tool_client);

      });

    });
  }

}());
