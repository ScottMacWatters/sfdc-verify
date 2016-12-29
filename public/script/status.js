function populate(stats){
  var loading = document.getElementById('loading');
  var output = document.getElementById('output');
  for(var dc in stats) {

    var dcName = newDiv('dcName');
    dcName.appendChild(newText(dc));
    var datacenter = newDiv('datacenter');
    datacenter.id = dc;
    datacenter.appendChild(dcName);

    var statsDiv = newDiv('stats');
    for(var statIndex in stats[dc]){
      var stat = stats[dc][statIndex];
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
      statsDiv.appendChild(statDiv);
    }
    datacenter.appendChild(statsDiv);
    output.appendChild(datacenter);
  }
  loading.style.display = 'none';
  getRaw();
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

function getSummary(){
  var request = new XMLHttpRequest();
  request.overrideMimeType('application/json');
  request.onreadystatechange = function() {
    if (request.readyState != 4) return;
    if (request.status != 200) {
      console.log("ERROR in /summary");
      var responseBody = request.responseText;
      var result = JSON.parse(responseBody);
      console.log(result.error);
      return;
    }
    var responseBody = request.responseText;
    var result = JSON.parse(responseBody);
    populate(result);
  }
  request.open('GET','/summary?dataCenters=' + getQueryStringValue("dcs"), true);
  request.send();
}

function getQueryStringValue (key) {
  return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

function openHelpWindow(){
  document.getElementById("helpWindow").style.display = 'block';
}

function closeHelpWindow(){
  document.getElementById("helpWindow").style.display = 'none';
}

window.onload = function(){
  getSummary();
  document.getElementById("help").onclick = openHelpWindow;
  document.getElementById("close").onclick = closeHelpWindow;
};
