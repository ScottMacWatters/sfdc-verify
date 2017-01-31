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

  module.exports.summarize = function(timesForDc, name, timePeriod, operation, metric, endDate){
    return getValueOverTime(timesForDc, name, timePeriod, OPERATION_MAP[operation], metric, endDate);
  }

  module.exports.summarizeRaw = function(timesForDc, operation, metric){
    return OPERATION_MAP[operation](timesForDc, metric);
  }

  function getValueOverTime(timesForDc, name, timePeriod, operation, metric, endDate){
    var now;
    if(endDate){
      now = endDate;
    }
    else{
      now = new Date();
    }
    var previous = new Date(now.getTime() - timePeriod);
    var relevantTimes = getTimesBetweenDates(timesForDc, previous, now, metric);

    return getStat(name,operation(relevantTimes, metric),metric);
  }

  function getRecent(relevantTimes, metric){
    var foundRecent = false;
    var recentTime;
    for(var key in relevantTimes){
      if(!foundRecent || (recentTime.createdDate < relevantTimes[key].createdDate)){
        foundRecent = true;
        recentTime = relevantTimes[key];
      }
    }
    var value = (foundRecent) ? recentTime[metric] : 'n/a';
    return value;
  }

  function getMax(relevantTimes, metric){

    var maxTime = 0;

    for(var i in relevantTimes){
      var value = relevantTimes[i][metric];
      if(maxTime < value){
        maxTime = value;
      }
    }

    return maxTime;
  }

  function getMedian(relevantTimes, metric){

    relevantTimes.sort(function(a, b){
      return a[metric] - b[metric];
    });

    var median;
    if(relevantTimes.length === 0){
      median = 0;
    }
    else if(Math.round(relevantTimes.length / 2) === 1){
      median = relevantTimes[Math.floor(relevantTimes.length/2)][metric];
    }
    else {
      var aind = Math.floor(relevantTimes.length/2);
      var bind = Math.ceil(relevantTimes.length/2);
      var a = relevantTimes[aind][metric];
      var b = relevantTimes[bind][metric];
      median = Math.round((a + b)/2);
    }

    return median;
  }

  function getAverage(relevantTimes, metric){

    var sum = 0;

    for(var i in relevantTimes){
      sum += relevantTimes[i][metric];
    }
    var avg = 0;
    if(relevantTimes.length){
      avg = Math.floor(sum/relevantTimes.length);
    }

    if(avg === null){
      avg = 'n/a';
    }

    return avg;
  }

  function getTimesBetweenDates(timesForDc, start, end, metric){
    var first = start.getTime();
    var second = end.getTime();
    var output = [];
    for(var key in timesForDc){
      var stat = timesForDc[key];
      if(stat && stat.createdDate && stat[metric] !== null &&
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
