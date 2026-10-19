/**
 * Nyyo Automation — Demo follow-up flagger
 * Marks rows older than 7 days as NEED_FOLLOWUP. Does not send email in demo mode.
 */
function flagFollowups() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Invoices');
  if (!sh) throw new Error('Create Invoices sheet first (run 01_invoice_pdf.gs).');
  var data = sh.getDataRange().getValues();
  var now = new Date();
  for (var i = 1; i < data.length; i++) {
    var due = data[i][5];
    var status = String(data[i][4] || '');
    if (status === 'PAID') continue;
    if (due instanceof Date) {
      var days = (now - due) / (1000 * 60 * 60 * 24);
      if (days >= 7) sh.getRange(i + 1, 5).setValue('NEED_FOLLOWUP');
    }
  }
}
