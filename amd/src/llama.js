(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = KeysDisplay;

function KeysDisplay(llama, element) {
  var $nav = $(element + ' .nav');
  $nav.find('.all a').on('click', changeUnit(llama));

  return llama.stream.display(element, {}, llama.d3)
    .keys()
    .filter(function (d) {
      return d.substr(d.length - 6) == ' Count';
    })
    .map(function (d) {
      return d.substr(0, d.length - 6);
    })
    .addFrame(keysFrame(llama, $nav));
}

function keysFrame(llama, $nav) {
  return function (display, data, options) {
    if (data.length > 0) {
      var $proto = $nav.find('.placeholder');

      if (llama.currentUnitFilter == '#all') {
        $nav.find('.unit').remove();

        var units = data[0];
        for (var i = 0; i < units.length; i++) {
          var $i = $proto.clone()
            .removeClass('placeholder hidden')
            .addClass('unit');
          $i.find('a')
            .attr('href', '#' + units[i])
            .text(units[i])
            .on('click', changeUnit(llama));
          $nav.append($i);
        }
      }
      llama.displays.learners.update();
    }
  };
}

function changeUnit(llama) {
  return function (event) {
    llama.changeUnit(event, $(this));
  };
}

},{}],2:[function(require,module,exports){
module.exports = LearnersDisplay;

function LearnersDisplay(llama, element) {
  this.llama = llama;
  this.$div = $(element);

  this.$div.find('button').on('click', function (event) {
    llama.clearSelection(event, $(this));
  });
}

LearnersDisplay.prototype.update = function() {
  var $div = this.$div;
  var uids = this.llama.selectedLearners.array();
  var learners = this.llama.stream.array();

  if (uids.length > 0) {
    $div.show();
  } else {
    $div.hide();
  }

  var $proto = $div.find('.placeholder');
  $div.find('.unit').remove();

  for (var i = 0; i < uids.length; i++) {
    var learner = pickLearner(uids[i], learners);
    if (learner != null) {
      var $i = $proto.clone()
        .removeClass('placeholder hidden')
        .addClass('unit');
      $div.append($i);
      this.createBadge($i, uids[i], learner);
    }
  }
};

LearnersDisplay.prototype.createBadge = function($i, uid, learner) {
  var llama = this.llama;

  if (llama.config.userUrl) {
    $i.find('a').attr('href', llama.config.userUrl(uid));
  } else {
    $i.find('a').removeAttr('href');
  }

  $i.find('.name').text(learner.Email || learner.UserID);
  $i.find('.studentid').text(learner.StudentID || '');

  var stream = new llama.d3Stream(llama.displays.keys.array())
    .map(function (key, i) {
      return {
        x: key,
        p: +learner[key + ' Ratio'],
        e: +learner[key + ' Count'],
      };
    });

  var opt = {
    height: 20,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    transitionDuration: 0,
  };

  stream.display($i.find('.up'), opt, llama.d3)
    .domainBands('x', 'x')
    .barChart({ verticalVariable: 'p' });
  stream.display($i.find('.down'), opt, llama.d3)
    .domainBands('x', 'x')
    .barChartDownwards({ verticalVariable: 'e' });
};

function pickLearner(uid, learners) {
  for (var i = 0; i < learners.length; i++) {
    if (learners[i].UserID == uid) {
      return learners[i];
    }
  }
  return null;
}

},{}],3:[function(require,module,exports){
module.exports = LlamaClient;

var KeysDisplay = require('./KeysDisplay.js');
var LearnersDisplay = require('./LearnersDisplay');
var Factory = {
  '#llama-view-progress': require('./ProgressDisplay.js'),
  '#llama-view-trajectories': require('./TrajectoriesDisplay.js'),
  '#llama-view-table': require('./TableDisplay.js'),
};

function LlamaClient(options, d3lib, d3StreamClass) {

  var defaults = {
    progressLabels: ['Not submitted', '< 90% points', '>= 90% points'],
  };

  this.config = $.extend({}, defaults, options);
  if (typeof this.config.apiUrl != 'function') {
    throw new Error('Llama Client requires apiUrl (function) in options argument!');
  }

  this.d3 = d3lib || d3;
  this.d3Stream = d3StreamClass || d3Stream;
  this.stream = new this.d3Stream();
  this.filterTagIds = new this.d3Stream();
  this.selectedLearners = new this.d3Stream();
  this.displays = {
    keys: new KeysDisplay(this, '#llama-unit-select'),
    learners: new LearnersDisplay(this, '#llama-view-learners'),
  };
  this.currentDisplay = undefined;
  this.currentUnitFilter = undefined;

  var llama = this;
  $('#llama-view-select .nav a').on('click', function(event) {
    llama.changeView(event, $(this));
  });
  $('#llama-filter-tags button').on('click', function(event) {
    llama.toggleFilter(event, $(this));
  });

  this.load('#all');//(window.location.hash || '#all');
  this.displayView('#llama-view-progress');
}

LlamaClient.prototype.load = function(filter) {
  this.currentUnitFilter = filter;
  this.stream.load(this.config.apiUrl(filter), {
    format: this.config.apiFormat || 'json',
  }, this.d3);
};

LlamaClient.prototype.changeUnit = function(event, $a) {
  $('#llama-unit-select .nav').find('.active').removeClass('active');
  $a.addClass('active').parent().addClass('active');
  this.load($a.attr('href'));
};

LlamaClient.prototype.changeView = function(event, $a) {
  event.preventDefault();
  $('#llama-view-select .nav').find('.active').removeClass('active');
  $a.addClass('active').parent().addClass('active');
  this.displayView($a.attr('href'));
};

LlamaClient.prototype.toggleFilter = function(event, $b) {
  var id = $b.attr('data-id');
  if (this.filterTagIds.contains(id)) {
    this.filterTagIds.remove(id);
    $b.find('.glyphicon').removeClass('glyphicon-check').addClass('glyphicon-unchecked');
  } else {
    this.filterTagIds.add(id);
    $b.find('.glyphicon').removeClass('glyphicon-unchecked').addClass('glyphicon-check');
  }
  this.filterStream();
};

LlamaClient.prototype.clearSelection = function(event, $b) {
  this.selectedLearners.empty();
  this.displays.learners.update();
  this.displays[this.currentDisplay].update();
};

LlamaClient.prototype.filterStream = function() {
  if (this.filterTagIds.data.length > 0) {
    var llama = this;
    this.stream.reset().filter(function (d) {
      return llama.filterTagIds.containedIn(d.Tags.split('|'));
    });
  } else {
    this.stream.reset();
  }
  this.displays.learners.update();
};

LlamaClient.prototype.displayView = function(id) {
  for (var key in Factory) {
    if (key[0] == '#') {
      $(key).hide();
    }
  }
  $(id).show();
  if (this.displays[id] == undefined) {
    this.displays[id] = new Factory[id](this, id);
  } else {
    this.displays[id].update();
  }
  this.currentDisplay = id;
};

},{"./KeysDisplay.js":1,"./LearnersDisplay":2,"./ProgressDisplay.js":4,"./TableDisplay.js":5,"./TrajectoriesDisplay.js":6}],4:[function(require,module,exports){
module.exports = ProgressDisplay;

function ProgressDisplay(llama, element) {
  var $div = $(element);
  var $pop = $div.find('.llama-detail').hide();

  return llama.stream.display(element, {
    select: selectLogic(llama, $div, $pop)
  }, llama.d3)
    .repeat(llama.displays.keys)
    .map(function (pair, i) {
      var countKey = pair[1] + ' Count';
      var ratioKey = pair[1] + ' Ratio';

      return new llama.d3Stream(pair[0])
        .group([
          function (d) { return +d[countKey] == 0; },
          function (d) { return +d[ratioKey] < 0.9; },
          function (d) { return true; },
        ])
        .map(function (group, i) {
          return {
            x: pair[1],
            y: group.length,
            z: 0,
            group: i,
            payload: group,
          };
        })
        .array();
    })
    .domainBands('x', 'x')
    .addAxis('x', 'y')
    .stackedBarChart({ reverseStack: true })
    .labels(llama.config.progressLabels);
}

function selectLogic(llama, $div, $pop) {
  return {

    over: function (select, data) {
      var position = llama.d3.mouse($div[0]);
      $pop.show()
        .css('left', (position[0] + 15) + "px")
        .css('top', position[1] + "px");
      var group = data.payload;
      var countKey = data.x + ' Count';
      var ratioKey = data.x + ' Ratio';
      var submissions = group.map(function(d) { return d[countKey]; });
      var ratios = group.map(function(d) { return d[ratioKey]; });
      $pop.find('.number').text(group.length);
      $pop.find('.submissions').text(llama.d3.min(submissions) + ' - ' + llama.d3.max(submissions));
      $pop.find('.ratio').text(per(llama.d3.min(ratios)) + ' - ' + per(llama.d3.max(ratios)));
    },

    out: function (select, data) {
      $pop.hide();
    },

    click: function (select, data) {
      llama.selectedLearners.empty();
      var groups = select.selected;
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i].payload;
        for (var j = 0; j < group.length; j++) {
          var id = group[j].UserID;
          if (!llama.selectedLearners.contains(id)) {
            llama.selectedLearners.add(id);
          }
        }
      }
      llama.displays.learners.update();
    },
  };
}

