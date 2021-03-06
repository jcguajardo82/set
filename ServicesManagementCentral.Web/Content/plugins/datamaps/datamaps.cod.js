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
  Datamap.prototype.belTopo = '__BEL__';
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
  Datamap.prototype.codTopo = {"type":"Topology","objects":{"cod":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"??quateur"},"id":"CD.EQ","arcs":[[0,1,2,3,4]]},{"type":"Polygon","properties":{"name":"Orientale"},"id":"CD.HC","arcs":[[5,6,7,-1,8]]},{"type":"Polygon","properties":{"name":"Bandundu"},"id":"CD.BN","arcs":[[9,10,11,12,13,-4]]},{"type":"Polygon","properties":{"name":"Kasa??-Occidental"},"id":"CD.KC","arcs":[[14,15,16,-10,-3]]},{"type":"MultiPolygon","properties":{"name":"Bas-Congo"},"id":"CD.BC","arcs":[[[17]],[[18,-12,19]]]},{"type":"Polygon","properties":{"name":"Kinshasa City"},"id":"CD.KN","arcs":[[-19,20,-13]]},{"type":"Polygon","properties":{"name":"Sud-Kivu"},"id":"CD.KV","arcs":[[21,22,23,24]]},{"type":"Polygon","properties":{"name":"Maniema"},"id":"CD.","arcs":[[25,-24,26,27,-7]]},{"type":"Polygon","properties":{"name":"Kasa??-Oriental"},"id":"CD.KR","arcs":[[-8,-28,28,-15,-2]]},{"type":"Polygon","properties":{"name":"Katanga"},"id":"CD.KT","arcs":[[-16,-29,-27,-23,29]]},{"type":"Polygon","properties":{"name":"Nord-Kivu"},"id":"CD.","arcs":[[30,-25,-26,-6]]}]}},"arcs":[[[5370,9347],[1,-1],[11,-7],[10,-5],[22,-5],[6,-2],[8,-5],[65,-53],[2,-2],[6,-2],[6,-2],[12,0],[5,0],[5,-3],[6,-35],[6,-8],[7,-6],[6,-3],[17,-7],[2,-3],[25,-6],[12,0],[35,12],[5,6],[10,-3],[18,-12],[17,13],[6,2],[18,1],[9,2],[7,4],[7,-5],[5,-2],[5,0],[6,0],[6,-2],[6,-7],[14,-5],[16,-12],[9,-3],[6,-1],[7,-2],[10,-2],[4,-3],[2,-2],[3,-1],[12,3],[10,6],[8,4],[10,-4],[2,0],[21,-6],[6,0],[6,0],[5,2],[4,-1],[1,-2],[-1,-9],[-4,-14],[-3,-9],[-3,-5],[-3,-5],[-5,-6],[-18,-15],[-6,-6],[-20,-27],[-6,-6],[-6,-4],[-7,-3],[-6,0],[-6,2],[-11,9],[-6,3],[-6,1],[-6,1],[-12,-1],[-7,1],[-6,2],[-6,4],[-6,6],[-7,4],[-6,2],[-6,-1],[-6,-3],[-12,-9],[-46,-50],[-6,-4],[-11,-5],[-5,-2],[-5,-1],[-6,0],[-9,1],[-21,4],[-6,-2],[-7,-4],[-7,-5],[-14,-8],[-7,-2],[-39,-10],[-51,-18],[-6,-3],[-5,-5],[-4,-5],[-5,-6],[-4,-7],[-3,-9],[0,-11],[2,-9],[6,-10],[7,-5],[6,-4],[6,-2],[27,-5],[12,-4],[6,-3],[6,-3],[5,-7],[4,-9],[2,-14],[0,-10],[-9,-62],[0,-13],[2,-9],[2,-8],[6,-10],[4,-5],[3,-2],[3,-2],[5,-1],[5,1],[4,1],[3,2],[3,2],[9,9],[42,53],[12,11],[11,8],[4,2],[5,3],[6,1],[6,1],[7,0],[5,-3],[6,-6],[3,-8],[1,-14],[-1,-10],[-2,-9],[-5,-17],[-15,-30],[-3,-6],[-1,-7],[-2,-19],[-2,-6],[-3,-7],[-10,-13],[-3,-6],[-2,-6],[0,-10],[5,-47],[-1,-10],[-12,-18],[-3,-7],[0,-8],[2,-8],[7,-13],[30,-38],[13,-13],[7,-5],[6,-4],[6,-3],[8,-3],[6,-1],[6,0],[7,0],[74,16],[9,1],[11,0],[5,-2],[4,-1],[6,-4],[5,-4],[5,-5],[2,-2],[4,-7],[10,-12],[7,-6],[13,-9],[49,-23],[39,-28],[5,-6],[4,-10],[3,-13],[5,-38],[-1,-10],[-4,-5],[-5,-2],[-6,1],[-6,1],[-6,2],[-32,14],[-12,4],[-82,14],[-6,-1],[-6,-2],[-56,-42],[-50,-30],[-13,-6],[-7,-1],[-6,1],[-7,2],[-6,5],[-33,35],[-2,2],[-3,1],[-3,1],[-1,-1],[-1,-2],[0,-3],[0,-5],[-1,-2],[-1,-1],[-3,-1],[-5,1],[-2,-1],[-1,0],[-1,-1],[-5,-3],[0,-2],[-1,-3],[1,-7],[0,-3],[-1,-3],[-5,-6],[-2,-1],[-2,-1],[-3,-1],[-2,1],[-3,0],[-3,1],[-2,-1],[-2,-1],[-1,-1],[0,-3],[0,-8],[0,-2],[-1,-1],[-1,-1],[-1,-1],[-6,0],[-2,-1],[-1,-2],[0,-2],[0,-3],[-1,-2],[-1,0],[-4,-1],[-2,0],[-1,-2],[-3,-4],[-1,-1],[-2,0],[-9,0],[-3,-1],[-2,-1],[-5,-2],[-6,-3],[-8,-2],[-5,-2],[-2,0],[-1,0],[-3,1],[-2,1],[-1,2],[-4,3],[-2,2],[-2,1],[-3,1],[-3,0],[-3,0],[-2,0],[-1,0],[-2,1],[-3,2],[-4,5],[-10,17],[-3,4],[-4,3],[-3,2],[-23,9],[-7,2],[-5,0],[-5,-4],[-1,-6],[1,-7],[3,-14],[0,-7],[-1,-6],[-33,-62],[-3,-11],[-13,-86],[-5,-14],[-3,-7],[-3,-7],[-5,-6],[-12,-12],[-13,-12],[-38,-24],[-12,-12],[-4,-6],[-4,-6],[-2,-6],[-2,-5],[0,-4],[2,-2],[0,-1],[1,0],[14,2],[2,0],[2,-1],[7,-2],[1,0],[1,0],[1,0],[1,1],[1,0],[3,2],[2,0],[2,0],[6,-4],[2,0],[2,0],[4,0],[2,0],[2,-1],[8,-2],[6,-1],[4,-1],[2,-2],[4,-3],[3,-2],[5,-3],[2,-1],[3,-1],[6,0],[3,0],[2,-2],[6,-5],[2,-1],[14,-7],[5,-3],[9,-12],[2,-2],[5,-3],[3,-2],[4,-4],[6,-8],[4,-3],[4,-1],[4,-4],[4,-6],[14,-33],[5,-7],[7,-19],[5,-6],[5,-5],[3,-3],[13,-24],[4,-11],[5,-11],[3,-10],[2,-3],[1,-2],[4,-3],[2,-3],[2,-7],[1,-5],[2,-5],[3,-5],[13,-18],[2,-4],[2,-8],[1,-5],[0,-4],[-3,-9],[0,-3],[0,-3],[4,-14],[-1,-3],[0,-3],[-1,-3],[1,-3],[7,-14],[3,-11],[9,-18],[2,-8],[-2,-17],[-2,-29],[1,-6],[3,-10],[7,-9],[14,-19],[8,-9],[2,-4],[7,-18],[4,-30],[4,-17],[14,-34],[13,-20],[39,-46],[6,-10],[21,-46],[10,-16],[55,-65],[78,-118],[6,-13],[1,-9],[-2,-9],[-6,-6],[-6,-3],[-6,-1],[-13,-3],[-6,-2],[-6,-5],[-5,-6],[-5,-5],[-6,-3],[-7,-1],[-7,1],[-7,2],[-33,13],[-12,3],[-6,1],[-7,-1],[-7,-2],[-6,-3],[-13,-9],[-57,-49],[-3,-3],[3,-2],[5,-1],[104,-7],[7,-2],[7,-4],[11,-19],[5,-7],[9,-4],[8,-1],[7,1],[73,27],[6,1],[8,-5],[10,-9],[50,-65],[22,-21],[3,-5],[-1,-6],[-4,-5],[-6,-4],[-7,-2],[-15,-3],[-26,-7],[-8,-4],[-64,-49],[-4,-7],[1,-8],[8,-12],[13,-15],[84,-71],[45,-20],[27,-17],[7,-6],[7,-7],[7,-11],[8,-23],[4,-6],[5,-5],[24,-10],[7,-4],[77,-64],[45,-25],[12,-5],[13,-3],[13,-1],[66,4],[7,-1],[6,-4],[7,-6],[18,-39],[13,-20],[3,-9],[10,-34],[17,-102]],[[6403,6197],[-178,21],[-22,-1],[-15,-3],[-7,-4],[-7,-2],[-30,-1],[-23,1],[-18,-1],[-12,-1],[-8,-3],[-5,-5],[-6,-5],[-3,-7],[-1,-7],[-1,-34],[-4,-7],[-8,-7],[-21,-11],[-9,-10],[-4,-9],[0,-19],[-1,-3],[-2,-4],[-5,-1],[-6,0],[-39,6],[-13,1],[-13,-1],[-147,-29],[-5,-3],[-7,-4],[-8,-2],[-7,2],[-5,5],[-20,34],[-5,7],[-10,12],[-7,5],[-6,5],[-7,3],[-8,2],[-10,2],[-16,1],[-10,-1],[-6,0],[-30,-13],[-3,-1],[-2,1],[-13,23],[-2,2],[-2,2],[-17,12],[-12,6],[-5,2],[-2,1],[-4,3],[-3,1],[-3,1],[-3,1],[-20,1],[-3,0],[-3,2],[-2,1],[-2,2],[-4,3],[-18,8],[-9,6],[-5,2],[-3,1],[-2,0],[-2,-1],[-6,-1],[-7,-2],[-2,0],[-2,2],[-3,1],[-4,0],[-9,-10],[-31,-52],[-6,-7],[-5,-5],[-9,-4],[-6,-2],[-10,0],[-79,5],[-24,4],[-52,16],[-4,-1],[-2,-1],[-1,-3],[-1,-2],[0,-3],[1,-6],[2,-7],[18,-43],[4,-21],[7,-55],[33,-119],[0,-8],[-2,-9],[-5,-8],[-13,-9],[-10,-2],[-8,2],[-6,4],[-5,5],[-3,6],[-3,7],[-1,8],[3,38],[-1,9],[-3,8],[-3,6],[-5,5],[-6,2],[-10,0],[-7,-3],[-7,-5],[-15,-22],[-5,-5],[-14,-12],[-12,-7],[-28,-14],[-6,-6],[-20,-28],[-3,-2],[-8,-6]],[[5080,5823],[-6,-3],[-30,-14],[-5,0],[-3,1],[-2,2],[-17,7],[-3,2],[-7,7],[-5,3],[-5,2],[-8,2],[-20,9],[-3,1],[-8,6],[-4,3],[-5,6],[-2,2],[-2,1],[-18,4],[-3,1],[-4,3],[-12,11],[-5,6],[-3,3],[-3,2],[-3,1],[-12,2],[-5,2],[-17,8],[-2,0],[-3,-1],[-2,-7],[-6,-54],[-7,-7],[-13,-5],[-49,-10],[-6,-3],[-12,-3],[-16,-1],[-40,0],[-92,12]],[[4612,5824],[-2,40],[-4,11],[-4,11],[-155,185],[-10,4],[-7,-1],[-4,-6],[-4,-5],[-6,-2],[-7,0],[-26,5],[-6,0],[-6,-1],[-6,-1],[-7,-3],[-21,-14],[-13,-6],[-7,-3],[-10,1],[-12,3],[-33,17],[-10,3],[-14,1],[-6,2],[-6,5],[-4,6],[-3,5],[-2,4],[-17,16],[-10,5],[-8,5],[-7,1],[-39,3],[-42,-4],[-10,0],[-33,5],[-9,2],[-6,5],[-6,6],[-4,7],[-25,62],[-7,22],[-6,10],[-10,10],[-23,17],[-13,3],[-10,0],[-7,-6],[-12,-12],[-26,-40],[-5,-6],[-5,-4],[-3,-1],[-4,-1],[-25,4],[-9,2],[-4,3],[-3,2],[0,3],[-1,14],[-2,14],[-12,52],[-6,14],[-30,50],[-16,21],[-9,14],[-22,53],[-2,8],[-15,25],[-42,45],[-20,29],[-15,27],[-32,45],[-2,3],[-2,6],[-7,42],[-1,26],[-2,7],[-6,17],[-4,9],[-7,9],[-11,13],[-8,4],[-7,-2],[-3,-6],[-3,-6],[-4,-15],[-2,-7],[-5,-6],[-5,-6],[-7,-6],[-20,-13],[-27,-11],[-6,-4],[-6,-5],[-4,-6],[-2,-6],[-2,-13],[0,-26],[1,-5],[1,-5],[3,-7],[3,-6],[5,-6],[23,-25],[4,-7],[3,-7],[-1,-7],[-3,-7],[-10,-11],[-4,-6],[-3,-6],[-4,-6],[-4,-5],[-6,-4],[-7,-3],[-7,-1],[-7,-1],[-43,2],[-14,-1],[-15,-4],[-21,-9],[-7,-2],[-14,-1],[-7,0],[-9,0],[-9,2],[-14,5],[-19,9],[-7,6],[-34,33],[-7,3],[-7,2],[-76,12],[-16,0],[-6,-2],[-4,-5],[-9,-21],[-8,-14],[-20,-25],[-28,-28],[-46,-34],[-21,-10],[-46,-9],[-19,-7],[-8,-4],[-29,-20],[-8,-3],[-8,-3],[-31,-7],[-17,-5],[-28,-13],[-176,-106],[-56,-43],[-17,-2],[-25,0],[-78,9],[-15,0],[-4,-4],[-1,-6],[0,-5],[3,-6],[4,-4],[6,-4],[18,-7],[5,-4],[5,-5],[3,-6],[2,-7],[1,-47],[0,-3],[-6,-1],[-128,0],[-9,2],[-6,4],[-15,27],[-16,23],[-15,16],[-2,2]],[[2262,6158],[42,56],[7,13],[3,16],[-1,18],[1,6],[3,9],[4,9],[10,16],[7,11],[12,25],[17,22],[20,40],[9,12],[8,20],[12,22],[5,15],[3,3],[3,4],[12,7],[25,20],[16,20],[21,18],[12,14],[1,4],[4,1],[5,4],[3,1],[17,3],[25,7],[35,15],[10,2],[27,4],[27,8],[6,3],[10,13],[2,2],[14,7],[4,4],[10,13],[14,13],[70,86],[30,36],[11,8],[7,8],[6,4],[2,2],[0,2],[1,8],[3,4],[3,4],[33,32],[7,10],[4,5],[-4,94],[-13,53],[-2,14],[2,13],[21,99],[10,19],[41,114],[45,64],[3,9],[3,51],[-1,9],[-3,10],[-5,9],[-8,4],[-10,26],[-3,13],[-1,15],[8,41],[0,14],[-15,68],[0,42],[-6,37],[3,12],[10,20],[12,13],[22,37],[3,11],[2,33],[19,59],[2,20],[3,10],[31,69],[1,11],[-4,152],[1,9],[6,18],[1,9],[0,8],[-3,25],[3,51],[-1,16],[-3,16],[0,8],[20,56],[4,6],[12,15],[3,6],[8,2],[6,8],[7,19],[6,10],[5,10],[3,10],[6,31],[4,9],[7,9],[30,28],[5,2],[2,4],[40,69],[13,36],[2,14],[2,8],[12,27],[10,13],[2,6],[2,11],[2,6],[8,13],[18,52],[7,10],[10,7],[19,10],[8,7],[4,9],[1,6],[5,12],[5,77],[-4,66],[-4,15],[-17,124],[10,66],[0,17],[-1,7],[1,12],[11,18],[4,12],[2,13],[1,33],[-8,45],[-6,21],[-19,35],[-3,10],[-3,6],[-15,12],[-4,9],[3,12],[8,14],[10,10],[10,-1],[10,-6],[10,-2],[11,1],[10,2],[25,8],[17,13],[12,17],[27,67],[13,18],[17,15],[6,15],[2,1],[2,2],[10,4],[2,2],[18,30],[10,8],[9,6],[7,8],[4,20],[4,5],[5,3],[4,5],[3,5],[4,17],[6,12],[8,10],[12,11],[5,5],[9,4],[24,-1],[9,2],[10,14],[7,14],[4,4],[25,12],[47,29],[11,16],[7,7],[12,3],[34,-1],[11,1],[17,8],[10,2],[19,-9],[60,-1],[5,-1],[11,-5],[15,-4],[24,-11],[8,-5],[6,-7],[4,-7],[9,-16],[3,-8],[5,-7],[13,-5],[46,-10],[15,-9],[12,-10],[17,-12],[34,-13],[10,-7],[24,-30],[10,-8],[10,-5],[24,-8],[11,-2],[9,-3],[8,-9],[10,-17],[12,-25],[4,-4],[9,-3],[10,-10],[9,-12],[3,-11],[-3,-8],[-5,-9],[-3,-10],[5,-11],[3,-3],[54,-51],[11,-7],[12,-3],[44,7],[42,0],[12,2],[8,4],[7,5],[7,4],[20,2],[48,-11],[51,-19],[8,-1],[5,-4],[10,-19],[5,-6],[13,-5],[6,-3],[5,-8],[3,-2],[11,-1],[5,-1],[4,-4],[4,-2],[7,0],[4,3],[4,4],[3,4],[3,4],[4,3],[4,2],[5,1],[7,1],[5,-2],[4,-4],[2,-3],[25,-17],[9,-3],[12,-4],[10,-1],[23,1],[7,-1],[5,-3],[3,-4],[4,-3],[6,-1],[10,0],[6,-2],[50,26],[9,1],[20,-2],[18,2],[7,-1],[11,-5],[3,-2],[1,-2],[3,-2],[6,-1],[15,1],[5,-1],[9,-4],[7,-7],[9,-5],[12,-2],[31,-2],[11,2],[5,2],[2,1],[2,1],[7,0],[4,-1],[14,-7],[11,-6],[27,-5],[10,-3],[3,-3],[9,-10],[6,-3],[12,-5],[12,-7],[50,-12],[63,3],[4,2],[11,5]],[[9318,7596],[-34,17],[-6,4],[-5,5],[-5,7],[-10,20],[-4,5],[-5,1],[-6,-1],[-24,-10],[-6,-4],[-17,-18],[-7,-6],[-9,-3],[-8,-1],[-14,2],[-19,-2],[-16,1],[-6,-1],[-6,-2],[-4,-8],[-2,-13],[-4,-6],[-8,-3],[-8,-1],[-7,1],[-6,1],[-37,17],[-7,2],[-7,0],[-6,-2],[-4,-5],[-9,-13],[-7,-13],[-2,-7],[-1,-7],[1,-6],[3,-6],[4,-6],[5,-5],[6,-4],[7,-3],[26,-8],[6,-4],[3,-5],[1,-6],[-6,-8],[-9,-7],[-15,-9],[-10,-3],[-9,1],[-7,2],[-20,13],[-7,4],[-6,2],[-7,-1],[-16,-4],[-5,0],[-3,0],[-2,1],[-11,10],[-7,4],[-7,3],[-6,1],[-9,1],[-11,-2],[-6,-2],[-16,-8],[-28,-18],[-11,-6],[-10,-3],[-22,1],[-22,4],[-59,4],[-42,-3],[-80,-20],[-7,-1],[-7,1],[-6,1],[-6,2],[-7,3],[-11,8],[-10,8],[-35,41],[-13,11],[-6,4],[-7,2],[-8,1],[-7,0],[-143,-21],[-28,-9],[-19,-8],[-6,-5],[-23,-24],[-6,-5],[-7,-4],[-7,-2],[-6,-2],[-27,-4],[-18,1],[-3,0],[-6,-2],[-2,-1],[-7,-1],[-2,-2],[-2,-4],[2,-7],[2,-4],[2,-2],[19,-7],[16,-9],[6,-5],[2,-2],[2,-1],[2,-2],[9,-2],[2,0],[5,-3],[3,0],[2,1],[4,3],[2,1],[2,-1],[2,-1],[2,-1],[2,1],[1,2],[2,0],[2,0],[2,-2],[3,-1],[5,-1],[8,-4],[2,-1],[3,0],[15,2],[3,0],[1,-1],[2,-3],[2,-2],[2,-1],[3,0],[2,-2],[1,-2],[1,-3],[1,-3],[0,-3],[2,-2],[7,-4],[1,-2],[1,-2],[-1,-3],[-2,-4],[-1,-4],[0,-6],[2,-2],[5,-4],[1,-2],[1,-3],[0,-4],[-1,-23],[0,-3],[5,-21],[3,-8],[2,-2],[1,-2],[2,-2],[2,-2],[3,-4],[3,-1],[2,-1],[9,-2],[2,-2],[1,-2],[1,-3],[-1,-10],[0,-3],[2,-2],[4,-3],[1,-2],[2,-2],[1,-2],[1,-4],[0,-4],[-3,-9],[-2,-4],[-4,-5],[-6,-3],[-2,-2],[-2,-3],[-3,-9],[0,-4],[0,-6],[-3,-11],[0,-4],[-2,-12],[0,-2],[2,-8],[2,-29],[2,-6],[3,-11],[1,-3],[1,-13],[1,-6],[5,-14],[0,-3],[-1,-11],[-3,-13],[-5,-12],[-5,-8],[-8,-8],[-29,-19],[-8,-4],[-21,-7],[-7,-5],[-9,-8],[-11,-16],[-12,-25],[-12,-19],[-29,-31],[-17,-13],[-28,-17]],[[8138,6844],[-9,1],[-24,7],[-39,17],[-6,1],[-10,1],[-22,-3],[-3,1],[-2,1],[-2,2],[-2,2],[-1,2],[-4,8],[-1,2],[-2,2],[-2,1],[-3,1],[-3,1],[-3,0],[-3,0],[-30,-10],[-13,-3],[-7,2],[-1,0],[-1,1],[-2,1],[-4,4],[-1,2],[-2,2],[-2,5],[-2,2],[-8,6],[-3,1],[-13,5],[-36,3],[-23,4],[-8,3],[-6,4],[-3,1],[-3,1],[-5,2],[-2,1],[-1,2],[-2,2],[-3,8],[-2,2],[-2,2],[-8,3],[-2,1],[-7,7],[-4,4],[-2,5],[-1,2],[0,3],[1,5],[-1,3],[-1,2],[-3,4],[-2,2],[-4,3],[-5,3],[-5,2],[-2,1],[-2,1],[-4,4],[-4,6],[-2,1],[-1,0],[-3,1],[-12,-1],[-3,1],[-5,1],[-9,5],[-5,3],[-7,8],[-3,1],[-3,0],[-6,-1],[-4,1],[-2,1],[-7,5],[-5,5],[-2,1],[-3,1],[-3,0],[-2,-2],[-3,-4],[0,-3],[0,-3],[3,-5],[1,-2],[0,-3],[0,-3],[-2,-2],[-3,-2],[-5,-1],[-4,0],[-3,0],[-4,3],[-3,0],[-3,0],[-6,-3],[-35,-21],[-6,-3],[-23,-1],[-3,-1],[-3,-1],[-3,-2],[-3,-3],[-5,-5],[-5,-5],[-6,-4],[-12,-7],[-6,-3],[-5,-1],[-6,1],[-19,-1],[-9,-2],[-7,-1],[-3,0],[-3,0],[-3,1],[-2,2],[-2,1],[-2,2],[-7,11],[-2,2],[-1,3],[-3,11],[0,3],[-2,2],[-2,2],[-3,1],[-9,1],[-2,1],[-3,2],[-13,12],[-3,7],[-2,2],[-3,0],[-4,0],[-2,1],[-2,2],[-8,22],[-1,2],[-1,2],[-2,2],[-2,1],[-3,1],[-8,0],[-2,1],[-2,2],[-2,6],[-1,2],[-2,2],[-2,2],[-4,2],[-11,11],[-2,1],[-6,1],[-5,3],[-2,1],[-2,2],[-1,3],[-1,2],[-2,2],[-5,1],[-2,2],[-2,2],[-2,1],[-2,1],[-3,0],[-2,0],[-6,-4],[-5,-7],[-13,-22],[0,-11],[2,-8],[26,-19],[26,-24],[23,-25],[56,-39],[11,-12],[4,-6],[3,-7],[1,-6],[0,-7],[-4,-9],[-7,-9],[-46,-41],[-6,-7],[-4,-6],[-3,-7],[-2,-6],[-1,-7],[15,-107],[0,-8],[0,-7],[-2,-7],[-7,-8],[-13,-9],[-41,-22],[-8,-8],[-2,-6],[-3,-10],[-4,-45],[2,-6],[2,-6],[4,-5],[2,-6],[-2,-7],[-6,-10],[-2,-7],[-1,-6],[1,-17],[0,-2],[-2,-3],[-3,-1],[-2,-2],[-1,-3],[0,-2],[1,-3],[1,-3],[-2,-3],[-5,-4],[-11,-4],[-8,-5],[-3,-3],[-2,-4],[1,-3],[0,-3],[3,-5],[0,-2],[0,-3],[-3,-11],[0,-9],[-2,-4],[-5,-5],[-11,-7],[-4,-5],[-2,-3],[5,-10],[1,-3],[0,-3],[-2,-3],[-5,-7],[-1,-2],[-1,-6],[-1,-3],[-2,-3],[-3,-3],[-1,-1],[-3,-1],[-4,0],[-7,0],[-4,0],[-7,2],[-3,1],[-3,0],[-3,0],[-2,1],[-1,2],[-1,3],[1,2],[-1,2],[-2,2],[-7,3],[-2,1],[-4,4],[-1,2],[-2,2],[-3,8],[-2,2],[-9,9],[-5,5],[-1,1],[0,-3],[-2,-19],[0,-68],[4,-23],[0,-12],[-3,-12],[-7,-22],[-1,-12],[1,-34],[-1,-11],[-4,-10],[-11,-16],[-3,-4],[-6,-2],[-16,-1],[-28,-7],[-11,0],[-14,3],[-24,10],[-10,1],[-9,0],[-13,-3],[-9,-5],[-9,-5],[-16,-13],[-85,-94],[-6,-5],[-6,-4],[-12,-4],[-13,-4],[-15,-2],[-23,0],[-26,2],[-14,3],[-7,2],[-2,1],[-2,-1],[-5,2],[-10,5],[-4,4],[-1,7],[2,5],[7,11],[2,6],[-1,11],[-1,5],[-2,4],[-13,10],[-14,8],[-2,2],[1,3],[-5,2],[-10,1],[-51,-6],[-27,-5],[-202,9]],[[6418,6116],[-9,64],[-6,17]],[[5370,9347],[3,1],[18,13],[10,9],[4,9],[2,2],[9,9],[3,5],[0,4],[-3,12],[0,6],[15,28],[4,5],[6,2],[6,4],[5,6],[3,6],[-2,4],[-9,10],[-2,11],[-1,14],[3,13],[9,6],[23,-1],[11,1],[7,4],[3,5],[1,6],[0,12],[2,3],[7,6],[2,2],[1,4],[5,9],[1,4],[0,5],[-4,10],[0,7],[8,4],[6,6],[4,7],[4,8],[6,18],[5,8],[9,3],[8,-3],[10,-6],[9,-2],[6,15],[11,9],[5,5],[-5,6],[-2,6],[0,7],[3,7],[5,5],[4,0],[5,-1],[7,0],[7,2],[6,3],[6,2],[6,0],[5,-4],[5,-15],[6,-11],[2,-8],[3,-7],[7,-3],[7,-1],[6,-2],[6,-4],[6,-5],[11,-5],[13,2],[24,12],[8,-7],[13,-19],[6,-3],[2,-2],[14,-9],[7,-15],[4,-2],[12,-2],[2,-1],[2,-2],[5,-6],[2,-1],[10,-1],[10,-2],[9,-3],[9,-5],[4,2],[10,0],[4,1],[2,4],[1,4],[0,5],[1,6],[3,9],[6,7],[9,4],[12,1],[10,4],[31,25],[12,6],[24,5],[20,12],[11,3],[23,3],[12,5],[20,14],[9,4],[7,-1],[10,-3],[4,0],[5,1],[5,5],[4,1],[22,-5],[13,0],[-1,7],[-2,5],[0,6],[2,5],[2,4],[3,1],[3,-1],[8,-8],[9,6],[27,13],[14,11],[9,5],[9,2],[6,-2],[11,-7],[7,-2],[5,3],[15,19],[10,7],[10,2],[9,-4],[3,-12],[4,0],[4,3],[1,4],[0,5],[2,6],[6,15],[1,1],[5,4],[38,5],[9,6],[7,7],[-1,6],[-13,3],[-6,5],[3,12],[8,12],[7,8],[3,-6],[5,-16],[3,-4],[7,-3],[2,4],[0,7],[2,6],[12,4],[11,-3],[3,-1],[14,-7],[10,-7],[3,-4],[5,-11],[3,-3],[5,-3],[13,-2],[7,-2],[5,-5],[-1,-11],[3,-6],[7,-4],[15,-6],[7,-5],[-7,-9],[-1,-6],[5,-2],[35,-4],[10,1],[8,6],[7,-6],[6,0],[5,5],[6,6],[4,2],[5,-1],[4,-2],[6,-1],[11,4],[19,12],[12,3],[2,1],[10,7],[4,2],[6,0],[19,-5],[18,-10],[19,-6],[4,1],[3,11],[6,11],[2,2],[5,2],[4,3],[4,6],[5,-1],[4,-2],[4,-2],[5,-2],[33,2],[6,3],[5,5],[23,2],[8,2],[5,5],[2,6],[1,13],[1,6],[8,9],[1,3],[1,5],[3,11],[0,4],[-4,3],[-10,2],[-4,2],[-4,12],[5,9],[6,7],[4,7],[1,12],[3,11],[7,8],[10,3],[-6,10],[3,3],[8,2],[5,7],[10,-5],[11,2],[24,13],[1,2],[1,-1],[6,-5],[4,-2],[13,6],[7,1],[-5,9],[6,2],[10,-1],[6,1],[4,0],[4,-7],[2,-7],[4,-4],[12,0],[-2,-2],[-1,-2],[-2,-2],[-3,-2],[0,-3],[8,-6],[4,1],[3,4],[7,1],[3,-2],[4,-4],[2,-1],[1,-1],[11,-3],[8,-5],[14,-17],[6,-4],[7,-3],[8,0],[5,7],[-7,4],[5,2],[7,-4],[2,-13],[2,1],[6,2],[2,1],[-2,-8],[2,-5],[2,-3],[4,-11],[5,3],[6,6],[1,3],[12,0],[6,-7],[5,-10],[10,-8],[0,11],[7,6],[10,1],[8,-3],[-1,9],[3,5],[5,2],[7,-2],[6,-3],[9,-10],[6,-5],[6,4],[7,1],[6,0],[3,0],[1,6],[4,3],[4,-1],[5,-2],[-2,4],[-1,14],[2,-2],[3,-1],[3,-1],[4,0],[4,2],[3,4],[2,5],[8,-4],[3,-6],[4,-4],[7,3],[2,-2],[4,-2],[1,-3],[6,5],[1,2],[5,-16],[3,-5],[7,3],[0,-3],[0,-8],[2,1],[6,2],[3,1],[3,-10],[10,-7],[10,-4],[14,-2],[10,1],[9,-1],[4,-6],[4,2],[11,5],[5,-8],[8,-6],[7,-5],[7,-5],[10,-20],[1,-4],[6,-1],[15,-5],[9,-1],[4,1],[7,3],[7,4],[4,3],[3,-4],[6,8],[10,4],[9,-2],[4,-6],[3,0],[4,6],[4,0],[7,-2],[5,2],[7,6],[6,3],[25,0],[7,-1],[4,-2],[22,-24],[3,-2],[4,0],[5,6],[4,1],[3,-1],[3,-3],[2,-2],[1,-1],[9,-1],[3,2],[6,6],[3,5],[5,12],[2,5],[16,17],[15,13],[15,11],[19,10],[24,7],[23,-2],[21,-8],[43,-21],[12,-4],[12,-1],[9,-2],[7,-5],[7,-6],[7,-6],[5,-2],[5,-1],[10,0],[6,-1],[7,-5],[5,-1],[14,-6],[1,-7],[-4,-23],[3,-3],[3,-2],[4,-2],[4,-2],[16,-13],[4,-5],[2,-5],[3,-11],[2,-5],[10,-8],[10,-4],[47,-5],[9,-6],[7,-13],[4,-22],[3,-9],[7,-5],[4,0],[10,3],[5,0],[5,-3],[4,-5],[4,-6],[2,-5],[2,-12],[-5,-31],[2,-21],[2,-13],[4,-9],[2,0],[13,-3],[4,-1],[5,-4],[10,-11],[6,-3],[4,-1],[15,2],[3,0],[9,-4],[3,0],[1,3],[0,2],[1,2],[-1,0],[2,2],[5,2],[3,0],[5,-6],[3,-1],[6,1],[27,-4],[2,-6],[-3,-9],[-1,-12],[0,-6],[1,-4],[1,-4],[3,-5],[16,-24],[5,1],[9,9],[5,3],[8,0],[4,-5],[2,-10],[14,-19],[10,-10],[10,-7],[21,-3],[23,5],[22,1],[18,-13],[4,-11],[2,-8],[4,-5],[13,-4],[12,1],[11,7],[10,10],[20,26],[7,6],[12,3],[5,-1],[5,-1],[5,0],[5,1],[4,5],[1,6],[2,6],[6,4],[22,5],[8,5],[8,11],[21,43],[5,0],[11,0],[7,4],[5,4],[4,3],[7,-2],[8,-11],[1,-11],[2,-11],[13,-5],[6,0],[16,2],[25,-2],[11,1],[32,8],[4,-4],[25,-17],[6,-3],[2,-7],[1,0],[21,-9],[6,-4],[33,-34],[12,-6],[13,2],[4,8],[2,10],[6,7],[13,0],[10,-2],[9,1],[7,13],[6,13],[5,8],[27,23],[6,10],[5,10],[3,13],[4,5],[9,10],[1,5],[0,6],[2,9],[1,19],[4,6],[8,2],[11,-2],[2,-2],[6,-5],[2,-2],[9,4],[3,1],[6,-2],[16,-7],[15,0],[7,-2],[21,-10],[7,-4],[15,-14],[7,-4],[4,-1],[12,3],[3,-2],[12,-7],[6,-2],[6,-4],[-2,-6],[-2,-3],[-3,-3],[-3,-5],[0,-5],[4,-8],[1,-5],[-1,-6],[-4,-16],[-1,-23],[6,-19],[15,-12],[24,0],[11,-2],[14,-7],[11,-11],[5,-11],[-1,-5],[-4,-6],[-4,-5],[1,-7],[4,-5],[6,-1],[6,0],[6,-1],[12,-8],[8,-9],[12,-24],[8,-11],[8,-5],[22,-5],[12,-7],[5,-10],[3,-12],[5,-13],[13,-15],[3,-6],[1,-5],[0,-6],[1,-5],[4,-5],[9,-3],[34,-1],[35,-11],[42,-26],[20,-6],[5,-1],[10,-1],[5,1],[6,2],[5,0],[5,-1],[7,-14],[13,-78],[-1,-11],[-3,-20],[-3,-7],[-3,-3],[-1,-3],[6,-4],[4,-2],[6,0],[10,1],[7,2],[16,9],[9,4],[7,1],[14,-1],[11,7],[9,10],[8,6],[10,-7],[2,-5],[2,-18],[3,-8],[7,-5],[16,-7],[8,-9],[-5,-28],[6,-11],[11,4],[10,9],[9,3],[6,-13],[1,-4],[-4,-15],[1,-6],[5,-12],[1,-6],[-3,-11],[-3,-4],[-4,-6],[-15,-17],[-10,-18],[-1,-2],[-1,-6],[-2,-3],[-2,-1],[-6,-1],[-2,-2],[-10,-18],[-21,-66],[-8,-24],[-2,-12],[0,-10],[7,-8],[24,-17],[9,-8],[12,-22],[6,-21],[-1,-21],[-13,-36],[-3,-5],[-3,-1],[-6,-1],[-2,-2],[-1,-3],[0,-5],[-1,-3],[-14,-38],[-4,-9],[-1,-7],[0,-2],[-1,-4],[-11,-17],[-2,-5],[-1,-10],[2,-20],[0,-9],[-4,-9],[-7,-10],[-4,-12],[1,-9],[8,-2],[36,0],[6,-3],[1,-7],[0,-8],[1,-8],[5,-8],[9,-11],[10,-9],[9,-4],[15,8],[7,17],[9,14],[19,0],[9,-5],[30,-34],[1,-2],[1,-4],[-1,-3],[-3,-2],[-1,-2],[2,-5],[8,-4],[23,-4],[7,0],[9,1],[25,10],[1,-23],[2,-11],[4,-9],[11,-9],[29,-17],[6,-9],[1,-2],[0,-1],[-5,-25],[-15,-28],[-31,-40],[-34,-43],[-12,-15],[-10,-14],[-26,-33],[-38,-30],[-72,-59],[-71,-58],[-44,-58],[-23,-30],[-40,-51],[-10,-9],[-7,-5],[-7,-3],[-10,-3],[-7,0],[-12,1],[-6,-1],[-9,-7],[-6,-10],[-7,-7],[-9,4],[-5,5],[-5,1],[-5,-2],[-4,-2],[-16,-17],[-2,-3],[-1,-11],[-1,-6],[-2,-5],[-6,-6],[0,-10],[2,-22],[-3,-10],[-12,-12],[-2,-9],[-2,-2],[-10,-18],[-5,-6],[-5,-3],[-56,-13],[-22,-10],[-8,-6]],[[4612,5824],[-20,-39],[-3,-9],[-1,-8],[-1,-12],[1,-21],[-2,-8],[-2,-8],[-7,-13],[-7,-9],[-25,-26],[-20,-27],[-92,-240],[-5,-25],[-7,-96],[11,-126],[-1,-64],[4,-30],[5,-91],[-2,-9],[-2,-11],[-5,-8],[-2,-2],[-7,-2],[-3,-5],[-2,-5],[-4,-6],[-15,-13],[-20,-11],[-23,-8],[-21,-4],[-8,-1],[-7,-3],[0,-2],[0,-3],[-1,-4],[-2,-2],[-4,-1],[-3,2],[-3,2],[-3,1],[-12,-3],[-9,-8],[-6,-10],[-3,-12],[-2,-17],[-2,-5],[-5,-7],[-3,-1],[-4,3],[-7,1],[-12,-1],[-7,-3],[-7,0],[-8,8],[-10,16],[-6,7],[-10,6],[-9,-4],[-10,7],[-17,19],[-13,3],[-27,-1],[-6,0],[-4,-5],[-1,-2],[0,-4],[0,-4],[2,-22],[2,-4],[1,-4],[7,-7],[2,-2],[1,-2],[6,-13],[5,-9],[1,-3],[1,-3],[0,-12],[1,-4],[1,-3],[1,-2],[2,-2],[5,-3],[2,-2],[1,-2],[2,-2],[0,-2],[0,-1],[0,-2],[-8,-15],[-1,-2],[-1,0],[-6,-4],[-2,-1],[-1,-1],[-1,-2],[-8,-21],[0,-4],[-1,-6],[1,-11],[0,-19],[-2,-5],[-1,-3],[-2,-2],[0,-2],[-1,-21],[1,-20],[1,-4],[2,-2],[1,-3],[5,-5],[3,-5],[2,-5],[4,-15],[1,-2],[2,-5],[1,-3],[6,-38],[2,-5],[2,-5],[1,-3],[15,-18],[1,-2],[0,-4],[-2,-5],[-1,-4],[-1,-5],[2,-6],[1,-4],[2,-3],[6,-5],[1,-3],[2,-2],[2,-9],[2,-5],[1,-2],[1,-7],[6,-18],[0,-4],[3,-61],[-1,-2],[-2,-3],[-3,-1],[-3,-2],[0,-1],[-1,-1],[-4,-14],[-2,-4],[-2,-3],[-3,-4],[-1,-3],[-1,-2],[-1,-3],[-1,-7],[1,-100],[1,-3],[1,-3],[2,-5],[1,-2],[3,-5],[2,-8],[3,-5],[1,-3],[1,-2],[0,-3],[0,-3],[1,-11],[0,-10],[-1,-6],[-3,-5],[-2,-3],[-1,-16],[-1,-5],[-3,-8],[-3,-7],[-2,-2],[-6,-6],[-6,-4],[-3,-3],[-1,-1],[-1,-4],[-4,-19],[-1,-1],[-3,-3],[-9,-5],[-2,-2],[-12,-2],[-2,-1],[-1,-1],[-3,-3],[-1,-3],[-3,-7],[-1,-4],[-3,-3],[0,-2],[-5,-15],[-1,-2],[-1,-1],[-5,-5],[-2,-2],[0,-1],[-1,-1],[-1,-1],[-1,-1],[-2,-2],[-5,-3],[-3,-2],[-3,-3],[-4,-3],[-3,-1],[-2,0],[-9,1],[-3,0],[-3,-1],[-2,-1],[-1,-1],[-4,-6],[-2,-1],[-2,-1],[-2,0],[-5,2],[-3,1],[-1,0],[-1,-1],[-1,-1],[-4,-7],[-1,-2],[-2,-2],[-3,-1],[-9,-1],[-3,-1],[-2,-2],[-7,-11],[-7,-7],[-2,-1],[-6,-2],[-2,-1],[-2,-2],[-3,-4],[-2,-2],[-5,-2],[-7,-4],[-5,-2],[-3,-2],[-1,-2],[-1,-2],[-2,-2],[-9,-9],[-6,-5],[-2,-2],[-1,-2],[-2,-9],[-2,-6],[0,-3],[0,-4],[20,-187],[10,-22],[30,-50],[59,-72],[8,-14],[4,-9],[6,-22],[6,-50],[0,-1]],[[4065,3428],[-6,0],[-22,0],[-22,0],[-22,0],[-22,0],[-22,0],[-22,0],[-22,0],[-22,0],[-22,0],[-27,0],[9,-21],[1,-6],[-3,-8],[-14,-19],[-6,-10],[-6,-17],[-5,-86],[1,-17],[4,-18],[14,-35],[0,-17],[-15,-12],[-1,0],[0,-1],[-7,-9],[-6,-21],[-7,-8],[-10,-2],[-37,3],[-1,-14],[5,-14],[6,-14],[4,-14],[0,-13],[-2,-14],[-10,-32],[-5,-16],[-8,-25],[-2,-16],[2,-14],[11,-41],[-14,0],[-67,0],[-67,0],[-67,0],[-66,0],[-24,0],[-8,12],[-3,7],[-3,15],[-4,3],[-38,0],[-41,0],[-38,0],[-6,-5],[-1,-10],[3,-20],[-11,0],[-3,0],[-32,0],[-9,-1],[-11,-7],[-8,-2],[-7,0],[-20,8],[-25,1],[-39,2],[-9,-2],[-21,-10],[-8,-2],[-10,-6],[-5,-12],[0,-15],[3,-13],[-47,-1],[-14,3],[-27,23],[-15,7],[-18,2],[-8,-1],[-33,-19],[-6,0],[-18,6],[-16,2],[-44,-16],[-15,0],[-29,7],[-4,5],[-1,0],[-4,8],[6,15],[-1,9],[-5,4],[-11,6],[-6,5],[-2,5],[-5,17],[-3,-3],[-3,-3],[-1,-2],[-2,4],[-1,2],[0,1],[3,4],[-11,6],[-5,3],[-2,4],[3,7],[5,5],[1,5],[-6,6],[-7,-2],[-2,4],[0,7],[-1,6],[-5,1],[-7,0],[-4,1],[5,5],[0,4],[-10,0],[-3,5],[1,6],[-1,5],[-5,3],[-12,2],[-3,2],[-2,5],[-9,9],[-3,7],[2,4],[3,5],[0,5],[-8,4],[2,2],[-1,1],[-1,4],[-8,-4],[-1,9],[0,12],[-2,9],[1,10],[-10,8],[-26,13],[-7,11],[-9,26],[-7,12],[-5,4],[-4,3],[-4,4],[-1,5],[3,6],[6,3],[6,2],[3,4],[-2,3],[-5,3],[-11,3],[-4,2],[-3,2],[-4,-1],[-4,-7],[-7,5],[-3,7],[0,13],[0,6],[-3,8],[-5,5],[-14,7],[-18,12],[-14,5],[-2,6],[0,8],[-1,9],[-9,12],[-6,7],[-6,3],[-2,4],[1,29],[-11,34],[1,14],[17,-5],[1,12],[3,9],[2,8],[-4,9],[-3,4],[-2,5],[-3,3],[-6,1],[-5,2],[0,5],[2,5],[1,3],[-4,30],[-6,13],[-13,9],[-6,1],[-13,2],[-5,2],[-6,5],[-3,7],[0,8],[-2,8],[-29,41],[-4,8],[-3,10],[-1,19],[-3,10],[-7,18],[-2,8],[2,9],[7,12],[0,5],[-5,6],[-5,5],[-4,5],[0,6],[4,7],[-12,1],[0,5],[5,7],[3,7],[-1,7],[-3,1],[-3,-1],[-4,2],[-3,5],[-1,2],[1,21],[2,5],[4,2],[5,0],[3,2],[1,5],[-1,5],[-2,5],[-1,5],[0,39],[1,9],[4,6],[1,7],[-5,8],[-9,11],[-2,7],[-6,3],[-7,3],[-6,3],[-9,12],[-6,5],[-11,1],[11,13],[-2,5],[-4,0],[-5,-3],[-3,0],[-2,6],[-2,33],[-1,5],[-3,6],[-5,6],[0,4],[7,8],[2,5],[-19,9],[-4,3],[-20,8],[-9,2],[-10,0],[-10,-1],[-17,-5],[-8,-1],[-8,1],[-12,6],[-8,7],[-9,5],[-14,3],[-30,-1],[-48,0],[-34,-1]],[[2040,4035],[7,13],[31,22],[5,5],[4,6],[17,38],[2,12],[1,16],[0,70],[-4,42],[3,29],[14,66],[2,19],[-4,63],[3,19],[12,36]],[[2133,4491],[-3,61],[-6,28],[-1,13],[1,7],[2,6],[4,6],[25,31],[53,96],[5,6],[5,5],[6,2],[17,0],[3,1],[1,2],[1,3],[1,5],[5,6],[2,4],[1,9],[4,12],[6,11],[6,6],[0,3],[-2,6],[3,7],[2,9],[-7,14],[1,6],[2,6],[1,5],[-1,7],[-9,15],[-5,3],[-9,8],[-12,9],[-7,7],[-6,7],[-23,39],[-8,7],[-66,35],[-25,17],[-8,4],[-13,4],[-14,2],[-40,3],[-44,-6],[-18,5],[-33,19],[-2,1]],[[1928,5053],[13,12],[9,32],[3,5],[4,4],[8,14],[8,15],[9,25],[8,8],[4,12],[21,43],[33,41],[11,23],[11,28],[26,45],[7,16],[2,10],[1,13],[-3,5],[-6,5],[-6,6],[-3,11],[4,23],[-1,12],[-4,10],[-3,9],[2,29],[-2,30],[2,26],[-3,19],[-3,31],[0,7],[2,8],[12,38],[11,78],[-17,128],[-1,25],[-1,5],[-1,3],[-5,7],[-1,8],[1,9],[7,24],[0,3],[-1,4],[-1,13],[4,12],[6,11],[13,17],[13,12],[15,10],[29,28],[23,17],[33,33],[8,10],[4,5],[3,1],[8,4],[9,7],[3,1],[2,7],[3,7],[1,1]],[[5080,5823],[28,-24],[9,-16],[5,-33],[3,-14],[5,-14],[3,-6],[5,-6],[12,-11],[65,-89],[8,-15],[7,-17],[4,-18],[1,-8],[-1,-9],[-42,-121],[-25,-43],[-3,-8],[-3,-21],[-2,-8],[-3,-9],[-4,-7],[-6,-8],[-19,-19],[-4,-5],[-2,-10],[-1,-40],[2,-14],[4,-11],[3,-6],[4,-4],[4,-3],[5,-3],[5,-3],[37,-8],[7,-3],[6,-4],[6,-6],[8,-14],[25,-68],[2,-10],[-2,-8],[-4,-6],[-6,-3],[-7,-1],[-7,0],[-20,2],[-7,0],[-6,-1],[-7,-1],[-6,-2],[-7,-3],[-6,-5],[-4,-5],[-4,-6],[-2,-7],[0,-2],[5,0],[4,0],[25,-4],[5,-4],[2,-7],[6,-7],[7,-6],[6,-3],[8,-2],[13,0],[11,2],[10,10],[37,7],[5,3],[5,-4],[38,-43],[12,-18],[6,-8],[7,-6],[38,-30],[10,-6],[28,-11],[30,-16],[26,-20],[51,-52],[35,-44],[6,-6],[5,-3],[4,-2],[6,-1],[13,-2],[25,0],[37,-8],[35,-4],[8,-2],[8,-4],[11,-11],[5,-8],[4,-8],[10,-55],[1,-13],[0,-6],[-1,-7],[-3,-6],[-5,-6],[-6,-4],[-6,-4],[-71,-18],[-4,-2],[-4,-3],[-4,-5],[-7,-12],[-3,-6],[-2,-6],[-1,-6],[-1,-13],[1,-24],[3,-11],[3,-7],[3,-5],[2,-2],[43,-31],[54,-49],[33,-43],[7,-7],[7,-4],[7,-1],[6,0],[6,1],[8,2],[48,17],[7,1],[6,-1],[5,-4],[4,-7],[4,-9],[6,-6],[6,-5],[48,-15],[47,-26],[21,-8],[9,-5],[11,-10],[4,-8],[2,-7],[1,-93],[-2,-6],[-5,-4],[-5,-1],[-18,2],[-6,-1],[-7,-2],[-21,-13],[-13,-6],[-36,-13],[-6,-3],[-5,-5],[-3,-3],[-7,-12],[-5,-5],[-6,-5],[-7,-3],[-13,-6],[-7,-1],[-7,1],[-7,5],[-1,6],[1,7],[1,7],[1,5],[-4,3],[-6,-1],[-6,-2],[-27,-14],[-14,-5],[-71,-9],[-55,-2],[-12,-2],[-6,-2],[-4,-1],[-4,-4],[-4,-4],[-7,-13],[-7,-19],[-1,-7],[2,-66],[5,-26],[6,-16],[7,-13],[6,-9],[9,-11],[27,-20],[7,-11],[2,-8],[-1,-8],[-5,-7],[-6,-9],[-12,-20],[-3,-8],[-6,-45],[-4,-14],[-10,-24],[-35,-63],[-2,-8],[-1,-10],[1,-15],[2,-9],[4,-8],[5,-5],[5,-5],[18,-9],[4,-3],[5,-4],[5,-6],[9,-14],[15,-27],[5,-6],[5,-6],[6,-5],[14,-7],[21,-9],[6,-3],[13,-10],[15,-18],[3,-4],[4,-9],[1,-6],[-1,-7],[-22,-60],[-2,-7],[0,-9],[0,-11],[4,-14],[3,-17],[-3,-27],[1,-18],[3,-23],[1,-16],[0,-15],[-13,-69],[-16,-152]],[[5740,3005],[-36,-22],[-76,-27],[-24,-5],[-11,-1],[-10,2],[-18,6],[-10,2],[-27,0],[-10,1],[-7,1],[-7,3],[-6,3],[-7,5],[-2,3],[-1,3],[-1,2],[-2,5],[-8,35],[-2,7],[-4,7],[-6,5],[-8,5],[-7,1],[-5,-1],[-5,-3],[-25,-22],[-12,-5],[-15,-4],[-125,-10],[-36,3],[-54,13],[-26,13],[-7,4],[-9,8],[-4,6],[-6,5],[-6,4],[-73,29]],[[5042,3086],[2,7],[1,10],[2,3],[8,8],[1,4],[0,20],[-1,5],[-2,3],[-1,3],[1,7],[1,6],[5,11],[1,6],[-1,3],[-5,5],[-1,3],[0,3],[3,5],[0,3],[-1,7],[-3,4],[-4,3],[-3,6],[1,3],[3,4],[1,4],[-3,5],[-2,4],[-12,25],[-4,4],[-4,3],[-3,1],[-2,3],[0,1],[-11,1],[-17,0],[-38,-1],[-38,0],[-39,0],[-38,0],[-38,0],[-38,0],[-38,0],[-38,0],[-38,0],[-39,0],[-38,-1],[-38,0],[-38,0],[-38,0],[-38,0],[-38,0],[-25,0],[0,26],[-1,25],[3,25],[11,29],[8,21],[15,38],[12,32],[-30,0],[-46,0],[-44,0],[-27,0],[-6,-1],[-5,-3],[-4,-8],[-2,-8],[-2,-18],[0,-7],[-26,0],[-22,0],[-22,0],[-22,0],[-22,0],[-22,0],[-22,0],[-16,0]],[[411,4030],[-13,-11],[-15,-4],[-30,-6],[-7,-6],[-16,-5],[-17,-14],[-13,-3],[-11,1],[-9,9],[11,11],[16,12],[17,14],[14,2],[26,-1],[15,-2],[11,1],[10,2],[11,0]],[[1542,4796],[65,-94],[25,-23],[6,-4],[6,-3],[7,-1],[6,1],[6,2],[5,3],[4,5],[3,6],[2,6],[0,7],[-2,13],[1,6],[3,5],[5,6],[6,4],[6,3],[11,1],[15,-1],[56,-10],[23,1],[14,-1],[6,-5],[1,-5],[-3,-6],[-8,-13],[2,-8],[7,-9],[23,-15],[9,-10],[6,-8],[-1,-6],[-9,-24],[-3,-12],[-2,-26],[-1,-7],[-3,-6],[-4,-5],[-6,-4],[-6,-3],[-6,-1],[-19,-3],[-6,-3],[-3,-6],[0,-8],[7,-12],[7,-8],[14,-12],[14,-10],[16,-9],[13,-5],[26,-5],[13,0],[7,1],[7,3],[5,4],[4,5],[2,3],[2,6],[1,12],[1,16],[1,7],[3,4],[5,-2],[7,-4],[14,-13],[23,-7],[24,-12],[128,-6]],[[2040,4035],[-14,0],[-48,-1],[-48,-1],[-48,-1],[-47,0],[-48,-1],[-48,-1],[-48,-1],[-48,-1],[-48,0],[-47,-1],[-48,-1],[-48,-1],[-48,-1],[-48,0],[-19,-1],[-30,0],[-66,-13],[-17,2],[-33,9],[-24,-5],[-47,1],[-55,1],[-10,2],[-31,11],[-12,1],[-63,-5],[-7,3],[-13,8],[-20,6],[-72,-6],[-87,-7],[-41,4],[-5,-1],[-10,-4],[-6,0],[-15,5],[-42,1],[-18,0],[-3,-2],[-11,-12],[-5,-4],[-17,9],[-22,5],[-44,4],[-1,0],[1,0],[-8,3],[-8,-1],[-17,-5],[-8,-1],[-9,2],[-12,-1],[-16,3],[-25,11],[-7,2],[-18,7],[-9,2],[-15,0],[-19,-2],[-19,-6],[-13,-8],[-5,-2],[-12,-9],[-6,-8],[-6,-10],[-13,-17],[2,-25],[-26,-11],[-34,1],[-27,-15],[-42,-10],[-14,-4],[-7,1],[-2,8],[2,5],[11,7],[0,12],[0,4],[-5,3],[-9,1],[-8,-2],[-2,-4],[-3,-2],[-4,-8],[-7,11],[-2,10],[-2,4],[-3,2],[-6,4],[-2,1],[-11,14],[-36,36],[-9,12],[-20,34],[25,15],[45,6],[48,-1],[38,0],[2,49],[2,35],[2,66],[3,63],[1,46],[2,40],[-4,18],[-6,5],[-32,11],[-3,3],[-2,5],[-1,6],[0,4],[3,5],[3,1],[4,0],[4,0],[44,16],[20,12],[8,21],[2,10],[5,4],[20,1],[13,5],[3,6],[2,8],[4,12],[8,6],[23,14],[5,6],[1,13],[4,12],[6,11],[9,10],[15,9],[103,24],[19,7],[5,15],[-2,18],[9,12],[13,1],[11,-13],[4,-8],[10,-14],[6,-17],[5,-6],[14,-9],[25,-21],[10,-7],[31,-11],[8,-5],[5,-4],[3,-7],[4,-18],[11,-23],[5,4],[15,18],[27,20],[6,3],[1,4],[-2,5],[-5,4],[17,10],[6,1],[6,-3],[11,-11],[6,-3],[5,2],[6,2],[11,21],[11,7],[5,0],[12,-3],[5,0],[3,4],[-2,10],[2,5],[5,3],[4,-2],[4,0],[4,5],[-8,22],[2,12],[8,21],[2,11],[-5,51],[2,6],[6,3],[33,12],[11,-1],[12,-8],[4,-6],[8,-14],[6,-5],[4,-1],[15,1],[1,-1],[15,-4],[5,0],[6,3],[8,11],[9,6],[1,1],[1,2],[15,21],[20,8],[46,6],[20,6],[20,10],[19,17],[11,8],[24,5],[23,13],[9,0],[3,-2],[2,-4],[0,-6],[-1,-7],[-3,-7],[-1,-3],[0,-3],[3,-8],[9,-13],[10,-12],[18,-12],[4,-3],[-2,-10],[-7,-11],[-9,-10],[-6,-8],[-6,-7],[-20,-8],[-9,-8],[-4,-7],[0,-4],[4,-12],[4,-20],[8,-11],[8,-7],[6,-8],[2,-14],[-1,-5],[-4,-9],[-1,-5],[0,-6],[2,-5],[3,-5],[2,-6],[-9,-41],[2,-16],[10,2],[10,1],[6,4],[11,11],[6,3],[10,3],[10,0],[4,-6],[2,-2],[12,1],[4,-1],[3,-2],[4,-7],[2,-2],[7,-2],[16,-10],[6,-2],[20,2],[15,5],[35,22],[25,11],[8,7],[5,8],[4,8],[43,73],[41,40],[3,7],[5,6],[28,14],[11,11],[28,40]],[[1542,4796],[19,28],[3,7],[6,11],[12,7],[15,6],[10,7],[58,30],[21,7],[13,7],[4,2],[2,4],[12,12],[3,5],[16,52],[6,10],[8,6],[10,4],[76,25],[23,3],[23,4],[23,7],[21,11],[2,2]],[[8901,6222],[-19,-32],[-10,-23],[-3,-19],[1,-20],[14,-83],[1,-19],[-3,-22],[-8,-26],[-13,-20],[-18,-15],[-23,-6],[-16,1],[-4,-2],[-5,-5],[-1,-5],[-2,-5],[-4,-8],[-6,-10],[-7,-8],[-9,-5],[-11,-3],[-14,-5],[-8,-7],[-4,-14],[1,-11],[2,-11],[6,-9],[1,-7],[-9,-8],[-2,-7],[2,-7],[5,-3],[6,-3],[5,-5],[4,-13],[-4,-40],[4,-4],[20,-13],[7,-3],[16,-2],[10,-5],[8,-9],[7,-13],[-10,-1],[-7,-6],[-4,-9],[-1,-12],[5,-9],[9,-2],[11,-1],[8,-4],[2,-4],[5,-14],[8,-12],[2,-5],[1,-9],[3,-8],[8,-5],[10,-3],[8,-5],[3,-9],[2,-11],[4,-9],[11,-4],[9,-1],[9,-4],[7,-5],[5,-8],[4,-31],[0,-3],[-2,-6],[-7,-4],[-4,-9],[-1,-11],[1,-35],[4,-11],[9,-7],[-3,-2],[-12,-12],[-2,-7],[-1,-15],[2,-39],[7,-87],[0,-9],[-1,-42],[-3,-22],[-5,-39],[4,-62],[5,-14],[8,-12],[20,-22],[32,-55],[15,-51],[3,-10],[16,-128],[2,-7],[2,-21],[-5,-45],[-32,-88],[-10,-44],[1,-45],[10,-42]],[[8983,4491],[-120,0],[-152,0]],[[8711,4491],[-10,8],[-16,17],[-10,12],[-7,12],[-45,117],[-24,38],[-63,124],[-8,11],[-4,5],[-6,5],[-54,35],[-8,8],[-22,29],[-30,18],[-12,9],[-10,7],[-10,4],[-10,-1],[-10,-5],[-8,-6],[-6,-7],[-4,-7],[-3,-8],[-2,-1],[-1,1],[-4,4],[-4,3],[-2,1],[-3,1],[-3,1],[-2,1],[-4,-1],[-3,0],[-3,-1],[-3,1],[-2,1],[-1,3],[-1,5],[1,8],[3,8],[0,2],[-3,1],[-2,0],[-8,-3],[-3,-1],[-2,0],[-5,0],[-44,14],[-19,9],[-20,12],[-32,30],[-12,8],[-7,3],[-17,6],[-21,4],[-86,-1],[-4,0],[-5,2],[-36,9],[-40,17],[-70,22],[-13,7],[-10,9],[-17,22],[-13,20],[-4,11],[-3,12],[0,15],[21,112],[-1,2],[-2,6],[0,3],[0,15],[-2,2],[-3,4],[-1,2],[1,4],[1,6],[0,3],[-1,3],[-2,2],[-2,1],[-2,1],[-2,0],[-1,2],[-1,2],[0,3],[1,4],[-1,3],[-2,3],[-1,2],[-1,2],[1,4],[1,4],[5,6],[14,15],[2,3],[1,3],[-1,4],[-1,3],[-2,2],[-1,2],[-1,1],[-1,2],[-1,3],[0,3],[1,17],[0,3],[-2,9],[2,12],[-1,3],[-2,1],[-4,0],[-2,1],[-2,2],[-1,3],[0,3],[1,2],[5,4],[1,2],[1,3],[0,5],[-1,2],[-1,2],[-5,9],[-2,2],[-3,8],[-1,2],[-5,2],[-2,2],[-2,2],[-3,11],[-2,5],[-1,4],[1,4],[2,8],[0,4],[0,4],[-1,3],[-9,18],[-2,3],[-22,18],[-6,7],[-20,27],[-4,4],[-6,3],[-2,2],[-2,5],[0,17],[-2,10],[-3,10],[-8,15],[-3,7],[-31,96],[-5,28],[-1,12],[5,77],[10,65],[6,19],[1,3],[3,2],[4,1],[5,-1],[3,-1],[10,-6],[4,-2],[18,-5],[16,1],[3,-1],[3,-1],[2,-1],[2,-1],[3,0],[4,0],[3,0],[3,-1],[2,-2],[2,-1],[2,-2],[11,-14],[2,-2],[2,-2],[2,-1],[3,-1],[15,0],[2,-2],[2,-2],[1,-3],[1,-2],[2,-2],[2,-2],[3,0],[3,0],[5,5],[2,1],[3,-1],[1,-2],[1,-3],[1,-2],[2,-2],[3,-1],[3,0],[3,1],[4,4],[4,2],[5,2],[10,3],[12,4],[15,6],[23,14],[14,10],[10,10],[6,9],[5,10],[3,9],[3,21],[7,10],[11,5],[171,9]],[[8153,6083],[28,15],[11,3],[12,2],[9,-3],[8,-6],[17,-20],[8,-8],[12,-8],[11,-4],[9,-2],[34,-1],[12,2],[24,12],[19,7],[59,11],[12,3],[9,7],[4,9],[3,11],[2,40],[2,10],[4,8],[5,6],[7,5],[6,2],[7,-1],[5,-2],[5,-3],[5,-5],[3,-6],[8,-31],[2,-3],[3,-2],[11,-4],[9,-4],[8,-2],[14,-1],[12,2],[10,4],[9,7],[7,9],[6,12],[12,33],[5,6],[8,5],[10,1],[13,-2],[19,0],[11,4],[9,8],[26,36],[6,6],[10,8],[7,1],[5,-2],[2,-3],[8,-19],[3,-5],[6,-4],[9,-2],[41,3],[17,0],[70,-6]],[[8138,6844],[42,-41],[3,-9],[2,-11],[-3,-8],[-5,-25],[-14,-35],[-5,-26],[-3,-8],[-7,-5],[-34,-20],[-8,-3],[-9,-1],[-25,0],[-4,-1],[-8,0],[-3,-1],[-8,-2],[-3,-1],[-3,1],[-2,0],[-2,1],[-1,1],[-2,2],[-1,2],[-3,1],[-3,0],[-2,1],[-2,2],[-2,5],[-2,2],[-2,1],[-2,-1],[-1,0],[-10,-5],[-3,-1],[-3,0],[-6,1],[-3,0],[-3,-1],[-3,-1],[-2,-1],[-19,-15],[-4,-2],[-3,0],[-7,1],[-8,2],[-3,1],[-4,-1],[-4,-3],[-7,-5],[-4,-3],[-3,-2],[-4,-1],[-5,-1],[-8,-5],[-3,-3],[-2,-3],[-1,-3],[1,-17],[-1,-5],[-3,-10],[-1,-3],[1,-3],[2,-1],[2,-2],[3,-1],[1,-2],[2,-2],[3,-4],[1,-3],[0,-3],[0,-4],[0,-3],[1,-3],[1,-2],[2,-1],[10,-6],[4,-3],[4,-3],[1,-3],[1,-2],[1,-3],[0,-3],[-1,-7],[-2,-2],[-3,-1],[-3,0],[-2,1],[-2,1],[-2,2],[-3,1],[-2,0],[-2,0],[-4,-3],[-3,0],[-2,2],[-2,1],[-2,2],[-2,1],[-3,1],[-3,0],[-2,-1],[-3,-1],[-8,-9],[-3,-1],[-2,-1],[-3,-1],[-3,-1],[0,-4],[1,-8],[4,-9],[14,-21],[109,-127],[25,-44],[11,-15],[8,-8],[37,-29],[21,-27],[8,-8],[18,-11],[8,-9],[3,-17],[1,-40],[2,-11],[3,-6],[17,-29]],[[8711,4491],[-1339,0]],[[7372,4491],[-611,1],[-14,2],[-10,3],[-24,48],[-3,12],[-1,12],[-2,3],[-11,8],[-3,5],[-3,10],[-3,5],[-14,7],[-9,10],[-4,1],[-5,5],[-11,28],[-2,1],[-6,4],[-3,3],[4,4],[-2,4],[-3,4],[-3,6],[1,6],[6,10],[5,14],[8,9],[11,8],[8,3],[0,5],[19,28],[20,18],[5,7],[-8,18],[-6,8],[-5,3],[9,45],[2,5],[4,5],[3,4],[1,7],[-1,7],[-5,8],[-1,5],[-1,12],[1,6],[2,4],[5,6],[-1,5],[-4,3],[-3,5],[-5,2],[-1,3],[0,3],[2,3],[1,1],[1,0],[2,8],[0,5],[-4,2],[-5,4],[-4,20],[-6,12],[-2,2],[-3,2],[-3,-1],[-6,-6],[-2,-1],[-4,3],[-14,13],[0,22],[-2,4],[-16,13],[-2,4],[-5,14],[-1,-2],[-4,-3],[-2,-2],[-11,16],[-4,8],[-3,9],[3,-1],[3,4],[1,5],[-5,2],[-12,0],[-6,1],[-5,3],[3,1],[1,2],[1,2],[2,2],[-10,4],[-6,5],[-6,17],[8,5],[12,20],[7,10],[6,5],[1,2],[-1,18],[-1,2],[-1,2],[-9,34],[-1,16],[1,4],[2,1],[7,1],[4,2],[2,5],[0,6],[-1,5],[-9,16],[-1,9],[9,4],[6,0],[4,1],[4,1],[3,3],[2,3],[0,3],[0,5],[1,5],[2,0],[2,0],[2,1],[9,18],[7,5],[11,2],[4,6],[-2,35],[-1,2],[-1,3],[1,2],[4,3],[8,2],[7,-1],[6,0],[6,5],[2,18],[2,4],[9,9],[12,22],[3,11],[-2,9],[0,4],[4,10],[-1,2],[-4,1],[-4,4],[-1,5],[4,5],[3,-1],[4,-5],[3,-2],[5,4],[1,6],[-3,4],[-4,4],[-2,2],[1,20],[2,10],[5,12],[15,24],[4,22],[19,43],[2,9],[0,9],[-8,24],[-2,11],[-3,35],[-3,10],[-1,9],[2,12],[5,16],[4,44],[0,3],[-7,0],[-181,-11],[-8,2],[-10,9],[-13,19],[-51,95],[-48,66],[-7,18],[-9,32],[-6,40]],[[7372,4491],[-12,-24],[-22,-63],[-5,-10],[-38,-52],[-12,-26],[-7,-27],[0,-10],[2,-8],[22,-35],[4,-7],[1,-6],[-2,-6],[-4,-6],[-13,-14],[-8,-10],[-8,-18],[-3,-10],[-1,-9],[1,-5],[1,-4],[3,-6],[4,-6],[5,-6],[25,-22],[6,-6],[5,-10],[3,-16],[-3,-70],[3,-33],[1,-9],[1,-6],[-1,-6],[-3,-8],[-13,-23],[-2,-7],[1,-8],[2,-7],[15,-28],[3,-10],[0,-7],[-1,-7],[-4,-6],[-4,-6],[-6,-5],[-6,-2],[-6,0],[-28,3],[-6,-1],[-7,0],[-6,-3],[-6,-3],[-5,-5],[-5,-6],[-3,-3],[-5,-4],[-6,-2],[-6,1],[-5,2],[-4,5],[-1,6],[-1,12],[-2,6],[-4,6],[-6,4],[-6,3],[-40,14],[-12,2],[-7,0],[-6,0],[-6,-2],[-7,-4],[-59,-54],[-6,-3],[-6,-1],[-19,-1],[-6,-2],[-6,-3],[-19,-12],[-6,-3],[-5,-2],[-5,0],[-4,0],[-54,12],[-30,2],[-8,-2],[-8,-5],[-12,-10],[-6,-8],[-5,-7],[-1,-5],[1,-3],[15,-22],[38,-42],[8,-5],[3,-1],[4,1],[3,-1],[4,-6],[5,0],[7,1],[22,4],[16,2],[4,-1],[4,-3],[3,-6],[0,-5],[-1,-5],[-4,-3],[-14,-7],[-5,-5],[-3,-3],[1,-3],[0,-9],[-2,-8],[-10,-24],[-1,-6],[-4,-4],[-2,-2],[-6,-4],[-48,-20],[-7,-2],[-8,0],[-7,1],[-31,27],[-6,4],[-39,16],[-13,3],[-25,3],[-26,0],[-25,-2],[-7,-2],[-7,-3],[-8,-6],[-6,-7],[-4,-7],[-2,-7],[-1,-7],[2,-15],[-1,-9],[-5,-5],[-75,-58],[-14,-8],[-8,-2],[-13,-3],[-10,-4],[-10,-7],[-28,-23],[-8,-3],[-27,-1],[-6,-1],[-6,-3],[-3,-4],[-6,-12],[-6,-10],[-7,-6],[-6,-3],[-7,-2],[-6,0],[-6,1],[-25,9],[-66,33],[-4,4],[-3,6],[-1,6],[1,14],[0,6],[-2,6],[-3,6],[-5,5],[-5,5],[-8,3],[-8,0],[-8,-2],[-6,2],[-5,-2],[1,-4],[4,-4],[2,-1],[2,-16],[0,-2],[-7,0],[-5,0],[-3,-3],[-2,-6],[2,-1],[10,-11],[3,-5],[-2,1],[-2,-2],[-2,-3],[-1,-3],[1,-2],[2,-2],[3,0],[1,0],[-2,-11],[-5,-11],[-8,-7],[-12,-3],[-6,-1],[-6,-1],[-4,-3],[-4,-2],[-1,-2],[-1,-7],[-1,-2],[-2,-2],[-5,-1],[-1,-1],[-12,-25],[-2,-6],[-3,-3],[-15,-9],[-4,-7],[-1,-5],[4,-34],[-2,-12],[-6,-10],[-1,-6],[5,-5],[12,-5],[3,-5],[2,-3],[0,-3],[-1,-4],[-3,-4],[-3,-2],[-4,-3],[-8,-48],[-4,-9],[-3,-7],[-3,-3],[-4,-3],[-3,-2],[-1,-4],[0,-5],[2,-4],[-1,-3],[-3,-6],[-2,-88],[3,-9],[12,-21],[3,-12],[0,-5],[-1,-5],[-2,-1],[-2,0],[-23,2],[-12,-1],[-7,-1],[-7,-2],[-7,-3],[-8,-8],[-14,-19],[-6,-5],[-7,-2],[-6,2],[-10,8],[-5,3],[-28,-14],[-6,-1],[-6,-1],[-48,3],[-7,-1],[-7,-2],[-12,-6],[-10,-2],[-11,-1],[-15,1],[-7,1],[-20,8],[-7,2],[-7,0],[-13,-2],[-6,0],[-6,1],[-7,2],[-7,2],[-9,-2],[-7,-6],[-7,-8],[-7,-4],[-7,-1],[-6,1],[-5,4],[-5,5],[-3,6],[-2,7],[-5,26],[-4,13],[-5,12]],[[8983,4491],[1,-4],[17,-43],[41,-75],[22,-86],[50,-122],[10,-44],[-5,-41],[-16,-30],[-40,-54],[-10,-33],[1,-21],[16,-60],[9,-63],[6,-21],[15,-25],[36,-47],[26,-71],[12,-20],[17,-18],[70,-54],[50,-26],[23,-11],[41,-35],[76,-89],[31,-49],[39,-85],[19,-67],[5,-35],[14,-50],[112,-176],[38,-93],[13,-48],[-89,-14],[-135,-21],[-106,-16],[-139,-21],[-139,-22],[-9,-1],[-110,-17],[-83,-13],[-90,-14],[-63,-9],[-14,-6],[2,-10],[22,-47],[-2,-47],[-20,-46],[-67,-89],[-87,-86],[-49,-36],[-47,-23],[-23,-15],[-10,-19],[8,-20],[23,-9],[25,-5],[19,-10],[10,-13],[2,-10],[-1,-10],[-1,-7],[2,-9],[7,-6],[12,-9],[4,-5],[2,-6],[1,-7],[0,-9],[3,-7],[6,-3],[17,1],[-4,-5],[-11,-3],[-3,-3],[2,-5],[10,-12],[2,-7],[1,-5],[5,-11],[1,-6],[1,-24],[3,-11],[7,-10],[5,-4],[5,-2],[3,-3],[1,-7],[14,-14],[-1,-3],[-10,-4],[-5,-9],[-5,-23],[-16,-34],[-2,-12],[4,-38],[-1,-42],[-5,-21],[-8,-17],[-13,-15],[-5,-10],[18,-15],[1,-2],[1,-6],[1,-3],[2,-1],[4,-2],[1,-1],[3,-10],[-2,-8],[-3,-9],[-1,-11],[1,-13],[5,-10],[4,-8],[4,-10],[1,-7],[-1,-6],[-2,-7],[-3,-4],[-2,-5],[4,-8],[-2,-5],[0,-8],[7,-9],[12,-15],[1,-6],[-3,-11],[-1,-6],[3,-6],[12,-9],[3,-3],[-3,-11],[-7,-10],[-8,-8],[-7,-6],[-3,-1],[-7,1],[-3,-2],[-2,-3],[-8,-13],[-4,-11],[-4,-5],[-9,-10],[-7,-11],[-4,-12],[-3,-13],[0,-23],[-1,-6],[-5,-11],[-1,-5],[-2,-6],[-10,-9],[-3,-5],[0,-6],[1,-11],[-1,-5],[-2,-6],[-7,-13],[-7,-10],[0,-5],[5,-29],[0,-6],[-1,-5],[-4,-7],[-2,-3],[0,-6],[0,-18],[-9,-20],[-5,-6],[-5,-7],[-3,-12],[4,-20],[-2,-1],[-12,-9],[-2,-3],[-27,-39],[-1,-10],[0,-28],[3,-8],[3,-4],[6,-16],[4,-5],[7,-8],[4,-5],[9,-32],[-1,-5],[-2,-2],[4,-5],[7,-7],[2,-6],[5,-36],[4,-7],[9,-3],[6,-5],[5,-26],[5,-8],[7,4],[6,-1],[4,-3],[5,-4],[3,-3],[6,-10],[1,-5],[13,7],[7,-5],[9,-20],[7,-5],[26,-14],[11,-3],[18,3],[5,-5],[1,-14],[3,-8],[8,-6],[18,-10],[7,-6],[7,-9],[6,-10],[2,-10],[5,-6],[31,-17],[13,-17],[43,-78],[1,-5],[1,-7],[3,-2],[4,0],[5,-3],[8,0],[9,4],[8,2],[6,-11],[8,6],[11,5],[13,3],[43,1],[5,-3],[10,-10],[6,-6],[5,-2],[6,-1],[21,0],[4,-1],[22,-12],[14,-5],[4,0],[7,0],[3,0],[3,-2],[2,-2],[2,-2],[4,-1],[10,1],[8,5],[5,7],[2,10],[-2,10],[-7,3],[-8,0],[-8,3],[-16,20],[-2,4],[1,5],[2,5],[2,12],[7,21],[3,6],[8,6],[23,8],[10,6],[8,7],[5,2],[7,0],[7,-2],[9,-9],[6,-3],[9,1],[27,13],[18,13],[11,4],[22,1],[1,-2],[-1,-57],[0,-62],[0,-88],[0,-79],[0,-93],[0,-80],[0,-75],[0,-79],[0,-59],[-9,-17],[-7,-1],[-34,0],[-21,6],[-11,5],[-8,4],[-5,5],[-4,5],[-2,6],[-2,6],[0,8],[4,2],[5,1],[3,2],[1,5],[-1,11],[1,4],[4,4],[9,2],[4,3],[2,4],[2,5],[1,6],[-1,5],[-5,6],[-4,0],[-5,-1],[-6,1],[-10,6],[-9,7],[-10,6],[-12,0],[-12,-5],[-30,-28],[-11,-7],[-74,-28],[-31,-21],[-11,-4],[-7,-4],[-11,-12],[-5,-4],[-8,2],[-5,6],[-3,8],[-5,7],[-12,5],[-12,0],[-13,-2],[-4,0],[-10,0],[-10,-4],[-9,-2],[-9,2],[-7,8],[-16,16],[-8,22],[-16,78],[-6,8],[-5,2],[-10,1],[-5,3],[-5,18],[-2,1],[-3,1],[-3,1],[-2,2],[-1,3],[1,6],[0,2],[0,2],[2,6],[1,3],[-2,2],[-7,3],[-3,2],[-4,19],[-4,6],[-9,8],[-36,46],[-21,21],[-24,6],[-7,-5],[-8,-15],[-5,-7],[-8,-3],[-8,0],[-5,5],[-2,28],[-8,12],[-12,12],[-11,14],[-4,13],[6,8],[8,6],[6,9],[1,13],[-6,10],[-18,19],[-6,12],[-10,26],[-7,11],[-44,38],[-9,5],[-10,3],[-10,1],[-11,-2],[-13,0],[-10,6],[-8,8],[-10,5],[-13,-4],[-8,-7],[-7,-4],[-13,10],[-2,5],[-1,5],[-2,5],[-5,3],[-39,4],[-8,-1],[-9,-2],[-12,4],[-3,11],[-2,14],[-8,9],[-30,18],[-10,4],[-13,1],[-7,-4],[-6,-7],[-10,-8],[-17,-4],[-24,-1],[-23,2],[-15,4],[-22,25],[-3,2],[-28,23],[-8,11],[-26,73],[-2,21],[-25,43],[-98,60],[-12,46],[1,18],[-3,26],[-5,24],[-9,13],[-3,-1],[-15,-5],[-23,-2],[-20,-7],[-5,0],[-11,2],[-5,-1],[-7,-8],[0,-10],[7,-22],[-1,-14],[-6,-8],[-7,-8],[-8,-12],[-5,-20],[-3,-44],[-10,-21],[-18,-17],[-20,-12],[-23,-5],[-24,3],[-14,0],[-8,-7],[-6,-9],[-8,-8],[-10,-2],[-9,4],[-9,7],[-10,6],[-20,4],[-43,3],[-18,6],[-10,7],[-8,8],[-9,7],[-12,4],[-20,0],[-20,-4],[-5,-2],[-11,-7],[-5,-3],[-7,1],[-10,5],[-19,-1],[-11,5],[-11,7],[-11,4],[-91,-1],[-7,1],[-9,4],[-7,16],[-8,6],[-11,4],[-28,23],[-2,3],[-3,2],[-6,1],[-4,-1],[-10,-5],[-6,-1],[-30,0],[-10,2],[-20,12],[-16,15],[-18,11],[-24,1],[-4,-3],[-2,-6],[-2,-5],[-6,-2],[-6,0],[-4,-4],[-3,-3],[-5,-3],[-10,0],[-8,3],[-3,8],[4,13],[0,3],[0,3],[-1,2],[-9,9],[-30,14],[-5,4],[-2,5],[-3,3],[-7,2],[-7,0],[-4,0],[-4,2],[-4,5],[-5,9],[-15,43],[-1,10],[0,5],[2,5],[7,8],[1,5],[-4,9],[-12,21],[-4,11],[0,13],[4,6],[6,5],[5,9],[-3,5],[-6,4],[-3,5],[6,5],[11,4],[4,4],[1,5],[-2,11],[1,13],[-1,12],[-6,6],[-17,-3],[-50,-25],[-31,-6],[-75,-7],[-20,2],[-22,-7],[-39,-19],[-20,-5],[-40,0],[-20,-8],[-6,-6],[-9,-12],[-5,-6],[-6,-2],[-12,-3],[-4,-2],[-5,-4],[-3,-4],[-2,-6],[-2,-6],[-3,-4],[-6,-1],[-6,1],[-5,-1],[-22,-8],[-11,-2],[-12,1],[-11,5],[-18,16],[-11,7],[-10,2],[-22,0],[-8,4],[-5,10],[7,5],[22,7],[6,7],[17,26],[4,9],[2,10],[1,12],[0,11],[-3,9],[-4,5],[-9,8],[-3,6],[1,7],[4,5],[4,5],[2,6],[-6,11],[-13,12],[-15,9],[-12,5],[-10,2],[-20,0],[-10,1],[-19,6],[-9,0],[-11,-3],[-10,-2],[-4,7],[1,17],[-1,7],[-3,10],[-2,6],[1,5],[3,9],[0,5],[-12,11],[-23,9],[-25,4],[-17,1],[-10,-5],[-5,-11],[-2,-12],[-4,-11],[-5,-4],[-11,-7],[-5,-4],[-3,-6],[-4,-11],[-4,-6],[-18,-6],[-21,4],[-21,7],[-20,2],[-21,-2],[-17,2],[-45,12],[-32,9],[-21,2],[-21,-1],[-22,-7],[-35,-19],[-58,-32],[-43,-7],[-52,-9],[-24,0],[-20,3],[-10,4],[-20,13],[-11,6],[-12,0],[-12,-5],[-11,-9],[-11,-6],[-19,-3],[-21,2],[-20,5],[-19,8],[-40,16],[-19,-2],[-17,-43],[-15,-13],[-53,-17],[-7,-6],[-23,-25],[-10,-6],[-13,0],[7,21],[2,23],[-6,47],[-4,10],[-8,15],[-2,9],[-2,3],[-8,6],[-1,2],[0,21],[-11,37],[-5,8],[0,9],[9,11],[12,11],[9,7],[22,9],[13,4],[10,1],[5,5],[2,10],[-2,20],[1,2],[3,3],[-8,14],[-2,19],[1,11],[0,10],[-2,23],[-5,11],[-6,7],[-5,7],[-2,11],[4,11],[12,20],[2,8],[1,5],[3,10],[0,6],[-1,7],[-8,9],[-5,16],[-12,22],[-9,25],[-13,24],[-10,24],[4,17],[-3,7],[-4,22],[-11,29],[-4,19],[-4,11],[-7,9],[-21,13],[-8,7],[-6,3],[-4,-4],[-4,-1],[-5,3],[-30,35],[-6,15],[-1,17],[-3,-1],[-9,-4],[-3,-1],[-7,20],[-34,35],[-13,21],[-5,22],[-6,47],[-6,21],[-4,6],[-9,11],[-2,5],[1,7],[5,11],[3,18],[17,34],[5,22],[0,22],[-6,53],[7,61],[-1,27],[4,43],[6,12],[4,18],[4,4],[5,33],[6,39],[6,16],[9,17],[-4,1],[-2,1],[-1,1],[-3,1],[12,40],[3,24],[-5,23],[-12,20],[-7,14],[3,6],[4,2],[4,2],[-5,10],[-15,15],[-5,10],[-5,25],[-1,23],[-2,9],[-3,7],[-13,15],[-6,10],[-3,10],[-2,13],[-3,6],[-17,10],[-5,4],[-2,9],[-2,36],[2,6],[8,10],[1,6],[0,6],[-3,14],[3,24],[3,8],[5,17],[5,12],[6,20],[6,18],[4,10]],[[9318,7596],[-11,-9],[-7,-4],[-10,-21],[-1,-5],[3,-28],[-6,-45],[-1,-11],[10,-43],[1,-20],[-7,-17],[-2,-3],[-10,-12],[-27,-33],[-6,-9],[-4,-12],[-17,-87],[-2,-4],[-5,-4],[-4,2],[-3,3],[-7,3],[-2,-6],[-23,-33],[-5,-14],[-1,-9],[6,-24],[1,-10],[-3,-10],[-8,-19],[-7,-40],[-2,-14],[-3,-19],[-9,-53],[-1,-9],[-4,-22],[-8,-45],[2,-10],[1,-3],[6,-11],[2,-9],[2,-32],[-1,-7],[-5,-3],[-5,-1],[-5,-1],[-2,-6],[1,-3],[4,-6],[1,-3],[-1,-4],[-2,-3],[-3,-2],[-2,-3],[-7,-42],[0,-11],[5,-20],[1,-12],[-1,-31],[-2,-8],[-6,-7],[-15,-6],[-6,-9],[-1,-5],[0,-5],[2,-10],[1,-8],[-2,-5],[-3,-5],[-1,-6],[1,-9],[8,-21],[2,-10],[0,-10],[-7,-32],[0,-13],[5,-9],[5,-8],[3,-11],[0,-5],[-5,-13],[0,-6],[6,-11],[2,-6],[0,-10],[-5,-31],[-20,-7],[-21,-16],[-18,-19],[-10,-16],[-2,-3],[-1,-1],[-1,0],[-2,-1],[-40,-1],[-8,-4],[-6,-8],[-14,-30],[-6,-7],[-25,-21],[-6,-9],[-11,-22],[-14,-21]]],"transform":{"scale":[0.001907179912855981,0.0018835514328432868],"translate":[12.210554869353132,-13.458350523999925]}};
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
