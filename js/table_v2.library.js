/*******************************************************************************
PxWidget - Chart - Library
*******************************************************************************/

// Init
var pxWidget = pxWidget || {};
pxWidget.table_v2 = {};
pxWidget.table_v2.metadata = {};
pxWidget.table_v2.data = {};
pxWidget.table_v2.ajax = {};
pxWidget.table_v2.callback = {};
pxWidget.table_v2.isCSSloaded = false;
pxWidget.table_v2.jsonStat = [];
pxWidget.table_v2.jsonStatTable = [];
pxWidget.table_v2.dataTable = [];


/**
 * Draw a pxWidget Table
 * @param {*} id 
 */
pxWidget.table_v2.draw = function (id) {

    // Store it for the data sort plugin
    // This implies that every widget is sharing the same defaultContent
    pxWidget.table_v2.defaultContent = pxWidget.draw.params[id].defaultContent;
    // Init & Spinner
    pxWidget.draw.spinner(id);
    if (!pxWidget.table_v2.metadata.compile(id)) {
        return;
    }

    if (!pxWidget.table_v2.data.compile(id)) {
        return;
    }

    if (pxWidget.draw.params[id].rowFields.length && pxWidget.draw.params[id].columnFields.length) { //it's a multi pivot or pivot table
        //we need to create a custom version of the JSONstat with variable codes that order correctly so that the order of teh classification is maintained
        //we only need to do this for the dimensions that are in the columnFields are are not time
        var jsonStatForPivot = pxWidget.jQuery.extend(true, {}, pxWidget.draw.params[id].data.api.response);
        pxWidget.jQuery.each(pxWidget.draw.params[id].columnFields, function (index, value) {
            //change if not time
            if (!jsonStatForPivot.role.time.includes(value)) {
                //get original dimension
                var originaldimension = pxWidget.jQuery.extend(true, {}, jsonStatForPivot.dimension[value]);
                //delete it from jsonStat
                delete jsonStatForPivot.dimension[value].category;
                //rebuild
                jsonStatForPivot.dimension[value].category = {};
                jsonStatForPivot.dimension[value].category.index = [];
                jsonStatForPivot.dimension[value].category.label = {};

                pxWidget.jQuery.each(originaldimension.category.index, function (i, v) {
                    jsonStatForPivot.dimension[value].category.index.push(i);
                    jsonStatForPivot.dimension[value].category.label[i] = originaldimension.category.label[v];
                });
            }
        });
        pxWidget.table_v2.jsonStat[id] = new pxWidget.JSONstat(jsonStatForPivot);
        pxWidget.table_v2.jsonStatTable[id] = pxWidget.table_v2.jsonStat[id].toTable({
            type: 'arrobj',
            unit: true,
            content: "id"
        });
        pxWidget.table_v2.parsePivotData(id);
    }
    else {//if nothing passed in columnFields then it's a flat table
        var jsonStat = new pxWidget.JSONstat(pxWidget.draw.params[id].data.api.response);
        pxWidget.table_v2.jsonStat[id] = jsonStat;
        pxWidget.table_v2.jsonStatTable[id] = pxWidget.table_v2.jsonStat[id].toTable({
            type: 'arrobj',
            unit: true,
            content: "id"
        });
        pxWidget.table_v2.parseFlatData(id);
    }

};

/**
 * format the values, get the correct label for unit
 * @param {*} id 
 */
pxWidget.table_v2.parsePivotData = function (id) {
    var parsedData = [];
    parsedData = pxWidget.table_v2.jsonStatTable[id].map(row => {
        var parsedRow = {}
        for (var key in row) {
            if (key == 'value') {
                parsedRow[pxWidget.constant.valueField] = row[key] ? pxWidget.formatNumber(row[key], row['unit'].decimals) : pxWidget.draw.params[id].defaultContent;
                parsedRow[pxWidget.constant.valueField] = row[key] ? pxWidget.formatNumber(row[key], row['unit'].decimals) : pxWidget.draw.params[id].defaultContent;
            }
            else if (key == 'unit') {
                parsedRow[pxWidget.draw.params[id].internationalisation.unit] = row[key].label;
            }
            else {
                parsedRow[pxWidget.table_v2.jsonStat[id].Dimension(key).label] = row[key];
            }
        }
        return parsedRow
    });

    pxWidget.table_v2.pivotData(parsedData, id);

};

