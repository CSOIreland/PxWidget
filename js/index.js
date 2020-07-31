/*******************************************************************************
PxWidget - Index
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};

// Set noConflict
pxWidget.noConflict = {};

// jQuery 3.X - https://github.com/jquery/jquery/
// Native noConflict object
pxWidget.load(window, document, 'script', 'https://cdn.jsdelivr.net/gh/jquery/jquery@3.4.1/dist/jquery.min.js');

// MomentJS - github.com/moment/moment/ -->
pxWidget.noConflict.moment = window.moment ? window.moment : null;
pxWidget.load(window, document, 'script', 'https://cdn.jsdelivr.net/gh/moment/moment@v2.24.0/min/moment-with-locales.min.js');

// Datatables - https://datatables.net/ powered by ClooudFlare
pxWidget.noConflict.DataTable = window.DataTable ? window.DataTable : null;
pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/1.10.20/js/jquery.dataTables.min.js');
// Datatables - Extension - Responsive -->
pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/responsive/2.2.3/js/dataTables.responsive.min.js');
// Datatables - Sorting - Datetime Moment -->
pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/plug-ins/1.10.20/sorting/datetime-moment.js');
// Datatables - Sorting - Natural -->
pxWidget.load(window, document, 'script', 'https://cdn.datatables.net/plug-ins/1.10.20/sorting/natural.js');

// ChartJS - https://github.com/chartjs/Chart.js/
pxWidget.noConflict.Chart = window.Chart ? window.Chart : null;
pxWidget.load(window, document, 'script', 'https://cdn.jsdelivr.net/gh/chartjs/Chart.js@v2.9.3/dist/Chart.min.js');
// ChartJS stacking percentage - https://github.com/y-takey/chartjs-plugin-stacked100
pxWidget.load(window, document, 'script', 'https://cdn.jsdelivr.net/gh/y-takey/chartjs-plugin-stacked100/src/index.min.js');
// ChartJS chartjs-plugin-colorschemes - https://github.com/nagix/chartjs-plugin-colorschemes
pxWidget.load(window, document, 'script', 'https://cdn.jsdelivr.net/gh/nagix/chartjs-plugin-colorschemes@v0.4.0/dist/chartjs-plugin-colorschemes.min.js');

// JSON-Stat - https://github.com/badosa/JSON-stat/
pxWidget.noConflict.JSONstat = window.JSONstat ? window.JSONstat : null;
pxWidget.load(window, document, 'script', 'https://cdn.jsdelivr.net/gh/badosa/JSON-stat@v0.13.3/json-stat.min.js');

// pxWidget CSS
pxWidget.load(window, document, 'link', pxWidget.root + (pxWidget.debug ? 'css/index.css' : 'css/index.min.css'));

// pxWidget JS
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/noconflict.js' : 'js/noconflict.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/constant.js' : 'js/constant.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/config.js' : 'js/config.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/plugin.js' : 'js/plugin.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/library.js' : 'js/library.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/chart.library.js' : 'js/chart.library.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/table.library.js' : 'js/table.library.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/draw.library.js' : 'js/draw.library.min.js'));
pxWidget.load(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/draw.js' : 'js/draw.min.js'));
