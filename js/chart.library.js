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
    //retain height of div if widget redrawn for smooth rendering
    var height = pxWidget.jQuery('#' + id).height();
    pxWidget.jQuery('#' + id).height(height);
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
    pxWidget.draw.params[id].options.updated = pxWidget.draw.params[id].metadata.api.response.updated || null;

    pxWidget.draw.params[id].plugins = pxWidget.draw.params[id].plugins || [];
    pxWidget.draw.params[id].plugins.push({
        beforeDraw: function (chart) {
            var ctx = chart.ctx;

            ctx.restore();

            // Override backgroud color to white for exporting image
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);

            // Set date
            if (pxWidget.draw.params[id].options.updated) {
                ctx.textBaseline = "bottom";
                ctx.fillStyle = "#666";
                ctx.font = "14px Arial";
                var dateUpdated = pxWidget.moment(chart.options.updated, 'YYYY-MM-DDTHH:mm:ss').format('MMMM DD, YYYY') + " " + pxWidget.moment(chart.options.updated, 'YYYY-MM-DDTHH:mm:ss').format('HH:mm:ss') + " UTC";
                ctx.fillText(dateUpdated, 0, chart.canvas.clientHeight);
            }
            ctx.save();
        }
    });
    // Add padding for date and xAxis labels
    pxWidget.draw.params[id].options.layout = pxWidget.draw.params[id].options.layout || {};
    pxWidget.draw.params[id].options.layout.padding = {
        left: 22,
        right: 22,
        top: 0,
        bottom: 22
    };

    if (typeof pxWidget.draw.params[id].options.scales != "undefined") {
        //format yaxis labels
        pxWidget.jQuery.each(pxWidget.draw.params[id].options.scales.yAxes, function (index, value) {
            if (pxWidget.draw.params[id].type == "horizontalBar" || pxWidget.draw.params[id].type == "pyramid") {
                value.ticks.callback = function (label, index, labels) {
                    return label;
                }

            } else {
                value.ticks.callback = function (label, index, labels) {
                    return pxWidget.formatNumber(label);
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
        var value = null;
        var percentage = null;
        var totalValues = data.datasets[tooltipItem.datasetIndex].data.reduce((partialSum, a) => partialSum + a, 0);
        var meta = Object.values(data.datasets[0]._meta);
        switch (meta[0].type) {
            case "pie":
            case "doughnut":
            case "polarArea":
                value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] === null ? data.null : data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                label = " " + data.labels[tooltipItem.index];
                if (pxWidget.draw.params[id].showPrecentage) {
                    percentage = (100 * value) / totalValues;
                }

                break;
            default:
                label = " " + data.datasets[tooltipItem.datasetIndex].label || '';
                value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] === null ? data.null : data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                break;
        }
        label += ': ';

        if (pxWidget.draw.params[id].type == "pyramid") {
            if (!isNaN(value)) {
                //is a number
                value = Math.abs(value);
            }

        }
        var decimal = data.datasets[tooltipItem.datasetIndex].decimal[tooltipItem.index] || null;
        value = pxWidget.formatNumber(value, decimal)
        if (percentage) {
            label += percentage.toFixed(2) + "% ";
        }
        var unit = data.datasets[tooltipItem.datasetIndex].unit[tooltipItem.index] || "";
        label += "(" + value + " " + unit + ")";
        return label;
    };

    //for stacked column charts we need to reverse the tooltip order
    //if any form of pie we can ignore requirement
    if (pxWidget.draw.params[id].options.scales) {
        var isStacked = false;
        //check yAxes
        pxWidget.jQuery.each(pxWidget.draw.params[id].options.scales.yAxes, function (index, value) {
            isStacked = value.stacked;
            if (isStacked) {
                return;
            }
        });
        //check xAxes if still not stacked
        if (!isStacked) {
            isStacked = pxWidget.draw.params[id].options.scales.xAxes[0].stacked
        }

        if (isStacked && pxWidget.draw.params[id].type == "bar") {
            pxWidget.draw.params[id].options.tooltips.itemSort = function (a, b) {
                return b.datasetIndex - a.datasetIndex
            };
        }
    }



    //format legend hover
    pxWidget.draw.params[id].options.legend.onHover = function () {
        pxWidget.jQuery('body').css('cursor', 'pointer');
    };

    pxWidget.draw.params[id].options.legend.onLeave = function () {
        pxWidget.jQuery('body').css('cursor', 'auto');
    };

    //handle type pyramid
    var chartTypeOrg = pxWidget.draw.params[id].type;
    if (pxWidget.draw.params[id].type == "pyramid") {


        //if pyramid, check all values in each dataset is positive

        var pryramidIsValid = true;
        pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
            var hasNegative = value.data.some(v => v < 0);
            if (hasNegative) {
                pryramidIsValid = false
                return
            }
        });
        if (!pryramidIsValid) {
            pxWidget.draw.error(id, 'pxWidget.chart.draw: Invalid dataset values for pyramid chart', true);
            return;
        }

        pxWidget.draw.params[id].type = "horizontalBar"
        //negate 2nd series values
        var firstSeriesData = pxWidget.jQuery.extend(true, [], pxWidget.draw.params[id].data.datasets[0].data);
        var firstSeriesDataNegated = [];
        pxWidget.jQuery.each(firstSeriesData, function (index, value) {
            firstSeriesDataNegated.push(value * -1)
        });
        pxWidget.draw.params[id].data.datasets[0].data = firstSeriesDataNegated;
        pxWidget.draw.params[id].options.scales.yAxes[0].stacked = true;
        pxWidget.draw.params[id].options.scales.xAxes[0].ticks.callback = function (value) {
            return pxWidget.formatNumber(Math.abs(value))
        }

        pxWidget.draw.params[id].options.legend = {
            "position": "bottom",
            "onClick": (e) => e.stopPropagation()
        }

        //reverse yAxis labels for better visualisation
        pxWidget.draw.params[id].options.scales.yAxes[0].ticks.reverse = true;
    }
    else {
        if (typeof pxWidget.draw.params[id].options.scales != "undefined") {
            //reverse xAxis labels for better visualisation if time
            if (pxWidget.draw.params[id].metadata.xAxis.role == "time" && pxWidget.draw.params[id].type != "horizontalBar") {
                //Only reverse if selected timepoints on xAxis. If every time point has been selected for the xAxis, they will naturally be ordered correctly from the metadata
                if (pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]].length) {
                    pxWidget.draw.params[id].options.scales.xAxes[0].ticks.reverse = true;
                }
            }
            pxWidget.draw.params[id].options.scales.xAxes[0].ticks.callback = function (value) {
                switch (typeof value) {
                    case "string":
                        return value
                        break;
                    case "number":
                        return pxWidget.formatNumber(value, 0);
                        break;
                    default:
                        return value
                        break;
                }
            }
        }
    }
    //remove div height for smooth rendering
    pxWidget.jQuery('#' + id).height("auto");
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

    //reset dataset labels
    if (pxWidget.draw.params[id].datasetLabels) {

        if ((pxWidget.draw.params[id].type == "pie" || pxWidget.draw.params[id].type == "doughnut" || pxWidget.draw.params[id].type == "polarArea")) {
            pxWidget.draw.params[id].options.title.text[pxWidget.draw.params[id].options.title.text.length - 1] = pxWidget.draw.params[id].datasetLabels[0];
        }
        else {
            pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
                value.label = pxWidget.draw.params[id].datasetLabels[index];
            });
        }
    }

    //reset chart type, may be changed because of pyramid type
    pxWidget.draw.params[id].type = chartTypeOrg;

    // Run optional callback at last
    if (pxWidget.draw.callback[id]) {
        pxWidget.draw.callback[id]();
    }
};

