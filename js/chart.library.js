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

    // Create canvas in parent div
    var canvas = pxWidget.jQuery('<div>', {
        "class": "pxwidget-canvas-wrapper",
        "html": pxWidget.jQuery('<canvas>')
    });

    // Append canvas
    pxWidget.jQuery('#' + id).append(canvas);


    var footerElements = [];
    if (pxWidget.draw.params[id].copyright) {
        footerElements.push('&copy; ' + pxWidget.draw.params[id].metadata.api.response.extension.copyright.name);
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
    pxWidget.draw.params[id].options.updated = pxWidget.draw.params[id].metadata.api.response.updated || "";

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

    if (typeof pxWidget.draw.params[id].options.scales != "undefined") {
        //format yaxis labels
        pxWidget.jQuery.each(pxWidget.draw.params[id].options.scales.yAxes, function (index, value) {
            value.ticks.callback = function (label, index, labels) {
                switch (pxWidget.draw.params[id].type) {
                    case "horizontalBar":
                        return label;
                        break;
                    default:
                        return pxWidget.formatNumber(label, 0);
                        break;
                }
            }
        });

        //format xaxis labels if dimension is not time
        pxWidget.jQuery.each(pxWidget.draw.params[id].options.scales.xAxes, function (index, value) {

            value.ticks.callback = function (label, index, labels) {
                if (pxWidget.draw.params[id].metadata.xAxis.role != "time") {
                    return pxWidget.formatNumber(label, 0);
                }
                else {
                    return label;
                }
            }


        });
    }



    //format tooltip value
    pxWidget.draw.params[id].options.tooltips.callbacks.label = function (tooltipItem, data) {
        var label = "";
        var meta = Object.values(data.datasets[0]._meta);
        switch (meta[0].type) {
            case "pie":
            case "doughnut":
                label = " " + data.labels[tooltipItem.index]
                break;
            default:
                label = " " + data.datasets[tooltipItem.datasetIndex].label || '';
                break;
        }
        label += ': ';
        var value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] === null ? data.null : pxWidget.formatNumber(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]);
        label += value;
        return label;
    };

    if (typeof pxWidget.draw.params[id].options.scales != "undefined") {
        pxWidget.jQuery.each(pxWidget.draw.params[id].options.scales.yAxes, function (key, value) {
            if (value.ticks.decimalPlaces) {
                value.ticks.callback = function (tickValue, tickIndex, tickValues) {
                    return Number(tickValue).toFixed(value.ticks.decimalPlaces);
                };
            }
        });
    }

    // Run ChartJS
    var chart = new pxWidget.Chart(pxWidget.jQuery('#' + id).find('canvas'), pxWidget.jQuery.extend(true, {}, pxWidget.draw.params[id]));

    /* This code block allows us to optionally hide a slide of a pie chart by default. It places a strike through the category, 
    also allowing the user to re-selecet it if they wish. No use case at present but may be need in the future

    if ((pxWidget.draw.params[id].type == "pie" || pxWidget.draw.params[id].type == "doughnut") && pxWidget.draw.params[id].hiddenCategories) {
        pxWidget.jQuery.each(pxWidget.draw.params[id].hiddenCategories, function (index, value) {
            chart.getDatasetMeta(0).data[value].hidden = true;
        });
        chart.update();
    } */

    // Clear labels/data before completion
    pxWidget.draw.params[id].data.labels = [];
    pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (key, value) {
        value.data = [];
    });

    // Run optional callback at last
    if (pxWidget.draw.callback[id]) {
        pxWidget.draw.callback[id]();
    }
};

pxWidget.chart.ajax.readDataset = function (id) {
    var args = [];

    // Check metadata query exists
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.query)) {
        pxWidget.draw.error(id, 'pxWidget.chart.ajax.readDataset: missing metadata query');
        return;
    }
    // Check all data queries exist
    var allDataQueriesExist = true;
    pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
        if (pxWidget.jQuery.isEmptyObject(value.api.query)) {
            allDataQueriesExist = false;
            pxWidget.draw.error(id, 'pxWidget.chart.ajax.readDataset: missing data query [' + (index + 1) + ']');
            return false;
        }
    });

    if (!allDataQueriesExist)
        return;

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
            } else
                pxWidget.draw.error(id, 'pxWidget.chart.ajax.readDataset: missing data response(s)');
        });
    }
};

pxWidget.chart.callback.readMetadata = function (response, callbackParams) {
    pxWidget.draw.params[callbackParams.id].metadata.api.response = response;
};

pxWidget.chart.callback.readDataset = function (response, callbackParams) {
    pxWidget.draw.params[callbackParams.id].data.datasets[callbackParams.index].api.response = response;
};

pxWidget.chart.compile = function (id) {
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.response)) {
        pxWidget.chart.ajax.readDataset(id);
        // Avoid self-looping
        return false;
    }

    //parse JSONstat meta data
    var metadataData = pxWidget.draw.params[id].metadata.api.response ? new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].metadata.api.response) : null;
    if (metadataData && metadataData.length) {
        //get xAxis labels
        var xAxisLabels = metadataData.Dimension(Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]).Category();

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
            var data = value.api.response ? new pxWidget.JSONstat.jsonstat(value.api.response) : null;
            if (data && data.length) {
                var xAxisDimensionCodes = pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]].length
                    ? pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]]
                    : data.Dimension(Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]).id;

                //loop through xAxis dimension to get values
                pxWidget.jQuery.each(xAxisDimensionCodes, function (variableIndex, variableValue) {
                    var valueObj = {
                        [Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]]: variableValue
                    };

                    pxWidget.jQuery.each(data.Dimension(), function (dimensionIndex, dimensionValue) {
                        if (data.id[dimensionIndex] != Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]) {
                            valueObj[data.id[dimensionIndex]] = dimensionValue.id[0]
                        }

                    });

                    value.data.push(data.Data(valueObj).value)
                });
            } else {
                pxWidget.draw.error(id, 'pxWidget.chart.compile: invalid data response [' + (index + 1) + ']');
                isValidData = false;
                return false;
            }
        });
        return isValidData;
    } else {
        pxWidget.draw.error(id, 'pxWidget.chart.compile: invalid meta-data response');
        return false;
    }
}