/**
 * Format values in data
 * @param {*} id 
 */
pxWidget.table_v2.parseFlatData = function (id) {
    var parsedData = [];
    parsedData = pxWidget.table_v2.jsonStatTable[id].map(row => {
        var parsedRow = {}
        for (var key in row) {
            if (key == 'value') {
                parsedRow[pxWidget.constant.valueField] = row[key] ? pxWidget.formatNumber(row[key], row['unit'].decimals) : pxWidget.draw.params[id].defaultContent;
            }
            else {
                parsedRow[key] = row[key]
            }
        }
        return parsedRow
    });

    var flatTableOptions = pxWidget.jQuery.extend(true, {}, pxWidget.draw.params[id].options);
    pxWidget.table_v2.renderFlatTable(parsedData, id, flatTableOptions);
};

/**
 * Pivot the data based on rowFields and ColumnFields
 * @param {*} data 
 * @param {*} id 
 */
pxWidget.table_v2.pivotData = function (data, id) {
    var pivotMap = new Map();
    var rowValues = new Set();
    var columnValues = new Set();

    //get labels for row fields and columns fields
    var rowFieldsLabels = [];
    pxWidget.jQuery.each(pxWidget.draw.params[id].rowFields, function (index, value) {
        if (value.toLowerCase() == pxWidget.draw.params[id].internationalisation.unit.toLowerCase()) {
            rowFieldsLabels.push(value)
        }
        else {
            rowFieldsLabels.push(pxWidget.table_v2.jsonStat[id].Dimension(value).label);
        }

    });

    var columnFieldsLabels = [];
    pxWidget.jQuery.each(pxWidget.draw.params[id].columnFields, function (index, value) {
        if (value.toLowerCase() == pxWidget.draw.params[id].internationalisation.unit.toLowerCase()) {
            columnFieldsLabels.push(value)
        }
        else {
            columnFieldsLabels.push(pxWidget.table_v2.jsonStat[id].Dimension(value).label);
        }
    });
    // Create pivot map
    for (let i = 0; i < data.length; i++) {
        var row = data[i];
        // Create a unique key for each row combination
        var rowKey = rowFieldsLabels.map(field => String(row[field] || '')).join(pxWidget.constant.separator);
        // Create a unique key for each column combination
        var columnKey = columnFieldsLabels.map(field => String(row[field] || '')).join(pxWidget.constant.separator);
        // Get the value from the actual value field
        var value = row[pxWidget.constant.valueField];

        // Add the row and column keys to their respective sets
        rowValues.add(rowKey);
        columnValues.add(columnKey);

        // If this row key doesn't exist in the pivot map, create a new map for it
        if (!pivotMap.has(rowKey)) {
            pivotMap.set(rowKey, new Map());
        }
        // Set the value in the pivot map, using row and column keys
        pivotMap.get(rowKey).set(columnKey, value);
    }

    // Sort column values for grouping
    var sortedColumnValues = Array.from(columnValues).sort();

    // Create pivoted data array
    var pivotedData = [
        [...rowFieldsLabels, ...sortedColumnValues]
    ];

    // Iterate over each row value
    rowValues.forEach(rowValue => {
        // Split the row key back into its component parts
        var rowData = rowValue.split(pxWidget.constant.separator);
        // Start building a new row for the pivoted table with the row data
        var newRow = [...rowData];

        // Iterate over each sorted column value
        sortedColumnValues.forEach(columnValue => {
            // Retrieve the value from the pivot map using the row and column keys
            // If the value is not found, use an empty string as a default
            newRow.push(pivotMap.get(rowValue)?.get(columnValue) || '');
        });
        // Add the newly varructed row to the pivoted data array
        pivotedData.push(newRow);
    });

    var pivotedResult = {
        data: pivotedData,
        rowFieldsCount: rowFieldsLabels.length,
        columnFieldsCount: columnFieldsLabels.length
    };
    pxWidget.table_v2.renderPivotedTable(pivotedResult, id)

};

