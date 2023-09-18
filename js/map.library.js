/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};
pxWidget.map = {};
pxWidget.map.metadata = {};
pxWidget.map.ajax = {};
pxWidget.map.callback = {};
pxWidget.map.geojson = [];
pxWidget.map.jsonstat = [];
pxWidget.map.values = [];


/**
 * Draw a pxWidget Chart
 * @param {*} id 
 */
pxWidget.map.draw = async function (id) {
    //retain height of div if widget redrawn for smooth rendering
    var height = pxWidget.jQuery('#' + id).height();
    if (height) {
        pxWidget.jQuery('#' + id).height(height);
    }
    // Init & Spinner
    pxWidget.draw.spinner(id);
    if (!pxWidget.map.metadata.compile(id)) {
        return;
    }

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
    var config = {
        valueProperty: 'value',
        scale: ['antiquewhite', pxWidget.draw.params[id].colorScale],
        steps: 5,
        style: {
            color: '#6d7878',
            weight: pxWidget.draw.params[id].borders ? 0.2 : 0,
            fillOpacity: 0.6
        },
        onEachFeature: function (feature, layer) {

            var decimal = feature.properties.statistic ? pxWidget.map.jsonstat[id].Dimension({ role: "metric" })[0].Category(feature.properties.statistic).unit.decimals : null;
            var value = null;
            var tooltipTitle = pxWidget.draw.params[id].tooltipTitle ? "<b>" + pxWidget.draw.params[id].tooltipTitle + "</b><br>" : "";
            if (!feature.properties.value) {
                layer.setStyle({
                    "fill": false
                })
            }

            value = feature.properties.value || feature.properties.value === 0 ? pxWidget.formatNumber(feature.properties.value.toLocaleString(), decimal) : pxWidget.draw.params[id].defaultContent;

            layer.bindPopup(
                tooltipTitle +
                feature.properties.name + " (" + feature.properties.time + ")" + ' : <b>' +
                value + '</b> (' + feature.properties.unit + ')'
            )
            layer.on('mouseover', function (e) {
                var popupAnchor = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng
                }

                layer.setStyle({
                    "weight": 2
                })
                this.openPopup(popupAnchor);
                //  this.openPopup();
            });
            layer.on('mouseout', function (e) {
                layer.setStyle({
                    "weight": pxWidget.draw.params[id].borders ? 0.2 : 0
                })
            });
        }
    };
    //merge custom config

    pxWidget.jQuery.extend(true, config, pxWidget.draw.params[id].options);

    if (geometryType == "MultiPolygon" || geometryType == "Polygon") {
        choroplethLayer = pxWidget.L.choropleth(pxWidget.map.geojson[id], config);
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

    //find the edges of the geojson to set the max bounds, add extra so user can always see some of the geoJson
    var enveloped = pxWidget.turf.envelope(pxWidget.map.geojson[id]);
    var height = (enveloped.bbox[1] - enveloped.bbox[3]);
    var width = (enveloped.bbox[0] - enveloped.bbox[2]);

    var fullscreen = false;
    //check if full screen is enabled on the device
    if (document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.msFullscreenEnabled) {
        fullscreen = true;
    };
    //remove div height for smooth rendering
    pxWidget.jQuery('#' + id).height("auto");
    var map = pxWidget.L.map("pxwidget-canvas-wrapper-" + id, {
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        attributionControl: false,
        fullscreenControl: fullscreen,
        fullscreenControlOptions: {
            position: 'topleft',
            title: pxWidget.draw.params[id].fullScreen.title, // change the title of the button, default Full Screen
            titleCancel: pxWidget.draw.params[id].fullScreen.titleCancel,
        },
        tap: false, // ref https://github.com/Leaflet/Leaflet/issues/7255
        renderer: pxWidget.L.canvas(),
        layers: [choroplethLayer || heatmapLayer],
        maxBounds: [
            [enveloped.bbox[1] + (height / 2), enveloped.bbox[2] - (width / 2)],
            [enveloped.bbox[3] - (height / 2), enveloped.bbox[0] + (width / 2)]
        ]
    });
    var dateUpdated = "";
    if (pxWidget.map.jsonstat[id].updated) {
        dateUpdated = pxWidget.moment(pxWidget.map.jsonstat[id].updated, 'YYYY-MM-DDTHH:mm:ss').format('MMMM DD, YYYY') + " " + pxWidget.moment(pxWidget.map.jsonstat[id].updated, 'YYYY-MM-DDTHH:mm:ss').format('HH:mm:ss') + " UTC";
    }
    var localAttribution = "<br>" + dateUpdated;
    localAttribution += pxWidget.draw.params[id].link ? " <a target='_blank' href='" + pxWidget.draw.params[id].link + "'>" + pxWidget.draw.params[id].link + "</a> <br>" : "<br>";
    localAttribution += pxWidget.draw.params[id].copyright ? '&copy; ' + pxWidget.map.jsonstat[id].extension.copyright.name : "";

    var attribution = pxWidget.L.control.attribution();
    attribution.addAttribution(localAttribution);
    attribution.addTo(map);

    //add baselayers
    //if leaflet baselayers passed in snippet use these only, otherwise use the default 
    if (pxWidget.draw.params[id].baseMap.leaflet.length) {
        pxWidget.jQuery.each(pxWidget.draw.params[id].baseMap.leaflet, function (index, value) {
            pxWidget.L.tileLayer(value.url, value.options).addTo(map);
        });
    }
    else {
        pxWidget.jQuery.each(pxWidget.config.baseMap.leaflet, function (index, value) {
            pxWidget.L.tileLayer(value.url, value.options).addTo(map);
        });
    }

    //if optional esri baselayers are passed in snippet, layer these over leaflet baselayers
    if (pxWidget.draw.params[id].baseMap.esri.length) {
        pxWidget.jQuery.each(pxWidget.draw.params[id].baseMap.esri, function (index, value) {
            pxWidget.L.esri.tiledMapLayer(value).addTo(map);
        });
    }



    if (heatmapData) {
        heatmapLayer.setData(heatmapData);
    }
    var allFeatures = pxWidget.L.geoJson(pxWidget.map.geojson[id]);
    map.fitBounds(allFeatures.getBounds());
    map.setMinZoom(map.getZoom());

    map.on('mouseout', function (e) {
        this.closePopup();
    });

    if (choroplethLayer) {
        // Add legend
        var legend = pxWidget.L.control({ position: 'topright' })
        legend.onAdd = function (map) {
            var div = pxWidget.L.DomUtil.create('div', 'info leaflet-legend')
            var limits = choroplethLayer.options.limits;
            var colors = choroplethLayer.options.colors;
            var labels = [];

            if (pxWidget.map.values[id][0].every(element => element === null) == true) {
                // Add min & max
                div.innerHTML = '<div class="labels"><div class="min">' + 0 + '</div> \
 <div class="max">' + 0 + '</div></div>'
            }
            else {
                // Add min & max
                div.innerHTML = '<div class="labels"><div class="min">' + pxWidget.formatNumber(Math.floor(limits[0])) + '</div> \
   <div class="max">' + pxWidget.formatNumber(Math.ceil(limits[limits.length - 1])) + '</div></div>'
            }




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
        "pxWidget.map.callback.readDatasetOnSuccess",
        id,
        "pxWidget.map.callback.readDatasetOnError",
        id,
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


pxWidget.map.callback.readDatasetOnSuccess = function (response, id) {
    pxWidget.draw.params[id].data.datasets[0].api.response = response;
};

pxWidget.map.callback.readDatasetOnError = function (error, id) {
    pxWidget.draw.error(id, 'pxWidget.map.ajax.readDataset: Unable to retreive data. Please try again later.', true);
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
                if (typeof response != "object") {
                    response = JSON.parse(response)
                }
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

pxWidget.map.metadata.compile = function (id) {

    //If no fluid, no need to read metadata
    if (!pxWidget.draw.params[id].data.datasets[0].fluidTime || !pxWidget.draw.params[id].data.datasets[0].fluidTime.length) {
        return true;
    }

    //is fluid, need to get metadata
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.response)) {
        pxWidget.map.ajax.readMetadata(id);
        // Avoid self-looping
        return false;
    }
    else {
        return true;
    }

};

pxWidget.map.ajax.readMetadata = function (id) {
    // Check data query exists
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.query)) {
        pxWidget.draw.error(id, 'pxWidget.map.ajax.readMetadata: missing data query');
        return;
    }

    pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].metadata.api.query.url,
        pxWidget.draw.params[id].metadata.api.query.data.method,
        pxWidget.draw.params[id].metadata.api.query.data.params,
        "pxWidget.map.callback.readMetadataOnSuccess",
        id,
        "pxWidget.map.callback.readMetadataOnError",
        id,
        { async: false },
        id)
};

