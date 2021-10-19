/*******************************************************************************
PxWidget - Config
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};

/**
 * Preset jQuery Ajax calls to be ASynch by default
 * @param {*} options
 * @param {*} originalOptions
 * @param {*} jqXHR
 */
pxWidget.jQuery.ajaxPrefilter(function (options, originalOptions, jqXHR) {
    options.async = originalOptions.async === undefined ? true : originalOptions.async;
});

pxWidget.config = {
    "baseMap": {
        "leaflet": [
            {
                "url": "https://tiles.wmflabs.org/osm-no-labels/{z}/{x}/{y}.png",
                "options": {
                    "attribution": "&copy; <a target=\"_blank\" href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
                }
            }
        ],
        "esri": [
            {
                "url": "https://tiles.arcgis.com/tiles/uWTLlTypaM5QTKd2/arcgis/rest/services/Basemap%20Public/MapServer"
            }
        ]
    }
};