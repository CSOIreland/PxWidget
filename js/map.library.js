/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};
pxWidget.map = {};
pxWidget.map.easyPrint = {};
pxWidget.map.metadata = {};
pxWidget.map.ajax = {};
pxWidget.map.callback = {};
pxWidget.map.geojson = [];
pxWidget.map.jsonstat = [];
pxWidget.map.values = [];
pxWidget.map.minValue = [];
pxWidget.map.maxValue = [];

const geometryTypeMultiPolygon = "MultiPolygon";
const geometryTypePolygon = "Polygon";
const geometryTypePoint = "Point";




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
    pxWidget.draw.params[id].options.geometryType = geometryType;
    var choroplethLayer = null;
    var pointLayer = null;
    var markerLayer = null;
    var coloursUsed = [];

    if (geometryType == geometryTypeMultiPolygon || geometryType == geometryTypePolygon) {

        var polygonConfig = {
            valueProperty: 'value',
            scale: ['antiquewhite', pxWidget.draw.params[id].colorScale],
            colors: pxWidget.map.values[id][0].length == 1 ? [pxWidget.draw.params[id].colorScale] : null,
            steps: pxWidget.map.values[id][0].length >= pxWidget.config.map.choroplethMap.steps ? pxWidget.config.map.choroplethMap.steps : pxWidget.map.values[id][0].length,
            style: {
                color: '#6d7878',
                weight: pxWidget.draw.params[id].borders ? 0.2 : 0,
                fillOpacity: 0.6
            },
            onEachFeature: function (feature, layer) {
                coloursUsed.push(layer.options.fillColor);
                var decimal = feature.properties.statistic ? pxWidget.map.jsonstat[id].Dimension({ role: "metric" })[0].Category(feature.properties.statistic).unit.decimals : null;
                var value = null;
                var tooltipTitle = pxWidget.draw.params[id].tooltipTitle ? "<b>" + pxWidget.draw.params[id].tooltipTitle + "</b><br>" : "";
                if (typeof feature.properties.value != 'number') {
                    layer.setStyle({
                        "fill": false
                    })
                }

                value = feature.properties.value || feature.properties.value === 0 ? pxWidget.formatNumber(feature.properties.value.toLocaleString(), decimal) : pxWidget.draw.params[id].defaultContent;

                layer.bindPopup(
                    tooltipTitle +
                    feature.properties.name + " (" + feature.properties.time + ")" + ' : <b>' +
                    value + '</b> (' + feature.properties.unit + ')');

                layer.on('mouseover', function (e) {
                    if (e.sourceTarget.feature.properties.value != null) {
                        pxWidget.jQuery('#' + id + ' span[data-colour="' + e.sourceTarget.options.fillColor + '"').css("font-weight", "bold");
                    }

                    var popupAnchor = {
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                    }

                    layer.setStyle({
                        "weight": 2
                    })
                    this.openPopup(popupAnchor);

                });
                layer.on('mouseout', function (e) {
                    pxWidget.jQuery('#' + id + ' span[data-colour="' + e.sourceTarget.options.fillColor + '"').css("font-weight", "normal");
                    layer.setStyle({
                        "weight": pxWidget.draw.params[id].borders ? 0.2 : 0
                    });

                    var popupAnchor = {
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                    }

                    this.closePopup(popupAnchor);

                });
            }
        }

        pxWidget.jQuery.extend(true, polygonConfig, pxWidget.draw.params[id].options);
        if (pxWidget.map.values[id][0].every(element => element === null) && polygonConfig.mode == "k") {
            //k-mode can't work with all nulls so force qualtile so at least the map will render, no values so mode is redundant
            polygonConfig.mode = "q"
        }

        choroplethLayer = pxWidget.L.choropleth(pxWidget.map.geojson[id], polygonConfig);
    }
    else if (geometryType == geometryTypePoint) {
        var pointConfig = {
            onEachFeature: function (feature, layer) {

                var decimal = feature.properties.statistic ? pxWidget.map.jsonstat[id].Dimension({ role: "metric" })[0].Category(feature.properties.statistic).unit.decimals : null;
                var value = null;
                var tooltipTitle = pxWidget.draw.params[id].tooltipTitle ? "<b>" + pxWidget.draw.params[id].tooltipTitle + "</b><br>" : "";

                value = feature.properties.value || feature.properties.value === 0 ? pxWidget.formatNumber(feature.properties.value.toLocaleString(), decimal) : pxWidget.draw.params[id].defaultContent;

                layer.bindPopup(
                    tooltipTitle +
                    feature.properties.name + " (" + feature.properties.time + ")" + ' : <b>' +
                    value + '</b> (' + feature.properties.unit + ')');

                layer.on('mouseover', function (e) {
                    var popupAnchor = {
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                    }
                    this.openPopup(popupAnchor);
                });

                layer.on('mouseout', function (e) {
                    var popupAnchor = {
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                    }
                    this.closePopup(popupAnchor);
                });

            },

            pointToLayer: function (feature, latlng) {
                var jump = (pxWidget.map.maxValue[id] - pxWidget.map.minValue[id]) / (pxWidget.config.map.pointMap.maxRadius - pxWidget.config.map.pointMap.minRadius);
                var radiusValue = Math.round(((feature.properties.value - pxWidget.map.minValue[id]) / jump) + pxWidget.config.map.pointMap.minRadius);
                return pxWidget.L.circleMarker(latlng, {
                    radius: feature.properties.value === null || feature.properties.value < 0 ? pxWidget.config.map.pointMap.minRadius : radiusValue + pxWidget.config.map.pointMap.minRadius,
                    fillColor: feature.properties.value === null ? "#b3b3b3" : pxWidget.draw.params[id].colorScale,
                    color: feature.properties.value === null ? "#b3b3b3" : pxWidget.draw.params[id].colorScale,
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.6
                });
            }


        };
        pxWidget.jQuery.extend(true, pointConfig, pxWidget.draw.params[id].options);
        pointLayer = pxWidget.L.geoJson(pxWidget.map.geojson[id], pointConfig);

        //add markers to point map
        var markerConfig = {
            onEachFeature: function (feature, layer) {

                var decimal = feature.properties.statistic ? pxWidget.map.jsonstat[id].Dimension({ role: "metric" })[0].Category(feature.properties.statistic).unit.decimals : null;
                var value = null;
                var tooltipTitle = pxWidget.draw.params[id].tooltipTitle ? "<b>" + pxWidget.draw.params[id].tooltipTitle + "</b><br>" : "";

                value = feature.properties.value || feature.properties.value === 0 ? pxWidget.formatNumber(feature.properties.value.toLocaleString(), decimal) : pxWidget.draw.params[id].defaultContent;

                layer.bindPopup(
                    tooltipTitle +
                    feature.properties.name + " (" + feature.properties.time + ")" + ' : <b>' +
                    value + '</b> (' + feature.properties.unit + ')');

                layer.on('mouseover', function (e) {
                    var popupAnchor = {
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                    }
                    this.openPopup(popupAnchor);
                });

                layer.on('mouseout', function (e) {
                    var popupAnchor = {
                        lat: e.latlng.lat,
                        lng: e.latlng.lng
                    }
                    this.closePopup(popupAnchor);
                });
            }
        };
        markerLayer = pxWidget.L.geoJson(pxWidget.map.geojson[id], markerConfig);
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

    //add layers
    var layers = [];
    if (choroplethLayer) {
        layers.push(choroplethLayer)
    }
    if (markerLayer) {
        layers.push(markerLayer)
    }
    if (pointLayer) {
        layers.push(pointLayer)
    }
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
        layers: layers,
        maxBounds: [
            [enveloped.bbox[1] + (height / 2), enveloped.bbox[2] - (width / 2)],
            [enveloped.bbox[3] - (height / 2), enveloped.bbox[0] + (width / 2)]
        ]
    });

    //only show markers for points at zoomed in level
    if (geometryType == geometryTypePoint) {
        map.on("zoomend", function () {
            var zoomlevel = map.getZoom();
            if (zoomlevel < 10) {
                if (map.hasLayer(markerLayer)) {
                    map.removeLayer(markerLayer);
                }
            }
            if (zoomlevel >= 10) {
                if (!map.hasLayer(markerLayer)) {
                    map.addLayer(markerLayer);
                }
            }
        });
    }
    var dateUpdated = "";
    if (pxWidget.map.jsonstat[id].updated) {
        dateUpdated = pxWidget.moment(pxWidget.map.jsonstat[id].updated, 'YYYY-MM-DDTHH:mm:ss').format('MMMM DD, YYYY') + " " + pxWidget.moment(pxWidget.map.jsonstat[id].updated, 'YYYY-MM-DDTHH:mm:ss').format('HH:mm:ss') + " UTC";
    }
    var localAttribution = "<br>" + dateUpdated;
    localAttribution += pxWidget.draw.params[id].link ? " <a target='_blank' href='" + pxWidget.draw.params[id].link + "'>" + pxWidget.draw.params[id].link + "</a> <br>" : "<br>";
    localAttribution += pxWidget.draw.params[id].copyright ? '&copy; ' + pxWidget.map.jsonstat[id].extension.copyright.name : "";

    var attribution = pxWidget.L.control.attribution(
        {
            prefix: false
        }
    );

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
        pxWidget.jQuery.each(pxWidget.config.map.baseMap.leaflet, function (index, value) {
            pxWidget.L.tileLayer(value.url, value.options).addTo(map);
        });
    }

    //if optional esri baselayers are passed in snippet, layer these over leaflet baselayers
    if (pxWidget.draw.params[id].baseMap.esri.length) {
        pxWidget.jQuery.each(pxWidget.draw.params[id].baseMap.esri, function (index, value) {
            pxWidget.L.esri.tiledMapLayer(value).addTo(map);
        });
    }

    var allFeatures = pxWidget.L.geoJson(pxWidget.map.geojson[id]);
    map.fitBounds(allFeatures.getBounds());
    map.setMinZoom(map.getZoom());

    pxWidget.map.easyPrint = pxWidget.L.easyPrint({
        hideControlContainer: false,
        filename: pxWidget.draw.params[id].data.datasets[0].api.response.extension.matrix + "_" + pxWidget.moment(Date.now()).format('DDMMYYYYHHmmss'),
        exportOnly: true,
        title: pxWidget.draw.params[id].easyPrint ? pxWidget.draw.params[id].easyPrint.title : "Download"
    }).addTo(map);

    map.on('mouseout', function (e) {
        this.closePopup();
    });

    if (choroplethLayer) {
        //check for all nulls, no legend then
        if (!pxWidget.map.values[id][0].every(element => element === null)) {

            // Add legend
            var legend = pxWidget.L.control({ position: 'topright' })

            legend.onAdd = function (map) {
                const div = pxWidget.L.DomUtil.create('div', 'info legend');
                const grades = choroplethLayer.options.limits;
                var colors = choroplethLayer.options.colors;
                var partitions = [];
                var startItterator = null;
                var decimal = pxWidget.map.jsonstat[id].Dimension({ role: "metric" })[0].Category(pxWidget.map.geojson[id].features[0].properties.statistic).unit.decimals;
                if (decimal == 0) {
                    startItterator = 1;
                }
                else {
                    startItterator = Math.pow(1, decimal) / 10;
                }

                //if one area, simple legend
                if (pxWidget.map.values[id][0].length == 1) {
                    if (typeof grades[0] === 'number') {
                        partitions.push(
                            {
                                "start": grades[0] < 0 ? "(" + pxWidget.formatNumber(grades[0], decimal) + ")" : pxWidget.formatNumber(grades[0], decimal),
                                "end": null,
                                "colour": colors[0]
                            }
                        )
                    }

                }
                else {
                    pxWidget.jQuery.each(grades, function (index, value) {
                        if (typeof value === 'number') {
                            if (index == 0) {
                                partitions.push(
                                    {
                                        "start": pxWidget.formatNumber(pxWidget.map.minValue[id]),
                                        "end": value < 0 ? "(" + pxWidget.formatNumber(value, decimal) + ")" : pxWidget.formatNumber(value, decimal),
                                        "colour": colors[index]
                                    }
                                )
                            }
                            else {
                                //check that previous grade is actually a number, if not go back one more
                                var grade;
                                if (isNaN(grades[index - 1])) {
                                    grade = grades[index - 2];
                                }
                                else {
                                    grade = grades[index - 1];
                                }
                                partitions.push(
                                    {
                                        "start": grade + startItterator < 0 ? "(" + pxWidget.formatNumber(grade + startItterator, decimal) + ")" : pxWidget.formatNumber(grade + startItterator, decimal),
                                        "end": value < 0 ? "(" + pxWidget.formatNumber(value, decimal) + ")" : pxWidget.formatNumber(value, decimal),
                                        "colour": colors[index]
                                    }
                                )
                            }
                        }

                    });
                }

                const labels = [];

                pxWidget.jQuery.each(partitions, function (index, value) {
                    //only use the partition if the colour has been applied to a feature
                    //k-means can have duplicate ranges with redundant colours
                    if (pxWidget.jQuery.inArray(value.colour, coloursUsed) == -1 && polygonConfig.mode == "k") {
                        //skip this partition if it's k-means and colour not used
                    }
                    else {
                        labels.push('<i style="background: ' + value.colour + '; opacity: 0.6"></i>'
                            + '<span data-colour="' + value.colour + '">' + value.start
                            + (value.end ? ' - ' + value.end : "")
                            + '</span>'
                        );
                    }
                });

                div.innerHTML = labels.join('<br>');
                return div;
            }
            legend.addTo(map);
        }



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
    pxWidget.map.jsonstat[id] = pxWidget.draw.params[id].data.datasets[0].api.response ? new pxWidget.JSONstat(pxWidget.draw.params[id].data.datasets[0].api.response) : null;

    if (pxWidget.map.jsonstat[id] && pxWidget.map.jsonstat[id].length) {
        if (pxWidget.draw.params[id].options.geojson && typeof pxWidget.draw.params[id].options.geojson === 'object') {
            onSuccess(pxWidget.draw.params[id].options.geojson);
        }
        else {
            // Run the Ajax call
            pxWidget.jQuery.ajax({
                url: pxWidget.draw.params[id].options.geojson || pxWidget.map.jsonstat[id].Dimension(pxWidget.draw.params[id].mapDimension).link.enclosure[0].href,
                method: 'GET',
                dataType: 'json',
                async: false,
                success: onSuccess,
                error: function (jqXHR, textStatus, errorThrown) {
                    pxWidget.draw.error(id, 'pxWidget.map.compile: invalid geoJSON url');
                }
            });
        }

        function onSuccess(response) {
            if (typeof response != "object") {
                response = JSON.parse(response)
            }
            pxWidget.map.geojson[id] = response;
            pxWidget.map.addValues(id);
        }

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
        var metadataJsonStat = pxWidget.draw.params[id].metadata.api.response ? new pxWidget.JSONstat(pxWidget.draw.params[id].metadata.api.response) : null;

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
    //var data = pxWidget.draw.params[id].data.datasets[0].api.response ? new pxWidget.JSONstat(pxWidget.draw.params[id].data.datasets[0].api.response) : null;

    pxWidget.jQuery.each(pxWidget.map.jsonstat[id].Dimension(), function (indexDimension, valueDimension) {
        if (pxWidget.map.jsonstat[id].id[indexDimension] != mapToDisplayId) {
            dataQueryObj[pxWidget.map.jsonstat[id].id[indexDimension]] = valueDimension.id[0];
        }
    });
    var geoDimension = pxWidget.map.jsonstat[id].Dimension(mapToDisplayId);
    //remove features from geoJSON that are not in the classification
    pxWidget.map.geojson[id].features = pxWidget.jQuery.grep(pxWidget.map.geojson[id].features, function (el, i) {
        var identifier = pxWidget.draw.params[id].options.identifier ? el.properties[pxWidget.draw.params[id].options.identifier] : el.properties.code;
        if (pxWidget.jQuery.inArray(identifier, geoDimension.id) == -1) {
            return false;// feature not in classification so remove
        }
        return true; // keep the element in the array
    });
    pxWidget.map.values[id] = [];
    pxWidget.map.minValue[id] = null;
    pxWidget.map.maxValue[id] = null;

    var allValues = [];
    pxWidget.jQuery.each(pxWidget.map.geojson[id].features, function (index, feature) {

        var identifier = pxWidget.draw.params[id].options.identifier ? feature.properties[pxWidget.draw.params[id].options.identifier] : feature.properties.code
        var guid = identifier;

        dataQueryObj[mapToDisplayId] = guid;
        var featureValue = pxWidget.map.jsonstat[id].Data(dataQueryObj).value;
        feature.properties.value = featureValue;
        allValues.push(featureValue);

        var featureValueRadius = !featureValue || featureValue < 0 ? 0 : featureValue;

        //initial values will always be the first
        if (!pxWidget.map.maxValue[id]) {
            pxWidget.map.minValue[id] = featureValueRadius;
            pxWidget.map.maxValue[id] = featureValueRadius;
        }

        if (featureValueRadius > pxWidget.map.maxValue[id]) {
            pxWidget.map.maxValue[id] = featureValueRadius;
        }

        if (featureValueRadius < pxWidget.map.minValue[id]) {
            pxWidget.map.minValue[id] = featureValueRadius;
        }

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