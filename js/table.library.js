/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/

// Init
var pxWidget = pxWidget || {};
pxWidget.table = {};
pxWidget.table.metadata = {};
pxWidget.table.defaultContent = "";
pxWidget.table.ajax = {};
pxWidget.table.callback = {};
pxWidget.table.isCSSloaded = false;
pxWidget.table.response = null;
pxWidget.table.jsonStat = null;

pxWidget.table.pivot = {};
pxWidget.table.pivot.isMetric = [];
pxWidget.table.pivot.dimensionCode = [];
pxWidget.table.pivot.variableCodes = [];

pxWidget.table.timeColumn = [];

/**
 * Draw a pxWidget Table
 * @param {*} id 
 */
pxWidget.table.draw = function (id) {
    //retain height of div if widget redrawn for smooth rendering
    var height = pxWidget.jQuery('#' + id).height();
    if (height) {
        pxWidget.jQuery('#' + id).height(height);
    }
    // Store it for the data sort plugin
    // This implies that every widget is sharing the same defaultContent
    pxWidget.table.defaultContent = pxWidget.draw.params[id].defaultContent;

    // Init & Spinner
    pxWidget.draw.spinner(id);
    if (!pxWidget.table.metadata.compile(id)) {
        return;
    }

    if (!pxWidget.table.compile(id)) {
        return;
    }

    pxWidget.table.loadCSS(id);

    if (pxWidget.jQuery.fn.DataTable.isDataTable('#' + id + " table")) {
        ('#' + id + " table").DataTable().destroy();
        //cannot use redraw as columns are dynamically created depending on the matrix. Have to destroy and re-initiate
    }

    // Parse JSON-stat
    var data = new pxWidget.JSONstat(pxWidget.draw.params[id].data.api.response);

    // Parse data-id to array-of-object
    var jsonTable = data.toTable({
        type: 'arrobj',
        meta: true,
        unit: true,
        content: "id"
    });

    // Pivot table on demand
    jsonTable = pxWidget.table.pivot.compute(id, jsonTable);

    // Set the Bootstrap table for Datatable if Bootstrap is found
    if (window.jQuery && window.jQuery.fn.modal)
        var table = pxWidget.jQuery('<table>', { "class": "table table-striped hover", "style": "width: 100%" });
    else
        var table = pxWidget.jQuery('<table>', { "class": "display", "style": "width: 100%" });

    table.append(pxWidget.jQuery('<caption>', { "text": pxWidget.draw.params[id].title }));

    table.append(pxWidget.jQuery('<thead>').append(pxWidget.jQuery('<tr>', { "name": "header-row" })));
    table.append(pxWidget.jQuery('<tbody>'));

    pxWidget.jQuery('#' + id).append(table);

    // Reset and Populate columns with Dimensions
    var tableColumns = [];
    pxWidget.jQuery.each(data.id, function (i, v) {
        // Draw heading
        var tableHeading = pxWidget.jQuery("<th>", {
            "html": data.Dimension(i).label
        });

        //check if column is redundant 
        var isRedundant = false;
        if (pxWidget.jQuery.inArray(data.id[i], pxWidget.draw.params[id].hideColumns) != -1) {
            isRedundant = true;
        };

        pxWidget.jQuery('#' + id + " table").find("[name=header-row]").append(tableHeading);

        if (data.Dimension(data.id[i]).role == "time") {
            pxWidget.table.timeColumn[id] = i;
        };

        // Append datatable column
        tableColumns.push({
            data: data.id[i],
            "visible": data.id[i] == pxWidget.draw.params[id].pivot || isRedundant ? false : true,
            "searchable": data.id[i] == pxWidget.draw.params[id].pivot || isRedundant ? false : true,
            "orderable": data.Dimension(data.id[i]).role == "metric" ? false : true,
            render: function (cell, type, row, meta) {
                //alternative to using "createdCell" and data-order attribute which does not work with render
                //depending on request type, return either the code to sort if the time column, or the label for any other column
                //https://stackoverflow.com/questions/51719676/datatables-adding-data-order
                switch (type) {
                    case "sort":
                        return data.Dimension(meta.col).role == "time" ? cell : data.Dimension(data.id[i]).Category(cell).label;
                        break;

                    default:
                        return data.Dimension(data.id[i]).Category(cell).label;
                        break;
                }
            }

        });
    });

    // The column Unit is irrelevent if pivoting by Statitic
    if (!pxWidget.table.pivot.dimensionCode[id] || !pxWidget.table.pivot.isMetric[id]) {
        //check if unit column is redundant 
        var isRedundant = false;
        if (pxWidget.jQuery.inArray("UNIT", pxWidget.draw.params[id].hideColumns) != -1) {
            isRedundant = true;
        };

        // Populate Unit column
        var unitHeading = pxWidget.jQuery("<th>", {
            "html": pxWidget.draw.params[id].internationalisation.unit,
            "class": "text-dark bg-neutral"
        });

        pxWidget.jQuery('#' + id + " table").find("[name=header-row]").append(unitHeading);

        tableColumns.push({
            "data": "unit.label",
            "visible": isRedundant ? false : true,
            "searchable": isRedundant ? false : true,
        });

    }


    // Populate Pivoted columns
    if (pxWidget.table.pivot.variableCodes[id].length) {
        pxWidget.jQuery.each(pxWidget.table.pivot.variableCodes[id], function (index, value) {
            tableColumns.push({
                "data": value,
                "type": "data",
                "class": "text-right font-weight-bold",
                "defaultContent": pxWidget.draw.params[id].defaultContent || "",
                render: function (cell, type, row, meta) {
                    // If pivoting by Statitic then the decimals may be different within the same row
                    return pxWidget.formatNumber(cell, pxWidget.table.pivot.isMetric[id] ? data.Dimension(pxWidget.table.pivot.dimensionCode[id]).Category(value).unit.decimals : row.unit.decimals);
                }
            });
            var pivotHeading = pxWidget.jQuery("<th>",
                {
                    "html": pxWidget.table.pivot.isMetric[id] ? data.Dimension(pxWidget.table.pivot.dimensionCode[id]).Category(value).label + " (" + data.Dimension(pxWidget.table.pivot.dimensionCode[id]).Category(value).unit.label + ")" : data.Dimension(pxWidget.table.pivot.dimensionCode[id]).Category(value).label,
                    "class": "text-right text-light bg-primary"
                });
            pxWidget.jQuery('#' + id + " table").find("[name=header-row]").append(pivotHeading);
        });
    } else {
        tableColumns.push({
            "data": "value",
            "type": "data",
            "class": "text-right font-weight-bold",
            "defaultContent": pxWidget.draw.params[id].defaultContent || "",
            "render": function (cell, type, row, meta) {
                return pxWidget.formatNumber(cell, row.unit.decimals);
            }
        });

        var valueHeading = pxWidget.jQuery("<th>",
            {
                "html": pxWidget.draw.params[id].internationalisation.value,
                "class": "text-right text-light bg-primary"
            });
        pxWidget.jQuery('#' + id + " table").find("[name=header-row]").append(valueHeading);
    }

    //Draw DataTable with Data Set data
    var options = {
        data: jsonTable.data,
        columns: tableColumns
    };

    //define what columns to include in export
    pxWidget.jQuery.each(tableColumns, function (i, v) {
        if (v.visible !== false) {
            //not definitively hidden, include in export
            pxWidget.jQuery.each(pxWidget.draw.params[id].options.buttons, function (indexButton, button) {
                button.exportOptions.columns.push(i);
            });
        }

    });
    //Set the default ordering to the time column unless it is already passed in the snippet if it exists, may be pivoted by time

    if (!pxWidget.draw.params[id].options.order.length) {
        if (pxWidget.table.pivot.dimensionCode[id]) {
            if (data.Dimension(pxWidget.table.pivot.dimensionCode[id]).role == "time") {
                options.order = [];
            }
            else {
                options.order = [[pxWidget.table.timeColumn[id], "desc"]];
            }

        }
        else {
            options.order = [[pxWidget.table.timeColumn[id], "desc"]];
        }
    }
    //remove div height for smooth rendering
    pxWidget.jQuery('#' + id).height("auto");
    pxWidget.jQuery.extend(true, pxWidget.draw.params[id].options, options);
    pxWidget.jQuery('#' + id + " table").DataTable(pxWidget.draw.params[id].options).on('responsive-display', function (e, datatable, row, showHide, update) {

    });

    var footerElements = [];
    if (data.updated) {
        var dateUpdated = pxWidget.moment(data.updated, 'YYYY-MM-DDTHH:mm:ss').format('MMMM DD, YYYY') + " " + pxWidget.moment(data.updated, 'YYYY-MM-DDTHH:mm:ss').format('HH:mm:ss') + " UTC";
        footerElements.push(dateUpdated);
    }

    if (pxWidget.draw.params[id].copyright) {
        footerElements.push('&copy; ' + data.extension.copyright.name);
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
};

/**
 * Pivot a dataset by a Classification or Time code 
 * @param {*} id 
 * @param {*} arrobjTable 
 */
pxWidget.table.pivot.compute = function (id, arrobjTable) {
    // Init
    pxWidget.table.pivot.variableCodes[id] = [];
    // Check if Pivoting is required
    if (!pxWidget.draw.params[id].pivot) {
        return arrobjTable;
    } else {
        pxWidget.table.pivot.dimensionCode[id] = pxWidget.draw.params[id].pivot;
    }


    // Check if pivoting by Statistic
    pxWidget.table.pivot.isMetric[id] = arrobjTable.meta.dimensions[pxWidget.table.pivot.dimensionCode[id]].role == "metric" ? true : false;

    var reducedTable = pxWidget.jQuery.extend(true, {}, arrobjTable);
    var pivotedTable = pxWidget.jQuery.extend(true, {}, arrobjTable);
    var spliceOffset = 0;
    pxWidget.jQuery.each(arrobjTable.data, function (indexData, rowData) {
        // Get all values to pivot
        if (pxWidget.jQuery.inArray(rowData[pxWidget.table.pivot.dimensionCode[id]], pxWidget.table.pivot.variableCodes[id]) == -1) {
            pxWidget.table.pivot.variableCodes[id].push(rowData[pxWidget.table.pivot.dimensionCode[id]]);
        }

        // Reduce the data by the pivot size
        if (rowData[pxWidget.table.pivot.dimensionCode[id]] != pxWidget.table.pivot.variableCodes[id][0]) {
            reducedTable.data.splice(indexData - spliceOffset, 1);
            pivotedTable.data.splice(indexData - spliceOffset, 1);
            spliceOffset++;
        }
    });

    pxWidget.jQuery.each(arrobjTable.data, function (indexData, rowData) {
        pxWidget.jQuery.each(reducedTable.data, function (indexReduced, rowReduced) {
            var match = true;

            // Match the reduced data against the data
            pxWidget.jQuery.each(rowReduced, function (key, value) {
                if (pxWidget.jQuery.inArray(key, [pxWidget.table.pivot.dimensionCode[id], 'unit', 'value']) == -1 && rowData[key] != value) {
                    match = false;
                    return false;
                }
            });

            if (match) {
                // remove pivoted value
                delete pivotedTable.data[indexReduced]['value'];

                // append pivoted column 
                var pivotedColumn = rowData[pxWidget.table.pivot.dimensionCode[id]]
                pivotedTable.data[indexReduced][pivotedColumn] = rowData.value;
                return false;
            }
        });
    });

    // remove pivoted rows and re-arrange array
    arrobjTable.data = [];
    pxWidget.jQuery.each(pivotedTable.data, function (indexPivoted, rowPivoted) {
        if (!rowPivoted.hasOwnProperty('value'))
            arrobjTable.data.push(rowPivoted);
    });

    return arrobjTable;
}

pxWidget.table.compile = function (id) {
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.api.response)) {
        pxWidget.table.ajax.readDataset(id);
        // Avoid self-looping
        return false;
    }

    //get datasets data
    pxWidget.table.response = pxWidget.draw.params[id].data.api.response;
    pxWidget.table.jsonStat = pxWidget.table.response ? new pxWidget.JSONstat(pxWidget.draw.params[id].data.api.response) : null;

    if (pxWidget.table.jsonStat && pxWidget.table.jsonStat.length)
        return true;
    else {
        pxWidget.draw.error(id, 'pxWidget.table.compile: invalid data response');
        return false;
    }
};
pxWidget.table.ajax.readDataset = function (id) {

    // Check data query exists
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.api.query)) {
        pxWidget.draw.error(id, 'pxWidget.table.ajax.readDataset: missing data query');
        return;
    }

    pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].data.api.query.url,
        pxWidget.draw.params[id].data.api.query.data.method,
        pxWidget.draw.params[id].data.api.query.data.params,
        "pxWidget.table.callback.readDatasetOnSuccess",
        id,
        "pxWidget.table.callback.readDatasetOnError",
        id,
        { async: false },
        id)
};

