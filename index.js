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

expr.get('/dcs/', function(req, res){
  db.getDataCentersVerbose(function(dcs){
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(dcs));
    req.next();
  });
});

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

    //tooling deploy, metadata deploy, tooling testing
    var metricsCount = 3;
    var dcCount = dcs.length;
    var totalQueries = dcs.length * metricsCount;
    var completeQueries = 0;

    var T = util.TIME;
    var O = util.OP;
    var M = util.METRIC;

    dcs.forEach(function(dc){
      if(dataCenters && !dataCenters.includes(dc)){
        completeQueries+=metricsCount;
        return;
      }

      getTimesAndSummarize(db.getDeployTimesForDatacenterForDates, 'Metadata Deploy Queue Time', M.QUEUED, dc, prev, endDate);

      getTimesAndSummarize(db.getTestTimesForDatacenterForDates, 'Async Test Execution Time', M.EXECUTION, dc, prev, endDate);

      getTimesAndSummarize(db.getToolingDeployTimesForDatacenterForDates, 'Tooling Deploy Execution Time', M.EXECUTION, dc, prev, endDate);


      function getTimesAndSummarize(queryFunction, name, metric, dc, start, end){
        queryFunction(dc, start, end.getTime(), function(times){
          if(Object.keys(times).length < 20){
            completeQueries++;
            checkCompleteAndSendResult(output,completeQueries,totalQueries);
            return;
          }

          if(!output[dc]){
            output[dc] = {};
          }

          output[dc][name] = [
              util.summarize(times,'Recent',T.HOUR,O.RECENT, metric, end),
              util.summarize(times,'Hourly Max',T.HOUR,O.MAX, metric, end),
              util.summarize(times,'Hourly Average',T.HOUR,O.AVG, metric, end),
              util.summarize(times,'Daily Max',T.DAY,O.MAX, metric, end),
              util.summarize(times,'Daily Median',T.DAY,O.MED, metric, end),
              util.summarize(times,'Weekly Max',T.WEEK,O.MAX, metric, end)
          ];
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries,totalQueries);
        });
      }

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
    var metricCount = 4; //MD Deploy, T Deploy, Test, Predictions
    var totalQueries = dcs.length * metricCount;
    var completeQueries = 0;

    for(var i in dcs){
      var dc = dcs[i];
      (function(dc){
        if(dataCenters && !dataCenters.includes(dc)){
          completeQueries += metricCount;
          return;
        }

        output[dc] = {};

        db.getDeployTimesForDatacenterForDates(dc, prev, endDate, function(times){
          output[dc]['Metadata Deploy Queue'] = times;
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries, totalQueries);
        });

        db.getTestTimesForDatacenterForDates(dc, prev, endDate, function(times){
          output[dc]['Apex Test Execution'] = times;
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries,totalQueries);
        })

        db.getToolingDeployTimesForDatacenterForDates(dc, prev, endDate, function(times){
          output[dc]['Tooling Deploy Execution'] = times;
          completeQueries++;
          checkCompleteAndSendResult(output, completeQueries,totalQueries);
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
