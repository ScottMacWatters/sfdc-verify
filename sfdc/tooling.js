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
  var ID_TOKEN = '<ID>';
  var QUERY_STRING = "SELECT AsyncApexJobId,CreatedDate,EndTime,StartTime,Status FROM ApexTestRunResult WHERE AsyncApexJobId = '" + ID_TOKEN + "'"


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
        callback(null, runTestResult.result);
      })
    });
  }

  module.exports.checkTestTaskResult = function(creds, id, callback, timeout){
    getToolingClient(creds, function(err, tool_client){
      if(err){
        callback(err);
        return;
      }
      var queryOptions = {
        queryString: QUERY_STRING.replace(ID_TOKEN, id)
      }
      
      getQueryStatusResponse(tool_client.query, queryOptions, function(err, record){
        if(err){
          callback(err);
          return;
        }
        var result = getTimingFromTestRunResult(record);
        callback(null, result);
      }, timeout);

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

  function getTimingFromTestRunResult(record){
    var created = record.CreatedDate;
    var completed = record.EndTime;
    var started = record.StartTime;

    var res = {};
    res.createdDate = Date.parse(created);
    res.completedDate = Date.parse(completed);
    res.startDate = Date.parse(started);
    res.deployId = record.AsyncApexJobId;
    res.queuedSeconds = (res.startDate - res.createdDate)/1000;
    res.executionSeconds = (res.completedDate - res.startDate)/1000;

    return res;
  }

  function getQueryStatusResponse(statusFunction, options, callback, timeout){
    statusFunction(options, function(err, response){
      if(err){
        callback(err.body);
        return;
      }
      var record = response.result.records[0];
      if(['Completed','Failed'].includes(record.Status)){
        callback(null, record);
      }
      else if(record.Status === 'Aborted'){
        callback('Job aborted unexpectidly.')
      }
      else{
        setTimeout(function(){
          getQueryStatusResponse(statusFunction, options, callback);
        }, timeout ? timeout : 10000);
      }
    });
  }


}());
