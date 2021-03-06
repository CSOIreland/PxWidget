/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};
pxWidget.map = {};
pxWidget.map.ajax = {};
pxWidget.map.callback = {};
pxWidget.map.geojson = [];
pxWidget.map.jsonstat = [];


/**
 * Draw a pxWidget Chart
 * @param {*} id 
 */
pxWidget.map.draw = async function (id) {
    // Init & Spinner
    pxWidget.draw.spinner(id);

    if (!pxWidget.map.compile(id)) {
        return;
    }

    /*
Fix issue when we only have to retreive geoJSON data and not PxStat data, autoupdate false
Simulate an async sleep. 
The parent outer function must be async
*/
    await new Promise(resolve => setTimeout(resolve, 400));

    //create title if required
    if (pxWidget.draw.params[id].title) {
        var title = pxWidget.jQuery('<h4>', {
            "class": "pxwidget-map-title",
            "text": pxWidget.draw.params[id].title
        });
        // Append title
        pxWidget.jQuery('#' + id).append(title);
    }

    // Create canvas in parent div
    var wrapper = pxWidget.jQuery('<div>', {
        "id": "pxwidget-canvas-wrapper-" + id,
        "class": "pxwidget-canvas-wrapper"
    });

    // Append canvas
    pxWidget.jQuery('#' + id).append(wrapper);


    //find out if it's polygon/multipolygon or points
    var geometryType = pxWidget.map.geojson[id].features[0].geometry.type;
    var choroplethLayer = null;
    var heatmapLayer = null;
    var heatmapData = null;
    if (geometryType == "MultiPolygon" || geometryType == "Polygon") {
        choroplethLayer = pxWidget.L.choropleth(pxWidget.map.geojson[id], {
            valueProperty: 'value',
            scale: ['white', 'red'],
            steps: 5,
            mode: 'q',
            style: {
                color: '#6d7878',
                weight: pxWidget.draw.params[id].borders ? 0.2 : 0,
                fillOpacity: 0.6
            },
            onEachFeature: function (feature, layer) {
                var value = null;
                if (feature.properties.valueIsNull) {
                    value = "..";
                }
                else {
                    value = feature.properties.value.toLocaleString();
                }
                layer.bindPopup(
                    feature.properties.name + ' : <b>' +
                    value + '</b>'
                )
                layer.on('mouseover', function (e) {
                    var center = pxWidget.turf.center(feature);
                    var popupAnchor = {
                        lat: center.geometry.coordinates[1],
                        lng: center.geometry.coordinates[0]
                    }
                    layer.setStyle({
                        "weight": 2
                    })
                    this.openPopup(popupAnchor);
                });
                layer.on('mouseout', function (e) {
                    layer.setStyle({
                        "weight": pxWidget.draw.params[id].borders ? 0.2 : 0
                    })
                    this.closePopup();
                });
            }
        });
    }
    else if (geometryType == "Point") {

        /*******************************************************************************
#TODO: Need to find a good way to display point data on a map
This prototype is based on https://www.patrick-wied.at/static/heatmapjs/plugin-leaflet-layer.html but not fully suitable for production yet 
heatmapData = {
            max: pxWidget.map.geojson[id].features.length,
            data: []
        };

        pxWidget.jQuery.each(pxWidget.map.geojson[id].features, function (index, value) {
            heatmapData.data.push(
                {
                    lat: value.geometry.coordinates[1],
                    lng: value.geometry.coordinates[0],
                    value: value.properties.value
                }
            )
        });

        heatmapLayer = new HeatmapOverlay({
            // radius should be small ONLY if scaleRadius is true (or small radius is intended)
            // if scaleRadius is false it will be the constant radius used in pixels
            "radius": .2,
            "maxOpacity": .8,
            // scales the radius based on map zoom
            "scaleRadius": true,
            // if set to false the heatmap uses the global maximum for colorization
            // if activated: uses the data maximum within the current map boundaries
            //   (there will always be a red spot with useLocalExtremas true)
            "useLocalExtrema": true,
            // which field name in your data represents the latitude - default "lat"
            latField: 'lat',
            // which field name in your data represents the longitude - default "lng"
            lngField: 'lng',
            // which field name in your data represents the data value - default "value"
            valueField: 'value'
        });

*******************************************************************************/


    };

    var dataLink = pxWidget.draw.params[id].link ? "<br><a target='_blank' href='" + pxWidget.draw.params[id].link + "'>" + pxWidget.draw.params[id].link + "</a>" : "";
    var copyright = pxWidget.draw.params[id].copyright ? '<br>&copy; ' + pxWidget.map.jsonstat[id].extension.copyright.name : "";
    var attribution = 'Google Maps' + "<br>" + pxWidget.map.jsonstat[id].updated + dataLink + copyright
    var baseLayer = pxWidget.L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: attribution
    });

    var map = pxWidget.L.map("pxwidget-canvas-wrapper-" + id, {
        renderer: pxWidget.L.canvas(),
        fullscreenControl: true,
        fullscreenControlOptions: pxWidget.draw.params[id].fullScreen,
        layers: [baseLayer, choroplethLayer || heatmapLayer]
    });
    if (heatmapData) {
        heatmapLayer.setData(heatmapData);
    }
    var allFeatures = pxWidget.L.geoJson(pxWidget.map.geojson[id]);

    map.fitBounds(allFeatures.getBounds());
    if (choroplethLayer) {
        // Add legend
        var legend = pxWidget.L.control({ position: 'bottomleft' })
        legend.onAdd = function (map) {
            var div = pxWidget.L.DomUtil.create('div', 'info leaflet-legend')
            var limits = choroplethLayer.options.limits
            var colors = choroplethLayer.options.colors
            var labels = []

            // Add min & max
            div.innerHTML = '<div class="labels"><div class="min">' + Math.round(limits[0]) + '</div> \
   <div class="max">' + Math.round(limits[limits.length - 1]) + '</div></div>'

            limits.forEach(function (limit, index) {
                labels.push('<li style="background-color: ' + colors[index] + '"></li>')
            })

            div.innerHTML += '<ul>' + labels.join('') + '</ul>'
            return div
        }
        legend.addTo(map);
    };

    // Run optional callback at last
    if (pxWidget.draw.callback[id]) {
        pxWidget.draw.callback[id]();
    }
};

