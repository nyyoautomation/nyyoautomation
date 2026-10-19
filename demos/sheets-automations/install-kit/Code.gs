/**
 * Nyyo Sheets Automations — free install kit (Apps Script)
 * Install: Extensions → Apps Script → paste this file → Save → Reload sheet
 * Menu: Nyyo → Clean selection (trim + dedupe) / Export selection as CSV email (sent to you only)
 * Install kit: free, included with every package.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Nyyo')
    .addItem('Clean selection (trim + dedupe)', 'nyyoCleanSelection')
    .addItem('Export selection as CSV email', 'nyyoEmailCsv')
    .addToUi();
}

function nyyoCleanSelection() {
  var range = SpreadsheetApp.getActiveRange();
  if (!range) return;
  var values = range.getValues();
  var seen = {};
  var out = [];
  values.forEach(function (row) {
    var cleaned = row.map(function (c) {
      return typeof c === 'string' ? c.replace(/\s+/g, ' ').trim() : c;
    });
    var key = cleaned.join('\u0001');
    if (!seen[key]) {
      seen[key] = true;
      out.push(cleaned);
    }
  });
  range.clearContent();
  if (out.length) {
    range.offset(0, 0, out.length, out[0].length).setValues(out);
  }
  SpreadsheetApp.getActive().toast('Cleaned ' + out.length + ' rows (free Nyyo kit)');
}

function nyyoEmailCsv() {
  var range = SpreadsheetApp.getActiveRange();
  var email = Session.getActiveUser().getEmail();
  var values = range.getValues();
  var csv = values.map(function (r) {
    return r.map(function (c) {
      var s = String(c).replace(/"/g, '""');
      return '"' + s + '"';
    }).join(',');
  }).join('\n');
  MailApp.sendEmail({
    to: email,
    subject: 'Nyyo export ' + new Date().toISOString().slice(0, 10),
    body: 'CSV attached — free install kit included with your package.',
    attachments: [Utilities.newBlob(csv, 'text/csv', 'nyyo-export.csv')],
  });
}
