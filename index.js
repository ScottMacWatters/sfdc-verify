var util = require('./summary-utils.js');
var express = require('express');
var bodyParser = require('body-parser');
var db = require('./data-access.js');
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

  db.getDeployTimes(function(data){
    var output = {};

    var T = util.TIME;
    var O = util.OP;
    var M = util.METRIC;

    for(var dc in data){
      if(dataCenters && !dataCenters.includes(dc)){
        continue;
      }
      var times = data[dc];

      //If less than 20 data points, skip this datacenter until it gets more data.
      if(Object.keys(times).length < 20){
        continue;
      }

      output[dc] = {};
      output[dc]['Deploy Queue Time'] = [
        util.summarize(times,'Recent',T.HOUR,O.RECENT,M.QUEUED),
        util.summarize(times,'Hourly Max',T.HOUR,O.MAX,M.QUEUED),
        util.summarize(times,'Hourly Average',T.HOUR,O.AVG,M.QUEUED),
        util.summarize(times,'Daily Max',T.DAY,O.MAX,M.QUEUED),
        util.summarize(times,'Daily Median',T.DAY,O.MED,M.QUEUED),
        util.summarize(times,'Weekly Max',T.WEEK,O.MAX,M.QUEUED)
        /*
        util.getRecentTime(times),
        util.getHourlyAverage(times),
        util.getDailyAverage(times),
        util.getWeeklyAverage(times),
        util.getHourlyMax(times),
        util.getDailyMax(times),
        util.getWeeklyMax(times),
        util.getHourlyMedian(times),
        util.getDailyMedian(times),
        util.getWeeklyMedian(times)*/
      ];
    }
    db.getTestTimes(function(data){
      for(dc in data){
        if(dataCenters && !dataCenters.includes(dc)){
          continue;
        }

        if(!output[dc]){
          output[dc] = {};
        }
        var times = data[dc];

        //If less than 20 data points, skip this datacenter until it gets more data.
        if(Object.keys(times).length < 20){
          continue;
        }

        output[dc]['Async Test Execution Time'] = [
            util.summarize(times,'Recent',T.HOUR,O.RECENT,M.EXECUTION),
            util.summarize(times,'Hourly Max',T.HOUR,O.MAX,M.EXECUTION),
            util.summarize(times,'Hourly Average',T.HOUR,O.AVG,M.EXECUTION),
            util.summarize(times,'Daily Max',T.DAY,O.MAX,M.EXECUTION),
            util.summarize(times,'Daily Median',T.DAY,O.MED,M.EXECUTION),
            util.summarize(times,'Weekly Max',T.WEEK,O.MAX,M.EXECUTION)
        ];


      }

      for(var dc in output){
        if(Object.keys(output[dc]).length === 0) {
          output[dc] = undefined;
        }
      }


      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(output));
      req.next();
    });

  });
});

expr.get('/raw/', function(req,res){
  var dataCenters;
  if(req.query.dataCenters){
    dataCenters = req.query.dataCenters.split(',');
  }

  var now = new Date().getTime();
  var yesterday = now - 24 * 60 * 60 * 1000;

  db.getDataCenters(function(dcs){

    var output = {};
    var dcCount = dcs.length;
    var totalQueries = dcs.length * 2; //deploy and test.
    var completeQueries = 0;

    for(var i in dcs){
      var dc = dcs[i];
      (function(dc){
        if(dataCenters && !dataCenters.includes(dc)){
          completeQueries += 2;
          return;
        }

        output[dc] = {};

        db.getDeployTimesForDatacenterForDates(dc, yesterday, now, function(times){
          output[dc]['Deploy Queue'] = times;
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries, totalQueries);
        });

        db.getTestTimesForDatacenterForDates(dc, yesterday, now, function(times){
          output[dc]['Apex Test Execution'] = times;
          completeQueries++;
          checkCompleteAndSendResult(output,completeQueries,totalQueries);
        })

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
