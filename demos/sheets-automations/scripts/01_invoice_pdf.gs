/**
 * Nyyo Automation — Demo Apps Script
 * Generate a simple invoice summary sheet (PDF export via Sheet → File → Download).
 * Install: Extensions → Apps Script → paste → Save. Run createInvoiceRow once after authorizing.
 * This demo never emails real customers.
 */
function createInvoiceRow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Invoices') || ss.insertSheet('Invoices');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Invoice #', 'Client', 'Amount', 'Currency', 'Status', 'Due']);
  }
  var n = sh.getLastRow();
  sh.appendRow(['INV-' + (1000 + n), 'Demo Client', 290, 'USD', 'SENT', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')]);
  SpreadsheetApp.getUi().alert('Demo invoice row added. Export the sheet as PDF from File → Download.');
}
