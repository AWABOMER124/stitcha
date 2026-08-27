import ExcelJS from 'exceljs';

export type ExportColumn = { header: string; key: string; width?: number; numFmt?: string };
export type ExportRow = Record<string, string | number | boolean | Date | null | undefined>;

/** Prevent spreadsheet clients from interpreting untrusted text as a formula. */
export function safeExcelValue(value: ExportRow[string]): ExportRow[string] {
  if (typeof value === 'string' && /^[=+\-@]/.test(value.trimStart())) return `'${value}`;
  return value;
}

export async function createWorkbook(options: {
  title: string;
  merchantName: string;
  columns: ExportColumn[];
  rows: ExportRow[];
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WASLA Commerce OS';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const sheet = workbook.addWorksheet(options.title.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }],
  });
  sheet.columns = options.columns.map(column => ({ ...column, width: column.width ?? 18 }));
  sheet.addRows(options.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeExcelValue(value)]))));
  sheet.autoFilter = `A1:${sheet.getColumn(options.columns.length).letter}1`;
  sheet.getRow(1).height = 24;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    row.alignment = { vertical: 'middle', wrapText: true };
  });
  options.columns.forEach((column, index) => {
    if (column.numFmt) sheet.getColumn(index + 1).numFmt = column.numFmt;
  });
  sheet.headerFooter.oddFooter = `&R${options.merchantName} | WASLA&Cصفحة &P من &N`;
  return workbook.xlsx.writeBuffer();
}