/**
 * Draw the pivoted HTML table with complex headers
 * @param {*} pivotedResult 
 * @param {*} id 
 */
pxWidget.table_v2.renderPivotedTable = function (pivotedResult, id) {
    // Destructure the input object to get necessary data
    var { data, rowFieldsCount, columnFieldsCount } = pivotedResult;

    pxWidget.table_v2.loadCSS(id);

    if (pxWidget.jQuery.fn.DataTable.isDataTable('#' + id + " table")) {
        pxWidget.jQuery('#' + id + " table").DataTable().destroy();
        //cannot use redraw as columns are dynamically created depending on the matrix. Have to destroy and re-initiate
    }

    // Set the Bootstrap table for Datatable if Bootstrap is found

    if (window.jQuery && window.jQuery.fn.modal) {
        // Clear the container and create a new table element
        pxWidget.jQuery('#' + id).empty().html(pxWidget.jQuery('<table>', {
            id: 'pivotTable' + id,
            class: 'custom-table table table-striped table-bordered hover',
            style: 'width: 100%'
        }).get(0).outerHTML);
    }
    else {
        pxWidget.jQuery('#' + id).empty().html(pxWidget.jQuery('<table>', {
            id: 'pivotTable' + id,
            class: 'custom-table display',
            style: 'width: 100%'
        }).get(0).outerHTML);
    }

    // Get references to the table and create thead and tbody elements
    let $table = pxWidget.jQuery('#pivotTable' + id);
    let $thead = pxWidget.jQuery('<thead>').appendTo($table);
    let $tbody = pxWidget.jQuery('<tbody>').appendTo($table);
    if (pxWidget.draw.params[id].title) {
        pxWidget.jQuery('<caption>', {
            text: pxWidget.draw.params[id].title.trim()
        }).appendTo($table);
    }

    var csvDownloadData = [];
    //create csvDownloadHeaderRow
    var csvHeaderRow = [];
    pxWidget.jQuery.each(data[0], function (index, value) {
        if (index < rowFieldsCount) {
            csvHeaderRow.push(value);
        }
        else {
            var header = "";
            pxWidget.jQuery.each(value.split(pxWidget.constant.separator), function (i, v) {
                var headerComponent;
                if (pxWidget.draw.params[id].columnFields[i].toLowerCase() == pxWidget.draw.params[id].internationalisation.unit.toLowerCase()) {
                    headerComponent = v
                        + (i != value.split("|").length - 1 ? "|" : "");
                }
                else {
                    headerComponent = pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.draw.params[id].columnFields[i]).Category(v).label
                        + (i != value.split("|").length - 1 ? "|" : "");
                }
                header += headerComponent;
            });
            csvHeaderRow.push(header);
        }
    })

    csvDownloadData.push(csvHeaderRow);

    // Create table header with colspan
    for (let i = 0; i < columnFieldsCount; i++) {
        // Create a new header row for each level of column fields
        let $headerRow = pxWidget.jQuery('<tr>').appendTo($thead);
        let colspan = 1;
        let lastHeader = '';

        // Add row field headers (only on the first iteration)
        if (i === 0) {
            for (let j = 0; j < rowFieldsCount; j++) {
                // Create header cell for each row field, spanning all column field rows
                pxWidget.jQuery('<th>')
                    .attr('rowspan', columnFieldsCount)
                    .attr('style', "text-align: center;vertical-align: bottom;")
                    .addClass('pivot-header')
                    .text(data[0][j])
                    .appendTo($headerRow);
            }
        }

        // Add column field headers
        for (let j = rowFieldsCount; j < data[0].length; j++) {
            // Split the header text to get the current level's value
            var headerParts = data[0][j].split(pxWidget.constant.separator);
            if (headerParts[i] === lastHeader) {
                // If it's the same as the last header, increase the colspan
                colspan++;
            } else {
                if (lastHeader !== '') {
                    // If there was a previous header, add it to the row
                    pxWidget.jQuery('<th>')
                        .attr('colspan', colspan)
                        .attr('style', "text-align: center;vertical-align: bottom;")
                        .addClass('pivot-header')
                        .text(
                            function () {
                                if (pxWidget.draw.params[id].columnFields[i] == pxWidget.draw.params[id].internationalisation.unit) {
                                    return lastHeader
                                }
                                else {
                                    return pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.draw.params[id].columnFields[i]).Category(lastHeader).label
                                }

                            }
                        )
                        .appendTo($headerRow);
                }
                // Reset for the new header
                lastHeader = headerParts[i];
                colspan = 1;
            }
        }
        // Add the last header of the row
        if (lastHeader !== '') {
            pxWidget.jQuery('<th>')
                .attr('colspan', colspan)
                .attr('style', "text-align: center;vertical-align: bottom;")
                .addClass('pivot-header')
                .text(
                    function () {
                        if (pxWidget.draw.params[id].columnFields[i] == pxWidget.draw.params[id].internationalisation.unit) {
                            return lastHeader
                        }
                        else {
                            return pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.draw.params[id].columnFields[i]).Category(lastHeader).label
                        }
                    }
                )
                .appendTo($headerRow);
        }
    }

    //check if we have highlighted dimension row in rowFields and get position
    var highlightedDimensionPosition = pxWidget.draw.params[id].rowFields.indexOf(pxWidget.draw.params[id].highlightRow.dimension);
    var timeDimensionCode = null;
    pxWidget.jQuery.each(pxWidget.table_v2.jsonStat[id].Dimension(), function (index, value) {
        if (value.role == "time") {
            timeDimensionCode = pxWidget.table_v2.jsonStat[id].id[index];
            return;
        }
    });

    // Create table body
    data.slice(1).forEach(row => {
        var csvDataRow = [];
        var highlighted = false;
        if (highlightedDimensionPosition >= 0) {
            if (pxWidget.draw.params[id].highlightRow.variable.indexOf(row[highlightedDimensionPosition]) >= 0) {
                highlighted = true;
            }
        }

        // Create a new row for each data entry
        let $dataRow = pxWidget.jQuery('<tr>', {
            style: highlighted ? "font-weight: bold" : "",
            class: highlighted ? "widget-table-highlighted-row" : ""
        }).appendTo($tbody);
        row.forEach((cell, index) => {
            if (index <= pxWidget.draw.params[id].rowFields.length - 1) {
                //row fields
                // Add each cell to the row, right align values only
                if (pxWidget.draw.params[id].rowFields[index] == pxWidget.draw.params[id].internationalisation.unit) {
                    pxWidget.jQuery('<td>', {
                    }).text(cell).appendTo($dataRow);
                    csvDataRow.push(cell);
                }
                else {
                    if (pxWidget.draw.params[id].rowFields[index] == timeDimensionCode) {
                        pxWidget.jQuery('<td>', {
                            "data-custom-sort": cell //used for sorting time by codes ather than labels
                        }).html(pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.draw.params[id].rowFields[index]).Category(cell).label).appendTo($dataRow);
                        csvDataRow.push(pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.draw.params[id].rowFields[index]).Category(cell).label);
                    }
                    else {
                        pxWidget.jQuery('<td>', {
                        }).html(pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.draw.params[id].rowFields[index]).Category(cell).label).appendTo($dataRow);
                        csvDataRow.push(pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.draw.params[id].rowFields[index]).Category(cell).label);
                    }

                }


            }
            else {
                //column fields
                //right align values only
                pxWidget.jQuery('<td>', {
                    "style": "text-align: right;"
                }).text(cell).appendTo($dataRow);
                csvDataRow.push(cell);
            }

        });

        csvDownloadData.push(csvDataRow);
    });

    var pivotTableOptions = pxWidget.jQuery.extend(true, {}, pxWidget.draw.params[id].options);
    pivotTableOptions.columnDefs = [];

    pivotTableOptions.buttons = [
        {
            text: 'Download CSV',
            action: function (e, dt) {
                pxWidget.table_v2.downloadCsv(csvDownloadData, pxWidget.draw.params[id].matrix + "_" + pxWidget.moment(Date.now()).format('DDMMYYYYHHmmss'));

            }
        }
    ];


    let timeColumnIndex = pxWidget.draw.params[id].rowFields.indexOf(timeDimensionCode);

    if (timeColumnIndex >= 0 && !pxWidget.draw.params[id].options.order.length) {
        //sorting of time by code instead of label
        pivotTableOptions.columnDefs.push({
            targets: timeColumnIndex,
            orderDataType: "custom-sort"
        });

        pivotTableOptions.order = [[timeColumnIndex, 'desc']];

        //get statistic dimension code to turn off orderable in that column
        var statisticDimensionCode = null;
        pxWidget.jQuery.each(pxWidget.table_v2.jsonStat[id].Dimension(), function (index, value) {
            if (value.role == "metric") {
                statisticDimensionCode = pxWidget.table_v2.jsonStat[id].id[index];
                return;
            }
        });
        let statisticsColumnIndex = pxWidget.draw.params[id].rowFields.indexOf(statisticDimensionCode);
        //sorted by time so disable sort by statistic if in rows
        if (statisticsColumnIndex >= 0) {
            pivotTableOptions.columnDefs.push({ targets: [statisticsColumnIndex], orderable: false });
        }
    }

    //get the index of the value columns to define type for natural sorting
    var valueColumnIndex = [];
    pxWidget.jQuery.each(data[0], function (index, value) {
        if (index >= pxWidget.draw.params[id].rowFields.length) {
            valueColumnIndex.push(index)
        }
    });
    pivotTableOptions.columnDefs.push({ targets: valueColumnIndex, type: "data" });

    pxWidget.table_v2.runDataTable(id, pivotTableOptions);

};

