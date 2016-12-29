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
        //util.getWeeklyAverage(times),
        util.getHourlyMax(times),
        util.getDailyMax(times),
        //util.getWeeklyMax(times),
        util.getHourlyMedian(times),
        util.getDailyMedian(times),
        //util.getWeeklyMedian(times),
        util.getRecordAmount(times)
      ];
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(output));
    req.next();
  });
});