pxWidget.map.ajax.readDataset = function (id) {

    var args = [];

    // Check all data queries exist
    var allDataQueriesExist = true;
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.datasets[0].api.query)) {
        allDataQueriesExist = false;
        pxWidget.draw.error(id, 'pxWidget.map.ajax.readDataset: missing data query');
        return false;
    }

    if (!allDataQueriesExist)
        return;

    // Read dataset/series
    args.push(pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].data.datasets[0].api.query.url,
        pxWidget.draw.params[id].data.datasets[0].api.query.data.method,
        pxWidget.draw.params[id].data.datasets[0].api.query.data.params,
        "pxWidget.map.callback.readDataset",
        id,
        null,
        null,
        { async: false },
        id));


    if (args.length) {
        pxWidget.jQuery.when.apply(this, args).done(function () {
            var hasCompiled = true;

            if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.datasets[0].api.response)) {
                return hasCompiled = false;
            }

            if (hasCompiled) {
                // Restart the drawing after successful compilation
                pxWidget.map.draw(id);
            } else
                pxWidget.draw.error(id, 'pxWidget.map.ajax.readDataset: missing data response');
        });
    }
};


pxWidget.map.callback.readDataset = function (response, id) {
    pxWidget.draw.params[id].data.datasets[0].api.response = response;
};

pxWidget.map.compile = function (id) {
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.datasets[0].api.response)) {
        pxWidget.map.ajax.readDataset(id);
        // Avoid self-looping
        return false;
    }

    //get datasets data
    var isValidData = true;

    //store jsonStat for later use
    pxWidget.map.jsonstat[id] = pxWidget.draw.params[id].data.datasets[0].api.response ? new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].data.datasets[0].api.response) : null;

    if (pxWidget.map.jsonstat[id] && pxWidget.map.jsonstat[id].length) {
        // Run the Ajax call
        pxWidget.jQuery.ajax({
            url: pxWidget.map.jsonstat[id].Dimension(pxWidget.draw.params[id].mapDimension).link.enclosure[0].href,
            method: 'GET',
            dataType: 'json',
            async: false,
            success: function (response) {
                pxWidget.map.geojson[id] = response;
                pxWidget.map.addValues(id);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                pxWidget.draw.error(id, 'pxWidget.map.compile: invalid geoJSON url');
            }
        });
        return isValidData;
    } else {
        pxWidget.draw.error(id, 'pxWidget.map.compile: invalid data response');
        isValidData = false;
        return isValidData;
    }
};

pxWidget.map.addValues = function (id) {
    var mapToDisplayId = pxWidget.draw.params[id].mapDimension;
    var dataQueryObj = {};
    //var data = pxWidget.draw.params[id].data.datasets[0].api.response ? new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].data.datasets[0].api.response) : null;

    pxWidget.jQuery.each(pxWidget.map.jsonstat[id].Dimension(), function (indexDimension, valueDimension) {
        if (pxWidget.map.jsonstat[id].id[indexDimension] != mapToDisplayId) {
            dataQueryObj[pxWidget.map.jsonstat[id].id[indexDimension]] = valueDimension.id[0];
        }
    });
    var geoDimension = pxWidget.map.jsonstat[id].Dimension(mapToDisplayId);

    pxWidget.jQuery.each(pxWidget.map.geojson[id].features, function (index, value) {
        var guid = value.properties.code;

        dataQueryObj[mapToDisplayId] = guid
        if (pxWidget.map.jsonstat[id].Data(dataQueryObj).value === null) {
            value.properties.value = 0;
            value.properties.valueIsNull = true;
        }
        else {
            value.properties.value = pxWidget.map.jsonstat[id].Data(dataQueryObj).value;
            value.properties.valueIsNull = false;
        }
        //add name of feature to geoJOSN properties from JSONstat metadata
        value.properties.name = geoDimension.Category(guid).label;
    });
};