function per(val) {
  return Math.round(val * 100) + '%';
}

},{}],5:[function(require,module,exports){
module.exports = TableDisplay;

function TableDisplay(llama, element) {
  var $div = $(element);
  var $a = $div.find('a');

  return llama.stream.display(element, {
    update: updateDownloadLinks(llama, $div, $a),
  }, llama.d3)
    .table();
}

function updateDownloadLinks(llama, $div, $a) {
  return function (display, data) {
    $a.eq(0).attr('href', llama.config.apiUrl(llama.currentUnitFilter, true));
    $a.eq(1).attr('href', llama.config.apiUrl(llama.currentUnitFilter));
  };
}

},{}],6:[function(require,module,exports){
module.exports = TrajectoriesDisplay;

function TrajectoriesDisplay(llama, element) {
  return llama.stream.display(element, {
      height: 350,
      selectPlot: true,
      update: selectCurrent(llama, element),
      select: selectLogic(llama),
    }, llama.d3)
    .cross(llama.displays.keys)
    .mapAsStreams(function (row) {
      return row
        .filter(function (pair) {
          return +pair[0][pair[1] + ' Count'] > 0;
        })
        .map(function (pair) {
          return {
            x: pair[1],
            y: +pair[0][pair[1] + ' Total'],
            z: +pair[0][pair[1] + ' Count'],
            payload: pair[0],
          };
        })
        .cumulate('y');
    })
    .domainIQR('z')
    .domainBands('x', 'x', llama.displays.keys)
    .addAxis('x', 'y')
    .lineChart({ curveLine: true });
}

function selectCurrent(llama, element) {
  return function (display, data) {
    var uids = llama.selectedLearners.array();
    llama.d3.select(element)
      .selectAll('.d3stream-plot')
      .select('.d3stream-dot')
      .each(function (d) {
        if (llama.selectedLearners.contains(d.payload.UserID)) {
          llama.d3.select(this.parentNode).classed('d3stream-selection', true);
          display.select.select(d.payload);
        }
      });
  };
}

function selectLogic(llama) {
  return {
    click: function (select, data) {
      var id = data.payload.UserID;
      if (!llama.selectedLearners.contains(id)) {
        llama.selectedLearners.add(id);
      } else {
        llama.selectedLearners.remove(id);
      }
      llama.displays.learners.update();
    },
  };
}

},{}],7:[function(require,module,exports){
if (typeof define == 'function' && define.amd) {
  define([], function () {
    return require('./LlamaClient.js');
  });
} else {
  window.LlamaClient = require('./LlamaClient.js');
}

},{"./LlamaClient.js":3}]},{},[7]);
