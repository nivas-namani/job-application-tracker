/** Minimal RFC 4180 reader and writer. Kept in-house so import/export adds no dependency. */

const escapeCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(headers: string[], rows: Record<string, unknown>[]) {
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((header) => escapeCell(row[header])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character !== '"') { cell += character; continue; }
      if (text[index + 1] === '"') { cell += '"'; index += 1; continue; }
      quoted = false;
      continue;
    }
    if (character === '"') { quoted = true; continue; }
    if (character === ',') { row.push(cell); cell = ''; continue; }
    if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += character;
  }
  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

/** Maps a header row onto record objects, tolerating case, spaces and underscores in column names. */
export function toRecords(rows: string[][]) {
  const [headerRow, ...bodyRows] = rows;
  if (!headerRow) return [];
  const headers = headerRow.map((header) => header.trim().toLowerCase().replace(/[\s_-]+/g, ''));
  return bodyRows.map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => { record[header] = (cells[index] ?? '').trim(); });
    return record;
  });
}
