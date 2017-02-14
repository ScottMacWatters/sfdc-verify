var tools = require('sfdc-verify-tools');

var util = require('./summary-utils.js');
var putil = require('./predictions-utils.js');
var express = require('express');
var bodyParser = require('body-parser');
var db = tools.db;
var expr = express();
expr.use(bodyParser.json());


expr.use(express.static('public',{extensions : ['html'], index: "status.html"}));

var envPort = process.env.PORT ? process.env.PORT : 3000;

var ports = [envPort];
for(var i in ports){
  expr.listen(ports[i], function(){
    console.log('port ' + ports[i] + ' open.');
  });
}

expr.get('/summary/', function(req,res){

  var dataCenters;
  if(req.query.dataCenters){
    dataCenters = req.query.dataCenters.split(',');
  }

  //prevous 1 week
  var timePeriod = 24 * 7 * 60 * 60 * 1000;

  //Starting now if nothing specified
  var now = new Date();
  var endDate = now;
  if(req.query.endDateTime){
    endDate = new Date(Number(req.query.endDateTime));
  }
  //if End Date is in the future, just set it to now for summary.
  if(endDate.getTime() > now.getTime()){
    endDate = now;
  }

  var prev = endDate.getTime() - timePeriod;

  db.getDataCenters(function(dcs){
    var output = {};

    var dcCount = dcs.length;
    var totalQueries = dcs.length * 2; //deploy and test.
    var completeQueries = 0;

    var T = util.TIME;
    var O = util.OP;
    var M = util.METRIC;

    dcs.forEach(function(dc){
      if(dataCenters && !dataCenters.includes(dc)){
        completeQueries+=2;
        return;
      }
      db.getDeployTimesForDatacenterForDates(dc, prev, endDate.getTime(), function(times){
        //If less than 20 data points, skip this datacenter until it gets more data.
        if(Object.keys(times).length < 20){
          return;
        }

        if(!output[dc]){
          output[dc] = {};
        }

        console.log('Deploy Summary for ',dc);

        output[dc]['Deploy Queue Time'] = [
          util.summarize(times,'Recent',T.HOUR,O.RECENT,M.QUEUED, endDate),
          util.summarize(times,'Hourly Max',T.HOUR,O.MAX,M.QUEUED, endDate),
          util.summarize(times,'Hourly Average',T.HOUR,O.AVG,M.QUEUED, endDate),
          util.summarize(times,'Daily Max',T.DAY,O.MAX,M.QUEUED, endDate),
          util.summarize(times,'Daily Median',T.DAY,O.MED,M.QUEUED, endDate),
          util.summarize(times,'Weekly Max',T.WEEK,O.MAX,M.QUEUED, endDate)
        ];
        completeQueries++;

        console.log('Summary:', output[dc]['Deploy Queue Time']);

        checkCompleteAndSendResult(output,completeQueries,totalQueries);
      });


      db.getTestTimesForDatacenterForDates(dc, prev, endDate.getTime(), function(times){
        //If less than 20 data points, skip this datacenter until it gets more data.
        if(Object.keys(times).length < 20){
          return;
        }

        if(!output[dc]){
          output[dc] = {};
        }

        console.log('Test Summary for ',dc);

        output[dc]['Async Test Execution Time'] = [
          util.summarize(times,'Recent',T.HOUR,O.RECENT,M.EXECUTION, endDate),
          util.summarize(times,'Hourly Max',T.HOUR,O.MAX,M.EXECUTION, endDate),
          util.summarize(times,'Hourly Average',T.HOUR,O.AVG,M.EXECUTION, endDate),
          util.summarize(times,'Daily Max',T.DAY,O.MAX,M.EXECUTION, endDate),
          util.summarize(times,'Daily Median',T.DAY,O.MED,M.EXECUTION, endDate),
          util.summarize(times,'Weekly Max',T.WEEK,O.MAX,M.EXECUTION, endDate)
        ];
        completeQueries++;
        console.log('Summary:', output[dc]['Async Test Execution Time']);
        checkCompleteAndSendResult(output,completeQueries,totalQueries);
      });
    });
  });

  function checkCompleteAndSendResult(output, completeQueries, totalQueries){
    if(completeQueries === totalQueries){
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(output));
      req.next();
    }
    return;
  }
});

expr.get('/raw/', function(req,res){
  var dataCenters;

  if(req.query.dataCenters){
    dataCenters = req.query.dataCenters.split(',');
  }

  //prevous 24 hours if nothing specified
  var timePeriod = 24;
  if(req.query.timePeriod){
    timePeriod = Number(req.query.timePeriod);
  }

  //Starting now if nothing specified
  var endDate = new Date().getTime();
  if(req.query.endDateTime){
    endDate = Number(req.query.endDateTime);
  }

  //Include predictions. current default is false
  var includePredictions = true;
  if(req.query.predictions === 'false' || req.query.predictions === false){
    includePredictions = false;
  }

  timePeriod = timePeriod * 1000 * 60 * 60; //convert to MS

  var prev = endDate - timePeriod;

  db.getDataCenters(function(dcs){

    var output = {};
    var dcCount = dcs.length;
    var totalQueries = dcs.length * 3; //deploy and test.
    var completeQueries = 0;

    for(var i in dcs){
      var dc = dcs[i];
      (function(dc){
        if(dataCenters && !dataCenters.includes(dc)){
          completeQueries += 3;
          return;
        }

        output[dc] = {};

        db.getDeployTimesForDatacenterForDates(dc, prev, endDate, function(times){
          output[dc]['Deploy Queue'] = times;
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries, totalQueries);
        });

        db.getTestTimesForDatacenterForDates(dc, prev, endDate, function(times){
          output[dc]['Apex Test Execution'] = times;
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries,totalQueries);
        })

        var predictionStart = new Date().getTime();
        predictionStart = (predictionStart < prev) ? prev : predictionStart;
        if(includePredictions && predictionStart < endDate){
          db.getPredictionTimesForDatacenter(dc, function(predictions){
            var predictions = putil.getFormattedPredictionsByType(predictions,predictionStart,endDate);
            for(var name in predictions){
              output[dc][name] = predictions[name];
            }
            completeQueries++;
            checkCompleteAndSendResult(output,completeQueries,totalQueries);
          });
        }
        else{
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries,totalQueries);
        }

      }(dc));
    }
  });

  function checkCompleteAndSendResult(output, completeQueries, totalQueries){
    if(completeQueries == totalQueries){
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(output));
      req.next();
    }
    return;
  }

})