pxWidget.chart.ajax.readDataset = function (id) {
    var argsMetadata = [];
    var argsDataset = [];

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

    // Read meta-data first before read dataset so we can populate fluid time into datasets if required
    argsMetadata.push(pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].metadata.api.query.url,
        pxWidget.draw.params[id].metadata.api.query.data.method,
        pxWidget.draw.params[id].metadata.api.query.data.params,
        "pxWidget.chart.callback.readMetadata",
        { id: id },
        null,
        null,
        { async: false },
        id));


    if (argsMetadata.length) {
        pxWidget.jQuery.when.apply(this, argsMetadata).done(function () {
            // Read each dataset/series
            pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
                argsDataset.push(pxWidget.ajax.jsonrpc.request(
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

            if (argsDataset.length) {
                pxWidget.jQuery.when.apply(this, argsDataset).done(function () {
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
        });
    }




};

pxWidget.chart.callback.readMetadata = function (response, callbackParams) {
    pxWidget.draw.params[callbackParams.id].metadata.api.response = response;
    var metadataData = new pxWidget.JSONstat.jsonstat(response);
    //update fluid time before fetching datasets
    pxWidget.jQuery.each(pxWidget.draw.params[callbackParams.id].data.datasets, function (index, value) {
        if (value.fluidTime) {
            if (value.fluidTime.length) {
                var timeDimensionCode = null;
                pxWidget.jQuery.each(metadataData.Dimension(), function (indexDimension, valueDimension) {
                    if (valueDimension.role == "time") {
                        timeDimensionCode = metadataData.id[indexDimension];
                        return;
                    }
                });
                var dimensionSize = metadataData.Dimension(timeDimensionCode).id.length;
                value.api.query.data.params.dimension[timeDimensionCode].category.index = [metadataData.Dimension(timeDimensionCode).id[(dimensionSize - value.fluidTime[0]) - 1]];
            }
        }
    });
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
        if (pxWidget.draw.params[id].metadata.fluidTime && pxWidget.draw.params[id].metadata.fluidTime.length) {
            pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]] = [];
            var timeDimensionCode = null;
            pxWidget.jQuery.each(metadataData.Dimension(), function (index, value) {
                if (value.role == "time") {
                    timeDimensionCode = metadataData.id[index];
                    return;
                }
            });
            var dimensionSize = metadataData.Dimension(timeDimensionCode).id.length;
            pxWidget.jQuery.each(pxWidget.draw.params[id].metadata.fluidTime, function (index, value) {
                //fluid time point is relevant to the end of the array
                pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]].push(metadataData.Dimension(timeDimensionCode).id[(dimensionSize - value) - 1]);
            });
            pxWidget.jQuery.each(pxWidget.draw.params[id].metadata.xAxis[timeDimensionCode], function (index, value) {
                pxWidget.draw.params[id].data.labels.push(metadataData.Dimension(timeDimensionCode).Category(value).label);
            });
        }
        else {
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
        }

        //get datasets data
        var isValidData = true;
        var sortValues = [];
        pxWidget.jQuery.each(pxWidget.draw.params[id].data.datasets, function (index, value) {
            value.unit = [];

            var data = value.api.response ? new pxWidget.JSONstat.jsonstat(value.api.response) : null;
            if (data && data.length) {
                var xAxisDimensionCodes = pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]].length
                    ? pxWidget.draw.params[id].metadata.xAxis[Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]]
                    : data.Dimension(Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]).id;
                //loop through xAxis dimension to get values
                //make decimal and unit backward compatable
                value.unit = [];
                value.decimal = [];
                pxWidget.jQuery.each(xAxisDimensionCodes, function (variableIndex, variableValue) {
                    var valueObj = {
                        [Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]]: variableValue
                    };

                    pxWidget.jQuery.each(data.Dimension(), function (dimensionIndex, dimensionValue) {
                        if (data.id[dimensionIndex] != Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]) {
                            valueObj[data.id[dimensionIndex]] = dimensionValue.id[0];
                        }

                    });

                    //sorting required, create new array of values to rearrange later 
                    if (pxWidget.draw.params[id].data.datasets.length == 1 && pxWidget.draw.params[id].sort) {

                        sortValues.push(
                            {
                                "value": data.Data(valueObj).value,
                                "xAxisDimensionCode": variableValue,
                                "unit": data.Dimension({ role: "metric" })[0].Category(valueObj.STATISTIC).unit.label,
                                "decimal": data.Dimension({ role: "metric" })[0].Category(valueObj.STATISTIC).unit.decimals
                            }
                        )
                    }
                    else {
                        value.data.push(data.Data(valueObj).value);
                        //push a unit into unit array for each value, used in tooltip
                        value.unit.push(data.Dimension({ role: "metric" })[0].Category(valueObj.STATISTIC).unit.label);
                        //push a decimal into unit array for each value, used in tooltip
                        value.decimal.push(data.Dimension({ role: "metric" })[0].Category(valueObj.STATISTIC).unit.decimals);
                    }

                });

                //check to see if the time dimesnion is in the series rather than the xAxis
                pxWidget.jQuery.each(data.Dimension(), function (dimensionIndex, dimensionValue) {
                    if (data.id[dimensionIndex] != Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]) {
                        if (dimensionValue.role == "time") {
                            //only relevant for fluid time
                            if (value.fluidTime.length) {
                                if ((pxWidget.draw.params[id].type == "pie" || pxWidget.draw.params[id].type == "doughnut" || pxWidget.draw.params[id].type == "polarArea")) {
                                    pxWidget.draw.params[id].options.title.text[pxWidget.draw.params[id].options.title.text.length - 1] = pxWidget.draw.params[id].options.title.text[pxWidget.draw.params[id].options.title.text.length - 1] + " (" + data.Dimension(data.id[dimensionIndex]).Category(dimensionValue.id[0]).label + ")";
                                }
                                else {
                                    //append time value to series name
                                    value.label += " (" + data.Dimension(data.id[dimensionIndex]).Category(dimensionValue.id[0]).label + ")";
                                }

                            }
                        }
                    }

                });
                if (sortValues.length) {
                    sortValues.sort((a, b) => b.value - a.value);
                    pxWidget.draw.params[id].data.labels = [];
                    pxWidget.jQuery.each(sortValues, function (sortIndex, sortValue) {
                        pxWidget.draw.params[id].data.labels.push(metadataData.Dimension(Object.keys(pxWidget.draw.params[id].metadata.xAxis)[0]).Category(sortValue.xAxisDimensionCode).label);
                        value.data.push(sortValue.value);
                        value.unit.push(sortValue.unit);
                        value.decimal.push(sortValue.decimal);
                    });
                };
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