/**
 * Nyyo Automation — Demo weekly report
 * Writes a Summary tab with totals. Schedule via Triggers → Time-driven (weekly).
 */
function weeklyReport() {
  var ss = SpreadsheetApp.getActive();
  var inv = ss.getSheetByName('Invoices');
  if (!inv) throw new Error('Missing Invoices sheet');
  var data = inv.getDataRange().getValues().slice(1);
  var total = 0, open = 0;
  data.forEach(function (r) {
    total += Number(r[2]) || 0;
    if (String(r[4]) !== 'PAID') open++;
  });
  var sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sum.clear();
  sum.appendRow(['Generated', new Date()]);
  sum.appendRow(['Invoice count', data.length]);
  sum.appendRow(['Amount sum', total]);
  sum.appendRow(['Open / follow-up rows', open]);
}
