/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/

// Init
var pxWidget = pxWidget || {};
pxWidget.table = {};
pxWidget.table.pivot = {};
pxWidget.table.dimensionCode = null;
pxWidget.table.variableCodes = [];
pxWidget.table.ajax = {};
pxWidget.table.callback = {};
pxWidget.table.isCSSloaded = false;

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

    var data = new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].data.api.response);
    // Parse data-id to array-of-object
    var jsonTable = data.toTable({
        type: 'arrobj',
        meta: true,
        unit: true,
        content: "label"
    });

    var pivotVariableCodes = [];

    if (pxWidget.draw.params[id].pivot) {

        var reducedTable = pxWidget.jQuery.extend(true, {}, jsonTable);
        var pivotedTable = pxWidget.jQuery.extend(true, {}, jsonTable);

        pxWidget.jQuery.each(jsonTable.data, function (indexData, rowData) {
            // Get all values to pivot
            if (pxWidget.jQuery.inArray(rowData[pxWidget.draw.params[id].pivot], pivotVariableCodes) == -1) {
                pivotVariableCodes.push(rowData[pxWidget.draw.params[id].pivot]);
            }

            // Reduce the data by the pivot size
            if (rowData[pxWidget.draw.params[id].pivot] != pivotVariableCodes[0]) {
                reducedTable.data.splice(indexData, 1);
                pivotedTable.data.splice(indexData, 1);
            }
        });

        pxWidget.jQuery.each(jsonTable.data, function (indexData, rowData) {
            pxWidget.jQuery.each(reducedTable.data, function (indexReduced, rowReduced) {
                var match = true;

                // Match the reduced data against the data
                pxWidget.jQuery.each(rowReduced, function (key, value) {
                    if (pxWidget.jQuery.inArray(key, [pxWidget.draw.params[id].pivot, 'unit', 'value']) == -1 && rowData[key] != value) {
                        match = false;
                        return false;
                    }
                });

                if (match) {
                    // remove pivoted value
                    delete pivotedTable.data[indexReduced]['value'];

                    // append pivoted column 
                    var pivotedColumn = rowData[pxWidget.draw.params[id].pivot]
                    pivotedTable.data[indexReduced][pivotedColumn] = rowData.value;
                    return false;
                }
            });
        });

        // remove pivoted rows and re-arrange array
        jsonTable.data = [];
        pxWidget.jQuery.each(pivotedTable.data, function (indexPivoted, rowPivoted) {
            if (!rowPivoted.hasOwnProperty('value'))
                jsonTable.data.push(rowPivoted);
        });
    }

    var table = pxWidget.jQuery('<table>', { "class": "table table-striped hover" })
        .append(pxWidget.jQuery('<caption>', { "text": pxWidget.draw.params[id].title ? pxWidget.draw.params[id].data.api.response.label.trim() : "" }))
        .append(pxWidget.jQuery('<thead>').append(pxWidget.jQuery('<tr>', { "name": "header-row" })))
        .append(pxWidget.jQuery('<tbody>'));

    pxWidget.jQuery('#' + id).append(table);

    var tableColumns = [];
    // Populate columns with Dimensions
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
            "searchable": data.id[i] == pxWidget.draw.params[id].pivot ? false : true,
            render: function (cell, type, row, meta) {
                //alternative to using "createdCell" and data-order attribute which does not work with render
                //depending on request type, return either the code to sort if the time column, or the label for any other column
                //https://stackoverflow.com/questions/51719676/datatables-adding-data-order
                switch (type) {
                    case "sort":
                        return cell;
                        break;

                    default:
                        return cell;
                        break;
                }
            }
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
    if (pivotVariableCodes.length) {
        pxWidget.jQuery.each(pivotVariableCodes, function (index, value) {
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


pxWidget.table.compile = function (id) {
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.api.response)) {
        pxWidget.table.ajax.readDataset(id);
        // Avoid self-looping
        return false;
    }

    //get datasets data
    var isValidData = true;
    var data = new pxWidget.JSONstat.jsonstat(pxWidget.draw.params[id].data.api.response) || pxWidget.draw.params[id].data.api.response;
    if (!data.length) {
        pxWidget.draw.error(id, 'pxWidget.table.compile: invalid data response [' + (index + 1) + ']');
        isValidData = false;
        return false;
    }

    return isValidData;
}

pxWidget.table.ajax.readDataset = function (id) {

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

pxWidget.table.callback.readDataset = function (result, id) {
    pxWidget.draw.params[id].data.api.response = result;

    var hasCompiled = true;
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.api.response)) {
        return hasCompiled = false;
    }

    if (hasCompiled) {
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
        pxWidget.load(window, document, 'link', pxWidget.root + 'css/pxWidget.datatable.bootstrap.min.css');
    }
    else {
        // Default datatables 
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/1.10.20/css/jquery.dataTables.min.css');
    }
};