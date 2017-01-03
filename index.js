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

    for(var dc in data){
      if(dataCenters && !dataCenters.includes(dc)){
        continue;
      }
      var times = data[dc];
      output[dc] = [
        util.getRecentTime(times),
        util.getHourlyAverage(times),
        util.getDailyAverage(times),
        util.getWeeklyAverage(times),
        util.getHourlyMax(times),
        util.getDailyMax(times),
        util.getWeeklyMax(times),
        util.getHourlyMedian(times),
        util.getDailyMedian(times),
        util.getWeeklyMedian(times)
      ];
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(output));
    req.next();
  });
});

expr.get('/raw/', function(req,res){
  var dataCenters;
  if(req.query.dataCenters){
    dataCenters = req.query.dataCenters.split(',');
  }

  //for now, let's just send the last day's worth of data.
  var now = new Date().getTime();
  var yesterday = now - 24 * 60 * 60 * 1000;

  db.getDataCenters(function(dcs){

    var output = {};
    var dcCount = dcs.length;
    var completeQueries = 0;

    for(var i in dcs){
      var dc = dcs[i];
      (function(dc){
        if(dataCenters && !dataCenters.includes(dc)){
          completeQueries++;
          return;
        }
        db.getDeployTimesForDatacenterForDates(dc, yesterday, now, function(times){
          output[dc] = times;
          completeQueries++;
          if(completeQueries == dcCount){
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(output));
            req.next();
          }
        });
      }(dc));
    }
  });

})