/**
 * Draw the flat HTML table
 * @param {*} data 
 * @param {*} id 
 * @param {*} flatTableOptions 
 */
pxWidget.table_v2.renderFlatTable = function (data, id, flatTableOptions) {
    pxWidget.table_v2.loadCSS(id);
    if (window.jQuery && window.jQuery.fn.modal) {
        // Clear the container and create a new table element
        pxWidget.jQuery('#' + id).empty().html(pxWidget.jQuery('<table>', {
            id: 'pivotTable' + id,
            class: 'custom-table table table-striped table-bordered hover',
            style: 'width: 100%'
        }).get(0).outerHTML);
    }
    else {
        pxWidget.jQuery('#' + id).empty().html(pxWidget.jQuery('<table>', {
            id: 'pivotTable' + id,
            class: 'custom-table display',
            style: 'width: 100%'
        }).get(0).outerHTML);
    }


    let $table = pxWidget.jQuery('#pivotTable' + id);
    let $thead = pxWidget.jQuery('<thead>').appendTo($table);
    let $tbody = pxWidget.jQuery('<tbody>').appendTo($table);

    var timeDimensionCode = null;
    var classificationDimensions = [];
    pxWidget.jQuery.each(pxWidget.table_v2.jsonStat[id].Dimension(), function (index, value) {
        if (value.role == "time") {
            timeDimensionCode = pxWidget.table_v2.jsonStat[id].id[index];
        }
        if (value.role == "classification") {
            classificationDimensions.push(pxWidget.table_v2.jsonStat[id].id[index]);
        }
    });

    // Construct the header array in the desired order
    var headersOrdered = [
        pxWidget.constant.statisticField,
        timeDimensionCode,
        ...classificationDimensions,
        "unit",
        pxWidget.constant.valueField
    ];
    var csvDownloadData = [];
    var csvHeaderRow = [];
    let $headerRow = pxWidget.jQuery('<tr>').appendTo($thead);
    headersOrdered.forEach(header => {
        if (header == "unit") {
            pxWidget.jQuery('<th>', { style: "text-align: left" }).html(pxWidget.draw.params[id].internationalisation.unit).appendTo($headerRow);
            csvHeaderRow.push(pxWidget.draw.params[id].internationalisation.unit);
        }
        else if (header == pxWidget.constant.valueField) {
            pxWidget.jQuery('<th>', { style: "text-align: right" }).html(pxWidget.draw.params[id].internationalisation.value).appendTo($headerRow);
            csvHeaderRow.push(pxWidget.draw.params[id].internationalisation.value);
        }
        else if (header == pxWidget.constant.statisticField) {
            pxWidget.jQuery('<th>', { style: "text-align: left" }).html(pxWidget.jQuery('<span>', { name: "code", text: header, style: "display:none;" }).get(0).outerHTML + pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.constant.statisticField).label).appendTo($headerRow);
            csvHeaderRow.push(pxWidget.table_v2.jsonStat[id].Dimension(pxWidget.constant.statisticField).label);
        }
        else {//classifications
            pxWidget.jQuery('<th>', { style: "text-align: left" }).html(pxWidget.jQuery('<span>', { name: "code", text: header, style: "display:none;" }).get(0).outerHTML + pxWidget.table_v2.jsonStat[id].Dimension(header).label).appendTo($headerRow);
            csvHeaderRow.push(pxWidget.table_v2.jsonStat[id].Dimension(header).label);
        }

    });
    csvDownloadData.push(csvHeaderRow);
    // Create table body
    data.forEach(row => {
        var csvDataRow = [];
        let $dataRow = pxWidget.jQuery('<tr>').appendTo($tbody);
        headersOrdered.forEach(header => {
            if (header == "unit") {
                pxWidget.jQuery('<td>').html(row[header].label).appendTo($dataRow);
                csvDataRow.push(row[header].label);
            }
            else if (header == pxWidget.constant.valueField) {
                pxWidget.jQuery('<td>', { style: "text-align: right; font-weight: bold" }).html(row[header]).appendTo($dataRow);
                csvDataRow.push(row[header]);
            }
            else if (header == timeDimensionCode) {
                //add data-custom-sort for sorting by code instead of label
                pxWidget.jQuery('<td>', { "data-custom-sort": row[header] }).html(pxWidget.jQuery('<span>', { name: "code", text: row[header], style: "display:none;" }).get(0).outerHTML + pxWidget.table_v2.jsonStat[id].Dimension(header).Category(row[header]).label).appendTo($dataRow);
                csvDataRow.push(pxWidget.table_v2.jsonStat[id].Dimension(header).Category(row[header]).label);
            }
            else {
                pxWidget.jQuery('<td>').html(pxWidget.jQuery('<span>', { name: "code", text: row[header], style: "display:none;" }).get(0).outerHTML + pxWidget.table_v2.jsonStat[id].Dimension(header).Category(row[header]).label).appendTo($dataRow);
                csvDataRow.push(pxWidget.table_v2.jsonStat[id].Dimension(header).Category(row[header]).label)
            }
        });

        csvDownloadData.push(csvDataRow);
    });

    flatTableOptions.buttons = [
        {
            text: 'Download CSV',
            action: function (e, dt) {
                pxWidget.table_v2.downloadCsv(csvDownloadData, pxWidget.draw.params[id].matrix + "_" + pxWidget.moment(Date.now()).format('DDMMYYYYHHmmss'));

            }
        }
    ];
    flatTableOptions.columnDefs = [];

    let timeColumnIndex = headersOrdered.indexOf(timeDimensionCode);
    flatTableOptions.order = [[timeColumnIndex, 'desc']];

    let sastatisticColumnIndex = headersOrdered.indexOf(pxWidget.constant.statisticField);
    flatTableOptions.columnDefs.push({ targets: [sastatisticColumnIndex], orderable: false });
    //set the value column as type  data for natural sorting
    flatTableOptions.columnDefs.push({
        targets: [headersOrdered.length - 1],
        type: "data"
    });
    //sorting of time by code instead of label
    flatTableOptions.columnDefs.push({
        targets: timeColumnIndex,
        orderDataType: "custom-sort"
    });

    pxWidget.table_v2.runDataTable(id, flatTableOptions);

};

