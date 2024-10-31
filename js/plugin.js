/*******************************************************************************
PxWidget - Plugin
*******************************************************************************/

// Datatable data sorting
pxWidget.jQuery.extend(pxWidget.jQuery.fn.dataTableExt.oSort, {
  "data-asc": function (a, b) {
    a = a.toString().replace(pxWidget.table.defaultContent, -9999999999).replaceAll(pxWidget.thousandSeparator(), "").replaceAll(pxWidget.decimalSeparator(), ".");
    b = b.toString().replace(pxWidget.table.defaultContent, -9999999999).replaceAll(pxWidget.thousandSeparator(), "").replaceAll(pxWidget.decimalSeparator(), ".");
    return pxWidget.jQuery.fn.dataTableExt.oSort["natural-nohtml-asc"](a, b);
  },
  "data-desc": function (a, b) {
    a = a.toString().replace(pxWidget.table.defaultContent, -9999999999).replaceAll(pxWidget.thousandSeparator(), "").replaceAll(pxWidget.decimalSeparator(), ".");
    b = b.toString().replace(pxWidget.table.defaultContent, -9999999999).replaceAll(pxWidget.thousandSeparator(), "").replaceAll(pxWidget.decimalSeparator(), ".");
    return pxWidget.jQuery.fn.dataTableExt.oSort["natural-nohtml-desc"](a, b);
  }
});

// Define a custom sorting type for sorting time by codes
pxWidget.jQuery.fn.dataTable.ext.order['custom-sort'] = function (settings, col) {
  return this.api().column(col, { order: 'index' }).nodes().map(function (td, i) {
    // Extract and return the value that should be used for sorting
    return pxWidget.jQuery(td).attr("data-custom-sort");
  });
};