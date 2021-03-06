(function() {
  var svg;

  //save off default references
  var d3 = window.d3, topojson = window.topojson;

  var defaultOptions = {
    scope: 'world',
    responsive: false,
    aspectRatio: 0.5625,
    setProjection: setProjection,
    projection: 'equirectangular',
    dataType: 'json',
    data: {},
    done: function() {},
    fills: {
      defaultFill: '#ABDDA4'
    },
    filters: {},
    geographyConfig: {
        dataUrl: null,
        hideAntarctica: true,
        hideHawaiiAndAlaska : false,
        borderWidth: 1,
        borderColor: '#FDFDFD',
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
        },
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2
    },
    projectionConfig: {
      rotation: [97, 0]
    },
    bubblesConfig: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        popupOnHover: true,
        radius: null,
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
        },
        fillOpacity: 0.75,
        animate: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightFillOpacity: 0.85,
        exitDelay: 100,
        key: JSON.stringify
    },
    arcConfig: {
      strokeColor: '#DD1C77',
      strokeWidth: 1,
      arcSharpness: 1,
      animationSpeed: 600
    }
  };

  /*
    Getter for value. If not declared on datumValue, look up the chain into optionsValue
  */
  function val( datumValue, optionsValue, context ) {
    if ( typeof context === 'undefined' ) {
      context = optionsValue;
      optionsValues = undefined;
    }
    var value = typeof datumValue !== 'undefined' ? datumValue : optionsValue;

    if (typeof value === 'undefined') {
      return  null;
    }

    if ( typeof value === 'function' ) {
      var fnContext = [context];
      if ( context.geography ) {
        fnContext = [context.geography, context.data];
      }
      return value.apply(null, fnContext);
    }
    else {
      return value;
    }
  }

  function addContainer( element, height, width ) {
    this.svg = d3.select( element ).append('svg')
      .attr('width', width || element.offsetWidth)
      .attr('data-width', width || element.offsetWidth)
      .attr('class', 'datamap')
      .attr('height', height || element.offsetHeight)
      .style('overflow', 'hidden'); // IE10+ doesn't respect height/width when map is zoomed in

    if (this.options.responsive) {
      d3.select(this.options.element).style({'position': 'relative', 'padding-bottom': (this.options.aspectRatio*100) + '%'});
      d3.select(this.options.element).select('svg').style({'position': 'absolute', 'width': '100%', 'height': '100%'});
      d3.select(this.options.element).select('svg').select('g').selectAll('path').style('vector-effect', 'non-scaling-stroke');

    }

    return this.svg;
  }

  // setProjection takes the svg element and options
  function setProjection( element, options ) {
    var width = options.width || element.offsetWidth;
    var height = options.height || element.offsetHeight;
    var projection, path;
    var svg = this.svg;

    if ( options && typeof options.scope === 'undefined') {
      options.scope = 'world';
    }

    if ( options.scope === 'usa' ) {
      projection = d3.geo.albersUsa()
        .scale(width)
        .translate([width / 2, height / 2]);
    }
    else if ( options.scope === 'world' ) {
      projection = d3.geo[options.projection]()
        .scale((width + 1) / 2 / Math.PI)
        .translate([width / 2, height / (options.projection === "mercator" ? 1.45 : 1.8)]);
    }

    if ( options.projection === 'orthographic' ) {

      svg.append("defs").append("path")
        .datum({type: "Sphere"})
        .attr("id", "sphere")
        .attr("d", path);

      svg.append("use")
          .attr("class", "stroke")
          .attr("xlink:href", "#sphere");

      svg.append("use")
          .attr("class", "fill")
          .attr("xlink:href", "#sphere");
      projection.scale(250).clipAngle(90).rotate(options.projectionConfig.rotation)
    }

    path = d3.geo.path()
      .projection( projection );

    return {path: path, projection: projection};
  }

  function addStyleBlock() {
    if ( d3.select('.datamaps-style-block').empty() ) {
      d3.select('head').append('style').attr('class', 'datamaps-style-block')
      .html('.datamap path.datamaps-graticule { fill: none; stroke: #777; stroke-width: 0.5px; stroke-opacity: .5; pointer-events: none; } .datamap .labels {pointer-events: none;} .datamap path {stroke: #FFFFFF; stroke-width: 1px;} .datamaps-legend dt, .datamaps-legend dd { float: left; margin: 0 3px 0 0;} .datamaps-legend dd {width: 20px; margin-right: 6px; border-radius: 3px;} .datamaps-legend {padding-bottom: 20px; z-index: 1001; position: absolute; left: 4px; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .datamaps-hoverover {display: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; } .hoverinfo {padding: 4px; border-radius: 1px; background-color: #FFF; box-shadow: 1px 1px 5px #CCC; font-size: 12px; border: 1px solid #CCC; } .hoverinfo hr {border:1px dotted #CCC; }');
    }
  }

  function drawSubunits( data ) {
    var fillData = this.options.fills,
        colorCodeData = this.options.data || {},
        geoConfig = this.options.geographyConfig;


    var subunits = this.svg.select('g.datamaps-subunits');
    if ( subunits.empty() ) {
      subunits = this.addLayer('datamaps-subunits', null, true);
    }

    var geoData = topojson.feature( data, data.objects[ this.options.scope ] ).features;
    if ( geoConfig.hideAntarctica ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "ATA";
      });
    }

    if ( geoConfig.hideHawaiiAndAlaska ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "HI" && feature.id !== 'AK';
      });
    }

    var geo = subunits.selectAll('path.datamaps-subunit').data( geoData );

    geo.enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', function(d) {
        return 'datamaps-subunit ' + d.id;
      })
      .attr('data-info', function(d) {
        return JSON.stringify( colorCodeData[d.id]);
      })
      .style('fill', function(d) {
        //if fillKey - use that
        //otherwise check 'fill'
        //otherwise check 'defaultFill'
        var fillColor;

        var datum = colorCodeData[d.id];
        if ( datum && datum.fillKey ) {
          fillColor = fillData[ val(datum.fillKey, {data: colorCodeData[d.id], geography: d}) ];
        }

        if ( typeof fillColor === 'undefined' ) {
          fillColor = val(datum && datum.fillColor, fillData.defaultFill, {data: colorCodeData[d.id], geography: d});
        }

        return fillColor;
      })
      .style('stroke-width', geoConfig.borderWidth)
      .style('stroke', geoConfig.borderColor);
  }

  function handleGeographyConfig () {
    var hoverover;
    var svg = this.svg;
    var self = this;
    var options = this.options.geographyConfig;

    if ( options.highlightOnHover || options.popupOnHover ) {
      svg.selectAll('.datamaps-subunit')
        .on('mouseover', function(d) {
          var $this = d3.select(this);
          var datum = self.options.data[d.id] || {};
          if ( options.highlightOnHover ) {
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));

            //as per discussion on https://github.com/markmarkoh/datamaps/issues/19
            if ( ! /((MSIE)|(Trident))/.test(navigator.userAgent) ) {
             moveToFront.call(this);
            }
          }

          if ( options.popupOnHover ) {
            self.updatePopup($this, d, options, svg);
          }
        })
        .on('mouseout', function() {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }
          $this.on('mousemove', null);
          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        });
    }

    function moveToFront() {
      this.parentNode.appendChild(this);
    }
  }

  //plugin to add a simple map legend
  function addLegend(layer, data, options) {
    data = data || {};
    if ( !this.options.fills ) {
      return;
    }

    var html = '<dl>';
    var label = '';
    if ( data.legendTitle ) {
      html = '<h2>' + data.legendTitle + '</h2>' + html;
    }
    for ( var fillKey in this.options.fills ) {

      if ( fillKey === 'defaultFill') {
        if (! data.defaultFillName ) {
          continue;
        }
        label = data.defaultFillName;
      } else {
        if (data.labels && data.labels[fillKey]) {
          label = data.labels[fillKey];
        } else {
          label= fillKey + ': ';
        }
      }
      html += '<dt>' + label + '</dt>';
      html += '<dd style="background-color:' +  this.options.fills[fillKey] + '">&nbsp;</dd>';
    }
    html += '</dl>';

    var hoverover = d3.select( this.options.element ).append('div')
      .attr('class', 'datamaps-legend')
      .html(html);
  }

    function addGraticule ( layer, options ) {
      var graticule = d3.geo.graticule();
      this.svg.insert("path", '.datamaps-subunits')
        .datum(graticule)
        .attr("class", "datamaps-graticule")
        .attr("d", this.path);
  }

  function handleArcs (layer, data, options) {
    var self = this,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - arcs must be an array";
    }

    // For some reason arc options were put in an `options` object instead of the parent arc
    // I don't like this, so to match bubbles and other plugins I'm moving it
    // This is to keep backwards compatability
    for ( var i = 0; i < data.length; i++ ) {
      data[i] = defaults(data[i], data[i].options);
      delete data[i].options;
    }

    if ( typeof options === "undefined" ) {
      options = defaultOptions.arcConfig;
    }

    var arcs = layer.selectAll('path.datamaps-arc').data( data, JSON.stringify );

    var path = d3.geo.path()
        .projection(self.projection);

    arcs
      .enter()
        .append('svg:path')
        .attr('class', 'datamaps-arc')
        .style('stroke-linecap', 'round')
        .style('stroke', function(datum) {
          return val(datum.strokeColor, options.strokeColor, datum);
        })
        .style('fill', 'none')
        .style('stroke-width', function(datum) {
            return val(datum.strokeWidth, options.strokeWidth, datum);
        })
        .attr('d', function(datum) {
            var originXY = self.latLngToXY(val(datum.origin.latitude, datum), val(datum.origin.longitude, datum))
            var destXY = self.latLngToXY(val(datum.destination.latitude, datum), val(datum.destination.longitude, datum));
            var midXY = [ (originXY[0] + destXY[0]) / 2, (originXY[1] + destXY[1]) / 2];
            if (options.greatArc) {
                  // TODO: Move this to inside `if` clause when setting attr `d`
              var greatArc = d3.geo.greatArc()
                  .source(function(d) { return [val(d.origin.longitude, d), val(d.origin.latitude, d)]; })
                  .target(function(d) { return [val(d.destination.longitude, d), val(d.destination.latitude, d)]; });

              return path(greatArc(datum))
            }
            var sharpness = val(datum.arcSharpness, options.arcSharpness, datum);
            return "M" + originXY[0] + ',' + originXY[1] + "S" + (midXY[0] + (50 * sharpness)) + "," + (midXY[1] - (75 * sharpness)) + "," + destXY[0] + "," + destXY[1];
        })
        .transition()
          .delay(100)
          .style('fill', function(datum) {
            /*
              Thank you Jake Archibald, this is awesome.
              Source: http://jakearchibald.com/2013/animated-line-drawing-svg/
            */
            var length = this.getTotalLength();
            this.style.transition = this.style.WebkitTransition = 'none';
            this.style.strokeDasharray = length + ' ' + length;
            this.style.strokeDashoffset = length;
            this.getBoundingClientRect();
            this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset ' + val(datum.animationSpeed, options.animationSpeed, datum) + 'ms ease-out';
            this.style.strokeDashoffset = '0';
            return 'none';
          })

    arcs.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }

  function handleLabels ( layer, options ) {
    var self = this;
    options = options || {};
    var labelStartCoodinates = this.projection([-67.707617, 42.722131]);
    this.svg.selectAll(".datamaps-subunit")
      .attr("data-foo", function(d) {
        var center = self.path.centroid(d);
        var xOffset = 7.5, yOffset = 5;

        if ( ["FL", "KY", "MI"].indexOf(d.id) > -1 ) xOffset = -2.5;
        if ( d.id === "NY" ) xOffset = -1;
        if ( d.id === "MI" ) yOffset = 18;
        if ( d.id === "LA" ) xOffset = 13;

        var x,y;

        x = center[0] - xOffset;
        y = center[1] + yOffset;

        var smallStateIndex = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"].indexOf(d.id);
        if ( smallStateIndex > -1) {
          var yStart = labelStartCoodinates[1];
          x = labelStartCoodinates[0];
          y = yStart + (smallStateIndex * (2+ (options.fontSize || 12)));
          layer.append("line")
            .attr("x1", x - 3)
            .attr("y1", y - 5)
            .attr("x2", center[0])
            .attr("y2", center[1])
            .style("stroke", options.labelColor || "#000")
            .style("stroke-width", options.lineWidth || 1)
        }

        layer.append("text")
          .attr("x", x)
          .attr("y", y)
          .style("font-size", (options.fontSize || 10) + 'px')
          .style("font-family", options.fontFamily || "Verdana")
          .style("fill", options.labelColor || "#000")
          .text( d.id );
        return "bar";
      });
  }


  function handleBubbles (layer, data, options ) {
    var self = this,
        fillData = this.options.fills,
        filterData = this.options.filters,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - bubbles must be an array";
    }

    var bubbles = layer.selectAll('circle.datamaps-bubble').data( data, options.key );

    bubbles
      .enter()
        .append('svg:circle')
        .attr('class', 'datamaps-bubble')
        .attr('cx', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[0];
        })
        .attr('cy', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[1];
        })
        .attr('r', function(datum) {
          // if animation enabled start with radius 0, otherwise use full size.
          return options.animate ? 0 : val(datum.radius, options.radius, datum);
        })
        .attr('data-info', function(d) {
          return JSON.stringify(d);
        })
        .attr('filter', function (datum) {
          var filterKey = filterData[ val(datum.filterKey, options.filterKey, datum) ];

          if (filterKey) {
            return filterKey;
          }
        })
        .style('stroke', function ( datum ) {
          return val(datum.borderColor, options.borderColor, datum);
        })
        .style('stroke-width', function ( datum ) {
          return val(datum.borderWidth, options.borderWidth, datum);
        })
        .style('fill-opacity', function ( datum ) {
          return val(datum.fillOpacity, options.fillOpacity, datum);
        })
        .style('fill', function ( datum ) {
          var fillColor = fillData[ val(datum.fillKey, options.fillKey, datum) ];
          return fillColor || fillData.defaultFill;
        })
        .on('mouseover', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //save all previous attributes for mouseout
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));
          }

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        .on('mouseout', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }

          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })

    bubbles.transition()
      .duration(400)
      .attr('r', function ( datum ) {
        return val(datum.radius, options.radius, datum);
      });

    bubbles.exit()
      .transition()
        .delay(options.exitDelay)
        .attr("r", 0)
        .remove();

    function datumHasCoords (datum) {
      return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
    }
  }

  //stolen from underscore.js
  function defaults(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  }
  /**************************************
             Public Functions
  ***************************************/

  function Datamap( options ) {

    if ( typeof d3 === 'undefined' || typeof topojson === 'undefined' ) {
      throw new Error('Include d3.js (v3.0.3 or greater) and topojson on this page before creating a new map');
   }
    //set options for global use
    this.options = defaults(options, defaultOptions);
    this.options.geographyConfig = defaults(options.geographyConfig, defaultOptions.geographyConfig);
    this.options.projectionConfig = defaults(options.projectionConfig, defaultOptions.projectionConfig);
    this.options.bubblesConfig = defaults(options.bubblesConfig, defaultOptions.bubblesConfig);
    this.options.arcConfig = defaults(options.arcConfig, defaultOptions.arcConfig);

    //add the SVG container
    if ( d3.select( this.options.element ).select('svg').length > 0 ) {
      addContainer.call(this, this.options.element, this.options.height, this.options.width );
    }

    /* Add core plugins to this instance */
    this.addPlugin('bubbles', handleBubbles);
    this.addPlugin('legend', addLegend);
    this.addPlugin('arc', handleArcs);
    this.addPlugin('labels', handleLabels);
    this.addPlugin('graticule', addGraticule);

    //append style block with basic hoverover styles
    if ( ! this.options.disableDefaultStyles ) {
      addStyleBlock();
    }

    return this.draw();
  }

  // resize map
  Datamap.prototype.resize = function () {

    var self = this;
    var options = self.options;

    if (options.responsive) {
      var newsize = options.element.clientWidth,
          oldsize = d3.select( options.element).select('svg').attr('data-width');

      d3.select(options.element).select('svg').selectAll('g').attr('transform', 'scale(' + (newsize / oldsize) + ')');
    }
  }

  // actually draw the features(states & countries)
  Datamap.prototype.draw = function() {
    //save off in a closure
    var self = this;
    var options = self.options;

    //set projections and paths based on scope
    var pathAndProjection = options.setProjection.apply(self, [options.element, options] );

    this.path = pathAndProjection.path;
    this.projection = pathAndProjection.projection;

    //if custom URL for topojson data, retrieve it and render
    if ( options.geographyConfig.dataUrl ) {
      d3.json( options.geographyConfig.dataUrl, function(error, results) {
        if ( error ) throw new Error(error);
        self.customTopo = results;
        draw( results );
      });
    }
    else {
      draw( this[options.scope + 'Topo'] || options.geographyConfig.dataJson);
    }

    return this;

      function draw (data) {
        // if fetching remote data, draw the map first then call `updateChoropleth`
        if ( self.options.dataUrl ) {
          //allow for csv or json data types
          d3[self.options.dataType](self.options.dataUrl, function(data) {
            //in the case of csv, transform data to object
            if ( self.options.dataType === 'csv' && (data && data.slice) ) {
              var tmpData = {};
              for(var i = 0; i < data.length; i++) {
                tmpData[data[i].id] = data[i];
              }
              data = tmpData;
            }
            Datamaps.prototype.updateChoropleth.call(self, data);
          });
        }
        drawSubunits.call(self, data);
        handleGeographyConfig.call(self);

        if ( self.options.geographyConfig.popupOnHover || self.options.bubblesConfig.popupOnHover) {
          hoverover = d3.select( self.options.element ).append('div')
            .attr('class', 'datamaps-hoverover')
            .style('z-index', 10001)
            .style('position', 'absolute');
        }

        //fire off finished callback
        self.options.done(self);
      }
  };
  /**************************************
                TopoJSON
  ***************************************/
  Datamap.prototype.worldTopo = '__WORLD__';
  Datamap.prototype.abwTopo = '__ABW__';
  Datamap.prototype.afgTopo = '__AFG__';
  Datamap.prototype.agoTopo = '__AGO__';
  Datamap.prototype.aiaTopo = '__AIA__';
  Datamap.prototype.albTopo = '__ALB__';
  Datamap.prototype.aldTopo = '__ALD__';
  Datamap.prototype.andTopo = '__AND__';
  Datamap.prototype.areTopo = '__ARE__';
  Datamap.prototype.argTopo = '__ARG__';
  Datamap.prototype.armTopo = '__ARM__';
  Datamap.prototype.asmTopo = '__ASM__';
  Datamap.prototype.ataTopo = '__ATA__';
  Datamap.prototype.atcTopo = '__ATC__';
  Datamap.prototype.atfTopo = '__ATF__';
  Datamap.prototype.atgTopo = '__ATG__';
  Datamap.prototype.ausTopo = '__AUS__';
  Datamap.prototype.autTopo = '__AUT__';
  Datamap.prototype.azeTopo = '__AZE__';
  Datamap.prototype.bdiTopo = '__BDI__';
  Datamap.prototype.belTopo = {"type":"Topology","objects":{"bel":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":"Hainaut"},"id":"BE.","arcs":[[[0,1,2,3,4,5]],[[6,7]]]},{"type":"MultiPolygon","properties":{"name":"Limburg"},"id":"BE.","arcs":[[[8,9]],[[10,11,12,13]]]},{"type":"Polygon","properties":{"name":"Brussels"},"id":"BE.BU","arcs":[[14]]},{"type":"Polygon","properties":{"name":"Flemish Brabant"},"id":"BE.VB","arcs":[[15,16,-1,17,18,-12],[-15]]},{"type":"Polygon","properties":{"name":"Namur"},"id":"BE.","arcs":[[19,20,21,-3,22]]},{"type":"Polygon","properties":{"name":"Luxembourg"},"id":"BE.","arcs":[[23,-21,24]]},{"type":"Polygon","properties":{"name":"East Flanders"},"id":"BE.OV","arcs":[[25,-18,-6,26,27]]},{"type":"Polygon","properties":{"name":"West Flanders"},"id":"BE.","arcs":[[-27,-5,28,-7,29]]},{"type":"Polygon","properties":{"name":"Antwerp"},"id":"BE.","arcs":[[-13,-19,-26,30]]},{"type":"Polygon","properties":{"name":"Liege"},"id":"BE.","arcs":[[-9,31,-25,-20,32,-16,-11,33]]},{"type":"Polygon","properties":{"name":"Walloon Brabant"},"id":"BE.","arcs":[[-33,-23,-2,-17]]}]}},"arcs":[[[3564,6191],[-18,-83],[12,-56],[37,-58],[55,-25],[157,-5],[53,51],[49,-20],[61,39],[18,-34],[37,85],[70,-29]],[[4095,6056],[33,-1],[-47,-17],[-10,-65],[2,-184],[26,-88],[45,-24],[61,11],[81,138],[29,14],[50,-81],[-13,-105],[138,-43],[-14,-104],[84,-21],[66,-125],[76,10],[-7,-127],[65,89],[147,19],[27,-35],[117,1],[13,-25],[-8,-124],[86,55],[-3,-46],[38,-21],[156,81]],[[5333,5238],[-46,-247],[93,29],[-20,-46],[32,-54],[-35,-117],[-35,-7],[25,-36],[-24,-30],[112,-83],[-39,-104],[-41,-16],[54,-77],[-63,-129],[16,-187],[-175,-35],[-48,75],[-72,-9],[-53,-112],[-144,25],[-21,-94],[-47,3],[-33,-75],[-87,-7],[-103,-94],[42,-71],[95,-69],[20,1],[48,68],[55,-15],[37,-35],[-31,-160],[21,-71],[-95,-90],[99,-215],[-34,-85],[3,-200],[11,-82],[42,-18],[21,-260],[76,-192],[-35,-106],[-8,-20],[0,-1]],[[4946,2190],[-389,133],[-160,-28],[-39,-7],[-35,12],[-145,97],[2,0],[19,-2],[-3,73],[-15,77],[-12,6],[11,59],[13,38],[19,28],[47,55],[60,53],[62,39],[1,33],[-18,39],[-15,47],[-44,216],[-26,16],[-28,-5],[-51,-29],[-37,23],[6,90],[50,201],[14,90],[12,41],[27,49],[61,59],[26,36],[6,52],[-16,33],[-32,35],[-35,27],[-23,10],[-33,-17],[-1,-32],[3,-34],[-19,-23],[-48,27],[-71,189],[-53,59],[-56,39],[-86,118],[-50,30],[-55,-8],[-165,-85],[-59,-1],[-46,27],[-45,39],[-53,33],[-108,17],[-113,-11],[-35,-16],[-21,-29],[-47,-98],[-11,-42],[-7,-15],[-12,-10],[-4,5],[-4,-3],[-10,-32],[-92,105],[-22,204],[-1,233],[-22,194],[-42,94],[-51,60],[-57,35],[-59,16],[-167,1],[-33,29],[26,56],[4,40],[-17,26],[-38,14],[-37,-4],[-26,-21],[-26,-32],[-35,-33],[-114,-51],[-63,-9],[-45,16],[-114,72],[-34,33],[-40,64],[-14,57],[-4,160],[-69,281],[-20,144],[36,84],[-30,119],[-20,46],[-35,14],[-37,6],[-20,30],[-32,95],[-36,79]],[[1664,6270],[31,14],[116,72],[107,-74],[110,20],[55,-96],[-3,-69],[64,-57],[15,-2],[25,-10],[11,39],[117,150],[117,106]],[[2429,6363],[95,-49],[103,38],[17,-157],[172,-4],[72,-62],[106,251],[74,51],[28,-68],[112,59],[43,-157],[1,0],[103,15],[35,-42],[146,39],[28,-86]],[[895,6021],[-11,47],[-52,206],[69,52],[17,6],[37,-41],[74,18],[11,46],[98,49],[-53,77],[2,22],[151,75],[41,-32],[22,-168],[2,-17]],[[1303,6361],[-136,-52],[-60,-45],[-47,-63],[-78,-165],[-34,-33],[-41,11],[-12,7]],[[8745,6276],[49,-76],[-60,-113],[-23,-12],[-63,39],[-93,-16],[-109,178],[-67,-22],[-39,48],[-7,12]],[[8333,6314],[28,52],[24,21],[26,-12],[53,-71],[26,-23],[225,7],[30,-12]],[[8138,6558],[-127,-156],[-225,-82],[5,-81],[-70,-75],[-41,-12],[-51,68],[-21,-89],[-58,-6],[-70,33],[-32,98],[-35,18],[-119,-49],[-52,-56],[-13,-57],[-82,55],[-84,-62],[-18,56],[-19,-47],[-155,24],[29,-82],[-33,-49],[-173,62]],[[6694,6069],[50,131],[-50,37],[35,101],[-21,92],[117,148],[-57,25],[18,168],[43,147],[51,-21],[12,16],[23,138],[-38,40],[-91,2],[-9,39],[-100,-58],[-43,58],[-43,-22],[-17,16],[-35,109],[105,113],[2,110],[108,60],[-16,118],[25,8],[14,-40],[65,33],[-70,110],[-58,32],[-72,-12],[0,-125],[-46,-35],[-54,40],[-52,-24],[-42,98],[-66,-22]],[[6382,7699],[75,127],[0,69],[208,50],[105,162],[130,8],[59,104],[84,-30],[65,70],[-9,202],[-105,120],[28,191],[31,31]],[[7053,8803],[81,25],[307,-16],[55,24],[108,93],[52,30],[56,-8],[61,-46],[48,-76],[18,-97],[9,-114],[15,-15],[44,-46],[147,-54],[35,-30],[25,-34],[28,-25],[45,1],[108,27],[33,-4],[43,-31],[54,-91],[35,-35],[79,24],[45,-4],[23,-63],[6,-24],[-36,-44],[-9,-57],[59,-77],[-24,-20],[-26,-12],[-28,-6],[-28,4],[6,-36],[4,-15],[7,-20],[-19,-69],[-14,-35],[-20,-33],[-30,32],[-21,-16],[-13,-49],[-6,-66],[35,-58],[-41,-122],[-103,-198],[58,19],[25,-1],[26,-18],[-30,-61],[-45,-117],[-34,-61],[-12,-12],[-30,-13],[-30,-15],[-187,-255],[5,-112],[43,-76],[43,-37]],[[5082,6497],[-212,-138],[-55,-16],[-57,13],[-71,59],[-69,177],[-47,-30],[-97,66],[31,76],[65,14],[17,84],[-27,57],[50,118],[95,58],[111,-22],[67,81],[45,-43],[40,-85],[-1,-48],[-40,-51],[-1,0],[105,-81],[41,-158],[-55,-9],[-22,-44],[86,-78],[1,0]],[[6694,6069],[-68,-14],[-40,23],[-43,68],[2,88],[-64,46]],[[6481,6280],[-97,95],[-128,-123],[-39,-8],[-33,34],[9,90],[-196,-25],[11,54],[-62,7],[-55,113],[-109,46],[-70,-30],[-22,-64],[-10,37],[-46,-31],[-135,43],[-11,-128],[47,-78],[-50,-72],[-87,-5],[-13,108],[-62,-81],[-113,-33],[-6,-62],[-83,58],[-12,26],[11,57],[-38,7],[-57,-22],[-94,-90],[-125,-24],[-15,-75],[-49,4],[-49,84],[-19,-27],[27,-50],[-56,-1],[-7,-76],[-18,-26],[-38,-16],[-72,30],[-51,-46],[-84,86],[-71,-2],[-56,95],[-25,13],[-26,-12],[-18,-55],[-64,1],[-20,-50]],[[3564,6191],[60,-27],[84,27],[4,27],[-54,90],[33,89],[32,22],[67,-65],[44,68],[37,-41],[44,21],[78,81],[38,140],[-23,74],[-67,15],[121,215],[3,52],[-38,41],[69,62],[-23,97],[119,-62],[60,52],[1,64],[-36,139],[39,100],[84,-35],[60,33],[60,240]],[[4460,7710],[89,28],[63,-14],[128,-70],[-18,-35],[17,-10],[81,66],[-25,-76],[49,-18],[13,-74],[157,46],[58,-72],[47,87],[88,-82],[47,54],[83,-59],[39,-1],[34,102],[190,61],[69,-46],[-29,-79],[101,138],[57,-15],[85,79],[45,-118],[33,-27],[135,68],[32,-19],[69,75],[101,49],[48,4],[36,-53]],[[6386,5737],[-9,-120],[127,-147],[66,-240],[-49,-45],[145,-10],[39,-117],[36,-8],[61,35],[-35,-41],[18,-79],[52,9],[-13,-44],[28,-59],[88,43],[56,-70],[48,-133],[-40,-98],[32,-64],[129,-43],[-3,-93],[36,-61],[142,118],[110,-46]],[[7450,4424],[23,-65],[-55,-90],[37,-59],[-141,-129],[20,-26],[33,57],[60,5],[26,-79],[-2,-76],[-72,-92],[-183,-146],[-27,44],[-29,-4],[-58,-48],[7,-59],[-75,6],[-48,-42],[100,-68],[-28,-50],[31,0],[-4,-51],[92,-133],[-24,-90],[-74,-29],[66,-77],[-13,-53],[-69,9],[-71,-62],[-55,-14],[-243,-21],[-55,24],[-15,140],[-39,-192],[23,-29],[-27,-84],[-85,-110],[-25,-10],[-24,30],[-18,-77],[-50,1],[64,-76],[33,-163],[28,-17],[110,27],[24,-67],[76,-49],[-10,-111],[56,-70],[-130,-64],[-66,-78],[43,-54],[-194,-174],[-12,-43],[23,-96],[-34,-12],[-12,-86],[-8,-33],[0,-1]],[[6350,1508],[-48,-3],[-113,-50],[-58,-11],[-68,12],[-23,38],[0,187],[-6,29],[-25,53],[-6,25],[5,30],[23,34],[9,26],[14,61],[13,42],[6,43],[-4,65],[-41,92],[-122,63],[-35,70],[11,80],[100,308],[2,54],[-4,41],[3,46],[49,133],[16,4],[28,-38],[6,88],[14,103],[3,88],[-24,39],[-81,-21],[-29,15],[-12,75],[-70,-40],[-277,-347],[-15,-40],[-7,-49],[6,-30],[10,-25],[3,-34],[-20,-160],[-18,-79],[-24,-57],[-28,-23],[-109,-22],[-361,-222],[-77,-17],[-20,6]],[[5333,5238],[-9,85],[44,42],[46,8],[94,-41],[58,16],[-30,155],[29,60],[25,0],[73,-62],[12,55],[67,23],[16,-101],[105,51],[29,-54],[-10,59],[13,15],[278,90],[3,31],[69,-8],[59,98],[82,-23]],[[9087,3276],[-23,14],[-16,36],[-9,48],[-16,23],[-40,-40],[-56,-7],[-22,-46],[-10,-69],[-21,-71],[-39,-50],[-96,-59],[-43,-48],[-9,-32],[-6,-81],[-6,-34],[-16,-29],[-38,-41],[-15,-31],[3,-57],[0,-47],[-7,-40],[-18,-25],[-53,-29],[-16,-26],[-3,-69],[18,-28],[11,-28],[-29,-68],[-21,-25],[-39,-12],[-18,-15],[-20,-33],[-10,-26],[-6,-26],[-11,-32],[-89,-193],[-11,-48],[31,-18],[57,-55],[24,-45],[-68,9],[0,-29],[-3,-15],[-5,-12],[-5,-18],[25,-29],[-31,-26],[-11,-48],[4,-59],[15,-63],[28,-57],[26,-16],[28,-6],[33,-25],[17,-32],[61,-151],[4,-23],[6,-70],[-1,-11],[16,-17],[37,-14],[15,-11],[15,-3],[16,7],[17,-2],[15,-29],[1,-12],[3,-27],[-10,-20],[-12,-18],[-5,-28],[-1,-32],[-8,-16],[-3,-18],[9,-37],[17,-17],[52,-7],[19,-20],[15,-71],[-15,-43],[-26,-30],[-20,-31],[-33,-115],[-21,-50],[-29,-35],[44,-30],[-25,-78],[-60,-80],[-61,-36],[-31,9],[-56,44],[-28,5],[-28,-19],[-34,-55],[-32,-18],[-56,12],[-56,35],[-58,17],[-65,-42],[-31,-53],[-6,-35],[-8,-21],[-39,-6],[-22,7],[-81,48],[-49,-27],[-65,-65],[-67,-49],[-57,19],[-16,44],[3,45],[8,47],[1,52],[-11,46],[-125,283],[-28,32],[-20,22],[-81,37],[-29,22],[-16,4],[-10,-14],[-11,-27],[-13,-26],[-19,-7],[-43,11],[-13,19],[-6,46],[8,71],[21,17],[12,18],[-18,75],[-50,77],[-54,67],[-57,-2],[-117,-41],[-60,22],[-47,44],[-38,47],[-111,200],[-31,37],[-92,33],[-52,37],[-97,119],[-47,32],[-6,0]],[[7450,4424],[87,100],[-52,114],[15,35],[35,2],[113,-109],[104,85],[23,-98],[44,-11],[-8,-45],[15,-16],[43,-8],[88,51],[141,-162],[86,7],[-13,-59],[131,-1],[-45,-124],[3,-55],[42,-88],[70,-21],[-70,-184],[156,30],[43,-17],[17,-48],[17,49],[164,28],[17,49],[-90,16],[58,175],[-48,50],[23,92],[314,-85],[5,-43],[83,-53],[-15,-465],[12,-55],[57,-14],[-36,-51],[10,-54],[3,-11],[-5,-154]],[[4611,8866],[-9,-8],[-17,-50],[56,-215],[-23,-17],[63,-110],[13,-63],[7,-36],[-12,-109],[-33,-78],[-103,-41],[-105,0],[-51,-12],[-47,-40],[-33,-47],[-8,-22],[3,-21],[3,-44],[8,-47],[15,-56],[8,-58],[-13,-50],[-6,-4],[32,-33],[28,-15],[51,51],[22,-31]],[[2429,6363],[162,146],[6,37],[-60,100],[34,51],[-161,169],[61,77],[-20,93],[-41,21],[-60,-45],[-21,69],[35,41],[-21,58],[62,-11],[18,22],[-40,48],[53,-1],[-125,76],[80,44],[-45,73],[68,124],[-77,162],[56,49],[-294,254],[114,90],[93,214],[-61,131],[-70,28],[63,54],[-45,130],[86,65],[-3,10]],[[2276,8742],[60,-33],[83,-12],[123,23],[7,47],[-6,64],[5,57],[28,36],[38,11],[42,3],[103,28],[64,5],[66,-13],[318,-128],[49,-39],[13,-65],[-4,-56],[4,-52],[39,-56],[32,-17],[307,5],[58,23],[118,112],[322,196],[129,122],[102,168],[15,50],[19,116],[1,21],[2,-1],[49,-56],[21,-49],[18,-91],[43,-64],[47,-49],[32,-49],[9,-32],[4,-30],[-7,-36],[-17,-35],[-1,0]],[[1664,6270],[-43,94],[-44,51],[-68,25],[-206,-79]],[[895,6021],[-207,116],[-48,49],[-14,31],[-35,101],[-15,33],[-96,113],[-17,37],[-9,34],[-13,29],[-34,22],[-24,3],[-49,-8],[-21,1],[-38,10],[-19,10],[-14,29],[-22,63],[-12,16],[-31,20],[-8,17],[2,23],[20,55],[3,33],[-51,219],[15,46],[60,73],[15,30],[-8,99],[-41,75],[-93,125],[-25,97],[-26,220],[-40,115],[52,46],[99,40],[352,323],[540,385],[522,416],[582,227],[1,0],[22,-192],[-10,-124],[-2,-117],[37,-125],[63,-84],[18,-10]],[[4611,8866],[-5,-10],[31,19],[21,28],[37,96],[-87,45],[-21,20],[-10,44],[2,109],[-8,52],[-19,40],[-38,56],[52,-2],[23,-1],[94,-62],[50,-20],[121,-10],[50,32],[13,86],[-16,49],[-58,84],[-21,45],[2,50],[17,39],[6,36],[-32,41],[136,96],[139,62],[77,15],[33,-7],[20,-42],[-3,-84],[-22,-62],[-5,-49],[49,-43],[35,-3],[75,16],[83,-25],[40,3],[35,16],[26,24],[201,297],[86,53],[37,-4],[47,-22],[44,-35],[27,-42],[5,-75],[-16,-72],[-11,-76],[18,-87],[-113,64],[-29,-5],[-15,-60],[55,-29],[182,-7],[48,-16],[100,-55],[56,18],[65,77],[60,98],[41,80],[18,62],[9,46],[15,31],[40,12],[7,-12],[78,-62],[51,-117],[-9,-83],[-29,-80],[-9,-109],[17,-48],[89,-119],[14,-44],[26,-110],[13,-33],[45,-30],[100,11],[48,-6],[45,-70],[2,-178],[45,-14],[17,5]],[[8745,6276],[28,-11],[188,-7],[53,12],[-5,-10],[-1,-9],[0,-9],[4,-9],[43,-28],[1,-48],[-9,-52],[10,-42],[34,-5],[103,35],[43,-5],[50,-61],[158,-296],[-34,-27],[30,-72],[53,-34],[179,-5],[6,-30],[-18,-45],[-29,-44],[0,-18],[-58,-42],[-82,-83],[-48,-92],[43,-67],[-20,-39],[3,-22],[21,-11],[31,-3],[-21,-43],[21,-24],[22,-57],[21,-20],[25,-2],[88,33],[6,7],[6,3],[6,-3],[6,-7],[40,-23],[112,-32],[47,-3],[-29,-35],[-6,-40],[7,-45],[15,-51],[22,-45],[18,-4],[10,-17],[-1,-84],[-19,-117],[-18,-67],[4,-59],[90,-193],[2,-32],[3,-38],[-32,-43],[-69,-15],[-35,7],[-30,15],[-29,3],[-35,-25],[-26,-39],[-17,-48],[-5,-50],[11,-45],[-47,-54],[-112,-38],[-54,-32],[-25,-48],[-59,-52],[-27,-43],[35,-48],[14,-56],[-1,-57],[-16,-47],[-19,-15],[-52,-6],[-22,-17],[-5,-16],[-9,-56],[-5,-25],[26,-26],[9,-31],[-7,-33],[-24,-35],[-39,22],[-6,39],[3,47],[-11,46],[-33,40],[-21,-3],[-16,-22],[-23,-17],[-59,-12],[-29,5],[-11,7]],[[6386,5737],[50,114],[-2,148],[41,36],[-64,112],[62,41],[8,92]],[[8138,6558],[15,-13],[56,-33],[41,-14],[-5,-59],[-27,-115],[47,-33],[29,-7],[27,7],[12,23]]],"transform":{"scale":[0.00038531105703666456,0.00020012149314931646],"translate":[2.521799927690466,49.495222881000075]}};
  Datamap.prototype.benTopo = '__BEN__';
  Datamap.prototype.bfaTopo = '__BFA__';
  Datamap.prototype.bgdTopo = '__BGD__';
  Datamap.prototype.bgrTopo = '__BGR__';
  Datamap.prototype.bhrTopo = '__BHR__';
  Datamap.prototype.bhsTopo = '__BHS__';
  Datamap.prototype.bihTopo = '__BIH__';
  Datamap.prototype.bjnTopo = '__BJN__';
  Datamap.prototype.blmTopo = '__BLM__';
  Datamap.prototype.blrTopo = '__BLR__';
  Datamap.prototype.blzTopo = '__BLZ__';
  Datamap.prototype.bmuTopo = '__BMU__';
  Datamap.prototype.bolTopo = '__BOL__';
  Datamap.prototype.braTopo = '__BRA__';
  Datamap.prototype.brbTopo = '__BRB__';
  Datamap.prototype.brnTopo = '__BRN__';
  Datamap.prototype.btnTopo = '__BTN__';
  Datamap.prototype.norTopo = '__NOR__';
  Datamap.prototype.bwaTopo = '__BWA__';
  Datamap.prototype.cafTopo = '__CAF__';
  Datamap.prototype.canTopo = '__CAN__';
  Datamap.prototype.cheTopo = '__CHE__';
  Datamap.prototype.chlTopo = '__CHL__';
  Datamap.prototype.chnTopo = '__CHN__';
  Datamap.prototype.civTopo = '__CIV__';
  Datamap.prototype.clpTopo = '__CLP__';
  Datamap.prototype.cmrTopo = '__CMR__';
  Datamap.prototype.codTopo = '__COD__';
  Datamap.prototype.cogTopo = '__COG__';
  Datamap.prototype.cokTopo = '__COK__';
  Datamap.prototype.colTopo = '__COL__';
  Datamap.prototype.comTopo = '__COM__';
  Datamap.prototype.cpvTopo = '__CPV__';
  Datamap.prototype.criTopo = '__CRI__';
  Datamap.prototype.csiTopo = '__CSI__';
  Datamap.prototype.cubTopo = '__CUB__';
  Datamap.prototype.cuwTopo = '__CUW__';
  Datamap.prototype.cymTopo = '__CYM__';
  Datamap.prototype.cynTopo = '__CYN__';
  Datamap.prototype.cypTopo = '__CYP__';
  Datamap.prototype.czeTopo = '__CZE__';
  Datamap.prototype.deuTopo = '__DEU__';
  Datamap.prototype.djiTopo = '__DJI__';
  Datamap.prototype.dmaTopo = '__DMA__';
  Datamap.prototype.dnkTopo = '__DNK__';
  Datamap.prototype.domTopo = '__DOM__';
  Datamap.prototype.dzaTopo = '__DZA__';
  Datamap.prototype.ecuTopo = '__ECU__';
  Datamap.prototype.egyTopo = '__EGY__';
  Datamap.prototype.eriTopo = '__ERI__';
  Datamap.prototype.esbTopo = '__ESB__';
  Datamap.prototype.espTopo = '__ESP__';
  Datamap.prototype.estTopo = '__EST__';
  Datamap.prototype.ethTopo = '__ETH__';
  Datamap.prototype.finTopo = '__FIN__';
  Datamap.prototype.fjiTopo = '__FJI__';
  Datamap.prototype.flkTopo = '__FLK__';
  Datamap.prototype.fraTopo = '__FRA__';
  Datamap.prototype.froTopo = '__FRO__';
  Datamap.prototype.fsmTopo = '__FSM__';
  Datamap.prototype.gabTopo = '__GAB__';
  Datamap.prototype.psxTopo = '__PSX__';
  Datamap.prototype.gbrTopo = '__GBR__';
  Datamap.prototype.geoTopo = '__GEO__';
  Datamap.prototype.ggyTopo = '__GGY__';
  Datamap.prototype.ghaTopo = '__GHA__';
  Datamap.prototype.gibTopo = '__GIB__';
  Datamap.prototype.ginTopo = '__GIN__';
  Datamap.prototype.gmbTopo = '__GMB__';
  Datamap.prototype.gnbTopo = '__GNB__';
  Datamap.prototype.gnqTopo = '__GNQ__';
  Datamap.prototype.grcTopo = '__GRC__';
  Datamap.prototype.grdTopo = '__GRD__';
  Datamap.prototype.grlTopo = '__GRL__';
  Datamap.prototype.gtmTopo = '__GTM__';
  Datamap.prototype.gumTopo = '__GUM__';
  Datamap.prototype.guyTopo = '__GUY__';
  Datamap.prototype.hkgTopo = '__HKG__';
  Datamap.prototype.hmdTopo = '__HMD__';
  Datamap.prototype.hndTopo = '__HND__';
  Datamap.prototype.hrvTopo = '__HRV__';
  Datamap.prototype.htiTopo = '__HTI__';
  Datamap.prototype.hunTopo = '__HUN__';
  Datamap.prototype.idnTopo = '__IDN__';
  Datamap.prototype.imnTopo = '__IMN__';
  Datamap.prototype.indTopo = '__IND__';
  Datamap.prototype.ioaTopo = '__IOA__';
  Datamap.prototype.iotTopo = '__IOT__';
  Datamap.prototype.irlTopo = '__IRL__';
  Datamap.prototype.irnTopo = '__IRN__';
  Datamap.prototype.irqTopo = '__IRQ__';
  Datamap.prototype.islTopo = '__ISL__';
  Datamap.prototype.isrTopo = '__ISR__';
  Datamap.prototype.itaTopo = '__ITA__';
  Datamap.prototype.jamTopo = '__JAM__';
  Datamap.prototype.jeyTopo = '__JEY__';
  Datamap.prototype.jorTopo = '__JOR__';
  Datamap.prototype.jpnTopo = '__JPN__';
  Datamap.prototype.kabTopo = '__KAB__';
  Datamap.prototype.kasTopo = '__KAS__';
  Datamap.prototype.kazTopo = '__KAZ__';
  Datamap.prototype.kenTopo = '__KEN__';
  Datamap.prototype.kgzTopo = '__KGZ__';
  Datamap.prototype.khmTopo = '__KHM__';
  Datamap.prototype.kirTopo = '__KIR__';
  Datamap.prototype.knaTopo = '__KNA__';
  Datamap.prototype.korTopo = '__KOR__';
  Datamap.prototype.kosTopo = '__KOS__';
  Datamap.prototype.kwtTopo = '__KWT__';
  Datamap.prototype.laoTopo = '__LAO__';
  Datamap.prototype.lbnTopo = '__LBN__';
  Datamap.prototype.lbrTopo = '__LBR__';
  Datamap.prototype.lbyTopo = '__LBY__';
  Datamap.prototype.lcaTopo = '__LCA__';
  Datamap.prototype.lieTopo = '__LIE__';
  Datamap.prototype.lkaTopo = '__LKA__';
  Datamap.prototype.lsoTopo = '__LSO__';
  Datamap.prototype.ltuTopo = '__LTU__';
  Datamap.prototype.luxTopo = '__LUX__';
  Datamap.prototype.lvaTopo = '__LVA__';
  Datamap.prototype.macTopo = '__MAC__';
  Datamap.prototype.mafTopo = '__MAF__';
  Datamap.prototype.marTopo = '__MAR__';
  Datamap.prototype.mcoTopo = '__MCO__';
  Datamap.prototype.mdaTopo = '__MDA__';
  Datamap.prototype.mdgTopo = '__MDG__';
  Datamap.prototype.mdvTopo = '__MDV__';
  Datamap.prototype.mexTopo = '__MEX__';
  Datamap.prototype.mhlTopo = '__MHL__';
  Datamap.prototype.mkdTopo = '__MKD__';
  Datamap.prototype.mliTopo = '__MLI__';
  Datamap.prototype.mltTopo = '__MLT__';
  Datamap.prototype.mmrTopo = '__MMR__';
  Datamap.prototype.mneTopo = '__MNE__';
  Datamap.prototype.mngTopo = '__MNG__';
  Datamap.prototype.mnpTopo = '__MNP__';
  Datamap.prototype.mozTopo = '__MOZ__';
  Datamap.prototype.mrtTopo = '__MRT__';
  Datamap.prototype.msrTopo = '__MSR__';
  Datamap.prototype.musTopo = '__MUS__';
  Datamap.prototype.mwiTopo = '__MWI__';
  Datamap.prototype.mysTopo = '__MYS__';
  Datamap.prototype.namTopo = '__NAM__';
  Datamap.prototype.nclTopo = '__NCL__';
  Datamap.prototype.nerTopo = '__NER__';
  Datamap.prototype.nfkTopo = '__NFK__';
  Datamap.prototype.ngaTopo = '__NGA__';
  Datamap.prototype.nicTopo = '__NIC__';
  Datamap.prototype.niuTopo = '__NIU__';
  Datamap.prototype.nldTopo = '__NLD__';
  Datamap.prototype.nplTopo = '__NPL__';
  Datamap.prototype.nruTopo = '__NRU__';
  Datamap.prototype.nulTopo = '__NUL__';
  Datamap.prototype.nzlTopo = '__NZL__';
  Datamap.prototype.omnTopo = '__OMN__';
  Datamap.prototype.pakTopo = '__PAK__';
  Datamap.prototype.panTopo = '__PAN__';
  Datamap.prototype.pcnTopo = '__PCN__';
  Datamap.prototype.perTopo = '__PER__';
  Datamap.prototype.pgaTopo = '__PGA__';
  Datamap.prototype.phlTopo = '__PHL__';
  Datamap.prototype.plwTopo = '__PLW__';
  Datamap.prototype.pngTopo = '__PNG__';
  Datamap.prototype.polTopo = '__POL__';
  Datamap.prototype.priTopo = '__PRI__';
  Datamap.prototype.prkTopo = '__PRK__';
  Datamap.prototype.prtTopo = '__PRT__';
  Datamap.prototype.pryTopo = '__PRY__';
  Datamap.prototype.pyfTopo = '__PYF__';
  Datamap.prototype.qatTopo = '__QAT__';
  Datamap.prototype.rouTopo = '__ROU__';
  Datamap.prototype.rusTopo = '__RUS__';
  Datamap.prototype.rwaTopo = '__RWA__';
  Datamap.prototype.sahTopo = '__SAH__';
  Datamap.prototype.sauTopo = '__SAU__';
  Datamap.prototype.scrTopo = '__SCR__';
  Datamap.prototype.sdnTopo = '__SDN__';
  Datamap.prototype.sdsTopo = '__SDS__';
  Datamap.prototype.senTopo = '__SEN__';
  Datamap.prototype.serTopo = '__SER__';
  Datamap.prototype.sgpTopo = '__SGP__';
  Datamap.prototype.sgsTopo = '__SGS__';
  Datamap.prototype.shnTopo = '__SHN__';
  Datamap.prototype.slbTopo = '__SLB__';
  Datamap.prototype.sleTopo = '__SLE__';
  Datamap.prototype.slvTopo = '__SLV__';
  Datamap.prototype.smrTopo = '__SMR__';
  Datamap.prototype.solTopo = '__SOL__';
  Datamap.prototype.somTopo = '__SOM__';
  Datamap.prototype.spmTopo = '__SPM__';
  Datamap.prototype.srbTopo = '__SRB__';
  Datamap.prototype.stpTopo = '__STP__';
  Datamap.prototype.surTopo = '__SUR__';
  Datamap.prototype.svkTopo = '__SVK__';
  Datamap.prototype.svnTopo = '__SVN__';
  Datamap.prototype.sweTopo = '__SWE__';
  Datamap.prototype.swzTopo = '__SWZ__';
  Datamap.prototype.sxmTopo = '__SXM__';
  Datamap.prototype.sycTopo = '__SYC__';
  Datamap.prototype.syrTopo = '__SYR__';
  Datamap.prototype.tcaTopo = '__TCA__';
  Datamap.prototype.tcdTopo = '__TCD__';
  Datamap.prototype.tgoTopo = '__TGO__';
  Datamap.prototype.thaTopo = '__THA__';
  Datamap.prototype.tjkTopo = '__TJK__';
  Datamap.prototype.tkmTopo = '__TKM__';
  Datamap.prototype.tlsTopo = '__TLS__';
  Datamap.prototype.tonTopo = '__TON__';
  Datamap.prototype.ttoTopo = '__TTO__';
  Datamap.prototype.tunTopo = '__TUN__';
  Datamap.prototype.turTopo = '__TUR__';
  Datamap.prototype.tuvTopo = '__TUV__';
  Datamap.prototype.twnTopo = '__TWN__';
  Datamap.prototype.tzaTopo = '__TZA__';
  Datamap.prototype.ugaTopo = '__UGA__';
  Datamap.prototype.ukrTopo = '__UKR__';
  Datamap.prototype.umiTopo = '__UMI__';
  Datamap.prototype.uryTopo = '__URY__';
  Datamap.prototype.usaTopo = '__USA__';
  Datamap.prototype.usgTopo = '__USG__';
  Datamap.prototype.uzbTopo = '__UZB__';
  Datamap.prototype.vatTopo = '__VAT__';
  Datamap.prototype.vctTopo = '__VCT__';
  Datamap.prototype.venTopo = '__VEN__';
  Datamap.prototype.vgbTopo = '__VGB__';
  Datamap.prototype.virTopo = '__VIR__';
  Datamap.prototype.vnmTopo = '__VNM__';
  Datamap.prototype.vutTopo = '__VUT__';
  Datamap.prototype.wlfTopo = '__WLF__';
  Datamap.prototype.wsbTopo = '__WSB__';
  Datamap.prototype.wsmTopo = '__WSM__';
  Datamap.prototype.yemTopo = '__YEM__';
  Datamap.prototype.zafTopo = '__ZAF__';
  Datamap.prototype.zmbTopo = '__ZMB__';
  Datamap.prototype.zweTopo = '__ZWE__';

  /**************************************
                Utilities
  ***************************************/

  //convert lat/lng coords to X / Y coords
  Datamap.prototype.latLngToXY = function(lat, lng) {
     return this.projection([lng, lat]);
  };

  //add <g> layer to root SVG
  Datamap.prototype.addLayer = function( className, id, first ) {
    var layer;
    if ( first ) {
      layer = this.svg.insert('g', ':first-child')
    }
    else {
      layer = this.svg.append('g')
    }
    return layer.attr('id', id || '')
      .attr('class', className || '');
  };

  Datamap.prototype.updateChoropleth = function(data) {
    var svg = this.svg;
    for ( var subunit in data ) {
      if ( data.hasOwnProperty(subunit) ) {
        var color;
        var subunitData = data[subunit]
        if ( ! subunit ) {
          continue;
        }
        else if ( typeof subunitData === "string" ) {
          color = subunitData;
        }
        else if ( typeof subunitData.color === "string" ) {
          color = subunitData.color;
        }
        else {
          color = this.options.fills[ subunitData.fillKey ];
        }
        //if it's an object, overriding the previous data
        if ( subunitData === Object(subunitData) ) {
          this.options.data[subunit] = defaults(subunitData, this.options.data[subunit] || {});
          var geo = this.svg.select('.' + subunit).attr('data-info', JSON.stringify(this.options.data[subunit]));
        }
        svg
          .selectAll('.' + subunit)
          .transition()
            .style('fill', color);
      }
    }
  };

  Datamap.prototype.updatePopup = function (element, d, options) {
    var self = this;
    element.on('mousemove', null);
    element.on('mousemove', function() {
      var position = d3.mouse(self.options.element);
      d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover')
        .style('top', ( (position[1] + 30)) + "px")
        .html(function() {
          var data = JSON.parse(element.attr('data-info'));
          try {
            return options.popupTemplate(d, data);
          } catch (e) {
            return "";
          }
        })
        .style('left', ( position[0]) + "px");
    });

    d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover').style('display', 'block');
  };

  Datamap.prototype.addPlugin = function( name, pluginFn ) {
    var self = this;
    if ( typeof Datamap.prototype[name] === "undefined" ) {
      Datamap.prototype[name] = function(data, options, callback, createNewLayer) {
        var layer;
        if ( typeof createNewLayer === "undefined" ) {
          createNewLayer = false;
        }

        if ( typeof options === 'function' ) {
          callback = options;
          options = undefined;
        }

        options = defaults(options || {}, self.options[name + 'Config']);

        //add a single layer, reuse the old layer
        if ( !createNewLayer && this.options[name + 'Layer'] ) {
          layer = this.options[name + 'Layer'];
          options = options || this.options[name + 'Options'];
        }
        else {
          layer = this.addLayer(name);
          this.options[name + 'Layer'] = layer;
          this.options[name + 'Options'] = options;
        }
        pluginFn.apply(this, [layer, data, options]);
        if ( callback ) {
          callback(layer);
        }
      };
    }
  };

  // expose library
  if (typeof exports === 'object') {
    d3 = require('d3');
    topojson = require('topojson');
    module.exports = Datamap;
  }
  else if ( typeof define === "function" && define.amd ) {
    define( "datamaps", ["require", "d3", "topojson"], function(require) {
      d3 = require('d3');
      topojson = require('topojson');

      return Datamap;
    });
  }
  else {
    window.Datamap = window.Datamaps = Datamap;
  }

  if ( window.jQuery ) {
    window.jQuery.fn.datamaps = function(options, callback) {
      options = options || {};
      options.element = this[0];
      var datamap = new Datamap(options);
      if ( typeof callback === "function" ) {
        callback(datamap, options);
      }
      return this;
    };
  }
})();
