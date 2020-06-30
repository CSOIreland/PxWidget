/*******************************************************************************
PxWidget - Draw - Library
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};
pxWidget.draw = {};
pxWidget.draw.params = {};
pxWidget.draw.callback = {};

/**
 * Initilise pxWidget
 * @param {*} type 
 * @param {*} id 
 * @param {*} params 
 */
pxWidget.draw.init = function (type, id, params, callback) {
  callback = callback || null;

  if (!id || !pxWidget.jQuery('#' + id).length) {
    pxWidget.draw.error();
    return;
  }

  // Parse and store params in namespace
  if (pxWidget.jQuery.type(params) === "object") {
    pxWidget.draw.params[id] = params;
  } else {
    try {
      pxWidget.draw.params[id] = JSON.parse(params);
    } catch (e) {
      pxWidget.draw.error(id, 'pxWidget.draw.init: invalid Params');
      return;
    }
  }

  // Store callback in namespace
  pxWidget.draw.callback[id] = callback;

  switch (type) {
    case C_PXWIDGET_TYPE_CHART:
      pxWidget.chart.draw(id);
      break;
    case C_PXWIDGET_TYPE_TABLE:
    // Work in Progress
    // pxWidget.draw.table(id);
    // break;
    default:
      pxWidget.draw.error(id, 'pxWidget.draw.init: invalid Type');
      break;
  }
}

/**
 * Draw a Spinner
 * @param {*} id 
 */
pxWidget.draw.spinner = function (id) {
  // Create spinner
  var spinner = pxWidget.jQuery('<img>', {
    "src": C_PXWIDGET_ROOT + "image/spinner.gif",
    "title": "Widget Loading..."
  });

  // Append & hide spinner by default
  pxWidget.jQuery('#' + id).empty().append(spinner).find('img').hide();
};

/**
 * Draw an Error
 * @param {*} id 
 * @param {*} message 
 */
pxWidget.draw.error = function (id, message) {
  id = id || null;
  message = message || "";

  if (id && pxWidget.jQuery('#' + id).length) {
    // Create error
    var error = pxWidget.jQuery('<img>', {
      "src": C_PXWIDGET_ROOT + "image/error.png",
      "title": "Widget Error"
    });

    // Create footer
    var footer = pxWidget.jQuery('<p>', {
      "text": "Oops!",
    }).css({ "text-align": "center" }).get(0).outerHTML;

    // Append Error and Footer
    pxWidget.jQuery('#' + id).empty().append(error).append(footer);
    if (message)
      console.log(message);
  } else {
    console.log('pxWidget.draw.error: invalid ID');
  }
};

/**
 * Draw a pxWidget Table
 * @param {*} id
 */
pxWidget.draw.table = function (id) {
  // Load Bootstrap extensions for Datatable if Bootstrap is found
  if (window.jQuery && window.jQuery.fn.modal) {
    // Datatables - Bootstrap
    pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/1.10.20/css/dataTables.bootstrap4.min.css');
    pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/1.10.20/js/dataTables.bootstrap4.js', null, null, true);

    // Datatables - Extension - Responsive - Bootstrap
    pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/responsive/2.2.3/css/responsive.bootstrap4.min.css');
    pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/responsive/2.2.3/js/responsive.bootstrap4.js', null, null, true);

    // pxWidget - Datatable - Bootstrap
    pxWidget.load(window, document, 'link', C_PXWIDGET_ROOT + 'css/pxWidget.datatable.bootstrap.min.css');
  }
  else {
    //load default datatables css
    pxWidget.load(window, document, 'link', 'https://cdn.datatables.net/1.10.20/css/jquery.dataTables.min.css');
  }

  if (id && pxWidget.jQuery('#' + id).length) {
    // Init & Spinner
    pxWidget.draw.spinner(id);

    // Create table
    var table = pxWidget.jQuery('#table-template').html();

    // Create footer
    var footer = pxWidget.jQuery('<p>', {
      "html": pxWidget.jQuery('<a>', {
        "text": "https://data.cso.ie/table/CMP01",
        //"text": pxWidget.params[id].link,
        "href": "https://data.cso.ie/table/CMP01",
        //"href": pxWidget.params[id].link,
        "target": "_blank"
      }).get(0).outerHTML + " &copy; CSO.ie"
      //}).get(0).outerHTML + " &copy; " + pxWidget.params[id].copyright
    }).css({ "text-align": "right" });

    // Append table
    pxWidget.jQuery('#' + id).append(table);
    // Draw Datatable
    pxWidget.jQuery('#' + id).find('table').DataTable();
    // Append footer
    pxWidget.jQuery('#' + id).append(footer);
  } else {
    pxWidget.draw.error();
  }
};