/**
 * Init the HTML tables as datatables
 * @param {*} id 
 * @param {*} options 
 */
pxWidget.table_v2.runDataTable = function (id, options) {
    // Initialize DataTable with options
    pxWidget.table_v2.dataTable[id] = pxWidget.jQuery('#pivotTable' + id).DataTable(options).on('order.dt', function (e) {

        if (pxWidget.draw.callback[id]) {
            //pick up the sort order and run the callback to draw the snippet with new sort order
            pxWidget.draw.params[id].options.order = pxWidget.jQuery(this).DataTable().order()
            pxWidget.draw.callback[id]();
        }

    });

    var footerElements = [];

    if (pxWidget.draw.params[id].copyright) {
        footerElements.push('&copy; ' + pxWidget.table_v2.jsonStat[id].extension.copyright.name);
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
            "html": footerElements.join("<br>"),
            "style": "clear:both"
        }).css({ "text-align": "right" });
        // Append footer
        pxWidget.jQuery('#' + id).append(footer);
    }

    // Run optional callback at last
    if (pxWidget.draw.callback[id]) {
        pxWidget.draw.callback[id]();
    }
};

/**
 * Load datatable CSS at asynch runtime
 * @param {*} id 
 */
pxWidget.table_v2.loadCSS = function (id) {
    //Avoid loading CSS multiple times
    if (pxWidget.table_v2.isCSSloaded) {
        return;
    } else {
        pxWidget.table_v2.isCSSloaded = true;
    }

    // Load Bootstrap extensions for Datatable if Bootstrap is found
    if (window.jQuery && window.jQuery.fn.modal) {
        // Datatables - Bootstrap
        pxWidget.load(window, document, 'link', 'https://cdn.jsdelivr.net/gh/CSOIreland/Datatables@1.13.4b1/DataTables/css/dataTables.bootstrap5.min.css');
        pxWidget.load(window, document, 'script', 'https://cdn.jsdelivr.net/gh/CSOIreland/Datatables@1.13.4b1/DataTables/js/dataTables.bootstrap5.min.js', null, null, true);

        // pxWidget - Datatable - Bootstrap
        pxWidget.load(window, document, 'link', pxWidget.root + (pxWidget.debug ? 'css/datatable.bootstrap.css' : 'css/datatable.bootstrap.min.css'));
    }
    else {
        // Default css  
        pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/1.10.20/css/jquery.dataTables.min.css');
    }
};

