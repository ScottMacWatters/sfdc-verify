(function() {


  var fb_admin = require("firebase-admin");

  var firebase_config = {
    "type": "service_account",
    "project_id": process.env.firebase_project_id,
    "private_key_id": process.env.firebase_private_key_id,
    "private_key": process.env.firebase_private_key.replace(/\\n/g,'\n'),
    "client_email": process.env.firebase_client_email,
    "client_id": process.env.firebase_client_id,
    "auth_uri": process.env.firebase_auth_uri,
    "token_uri": process.env.firebase_token_uri,
    "auth_provider_x509_cert_url": process.env.firebase_auth_provider_x509_cert_url,
    "client_x509_cert_url": process.env.firebase_client_x509_cert_url
  };

  var firebase_database_url = process.env.firebase_database_url;

  fb_admin.initializeApp({
    credential: fb_admin.credential.cert(firebase_config),
    databaseURL: firebase_database_url
  });
  var db = fb_admin.database();

  //Note: None of these things are encrypted in the DB.
  //These are essentially throw away orgs with no production
  //code or data so I'm fine not encrytping.
  module.exports.getLogins = function(callback){
     var loginsRef = db.ref('logins/');
     loginsRef.once('value').then(function(snapshot){
       callback(snapshot.val());
     });
  };

  //Note: None of these things are encrypted in the DB.
  //These are essentially throw away orgs with no production
  //code or data so I'm fine not encrytping.
  module.exports.getLogin = function(datacenter,callback){
    var dcLoginRef = db.ref('logins/' + datacenter + '/');
    dcLoginRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  };

  module.exports.saveDeployTime = function(datacenter, deployTimes){
    var id = deployTimes.deployId;
    var dcDeployTimeRef = db.ref('deploy/' + datacenter + '/');

    dcDeployTimeRef.orderByChild('deployId').equalTo(id).once('value').then( function(snapshot){
      if(!snapshot.val()){
        dcDeployTimeRef.push(deployTimes);
      }
      else{
        console.log(datacenter + ": Not saved because duplicate id " + id);
      }
    });
  }

  module.exports.getDeployTimes = function(callback){
    var deployTimesRef = db.ref('deploy/');
    deployTimesRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  };

  module.exports.getDeployTimesForDatacenter = function(datacenter, callback){
    var dcDeployTimesRef = db.ref('deploy/' + datacenter + '/');
    dcDeployTimesRef.once('value').then(function(snapshot){
      callback(snspshot.val());
    });
  };

  module.exports.getDataCenters = function(callback){
    var loginRef = db.ref('logins/');
    loginRef.once('value').then(function(snapshot){
      var dcs = [];
      for(var dc in snapshot.val()){
        dcs.push(dc);
      }
      callback(dcs);
    });
  };

  module.exports.saveDeployRequest = function(datacenter, deployRequestId){
    var dcDeployRequestRef = db.ref('deploy-request/' + datacenter + '/');
    dcDeployRequestRef.push({'asyncProcessId':deployRequestId});
  }

  module.exports.clearCompletedDeployRequest = function(datacenter, deployRequestId){
    var dcDeployRequestRef = db.ref('deploy-request/' + datacenter + '/');

    dcDeployRequestRef.orderByChild('asyncProcessId').equalTo(deployRequestId).once('value').then(function(snapshot) {
      snapshot.forEach(function(child){
        dcDeployRequestRef.child(child.key).remove();
      });
    });
  }

  module.exports.getDeployRequests = function(datacenter, callback){
    var dcDeployRequestRef = db.ref('deploy-request/' + datacenter + '/');
    dcDeployRequestRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  }

}());
