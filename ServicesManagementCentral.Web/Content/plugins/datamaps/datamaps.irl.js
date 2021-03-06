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
  Datamap.prototype.irlTopo = {"type":"Topology","objects":{"irl":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":null},"id":"-99","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]]]},{"type":"Polygon","properties":{"name":"Waterford"},"id":"IE.WD","arcs":[[5,6,7,8,9,10]]},{"type":"Polygon","properties":{"name":"Monaghan"},"id":"IE.","arcs":[[11,12,13,14]]},{"type":"Polygon","properties":{"name":"Galway"},"id":"IE.GY","arcs":[[15,16]]},{"type":"Polygon","properties":{"name":"Cork"},"id":"IE.CK","arcs":[[17,18]]},{"type":"Polygon","properties":{"name":"Limerick"},"id":"IE.LK","arcs":[[19,20]]},{"type":"Polygon","properties":{"name":"Waterford"},"id":"IE.WD","arcs":[[-7,21]]},{"type":"Polygon","properties":{"name":"South Tipperary"},"id":"IE.TY","arcs":[[-11,22,23,24,25]]},{"type":"Polygon","properties":{"name":"South Dublin"},"id":"IE.DN","arcs":[[26,27,28,29,30]]},{"type":"MultiPolygon","properties":{"name":"Fingal"},"id":"IE.DN","arcs":[[[31]],[[32,-31,33,34,35]]]},{"type":"MultiPolygon","properties":{"name":"Dublin"},"id":"IE.DN","arcs":[[[36]],[[37,38,-27,-33]]]},{"type":"Polygon","properties":{"name":"D??n Laoghaire???Rathdown"},"id":"IE.DN","arcs":[[39,-28,-39,40]]},{"type":"Polygon","properties":{"name":"Louth"},"id":"IE.LH","arcs":[[41,-12,42]]},{"type":"MultiPolygon","properties":{"name":"Galway"},"id":"IE.GY","arcs":[[[43]],[[44]],[[45,46,47,48,-17,49,50,51]]]},{"type":"MultiPolygon","properties":{"name":"Mayo"},"id":"IE.MO","arcs":[[[52]],[[53,54,-51,55]]]},{"type":"Polygon","properties":{"name":"Meath"},"id":"IE.MH","arcs":[[-42,56,-35,57,58,59,60,-13]]},{"type":"Polygon","properties":{"name":"Offaly"},"id":"IE.OY","arcs":[[61,62,63,-46,64,65,-59]]},{"type":"Polygon","properties":{"name":"Westmeath"},"id":"IE.WH","arcs":[[-66,66,67,68,-60]]},{"type":"Polygon","properties":{"name":"Wexford"},"id":"IE.WX","arcs":[[69,70,71,72]]},{"type":"Polygon","properties":{"name":"Wicklow"},"id":"IE.WW","arcs":[[-40,73,-73,74,75,-29]]},{"type":"Polygon","properties":{"name":"Kildare"},"id":"IE.KE","arcs":[[-34,-30,-76,76,77,-62,-58]]},{"type":"Polygon","properties":{"name":"Kilkenny"},"id":"IE.KK","arcs":[[78,-71,79,-8,-22,-6,-26,80,81]]},{"type":"Polygon","properties":{"name":"Laoighis"},"id":"IE.LS","arcs":[[-78,82,-82,83,-63]]},{"type":"Polygon","properties":{"name":"North Tipperary"},"id":"IE.TY","arcs":[[-84,-81,-25,84,85,-47,-64]]},{"type":"MultiPolygon","properties":{"name":"Kerry"},"id":"IE.KY","arcs":[[[86]],[[87,88,89]]]},{"type":"Polygon","properties":{"name":"Limerick"},"id":"IE.LK","arcs":[[-24,90,-88,91,92,-20,93,-85]]},{"type":"Polygon","properties":{"name":"Roscommon"},"id":"IE.RN","arcs":[[94,-67,-65,-52,-55,95,96]]},{"type":"Polygon","properties":{"name":"Sligo"},"id":"IE.SO","arcs":[[97,-96,-54,98]]},{"type":"MultiPolygon","properties":{"name":"Donegal"},"id":"IE.DL","arcs":[[[99]],[[100,101]]]},{"type":"Polygon","properties":{"name":"Leitrim"},"id":"IE.LM","arcs":[[102,103,104,-97,-98,105,-101]]},{"type":"Polygon","properties":{"name":"Longford"},"id":"IE.LD","arcs":[[106,-68,-95,-105]]},{"type":"Polygon","properties":{"name":"Clare"},"id":"IE.CE","arcs":[[-48,-86,-94,-21,-93,107]]},{"type":"Polygon","properties":{"name":"Carlow"},"id":"IE.CW","arcs":[[-72,-79,-83,-77,-75]]},{"type":"MultiPolygon","properties":{"name":"Cork"},"id":"IE.CK","arcs":[[[108]],[[-23,-10,109,-19,110,-89,-91]]]},{"type":"Polygon","properties":{"name":"Cavan"},"id":"IE.CN","arcs":[[-14,-61,-69,-107,-104,111]]}]}},"arcs":[[[2213,28],[-27,-10],[-17,1],[-8,3],[-16,-19],[-13,-3],[-13,16],[-2,5],[20,23],[61,28],[35,-2],[1,-23],[-21,-19]],[[1677,4583],[1,-31],[-50,8],[-28,-4],[1,11],[10,0],[13,1],[8,6],[1,8],[21,20],[27,-10],[-4,-9]],[[1791,4754],[40,-16],[18,0],[21,-7],[-5,-13],[-74,-16],[-58,1],[-25,32],[10,9],[18,9],[21,4],[34,-3]],[[1411,4732],[-1,-25],[-14,4],[-4,21],[-16,4],[-14,5],[-11,4],[-2,9],[12,8],[11,0],[6,6],[10,-3],[6,-13],[10,-4],[7,-16]],[[1115,5980],[-157,-4],[-8,7],[1,8],[-2,9],[6,8],[102,28],[42,27],[18,-5],[23,-16],[30,-12],[12,-9],[-4,-10],[-23,-17],[-40,-14]],[[6942,2308],[87,-42],[29,-19],[44,-45],[72,-59],[66,-39],[33,-15],[21,-4],[10,5],[7,6],[35,35],[9,5],[13,5],[17,4],[29,1]],[[7414,2146],[33,-107],[84,-56],[107,11],[49,-11],[62,41],[-70,86]],[[7679,2110],[50,25],[35,9],[9,-10]],[[7773,2134],[3,-13],[1,-25],[7,-12],[31,-42],[8,-25],[-29,-62],[6,-24],[55,0],[0,-17],[-35,-20],[-65,-62],[-38,-21],[-50,-8],[-101,-3],[-47,-8],[13,28],[63,60],[-49,15],[-28,3],[-31,-3],[0,-15],[13,-8],[6,-8],[5,-8],[8,-11],[-24,3],[-28,12],[-18,2],[-28,-6],[-15,-15],[-10,-17],[-14,-13],[-45,-15],[-41,0],[-85,15],[-427,-32],[-153,-58],[-83,-14],[-11,-6],[-8,-13],[-12,-12],[-22,-3],[-16,10],[-9,17],[-7,17],[-7,8],[-39,-9],[-42,-22],[-27,-33],[8,-41],[22,19],[34,3],[41,-7],[67,-21],[16,-3],[3,-11],[-13,-30],[-70,-36],[-9,-77],[-7,-18],[-19,-5],[-22,-3],[-19,-10],[-42,-18],[-118,9],[-46,-16],[-19,-35],[0,-26],[-13,-13],[-236,22],[-7,11],[-4,23],[-10,23],[-25,11],[-4,-8]],[[5856,1404],[-33,6],[-87,-1],[-15,2],[-11,7],[-8,11],[-12,41],[-6,9],[-11,12],[-64,48],[-30,13],[-21,11],[-11,9],[-25,13],[-9,10],[-10,17],[-25,66],[-15,27],[-29,31],[-36,22],[-8,7],[-1,27],[-5,10],[-16,5],[-27,7],[-12,3],[-12,4],[-89,-4],[-14,2],[-12,4],[-6,9],[5,18],[13,26],[35,56],[11,23],[44,34]],[[5304,1989],[199,-5],[21,5],[23,8],[0,9],[-4,20],[0,12],[3,12],[10,15],[20,6],[71,4],[25,-3],[16,-4],[17,-11],[16,-6],[22,-6],[295,-21],[32,5],[15,8],[-5,39],[-4,21],[-6,18],[-3,9],[-4,7],[-9,7],[-10,4],[-37,10],[-6,6],[-9,37],[-1,54],[-3,20],[2,13],[6,16],[19,19],[16,7],[16,3],[62,1],[328,41],[150,-15],[88,-22],[267,-24]],[[8635,6616],[60,-10],[18,-7],[10,-7],[6,-7],[5,-8],[16,-34],[2,-10],[-1,-19],[-2,-7],[0,-4],[1,-4],[6,-14],[1,-11],[-5,-13],[-13,-16],[-24,-8],[-16,0],[-12,5],[-19,10],[-11,4],[-13,2],[-18,-5],[-20,-11],[-29,-25],[-13,-16],[-4,-20],[1,-12],[1,-11],[6,-10],[12,-9],[0,-15],[-6,-11],[-115,-48]],[[8459,6265],[-94,28],[-49,-6]],[[8316,6287],[-138,55],[-36,24],[-16,33],[-10,16],[-82,98],[-19,17],[-17,12],[-14,3],[-45,21],[-198,134],[-15,16],[6,7],[8,8],[1,12],[-7,6],[-13,2],[-57,-6],[-12,-3],[-30,-14],[-16,-3],[-19,1],[-55,11],[-20,1],[-13,-2],[-11,-5],[-17,-11],[-15,-2],[-19,0],[-158,32],[-14,0],[-26,-5],[-49,4],[-134,39],[-7,4]],[[7049,6792],[14,1],[-51,71],[0,17],[16,13],[68,26],[8,-6],[-7,-18],[-3,-23],[0,-29],[-2,-23],[8,-10],[31,11],[20,15],[16,22],[6,26],[-10,25],[44,15],[-3,13],[-21,12],[-10,10],[12,25],[15,17],[18,12],[25,13],[122,22],[48,20],[-14,42],[31,28],[-80,45],[14,35],[-75,25],[-6,27],[11,2],[17,-4],[12,10],[3,0],[17,23],[-1,2],[-5,4],[-9,12],[-5,16],[3,12],[7,2],[8,3],[39,-5],[18,1],[74,37],[108,113],[65,42],[70,4],[75,-25],[139,-77],[15,-17],[21,-42],[18,-7],[26,-2],[14,-10],[22,-39],[26,-47],[4,-37],[-18,-25],[-39,-14],[79,-27],[20,-15],[10,-22],[8,-24],[12,-25],[37,-41],[44,-33],[48,-27],[48,-21],[27,-1],[18,12],[16,17],[24,9],[27,-2],[24,-9],[46,-27],[33,-25],[18,-15],[13,-45],[-21,-46],[-50,-43],[23,-29],[-2,-28],[-35,-60],[34,-18],[60,-49],[31,-11],[12,5],[13,13]],[[3424,4643],[0,17],[-177,17],[-45,-5],[-78,-24],[-96,-5]],[[3028,4643],[7,63],[70,58],[101,56],[152,-47],[112,-37],[27,-94],[-73,1]],[[4659,1193],[-45,-4],[-46,-18],[74,-20]],[[4642,1151],[-40,-62],[-102,0],[-111,5],[-76,35],[27,86],[84,55],[116,-15],[119,-62]],[[4259,3167],[10,-88],[-53,-45],[-129,15],[-46,59]],[[4041,3108],[62,16],[6,7],[7,34],[11,12],[18,2],[9,-7],[7,-9],[12,-5],[33,0],[28,3],[25,6]],[[7414,2146],[53,-18],[60,-27],[30,-7],[21,-3],[12,3],[43,3],[25,5],[21,8]],[[5304,1989],[6,22],[-1,8],[-6,9],[-68,14],[-33,12],[-12,10],[-12,15],[-11,34],[-15,34],[-38,24]],[[5114,2171],[58,54],[4,11],[3,13],[-7,7],[-9,5],[-13,5],[-11,5],[-10,8],[2,16],[21,61],[-2,17],[-9,10],[-62,2],[-17,11],[-19,18],[-28,45],[-17,19],[-15,11],[-42,-3],[-17,3],[-89,58],[-18,8],[-18,4],[-27,-2],[-14,1],[-26,6],[-20,2],[-10,0],[-1,-1],[-8,2],[-11,5],[-26,16],[-7,12],[1,10],[10,19],[3,27],[2,11],[4,9],[5,8],[7,7],[27,16],[21,17],[5,3],[8,3],[11,2],[11,-2],[9,-3],[5,-3],[2,-3],[2,-5],[1,-9],[1,-11],[-1,-27],[3,-10],[8,-7],[12,-2],[10,7],[8,13],[0,31],[2,22],[3,2],[36,16],[34,10],[27,5],[13,-1],[25,-5],[13,-1],[12,2],[10,2],[5,3],[4,3],[3,3],[5,7],[7,18],[2,16],[2,19],[-1,38],[-3,22],[-7,24],[2,11],[6,8],[16,12],[7,11],[7,15],[8,50],[4,14],[23,42],[8,24],[10,46]],[[5107,3139],[104,28],[92,0],[124,-94],[155,-129],[40,-34],[71,-31],[-25,-85],[2,-12],[10,-3],[12,3],[8,9],[32,92],[33,-14],[115,-5],[149,41],[169,68],[125,136],[14,59],[-25,50],[-1,49],[40,39]],[[6351,3306],[50,-13],[11,-4],[40,-20],[45,-17],[8,-5],[8,-7],[15,-15],[105,-150],[63,-51],[5,-9],[5,-13],[0,-35],[4,-12],[13,-7],[23,-11],[7,-10],[3,-14],[-2,-25],[-8,-62],[2,-41],[4,-10],[6,-9],[15,-3],[35,3],[8,-5],[5,-8],[0,-19],[0,-8],[-2,-6],[-3,-6],[-6,-6],[-18,-11],[-33,-14],[-15,-10],[-7,-7],[-4,-7],[1,-9],[11,-7],[42,-20],[16,-13],[13,-14],[66,-47],[7,-11],[5,-16],[-2,-50],[-4,-25],[-2,-22],[9,-33],[47,-84]],[[9210,4889],[-39,-13],[-28,-31],[14,-19],[61,10],[22,-29],[84,-15],[52,-29]],[[9376,4763],[20,-50],[-11,-34],[-31,-29],[6,-47],[-6,-41],[-6,-32]],[[9348,4530],[-14,-1],[-20,-12],[-9,-12],[-3,-11],[-4,-21],[-8,-18],[-6,-8],[-7,-8],[-9,-6],[-8,-4],[-16,0],[-20,5],[-33,20],[-13,13],[-6,14],[0,9],[-22,13],[-21,9],[-188,35]],[[8941,4547],[-14,27],[-8,5],[-12,7],[-12,3],[-62,0],[-11,3],[-5,7],[2,10],[14,12],[12,7],[9,8],[1,8],[-7,9],[-8,5],[-6,3],[-10,3],[-11,4],[-7,11],[-1,18],[14,41],[12,25],[26,27],[11,9],[16,11],[6,8],[21,65],[22,32]],[[8933,4915],[44,-17],[30,4],[25,22],[47,0],[36,-10],[25,10],[39,0],[31,-35]],[[9973,5194],[-12,-8],[-30,7],[-22,18],[14,17],[51,2],[13,-15],[-12,-7],[-2,-14]],[[9651,4957],[-16,83],[-134,9],[-33,-34],[-53,-3],[-61,15],[-66,-41],[-70,-62],[-8,-35]],[[8933,4915],[34,47]],[[8967,4962],[86,60],[30,32],[12,20],[13,9],[12,6],[74,20],[13,7],[5,10],[0,8],[4,12],[8,15],[24,31],[7,18],[1,14],[-8,9],[-13,8],[-9,4],[-13,8],[-7,6],[-6,7],[-5,8],[-6,7],[-8,6],[-10,5],[-47,16],[-9,4],[-25,19],[-10,5],[-9,9],[-8,12],[-6,20],[2,15],[6,12],[13,15],[50,39],[12,6],[29,3],[30,-1],[13,-3],[11,-6],[7,-6],[6,-7],[5,-8],[7,-7],[8,-5],[12,-1],[12,3],[11,4],[33,23],[40,16],[21,14],[12,15],[26,49],[10,14],[10,8],[6,1],[13,0],[27,-2],[19,1],[24,7],[11,6]],[[9543,5582],[24,-11],[39,-61],[61,-29],[67,-21],[45,-22],[17,-23],[16,-34],[5,-37],[-14,-35],[-38,-41],[-10,-17],[-6,-20],[-16,-21],[-26,-46],[-20,-19],[-17,26],[-39,4],[-45,-11],[-36,-19],[143,-46],[11,-28],[8,-30],[21,-18],[-8,-8],[-15,-18],[-8,-8],[37,-13],[92,-4],[40,-18],[-25,-45],[-28,-1],[-30,18],[-32,11],[-9,6],[-28,24],[-8,6],[-21,-3],[-39,-13]],[[9604,4857],[-17,-21],[-16,11],[13,20],[24,16],[10,2],[37,17],[31,7],[18,-3],[-28,-6],[-21,-16],[-21,-9],[-30,-18]],[[9651,4957],[-16,-3],[-131,-69],[-6,-27],[15,-21],[52,-38],[17,-16]],[[9582,4783],[-61,-1],[-67,0],[-78,-19]],[[9786,4497],[-36,-12],[-23,-13],[-8,-4],[-12,-1],[-13,1],[-18,5],[-98,38],[-15,2],[-17,-1],[-67,-23],[-18,-1],[-22,4],[-38,13],[-19,9],[-22,13],[-12,3]],[[9582,4783],[27,-28],[30,-17],[62,-10],[24,-13],[16,-3],[27,-9],[0,-20],[-11,-21],[-8,-11],[-2,-55],[4,-35],[12,-37],[23,-27]],[[9437,5822],[-12,-3],[-130,-32],[-20,-1],[-215,7],[-60,-6],[-15,3],[-13,9],[-14,25],[-2,14],[4,12],[6,7],[28,28],[5,9],[0,8],[-8,9],[-23,7],[-18,3],[-76,1],[-8,1],[-12,6],[-42,27],[-20,28],[-7,9],[-11,5],[-20,5],[-15,9],[-13,19],[-15,33],[-24,31],[-4,8],[-1,10],[1,21],[-2,10],[-2,10],[-4,8],[-43,27],[-173,76]],[[8635,6616],[11,11],[12,9],[17,2],[35,-9],[17,-2],[191,48],[61,1],[2,-4],[9,-11],[13,-11],[14,-7],[16,1],[57,13],[53,6],[14,9],[9,21],[-1,21],[-4,20],[3,15],[29,34],[19,-2],[17,-18],[26,-12],[30,4],[32,11],[33,3],[33,-18],[140,-92],[35,-12],[16,-8],[32,-35],[13,-8],[48,-3],[19,-5],[16,-8],[43,-42],[-8,-31],[-72,-58],[-39,-10],[-55,14],[-53,22],[-30,17],[-32,-4],[-156,46],[-118,10],[0,-19],[27,-12],[-13,-24],[-28,-33],[-15,-42],[-12,-74],[-1,-46],[13,-44],[49,-45],[75,-26],[165,-15],[0,-19],[-24,-45],[-2,-44],[22,-39],[50,-27],[-46,-34],[-11,-68],[6,-66]],[[1619,4324],[27,0],[54,7],[42,-4],[58,-15],[17,-19],[-20,-18],[1,-17],[52,-19],[7,2],[10,-2],[-4,-20],[-40,-8],[-263,83],[-73,36],[22,22],[53,1],[57,-29]],[[1828,4569],[-76,-15],[-40,30],[-7,37],[-12,18],[-3,15],[22,23],[26,13],[31,5],[30,-4],[19,-14],[55,-61],[-45,-47]],[[5424,4679],[2,-9],[30,-27],[120,-64],[18,-30],[-16,-43],[-41,-26],[-97,-26],[-85,-42]],[[5355,4412],[-39,-19],[-51,-8],[-46,-17],[-37,-41],[-63,-99],[-36,-46],[-18,-21],[-23,-17],[-60,-33],[-20,-14],[-11,-12],[-8,-19],[-27,-36],[-71,-73],[-10,-24]],[[4835,3933],[-80,-20],[-37,-1],[-89,17],[-21,-2],[-19,-5],[-25,-10],[-25,-1],[-76,13],[-39,13],[-12,15],[-6,17],[-5,12],[-5,7],[-25,16],[-51,18],[-75,37],[-23,6],[-28,2],[-157,-7],[-26,-5],[-37,-15],[-39,-8],[-12,-5],[-16,-13],[-14,-14],[-5,-7],[-6,-9],[-14,-14],[-8,-6],[-38,-19],[-32,-21],[-27,-10],[-22,-2],[-25,0],[-18,4],[-15,6],[-16,8],[-11,-1],[-8,-6],[-7,-10],[-15,-10],[-12,0],[-11,2],[-33,12],[-9,8],[-5,8],[-4,8],[-8,28],[-1,8],[1,5],[1,3],[3,4],[12,13],[6,7],[2,9],[-2,8],[-4,8],[-7,7],[-6,8],[-4,8],[-2,10],[1,10],[3,10],[1,9],[0,10],[-3,9],[-6,8],[-8,6],[-241,95],[-16,10],[-7,6],[-6,8],[-5,7],[-5,9],[-3,8],[-3,10],[0,10],[2,10],[4,9],[7,6],[19,5],[6,2],[6,6],[3,5],[1,15],[-6,3]],[[3287,4353],[0,13],[-93,36],[0,19],[51,-16],[29,-3],[26,19],[25,8],[18,-3],[-12,-24],[22,-21],[24,-16],[28,-10],[33,-5],[-20,52],[-11,19],[-15,15],[29,38],[35,28],[74,38],[-23,-1],[-42,-12],[-19,-3],[-220,5],[-32,11],[39,16],[101,18],[44,2],[0,17],[-62,0],[0,16],[20,12],[58,12],[30,10]],[[3028,4643],[-627,-35],[-71,-24],[-33,-17],[-49,-9],[-93,0],[-48,16],[-25,23],[-20,25],[-29,21],[43,43],[-17,30],[-37,-1],[-21,-46],[-10,-55],[-26,-32],[-34,-4],[-36,31],[0,18],[43,52],[-19,114],[45,22],[7,-2],[22,-11],[16,-3],[9,6],[15,23],[7,6],[5,9],[-90,60],[25,19],[83,32],[-80,3],[-40,-4],[-33,-16],[29,-30],[4,-43],[-19,-37],[-43,-12],[-40,28],[10,47],[23,45],[-2,19],[-12,5],[-10,10],[-9,4],[-14,-9],[-31,-27],[-27,-8],[-18,-19],[-24,-40],[-53,-65],[-35,-30],[-106,-32],[-36,0],[-37,30],[-44,25],[-97,-16],[-35,17],[10,10],[11,32],[5,29],[8,18],[15,10],[20,4],[30,1],[37,7],[91,42],[33,21],[0,16],[-77,0],[0,18],[47,16],[0,17],[-33,0],[-25,-7],[-50,-26],[1,-17],[-29,-13],[-34,2],[-13,28],[12,23],[44,21],[19,25],[-28,-3],[-18,-13],[-15,-13],[-22,-7],[-20,6],[-19,9],[-20,2],[-25,-17],[-7,-24],[6,-29],[1,-23],[-24,-10],[-25,-2],[-38,-12],[-88,-1],[-29,5],[-26,10],[-23,21],[-13,23],[-17,18],[-31,7],[-90,-11],[-53,4],[-32,24],[-18,-11],[-18,-5],[-41,-1],[19,41],[24,27],[33,15],[47,5],[85,-12],[34,3],[33,24],[0,19],[-26,2],[-21,10],[-17,17],[-12,23],[48,-6],[55,-17],[45,-5],[19,28],[-44,-3],[-84,11],[-84,24],[-47,37],[-2,16],[-12,30],[-19,28],[-21,13],[-65,-12],[-26,-2],[-22,14],[51,30],[52,-1],[54,-11],[56,-2],[-5,11],[-7,29],[-4,12],[99,-1],[100,-18],[13,-10],[32,-39],[22,7],[31,32],[24,10],[-136,61],[-33,31],[85,13],[174,-12],[63,12],[77,32],[30,2],[23,-7],[47,-22],[107,-13],[174,-8],[0,11]],[[1742,5502],[1,0],[244,2],[18,2],[19,10],[15,3],[14,0],[13,-11],[4,-11],[4,-22],[3,-9],[6,-7],[9,-6],[13,-3],[61,-6],[9,-3],[7,-3],[7,-4],[15,-11],[9,-6],[46,-14],[28,-5],[213,10],[22,-5],[3,-9],[0,-9],[-5,-11],[-2,-7],[2,-8],[7,-7],[19,-3],[82,1],[21,-6],[13,-8],[6,-28],[6,-12],[9,-13],[15,-15],[10,-5],[10,-5],[33,-10],[9,-5],[9,-9],[5,-7],[4,-9],[6,-7],[7,-6],[10,-5],[22,-9],[39,-9],[16,-1],[71,12],[18,1],[19,3],[20,7],[53,29],[19,14],[36,39],[89,76],[12,18],[3,13],[-7,7],[-7,7],[-5,8],[0,9],[8,8],[13,6],[25,7],[15,7],[8,16],[3,11],[8,13],[43,32],[12,13],[8,11],[7,19],[3,10],[4,31],[13,8],[24,5],[148,0],[94,17],[69,29]],[[3704,5667],[34,-18],[85,-2],[50,6],[11,4],[176,30],[10,5],[8,6],[6,7],[4,10],[3,10],[13,9],[20,9],[73,22],[54,23],[20,3],[17,0],[27,-5],[152,-3],[13,-2],[14,-5],[20,-9],[10,-8],[5,-9],[-1,-24],[2,-9],[2,-8],[5,-9],[6,-7],[19,-11],[23,-8],[59,-11],[18,-6],[40,-18],[11,-7],[7,-7],[5,-8],[1,-8],[-6,-7],[-12,-3],[-44,-3],[-13,-3],[-7,-5],[-2,-9],[23,-23],[7,-9],[3,-10],[7,-11],[13,-12],[53,-21],[54,-34],[81,-39],[11,-9],[-20,-2],[-8,-3],[-3,-8],[2,-9],[30,-48],[5,-13],[2,-7],[1,-8],[-11,-26],[-2,-9],[2,-10],[6,-17],[6,-12],[5,-15],[1,-10],[-3,-19],[0,-10],[7,-11],[7,-8],[7,-8],[26,-28],[24,-18],[6,-7],[3,-6],[-5,-6],[-17,-12],[-4,-8],[1,-11],[8,-13],[33,-29],[8,-10],[10,-16],[2,-9],[-2,-8],[-17,-24],[-10,-16],[-2,-11],[1,-12],[8,-17],[15,-11],[21,-12],[41,-17],[19,-10],[13,-10],[7,-15],[1,-8],[0,-6],[-4,-29],[5,-14],[10,-18],[29,-30],[18,-13],[16,-9],[24,-7],[128,-7],[80,-2]],[[1162,6544],[46,-67],[-46,0],[6,-21],[-1,-19],[-7,-18],[-13,-13],[0,-19],[27,11],[25,5],[22,-2],[18,-14],[0,-17],[-18,-19],[-15,-40],[-6,-44],[8,-34],[-48,-30],[-42,16],[-43,35],[-50,30],[-29,2],[-30,-4],[-24,4],[-9,25],[5,37],[6,29],[-2,23],[-24,22],[-46,10],[-169,-26],[-61,6],[-110,28],[-59,1],[0,17],[58,1],[48,10],[38,25],[27,50],[17,-15],[18,-4],[19,5],[20,14],[48,-39],[57,10],[56,29],[46,17],[195,-4],[42,-13]],[[2997,6920],[0,-1],[5,-12],[56,-36],[13,-6],[15,-3],[48,-2],[17,2],[12,3],[9,6],[4,8],[7,7],[10,6],[25,6],[15,1],[147,-22],[19,-7],[13,-9],[17,-27],[8,-10],[29,-26],[4,-12],[-3,-8],[-9,-6],[-38,-9],[-9,-4],[-6,-8],[-9,-17],[-7,-7],[-10,-6],[-9,-6],[-6,-6],[-2,-10],[0,-10],[-4,-8],[-7,-7],[-9,-5],[-32,-13],[-7,-6],[-6,-5],[-8,-12],[-13,-26],[-3,-10],[-1,-10],[1,-9],[12,-8],[22,-5],[76,-7],[41,-17],[16,-4],[25,3],[15,4],[36,13],[13,1],[13,-1],[10,-5],[4,-11],[1,-11],[9,-27],[2,-4],[4,-5],[33,-22],[15,-26],[8,-6],[11,-6],[62,-6],[97,8],[21,5],[17,11],[18,23],[12,6],[17,4],[26,3],[11,7],[12,10],[8,4],[47,12],[11,5],[9,5],[8,6],[5,9],[3,19],[3,9],[8,6],[11,5],[12,2],[15,0],[15,-2],[123,-45],[8,-11],[5,-16],[-8,-76],[10,-39]],[[4225,6398],[-40,-15],[-28,2],[-107,36],[-23,1],[-17,-5],[-9,-11],[-3,-9],[3,-10],[13,-14],[4,-9],[-10,-34],[-1,-9],[1,-10],[4,-10],[5,-8],[6,-6],[8,-7],[76,-32],[7,-6],[3,-12],[-1,-16],[-7,-28],[-11,-11],[-13,-6],[-13,3],[-34,12],[-15,3],[-16,-1],[-19,-3],[-9,-7],[-5,-9],[0,-22],[-5,-14],[-9,-10],[-21,-17],[-14,-17],[-18,-33],[-4,-18],[3,-12],[71,-33],[9,-5],[7,-7],[5,-9],[2,-19],[-3,-30],[-18,-70],[-13,-29],[-13,-19],[-37,-31],[-9,-5],[-62,-27],[-23,-7],[-13,-2],[-14,-1],[-32,-8],[-59,-55]],[[1742,5502],[0,5],[-38,13],[-156,-9],[-97,25],[-181,76],[-31,112],[13,54],[24,41],[14,39],[-20,46],[22,10],[84,10],[61,16],[52,4],[24,6],[23,16],[13,1],[45,-20],[25,-7],[414,50],[0,19],[-34,4],[-89,30],[12,6],[9,5],[10,5],[14,2],[0,17],[-9,20],[24,23],[77,43],[-18,1],[-42,16],[18,11],[14,15],[9,20],[5,23],[-15,-2],[-10,-2],[-9,-5],[-12,-8],[-63,16],[-319,1],[-219,-83],[-121,-19],[-73,52],[27,14],[14,71],[37,18],[-6,23],[-1,11],[7,18],[0,15],[-16,0],[0,17],[106,19],[20,-6],[49,-24],[31,-6],[26,-13],[9,-59],[26,-14],[19,8],[-1,21],[-4,28],[9,29],[-21,16],[-18,18],[-21,15],[-31,3],[0,-16],[14,-19],[-26,7],[-15,18],[-26,63],[2,12],[-1,11],[-10,12],[-15,2],[-37,-3],[-8,8],[-7,16],[-16,14],[-16,21],[-8,37],[10,38],[25,11],[29,7],[26,22],[-31,10],[-1,14],[20,16],[29,10],[-17,18],[63,36],[-22,12],[-26,1],[-58,-13],[6,-21],[-3,-9],[-11,-4],[-24,-2],[0,-18],[16,0],[-65,-53],[-62,-9],[-57,31],[-45,66],[44,-1],[100,20],[40,15],[-68,34],[-27,24],[-13,30],[15,-6],[30,-7],[15,-6],[-28,30],[-77,58],[30,-14],[26,-1],[21,11],[14,21],[-116,65],[-50,13],[-33,-26],[32,-27],[-13,-22],[-37,-9],[-43,6],[20,-26],[10,-8],[0,-18],[-31,3],[-28,-4],[-47,-17],[0,-16],[29,-7],[11,-15],[6,-49],[-19,0],[-44,-17],[30,-13],[27,-24],[5,-22],[-38,-10],[-42,2],[-33,11],[-20,25],[-4,48],[14,30],[50,72],[11,29],[8,45],[19,21],[25,17],[26,31],[-70,1],[-28,9],[-25,22],[42,1],[20,23],[12,33],[18,30],[25,14],[98,39],[9,10],[6,13],[9,10],[22,1],[13,-8],[5,-15],[3,-16],[8,-12],[29,-16],[39,-14],[39,-3],[32,15],[16,-20],[18,-10],[20,0],[22,12],[3,-8],[0,-4],[2,-2],[11,-2],[-49,-63],[-53,-28],[-56,4],[-56,35],[-14,-49],[34,-15],[53,-2],[40,-13],[37,-17],[31,18],[29,29],[33,13],[-30,31],[15,41],[36,35],[33,15],[49,-9],[78,-38],[49,-6],[-13,22],[-17,14],[-46,17],[0,18],[22,5],[21,2],[48,-7],[-41,16],[-117,17],[-24,26],[-14,36],[5,19],[130,23],[48,-8],[84,-35],[44,-8],[382,-19],[25,3],[42,13],[24,3],[20,-5],[31,-22],[17,-8],[177,-17],[22,4],[27,10],[26,14],[17,14],[21,11],[27,-3],[100,-31],[19,-2],[17,-11],[18,-47],[12,-11],[39,5],[23,5],[5,8],[14,-20],[4,-21],[-6,-18],[-12,-12],[0,-17],[48,-16],[0,-19],[-43,-20],[11,-23],[108,-65],[28,-29],[18,-38],[0,-50],[14,0],[2,46],[0,3]],[[9437,5822],[10,-111],[10,-37],[15,-36],[16,-26],[22,-14],[33,-16]],[[8967,4962],[-106,13],[-35,11],[-11,5],[-14,2],[-17,-2],[-42,-17],[-15,-4],[-15,0],[-50,16],[-32,7],[-66,5],[-20,5],[-14,5],[-8,6],[-28,16],[-23,9],[-159,17],[-35,-3],[-33,-13],[-14,-8],[-8,-7],[-4,-7],[-8,-11],[-5,-5],[-13,-5],[-21,-2],[-64,6],[-32,7],[-20,8],[-7,6],[-3,4],[-4,7],[-5,17],[-4,8],[-4,4],[-4,3],[-28,15],[-8,7],[-6,8],[-4,8],[-7,7],[-13,4],[-21,1],[-38,-5],[-20,2],[-13,3],[-17,0],[-21,-5],[-184,-110],[-23,-17],[-31,-53]],[[7590,4930],[-240,131]],[[7350,5061],[13,9],[20,8],[35,10],[10,5],[8,5],[11,5],[11,3],[29,-1],[29,1],[21,8],[57,30],[9,6],[16,13],[6,8],[7,11],[3,8],[2,8],[1,13],[-2,31],[7,7],[10,1],[24,-6],[5,1],[9,2],[7,5],[6,7],[3,10],[2,10],[7,20],[7,18],[15,26],[1,12],[-4,16],[-10,27],[-1,15],[3,11],[8,7],[9,4],[9,3],[34,3],[9,5],[5,10],[0,13],[1,12],[4,9],[11,16],[8,18],[2,20],[2,10],[5,9],[6,7],[17,13],[5,8],[5,8],[3,10],[2,10],[-7,12],[-16,14],[-38,20],[-32,8],[-19,3],[-10,-2],[-11,-3],[-10,-4],[-17,-11],[-31,-13],[-10,-5],[-23,-19],[-13,-1],[-19,7],[-27,13],[-50,33],[-31,11],[-23,5],[-16,0],[-20,4],[-55,19],[-116,54],[-9,6],[-7,8],[-2,13],[1,12],[0,11],[-1,9],[-10,11],[-17,13],[-34,18],[-39,38],[-13,18],[-32,20],[-115,47]],[[7000,5988],[91,31],[31,-4],[13,-13],[8,-10],[15,-10],[25,-14],[61,-21],[31,-5],[22,4],[13,8],[17,8],[31,6],[30,10],[44,21],[15,0],[17,-3],[17,-6],[33,-6],[90,-30],[156,-22],[53,5],[68,24],[19,12],[13,12],[9,11],[19,9],[12,8],[6,8],[1,10],[-3,8],[-6,8],[-63,49],[-13,14],[-27,40],[-5,10],[-3,9],[1,9],[11,0],[31,-11],[14,-1],[14,3],[8,6],[6,6],[2,9],[-3,9],[-5,9],[-3,8],[1,10],[10,3],[12,-1],[14,-3],[11,-4],[11,-4],[18,-12],[10,-5],[19,-3],[24,0],[49,4],[66,27],[22,5],[24,1],[31,-3],[15,4],[13,10],[4,9],[46,33]],[[7590,4930],[-2,-26],[9,-9],[153,-99],[25,-24],[7,-15],[-8,-7],[-7,-10],[-2,-20],[-5,-11],[-6,-6],[-17,-7],[-9,-9],[-5,-15],[-1,-30],[-3,-17],[-4,-12],[-8,-7],[-18,-12],[-60,-30],[-10,-8],[0,-6],[7,-6],[10,-4],[12,-4],[12,-2],[29,-1],[16,-2],[17,-9],[2,-9],[-5,-8],[-8,-11],[-7,-17],[-6,-13],[-8,-8],[-10,-4],[-183,-3],[-30,4],[-15,0],[-15,-3],[-2,-6],[5,-6],[89,-22],[21,-12]],[[7550,4404],[-46,-36],[-32,-7],[-26,6],[-98,2],[-42,-7],[-19,-10],[-71,-25],[-39,-5],[-57,-1],[-24,6],[-15,6],[-5,8],[-11,16],[-4,8],[-3,10],[-2,31],[-4,9],[-49,57],[-10,9],[-15,10],[-30,12],[-20,3],[-17,1],[-57,-6],[-23,-8],[-7,-7],[-6,-7],[-3,-7],[-3,-14],[-5,-8],[-11,-8],[-19,1],[-74,14],[-26,1],[-20,0],[-296,-63],[-16,-8],[-7,-6],[-5,-9],[-4,-9],[-2,-10],[1,-10],[3,-9],[4,-7],[12,-16],[62,-61],[16,-12],[6,-6],[4,-8],[-1,-8],[-5,-8],[-12,-15],[-5,-8],[-4,-9],[-6,-8],[-17,-13],[-56,-28],[-9,-7],[-7,-7],[-6,-8],[-8,-18],[-5,-8],[-8,-7],[-8,-6],[-37,-20],[-7,-7],[-7,-7],[-10,-17],[-12,-34],[-6,-38],[-3,-9],[-4,-9],[-6,-8],[-19,-17],[-36,-28]],[[6131,3872],[-148,36],[-41,-3],[-21,-21],[-28,-17],[-29,-11],[-13,-9],[-3,-6],[3,-4],[6,-5],[6,-6],[3,-8],[-2,-8],[-5,-7],[-11,-13],[-4,-5],[-73,-41],[-30,-21],[-37,-35],[-14,-5],[-12,0],[-7,5],[-20,13],[-11,4],[-6,-4],[-1,-7],[12,-35],[-4,-13],[-11,-14],[-28,-20],[-17,0],[-12,5],[-13,22],[-5,12],[-1,9],[-3,10],[-6,7],[-8,5],[-42,11],[-14,7],[-10,7],[-8,7],[-4,8],[-2,9],[2,19],[-2,9],[-5,9],[-14,14],[-5,6],[-3,8],[0,8],[6,6],[10,4],[13,-1],[12,-3],[34,-11],[11,-2],[10,0],[9,1],[9,4],[18,10],[14,11],[9,10],[5,7],[4,8],[2,9],[-1,10],[-6,10],[-8,9],[-35,28],[-6,7],[-2,9],[0,9],[5,8],[7,6],[10,4],[13,2],[42,-4],[13,0],[11,3],[7,5],[1,9],[-3,5],[-4,5],[-6,5],[-11,12],[-5,9],[-4,9],[-2,9],[0,10],[2,10],[3,10],[5,8],[8,7],[10,4],[26,5],[12,3],[9,6],[4,8],[1,10],[-2,21],[2,10],[3,10],[4,9],[9,14],[4,7],[1,6],[-1,8],[-8,16],[-5,9],[-11,24],[-11,21],[-9,10],[-12,7],[-142,46],[-159,87]],[[5424,4679],[-5,15],[13,26],[48,54],[17,25],[20,16],[92,55],[41,37]],[[5650,4907],[103,-14],[16,-5],[10,-5],[8,-7],[21,-8],[24,-6],[9,-5],[12,-4],[12,1],[14,13],[12,6],[21,1],[86,-10],[70,9],[114,32],[20,11],[2,9],[2,10],[5,8],[14,13],[35,23],[71,33],[18,3],[25,0],[32,-9],[40,-19],[34,-12],[7,-5],[4,-7],[2,-5],[4,-16],[16,-46],[4,-8],[27,-39],[24,-28],[7,-7],[8,-6],[10,-3],[10,3],[3,12],[0,11],[3,9],[10,5],[26,-1],[13,-5],[19,-13],[13,-4],[32,-2],[10,-4],[16,-13],[19,-2],[29,3],[136,38],[214,131],[14,7],[18,5],[86,11],[29,15],[57,50]],[[5650,4907],[1,2],[24,21],[1,56],[-56,143],[-3,20],[11,31],[1,35],[-21,90]],[[5608,5305],[92,37],[37,10],[169,16],[27,0],[14,-3],[12,-4],[10,-4],[8,-6],[81,-20],[99,-5],[90,10],[36,10],[18,10],[0,19],[2,10],[5,7],[29,27],[7,8],[16,27],[10,9],[19,12],[11,9],[10,11],[12,11],[23,14],[38,9],[16,10],[8,10],[-1,21],[-3,8],[-7,7],[-9,6],[-65,27],[-8,7],[-5,7],[3,10],[11,3],[12,-1],[12,-3],[23,-9],[13,-4],[8,5],[22,24],[56,32],[6,4],[6,7],[17,24],[20,20],[12,9],[11,5],[45,1],[13,4],[10,6],[18,22],[17,17],[13,8],[12,6],[12,3],[13,1],[15,0],[33,-6],[30,0],[17,5],[12,5],[7,7],[7,7],[4,9],[2,10],[0,20],[2,6],[1,5],[1,3],[-1,4],[-2,5],[-8,16],[-12,13],[-14,12]],[[6888,5947],[112,41]],[[9648,3331],[-39,-62],[-105,-128],[-11,-47],[2,-38],[23,-72],[6,-39],[-6,-107],[-29,-44],[-135,-155],[-41,-34],[-37,-14],[-34,-34],[-52,-64],[-20,-39],[-2,-46],[4,-44],[-4,-34],[-15,19],[-18,12],[-20,5],[-129,-7],[-47,10],[13,46],[-20,-6],[-19,-7],[-18,-10],[-17,-12],[0,-15],[33,-9],[31,-20],[26,-28],[16,-33],[-14,-26],[70,-11],[20,-21],[12,-26],[28,22],[53,62],[0,-15],[-37,-53],[44,-58],[115,-80],[-64,-110],[-29,-28],[-22,-15],[-16,-5],[-21,3],[-29,15],[5,13],[16,12],[20,31],[-3,11],[-26,2],[-13,-5],[-20,-19],[-27,-16],[-4,-5],[-6,-3],[-97,0],[0,15],[45,0],[-30,19],[-23,0],[-38,-19],[-107,-15],[-94,-39],[-39,3],[-58,44],[-41,15],[-165,35],[-158,-17],[-43,7],[0,19],[34,11],[32,22],[23,31],[4,39],[-27,-26],[-37,-26],[-44,-13],[-44,14],[-15,-16],[2,-20],[3,-8],[1,-8],[-6,-19],[24,12],[8,7],[13,0],[-7,-37],[-7,-14],[-16,-16],[15,-1],[15,1],[0,-19],[-7,-1],[-16,1],[-7,0],[17,-17],[-162,-69],[-22,-16],[-25,-32],[-31,-21],[-37,16],[20,31],[27,16],[28,13],[25,19],[1,25],[-39,102],[-13,18],[-22,23],[-26,21],[-23,9],[-25,16],[-33,79],[-28,27],[6,-30]],[[7767,2161],[-8,2],[-14,3],[-14,5],[-8,5],[-6,7],[-5,8],[2,13],[7,15],[28,38],[6,13],[3,11],[2,22],[0,15],[-1,12],[3,12],[8,13],[47,37],[8,9],[19,27],[7,14],[5,17],[1,29],[-5,28],[3,7],[13,6],[12,-1],[24,-4],[12,9],[9,19],[8,41],[-7,43]],[[7926,2636],[88,4],[13,2],[22,8],[9,8],[7,10],[8,31],[8,17],[39,51],[9,19],[5,15],[11,15],[92,79],[13,20],[5,23],[4,67],[11,15],[22,16],[56,26],[30,10],[24,4],[40,-8],[15,-1],[14,1],[13,2],[14,6],[14,9],[21,19],[9,11],[-3,10],[-6,5],[-10,3],[-17,4],[-8,4],[-7,6],[-4,9],[-1,10],[5,9],[9,6],[36,4],[35,14],[56,57]],[[8627,3256],[77,-21],[27,-17],[8,-12],[17,-16],[15,-7],[16,-2],[14,0],[13,2],[84,28],[12,6],[10,8],[6,7],[12,15],[7,7],[8,7],[9,5],[30,14],[9,6],[8,6],[11,15],[14,26],[7,8],[7,6],[10,5],[7,6],[7,7],[5,9],[3,10],[7,12],[11,14],[28,20],[20,10],[21,7],[97,8],[16,-3],[11,-5],[10,-6],[11,-6],[20,-6],[17,4],[18,7],[27,13],[19,4],[17,0],[13,-3],[8,-5],[6,-8],[4,-9],[5,-8],[7,-6],[13,-4],[67,-3],[15,-3],[32,-13],[6,-4],[5,-4],[6,-5],[9,-15],[4,-9],[8,-17],[10,-10]],[[9786,4497],[1,0],[26,-22],[13,-28],[-16,-45],[30,-30],[77,-109],[-4,-10],[-1,-1],[-3,0],[-7,-5],[10,-41],[-3,-61],[-12,-60],[-18,-38],[-10,-41],[30,-39],[93,-73],[7,-19],[-29,-8],[-12,-11],[-22,-47],[-12,-11],[-24,-18],[-76,-120],[17,-19],[-96,-62],[-26,-24],[-25,-36],[-53,-120],[14,-56],[-7,-12]],[[8627,3256],[-39,47],[-10,8],[-10,12],[-8,11],[-6,21],[-8,15],[-28,27],[-10,7],[-11,3],[-11,-1],[-20,-7],[-9,2],[-6,10],[-1,22],[1,14],[3,13],[8,18],[10,17],[24,30],[8,19],[5,9],[8,6],[11,1],[12,-1],[55,-21],[8,-6],[8,-6],[13,-14],[7,-7],[9,-5],[12,-4],[26,-5],[30,0],[13,3],[22,7],[18,10],[21,9],[47,12],[10,5],[6,7],[1,10],[1,11],[-3,52],[0,9],[4,8],[8,4],[10,3],[7,2],[5,6],[1,9],[-7,11],[-7,7],[-9,6],[-10,3],[-12,1],[-18,-6],[-11,-5],[-14,-4],[-15,0],[-15,1],[-34,9],[-22,13],[-76,24],[-274,53]],[[8355,3771],[5,29],[-5,19],[-9,15],[-13,15],[-28,27],[-61,50],[-4,8],[-3,8],[3,9],[6,12],[34,48],[66,76],[28,39],[8,9],[14,9],[58,18],[42,18],[81,23],[11,6],[102,63],[14,13],[10,10],[4,15],[-1,10],[-2,11],[4,11],[9,9],[34,15],[12,8],[1,15],[-3,10],[-10,17],[-1,9],[5,10],[12,7],[55,12],[11,7],[10,10],[12,32],[10,11],[7,6],[58,27]],[[8355,3771],[-50,-76],[-22,-26],[-22,-10],[-18,-4],[-73,-3],[-61,-10],[-54,6],[-13,-7],[-19,-4],[-10,2],[-10,4],[-9,6],[-15,12],[-18,10],[-52,21]],[[7909,3692],[0,30],[-1,9],[-7,31],[-11,20],[-70,95],[-26,22],[-19,10],[-26,-7],[-21,-3],[-10,3],[-10,4],[-24,7],[-29,4],[-13,3],[-10,5],[-7,7],[-6,7],[-14,13],[-8,6],[-7,8],[-7,12],[-4,16],[4,23],[5,12],[8,9],[39,31],[7,8],[6,9],[2,6],[1,32],[-8,42],[-12,35],[-32,60],[-31,39],[-14,10],[-1,6],[-1,10],[8,17],[5,7],[8,7],[11,1],[11,0],[11,3],[7,6],[4,9],[-1,10],[-12,11],[-11,5],[-43,2]],[[7649,3461],[-46,-32],[-21,-33],[-15,-34],[-5,-20],[1,-31],[-6,-10],[-9,-11],[6,-5],[24,-7],[11,-6],[8,-9],[10,-15],[10,-8],[12,-2],[11,3],[30,14],[11,1],[13,-1],[11,-3],[11,-10],[12,-12],[28,-41],[3,-3],[16,-13],[18,-11],[11,-4],[2,-6],[-2,-6],[-7,-11],[-4,-10],[-2,-18],[2,-23],[9,-46],[6,-22],[6,-16],[13,-14],[14,-13],[60,-38],[18,-15],[7,-11],[1,-11],[-6,-32],[-3,-10],[-6,-9],[-20,-20],[-2,-42],[36,-149]],[[7767,2161],[6,-27]],[[6351,3306],[-51,56],[-11,17],[-24,49]],[[6265,3428],[110,14],[13,7],[10,8],[6,13],[12,16],[45,30],[23,9],[17,1],[8,-6],[11,-7],[17,-8],[36,-7],[44,-15],[31,-6],[9,-4],[29,-17],[14,-7],[28,-6],[16,-1],[113,31],[25,11],[15,11],[4,9],[8,10],[13,11],[25,13],[17,0],[12,-3],[13,-6],[7,3],[6,7],[13,26],[12,15],[9,9],[13,11],[26,15],[18,6],[17,3],[13,-2],[39,-13],[25,-4],[15,2],[11,5],[6,8],[6,19],[3,8],[98,50],[20,4],[15,-1],[11,-4],[75,-43],[8,-7],[3,-7],[2,-10],[-1,-21],[1,-11],[4,-8],[13,-14],[11,-15],[9,-7],[14,-7],[66,-10],[11,-5],[7,-6],[7,-8],[11,-14],[4,-8],[11,-16],[21,-18]],[[7909,3692],[-5,-34],[2,-65],[-2,-10],[-10,-41],[-16,-10],[-25,-10],[-141,-30],[-63,-31]],[[6265,3428],[-22,82],[-16,27],[-19,15],[-14,12],[-21,23],[-7,15],[0,12],[10,27],[2,30],[4,16],[7,12],[24,31],[6,7],[17,11],[39,20],[9,8],[7,10],[-2,9],[-7,6],[-13,3],[-60,7],[-13,3],[-20,10],[-8,6],[-14,13],[-23,29]],[[5107,3139],[-118,-5],[-35,9],[-3,9],[-8,13],[-14,14],[-35,18],[-23,5],[-18,1],[-71,-19],[-189,0],[-44,6],[-26,6],[-13,26],[-3,10],[-6,47],[-1,5],[-3,8],[-5,25],[-7,15],[-23,33]],[[4462,3365],[39,42],[29,55],[-6,59],[23,44],[1,13],[5,13],[6,10],[40,43],[10,13],[7,16],[15,52],[9,15],[12,10],[14,0],[92,-3],[13,3],[15,8],[107,102],[10,14],[3,12],[-4,9],[-8,6],[-9,5],[-32,14],[-18,13]],[[339,1284],[18,-11],[12,1],[25,-2],[8,-16],[-15,-19],[-40,-19],[-87,-28],[-77,-6],[-22,-14],[-45,-5],[-6,19],[38,36],[113,54],[21,14],[41,-1],[16,-3]],[[2487,2912],[12,-15],[30,-27],[7,-24],[4,-21],[21,-24],[18,-17],[27,-19],[12,-13],[8,-14],[2,-17],[-4,-11],[-8,-8],[-10,-5],[-8,-6],[-6,-7],[-5,-8],[-4,-19],[-6,-11],[-7,-11],[-7,-20],[1,-12],[4,-10],[12,-14],[8,-8],[8,-10],[9,-14],[-1,-9],[-5,-7],[-9,-6],[-8,-6],[-8,-10],[-6,-11],[-5,-21],[0,-10],[4,-11],[5,-5],[25,-17],[9,-8],[10,-14],[-1,-10],[-5,-8],[-8,-5],[-34,-12],[-9,-7],[-6,-14],[3,-9],[7,-5],[36,-13],[9,-5],[15,-14],[12,-14],[7,-6],[10,-4],[39,-8],[32,-14],[34,-11],[10,-5],[12,-7],[7,-7],[27,-31]],[[2813,2203],[7,-25],[-5,-6],[-84,-58],[-18,-21],[-9,-20],[-3,-24],[2,-14],[3,-11],[12,-17],[7,-8],[9,-14],[20,-24],[5,-8],[7,-17],[38,-139],[54,-110],[12,-16],[3,-4],[7,-4],[7,-4],[10,-1],[2,-5],[-1,-6],[-6,-10],[-4,-4],[-10,-8],[-20,-8],[-11,-11],[-9,-17],[-8,-41],[1,-20],[6,-13],[11,-4],[28,-3],[12,-3],[10,-3],[37,-21],[47,-14],[31,-5],[7,-2],[9,-5],[3,-9],[-1,-9],[-5,-10],[-11,-11],[-10,-6],[-14,-2],[-27,2],[-13,0],[-177,-36],[-31,-13],[-8,-5],[-23,-18],[-21,-10],[-34,-10],[-11,-6],[-11,-8],[-12,-14],[-2,-10],[1,-10],[5,-7],[7,-7],[23,-20],[6,-7],[20,-47],[0,-12],[-3,-11],[-10,-11],[-26,-19],[-20,-19],[-15,-19],[-30,-26],[-15,-6],[-27,-5],[-11,-4],[-20,-10],[-12,-3],[-44,-3],[-23,-6],[-52,-21],[-14,-9],[-14,-13],[-21,-29],[-14,-14],[-12,-10],[-11,-3],[-13,-3],[-57,-4],[-42,-8],[-24,-2],[-14,1],[-25,5],[-30,1],[-135,-18],[-11,-4],[-13,-7],[-68,-59],[-18,-12],[-11,-6],[-11,-3],[-14,-3],[-59,0],[-13,-2],[-12,-4],[-20,-9],[-9,-5],[-109,-97],[-9,-5],[-11,-4],[-13,-2],[-29,-2],[-38,-5],[-12,1],[-6,6],[-1,9],[2,9],[8,17],[1,9],[-3,8],[-7,6],[-21,8],[-4,7],[0,9],[2,9],[0,9],[-6,17],[-12,15],[-8,7],[-15,11],[-14,8],[-9,6]],[[1376,843],[10,10],[5,42],[29,-14],[39,-5],[85,2],[0,17],[-17,2],[-45,15],[0,16],[30,14],[57,46],[45,18],[25,33],[12,11],[17,3],[59,-3],[73,16],[130,52],[71,16],[0,19],[-162,-15],[-233,-62],[-43,-18],[-19,-16],[-14,-17],[-73,0],[-34,-8],[14,-19],[-67,-30],[-25,-4],[5,12],[6,29],[4,12],[-31,0],[-19,-10],[-12,-14],[-14,-10],[-27,-7],[-53,-6],[-26,-6],[-98,-55],[-51,-15],[-51,18],[-44,-33],[-56,-33],[-60,-25],[-54,-12],[13,33],[-211,70],[85,19],[20,61],[-38,64],[-90,30],[-26,-13],[-56,-61],[-25,-14],[-27,-9],[-69,-46],[-34,-15],[-13,32],[27,74],[-14,33],[-33,6],[-45,-3],[-29,4],[16,28],[-2,12],[-5,3],[-6,0],[-3,2],[5,9],[5,6],[4,7],[2,12],[-8,1],[-15,-1],[-8,0],[0,18],[74,6],[185,47],[39,0],[18,8],[7,17],[-2,17],[-7,8],[-32,13],[-19,28],[-23,25],[-42,4],[0,16],[26,12],[55,13],[27,11],[-17,37],[46,16],[63,10],[57,28],[141,47],[212,31],[91,38],[48,85],[16,0],[0,-45],[21,-20],[31,-4],[31,1],[-7,23],[47,149],[69,-29],[70,-2],[166,15],[-16,10],[-19,17],[-12,8],[77,34],[-443,-17],[30,-52],[-15,-29],[-10,-11],[-13,41],[-22,17],[-29,10],[-32,7],[-67,3],[-300,-53],[-53,-23],[-24,15],[-22,24],[-24,15],[-23,-7],[-15,-15],[-17,-6],[-57,40],[-25,2],[-62,-14],[0,-16],[22,0],[19,-4],[37,-13],[0,-16],[-57,7],[-106,26],[-52,0],[2,-17],[7,-8],[23,-8],[-49,-1],[-88,-29],[-47,-6],[-54,14],[-15,31],[-4,43],[-20,50],[19,8],[42,27],[0,15],[-23,21],[26,22],[47,19],[43,8],[-17,-34],[49,-29],[28,-7],[23,9],[6,21],[-8,17],[-1,18],[26,23],[-22,12],[-10,3],[21,39],[26,10],[34,-1],[42,7],[26,19],[49,54],[25,12],[232,47],[35,-21],[-27,-96],[4,-15],[146,16],[66,26],[59,46],[20,53],[-53,48],[78,2],[25,-10],[-11,-26],[11,-37],[2,-39],[9,-32],[32,-12],[36,-5],[68,-22],[76,-12],[92,-1],[32,13],[46,42],[26,10],[27,-8],[-15,-8],[-14,-9],[37,-16],[161,16],[-35,25],[-32,7],[-70,0],[-73,29],[-33,6],[-34,-17],[-17,12],[-12,16],[-9,19],[-5,23],[27,-18],[21,-10],[23,0],[35,11],[-29,12],[-15,3],[-19,2],[0,19],[22,0],[57,15],[-25,43],[7,123],[-37,25],[-117,16],[-63,21],[-40,31],[33,23],[43,11],[150,7],[222,71],[30,18],[33,34],[38,16],[58,-1],[58,-11],[38,-13],[-9,34],[-27,17],[-35,5],[-37,-3],[13,13],[4,12],[-4,14],[-13,12],[0,18],[18,15],[4,15],[-6,30],[9,18],[52,44],[13,-8],[14,7],[17,12],[24,6],[91,-17],[178,0],[17,-6],[21,-11],[22,-5],[23,12],[16,17],[14,7],[18,3],[169,-5]],[[5114,2171],[-32,13],[-10,2],[-20,2],[-101,-17],[-15,1],[-18,2],[-23,11],[-13,9],[-10,8],[-5,8],[-11,26],[-5,8],[-5,7],[-10,7],[-13,4],[-33,8],[-18,-2],[-22,-11],[-10,-10],[-7,-9],[-7,-8],[-28,-15],[-23,-19],[-18,-4],[-99,-9],[-104,-23],[-42,0],[-41,8],[-20,7],[-15,7],[-40,40],[-9,6],[-14,5],[-45,9],[-14,6],[-10,7],[-6,6],[-12,15],[-9,17],[-5,8],[-7,8],[-8,5],[-13,5],[-33,6],[-10,5],[-8,6],[-15,17],[-7,6],[-8,5],[-7,6],[-7,7],[-5,8],[-8,18],[-19,7],[-35,2],[-82,-5],[-146,11],[-20,-2],[-85,-42],[-20,-20],[-9,-5],[-10,-5],[-12,-4],[-20,-9],[-7,-6],[-6,-8],[-3,-9],[-4,-9],[-5,-8],[-8,-7],[-7,-6],[-10,-5],[-136,-31],[-30,-10],[-13,-10],[5,-8],[7,-6],[1,-5],[-6,-3],[-41,14],[-22,12],[-34,22],[-21,10],[-126,27],[-62,7],[-24,6],[-18,-3],[-27,-9],[-97,-60],[-71,-23]],[[2487,2912],[9,0],[18,-4],[33,11],[142,-2],[79,11],[37,10],[30,22],[32,16],[271,59],[41,20],[18,-28],[41,-6],[45,6],[33,10],[13,15],[14,23],[17,22],[25,9],[390,35],[76,17]],[[3851,3158],[27,0],[1,0],[1,0],[34,3],[34,-5],[28,-15],[11,-26],[17,-12],[37,5]],[[4259,3167],[22,10],[14,15],[6,16],[9,15],[22,6],[16,1],[17,5],[16,8],[13,10],[6,27],[-10,32],[0,26],[72,27]],[[5699,6029],[15,-32],[32,-22],[16,6],[14,-9],[7,-21],[-6,-28],[-15,-10],[-78,-26],[5,-9],[10,-25],[-20,2],[-17,-3],[-13,-7],[-11,-8],[-2,-9],[3,-12],[0,-11],[-45,-21],[-41,-49],[-20,-32],[-16,-40],[-12,-20],[-37,-57],[-10,-24],[-5,-18],[3,-10],[8,-18],[12,-22],[75,-91],[57,-98]],[[4225,6398],[20,-8],[12,0],[74,2],[13,-4],[10,-4],[8,-7],[5,-8],[3,-9],[3,-20],[3,-10],[8,-6],[9,-5],[39,-6],[49,-22],[24,-8],[14,-2],[15,0],[14,2],[11,3],[6,5],[-5,7],[-7,2],[-7,4],[4,5],[11,6],[23,3],[180,-7],[10,3],[7,6],[-5,10],[-15,14],[-5,8],[-3,9],[-5,8],[-7,6],[-12,2],[-27,1],[-13,3],[-45,16],[-8,4],[-3,3],[-1,5],[4,9],[3,13],[18,28],[3,14],[-2,11],[1,9],[9,7],[37,10],[22,2],[19,-1],[27,-6],[15,-2],[25,4],[7,5],[10,10],[14,22],[10,28],[12,13],[20,12],[46,17],[24,3],[17,-2],[16,-11],[8,-3],[8,2],[2,12],[-2,10],[1,10],[6,11],[23,12],[12,12],[10,18],[10,11],[22,9],[44,10],[22,10],[10,10],[10,13],[0,25]],[[5175,6776],[51,17],[40,-6],[105,-29],[28,-13],[15,-13],[0,-32],[-1,-10],[-4,-8],[-5,-7],[-6,-7],[-25,-3],[-29,-15],[-18,-19],[-2,-29],[15,-75],[6,-12],[35,-15],[-5,-21],[-16,-21],[-10,-8],[-16,-8],[-29,-28],[-17,-30],[23,-13],[10,-9],[-4,-43],[3,-16],[17,-8],[41,2],[16,-12],[28,14],[23,17],[18,19],[10,20],[65,-65],[21,-38],[6,-52],[-8,-15],[6,-22],[10,-12],[36,-18],[25,-16],[26,-17],[30,-36],[10,-35]],[[4674,7685],[2,-3],[13,-38],[-13,-14],[-17,-8],[-20,-13],[-31,-32],[-6,-15],[4,-8],[13,-1],[11,4],[18,11],[11,3],[13,0],[60,-11],[15,-11],[2,-10],[-1,-9],[-5,-9],[-4,-13],[-8,-47],[-6,-16],[-7,-11],[-10,-6],[-11,-4],[-12,-6],[-11,-10],[-12,-19],[-2,-13],[1,-11],[17,-52],[6,-10],[7,-7],[13,-4],[17,-8],[18,-14],[18,-40],[7,-27],[3,-38],[6,-21],[10,-29],[4,-16],[0,-14],[-7,-44],[-9,-30],[3,-11],[6,-7],[26,-12],[14,-13],[4,-13],[1,-17],[5,-9],[7,-8],[68,-36],[12,-3],[14,-1],[50,12],[14,0],[16,0],[14,-3],[12,-3],[10,-5],[9,-6],[66,-70],[19,-13],[34,-17]],[[2997,6920],[8,35],[3,36],[-13,37],[50,14],[50,33],[38,51],[15,66],[33,42],[76,6],[135,-21],[16,3],[12,9],[12,4],[25,-15],[39,-16],[36,-8],[50,-24],[33,-5],[110,0],[49,10],[45,24],[62,-31],[136,18],[63,-21],[13,-24],[6,-29],[14,-24],[63,-17],[26,-17],[47,-47],[29,16],[35,5],[73,-2],[0,17],[-32,11],[-41,8],[-35,14],[-14,28],[-14,19],[-34,15],[-41,8],[-34,0],[0,19],[15,12],[26,30],[20,10],[49,-16],[30,-5],[13,12],[26,11],[157,-20],[-35,31],[-41,21],[-42,13],[-43,4],[-45,-2],[-16,7],[-6,20],[12,26],[27,-7],[52,-28],[44,18],[-16,24],[-48,20],[-48,8],[-221,0],[-12,8],[-4,27],[10,19],[23,16],[27,12],[64,12],[259,121],[37,9],[13,8],[7,20],[2,50],[8,43],[16,-8],[17,-27],[6,-16],[9,-2],[3,-1],[2,-15],[64,30],[67,22],[5,1]],[[4446,8963],[-97,-20],[-48,2],[-37,18],[0,16],[5,11],[2,1],[-2,3],[-5,19],[33,16],[12,3],[-4,6],[-7,7],[-4,4],[20,15],[15,3],[14,-6],[12,-12],[35,-10],[28,-12],[19,-23],[9,-41]],[[5150,7672],[-3,1],[-4,1],[-124,8],[-45,-6],[-97,19],[-21,14]],[[4856,7709],[29,4],[101,46],[71,10],[0,19],[-74,2],[-33,10],[-29,24],[122,67],[-6,49],[104,63],[-7,62],[24,-10],[16,-11],[17,-10],[28,-3],[25,81],[12,22],[-7,5],[-2,1],[-2,2],[-4,8],[-43,-27],[-44,-15],[-152,-17],[-82,-44],[-46,-16],[0,15],[23,22],[3,23],[-15,18],[-32,8],[-34,-11],[-57,-49],[-57,-19],[-104,-76],[-30,-17],[-31,-12],[-33,-6],[0,16],[55,43],[33,18],[43,8],[30,19],[-7,36],[-28,22],[-33,-24],[-15,0],[7,56],[-29,0],[-37,-35],[-19,-48],[-11,-14],[-23,12],[-22,21],[-10,17],[3,12],[-3,9],[-17,5],[-15,-3],[-24,-11],[-13,-4],[-55,-2],[-26,-6],[-23,-35],[-29,5],[-45,21],[-168,1],[-39,16],[18,25],[-21,14],[-185,46],[-39,0],[7,9],[5,9],[7,9],[11,9],[0,15],[-28,12],[-15,18],[5,17],[31,7],[32,2],[27,9],[17,19],[6,30],[25,19],[159,76],[57,14],[224,-4],[117,-25],[60,-1],[0,16],[-156,25],[-42,28],[35,11],[100,3],[26,-7],[28,-30],[36,-29],[40,-15],[41,14],[-118,77],[-84,20],[-80,38],[-53,4],[9,24],[17,6],[22,0],[27,4],[22,11],[29,27],[25,14],[44,-29],[49,-3],[105,13],[124,-32],[46,-1],[0,17],[-39,4],[-49,14],[-36,27],[1,41],[32,22],[87,-10],[33,6],[-29,16],[-25,45],[-30,9],[-41,2],[-12,-2],[-9,-11],[-3,-18],[-1,-16],[-2,-8],[-63,2],[-52,37],[-41,51],[-28,48],[29,13],[21,-7],[21,-14],[29,-8],[31,3],[30,7],[55,24],[-66,18],[-50,32],[-85,69],[0,19],[19,12],[23,6],[26,-3],[25,-15],[23,25],[6,10],[-14,0],[11,35],[18,6],[22,-1],[25,10],[44,61],[16,9],[21,-15],[6,-59],[21,-12],[13,10],[14,47],[19,13],[-25,74],[-9,44],[10,20],[26,16],[35,78],[22,27],[35,1],[126,-36],[40,6],[69,23],[36,6],[-14,-22],[-15,-17],[-11,-16],[-5,-24],[11,-12],[27,14],[66,62],[135,56],[44,10],[31,20],[20,41],[27,37],[51,5],[59,-29],[-18,-28],[-102,-46],[0,-17],[94,33],[14,-6],[15,-13],[34,2],[35,10],[21,10],[31,-36],[0,-16],[-9,-29],[19,5],[33,17],[34,7],[-11,-24],[-17,-17],[-23,-9],[-26,-3],[0,-17],[41,1],[25,-5],[19,1],[23,20],[26,46],[-6,27],[-51,48],[-13,51],[35,31],[59,28],[56,45],[6,-13],[2,-1],[9,-5],[-51,-118],[-4,-18],[5,-5],[7,-10],[11,-12],[15,-8],[20,0],[22,16],[21,3],[29,-9],[47,-21],[42,-25],[19,-24],[4,-9],[19,-33],[7,-18],[-1,-18],[-11,-45],[-3,-23],[17,22],[35,67],[16,14],[8,18],[-14,40],[-21,39],[-11,16],[-3,24],[-11,33],[-19,28],[-28,8],[-17,-18],[4,-36],[15,-39],[14,-27],[-31,4],[-22,14],[-18,18],[-21,16],[-65,12],[-27,16],[8,32],[61,80],[0,15],[79,-9],[36,9],[79,44],[28,7],[38,-9],[24,-25],[18,-25],[19,-11],[12,-18],[-4,-40],[-10,-38],[-5,-15],[12,-22],[29,-17],[64,-21],[1,-30],[18,-33],[26,-28],[25,-12],[30,-19],[5,-41],[-13,-42],[-22,-19],[-34,-6],[-26,-15],[-41,-32],[-121,-51],[0,-18],[133,17],[43,-15],[-24,-53],[-26,-19],[-111,-52],[-74,-68],[-31,-18],[0,-17],[44,9],[40,18],[212,134],[23,4],[20,27],[44,14],[52,8],[38,11],[29,31],[14,41],[-10,35],[-41,15],[-11,11],[10,23],[23,35],[0,61],[-16,4],[-89,90],[-53,29],[-17,14],[-10,17],[-8,27],[0,25],[50,29],[24,44],[6,51],[-24,40],[38,-3],[32,-10],[32,-3],[35,16],[-6,8],[-2,6],[-1,7],[-5,13],[44,-25],[48,-19],[49,1],[85,60],[45,9],[45,-14],[34,-46],[-47,-2],[-15,2],[43,-21],[49,-15],[49,-1],[45,21],[-143,74],[-67,55],[-5,59],[-59,23],[-27,15],[-19,17],[35,15],[40,-6],[76,-28],[153,-36],[37,-4],[85,-30],[30,-16],[115,-114],[33,-19],[111,-34],[84,-9],[101,-28],[46,-23],[50,14],[31,-38],[-7,-52],[-67,-26],[-62,-8],[-75,-21],[-71,-30],[-75,-49],[-73,-25],[-61,-12],[-29,-18],[-98,-89],[-35,-41],[-28,-47],[-5,-10],[-43,-11],[-20,-16],[-17,-17],[-18,-14],[-143,-14],[-26,-13],[-23,-17],[-63,-64],[10,-22],[-6,-4],[-12,-3],[-9,-18],[13,-64],[-3,-21],[-16,-17],[-3,-4],[-44,-12],[-19,-15],[-8,-30],[9,-64],[0,-26],[-23,-54],[-35,-45],[-162,-132],[-14,-34],[-4,-63],[7,-18],[12,-9],[0,-5],[-29,-9],[-23,1],[-42,15],[-67,-13],[-77,14],[-39,-16],[-78,-50],[-76,-29],[-76,-3],[-74,25],[-63,37],[-31,1],[-76,-51],[-111,-36],[37,-20],[13,-5],[-17,-38],[19,-26],[36,-16],[39,-7],[19,-8],[22,-32],[18,-12],[18,-1],[35,18],[17,3],[31,-12],[71,-42],[35,-9],[37,12],[35,17],[24,-4],[6,-49],[0,-1],[0,-1],[-93,-20],[-222,-139],[-85,-23],[-88,3],[-169,26],[-47,-35],[-45,-44],[-27,-37],[-12,-10],[-25,-16],[-55,-22],[-118,-23],[-41,-15]],[[5150,7672],[-12,-4],[28,-18],[7,-19],[4,-20],[22,-21],[53,-39],[95,-89],[52,-36],[56,-20],[65,0],[48,-79],[29,-36],[38,-29],[20,-5]],[[5655,7257],[-13,-12],[-20,-16],[-26,-16],[-6,-5],[-5,-6],[-3,-10],[-5,-8],[-5,-8],[-8,-7],[-37,-25],[-8,-4],[-11,-3],[-12,-2],[-14,1],[-12,3],[-14,0],[-11,-2],[-10,-5],[-8,-6],[-7,-7],[-3,-9],[4,-11],[39,-55],[5,-12],[-1,-10],[-6,-8],[-8,-8],[-10,-10],[-4,-8],[3,-7],[8,-2],[19,-1],[44,5],[12,-1],[10,-3],[37,-17],[19,-6],[49,-7],[30,-15],[257,-169],[18,-4],[11,3],[2,10],[5,8],[7,7],[10,4],[14,0],[14,-3],[38,-16],[18,-4],[26,-3],[18,-7],[99,-62],[43,-35],[31,-14],[61,-38],[39,-39],[15,-4],[13,-1],[12,0],[12,-4],[11,-9],[7,-9],[5,-10],[3,-12],[2,-46],[2,-6],[8,-14],[4,-9],[-2,-12],[-6,-15],[-32,-44],[-12,-42]],[[6420,6335],[-89,6],[-43,-16],[-47,-29],[-8,-11],[-55,-44],[-90,-54],[-35,-25],[-20,-20],[-1,-11],[-2,-10],[-2,-22],[-3,-10],[-8,-20],[-6,-11],[-11,-15],[-13,-5],[-14,-1],[-28,2],[-26,-2],[-13,3],[-9,5],[-14,16],[-9,7],[-15,4],[-8,-4],[-3,-8],[0,-21],[-3,-12],[-7,-6],[-5,-1],[-8,4],[-6,5],[-6,8],[-4,8],[-7,8],[-30,5],[-73,-29]],[[4674,7685],[182,24]],[[6420,6335],[40,-48],[9,-10],[13,-9],[34,-6],[15,-7],[13,-19],[7,-13],[2,-11],[-2,-7],[-10,-4],[-12,-2],[-10,-3],[-8,-7],[-6,-8],[-10,-16],[-4,-9],[1,-8],[7,-6],[17,-1],[16,1],[52,12],[13,1],[28,0],[46,-7],[14,-8],[15,-13],[21,-29],[9,-17],[4,-15],[1,-11],[2,-9],[30,-28],[121,-71]],[[3851,3158],[-41,1],[-145,40],[-74,11],[-145,-16],[-38,5],[-25,12],[-3,16],[29,17],[0,17],[-10,22],[4,30],[-6,26],[-34,10],[19,20],[25,33],[17,14],[-59,-11],[-70,-26],[-52,-34],[-5,-32],[-72,-95],[-198,-184],[-42,-15],[-198,-16],[-12,-7],[-35,-34],[-22,-11],[-28,-2],[-28,2],[-27,7],[-23,11],[36,22],[48,22],[37,26],[0,34],[-71,-30],[-163,-36],[-113,-2],[-48,6],[-43,13],[-19,22],[-15,14],[-77,8],[-30,21],[12,39],[-25,14],[-81,-1],[0,-18],[21,-5],[18,-10],[14,-15],[9,-20],[-168,-54],[-99,-15],[-48,-15],[-21,-29],[-7,-35],[-17,-5],[-21,10],[-16,4],[-59,-30],[-399,-39],[0,16],[41,13],[94,47],[115,21],[452,299],[-6,10],[-9,25],[24,8],[32,18],[21,8],[29,6],[70,-6],[25,3],[41,13],[25,3],[22,10],[9,24],[7,28],[17,24],[-12,10],[0,2],[6,3],[6,18],[-17,19],[24,9],[24,16],[23,20],[21,23],[13,23],[7,19],[8,16],[19,11],[0,17],[4,34],[138,91],[25,49],[-42,9],[-175,-6],[-58,14],[63,44],[26,23],[66,76],[21,18],[25,12],[-17,17],[119,155],[48,36],[37,42],[31,54],[39,44],[47,13],[53,-21],[104,-68],[49,-14],[43,11],[46,20],[49,9],[53,-22],[7,41],[-32,22],[-98,22],[0,19],[131,17],[34,-10],[69,-38],[43,-4],[0,3]],[[1458,551],[16,0],[22,4],[18,-9],[-18,-18],[-14,-5],[-175,-41],[-24,7],[-34,13],[6,25],[32,19],[43,11],[52,3],[76,-9]],[[5856,1404],[-3,-5],[-2,-60],[-6,-21],[-29,-34],[-33,-26],[-37,-16],[-47,-3],[66,-42],[27,-8],[-25,-25],[-50,-15],[-93,-15],[-117,-36],[-33,-31],[42,-34],[-37,-15],[-168,-25],[-85,-23],[-140,-10],[-62,4],[-25,-1],[-23,1],[-9,9],[6,18],[15,13],[19,9],[21,4],[-5,9],[-11,24],[33,4],[31,9],[30,15],[28,24],[-14,5],[-11,6],[-14,5],[-22,1],[17,33],[11,10],[18,9],[-11,21],[-15,6],[-17,-8],[-19,-19],[-29,14],[-46,7],[-91,-3],[0,16],[-19,13],[-39,-6],[-41,-14],[-41,-9],[-92,4]],[[4642,1151],[94,-9],[55,-30],[-40,-79],[83,5],[26,-5],[0,-16],[-15,0],[0,-19],[20,-11],[9,-4],[-32,-6],[-15,-5],[-14,-8],[78,0],[-39,-42],[-7,-10],[3,-13],[9,-13],[5,-14],[-9,-20],[-74,-58],[-24,-26],[-60,-23],[-84,-15],[-28,-14],[-29,-29],[-14,28],[-31,21],[-36,10],[-27,-6],[33,-18],[11,-29],[-10,-28],[-34,-14],[-16,51],[-47,19],[-103,0],[0,-15],[23,-10],[45,-3],[24,-6],[20,16],[14,3],[10,-19],[-5,-14],[-15,-12],[-19,-7],[-14,-3],[-34,-60],[-6,-16],[2,-27],[11,-38],[4,-29],[-28,17],[-32,51],[-31,18],[-37,2],[-110,-21],[-266,19],[32,-25],[37,-10],[82,0],[0,-19],[-15,-7],[-14,-10],[46,-15],[-25,-16],[-14,-19],[-2,-23],[10,-29],[-84,8],[-20,-10],[-16,9],[-16,17],[-18,11],[-82,0],[-23,4],[-17,7],[-15,1],[-15,-12],[-45,14],[-32,-29],[-23,-43],[-22,-30],[-78,-18],[-13,-6],[-9,-27],[-20,6],[-19,19],[-6,11],[-15,5],[-44,23],[-25,6],[-26,-2],[-34,-14],[-123,-18],[-28,7],[-50,22],[-28,5],[0,-19],[9,-3],[20,-12],[-18,-29],[-28,-22],[-34,-14],[-34,-4],[-58,10],[-18,-4],[7,-25],[0,-16],[-32,-1],[-15,-16],[-11,-20],[-18,-16],[-25,-2],[-20,7],[-20,5],[-27,-10],[-1,17],[-5,12],[-5,11],[-5,13],[-61,-27],[-5,-22],[-13,-4],[-17,1],[-19,-10],[-26,-17],[-31,-7],[-72,-1],[26,12],[21,13],[16,18],[15,26],[-32,-16],[-27,-9],[-8,9],[20,34],[24,22],[55,27],[27,19],[-6,5],[-3,2],[-2,3],[-5,8],[-19,-13],[-71,-31],[-9,-14],[-21,-18],[-46,-28],[-27,25],[3,24],[15,28],[9,36],[-16,16],[-36,13],[-41,5],[-29,-10],[19,-30],[-64,-21],[-158,-25],[-9,-10],[-3,-25],[-8,-8],[-39,2],[-15,-2],[-43,-29],[-25,-7],[-38,0],[-3,25],[-27,29],[-32,12],[-15,-22],[-121,-78],[14,-11],[6,-4],[10,-2],[-152,-52],[6,28],[-20,-5],[-64,-42],[-15,19],[-15,-19],[3,33],[4,11],[8,11],[0,16],[-19,4],[-10,6],[-16,24],[48,11],[41,20],[79,57],[41,19],[78,15],[49,17],[39,23],[98,79],[42,23],[80,26],[47,22],[-103,7],[-431,-155],[-139,-7],[94,43],[21,7],[21,10],[16,24],[20,24],[87,22],[275,104],[30,33],[73,7],[83,31],[82,13],[65,21],[5,41],[10,12],[10,15],[10,7],[0,16],[-32,11],[-34,-14],[-38,-11],[-52,29],[-19,-1],[-9,3],[-2,10],[4,32],[-2,10],[-14,10],[-19,11],[-22,9],[-22,6],[9,-33],[-3,-23],[2,-22],[24,-27],[-45,-8],[-31,-16],[-61,-45],[-44,-19],[-47,-11],[-146,-11],[-77,-23],[-281,-28],[-92,-29],[-33,-18],[-4,-7],[0,-9],[-2,-10],[-8,-9],[-12,-6],[-140,-32],[-54,-31],[-26,3],[-43,13],[-23,3],[-103,-9],[-50,-16],[-39,-28],[-15,19],[17,9],[5,14],[1,15],[7,14],[14,7],[152,29],[34,15],[0,11],[-3,3],[-5,-1],[-7,3],[8,31],[-17,18],[-33,7],[-35,-1],[29,31],[48,7],[91,-5],[49,14],[104,71],[0,19],[-91,0],[38,46],[70,38],[77,27],[59,10],[-7,-12],[-12,-26],[-12,-14],[40,6],[37,13],[15,15]],[[5655,7257],[17,-4],[88,-9],[32,-17],[15,-40],[9,-111],[29,-39],[44,-18],[122,-11],[133,6],[40,-5],[160,-80],[16,-16],[4,-23],[7,-21],[26,-12],[238,-38],[48,7],[92,48],[55,-3],[-24,-22],[7,-4],[23,3],[18,-4],[17,-22],[4,-11],[10,-2],[33,6],[108,-25],[23,2]]],"transform":{"scale":[0.0004485108340834025,0.0003966583181317965],"translate":[-10.478179490999878,51.42019277600018]}};
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