pxWidget.map.callback.readMetadataOnSuccess = function (response, id) {
    if (pxWidget.jQuery.isEmptyObject(response)) {
        pxWidget.draw.error(id, 'pxWidget.map.callback.readMetadataOnSuccess: missing data response');
    } else {
        pxWidget.draw.params[id].metadata.api.response = response;
        var metadataJsonStat = pxWidget.draw.params[id].metadata.api.response ? new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].metadata.api.response) : null;

        if (metadataJsonStat && metadataJsonStat.length) {
            //Have metadata now, use metadata to get fluid timepoints are replace in query
            var timeDimensionCode = null;
            pxWidget.jQuery.each(metadataJsonStat.Dimension(), function (index, value) {
                if (value.role == "time") {
                    timeDimensionCode = metadataJsonStat.id[index];
                    return;
                }
            });
            var dimensionSize = metadataJsonStat.Dimension(timeDimensionCode).id.length;
            var relativeTimecode = metadataJsonStat.Dimension(timeDimensionCode).id[(dimensionSize - pxWidget.draw.params[id].data.datasets[0].fluidTime[0]) - 1]
            pxWidget.draw.params[id].data.datasets[0].api.query.data.params.dimension[timeDimensionCode].category.index = [relativeTimecode];

        }
        else {
            pxWidget.draw.error(id, 'pxWidget.map.metadata.compile: invalid data response');
        }
        // Restart the drawing after successful compilation
        pxWidget.map.draw(id);
    }
};

