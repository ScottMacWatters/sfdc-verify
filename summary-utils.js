(function(){

  var DAY = 1000 * 60 * 60 * 24;
  var WEEK = 1000 * 60 * 60 * 24 * 7;
  var HOUR = 1000 * 60 * 60;
  module.exports.TIME = {
    HOUR: HOUR,
    DAY: DAY,
    WEEK: WEEK
  };

  var OPERATION_MAP = {
    AVG: getAverage,
    MAX: getMax,
    RECENT: getRecent,
    MED: getMedian
  };
  module.exports.OP = {
    AVG: 'AVG',
    MAX: 'MAX',
    RECENT: 'RECENT',
    MED: 'MED'
  };

  var METRIC_STATUS_MAP = {
    queuedSeconds: {
      good: 10,
      med: 120
    },
    executionSeconds: {
      good: 20,
      med: 180
    }
  }
  module.exports.METRIC = {
    QUEUED: 'queuedSeconds',
    EXECUTION: 'executionSeconds'
  };

  module.exports.summarize = function(timesForDc, name, timePeriod, operation, metric){
    return getValueOverTime(timesForDc, name, timePeriod, OPERATION_MAP[operation], metric);
  }

  function getValueOverTime(timesForDc, name, timePeriod, operation, metric){
    var now = new Date();
    var previous = new Date(now.getTime() - timePeriod);
    return operation(timesForDc, previous, now, name, metric);
  }

  function getRecent(timesforDc, start, end, name, metric){
    var relevantTimes = getTimesBetweenDates(timesforDc, start, end, metric);
    var recentTime;
    for(var key in relevantTimes){
      if(!recentTime || (recentTime.createdDate < relevantTimes[key].createdDate)){
        recentTime = relevantTimes[key];
      }
    }
    var value = (recentTime) ? recentTime[metric] : 'n/a';
    return getStat(name, value, metric);
  }

  function getMax(timesForDc, start, end, name, metric){
    var relevantTimes = getTimesBetweenDates(timesForDc, start, end, metric);

    var maxTime = 0;

    for(var i in relevantTimes){
      var value = relevantTimes[i][metric];
      if(maxTime < value){
        maxTime = value;
      }
    }

    return getStat(name, maxTime, metric);
  }

  function getMedian(timesForDc, start, end, name, metric){
    var relevantTimes = getTimesBetweenDates(timesForDc, start, end, metric);

    relevantTimes.sort(function(a, b){
      return a[metric] - b[metric];
    });

    var median;
    if(relevantTimes.length / 2 === 1){
      median = relevantTimes[Math.floor(relevantTimes.length/2)][metric];
    }
    else {
      var a = relevantTimes[Math.floor(relevantTimes.length/2)][metric];
      var b = relevantTimes[Math.ceil(relevantTimes.length/2)][metric];
      median = (a + b)/2;
    }

    return getStat(name, median, metric);
  }

  function getAverage(timesForDc, start, end, name, metric){
    var relevantTimes = getTimesBetweenDates(timesForDc, start, end, metric);

    var sum = 0;

    for(var i in relevantTimes){
      sum += relevantTimes[i][metric];
    }

    var avg = Math.floor(sum/relevantTimes.length);

    if(!avg){
      avg = 'n/a';
    }

    return getStat(name, avg, metric);
  }

  function getTimesBetweenDates(timesForDc, start, end, metric){
    var first = start.getTime();
    var second = end.getTime();
    var output = [];
    for(var key in timesForDc){
      var stat = timesForDc[key];
      if(stat && stat.createdDate && stat[metric] &&
        first < stat.createdDate && second >= stat.createdDate){
        output.push(stat);
      }
    }
    return output;
  }

  function getStat(name, value, metric, status, units){
    var output = {};
    output.name = name;
    output.value = value;
    if(status){
      output.status = status;
    }
    else{
      output.status = getStatusForValue(value, metric);
    }
    if(units){
      output.units = units;
    }
    else{
      output.units = 'Second';
    }

    if(output.units === 'Second' && output.value >= 60){
      output.units = 'Minute';
      output.value = Math.round(output.value/60);
    }
    if(output.units=== 'Minute' && output.value >= 60){
      output.units = 'Hour';
      output.value = Math.round(output.value/60);
    }

    if(output.value != 1){
      output.units += 's';
    }

    return output;
  };

  function getStatusForValue(value, metric){
    if(value === 'n/a'){
      return 'bad';
    }
    else if(value < METRIC_STATUS_MAP[metric].good){
      return 'good';
    }
    else if(value < METRIC_STATUS_MAP[metric].med){
      return 'medium';
    }
    else {
      return 'bad';
    }
  };

}());
