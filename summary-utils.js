(function(){

    var DAY = 1000 * 60 * 60 * 24;
    var WEEK = 1000 * 60 * 60 * 24 * 7;
    var HOUR = 1000 * 60 * 60;

  module.exports.getRecentTime = function(timesForDc){
    var recentTime;
    for(var key in timesForDc){
      if(!recentTime || (recentTime.createdDate < timesForDc[key].createdDate)){
        recentTime = timesForDc[key];
      }
    }
    var value = recentTime.queuedSeconds;
    return getStat('Most Recent', value);
  };

  module.exports.getRecordAmount = function(timesForDc){
    console.log(timesForDc);
    var numRecords = timesForDc.length;
    var status = 'good';
    //if less than 5 days
    if(numRecords < (24 * 6 * 5)){
      status = 'medium';
    }
    //if less than a day
    if(numRecords < (24 * 6)){
      status = 'bad';
    }
    return getStat('Amount', numRecords, status, 'Deploy');
  }

  module.exports.getDailyAverage = function(timesForDc){
    return getValueOverTime(timesForDc, "Daily Average", DAY, getAverage);
  }

  module.exports.getWeeklyAverage = function(timesForDc){
    return getValueOverTime(timesForDc, "Weekly Average", WEEK, getAverage);
  }

  module.exports.getHourlyAverage = function(timesForDc){
    return getValueOverTime(timesForDc, "Hourly Average", HOUR, getAverage);
  }

  module.exports.getHourlyMax = function(timesForDc){
    return getValueOverTime(timesForDc, "Hourly Max", HOUR, getMax);
  }

  module.exports.getWeeklyMax = function(timesForDc){
    return getValueOverTime(timesForDc, "Weekly Max", WEEK, getMax);
  }

  module.exports.getDailyMax = function(timesForDc){
    return getValueOverTime(timesForDc, "Daily Max", DAY, getMax);
  }

  module.exports.getHourlyMedian = function(timesForDc){
    return getValueOverTime(timesForDc, "Hourly Median", HOUR, getMedian);
  }

  module.exports.getWeeklyMedian = function(timesForDc){
    return getValueOverTime(timesForDc, "Weekly Median", WEEK, getMedian);
  }

  module.exports.getDailyMedian = function(timesForDc){
    return getValueOverTime(timesForDc, "Daily Median", DAY, getMedian);
  }

  function getValueOverTime(timesForDc, name, timePeriod, operation){
    var now = new Date();
    var previous = new Date(now.getTime() - timePeriod);
    return operation(timesForDc, previous, now, name);
  }

  function getMax(timesForDc, start, end, name){
    var relevantTimes = getTimesBetweenDates(timesForDc, start, end);

    var maxTime = 0;

    for(var i in relevantTimes){
      var queuedSeconds = relevantTimes[i].queuedSeconds;
      if(maxTime < queuedSeconds)[
        maxTime = queuedSeconds
      ]
    }

    return getStat(name, maxTime);
  }

  function getMedian(timesForDc, start, end, name){
    var relevantTimes = getTimesBetweenDates(timesForDc, start, end);

    relevantTimes.sort(function(a, b){
      return a.queuedSeconds - b.queuedSeconds;
    });

    var median = relevantTimes[Math.floor(relevantTimes.length/2)];

    return getStat(name, median.queuedSeconds);
  }


  function getAverage(timesForDc, start, end, name){
    var relevantTimes = getTimesBetweenDates(timesForDc, start, end);

    var sum = 0;

    for(var i in relevantTimes){
      sum += relevantTimes[i].queuedSeconds;
    }

    return getStat(name, Math.floor(sum/relevantTimes.length));
  }

  function getTimesBetweenDates(timesForDc, start, end){
    var first = start.getTime();
    var second = end.getTime();
    var output = [];
    for(var key in timesForDc){
      var stat = timesForDc[key];
      if(first < stat.createdDate && second >= stat.createdDate){
        output.push(stat);
      }
    }
    return output;
  }

  function getStat(name, value, status, units){
    var output = {};
    output.name = name;
    output.value = value;
    if(status){
      output.status = status;
    }
    else{
      output.status = getStatusForValue(value);
    }
    if(units){
      output.units = units;
    }
    else{
      output.units = 'Second';
    }

    if(output.units === 'Second' && output.value >= 60){
      output.units = 'Minute';
      output.value = Math.floor(output.value/60);
    }
    if(output.units=== 'Minute' && output.value >= 60){
      output.units = 'Hour';
      output.value = Math.floor(output.value/60);
    }

    if(output.value != 1){
      output.units += 's';
    }

    return output;
  };

  function getStatusForValue(value){
    if(value < 10){
      return 'good';
    }
    else if(value < 120){
      return 'medium';
    }
    else {
      return 'bad';
    }
  };

}());
