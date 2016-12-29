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

function getArraysFromRaw(rawJson){
  var output = {};
  for(var dc in rawJson){
    var arr = [];
    for(var id in rawJson[dc]){
      arr.push(rawJson[dc][id]);
    }
    output[dc] = arr;
  }
  return output;
}

function addGraphs(rawJson){
  var dcData = getArraysFromRaw(rawJson);
  for(var dc in dcData){
    drawgraph(dc, dcData[dc]);
  }
}

function drawgraph(dc, data){
  // define dimensions of graph
  var m = [20, 50, 20, 50]; // margins
  var w = document.body.clientWidth - m[1] - m[3] - 80; // width
  var h = 200 - m[0] - m[2]; // height

  var x_dim_accessor = function(d){return d.createdDate};
  var y_dim_accessor = function(d){return d.queuedSeconds};

  var x_range;
  var y_range;

  // create a simple data array that we'll plot with a line (this array represents only the Y values, X will just be the index location)


  x_range = [
    d3.min(data, x_dim_accessor),
    d3.max(data, x_dim_accessor)
  ];

  y_range = [
    d3.min(data, y_dim_accessor),
    d3.max(data, y_dim_accessor)
  ];


  render(data);


function render(data){

  // X scale will fit all values from data[] within pixels 0-w
  var x = d3.scaleLinear().domain(x_range).range([0, w]);
  // Y scale will fit values from 0-10 within pixels h-0 (Note the inverted domain for the y-scale: bigger is up!)
  var y = d3.scaleLinear().domain(y_range).range([h, 0]);
  // automatically determining max range can work something like this
  // var y = d3.scale.linear().domain([0, d3.max(data)]).range([h, 0]);

  // create a line function that can convert data[] into x and y points
  var line = d3.line()
  // assign the X function to plot our line as we wish
  .x(function(d,i) {
    return x(x_dim_accessor(d));
  })
  .y(function(d) {
    return y(y_dim_accessor(d));
  })

  // Add an SVG element with the desired dimensions and margin.
  var dcEl = d3.select('#' + dc);
  var graph = dcEl.insert("svg:svg",":nth-child(2)")
    .attr("width", w + m[1] + m[3])
    .attr("height", h + m[0] + m[2])
    .append("svg:g")
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

  // create yAxis
  var xAxis = d3.axisBottom().scale(x).tickSize(-h).tickFormat(d3.timeFormat("%H:%M"));
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
    .text("Seconds to Deploy");
  graph.append("svg:text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", w)
    .attr("y", h + 12)
    .text("Time");


  // Add the line by appending an svg:path element with the data line we created above
  // do this AFTER the axes above so that the line is above the tick-lines
  graph.append("svg:path").attr("d", line(data));
}
}