/**
 * Download the data as csv
 * @param {*} json_data 
 * @param {*} filename 
 */
pxWidget.table_v2.downloadCsv = function (json_data, filename) {

    var data = pxWidget.jQuery.extend(true, [], json_data);
    var dataForCsv = data.map(array => array.map(item => item.replace(/\.\./g, '')));
    var csv = Papa.unparse(dataForCsv); // Assuming you have the jsonToCsv function defined
    // Create a Blob from the CSV string
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    // Create a temporary URL for the Blob
    var url = URL.createObjectURL(blob);

    // Create a download link
    var a = document.createElement('a');
    a.href = url;
    a.download
        = filename || 'data.csv';

    // Simulate a click on the link to trigger the download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke the URL to free up resources
    URL.revokeObjectURL(url);

};

/**
 * Check if we need metadata and if it's already been parsed 
 * @param {*} id 
 * @returns 
 */
pxWidget.table_v2.metadata.compile = function (id) {

    //If no fluid, no need to read metadata
    if (!pxWidget.draw.params[id].fluidTime || !pxWidget.draw.params[id].fluidTime.length) {
        return true;
    }

    //is fluid and no metadata yet, need to get metadata
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.response)) {
        pxWidget.table_v2.ajax.readMetadata(id);
        // Avoid self-looping
        return false;
    }
    else {
        return true;
    }

};

