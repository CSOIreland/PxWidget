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