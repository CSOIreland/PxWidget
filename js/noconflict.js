/*******************************************************************************
PxWidget - No Conflict
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};

// Native noConflict objects
pxWidget.jQuery = pxWidget.$ = pxWidget.jQuery || jQuery.noConflict(true);

// Non-Native noConflict objects
pxWidget.jQuery.each(pxWidget.noConflict, function (key, obj) {
    pxWidget[key] = window[key];
    window[key] = obj;
    delete pxWidget.noConflict[key];
});