/**
 * Get metadata
 * @param {*} id 
 * @returns 
 */
pxWidget.table_v2.ajax.readMetadata = function (id) {
    // Check data query exists
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].metadata.api.query)) {
        pxWidget.draw.error(id, 'pxWidget.table_v2.ajax.readMetadata: missing data query');
        return;
    }

    pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].metadata.api.query.url,
        pxWidget.draw.params[id].metadata.api.query.data.method,
        pxWidget.draw.params[id].metadata.api.query.data.params,
        "pxWidget.table_v2.callback.readMetadataOnSuccess",
        id,
        "pxWidget.table_v2.callback.readMetadataOnError",
        id,
        { async: false },
        id)
};

/**
 * Get metadata callback
 * @param {*} response 
 * @param {*} id 
 */
pxWidget.table_v2.callback.readMetadataOnSuccess = function (response, id) {
    if (pxWidget.jQuery.isEmptyObject(response)) {
        pxWidget.draw.error(id, 'pxWidget.table_v2.callback.readMetadataOnSuccess: missing data response');
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
            pxWidget.table_v2.draw(id);
        }
        else {
            pxWidget.draw.error(id, 'pxWidget.table_v2.metadata.compile: invalid data response');
        }
    }
};

/**
 * Get metadata callback error
 * @param {*} error 
 * @param {*} id 
 */
