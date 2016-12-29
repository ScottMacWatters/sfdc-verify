(function() {

  var soap = require('soap');
  var fs = require('fs');
  var enterprise_wsdl = './sfdc_enterprise_wsdl.xml';
  var metadata_wsdl = './sfdc_metadata_wsdl.xml';
  var deployable = fs.readFileSync('./SimpleClass.zip', 'base64');
  var deployOptions = {
    zipFile: deployable,
    DeployOptions : {
      checkOnly: false,
      singlePackage: false,
    }
  };

  module.exports.deploy = function(creds, callback){

    //For some reason, order of this object, matters, so we should ensure that username and password are present and rearrange as necessary.

    var loginOptions = {};
    if(creds.username && creds.password){
      loginOptions.username = creds.username;
      loginOptions.password = creds.password;
    }
    else{
      callback('Credentials not specified');
    }

    //create client to logiun via Enterprise SOAP API
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

        //save the server and session
        var server = loginResult.result.metadataServerUrl;
        var session = loginResult.result.sessionId;

        //create Metadata API client
        soap.createClient(metadata_wsdl, function(err, met_client){
          if(err){
            callback(err.body);
            return;
          }


          //set the session headers for metadata API use
          met_client.setEndpoint(server);
          var sessionHeader = {SessionHeader: {sessionId: session}};
          met_client.addSoapHeader(sessionHeader,'','tns','http://soap.sforce.com/2006/04/metadata');

          //run the deploy
          met_client.deploy(deployOptions, function(err, deployResult){
            if(err){
              callback(err.body);
              return;
            }

            var statusOptions = {
              asyncProcessId: deployResult.result.id
            };

            getSfdcStatusResponse(met_client.checkDeployStatus, statusOptions, function(err, deployStatus){
              if(err){
                callback(err.body);
                return;
              }

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

              callback(null, res);


            });


          });

        });


      });

    });

  }









  function getSfdcStatusResponse(statusFunction, options, callback){
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
        }, 5000);
      }
    });
  }

}());