pxWidget.table.callback.readDatasetOnSuccess = function (response, id) {
    if (pxWidget.jQuery.isEmptyObject(response)) {
        pxWidget.draw.error(id, 'pxWidget.table.callback.readDatasetOnSuccess: missing data response');
    } else {
        pxWidget.draw.params[id].data.api.response = response;
        // Restart the drawing after successful compilation
        pxWidget.table.draw(id);
    }
};

pxWidget.table.callback.readDatasetOnError = function (error, id) {
    pxWidget.draw.error(id, 'Unable to retreive data. Please try again later.', true);
};

pxWidget.table.metadata.compile = function (id) {
    //If no fluid, no need to read metadata
    if (!pxWidget.draw.params[id].fluidTime || !pxWidget.draw.params[id].fluidTime.length) {
        return true;
    }

    //is fluid and no metadata yet, need to get metadata
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.response)) {
        pxWidget.table.ajax.readMetadata(id);
        // Avoid self-looping
        return false;
    }
    else {
        return true;
    }

};

pxWidget.table.ajax.readMetadata = function (id) {

    // Check data query exists
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.query)) {
        pxWidget.draw.error(id, 'pxWidget.table.ajax.readMetadata: missing data query');
        return;
    }

    pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].metadata.api.query.url,
        pxWidget.draw.params[id].metadata.api.query.data.method,
        pxWidget.draw.params[id].metadata.api.query.data.params,
        "pxWidget.table.callback.readMetadataOnSuccess",
        id,
        "pxWidget.table.callback.readMetadataOnError",
        id,
        { async: false },
        id)
};

