(function() {

  var mongo = require('mongodb').MongoClient;

  var url = process.env.MONGODB_URI;

  var _db;
  var connecting = false;

  function db(cName, callback){
    if(!_db && !connecting){
      connecting = true;
      mongo.connect(url, function(err, mdb){
        if(err){
          console.log(err);
          return callback(null,err);
        }
        _db = mdb;
        return callback(_db.collection(cName));
      });
    }
    else if(!_db && connecting){
      setTimeout(function(){
        db(cName,callback);
      },500);
      return;
    }
    else{
      return callback(_db.collection(cName));
    }
  }

  function stripId(obj){
    delete obj._id;
    return obj;
  }

  function splitByDcAndKey(arr,keyName){
    var ret = {};
    arr.forEach(function(doc){
      if(!ret[doc.dc]) ret[doc.dc] = {};
      var dc = doc.dc;
      delete doc._id;
      delete doc.dc;
      ret[dc][doc[keyName]] = doc;
    });
    return ret;
  }

  function splitByKey(arr,keyName){
    var ret = {};
    arr.forEach(function(doc){
      delete doc.dc;
      delete doc._id;
      ret[doc[keyName]] = doc;
    });
    return ret;
  }


  //Note: None of these things are encrypted in the DB.
  //These are essentially throw away orgs with no production
  //code or data so I'm fine not encrytping.
  module.exports.getLogins = function(callback){
    db('logins',function(loginCollection){
      loginCollection.find({}).toArray(function(err, logins) {
        logins = logins[0];
        callback(stripId(logins));
      });
    });
  };

  //Note: None of these things are encrypted in the DB.
  //These are essentially throw away orgs with no production
  //code or data so I'm fine not encrytping.
  module.exports.getLogin = function(datacenter,callback){
    db('logins',function(loginCollection){
      loginCollection.find({}).toArray(function(err, logins) {
        logins = logins[0];
        callback(logins[datacenter]);
      });
    });
  };

  module.exports.saveDeployTime = function(datacenter, deployTimes){
    db('deploy',function(deployCollection){
      deployTimes.dc = datacenter;
      var query = {
        dc: deployTimes.dc,
        deployId: deployTimes.deployId
      }
      deployCollection.update(query, deployTimes, {upsert: true});
    });
  }

  module.exports.getDeployTimes = function(callback){
    db('deploy',function(deployCollection){
      deployCollection.find({}).toArray(function(err, deployTimes){
        callback(splitByDcAndKey(deployTimes,'deployId'));
      });
    });
  };

  module.exports.getDeployTimesForDatacenterForDates = function(datacenter, startTime, endTime, callback){
    db('deploy',function(deployCollection){
      var query = {
        dc: datacenter,
        createdDate: {
          $gt:startTime,
          $lte:endTime
        }
      };
      deployCollection.find(query).toArray(function(err,deployTimes){
        callback(splitByKey(deployTimes,'deployId'));
      })
    });
  };

  module.exports.getDeployTimesForDatacenter = function(datacenter, callback){
    db('deploy',function(deployCollection){
      var query = {
        dc: datacenter
      };
      deployCollection.find(query).toArray(function(err,deployTimes){
        callback(splitByKey(deployTimes,'deployId'));
      });
    });
  };

  module.exports.getDataCenters = function(callback){
    db('logins',function(loginCollection){
      loginCollection.find({}).toArray(function(err, logins) {
        logins = stripId(logins[0]);
        var dcs = [];
        for(var key in logins){
          dcs.push(key);
        }
        callback(dcs);
      });
    });
  };

  module.exports.saveDeployRequest = function(datacenter, deployRequestId){
    db('deploy-request',function(drCollection){
      var doc = {
        dc: datacenter,
        asyncProcessId: deployRequestId
      };
      var query = {
        dc: datacenter,
        asyncProcessId: deployRequestId
      };
      drCollection.update(query, doc, {upsert: true});
    });
  }

  module.exports.clearCompletedDeployRequest = function(datacenter, deployRequestId){
    db('deploy-request',function(drCollection){
      var query = {
        dc: datacenter,
        asyncProcessId: deployRequestId
      };
      drCollection.remove(query);
    });
  }

  module.exports.getDeployRequests = function(datacenter, callback){
    db('deploy-request',function(drCollection){
      var query = {
        dc: datacenter
      };
      drCollection.find(query).toArray(function(err,requests){
        if(requests.length === 0){
          callback(null);
        }
        else {
          callback(splitByKey(requests,'asyncProcessId'));
        }
      });
    });
  }

  module.exports.saveTestRequest = function(datacenter, testRequestId){
    db('test-request',function(trCollection){
      var doc = {
        dc: datacenter,
        asyncApexJobId: testRequestId
      };
      var query = {
        dc: datacenter,
        asyncApexJobId: testRequestId
      };
      trCollection.update(query, doc, {upsert: true});
    });
  }

  module.exports.clearCompletedTestRequest = function(datacenter, testRequestId){
    db('test-request',function(trCollection){
      var query = {
        dc: datacenter,
        asyncApexJobId: testRequestId
      };
      trCollection.remove(query);
    });
  }

  module.exports.getTestRequests = function(datacenter, callback){
    db('test-request',function(trCollection){
      var query = {
        dc: datacenter
      };
      trCollection.find(query).toArray(function(err,requests){
        if(requests.length === 0){
          callback(null);
        }
        else {
          callback(splitByKey(requests,'asyncApexJobId'));
        }
      });
    });
  }

  module.exports.saveTestTime = function(datacenter, testTimes){
    db('test',function(testCollection){
      testTimes.dc = datacenter;
      var query = {
        dc: testTimes.dc,
        deployId: testTimes.deployId
      }
      testCollection.update(query, testTimes, {upsert: true});
    });
  }

  module.exports.getTestTimes = function(callback){
    db('test',function(testCollection){
      testCollection.find({}).toArray(function(err, testTimes){
        callback(splitByDcAndKey(testTimes,'deployId'));
      });
    });
  };

  module.exports.getTestTimesForDatacenterForDates = function(datacenter, startTime, endTime, callback){
    db('test',function(testCollection){
      var query = {
        dc: datacenter,
        createdDate: {
          $gt:startTime,
          $lte:endTime
        }
      };
      testCollection.find(query).toArray(function(err,testTimes){
        callback(splitByKey(testTimes,'deployId'));
      })
    });
  }

  module.exports.getTestTimesForDatacenter = function(datacenter, callback){
    db('test',function(testCollection){
      var query = {
        dc: datacenter
      };
      testCollection.find(query).toArray(function(err,testTimes){
        callback(splitByKey(testTimes,'deployId'));
      });
    });
  };

  module.exports.savePredictionTimes = function(times){
    db('predictions',function(predictionCollection){
      var docs = [];
      for(var dc in times){
        for(var day in times[dc]){
          for(var hour in times[dc][day]){
            var doc = times[dc][day][hour];
            doc.dc = dc;
            doc.day = day;
            doc.hour = hour;
            var query = {
              dc: doc.dc,
              day: doc.day,
              hour: doc.hour
            };
            predictionCollection.update(query, doc, {upsert: true});
          }
        }
      }
    });
  }

  module.exports.getPredictionTimesForDatacenter = function(datacenter, callback){
    db('predictions',function(predictionsCollection){
      predictionsCollection.find({dc: datacenter}).toArray(function(err, predictions){
        var ret = {};
        for(var i in predictions){
          var doc = stripId(predictions[i]);
          if(!ret[doc.day]) ret[doc.day] = {};
          ret[doc.day][doc.hour] = doc;
        }
        callback(ret);
      });
    });
  }


}());
