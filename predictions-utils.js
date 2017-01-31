(function(){

  var predictionTypes = {
    deploy: {
      name: 'Predicted Deploy Queue',
      metric: 'queuedSeconds',
      operation: 'avg',
      prefix: 'deploy'
    },
    tooling: {
      name: 'Predicted Apex Test Execution',
      metric: 'executionSeconds',
      operation: 'avg',
      prefix: 'test'
    }
  };
  const HOUR = 1000 * 60 * 60;

  module.exports.getFormattedPredictionsByType = function(predictionsForDc, start, end){
    var dates = getAllHalfHourMarks(start,end);
    var output = {};
    dates.forEach(function(date){
      var dateObj = new Date(date);
      var day = dateObj.getDay();
      var hour = dateObj.getHours();
      for(var type in predictionTypes){
        var td = predictionTypes[type];
        var name = td.name;
        var prefix = td.prefix;
        var metric = td.metric;
        var value = prefix + '_' + td.operation + '_' + metric;
        if(!output[name]) output[name] = {};

        var val = getVal(predictionsForDc, day, hour, value);
        if(val || val === 0){
          var prediction = {};
          prediction.createdDate = date;
          prediction[metric] = val;

          output[name][prefix + '_' + date] = prediction;
        }

      }
    });
    return output;
  }

  function getVal(predictionsForDc, day, hour, value){
    if(predictionsForDc && predictionsForDc[day] &&
      predictionsForDc[day][hour] && predictionsForDc[day][hour][value] !== null) {
      return predictionsForDc[day][hour][value];
    }
    else{
      return null;
    }
  }

  function getAllHalfHourMarks(start,end){
    var dateList = [];
    var currentDate = new Date(start);
    currentDate.setMinutes(30);
    currentDate.setSeconds(0);
    currentDate.setMilliseconds(0);
    var current = currentDate.getTime();
    if(current < start) {
      dateList.push(new Date().getTime());
      current += HOUR;
    }
    for(var c = current; c < end; c += HOUR){
      dateList.push(c);
    }
    return dateList;
  }


})();
