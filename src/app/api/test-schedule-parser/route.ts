import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to debug schedule parsing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the HTML
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Schulplaner/1.0)',
      },
      cache: 'no-store',
    });

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${fetchResponse.status}` },
        { status: fetchResponse.status }
      );
    }

    const html = await fetchResponse.text();

    // Analyze structure
    const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
    const tableInfo = tables.map((table, i) => {
      const hasMontag = /Montag/i.test(table);
      const hasDienstag = /Dienstag/i.test(table);
      const hasMittwoch = /Mittwoch/i.test(table);
      const hasDonnerstag = /Donnerstag/i.test(table);
      const hasFreitag = /Freitag/i.test(table);
      const hasTimes = /\d{1,2}[:.]\d{2}/.test(table);
      const has12FO = /12FO/i.test(table);
      const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      
      // Get first few rows as sample
      const rowSamples = rows.slice(0, 3).map(row => {
        const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
        return cells.map(cell => {
          const text = cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          return text.substring(0, 50);
        });
      });

      return {
        index: i + 1,
        hasMontag,
        hasDienstag,
        hasMittwoch,
        hasDonnerstag,
        hasFreitag,
        hasTimes,
        has12FO,
        rowCount: rows.length,
        rowSamples,
        tablePreview: table.substring(0, 500),
      };
    });

    return NextResponse.json({
      htmlLength: html.length,
      tableCount: tables.length,
      tables: tableInfo,
      htmlSample: html.substring(0, 2000),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


