const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile(path.resolve(__dirname, '..', 'planold.xlsx'));
console.log('Sheet names:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('');
  console.log('=== Sheet: ' + name + ' (' + data.length + ' rows) ===');
  data.slice(0, 30).forEach((row, i) => console.log('Row ' + i + ': ' + JSON.stringify(row)));
}
