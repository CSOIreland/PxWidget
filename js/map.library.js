/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};
pxWidget.map = {};
pxWidget.map.ajax = {};
pxWidget.map.callback = {};

pxWidget.map.geojson = {};
pxWidget.map.geojson.topology = 'Topology';
pxWidget.map.geojson.featureCollection = 'FeatureCollection';

/**
 * Draw a pxWidget Chart
 * @param {*} id 
 */
pxWidget.map.draw = function (id) {
    // Init & Spinner
    pxWidget.draw.spinner(id);

    if (!pxWidget.map.compile(id)) {
        return;
    }

    // Append title if included
    if (pxWidget.draw.params[id].title) {
        var title = pxWidget.jQuery('<p>', {
            "text": pxWidget.draw.params[id].title
        }).css({ "text-align": "center" });
        pxWidget.jQuery('#' + id).append(title);
    }

    // Create canvas in parent div
    var canvas = pxWidget.jQuery('<div>', {
        "html": pxWidget.jQuery('<canvas>')
    });


    // Append canvas
    pxWidget.jQuery('#' + id).append(canvas);


    var footerElements = [];
    if (pxWidget.draw.params[id].copyright) {
        footerElements.push('&copy; ' + pxWidget.draw.params[id].data.datasets[0].api.response.extension.copyright.name);
    }

    if (pxWidget.draw.params[id].link) {
        footerElements.push(pxWidget.jQuery('<a>', {
            "text": pxWidget.draw.params[id].link,
            "href": pxWidget.draw.params[id].link,
            "target": "_blank"
        }).get(0).outerHTML);
    }

    if (footerElements.length) {
        // Combine footers in p tag
        var footer = pxWidget.jQuery('<p>', {
            "html": footerElements.join("<br>")
        }).css({ "text-align": "right" });
        // Append footer
        pxWidget.jQuery('#' + id).append(footer);
    }

    // Store the Copyright and updated date into options to access within Chart
    pxWidget.draw.params[id].options.updated = pxWidget.draw.params[id].data.datasets[0].api.response.updated || "";

    pxWidget.draw.params[id].plugins = pxWidget.draw.params[id].plugins || [];
    pxWidget.draw.params[id].plugins.push({
        beforeDraw: function (chart) {
            var ctx = chart.ctx;

            ctx.restore();

            // Override backgroud color to white for exporting image
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);

            // Set date
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "#666";
            ctx.font = "14px Arial";
            ctx.fillText(chart.options.updated, 0, chart.canvas.clientHeight);

            ctx.save();
        }
    });

    // Add padding for date
    pxWidget.draw.params[id].options.layout = pxWidget.draw.params[id].options.layout || {};
    pxWidget.draw.params[id].options.layout.padding = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 22
    };


    //format tooltip value
    pxWidget.draw.params[id].options.tooltips.callbacks.label = function (tooltipItem, data) {
        var label = "";
        label = " " + data.labels[tooltipItem.index] || '';
        label += ': ';
        var value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].value === null ? data.null : pxWidget.formatNumber(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].value);
        label += value;
        return label;
    };

    // Run ChartJS
    new pxWidget.Chart(pxWidget.jQuery('#' + id).find('canvas'), pxWidget.jQuery.extend(true, {}, pxWidget.draw.params[id]));

    // Clear labels/data before completion
    pxWidget.draw.params[id].data.labels = [];
    pxWidget.draw.params[id].data.datasets[0].data = [];
    pxWidget.draw.params[id].data.datasets[0].outline = [];

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
    var data = pxWidget.draw.params[id].data.datasets[0].api.response ? new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].data.datasets[0].api.response) : null;
    if (data && data.length) {
        // Run the Ajax call
        pxWidget.jQuery.ajax({
            url: data.Dimension({ role: "geo" })[0].link.enclosure[0].href,
            method: 'GET',
            dataType: 'json',
            jsonp: false,
            timeout: 60000,
            async: false,
            success: function (response) {
                pxWidget.map.compileDataset(id, response, data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                pxWidget.draw.error(id, 'ppxWidget.map.compile: invalid geo url');
            }
        });

    } else {
        pxWidget.draw.error(id, 'pxWidget.map.compile: invalid data response');
        isValidData = false;
        return false;
    }

    return isValidData;

}

