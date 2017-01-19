var colors = [
  '#4682b4',
  'brown'
];

var typeMetric = {
  "Apex Test Execution": "executionSeconds",
  "Deploy Queue": "queuedSeconds",
};


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
  request.open('GET','/raw?dataCenters=' + getQueryStringValue("dcs"), true);
  request.send();
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
      output[dc][type] = arr;
    }
  }
  return output;
}

//process output and add graphs for each data center
function addGraphs(rawJson){
  var dcData = getArraysFromRaw(rawJson);
  for(var dc in dcData){
    console.log(dcData[dc]);
    drawgraph(dc, dcData[dc]); //todo: generalize
  }
}

//draw a graph for a data center
function drawgraph(dc, datas){

  // define dimensions of graph
  var m = [20, 50, 20, 50]; // margins
  var w = document.body.clientWidth - m[1] - m[3] - 80; // width
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
    var x = d3.scaleLinear().domain(x_range).range([0, w]);
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
    var xAxis =   d3.axisBottom().scale(x).tickSize(-h).tickFormat(d3.timeFormat("%H:%M"));
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
    var i = 0;
    for(var type in lines){
      graph.append("svg:path")
        .attr("d",lines[type](datas[type]))
        .attr('stroke', colors[i]);

      i++;
    }


    // Add legend above the graph
    var legend = graph.append("svg:g")
      .attr('class','legend')
      .attr('transform','translate(10,0)');

    legend.append('rect')
      .attr('fill','#f4f6f9')
      .attr('stroke','#d7dfe6')
      .attr('stroke-width',1)
      .attr('width',135)
      .attr('height',18 * colors.length)
      .attr('x',-5)
      .attr('y',-5);

    i = 0;
    for(var type in lines){
      var g = legend.append('g');

      g.append('rect')
        .attr('class','legend-color')
        .attr('fill',colors[i])
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
