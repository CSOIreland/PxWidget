/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/

// Init
var pxWidget = pxWidget || {};
pxWidget.table = {};
pxWidget.table.ajax = {};
pxWidget.table.callback = {};
pxWidget.table.isCSSloaded = false;
pxWidget.table.response = null;
pxWidget.table.jsonStat = null;

pxWidget.table.pivot = {};
pxWidget.table.pivot.dimensionCode = [];
pxWidget.table.pivot.variableCodes = [];

/**
 * Draw a pxWidget Table
 * @param {*} id 
 */
pxWidget.table.draw = function (id) {

    // Init & Spinner
    pxWidget.draw.spinner(id);

    if (!pxWidget.table.compile(id)) {
        return;
    }

    pxWidget.table.loadCSS(id);

    if (pxWidget.jQuery.fn.DataTable.isDataTable('#' + id + " table")) {
        ('#' + id + " table").DataTable().destroy();
        //cannot use redraw as columns are dynamically created depending on the matrix. Have to destroy and re-initiate
    }

    // Parse JSON-stat
    var data = new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].data.api.response);

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
        var table = pxWidget.jQuery('<table>', { "class": "table table-striped hover" });
    else
        var table = pxWidget.jQuery('<table>', { "class": "display", "style": "width: 100%" });

    table.append(pxWidget.jQuery('<caption>', { "text": pxWidget.draw.params[id].title ? pxWidget.draw.params[id].data.api.response.label.trim() : "" }));
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

        pxWidget.jQuery('#' + id + " table").find("[name=header-row]").append(tableHeading);

        // Append datatable column
        tableColumns.push({
            data: data.id[i],
            "visible": data.id[i] == pxWidget.draw.params[id].pivot ? false : true,
            "searchable": data.id[i] == pxWidget.draw.params[id].pivot ? false : true
        });
    });

    // Populate Unit column
    var unitHeading = pxWidget.jQuery("<th>", {
        "html": pxWidget.draw.params[id].internationalisation.unit,
        "class": "text-dark bg-neutral"
    });

    pxWidget.jQuery('#' + id + " table").find("[name=header-row]").append(unitHeading);

    tableColumns.push({
        "data": "unit.label",
        "type": "data"
    });

    // Populate Pivoted columns
    if (pxWidget.table.pivot.variableCodes[id].length) {
        pxWidget.jQuery.each(pxWidget.table.pivot.variableCodes[id], function (index, value) {
            tableColumns.push({
                "data": value,
                "type": "data",
                "class": "text-right font-weight-bold",
                "defaultContent": pxWidget.draw.params[id].defaultContent || "",
                "render": function (cell, type, row, meta) {
                    return pxWidget.formatNumber(cell, row.unit.decimals);
                }
            });

            var pivotHeading = pxWidget.jQuery("<th>",
                {
                    "html": data.Dimension(pxWidget.draw.params[id].pivot).Category(value).label,
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
    pxWidget.jQuery.extend(true, pxWidget.draw.params[id].options, options);
    pxWidget.jQuery('#' + id + " table").DataTable(pxWidget.draw.params[id].options).on('responsive-display', function (e, datatable, row, showHide, update) {

    });

    var footerElements = [];
    footerElements.push(data.updated);
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

    var reducedTable = pxWidget.jQuery.extend(true, {}, arrobjTable);
    var pivotedTable = pxWidget.jQuery.extend(true, {}, arrobjTable);

    pxWidget.jQuery.each(arrobjTable.data, function (indexData, rowData) {
        // Get all values to pivot
        if (pxWidget.jQuery.inArray(rowData[pxWidget.table.pivot.dimensionCode[id]], pxWidget.table.pivot.variableCodes[id]) == -1) {
            pxWidget.table.pivot.variableCodes[id].push(rowData[pxWidget.table.pivot.dimensionCode[id]]);
        }

        // Reduce the data by the pivot size
        if (rowData[pxWidget.table.pivot.dimensionCode[id]] != pxWidget.table.pivot.variableCodes[id][0]) {
            reducedTable.data.splice(indexData, 1);
            pivotedTable.data.splice(indexData, 1);
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
    pxWidget.table.jsonStat = pxWidget.table.response ? new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].data.api.response) : null;

    if (pxWidget.table.jsonStat && pxWidget.table.jsonStat.length)
        return true;
    else {
        pxWidget.draw.error(id, 'pxWidget.table.compile: invalid data response');
        return false;
    }
}

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
        "pxWidget.table.callback.readDataset",
        id,
        null,
        null,
        { async: false },
        id)
};

pxWidget.table.callback.readDataset = function (response, id) {
    if (pxWidget.jQuery.isEmptyObject(response)) {
        pxWidget.draw.error(id, 'pxWidget.table.callback.readDataset: missing data response');
    } else {
        pxWidget.draw.params[id].data.api.response = response;
        // Restart the drawing after successful compilation
        pxWidget.table.draw(id);
    }
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
        pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/1.10.20/js/dataTables.bootstrap4.js', null, null, true);

        // Datatables - Extension - Responsive - Bootstrap
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/responsive/2.2.3/css/responsive.bootstrap4.min.css');
        pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/responsive/2.2.3/js/responsive.bootstrap4.js', null, null, true);

        // pxWidget - Datatable - Bootstrap
        pxWidget.load(window, document, 'link', pxWidget.root + (pxWidget.debug ? 'css/datatable.bootstrap.min.css' : 'css/datatable.bootstrap.css'));
    }
    else {
        // Default datatables 
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/1.10.20/css/jquery.dataTables.min.css');
    }
};