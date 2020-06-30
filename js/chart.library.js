/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};
pxWidget.chart = {};
pxWidget.chart.ajax = {};
pxWidget.chart.callback = {};


/**
 * Draw a pxWidget Chart
 * @param {*} id 
 */
pxWidget.chart.draw = function (id) {
    // Init & Spinner
    pxWidget.draw.spinner(id);

    if (!pxWidget.chart.compile(id)) {
        return;
    }

    // Create canvas
    var canvas = pxWidget.jQuery('<canvas>');
    // Append canvas
    pxWidget.jQuery('#' + id).append(canvas);


    var footerElements = [];
    if (pxWidget.draw.params[id].copyright) {
        footerElements.push('(C) ' + pxWidget.draw.params[id].metadata.api.response.extension.copyright.name);
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
    pxWidget.draw.params[id].options.updated = pxWidget.draw.params[id].metadata.api.response.updated;

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

    // Run ChartJS

    new pxWidget.Chart(pxWidget.jQuery('#' + id).find('canvas'), pxWidget.jQuery.extend(true, {}, pxWidget.draw.params[id]));

    // Run optional callback at last
    if (pxWidget.draw.callback[id]) {
        pxWidget.draw.callback[id]();
    }
};

pxWidget.chart.ajax.readDataset = function (id) {
    var args = [];

    // Read meta-data
    args.push(pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].metadata.api.query.url,
        pxWidget.draw.params[id].metadata.api.query.data.method,
        pxWidget.draw.params[id].metadata.api.query.data.params,
        "pxWidget.chart.callback.readMetadata",
        { id: id },
        null,
        null,
        { async: false },
        id));

    // Read each dataset/series
    pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
        args.push(pxWidget.ajax.jsonrpc.request(
            value.api.query.url,
            value.api.query.data.method,
            value.api.query.data.params,
            "pxWidget.chart.callback.readDataset",
            {
                id: id,
                index: index
            },
            null,
            null,
            { async: false },
            id));
    });

    if (args.length) {
        pxWidget.jQuery.when.apply(this, args).done(function () {
            var hasCompiled = true;

            if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.response)) {
                return hasCompiled = false;
            }

            pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
                if (pxWidget.jQuery.isEmptyObject(value.api.response)) {
                    return hasCompiled = false;
                }
            });

            if (hasCompiled) {
                // Restart the drawing after successful compilation
                pxWidget.chart.draw(id);
            }

        });
    }
};

pxWidget.chart.callback.readMetadata = function (result, callbackParams) {
    pxWidget.draw.params[callbackParams.id].metadata.api.response = result;
};

pxWidget.chart.callback.readDataset = function (result, callbackParams) {
    pxWidget.draw.params[callbackParams.id].data.datasets[callbackParams.index].api.response = result;
};

pxWidget.chart.compile = function (id) {
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.response)) {
        pxWidget.chart.ajax.readDataset(id);
        // Avoid self-looping
        return false;
    }

    //parse JSONstat meta data
    var metadataData = new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].metadata.api.response) || pxWidget.draw.params[id].metadata.api.response;
    if (!metadataData.length) {
        pxWidget.draw.error(id, 'pxWidget.chart.compile: invalid meta-data response');
        console.log(pxWidget.draw.params[id].metadata.api.response);
        return false;
    }

    //get xAxis labels
    var xAxisLabels = metadataData.Dimension(Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]).Category();

    //Empty any previous labels
    pxWidget.draw.params[id].data.labels = [];
    if (!pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]].length) {
        //all variables labels need to go in array
        pxWidget.jQuery.each(xAxisLabels, function (index, value) {
            pxWidget.draw.params[id].data.labels.push(value.label);
        });
    }
    else {
        var xAxisCodes = pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]];
        pxWidget.jQuery.each(xAxisCodes, function (index, value) {
            pxWidget.draw.params[id].data.labels.push(metadataData.Dimension(Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]).Category(value).label);
        });
    }

    //get datasets data
    var isValidData = true;
    pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
        var data = new pxWidget.JSONstat.jsonstat(value.api.response) || value.api.response;
        if (!data.length) {
            pxWidget.draw.error(id, 'pxWidget.chart.compile: invalid data response [' + (index + 1) + ']');
            isValidData = false;
            return false;
        }

        var xAxisDimensionCodes = pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]].length
            ? pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]]
            : data.Dimension(Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]).id;

        //loop through xAxis dimension to get values
        pxWidget.jQuery.each(xAxisDimensionCodes, function (variableIndex, variableValue) {
            var valueObj = {
                [Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]]: variableValue
            };

            pxWidget.jQuery.each(value.api.query.data.params.dimension, function (seriesIndex, seriesValue) {
                if (seriesIndex != [Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]]) {
                    valueObj[seriesIndex] = seriesValue.category.index[0]
                }
            });
            value.data.push(data.Data(valueObj).value)
        });
    });

    return isValidData;
}