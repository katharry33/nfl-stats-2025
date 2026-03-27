import * as cheerio from 'cheerio';

export async function fetchHtmlTable(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const rows: Record<string, string>[] = [];

  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td, th');
    if (cells.length === 0) return;

    const row: Record<string, string> = {};
    cells.each((i, cell) => {
      const text = $(cell).text().trim();
      row[`col${i}`] = text;
    });

    rows.push(row);
  });

  return rows;
}
