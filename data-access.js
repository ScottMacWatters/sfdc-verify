(function() {

  var fb_admin = require("firebase-admin");

  //String to differentiate from testing and prod data.
  //Should probably set up a new project for local use but ... eh.
  var testingNamespace = process.env.firebase_testing_namespace;

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

  var deployRefName = (testingNamespace ? testingNamespace : '') + 'deploy';
  var testRefName = (testingNamespace ? testingNamespace : '') + 'test';

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
    var dcDeployTimeRef = db.ref(deployRefName + '/' + datacenter + '/' + id + '/');
    dcDeployTimeRef.set(deployTimes);
  }

  module.exports.getDeployTimes = function(callback){
    var deployTimesRef = db.ref(deployRefName + '/');
    deployTimesRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  };

  module.exports.getDeployTimesForDatacenterForDates = function(datacenter, startTime, endTime, callback){
    var deployDcRef = db.ref(deployRefName + '/' + datacenter + '/');
    deployDcRef.orderByChild('createdDate').startAt(startTime).endAt(endTime).once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  }

  module.exports.getDeployTimesForDatacenter = function(datacenter, callback){
    var dcDeployTimesRef = db.ref(deployRefName + '/' + datacenter + '/');
    dcDeployTimesRef.once('value').then(function(snapshot){
      callback(snapshot.val());
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
    var dcDeployRequestRef = db.ref(deployRefName + '-request/' + datacenter + '/');
    dcDeployRequestRef.push({'asyncProcessId':deployRequestId});
  }

  module.exports.clearCompletedDeployRequest = function(datacenter, deployRequestId){
    var dcDeployRequestRef = db.ref(deployRefName + '-request/' + datacenter + '/');

    dcDeployRequestRef.orderByChild('asyncProcessId').equalTo(deployRequestId).once('value').then(function(snapshot) {
      snapshot.forEach(function(child){
        dcDeployRequestRef.child(child.key).remove();
      });
    });
  }

  module.exports.getDeployRequests = function(datacenter, callback){
    var dcDeployRequestRef = db.ref(deployRefName + '-request/' + datacenter + '/');
    dcDeployRequestRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  }

  module.exports.saveTestRequest = function(datacenter, testRequestId){
    var dcTestRequestRef = db.ref(testRefName + '-request/' + datacenter + '/');
    dcTestRequestRef.push({'asyncApexJobId':testRequestId});
  }

  module.exports.clearCompletedTestRequest = function(datacenter, testRequestId){
    var dcTestRequestRef = db.ref(testRefName + '-request/' + datacenter + '/');

    dcTestRequestRef.orderByChild('asyncApexJobId').equalTo(testRequestId).once('value').then(function(snapshot){
      snapshot.forEach(function(child){
        dcTestRequestRef.child(child.key).remove();
      });
    });
  }

  module.exports.getTestRequests = function(datacenter, callback){
    var dcTestRequestRef = db.ref(testRefName + '-request/' + datacenter + '/');
    dcTestRequestRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  }

  module.exports.saveTestTime = function(datacenter, testTimes){
    var id = testTimes.deployId;
    var dcTestRequestRef = db.ref(testRefName + '/' + datacenter + '/' + id + '/');
    dcTestRequestRef.set(testTimes);
  }

  module.exports.getTestTimes = function(callback){
    var testRequestRef = db.ref(testRefName + '/');
    testRequestRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  };

  module.exports.getTestTimesForDatacenterForDates = function(datacenter, startTime, endTime, callback){
    var testRequestRef = db.ref(testRefName + '/' + datacenter + '/');
    testRequestRef.orderByChild('createdDate').startAt(startTime).endAt(endTime).once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  }

  module.exports.getTestTimesForDatacenter = function(datacenter, callback){
    var testRequestRef = db.ref(testRefName + '/' + datacenter + '/');
    testRequestRef.once('value').then(function(snapshot){
      callback(snapshot.val());
    });
  };


}());
