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
    "map": {
        "baseMap": {
            "leaflet": [
                {
                    "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
                    "options": {
                        "attribution": "Tiles &copy; Esri"
                    }
                }
            ]
        },
        "choroplethMap": {
            "steps": 5
        },
        "pointMap": {
            "minRadius": 3,
            "maxRadius": 60
        }
    }
};