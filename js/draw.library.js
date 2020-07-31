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
      pxWidget.table.draw(id);
      break;
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
    "src": pxWidget.root + "image/spinner.gif",
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
      "src": pxWidget.root + "image/error.png",
      "title": "Widget Error"
    });

    // Create footer
    var footer = pxWidget.jQuery('<p>', {
      "text": "Oops!",
    }).css({ "text-align": "center" }).get(0).outerHTML;

    // Append Error and Footer
    pxWidget.jQuery('#' + id).empty().append(error).append(footer);
    if (message)
      console.log('#' + id + ' >> ' + message);
  } else {
    console.log('pxWidget.draw.error: invalid ID');
  }
};