pxWidget.map.compileDataset = function (id, response, data) {
    var featureCollection = {};
    var topology = {};
    var labels = [];
    var mapData = [];
    //  var data = [];
    switch (response.type) {
        case pxWidget.map.geojson.topology:
            topology = response;
            var dataCodes = data.Dimension({ role: "geo" })[0].id;
            var regions = pxWidget.ChartGeo.topojson.feature(topology, topology.objects[Object.keys(topology.objects)[0]]).features;
            pxWidget.jQuery.each(regions, function (index, value) {

                var areaId = value.properties[pxWidget.draw.params[id].options.featureIdentifier].toString();
                //get id of area to go to metadata and get label

                if (pxWidget.jQuery.inArray(areaId, dataCodes) != -1) {
                    var thisFeature = {
                        "feature": regions[index],
                        "value": null
                    };
                    labels.push(data.Dimension({ role: "geo" })[0].Category(areaId).label);

                    var dataQueryObj = {};
                    dataQueryObj[data.role.geo[0]] = areaId;

                    pxWidget.jQuery.each(data.Dimension(), function (indexDimension, valueDimension) {
                        if (valueDimension.role != "geo") {
                            dataQueryObj[data.id[indexDimension]] = valueDimension.id[0];
                        }
                    });
                    thisFeature.value = data.Data(dataQueryObj).value;
                    mapData.push(thisFeature);
                }

            });

            break;
        case pxWidget.map.geojson.featureCollection:
            featureCollection = response;
            var options = { "quantization": 1e4 }
            // Convert and merge GeoJSON features into a TopoJSON topology.
            topology = pxWidget.topojson.topology({ feature: pxWidget.jQuery.extend(true, {}, featureCollection) }, options);

            // Filter
            pxWidget.topojson.filter(topology, {
                "coordinate-system": options["coordinate-system"]
            });
            var dataCodes = data.Dimension({ role: "geo" })[0].id;
            var regions = pxWidget.ChartGeo.topojson.feature(topology, topology.objects[Object.keys(topology.objects)[0]]).features;
            //get labels
            pxWidget.jQuery.each(featureCollection.features, function (index, value) {

                var areaId = value.properties[pxWidget.draw.params[id].options.featureIdentifier].toString();

                //only get values if there is a code to match
                if (pxWidget.jQuery.inArray(areaId, dataCodes) != -1) {
                    var thisFeature = {
                        "feature": regions[index],
                        "value": null
                    };
                    //get id of area to go to metadata and get label
                    labels.push(data.Dimension({ role: "geo" })[0].Category(areaId).label);
                    var dataQueryObj = {};
                    dataQueryObj[data.role.geo[0]] = areaId;

                    pxWidget.jQuery.each(data.Dimension(), function (indexDimension, valueDimension) {
                        if (valueDimension.role != "geo") {
                            dataQueryObj[data.id[indexDimension]] = valueDimension.id[0];
                        }
                    });
                    thisFeature.value = data.Data(dataQueryObj).value;
                    mapData.push(thisFeature);
                }
            });

            break;
        default:
            pxWidget.draw.error(id, 'pxWidget.map.compile: invalid geo file type');
            break;
    }

    pxWidget.draw.params[id].data.labels = labels;
    pxWidget.draw.params[id].data.datasets[0].outline = pxWidget.ChartGeo.topojson.feature(topology, topology.objects[Object.keys(topology.objects)[0]]).features;
    pxWidget.draw.params[id].data.datasets[0].data = mapData
}