pxWidget.table_v2.callback.readMetadataOnError = function (error, id) {
    pxWidget.draw.error(id, 'pxWidget.table_v2.ajax.readMetadata: Unable to retreive data. Please try again later.', true);
};

/**
 * Check if we have data
 * @param {*} id 
 * @returns 
 */
pxWidget.table_v2.data.compile = function (id) {
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.api.response)) {
        pxWidget.table_v2.ajax.readDataset(id);
        // Avoid self-looping
        return false;
    }
    else {
        return true
    }
};

/**
 * Get data
 * @param {*} id 
 * @returns 
 */
pxWidget.table_v2.ajax.readDataset = function (id) {
    // Check data query exists
    if (pxWidget.jQuery.isEmptyObject(pxWidget.draw.params[id].data.api.query)) {
        pxWidget.draw.error(id, 'pxWidget.table_v2.ajax.readDataset: missing data query');
        return;
    }


    pxWidget.ajax.jsonrpc.request(
        pxWidget.draw.params[id].data.api.query.url,
        pxWidget.draw.params[id].data.api.query.data.method,
        pxWidget.draw.params[id].data.api.query.data.params,
        "pxWidget.table_v2.callback.readDatasetOnSuccess",
        id,
        "pxWidget.table_v2.callback.readDatasetOnError",
        id,
        { async: false },
        id)
};

/**
 * Get data callback
 * @param {*} response 
 * @param {*} id 
 */
pxWidget.table_v2.callback.readDatasetOnSuccess = function (response, id) {
    if (pxWidget.jQuery.isEmptyObject(response)) {
        pxWidget.draw.error(id, 'pxWidget.table_v2.callback.readDatasetOnSuccess: missing data response');
    } else {
        pxWidget.draw.params[id].data.api.response = response;
        // Restart the drawing after successful compilation
        pxWidget.table_v2.draw(id);
    }
};

/**
 * Get data callback error
 * @param {*} error 
 * @param {*} id 
 */
pxWidget.table_v2.callback.readDatasetOnError = function (error, id) {
    pxWidget.draw.error(id, 'Unable to retreive data. Please try again later.', true);
};
