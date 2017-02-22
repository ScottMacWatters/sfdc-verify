var colors = [
  '#4682b4',
  'brown',
  'black',
  '#4682b4',
  'brown',
  'black'
];

var typeMetric = {
  "Apex Test Execution": "executionSeconds",
  "Metadata Deploy Queue": "queuedSeconds",
  "Predicted Apex Test Execution": "executionSeconds",
  "Predicted Metadata Deploy Queue": "queuedSeconds",
  "Tooling Deploy Execution": "executionSeconds",
  "Predicted Tooling Deploy Execution": "executionSeconds"
};

var typeInfo = {
  "Apex Test Execution": {
    metric: "executionSeconds",
    color: 'brown',
    class: 'statGraph',
    predictClass: 'statGraph predict test'
  },
  "Metadata Deploy Queue": {
    metric: "queuedSeconds",
    color: '#4682b4',
    class: 'statGraph',
    predictClass: 'statGraph predict deploy'
  },
  "Tooling Deploy Execution": {
    metric: "executionSeconds",
    color: 'black',
    class: 'statGraph',
    predictClass: 'statGraph predict toolingDeploy'
  }
}


function getRaw(){  var request = new XMLHttpRequest();
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
    addGraphs(result);
  }
  request.open('GET', getUrl(), true);
  request.send();
}

function getUrl(){
  var ret = '/raw' + getUrlParamsFromFilter();
  return ret;
}

//Extract data from service call into usable D3 data.
function getArraysFromRaw(rawJson){
  var output = {};
  for(var dc in rawJson){
    output[dc] = {};
    for(var type in rawJson[dc]){
      var arr = [];
      var metric = typeMetric[type];
      for(var id in rawJson[dc][type]){
        var val = {};
        val.metric = rawJson[dc][type][id][metric];
        val.createdDate = rawJson[dc][type][id].createdDate;
        arr.push(val);
      }
      arr.sort(function(a,b){
        return a.createdDate - b.createdDate;
      });
      if(arr.length >= 20 || isPrediction(type)) {
        output[dc][type] = arr;
      }
    }
  }

  return output;
}

//process output and add graphs for each data center
function addGraphs(rawJson){
  var dcData = getArraysFromRaw(rawJson);
  for(var dc in dcData){
    if(Object.keys(dcData[dc]).length > 0) {
      drawgraph(dc, dcData[dc]);
    }
  }
}

