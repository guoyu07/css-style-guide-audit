/*jshint -W083 */
/*jshint -W084 */
/*jshint unused:false */
/* global console, getStyleSheetRules, forEachRule, rgbToHex, push, getStyleValue */

var audit = {elms: []};
var rgbValues = /([0-9]){1,3}/g;

/**
 * Produce a JSON audit.
 * @param {string|string[]} patternLibrary - href substring that uniquely identifies the pattern library styleSheet(s)
 * @param {string|string[]} ignoreSheet - href substring that uniquely identifies any styleSheets that should be ignored in the audit
 * @param {object[]} customRules - Custom rules to be audited.
 * @example
 *  // references any styleSheet that contains the text 'pattern-lib'
 *  // e.g. localhost/css/pattern-lib.css
 *  // e.g. http://myDomain/styles/pattern-lib-17D8401NDL.css
 *  auditResults('pattern-lib');
 */
function auditResults(patternLibrary, ignoreSheet, customRules) {
  if (!Array.isArray(patternLibrary)) {
    patternLibrary = [patternLibrary];
  }

  if (!Array.isArray(ignoreSheet)) {
    ignoreSheet = [ignoreSheet];
  }

  // reset previous audit
  for (var z = 0, elm; elm = audit.elms[z]; z++) {
    elm.style.background = '';
    elm.title = '';
    elm.problems = [];
  }
  audit = {elms: []};

  // loop through each provided pattern library
  var link, sheet, elms, el, property, value, elStyle;
  for (var i = 0, patternLib; patternLib = patternLibrary[i]; i++) {
    link = document.querySelector('link[href*="' + patternLib + '"]');

    if (!link) {
      continue;
    }

    sheet = link.sheet;

    getStyleSheetRules(sheet, function(rules, href) {

      forEachRule(rules, function(rule) {

        try {
          elms = document.querySelectorAll(rule.selectorText);
        }
        catch(e) {
          return;
        }

        // loop through each element
        for (var j = 0, elmsLength = elms.length; j < elmsLength; j++) {
          el = elms[j];

          // loop through each rule property and check that the pattern library styles
          // are being applied
          for (var k = 0, styleLength = rule.style.length; k < styleLength; k++) {
            property = rule.style[k];
            value = getStyleValue(rule.style, property);
            elStyle = el.computedStyles[property];

            if (elStyle[0].styleSheet !== href) {
              // make sure the styleSheet isn't in the ignore list
              var ignored = false;
              for (var x = 0, ignore; ignore = ignoreSheet[x]; x++) {
                if (elStyle[0].styleSheet && elStyle[0].styleSheet.indexOf(ignore) !== -1) {
                  ignored = true;
                  break;
                }
              }

              if (!ignored) {
                el.problems = el.problems || [];

                var originalValue;
                var overrideValue;
                // convert rgb values to hex, but ignore any rgba values
                if (value.indexOf('rgb(') !== -1) {
                  originalValue = rgbToHex.apply(this, value.match(rgbValues).map(Number));
                }
                else {
                  originalValue = value;
                }

                if (elStyle[0].value.indexOf('rgb(') !== -1) {
                  overrideValue = rgbToHex.apply(this, elStyle[0].value.match(rgbValues).map(Number));
                }
                else {
                  overrideValue = elStyle[0].value;
                }

                el.problems.push({
                  type: 'property-override',
                  selector: elStyle[0].selector,
                  description: '<code>' + property + ': ' + originalValue + '</code> overridden by <code>' + overrideValue + '</code> in the selector <code>' + elStyle[0].selector + '</code> from styleSheet <code>' + elStyle[0].styleSheet + '.',
                });

                if (audit.elms.indexOf(el) === -1) {
                  audit.elms.push(el);
                }
              }
            }
          }
        }
      });

      // change the background color of all elements
      for (var z = 0, elm; elm = audit.elms[z]; z++) {
        elm.setAttribute('data-style-audit', 'property-override');
      }

    });
  }

  for (i = 0; i < customRules.length; i++) {
    elms = document.querySelectorAll(customRules[i].selector);

    for (var j = 0; j < elms.length; j++) {
      elms[j].problems = elms[j].problems || [];
      elms[j].problems.push({
        type: customRules[i].type,
        selector: customRules[i].selector,
        description: customRules[i].description
      });
      elms[j].setAttribute('data-style-audit', 'custom-rule');
    }
  }
}

window.auditResults = auditResults;