pxWidget.table.callback.readMetadataOnSuccess = function (response, id) {
    if (pxWidget.jQuery.isEmptyObject(response)) {
        pxWidget.draw.error(id, 'pxWidget.table.callback.readMetadataOnSuccess: missing data response');
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
            pxWidget.draw.params[id].data.api.query.data.params.dimension[timeDimensionCode] = {};
            pxWidget.draw.params[id].data.api.query.data.params.dimension[timeDimensionCode].category = {};
            pxWidget.draw.params[id].data.api.query.data.params.dimension[timeDimensionCode].category.index = [];

            pxWidget.jQuery.each(pxWidget.draw.params[id].fluidTime, function (index, value) {
                //fluid time point is relevant to the end of the array
                pxWidget.draw.params[id].data.api.query.data.params.dimension[timeDimensionCode].category.index.push(metadataJsonStat.Dimension(timeDimensionCode).id[(dimensionSize - value) - 1]);
            });
            // Restart the drawing after successful compilation
            pxWidget.table.draw(id);
        }
        else {
            pxWidget.draw.error(id, 'pxWidget.table.metadata.compile: invalid data response');
        }










    }
};

pxWidget.table.callback.readMetadataOnError = function (error, id) {
    pxWidget.draw.error(id, 'pxWidget.table.ajax.readMetadata: Unable to retreive data. Please try again later.', true);
};

