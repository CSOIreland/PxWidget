/*******************************************************************************
PxWidget - Library
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};

/*******************************************************************************
Widget - Spinner
*******************************************************************************/
pxWidget.spinner = {};

/**
 * Show the Spinner
 */
pxWidget.spinner.start = function (id) {
  pxWidget.spinner[id] = pxWidget.spinner[id] || 0;

  if (!pxWidget.spinner[id]++) {
    pxWidget.jQuery('#' + id).find('img').show();
  }
};

/**
 * Hide the Spinner
 */
pxWidget.spinner.stop = function (id) {
  pxWidget.spinner[id] = pxWidget.spinner[id] || 0;

  if (pxWidget.spinner[id]) {
    // Do not go negative
    pxWidget.spinner[id]--;
  }

  if (!pxWidget.spinner[id]) {
    // Stop the spinner immediatelly
    // No fadeOut to aovid stacking the pxWidget rendered below
    pxWidget.jQuery('#' + id).find('img').hide();
  }
};

/*******************************************************************************
Widget - Ajax
*******************************************************************************/
pxWidget.ajax = {};
pxWidget.ajax.jsonrpc = {};

/**
 * Execute an AJAX callback function
 * @param {*} pFunction 
 * @param {*} pResponse 
 * @param {*} pParams 
 */
pxWidget.ajax.callback = function (pFunction, pResponse, pParams) {
  // Default parameters
  pResponse = pResponse || null;
  pParams = pParams || {};

  // Context is windows in a browser
  var context = window;

  // Initialise callbackFunction
  var callbackFunction = "";

  // Look for the function within the scope
  callbackFunction = context[pFunction];
  // Run a function that is not namespaced
  if (typeof callbackFunction === 'function') {
    if (pxWidget.jQuery.isEmptyObject(pParams))
      return callbackFunction(pResponse);
    else
      return callbackFunction(pResponse, pParams);
  }

  // Retrieve the namespaces of the function
  // e.g Namespaces of "MyLib.UI.Read" would be ["MyLib","UI"]
  var namespaces = pFunction.split(".");

  // Retrieve the real name of the function
  // e.g Namespaces of "MyLib.UI.Read" would be Read
  var functionName = namespaces.pop();

  // Iterate through every namespace to access the one that has the function to execute. 
  // For example with the Read fn "MyLib.UI.SomeSub.Read"
  // Loop until context will be equal to SomeSub
  for (var i = 0; i < namespaces.length; i++) {
    context = context[namespaces[i]];
  }

  if (context) {
    // Get the function in the namespaces
    callbackFunction = context[functionName];

    if (pxWidget.jQuery.isEmptyObject(pParams))
      return callbackFunction(pResponse);
    else
      return callbackFunction(pResponse, pParams);
  }

  return false;
};

/**
 * Load a configuration file
 * @param {*} pUrl
 * @param {*} pCallback
 * @param {*} pAjaxParams
 */
pxWidget.ajax.config = function (pUrl, pCallback, pAjaxParams) {
  // Default AJAX parameters
  pAjaxParams = pAjaxParams || {};
  pAjaxParams.method = pAjaxParams.method || 'GET';
  pAjaxParams.dataType = pAjaxParams.dataType || 'json';
  pAjaxParams.jsonp = pAjaxParams.jsonp || false; // Fix for "??" jQuery placeholder
  pAjaxParams.timeout = pAjaxParams.timeout || 60000;
  pAjaxParams.async = pAjaxParams.async || false;

  ajaxParams = {
    url: pUrl,
    success: function (response) {
      pCallback(response);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("pxWidget.ajax.config: the configuration file \"" + url + "\" is missing or invalid.");
    }
  };

  // Merge ajax parameters
  pxWidget.jQuery.extend(ajaxParams, pAjaxParams);
  // Run the Ajax call
  pxWidget.jQuery.ajax(ajaxParams);
};

/**
 * Execute an Ajax Request with a JSON-RPC protocol
 * @param {*} pAPI_URL 
 * @param {*} pAPI_Method 
 * @param {*} pAPI_Params 
 * @param {*} callbackFunctionName_onSuccess 
 * @param {*} callbackParams_onSuccess 
 * @param {*} callbackFunctionName_onError 
 * @param {*} callbackParams_onError 
 * @param {*} pAJAX_Params 
 * @param {*} callID 
 */
