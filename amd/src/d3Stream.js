(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = Stream;

var U = require('./utility.js');
var StreamTransform = require('./StreamTransform.js');
var Display = require('./display/Display.js');

function Stream(data) {
  StreamTransform.call(this, data);
  this.displays = [];
}

Stream.prototype = Object.create(StreamTransform.prototype);
Stream.prototype.constructor = Stream;

Stream.prototype.load = function(url, options, d3lib) {
  var self = this;
  var d3r = d3lib || d3;
  var opt = options || {};
  if (opt.format == 'csv') {
    d3r.csv(url, onLoad);
  } else if (opt.format == 'tsv') {
    d3r.tsv(url, onLoad);
  } else if (opt.format == 'xml') {
    d3r.xml(url, onLoad);
  } else {
    d3r.json(url, onLoad);
  }
  return this;

  function onLoad(error, data) {
    if (error) throw error;
    self.update([].concat(data), options);
  }
};

Stream.prototype.display = function(element, options, d3lib) {
  var d = new Display(d3lib || d3, element, options, this.array());
  this.displays.push(d);
  return d;
};

Stream.prototype.update = function(data, options) {
  var opt = options || {};
  if (data) {
    if (opt.append) {
      this.data = this.data.concat(data);
    } else if (opt.prepend) {
      this.data = data.concat(this.data);
    } else {
      this.data = data;
    }
  }
  if (this.displays.length > 0) {
    var transformedData = this.array();
    for (var i = 0; i < this.displays.length; i++) {
      this.displays[i].update(transformedData);
    }
  }
  return this;
};

Stream.prototype.contains = function (item) {
  return U.isIn(item, this.data);
};

Stream.prototype.containedIn = function (list) {
  return U.containedIn(this.data, list);
};

Stream.prototype.remove = function (item) {
  U.removeFrom(item, this.data);
  this.update();
  return this;
};

Stream.prototype.empty = function (item) {
  this.data = [];
  this.update();
  return this;
};

Stream.prototype.add = function (item) {
  return this.update(item, { append: true });
};

},{"./StreamTransform.js":3,"./display/Display.js":5,"./utility.js":15}],2:[function(require,module,exports){
module.exports = StreamBase;

var U = require('./utility.js');

function StreamBase(data) {
  this.data = data !== undefined ? [].concat(data) : [];
  this.transformations = [];
}

StreamBase.prototype.addTransformation = function (transformFunction) {
  this.transformations.push(transformFunction);
  this.update();
  return this;
};

StreamBase.prototype.reset = function () {
  this.transformations = [];
  this.update();
  return this;
};

StreamBase.prototype.array = function () {
  if (!this.data || !this.transformations) return this.data;
  return U.reduce(
    this.transformations,
    function(data, t) { return t(data); },
    this.data
  );
};

StreamBase.prototype.update = function () {
  // Override to support automatic stream dependencies.
};

},{"./utility.js":15}],3:[function(require,module,exports){
module.exports = StreamTransform;

var U = require('./utility.js');
var StreamBase = require('./StreamBase.js');

function StreamTransform(data) {
  StreamBase.call(this, data);
}

StreamTransform.prototype = Object.create(StreamBase.prototype);
StreamTransform.prototype.constructor = StreamTransform;

StreamTransform.prototype.consoleLog = function () {
  return this.addTransformation(function (data) {
    U.consoleLog(data);
    return data;
  });
};

StreamTransform.prototype.map = function (callback) {
  return this.addTransformation(function (data) {
    return U.map(data, callback);
  });
};

StreamTransform.prototype.filter = function (callback) {
  return this.addTransformation(function (data) {
    return U.filter(data, callback);
  });
};

StreamTransform.prototype.navigate = function (dotPath) {
  return this.addTransformation(function (data) {
    return U.navigate(data[0], dotPath);
  });
};

StreamTransform.prototype.cross = function (other) {
  return this.addTransformation(function (data) {
    return U.cross(data, optionalStream(other));
  });
};

StreamTransform.prototype.repeat = function (other) {
  return this.addTransformation(function (data) {
    return U.repeat(data, optionalStream(other));
  });
};

StreamTransform.prototype.group = function (conditions) {
  return this.addTransformation(function (data) {
    return U.group(data, optionalStream(conditions));
  });
};

StreamTransform.prototype.cumulate = function (parameters) {
  return this.addTransformation(function (data) {
    return U.cumulate(data, optionalStream(parameters));
  });
};

StreamTransform.prototype.mapAsStreams = function (callback) {
  return this.addTransformation(function (data) {
    return U.map(data, function (d, i) {
      var s = callback(new StreamTransform(d), i);
      return typeof s.array == 'function' ? s.array() : s;
    });
  });
};

StreamTransform.prototype.keys = function () {
  return this.addTransformation(function (data) {
    return data.length > 0 ? U.keys(data[0]) : [];
  });
};

function optionalStream(input) {
  if (typeof input.array == 'function') {
    return input.array();
  }
  return input;
}

},{"./StreamBase.js":2,"./utility.js":15}],4:[function(require,module,exports){
module.exports = {

  height: 200,
  marginTop: 10,
  marginLeft: 40,
  marginRight: 30,
  marginBottom: 30,

  lineDotRange: [3, 10],
  barMargin: 0.2,
  bandPadding: 0.2,

  combine: true,

  transitionDuration: 500,
};

},{}],5:[function(require,module,exports){
module.exports = Display;

var DisplayFrame = require('./DisplayFrame.js');
var resize = require('./resize.js');
var lines = require('./lines.js');
var bars = require('./bars.js');
var tables = require('./tables.js');

function Display(d3, element, options, data) {
  DisplayFrame.call(this, d3, element, options, data);

  var self = this;
  resize(d3, function () {
    self.update();
  });
}

Display.prototype = Object.create(DisplayFrame.prototype);
Display.prototype.constructor = Display;

Display.prototype.scatterPlot = function (options) {
  return this.addChart(lines.scatterPlot, options);
};

Display.prototype.lineChart = function (options) {
  return this.addChart(lines.lineChart, options);
};

Display.prototype.barChart = function (options) {
  return this.addChart(bars.barChart, options);
};

Display.prototype.barChartDownwards = function (options) {
  return this.addChart(bars.barChartDownwards, options);
};

Display.prototype.stackedBarChart = function (options) {
  return this.addChart(bars.stackedBarChart, options);
};

Display.prototype.groupedBarChart = function (options) {
  return this.addChart(bars.groupedBarChart, options);
};

Display.prototype.table = function (options) {
  return this.addFrame(tables.table, options);
};

},{"./DisplayFrame.js":7,"./bars.js":9,"./lines.js":10,"./resize.js":11,"./tables.js":12}],6:[function(require,module,exports){
module.exports = DisplayBase;

var C_DISPLAY = 'd3stream-display';
var C_SVG = 'd3stream-svg';
var C_PLOT = 'd3stream-plot';

var U = require('../utility.js');
var DU = require('./utility.js');
var config = require('../config.js');
var StreamTransform = require('../StreamTransform.js');
var Select = require('./Select.js');

function DisplayBase(d3, element, options, data) {
  StreamTransform.call(this, data);
  this.d3 = d3;
  this.config = U.assign(config, options);
  this.display = createDisplay(d3, element, this.config);
  this.size = { width: 0, height: 0, inWidth: 0, inHeight: 0 };
  this.select = new Select(d3, this.config);
  this.axisCache = {};
  this.charts = [];
  this.frames = [];
}

DisplayBase.prototype = Object.create(StreamTransform.prototype);
DisplayBase.prototype.constructor = DisplayBase;

DisplayBase.prototype.update = function (data) {
  if (data !== undefined) {
    this.data = data;
  }
  this.size = getSize(this.display, this.config);
  this.select.clear();
  this.axisCache = {};

  var transformedData = this.array();
  if (transformedData.length > 0 && !Array.isArray(transformedData[0])) {
    transformedData = [transformedData];
  }

  for (i = 0; i < this.charts.length; i++) {
    for (var r = 0; r < transformedData.length; r++) {
        var plot = getPlot(this.display, this.select, this.size, this.config, i, r);
        var chart = this.charts[i];
        chart[0](this, plot, transformedData, r, chart[1]);
    }
    while (removePlot(this.display, this.config, i, r)) r += 1;
  }

  for (i = 0; i < this.frames.length; i++) {
    var frame = this.frames[i];
    frame[0](this, transformedData, frame[1]);
  }

  if (this.config.update) {
    this.config.update(this, transformedData);
  }
};

DisplayBase.prototype.addChart = function (chartFunction, options) {
  this.charts.push([chartFunction, U.assign(this.config, options)]);
  this.update();
  return this;
};

DisplayBase.prototype.addFrame = function (frameFunction, options) {
  this.frames.push([frameFunction, U.assign(this.config, options)]);
  this.update();
  return this;
};

DisplayBase.prototype.axis = function (data, variable) {
  if (this.axisCache[variable]) {
    return this.axisCache[variable];
  }
  var domain = this.domain(data, variable);
  var axis = {
    variable: domain.variable || variable,
    domain: domain.domain,
    scale: domain.band ?
      this.d3.scaleBand().domain(domain.domain).padding(this.config.bandPadding) :
      this.d3.scaleLinear().domain(domain.domain).nice(),
    pick: domain.band ? pickBand : pickLinear,
  };
  this.axisCache[variable] = axis;
  return axis;

  function pickBand(d, w) {
    if (w !== undefined) return this.scale(d[this.variable]);
    return this.scale(d[this.variable]) + this.scale.bandwidth() / 2;
  }

  function pickLinear(d, w) {
    if (w) return this.scale(d[this.variable]) - w;
    return this.scale(d[this.variable]);
  }
};

DisplayBase.prototype.domain = function (data, variable) {
  return { domain: [0, 1] };
};

function createDisplay(d3, element, options) {
  if (typeof jQuery == 'function' && element instanceof jQuery) {
    element = element[0];
  }
  element = d3.select(element);
  display = element.append('div');
  display.classed(DU.a(C_DISPLAY, options.class), true);
  return display;
}

function getSize(element, options) {
  var width = options.width || element.node().offsetWidth;
  var height = options.height || element.node().offsetHeight;
  return {
    width: width,
    height: height,
    inWidth: width - options.marginLeft - options.marginRight,
    inHeight: height - options.marginTop - options.marginBottom,
  };
}

function getPlot(display, select, size, options, i, r) {
  var clsSvg = [C_SVG, options.combine ? 1 : r].join('-');
  var svg = display.select(DU.s(clsSvg));
  if (svg.empty()) {
    svg = display.append('svg').attr('class', DU.a(C_SVG, clsSvg));
    select.register(svg);
  }
  svg.attr('width', size.width).attr('height', size.height);

  var clsPlot = [C_PLOT, r, i].join('-');
  var plot = svg.select(DU.s(clsPlot));
  if (plot.empty()) {
    plot = svg.append('g')
      .attr('class', DU.a(C_PLOT, clsPlot))
      .attr('transform', DU.translateMargins(options));
  }
  return plot;
}

function removePlot(display, options, i, r) {
  var clsSvg = [C_SVG, options.combine ? 1 : r].join('-');
  var svg = display.select(DU.s(clsSvg));
  if (svg.empty()) return false;
  if (!options.combine) {
    svg.remove();
    return true;
  }

  var clsPlot = [C_PLOT, r, i].join('-');
  var plot = svg.select(DU.s(clsPlot));
  if (plot.empty()) return false;
  plot.remove();
  return true;
}

},{"../StreamTransform.js":3,"../config.js":4,"../utility.js":15,"./Select.js":8,"./utility.js":13}],7:[function(require,module,exports){
module.exports = DisplayFrame;

var C_AXIS_X = 'd3stream-axis-x';
var C_AXIS_Y = 'd3stream-axis-y';
var C_LABELS = 'd3stream-labels';

var U = require('../utility.js');
var DU = require('./utility.js');
var DisplayBase = require('./DisplayBase.js');

function DisplayFrame(d3, element, options, data) {
  DisplayBase.call(this, d3, element, options, data);
  this.domainFunction = {};
}

DisplayFrame.prototype = Object.create(DisplayBase.prototype);
DisplayFrame.prototype.constructor = DisplayFrame;

DisplayFrame.prototype.domain = function (data, variable) {
  if (this.domainFunction[variable]) {
    return this.domainFunction[variable](this.d3, data, variable);
  } else {
    return domainExtent(this.d3, data, variable);
  }
};

DisplayFrame.prototype.setDomain = function (variables, domainFunction) {
  for (var i = 0; i < variables.length; i++) {
    this.domainFunction[variables[i]] = domainFunction;
  }
  return this;
};

function domainExtent(d3, data, variable) {
  return { domain: d3.extent(d3.merge(data), U.pick(variable)) };
}

DisplayFrame.prototype.domainManual = function (variables, range) {
  return this.setDomain(variables, function (d3, data, variable) {
    return { domain: range };
  });
};

DisplayFrame.prototype.domainPad = function (variables, padding) {
  if (!Array.isArray(padding)) {
    padding = [padding, padding];
  }
  return this.setDomain(variables, function (d3, data, variable) {
    var extent = domainExtent(d3, data, variable).domain;
    return { domain: [ extent[0] - padding[0], extent[1] + padding[1] ]};
  });
};

DisplayFrame.prototype.domainIQR = function (variables) {
  return this.setDomain(variables, function (d3, data, variable) {
    var sorted = U.map(d3.merge(data), U.pick(variable)).sort();
    var q1 = sorted[Math.floor(0.25 * sorted.length)];
    var q3 = sorted[Math.floor(0.75 * sorted.length)];
    var iqr = q3 - q1;
    return { domain: [
      Math.max(q1 - 1.5 * iqr, sorted[0]),
      Math.min(q3 + 1.5 * iqr, sorted[sorted.length - 1])
    ]};
  });
};

DisplayFrame.prototype.domainBands = function (variables, bandVariable, bands) {
  return this.setDomain(variables, function (d3, data, variable) {
    var domain = bands || null;
    if (!domain) {
      domain = U.unique(U.map(d3.merge(data), U.pick(bandVariable)));
    } else if (typeof bands.array == 'function') {
      domain = bands.array();
    }
    return { band: true, variable: bandVariable, domain: domain };
  });
};

DisplayFrame.prototype.addAxis = function (horizontalVariable, verticalVariable) {
  if (horizontalVariable) {
    this.addFrame(makeAxisBottom, { variable: horizontalVariable });
  }
  if (verticalVariable) {
    this.addFrame(makeAxisLeft, { variable: verticalVariable });
  }
  return this;
};

DisplayFrame.prototype.labels = function (labels) {
  return this.addFrame(makeLabels, { labels: labels });
};

function makeAxisBottom(display, data, options) {
  var scale = display.axis(data, options.variable).scale;
  display.display.selectAll('svg').each(function() {
    var svg = display.d3.select(this);
    var axis = svg.select(DU.s(C_AXIS_X));
    if (axis.empty()) {
      axis = svg.append('g').attr('class', C_AXIS_X);
    }
    axis.attr('transform', DU.translateMargins(options, 0, display.size.inHeight))
      .call(display.d3.axisBottom(scale));
  });
}

function makeAxisLeft(display, data, options) {
  var scale = display.axis(data, options.variable).scale;
  display.display.selectAll('svg').each(function() {
    var svg = display.d3.select(this);
    var axis = svg.select(DU.s(C_AXIS_Y));
    if (axis.empty()) {
      axis = svg.append('g').attr('class', C_AXIS_Y);
    }
    axis.attr('transform', DU.translateMargins(options))
      .call(display.d3.axisLeft(scale));
  });
}

function makeLabels(display, data, options) {
  if (data.length == 0) return;
  var labels = display.display.select(DU.s(C_LABELS));
  if (labels.empty()) {
    labels = display.display.append('div').attr('class', C_LABELS);
  } else {
    labels.selectAll('span').remove();
  }
  for (var i = 0; i < options.labels.length; i++) {
    labels.append('span')
      .attr('class', 'label-dot d3stream-group-' + i);
    labels.append('span')
      .html(options.labels[i]);
  }
}

},{"../utility.js":15,"./DisplayBase.js":6,"./utility.js":13}],8:[function(require,module,exports){
module.exports = Select;

var U = require('../utility.js');
var DU = require('./utility.js');
var C_FOCUS = 'd3stream-focus';
var C_SELECTION = 'd3stream-selection';
var C_FOCUS_SELECTION = 'd3stream-focus-selection';

function Select(d3, options) {
  this.d3 = d3;
  this.config = options;
  this.svgs = d3.select();
  this.selected = [];
  this.data = {};
}

Select.prototype.register = function (svg) {
  this.svgs = this.svgs.merge(svg);
};

Select.prototype.clear = function () {
  this.svgs.selectAll(DU.s(C_SELECTION)).classed(C_SELECTION, false);
  U.empty(this.selected);
};

Select.prototype.isSelected = function (d) {
  return U.isIn(d, this.selected);
};

Select.prototype.select = function (d) {
  this.selected.push(d);
};

Select.prototype.deselect = function (d) {
  U.removeFrom(d, this.selected);
};

Select.prototype.event = function (type, control, d, i) {
  if (this.config.selectPlot) {
    selectPlot[type](this, control, d);
  } else {
    selectShape[type](this, control, d);
  }
  if (this.config.select && this.config.select[type]) {
    this.config.select[type](this, d);
  }
};

var selectShape = {

  over: function (select, control, d) {
    if (control.classed(C_SELECTION)) {
      control.classed(C_FOCUS_SELECTION, true);
    } else {
      control.classed(C_FOCUS, true);
    }
  },

  out: function (select, control, d) {
    control.classed(DU.a(C_FOCUS, C_FOCUS_SELECTION), false);
  },

  click: function (select, control, d) {
    if (!select.isSelected(d)) {
      select.select(d);
      control.classed(DU.a(C_SELECTION, C_FOCUS_SELECTION), true)
        .classed(C_FOCUS, false);
    } else {
      select.deselect(d);
      control.classed(DU.a(C_SELECTION, C_FOCUS_SELECTION), false)
        .classed(C_FOCUS, true);
    }
  },
};

var selectPlot = {

  over: function (select, control, d) {
    var plot = select.d3.select(control.node().parentNode);
    if (plot.classed(C_SELECTION)) {
      plot.classed(C_FOCUS_SELECTION, true).raise();
    } else {
      plot.classed(C_FOCUS, true).raise();
    }
  },

  out: function (select, control, d) {
    var plot = select.d3.select(control.node().parentNode);
    plot.classed(DU.a(C_FOCUS, C_FOCUS_SELECTION), false);/*.lower();*/
  },

  click: function (select, control, d) {
    var plot = select.d3.select(control.node().parentNode);
    if (!select.isSelected(d.payload)) {
      select.select(d.payload);
      plot.classed(DU.a(C_SELECTION, C_FOCUS_SELECTION), true)
        .classed(C_FOCUS, false);
    } else {
      select.deselect(d.payload);
      plot.classed(DU.a(C_SELECTION, C_FOCUS_SELECTION), false)
        .classed(C_FOCUS, true);
    }
  },
};

},{"../utility.js":15,"./utility.js":13}],9:[function(require,module,exports){
var U = require('../utility.js');
var DU = require('./utility.js');

C_BAR = 'd3stream-bar';
C_GROUP = 'd3stream-group';

module.exports = {
  barChart: barChart,
  barChartDownwards: barChartDownwards,
  stackedBarChart: stackedBarChart,
  groupedBarChart: groupedBarChart,
};

function getAxis(display, data, width, height, options) {
  var axis = {
    x: display.axis(data, options.horizontalVariable || 'x'),
    y: display.axis(data, options.verticalVariable || 'y'),
  };
  axis.x.scale.rangeRound([0, width]);
  axis.y.domain = [
    Math.min(0, axis.y.domain[0]),
    Math.max(0, axis.y.domain[1])
  ];
  axis.y.scale.domain(axis.y.domain).rangeRound([height, 0]);
  return axis;
}

function getBarWidth(width, scale, count, options) {
  if (scale.bandwidth) {
    return [scale.bandwidth(), 0];
  } else {
    var bw = (1.0 - options.barMargin) * width / count;
    return [bw, bw / 2];
  }
}

function barChart(display, plot, fullData, serieIndex, options) {
  var width = display.size.inWidth;
  var height = display.size.inHeight;
  var axis = getAxis(display, fullData, width, height, options);
  var data = fullData[serieIndex];
  var bw = getBarWidth(width, axis.x.scale, data.length, options);
  var t = DU.transition(display.d3, options);

  var bars = plot.selectAll(DU.s(C_BAR)).data(data);
  bars.enter()
    .append('rect')
    .attr('class', C_BAR)
    .attr('x', function (d) { return axis.x.pick(d, bw[1]); })
    .attr('y', axis.y.scale(0))
    .attr('width', bw[0])
    .attr('height', 0)
    .on('mouseover', DU.event(display.select, 'over'))
    .on('mouseout', DU.event(display.select, 'out'))
    .on('click', DU.event(display.select, 'click'))
  .merge(bars)
    .transition(t)
    .attr('x', function (d) { return axis.x.pick(d, bw[1]); })
    .attr('y', function (d) { return axis.y.pick(d); })
    .attr('width', bw[0])
    .attr('height', function (d) { return height - axis.y.pick(d); });
  bars.exit().remove();
}

function barChartDownwards(display, plot, fullData, serieIndex, options) {
  var width = display.size.inWidth;
  var height = display.size.inHeight;
  var axis = getAxis(display, fullData, width, height, options);
  var data = fullData[serieIndex];
  var bw = getBarWidth(width, axis.x.scale, data.length, options);
  var t = DU.transition(display.d3, options);
  axis.y.scale.rangeRound([0, height]);

  var bars = plot.selectAll(DU.s(C_BAR)).data(data);
  bars.enter()
    .append('rect')
    .attr('class', C_BAR)
    .attr('x', function (d) { return axis.x.pick(d, bw[1]); })
    .attr('y', 0)
    .attr('width', bw[0])
    .attr('height', 0)
    .on('mouseover', DU.event(display.select, 'over'))
    .on('mouseout', DU.event(display.select, 'out'))
    .on('click', DU.event(display.select, 'click'))
  .merge(bars)
    .transition(t)
    .attr('x', function (d) { return axis.x.pick(d, bw[1]); })
    .attr('y', function (d) { return 0; })
    .attr('width', bw[0])
    .attr('height', function (d) { return axis.y.pick(d); });
  bars.exit().remove();
}

function stackedBarChart(display, plot, fullData, serieIndex, options) {
  var width = display.size.inWidth;
  var height = display.size.inHeight;
  var axis = getAxis(display, fullData, width, height, options);
  var data = fullData[serieIndex];
  var bw = getBarWidth(width, axis.x.scale, data.length, options);
  var t = DU.transition(display.d3, options);

  data = U.reduce(
    options.reverseStack ? data.reverse() : data,
    function (data, d) {
      var l = data.length > 0 ? data[data.length - 1].sy[1] : 0;
      d.sy = [ l, l + Math.abs(d[axis.y.variable]) ];
      data.push(d);
      return data;
    },
    []
  );
  axis.y.domain = [0, display.d3.max(data, function(d) { return d.sy[1]; })];
  axis.y.scale.domain(axis.y.domain);
  var groupVar = options.groupVariable || 'group';

  var bars = plot.selectAll(DU.s(C_BAR)).data(data);
  bars.enter()
    .append('rect')
    .attr('class', function (d) { return DU.a(C_BAR, [C_GROUP, d[groupVar]].join('-')); })
    .attr('x', function (d) { return axis.x.pick(d, bw[1]); })
    .attr('y', axis.y.scale(0))
    .attr('width', bw[0])
    .attr('height', 0)
    .on('mouseover', DU.event(display.select, 'over'))
    .on('mouseout', DU.event(display.select, 'out'))
    .on('click', DU.event(display.select, 'click'))
  .merge(bars)
    .transition(t)
    .attr('x', function (d) { return axis.x.pick(d, bw[1]); })
    .attr('y', function (d) { return axis.y.scale(d.sy[1]); })
    .attr('width', bw[0])
    .attr('height', function (d) { return axis.y.scale(d.sy[0]) - axis.y.scale(d.sy[1]); });
  bars.exit().remove();
}

function groupedBarChart(display, plot, fullData, serieIndex, options) {
  var width = display.size.inWidth;
  var height = display.size.inHeight;
  var axis = getAxis(display, fullData, width, height, options);
  var data = fullData[serieIndex];
  var bw = getBarWidth(width, axis.x.scale, data.length, options);
  var t = DU.transition(display.d3, options);

  var groupVar = options.groupVariable || 'group';
  var g = display.d3.scaleBand()
    .domain(U.map(data, U.pick(groupVar)))
    .rangeRound([0, bw[0]]);
  var gw = g.bandwidth();

  var bars = plot.selectAll(DU.s(C_BAR)).data(data);
  bars.enter()
    .append('rect')
    .attr('class', function (d) { return DU.a(C_BAR, [C_GROUP, d[groupVar]].join('-')); })
    .attr('x', function (d) { return axis.x.pick(d, bw[1]) + g(d[groupVar]); })
    .attr('y', axis.y.scale(0))
    .attr('width', gw)
    .attr('height', 0)
    .on('mouseover', DU.event(display.select, 'over'))
    .on('mouseout', DU.event(display.select, 'out'))
    .on('click', DU.event(display.select, 'click'))
  .merge(bars)
    .transition(t)
    .attr('x', function (d) { return axis.x.pick(d, bw[1]) + g(d[groupVar]); })
    .attr('y', function (d) { return axis.y.pick(d); })
    .attr('width', gw)
    .attr('height', function (d) { return height - axis.y.pick(d); });
  bars.exit().remove();
}

},{"../utility.js":15,"./utility.js":13}],10:[function(require,module,exports){
var DU = require('./utility.js');

C_LINE = 'd3stream-line';
C_DOT = 'd3stream-dot';

module.exports = {
  scatterPlot: scatterPlot,
  lineChart: lineChart,
};

function getAxis(display, data, width, height, options) {
  var axis = {
    x: display.axis(data, options.horizontalVariable || 'x'),
    y: display.axis(data, options.verticalVariable || 'y'),
    z: display.axis(data, options.scaleVariable || 'z'),
  };
  axis.x.scale.rangeRound([0, width]);
  axis.y.scale.rangeRound([height, 0]);
  axis.z.scale.rangeRound(options.lineDotRange);
  return axis;
}

function scatterPlot(display, plot, fullData, serieIndex, options) {
  var width = display.size.inWidth;
  var height = display.size.inHeight;
  var axis = getAxis(display, fullData, width, height, options);
  var data = fullData[serieIndex];
  var t = DU.transition(display.d3, options);
  data = DU.cutToDomain(data, axis.z.variable, axis.z.domain);
  drawDots(plot, data, t, axis, display.select);
}

function lineChart(display, plot, fullData, serieIndex, options) {
  var width = display.size.inWidth;
  var height = display.size.inHeight;
  var axis = getAxis(display, fullData, width, height, options);
  var data = fullData[serieIndex];
  var t = DU.transition(display.d3, options);
  data = DU.cutToDomain(data, axis.z.variable, axis.z.domain);

  var path = plot.select(DU.s(C_LINE));
  if (path.empty()) {
    var preLiner = display.d3.line()
      .x(function (d) { return axis.x.pick(d); })
      .y(axis.y.scale(0));
    if (options.curveLine) {
      preLiner.curve(display.d3.curveNatural);
    }
    path = plot.append('path')
      .attr('class', C_LINE)
      .attr('d', preLiner(data));
  }
  var liner = display.d3.line()
    .x(function (d) { return axis.x.pick(d); })
    .y(function (d) { return axis.y.pick(d); });
  if (options.curveLine) {
    liner.curve(display.d3.curveNatural);
  }
  path.transition(t).attr('d', liner(data));

  drawDots(plot, data, t, axis, display.select);
}

function drawDots(plot, data, t, axis, select) {
  var dots = plot.selectAll(DU.s(C_DOT)).data(data);
  dots.enter()
    .append('circle')
    .attr('class', C_DOT)
    .attr('cx', function(d) { return axis.x.pick(d); })
    .attr('cy', axis.y.scale(0))
    .attr('r', axis.z.scale(axis.z.domain[0]))
    .on('mouseover', DU.event(select, 'over'))
    .on('mouseout', DU.event(select, 'out'))
    .on('click', DU.event(select, 'click'))
  .merge(dots)
    .transition(t)
    .attr('cx', function (d) { return axis.x.pick(d); })
    .attr('cy', function (d) { return axis.y.pick(d); })
    .attr('r', function (d) { return axis.z.pick(d); });
  dots.exit().remove();
}

},{"./utility.js":13}],11:[function(require,module,exports){
module.exports = function(d3, callback) {
  var resizeTimeout;

  d3.select(window).on('resize', delayResize);

  function delayResize() {
    if (!resizeTimeout) {
      resizeTimeout = setTimeout(doResize, 500);
    }
  }

  function doResize() {
    resizeTimeout = null;
    callback();
  }

};

},{}],12:[function(require,module,exports){
var U = require('../utility.js');

C_TABLE = 'd3stream-table';

module.exports = {
  table: table,
};

function table(display, data, options) {
  data = data[0];
  display.display.selectAll('table').remove();
  var table = display.display.append('table')
    .attr('class', C_TABLE);
  var cols = U.keys(data[0]);
  var tr = table.append('tr');
  for (var i = 0; i < cols.length; i++) {
    tr.append('th').text(cols[i]);
  }
  for (var j = 0; j < data.length; j++) {
    var row = data[j];
    tr = table.append('tr');
    for (i = 0; i < cols.length; i++) {
      tr.append('td').text(row[cols[i]]);
    }
  }
}

},{"../utility.js":15}],13:[function(require,module,exports){
var U = require('../utility.js');

module.exports = {
  translate: translate,

  translateMargins: function (options, x, y) {
    return translate(
      options.marginLeft + (x || 0),
      options.marginTop + (y || 0)
    );
  },

  s: function(cls) {
    return '.'.concat(String(cls));
  },

  a: function() {
    return U.filter(arguments, U.isNonEmpty).join(' ');
  },

  transition: function (d3, options) {
    return d3.transition().duration(options.transitionDuration);
  },

  event: function (select, type) {
    return function (d, i) {
      select.event(type, select.d3.select(this), d, i);
    };
  },

  cutToDomain: function (data, parameter, domain) {
    var min = domain[0], max = domain[1];
    function obj(l) {
      var a = {};
      a[parameter] = l;
      return a;
    }
    return U.map(data, function (d) {
      var l = d[parameter];
      if (l > max) {
        return U.assign(d, obj(max));
      } else if (l < min) {
        return U.assign(d, obj(min));
      }
      return U.assign(d);
    });
  },

};

function translate(x, y) {
  return 'translate(' + x + ',' + y + ')';
}

},{"../utility.js":15}],14:[function(require,module,exports){
if (typeof define == 'function' && define.amd) {
  define([], function () {
    return require('./Stream.js');
  });
} else {
  window.d3Stream = require('./Stream.js');
}

},{"./Stream.js":1}],15:[function(require,module,exports){
module.exports = {
  map: map,
  filter: filter,
  reduce: reduce,
  isIn: isIn,
  containedIn: containedIn,
  removeFrom: removeFrom,
  keys: keys,
  values: values,
  assign: assign,

  consoleLog: function (d) {
    console.log(d);
  },

  toNumber: function (val) {
    return parseFloat(val);
  },

  isNotNaN: function (val) {
    return !isNaN(val);
  },

  isNonEmpty: function (val) {
    return val && (val.trim === undefined || val.trim() !== '');
  },

  empty: function (list) {
    list.splice(0, list.length);
  },

  pick: function (key) {
    return function (obj) {
      return obj[key];
    };
  },

  splitEach: function (list, sep) {
    return reduce(list, function (out, val) {
      return out.concat(val.split(sep));
    }, []);
  },

  countEach: function (vals) {
    return reduce(vals, function (out, val) {
      out[val] = (out[val] || 0) + 1;
      return out;
    }, {});
  },

  navigate: function (data, dotPath) {
    return [].concat(reduce(dotPath.split('.'), function (out, k) {
      return out[k];
    }, data));
  },

  repeat: function (data, other) {
    return map(other, function (z) {
      return [data, z];
    });
  },

  cross: function (data, other) {
    return map(data, function (d) {
      return map(other, function (z) {
        return [d, z];
      });
    });
  },

  unique: function (data) {
    return reduce(data, function(out, d) {
      if (!isIn(d, out)) out.push(d);
      return out;
    }, []);
  },

  group: function (data, conditions) {
    var groups = reduce(conditions, function (out) {
      out.push([]);
      return out;
    }, []);
    return reduce(data, function (out, d) {
      for (var i = 0; i < conditions.length; i++) {
        if (conditions[i](d)) {
          out[i].push(d);
          return out;
        }
      }
      return out;
    }, groups);
  },

  cumulate: function(data, parameters) {
    var keys = [].concat(parameters);
    return reduce(data, function (out, d) {
      if (out.length > 0) {
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          d[key] = out[out.length - 1][key] + (d[key] || 0);
        }
      }
      out.push(d);
      return out;
    }, []);
  },

};

function map(data, callback) {
  if (typeof data.map == 'function') return data.map(callback);
  var out = [];
  for (var i = 0; i < data.length; i++) {
    out.push(callback(data[i], i, data));
  }
  return out;
}

function filter(data, callback) {
  if (typeof data.filter == 'function') return data.filter(callback);
  var out = [];
  for (var i = 0; i < data.length; i++) {
    if (callback(data[i], i, data)) {
      out.push(data[i]);
    }
  }
  return out;
}

function reduce(data, callback, initial) {
  if (typeof data.reduce == 'function') return data.reduce(callback, initial);
  var out = initial;
  for (var i = 0; i < data.length; i++) {
    out = callback(out, data[i], i, data);
  }
  return out;
}

function isIn(val, list) {
  return list.indexOf(val) >= 0;
}

function removeFrom(val, list) {
  return list.splice(list.indexOf(val), 1);
}

function containedIn(items, list) {
  for (var i = 0; i < items.length; i++) {
    if (!isIn(items[i], list)) {
      return false;
    }
  }
  return true;
}

function keys(obj) {
  if (typeof Object.keys == 'function') return Object.keys(obj);
  var keys = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) keys.push(key);
  }
  return keys;
}

function values(obj) {
  if (typeof Object.values == 'function') return Object.values(obj);
  var vals = [];
  for (var key in keys(obj)) {
    vals.push(obj[key]);
  }
  return vals;
}

function assign() {
  return reduce(arguments, function (merged, arg) {
    for (var k in arg) {
      merged[k] = arg[k];
    }
    return merged;
  }, {});
}

},{}]},{},[14]);