/**
 * Load datatable CSS at asynch runtime
 * @param {*} id 
 */
pxWidget.table.loadCSS = function (id) {
    //Avoid loading CSS multiple times
    if (pxWidget.table.isCSSloaded) {
        return;
    } else {
        pxWidget.table.isCSSloaded = true;
    }

    // Load Bootstrap extensions for Datatable if Bootstrap is found
    if (window.jQuery && window.jQuery.fn.modal) {
        // Datatables - Bootstrap
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/1.10.20/css/dataTables.bootstrap4.min.css');
        pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/1.10.20/js/dataTables.bootstrap4.min.js', null, null, true);

        // Datatables - Extension - Responsive - Bootstrap
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/responsive/2.2.3/css/responsive.bootstrap4.min.css');
        pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/responsive/2.2.3/js/responsive.bootstrap4.min.js', null, null, true);

        // pxWidget - Datatable - Bootstrap
        pxWidget.load(window, document, 'link', pxWidget.root + (pxWidget.debug ? 'css/datatable.bootstrap.css' : 'css/datatable.bootstrap.min.css'));
    }
    else {
        // Default css and responsive cc for datatables 
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/1.10.20/css/jquery.dataTables.min.css');
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/responsive/2.2.3/css/responsive.dataTables.min.css');
    }
};