pxWidget.ajax.jsonrpc.request = function (pAPI_URL, pAPI_Method, pAPI_Params, callbackFunctionName_onSuccess, callbackParams_onSuccess, callbackFunctionName_onError, callbackParams_onError, pAJAX_Params, callID) {
  // Default API parameters
  pAPI_Params = pAPI_Params || {};

  // Default callback functions
  callbackFunctionName_onSuccess = callbackFunctionName_onSuccess || null;
  callbackFunctionName_onError = callbackFunctionName_onError || null;

  // Default callback parameters
  callbackParams_onSuccess = callbackParams_onSuccess || null;
  callbackParams_onError = callbackParams_onError || null;

  // Default AJAX parameters
  pAJAX_Params = pAJAX_Params || {};
  pAJAX_Params.method = pAJAX_Params.method || 'POST';
  pAJAX_Params.dataType = pAJAX_Params.dataType || 'json';
  pAJAX_Params.jsonp = pAJAX_Params.jsonp || false; // Fix for "??" jQuery placeholder
  pAJAX_Params.timeout = pAJAX_Params.timeout || 180000;
  // Decide to simulate a sync behaviour
  var simulateSync = pAJAX_Params.async === undefined ? false : !pAJAX_Params.async;
  // Override to force aSync ajax even during Sync simulation
  pAJAX_Params.async = true;

  // Set the Call ID
  var callID = callID || Math.floor(Math.random() * 999999999) + 1;

  // Set the Data to pass into the Ajax call
  var data4Ajax = {
    "jsonrpc": '2.0',
    "method": pAPI_Method,
    "params": pAPI_Params,
    "id": callID
  };

  // Extend AJAX Parameters
  var extendedAJAXParams = {
    url: pAPI_URL,
    data: JSON.stringify(data4Ajax),
    xhrFields: { withCredentials: true },
    success: function (response) {
      // Validate the JSON-RPC Call ID
      if (pAJAX_Params.dataType == 'json' && response.id != callID) {
        console.log("pxWidget.ajax.jsonrpc.request: an invalid JSON-RPC Identifier has been detected.");
        return;
      }

      if (response.error) {
        // Init the error output
        var errorOutput = null;

        // Check response.error.data exist
        if (response.error.data) {
          // Format the structured data, either array or object
          if ((pxWidget.jQuery.isArray(response.error.data) && response.error.data.length)
            || (pxWidget.jQuery.isPlainObject(response.error.data) && !pxWidget.jQuery.isEmptyObject(response.error.data))) {
            errorOutput = JSON.stringify(response.error.data);
          } else
            // Plain error
            errorOutput = response.error.data;
        } else {
          // Get the simple message otherwise
          errorOutput = response.error.message;
        }

        // Log the error
        console.log("pxWidget.ajax.jsonrpc.request: " + errorOutput);

        if (callbackFunctionName_onError) {
          pxWidget.ajax.callback(callbackFunctionName_onError, response.error, callbackParams_onError);
        }
      } else if (response.result !== undefined) {
        // Check if the response.result property exist
        if (callbackFunctionName_onSuccess)
          pxWidget.ajax.callback(callbackFunctionName_onSuccess, response.result, callbackParams_onSuccess);
      }
      else
        // Log the Error
        console.log("pxWidget.ajax.jsonrpc.request: an unexpected error has occurred.");
    },
    error: function (jqXHR, textStatus, errorThrown) {
      if (callbackFunctionName_onError) {
        pxWidget.ajax.callback(callbackFunctionName_onError, null, callbackParams_onError);
      }
      else if (errorThrown == "Unauthorized") {
        // Silent response when unauthorized authentication
      }
      else {
        // Log the Error
        console.log("pxWidget.ajax.jsonrpc.request: a Server or Network Error has occurred.");
      }
    },
    complete: function () {
      // Simulate sync behaviour
      if (simulateSync)
        pxWidget.spinner.stop(callID);
    }
  }

  // Merge pAJAX_Params into extendedAJAXParams
  pxWidget.jQuery.extend(extendedAJAXParams, pAJAX_Params);

  try {
    // Simulate sync behaviour
    if (simulateSync)
      pxWidget.spinner.start(callID);

    // Make the Ajax call
    return pxWidget.jQuery.ajax(extendedAJAXParams);
  } catch (error) {
    // Log the Error
    console.log("pxWidget.ajax.jsonrpc.request: an unhandled Ajax exception has occurred.");
    return false;
  }
};

//Format number
pxWidget.formatNumber = function (number, precision) {

  decimalSeparator = pxWidget.decimalSeparator();
  thousandSeparator = pxWidget.thousandSeparator();

  precision = precision !== undefined ? precision : undefined;

  if ("number" !== typeof number && "string" !== typeof number)
    return number;

  if (isNaN(number)) { //output any non number as html
    return "string" === typeof number ? number.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : number;
  }
  else {
    floatNumber = parseFloat(number);
  }

  if (precision !== undefined) {
    floatNumber = floatNumber.toFixed(precision);
  }
  else {
    floatNumber = floatNumber.toString();
  }

  var parts = floatNumber.split(".");
  var wholeNumber = parts[0].toString();
  var decimalNumber = parts[1] !== undefined ? parts[1].toString() : undefined;
  return (thousandSeparator ? wholeNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator) : wholeNumber) + (decimalNumber !== undefined ? decimalSeparator + decimalNumber : "");
};

pxWidget.decimalSeparator = function () {
  var n = 1.1;
  return n.toLocaleString().substring(1, 2);
}

pxWidget.thousandSeparator = function () {
  var n = 1000;
  return n.toLocaleString().substring(1, 2);
}
