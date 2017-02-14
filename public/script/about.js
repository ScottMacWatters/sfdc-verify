function getInfo(){
  console.log('loading...');

  var dcs = null;
  var raw = null;

  loadDcs(function(result){
    dcs = result;
    if(dcs && raw){
      displayInfo(dcs,raw);
    }
  });

  loadRaw(function(result){
    raw = result;
    if(dcs && raw){
      displayInfo(dcs,raw);
    }
  });
};

function loadDcs(callback){
  var request = new XMLHttpRequest();
  request.overrideMimeType('application/json');
  request.onreadystatechange = function() {
    if (request.readyState != 4) return;
    if (request.status != 200) {
      console.log("ERROR in /dcs");
      var responseBody = request.responseText;
      var result = JSON.parse(responseBody);
      console.log(result.error);
      return;
    }
    var responseBody = request.responseText;
    var result = JSON.parse(responseBody);
    callback(result);
  }
  request.open('GET', '/dcs', true);
  request.send();
}

function loadRaw(callback){
  var request = new XMLHttpRequest();
  request.overrideMimeType('application/json');
  request.onreadystatechange = function() {
    if (request.readyState != 4) return;
    if (request.status != 200) {
      console.log("ERROR in /raw");
      var responseBody = request.responseText;
      var result = JSON.parse(responseBody);
      console.log(result.error);
      return;
    }
    var responseBody = request.responseText;
    var result = JSON.parse(responseBody);
    callback(result);
  }
  request.open('GET', '/raw', true);
  request.send();
}

function displayInfo(dcs, rawData){

  var output = document.getElementById('output');
  loading.style.display = 'block';
  output.innerHTML = '';

  dcs.forEach(function(dc){

    var dcName = newDiv('dcName');
    dcName.appendChild(newText(dc.name));
    var sourceDiv = newDiv('dataSource');
    sourceDiv.appendChild(newText(dc.source));
    dcName.appendChild(sourceDiv);
    var datacenter = newDiv('datacenter');
    datacenter.id = dc.name;
    datacenter.appendChild(dcName);

    var statsDiv = newDiv('stats');

    var sortedStats = Object.keys(rawData[dc.name]).sort();

    sortedStats.forEach(function(statType){

      var statSectionDiv = newDiv('statSection');
      var statSectionNameDiv = newDiv('statSectionName');
      var statSectionNameText = newText(statType);
      var statSectionContentsDiv = newDiv('statSectionContents');
      statSectionNameDiv.appendChild(statSectionNameText);
      statSectionDiv.appendChild(statSectionNameDiv);
      statSectionDiv.appendChild(statSectionContentsDiv);

      var stats = getStatsFromRaw(rawData[dc.name][statType]);


      for(var statIndex in stats) {
        var stat = stats[statIndex];
        var statDiv = newDiv('stat ' + stat.status);
        var statName = newDiv('statName');
        statName.appendChild(newText(stat.name));
        statDiv.appendChild(statName);
        var statValue = newDiv('statValue');
        statValue.appendChild(newText(stat.value));
        statDiv.appendChild(statValue);
        var statUnits = newDiv('statUnits');
        statUnits.appendChild(newText(stat.units));
        statDiv.appendChild(statUnits);
        statSectionContentsDiv.appendChild(statDiv);
      }
      statsDiv.appendChild(statSectionDiv);



    });

    datacenter.appendChild(statsDiv);
    output.appendChild(datacenter);
  });
  loading.style.display = 'none';
}

function newDiv(cls){
  var div = document.createElement('div');
  if(cls) {
    div.className = cls;
  }
  return div;
}

function newText(text){
  return document.createTextNode(text);
}

function getStatsFromRaw(rawData){
  var output = [];
  output.push(count(rawData));
  output.push(pastHour(rawData));

  return output;
}

function count(rawData){
  var output = {};

  output.value = Object.keys(rawData).length;
  output.name = 'Today';
  output.units = 'Executions';
  //1 deploy per hour, for 24 hours should be 144
  output.status = getStatus(output.value, 134, 110);
  return output;
}

function pastHour(rawData){
  var output = {};

  var now = new Date().getTime();
  var pastHour = now - ( 60 * 60 * 1000);
  var data = getTimesBetweenDates(rawData, pastHour, now);

  output.value = Object.keys(data).length;
  output.name = 'Past Hour';
  output.units = 'Executions'
  //5 or 6 executions are fine. 4 is medium 3 is bad.
  output.status = getStatus(output.value, 4, 3);

  return output;
}

function getTimesBetweenDates(times, start, end){
  var output = [];
  for(var key in times){
    var stat = times[key];
    if(stat && stat.createdDate && start < stat.createdDate &&
      end >= stat.createdDate){
      output.push(stat);
    }
  }
  return output;
}

function getStatus(value, good, medium){
  if(value > good){
    return 'good';
  }
  else if(value > medium){
    return 'medium';
  }
  else {
    return 'bad';
  }
}

window.onload = function(){
  getInfo();
  window.setTimeout(getInfo, 11 * 60 * 1000);
};
