(function() {

  var soap = require('soap');
  var fs = require('fs');
  var enterprise = require('./enterprise');
  var metadata_wsdl = './sfdc/wsdl/sfdc_metadata_wsdl.xml';
  var deployable = fs.readFileSync('./sfdc/res/simpleClasses.zip', 'base64');
  var deployOptions = {
    zipFile: deployable,
    DeployOptions : {
      checkOnly: false,
      singlePackage: false,
    }
  };


  module.exports.beginDeploy = function(creds, callback) {
    getMetadataClient(creds, function(err, met_client){
      met_client.deploy(deployOptions, function(err, deployResult){
        if(err){
          callback(err.body);
          return;
        }
        callback(null,deployResult.result.id);
      })
    });
  }

  module.exports.checkDeployStatus = function(creds, id, callback, timeout){
    getMetadataClient(creds, function(err, met_client){
      if(err){
        callback(err);
        return;
      }

      var statusOptions = {
        asyncProcessId: id
      };

      getSfdcStatusResponse(met_client.checkDeployStatus, statusOptions, function(err, deployStatus){
        if(err){
          callback(err.body);
          return;
        }

        callback(null, getTimingFromStatus(deployStatus));


      }, timeout);
    });

  }

  function getTimingFromStatus(deployStatus){
    var created = deployStatus.result.createdDate;
    var completed = deployStatus.result.completedDate;
    var started = deployStatus.result.startDate;

    var res = {};
    res.createdDate = Date.parse(created);
    res.completedDate = Date.parse(completed);
    res.startDate = Date.parse(started);
    res.deployId = deployStatus.result.id;
    res.queuedSeconds = (res.startDate - res.createdDate)/1000;
    res.executionSeconds = (res.completedDate - res.startDate)/1000;

    return res;
  }

  function getMetadataClient(creds, callback){
    enterprise.sfdcLogin(creds, function(err, loginResult){

      if(err){
        callback(err);
        return;
      }

      //save the server and session
      var server = loginResult.result.metadataServerUrl;
      var session = loginResult.result.sessionId;

      soap.createClient(metadata_wsdl, function(err, met_client){
        if(err){
          callback(err.body);
          return;
        }


        //set the session headers for metadata API use
        met_client.setEndpoint(server);
        var sessionHeader = {SessionHeader: {sessionId: session}};
        met_client.addSoapHeader(sessionHeader,'','tns','http://soap.sforce.com/2006/04/metadata');

        callback(null, met_client);

      });

    });
  }

  function getSfdcStatusResponse(statusFunction, options, callback, timeout){
    statusFunction(options, function(err, response){
      if(err){
        callback(err,response);
      }
      else if(response.result.done){
        callback(err, response);
      }
      else {
        setTimeout(function(){
          getSfdcStatusResponse(statusFunction, options, callback);
        }, timeout ? timeout : 10000);
      }
    });
  }

}());