pxWidget.map.callback.readMetadataOnError = function (error, id) {
    pxWidget.draw.error(id, 'pxWidget.map.ajax.readMetadata: Unable to retreive data. Please try again later.', true);
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
    //remove features from geoJSON that are not in the classification
    pxWidget.map.geojson[id].features = pxWidget.jQuery.grep(pxWidget.map.geojson[id].features, function (el, i) {
        if (pxWidget.jQuery.inArray(el.properties.code, geoDimension.id) == -1) {
            return false;// feature not in classification so remove
        }
        return true; // keep the element in the array
    });
    pxWidget.map.values[id] = []
    var allValues = [];
    pxWidget.jQuery.each(pxWidget.map.geojson[id].features, function (index, feature) {

        var guid = feature.properties.code;

        dataQueryObj[mapToDisplayId] = guid;
        var featureValue = pxWidget.map.jsonstat[id].Data(dataQueryObj).value;
        feature.properties.value = featureValue;
        allValues.push(featureValue);
        feature.properties.statistic = dataQueryObj.STATISTIC;

        feature.properties.unit = pxWidget.map.jsonstat[id].Dimension({ role: "metric" })[0].Category(dataQueryObj.STATISTIC).unit.label;
        //add name of feature to geoJOSN properties from JSONstat metadata
        feature.properties.name = geoDimension.Category(guid).label;
        var timeDimensionCode = null;
        pxWidget.jQuery.each(pxWidget.map.jsonstat[id].Dimension(), function (index, value) {
            if (value.role == "time") {
                timeDimensionCode = pxWidget.map.jsonstat[id].id[index];
                return;
            }
        });
        feature.properties.time = pxWidget.map.jsonstat[id].Dimension(timeDimensionCode).Category(dataQueryObj[timeDimensionCode]).label;
    });
    pxWidget.map.values[id].push(allValues);
};