/*******************************************************************************
PxWidget - ISOGRAM
*******************************************************************************/
// Init
var pxWidget = pxWidget || {};
pxWidget.debug = false; // Enable/Disable minified JS/CSS resources
pxWidget.root = 'https://cdn.jsdelivr.net/gh/CSOIreland/PxWidget@1.1.0/';

(function (i, s, o, g, r, a, m) {
    i[r].queue = i[r].queue || function () {
        (i[r].widgets = i[r].widgets || []).push(arguments);
    };
    i[r].load = i[r].load || function (i, s, o, g, r, a, m) {
        e = s.createElement(o);
        t = s.getElementsByTagName('head')[0];
        switch (o) {
            case 'script':
                e.async = a || false;
                g.match(/^(http(s)?:)?\/\//gi) ? e.src = g : e.text = g;

                if (m && e.src) {
                    var xhttp = new XMLHttpRequest;
                    xhttp.onreadystatechange = function () {
                        if (this.readyState == 4 && this.status == 200) {
                            pxWidget.load(window, document, 'script', this.responseText.replace(/jQuery/g, 'pxWidget.jQuery'));
                        }
                    };
                    xhttp.open("GET", e.src, false);
                    xhttp.send();
                    return false;
                }
                t.appendChild(e);
                break;
            case 'link':
                e.rel = 'stylesheet';
                e.href = g;
                t.appendChild(e);
                break;
        }
    };
    if (i['WidgetObject'] === undefined) {
        i['WidgetObject'] = r;
        i[r].load(i, s, o, g, r, a, m);
    }
})(window, document, 'script', pxWidget.root + (pxWidget.debug ? 'js/index.js' : 'js/index.min.js'), 'pxWidget', true);