//draw a graph for a data center
function drawgraph(dc, datas){

  // define dimensions of graph
  var m = [20, 50, 20, 50]; // margins
  var w = document.body.clientWidth - m[1] - m[3] - 10; // width
  var h = 200 - m[0] - m[2]; // height

  var x_dim_accessor = function(d){return d.createdDate};
  var y_dim_accessor = function(d){return d.metric};
  var y_scale = 'Seconds';


  //set the x and y ranges for all lines on the chart
  var x_range = [];
  var y_range = [0];

  for(var type in datas){
    var y_typeMax = d3.max(datas[type], y_dim_accessor);
    var x_typeMin = d3.min(datas[type], x_dim_accessor);
    var x_typeMax = d3.max(datas[type], x_dim_accessor);
    if(!y_range[1] || y_range[1] < y_typeMax){
      y_range[1] = y_typeMax;
    }
    if(!x_range[0] || x_range[0] > x_typeMin){
      x_range[0] = x_typeMin;
    }
    if(!x_range[1] || x_range[1] < x_typeMax){
      x_range[1] = x_typeMax;
    }
  }

  //if number of seconds is greater than 5 minutes
  if(y_range[1] > 300){
    y_range[1] = Math.ceil(y_range[1]/60);
    y_scale = 'Minutes';
    y_dim_accessor = function(d){ return Math.floor(d.metric/60)};
  }
  else if(y_range[1] < 5){
    y_range[1] = 5;
  }


  render(datas);

  function render(datas){

    // X scale will fit all values from data[] within pixels 0-w
    var x = d3.scaleTime().domain(x_range).range([0, w]);
    // Y scale will fit values from 0-10 within pixels h-0 (Note the inverted domain  for the y-scale: bigger is up!)
    var y = d3.scaleLinear().domain(y_range).range([h, 0]);
    // automatically determining max range can work something like this
    // var y = d3.scale.linear().domain([0, d3.max(data)]).range([h, 0]);

    //construct lines
    var lines = {};
    for(var type in datas){
      var line = d3.line()
        .x(function(d,i){
          return x(x_dim_accessor(d));
        })
        .y(function(d,i){
          return y(y_dim_accessor(d));
        })

      if(isPrediction(type)){
        line.curve(d3.curveMonotoneX);
      }

      lines[type] = line;
    }

    // Add an SVG element with the desired dimensions and margin.
    var dcEl = d3.select('#' + dc);
    var graph = dcEl.insert("svg:svg",":nth-child(2)")
      .attr("width", w + m[1] + m[3])
      .attr("height", h + m[0] + m[2])
      .append("svg:g")
      .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    // create yAxis
    var timeCovered = x_range[1] - x_range[0];
    var twoDays = 2 * 24 * 60 * 60 * 1000;
    var timeFormat = (timeCovered > twoDays) ? d3.timeFormat("%m/%d %H:%M") : d3.timeFormat("%H:%M");
    var xAxis = d3.axisBottom().scale(x).tickSize(-h).tickFormat(timeFormat);



    // Add the x-axis.
    graph.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + h + ")")
      .call(xAxis);

    // create left yAxis
    var yAxisLeft = d3.axisLeft().scale(y).ticks(4);
    // Add the y-axis to the left
    graph.append("svg:g")
      .attr("class", "y axis")
      .attr("transform", "translate(-25,0)")
      .call(yAxisLeft);
    graph.append("svg:text")
      .attr('class', 'y label')
      .attr("transform", "rotate(-90)")
      .attr("y", -12)
      .attr("dy", "0px")
      .style("text-anchor", "end")
      .text(y_scale);

    // Add the line by appending an svg:path element with the data line we created above
    // do this AFTER the axes above so that the line is above the tick-lines
    for(var type in lines){

      var t = getTypeInfo(type);
      var clazz = (isPrediction(type)) ? t.predictClass : t.class;

      graph.append("svg:path")
        .attr("d",lines[type](datas[type]))
        .attr('stroke', t.color)
        .attr("class", clazz);

      if(!isPrediction(type)){
        graph.selectAll("dot")
          .data(datas[type])
          .enter().append("svg:circle")
          .attr("r", 1.25)
          .attr('fill', t.color)
          .attr('class', 'point ' + clazz)
          .attr("cx", function(d) { return x(x_dim_accessor(d))})
          .attr("cy", function(d) { return y(y_dim_accessor(d))});
      }
    }


    // Add legend above the graph
    var legend = graph.append("svg:g")
      .attr('class','legend')
      .attr('transform','translate(10,0)');


    var legendWidth = (Object.keys(lines).length > 3) ? 160 : 220;
    var legendHeightMod = 0;
    for(type in datas){
      if(!isPrediction(type)) legendHeightMod ++;
    }

    legend.append('rect')
      .attr('fill','#f4f6f9')
      .attr('stroke','#d7dfe6')
      .attr('stroke-width',1)
      .attr('width',legendWidth)
      .attr('height',18 * legendHeightMod)
      .attr('x',-5)
      .attr('y',-5);

    var i = 0;

    var orderedTypes = Object.keys(lines).sort();

    for(var ind in orderedTypes){
      var type = orderedTypes[ind];

      var t = getTypeInfo(type);
      if((Object.keys(lines).length > 3) && isPrediction(type)) continue;

      var g = legend.append('g');

      g.append('rect')
        .attr('class','legend-color')
        .attr('fill',t.color)
        .attr('width',10)
        .attr('height',10)
        .attr('y', 0 + (i * 15));
      g.append('text')
        .text(type)
        .attr('class','legend')
        .attr('x', 15)
        .attr('y',10 + (i * 15));

      i++;
    }
  }


}

function getTypeInfo(type){
  return typeInfo[type.replace('Predicted ','')];
}

function isPrediction(type){
  return type.includes('Predicted ');
}
