import { NextRequest, NextResponse } from 'next/server';

type PdfGetDocument = typeof import('pdfjs-dist').getDocument;
type PdfLoadingTask = ReturnType<PdfGetDocument>;
type PdfTextItem = string | { str?: string; text?: string };

// Configure runtime for serverless (needed for pdfjs-dist)
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for PDF parsing

type ParsedClass = {
  time: string;
  subject: string;
  room: string;
  day?: string; // Optional day of week
  durationMinutes?: number; // Optional duration
};

// POST /api/parse-schedule-pdf - Parse uploaded PDF or URL and extract schedule
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type');
    let arrayBuffer: ArrayBuffer | null = null;
    let extractedText = '';

    // Check if it's a URL request (JSON) or file upload (FormData)
    if (contentType?.includes('application/json')) {
      const body = await req.json();
      const url = body.url?.trim();

      if (!url) {
        return NextResponse.json(
          { error: 'URL is required' },
          { status: 400 }
        );
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }

      // Fetch the content from URL
      console.log('[parse-schedule-pdf] Fetching from URL:', url);
      const fetchResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Schulplaner/1.0)',
        },
        cache: 'no-store',
      });

      if (!fetchResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}` },
          { status: fetchResponse.status }
        );
      }

      const responseContentType = fetchResponse.headers.get('content-type') || '';

      // Check if it's a PDF
      if (responseContentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
        arrayBuffer = await fetchResponse.arrayBuffer();
      } else if (responseContentType.includes('text/html') || url.toLowerCase().endsWith('.html')) {
        // HTML content - ALWAYS try DAVINCI parser first for Feldbergschule URLs
        const html = await fetchResponse.text();
        console.log('[parse-schedule-pdf] Parsing HTML, length:', html.length);
        console.log('[parse-schedule-pdf] HTML preview (first 1000 chars):', html.substring(0, 1000));
        
        // Check if HTML contains schedule-related content
        const hasMontag = /Montag/i.test(html);
        const hasTable = /<table/i.test(html);
        const has12FO = /12FO/i.test(html);
        const isFeldbergschule = /feldbergschule/i.test(url);
        console.log('[parse-schedule-pdf] HTML check - Montag:', hasMontag, 'Table:', hasTable, '12FO:', has12FO, 'Feldbergschule:', isFeldbergschule);
        
        // Always try DAVINCI parser for Feldbergschule or if we detect schedule structure
        const davinciClasses = parseDAVINCISchedule(html);
        console.log('[parse-schedule-pdf] DAVINCI parser found', davinciClasses.length, 'classes');
        
        // If DAVINCI parser found classes OR if it's a Feldbergschule URL, use DAVINCI results
        if (davinciClasses.length > 0 || isFeldbergschule) {
          if (davinciClasses.length > 0) {
            return NextResponse.json({ 
              classes: davinciClasses,
              rawText: html.substring(0, 500),
              source: 'url-html-davinci',
              debug: {
                htmlLength: html.length,
                hasMontag,
                hasTable,
                has12FO,
                isFeldbergschule,
              }
            });
          } else {
            // DAVINCI parser found nothing but it's Feldbergschule - return empty with debug info
            console.log('[parse-schedule-pdf] DAVINCI parser found 0 classes for Feldbergschule URL');
            return NextResponse.json({ 
              classes: [],
              rawText: html.substring(0, 1000),
              source: 'url-html-davinci-failed',
              debug: {
                htmlLength: html.length,
                hasMontag,
                hasTable,
                has12FO,
                isFeldbergschule,
                error: 'DAVINCI parser found no classes',
              }
            }, { status: 200 });
          }
        }
        // Fallback to text extraction
        console.log('[parse-schedule-pdf] Falling back to text extraction');
        extractedText = extractTextFromHTML(html);
        const classes = parseScheduleFromText(extractedText);
        console.log('[parse-schedule-pdf] Text parser found', classes.length, 'classes');
        
        // If still no classes found, return helpful error with more info
        if (classes.length === 0) {
          // Check if HTML contains schedule-related keywords
          const hasScheduleKeywords = /Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Stundenplan|Klassenplan/i.test(html);
          const hasTable = /<table/i.test(html);
          const tableCount = (html.match(/<table/gi) || []).length;
          
          // Try to extract a sample of the HTML to see structure
          const tableSample = html.match(/<table[^>]*>[\s\S]{0,2000}/i)?.[0] || 'No table found';
          
          return NextResponse.json({ 
            error: 'Could not extract schedule from HTML. The page might use a different format.',
            classes: [],
            rawText: extractedText.substring(0, 1000),
            source: 'url-html',
            debug: {
              htmlLength: html.length,
              hasScheduleKeywords,
              hasTable,
              tableCount,
              extractedTextLength: extractedText.length,
              tableSample: tableSample.substring(0, 500),
            }
          }, { status: 200 }); // Return 200 so frontend can show the error
        }
        
        return NextResponse.json({ 
          classes,
          rawText: extractedText.substring(0, 500),
          source: 'url-html'
        });
      } else {
        // Try to parse as PDF anyway (some servers don't send correct content-type)
        try {
          arrayBuffer = await fetchResponse.arrayBuffer();
        } catch {
          return NextResponse.json(
            { error: 'URL does not point to a PDF or HTML file' },
            { status: 400 }
          );
        }
      }
    } else {
      // File upload (FormData)
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file uploaded' },
          { status: 400 }
        );
      }

      // Check file type
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'File must be a PDF' },
          { status: 400 }
        );
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 10MB' },
          { status: 400 }
        );
      }

      // Convert File to ArrayBuffer
      arrayBuffer = await file.arrayBuffer();
    }

    // If we have HTML text, we already returned above
    // If we have arrayBuffer, parse it as PDF
    if (!arrayBuffer) {
      return NextResponse.json(
        { error: 'No content to parse' },
        { status: 400 }
      );
    }
    
    // Dynamically import pdfjs for serverless compatibility
    try {
      // Try multiple import methods for compatibility
      let getDocument: PdfGetDocument | undefined;
      
      try {
        // Method 1: Standard import
        const pdfjsModule = await import('pdfjs-dist');
        getDocument = pdfjsModule.getDocument ?? pdfjsModule.default?.getDocument;
      } catch (importError) {
        console.error('[parse-schedule-pdf] Standard import failed:', importError);
        try {
          // Method 2: Legacy build
          const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
          const candidate = (pdfjsModule as { getDocument?: PdfGetDocument; default?: { getDocument?: PdfGetDocument } });
          getDocument = candidate.getDocument ?? candidate.default?.getDocument;
        } catch (legacyError) {
          console.error('[parse-schedule-pdf] Legacy import failed:', legacyError);
          throw new Error(`Failed to import pdfjs-dist: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
        }
      }
      
      if (!getDocument) {
        throw new Error('PDF.js getDocument function not available after import');
      }
      
      // Parse PDF with error handling
      const loadingTask: PdfLoadingTask = getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0, // Suppress warnings
        isEvalSupported: false, // Disable eval for security
      });
      
      const pdf = await loadingTask.promise;
      
      if (!pdf || !pdf.numPages) {
        throw new Error('Invalid PDF structure: no pages found');
      }
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          if (textContent && textContent.items) {
            const items = textContent.items as PdfTextItem[];
            const pageText = items
              .map((item) => {
                if (typeof item === 'string') return item;
                if (typeof item.str === 'string') return item.str;
                if (typeof item.text === 'string') return item.text;
                return '';
              })
              .filter((str) => str && str.trim().length > 0)
              .join(' ')
              .trim();
            
            if (pageText) {
              extractedText += pageText + '\n';
            }
          }
        } catch (pageError) {
          console.error(`[parse-schedule-pdf] Error extracting page ${i}:`, pageError);
          // Continue with other pages
        }
      }
    } catch (pdfError) {
      console.error('[parse-schedule-pdf] PDF parsing error:', pdfError);
      console.error('[parse-schedule-pdf] Error stack:', pdfError instanceof Error ? pdfError.stack : 'No stack');
      
      // Return error with more details for debugging
      const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
      return NextResponse.json(
        { 
          error: 'Failed to parse PDF. The file might be corrupted or in an unsupported format.',
          details: errorMessage,
          type: pdfError instanceof Error ? pdfError.constructor.name : typeof pdfError,
          hint: 'Please ensure the PDF contains selectable text (not just images). Scanned PDFs may not work.'
        },
        { status: 400 }
      );
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not extract text from PDF. The PDF might be image-based or protected.',
        },
        { status: 400 }
      );
    }

    // Parse the text to extract schedule information
    const classes = parseScheduleFromText(extractedText);

    if (classes.length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not extract schedule from PDF. Please check the format.',
          rawText: extractedText.substring(0, 1000) // Return first 1000 chars for debugging
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      classes,
      rawText: extractedText.substring(0, 500) // Return sample for debugging
    });
  } catch (error) {
    console.error('[parse-schedule-pdf] Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF. Please try again.' },
      { status: 500 }
    );
  }
}

// Parse DAVINCI schedule HTML (Feldbergschule format) - SIMPLIFIED VERSION
function parseDAVINCISchedule(html: string): ParsedClass[] {
  const classes: ParsedClass[] = [];
  
  try {
    console.log('[parseDAVINCISchedule] Starting parser, HTML length:', html.length);
    
    // Remove all script and style tags first
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Find ALL tables
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const allTables: string[] = [];
    let tableMatch;
    while ((tableMatch = tableRegex.exec(cleanHtml)) !== null) {
      allTables.push(tableMatch[1]);
    }
    
    console.log(`[parseDAVINCISchedule] Found ${allTables.length} tables total`);
    
    // Find the schedule table - it should contain day names AND times
    // Also check for class-specific content like "12FO" or "12Fo-b"
    let bestTable: string | null = null;
    let bestTableIndex = -1;
    let bestScore = 0;
    
    for (let i = 0; i < allTables.length; i++) {
      const tableContent = allTables[i];
      let score = 0;
      
      const hasDays = /Montag|Dienstag|Mittwoch|Donnerstag|Freitag/i.test(tableContent);
      const hasTimes = /\d{1,2}[:.]\d{2}/.test(tableContent);
      const has12FO = /12FO|12Fo/i.test(tableContent);
      const hasSubjects = /Deu|Mat|Eng|Che|Spo|Eth|Pol|TAF|WPfU/i.test(tableContent);
      const hasRooms = /\d{3}|Halle|Saal/i.test(tableContent);
      
      // Score tables based on schedule indicators
      if (hasDays) score += 10;
      if (hasTimes) score += 10;
      if (has12FO) score += 5;
      if (hasSubjects) score += 5;
      if (hasRooms) score += 3;
      
      // Count how many day names are present
      const dayCount = (tableContent.match(/Montag|Dienstag|Mittwoch|Donnerstag|Freitag/gi) || []).length;
      score += dayCount * 2;
      
      // Count time occurrences
      const timeCount = (tableContent.match(/\d{1,2}[:.]\d{2}/g) || []).length;
      if (timeCount > 5) score += 5;
      
      console.log(`[parseDAVINCISchedule] Table ${i + 1}: score=${score}, hasDays=${hasDays}, hasTimes=${hasTimes}, has12FO=${has12FO}, dayCount=${dayCount}, timeCount=${timeCount}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestTable = tableContent;
        bestTableIndex = i;
      }
    }
    
    if (!bestTable || bestScore < 10) {
      console.log(`[parseDAVINCISchedule] No suitable schedule table found (best score: ${bestScore})`);
      // Log all tables for debugging
      console.log(`[parseDAVINCISchedule] Total tables found: ${allTables.length}`);
      for (let i = 0; i < Math.min(3, allTables.length); i++) {
        console.log(`[parseDAVINCISchedule] Table ${i + 1} sample (first 500 chars):`, allTables[i].substring(0, 500));
      }
      return classes;
    }
    
    console.log(`[parseDAVINCISchedule] Using table ${bestTableIndex + 1} as schedule table (score: ${bestScore})`);
    
    // Extract all rows - be very permissive with row matching
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: string[] = [];
    let rowMatch;
    let rowCount = 0;
    
    while ((rowMatch = rowRegex.exec(bestTable)) !== null) {
      rows.push(rowMatch[1]);
      rowCount++;
    }
    
    console.log(`[parseDAVINCISchedule] Found ${rows.length} rows in schedule table`);
    
    // Also try alternative row patterns (some HTML might use different structure)
    if (rows.length < 2) {
      console.log('[parseDAVINCISchedule] Trying alternative row extraction');
      // Try without requiring closing tag
      const altRowRegex = /<tr[^>]*>([\s\S]*?)(?=<tr|<\/table|$)/gi;
      rows.length = 0;
      while ((rowMatch = altRowRegex.exec(bestTable)) !== null) {
        rows.push(rowMatch[1]);
      }
      console.log(`[parseDAVINCISchedule] Alternative extraction found ${rows.length} rows`);
    }
    
    if (rows.length < 2) {
      console.log('[parseDAVINCISchedule] Not enough rows, returning empty');
      console.log('[parseDAVINCISchedule] Table content sample:', bestTable.substring(0, 1000));
      return classes;
    }
    
    // Find header row - check first 5 rows for day names
    let headerRowIndex = -1;
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowText = rows[i].replace(/<[^>]+>/g, ' ').toLowerCase();
      const dayCount = dayNames.filter(day => rowText.includes(day.toLowerCase())).length;
      console.log(`[parseDAVINCISchedule] Row ${i} day count: ${dayCount}`);
      
      if (dayCount >= 3) { // At least 3 day names found
        headerRowIndex = i;
        console.log(`[parseDAVINCISchedule] Found header row at index ${i} with ${dayCount} days`);
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      // Try to find any row with at least one day name
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const rowText = rows[i].replace(/<[^>]+>/g, ' ').toLowerCase();
        if (dayNames.some(day => rowText.includes(day.toLowerCase()))) {
          headerRowIndex = i;
          console.log(`[parseDAVINCISchedule] Found header row at index ${i} (at least one day)`);
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      console.log('[parseDAVINCISchedule] No header row found, assuming first row is header');
    }
    
    // Extract header cells - try multiple methods
    const headerRow = rows[headerRowIndex];
    const headerCells: string[] = [];
    
    // Method 1: Standard td/th tags
    const headerCellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let headerCellMatch;
    while ((headerCellMatch = headerCellRegex.exec(headerRow)) !== null) {
      const cellText = headerCellMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      if (cellText) headerCells.push(cellText);
    }
    
    // Method 2: If no cells found, try splitting by | or other separators
    if (headerCells.length === 0) {
      console.log('[parseDAVINCISchedule] No cells found with standard method, trying alternative');
      const textOnly = headerRow.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
      const parts = textOnly.split('|').map(p => p.trim()).filter(p => p.length > 0);
      headerCells.push(...parts);
    }
    
    console.log(`[parseDAVINCISchedule] Extracted ${headerCells.length} header cells:`, headerCells);
    
    // Map day names to column indices - check ALL cells
    const dayMap: Record<string, number> = {};
    console.log('[parseDAVINCISchedule] Mapping days from header cells:', headerCells);
    
    for (let i = 0; i < headerCells.length; i++) {
      const cellText = headerCells[i].toLowerCase().trim();
      console.log(`[parseDAVINCISchedule] Checking cell ${i}: "${cellText}"`);
      
      for (const dayName of dayNames) {
        if (cellText.includes(dayName.toLowerCase())) {
          dayMap[dayName] = i;
          console.log(`[parseDAVINCISchedule] ✓ Mapped ${dayName} to column ${i}`);
        }
      }
    }
    
    // If we found some but not all days, try to fill in missing ones
    const foundDays = Object.keys(dayMap);
    const missingDays = dayNames.filter(d => !foundDays.includes(d));
    
    if (foundDays.length > 0 && missingDays.length > 0) {
      console.log(`[parseDAVINCISchedule] Found ${foundDays.length} days, missing: ${missingDays.join(', ')}`);
      
      // Try to estimate positions based on found days
      const sortedFound = foundDays.sort((a, b) => dayMap[a] - dayMap[b]);
      for (const missingDay of missingDays) {
        const dayIndex = dayNames.indexOf(missingDay);
        // Look at adjacent days
        if (dayIndex > 0 && dayMap[dayNames[dayIndex - 1]] !== undefined) {
          dayMap[missingDay] = dayMap[dayNames[dayIndex - 1]] + 1;
          console.log(`[parseDAVINCISchedule] Estimated ${missingDay} at column ${dayMap[missingDay]}`);
        } else if (dayIndex < dayNames.length - 1 && dayMap[dayNames[dayIndex + 1]] !== undefined) {
          dayMap[missingDay] = dayMap[dayNames[dayIndex + 1]] - 1;
          console.log(`[parseDAVINCISchedule] Estimated ${missingDay} at column ${dayMap[missingDay]}`);
        }
      }
    }
    
    // If STILL no days found, assume standard order: [Time], Montag, Dienstag, etc.
    if (Object.keys(dayMap).length === 0) {
      console.log('[parseDAVINCISchedule] No days found in header, assuming standard order');
      for (let i = 0; i < dayNames.length; i++) {
        dayMap[dayNames[i]] = i + 1; // Skip first column (time)
        console.log(`[parseDAVINCISchedule] Assumed ${dayNames[i]} at column ${i + 1}`);
      }
    }
    
    console.log('[parseDAVINCISchedule] Final day map:', dayMap);
    
    // Process data rows (skip header row)
    for (let rowIdx = headerRowIndex + 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const cells: string[] = [];
      
      // Extract cells - try standard method first
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
        if (cellText) cells.push(cellText);
      }
      
      // If no cells found, try alternative extraction
      if (cells.length === 0) {
        const textOnly = row.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
        const parts = textOnly.split('|').map(p => p.trim()).filter(p => p.length > 0);
        cells.push(...parts);
      }
      
      console.log(`[parseDAVINCISchedule] Row ${rowIdx} has ${cells.length} cells`);
      
      if (cells.length < 2) {
        console.log(`[parseDAVINCISchedule] Row ${rowIdx} skipped (too few cells)`);
        continue;
      }
      
      // First cell should contain time - be more flexible
      // Sometimes the first cell might be a slot number (1, 2, 3...) and time is in second cell
      let timeMatch: RegExpMatchArray | null = null;
      let timeCellIndex = 0;
      
      // Try first cell
      timeMatch = cells[0].match(/(\d{1,2})[:.](\d{2})/);
      if (!timeMatch && cells.length > 1) {
        // Try second cell
        timeMatch = cells[1].match(/(\d{1,2})[:.](\d{2})/);
        if (timeMatch) {
          timeCellIndex = 1;
        }
      }
      
      if (!timeMatch) {
        console.log(`[parseDAVINCISchedule] Row ${rowIdx}: No time found in first 2 cells:`, cells.slice(0, 2));
        continue;
      }
      
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2];
      const time = `${hours}:${minutes}`;
      
      // If time was in second cell, we need to adjust column indices
      const columnOffset = timeCellIndex;
      
      // Calculate duration (default 45 minutes)
      let durationMinutes = 45;
      if (rowIdx + 1 < rows.length) {
        const nextRow = rows[rowIdx + 1];
        const nextCells: string[] = [];
        const nextCellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let nextCellMatch;
        while ((nextCellMatch = nextCellRegex.exec(nextRow)) !== null) {
          const cellText = nextCellMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          nextCells.push(cellText);
        }
        
        if (nextCells.length > 0) {
          const nextTimeMatch = nextCells[0].match(/(\d{1,2})[:.](\d{2})/);
          if (nextTimeMatch) {
            const nextHours = parseInt(nextTimeMatch[1], 10);
            const nextMinutes = parseInt(nextTimeMatch[2], 10);
            const currentHours = parseInt(hours, 10);
            const currentMinutes = parseInt(minutes, 10);
            
            const currentTotal = currentHours * 60 + currentMinutes;
            const nextTotal = nextHours * 60 + nextMinutes;
            let diff = nextTotal - currentTotal;
            if (diff < 0) diff += 24 * 60;
            
            if (diff >= 45 && diff <= 50) {
              durationMinutes = 45;
            } else if (diff >= 90 && diff <= 95) {
              durationMinutes = 90;
            } else {
              durationMinutes = Math.max(45, diff - 10);
            }
          }
        }
      }
      
      // Process each day column - process ALL 5 days
      for (const [dayName, colIdx] of Object.entries(dayMap)) {
        // Adjust column index if time was in second cell
        const actualColIdx = colIdx + columnOffset;
        
        if (actualColIdx >= cells.length) {
          console.log(`[parseDAVINCISchedule] ${dayName} column ${actualColIdx} (mapped from ${colIdx}) out of range (${cells.length} cells)`);
          continue;
        }
        
        const cellContent = cells[actualColIdx].trim();
        console.log(`[parseDAVINCISchedule] ${dayName} (col ${actualColIdx}, mapped from ${colIdx}): "${cellContent}"`);
        
        if (!cellContent || cellContent.length < 2) {
          console.log(`[parseDAVINCISchedule] ${dayName} cell is empty or too short`);
          continue;
        }
        
        // Skip if cell contains only separators or empty
        if (cellContent.match(/^[\s\-|]+$/)) {
          console.log(`[parseDAVINCISchedule] ${dayName} cell contains only separators`);
          continue;
        }
        
        // Parse: "TAF12.05b Stra 214" or "Deu Schä 214" or "Spo Solm Halle-FBS"
        const parts = cellContent.split(/\s+/).filter(p => p.length > 0);
        if (parts.length < 2) continue;
        
        // Subject abbreviations
        const subjectAbbrs: Record<string, string> = {
          'Deu': 'Deutsch',
          'Mat': 'Mathematik',
          'Eng': 'Englisch',
          'Che': 'Chemie',
          'Bio': 'Biologie',
          'Phy': 'Physik',
          'Spo': 'Sport',
          'Eth': 'Ethik',
          'Pol': 'Politik',
          'Gesch': 'Geschichte',
          'Geo': 'Geographie',
          'Kun': 'Kunst',
          'Mus': 'Musik',
          'Inf': 'Informatik',
        };
        
        let subject = '';
        let room = '';
        
        const firstPart = parts[0];
        if (subjectAbbrs[firstPart]) {
          subject = subjectAbbrs[firstPart];
          // Room might be in parts[1] (teacher) or parts[2] (room)
          // Format: "Deu Schä 214" or "Deu Schä 214 TAF12.01"
          if (parts.length >= 2) {
            // Check if parts[1] looks like a room number
            if (/^\d{3}$/.test(parts[1])) {
              room = parts[1];
            } else if (parts.length >= 3) {
              // Room is likely in parts[2] or later
              room = parts.slice(2).join(' ');
            }
          }
        } else if (firstPart.startsWith('TAF') || firstPart.startsWith('WPfU') || firstPart.startsWith('WPf') || firstPart.startsWith('WA') || firstPart.startsWith('Nawi')) {
          subject = firstPart;
          // For TAF codes, room might be in parts[1] or parts[2]
          if (parts.length >= 2) {
            if (/^\d{3}$/.test(parts[1])) {
              room = parts[1];
            } else if (parts.length >= 3) {
              room = parts.slice(2).join(' ');
            }
          }
        } else {
          // Generic subject
          subject = firstPart;
          if (parts.length >= 2) {
            if (/^\d{3}$/.test(parts[1])) {
              room = parts[1];
            } else if (parts.length >= 3) {
              room = parts.slice(2).join(' ');
            }
          }
        }
        
        // Clean room
        room = room.replace(/^(Raum|Room|R\.?|Saal)\s*/i, '').trim();
        
        if (subject) {
          // Adjust duration based on day end times
          let finalDuration = durationMinutes;
          const classHours = parseInt(hours, 10);
          const classMinutes = parseInt(minutes, 10);
          const classTotal = classHours * 60 + classMinutes;
          
          const dayEndTimes: Record<string, number> = {
            'Montag': 15 * 60,
            'Dienstag': 14 * 60 + 15,
            'Mittwoch': 13 * 60 + 10,
            'Donnerstag': 13 * 60 + 10,
            'Freitag': 13 * 60 + 10,
          };
          
          const dayEndTime = dayEndTimes[dayName];
          if (dayEndTime) {
            const timeUntilEnd = dayEndTime - classTotal;
            if (timeUntilEnd > 0 && timeUntilEnd < 60) {
              finalDuration = Math.min(durationMinutes, timeUntilEnd);
            }
          }
          
          classes.push({
            time,
            subject: subject.trim(),
            room: room.trim() || '',
            day: dayName,
            durationMinutes: finalDuration,
          });
          
          console.log(`[parseDAVINCISchedule] Added: ${dayName} ${time} - ${subject} (${room})`);
        }
      }
    }
    
    console.log(`[parseDAVINCISchedule] Total classes found: ${classes.length}`);
    return classes;
    
  } catch (error) {
    console.error('[parseDAVINCISchedule] Error:', error);
    return classes;
  }
}

// OLD PARSER - KEPT FOR REFERENCE
function parseDAVINCISchedule_OLD(html: string): ParsedClass[] {
  const classes: ParsedClass[] = [];
  
  try {
    console.log('[parseDAVINCISchedule] Starting parse, HTML length:', html.length);
    
    // Remove script and style tags
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Check if this looks like a DAVINCI schedule
    if (!/12FO|Montag|Dienstag|Mittwoch|Donnerstag|Freitag/i.test(cleanHtml)) {
      console.log('[parseDAVINCISchedule] HTML does not contain schedule keywords');
      return classes;
    }

    // Find all tables (there might be multiple)
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables: string[] = [];
    let tableMatch;
    while ((tableMatch = tableRegex.exec(cleanHtml)) !== null) {
      tables.push(tableMatch[1]);
    }

    console.log('[parseDAVINCISchedule] Found', tables.length, 'tables');

    if (tables.length === 0) {
      console.log('[parseDAVINCISchedule] No tables found');
      return classes;
    }

    // Try each table until we find one with schedule data
    for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
      const tableContent = tables[tableIdx];
      console.log(`[parseDAVINCISchedule] Processing table ${tableIdx + 1}`);
    
      // Extract all rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows: string[] = [];
      let rowMatch;
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        rows.push(rowMatch[1]);
      }

      console.log(`[parseDAVINCISchedule] Found ${rows.length} rows in table ${tableIdx + 1}`);

      if (rows.length < 2) {
        console.log('[parseDAVINCISchedule] Not enough rows in table:', rows.length);
        continue; // Try next table
      }

      // First row should contain day headers (Montag, Dienstag, etc.)
      const headerRow = rows[0];
      const headerCells: string[] = [];
      const headerCellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let headerCellMatch;
      while ((headerCellMatch = headerCellRegex.exec(headerRow)) !== null) {
        const cellText = headerCellMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        headerCells.push(cellText);
      }

      console.log('[parseDAVINCISchedule] Header cells:', headerCells);

      // Map day names to indices (skip first column which is time/slot number)
      const dayMap: Record<string, number> = {};
      const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
      
      // Try to find day headers - check all columns including first one
      for (let i = 0; i < headerCells.length; i++) {
        const headerText = headerCells[i].toLowerCase();
        for (const dayName of dayNames) {
          if (headerText.includes(dayName.toLowerCase())) {
            dayMap[dayName] = i;
            console.log(`[parseDAVINCISchedule] Found ${dayName} at column ${i}`);
            break;
          }
        }
      }

      // If we didn't find day headers in header row, check if first row might be a separator
      // and look in second row instead
      if (Object.keys(dayMap).length === 0 && rows.length > 1) {
        console.log('[parseDAVINCISchedule] No day headers in first row, checking second row');
        const secondRow = rows[1];
        const secondRowCells: string[] = [];
        const secondRowCellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let secondRowMatch;
        while ((secondRowMatch = secondRowCellRegex.exec(secondRow)) !== null) {
          const cellText = secondRowMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          secondRowCells.push(cellText);
        }
        
        for (let i = 0; i < secondRowCells.length; i++) {
          const cellText = secondRowCells[i].toLowerCase();
          for (const dayName of dayNames) {
            if (cellText.includes(dayName.toLowerCase())) {
              dayMap[dayName] = i;
              console.log(`[parseDAVINCISchedule] Found ${dayName} at column ${i} in second row`);
              break;
            }
          }
        }
      }

      // If still no day headers found, try a different approach: assume standard order
      if (Object.keys(dayMap).length === 0) {
        console.log('[parseDAVINCISchedule] No day headers found, assuming standard order');
        // Assume columns are: [Time/Slot], Montag, Dienstag, Mittwoch, Donnerstag, Freitag
        for (let i = 0; i < dayNames.length; i++) {
          dayMap[dayNames[i]] = i + 1; // Skip first column (time)
        }
        console.log('[parseDAVINCISchedule] Using assumed day map:', dayMap);
      }

      console.log('[parseDAVINCISchedule] Final day map:', dayMap);

      // Process data rows (skip header row, or skip first two if second row had headers)
      const dataStartRow = Object.keys(dayMap).length > 0 && rows.length > 1 && 
                          rows[1].toLowerCase().includes('montag') ? 2 : 1;
      
      console.log(`[parseDAVINCISchedule] Starting data rows from index ${dataStartRow}`);
      
      for (let rowIdx = dataStartRow; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const cells: string[] = [];
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cellMatch;
        while ((cellMatch = cellRegex.exec(row)) !== null) {
          const cellText = cellMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          cells.push(cellText);
        }

        if (cells.length < 2) {
          console.log(`[parseDAVINCISchedule] Row ${rowIdx} has too few cells:`, cells.length);
          continue;
        }
        
        console.log(`[parseDAVINCISchedule] Row ${rowIdx} cells:`, cells.slice(0, 6));

        // First cell contains slot number and time (e.g., "1 08:00" or just "08:00")
        const timeCell = cells[0];
        const timeMatch = timeCell.match(/(\d{1,2})[:.](\d{2})/);
        if (!timeMatch) continue;

        const hours = timeMatch[1].padStart(2, '0');
        const minutes = timeMatch[2];
        const time = `${hours}:${minutes}`;

        // Calculate duration based on time slot
        // Standard slots: 08:00-08:45 (45min), 08:45-09:50 (65min break), 09:50-10:35 (45min), etc.
        // But we need to check the next time slot to determine duration
        let durationMinutes = 45; // Default duration
        
        // Try to find next time slot in the same row or next row
        if (rowIdx + 1 < rows.length) {
          const nextRow = rows[rowIdx + 1];
          const nextCells: string[] = [];
          const nextCellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
          let nextCellMatch;
          while ((nextCellMatch = nextCellRegex.exec(nextRow)) !== null) {
            const cellText = nextCellMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            nextCells.push(cellText);
          }
          
          if (nextCells.length > 0) {
            const nextTimeCell = nextCells[0];
            const nextTimeMatch = nextTimeCell.match(/(\d{1,2})[:.](\d{2})/);
            if (nextTimeMatch) {
              const nextHours = parseInt(nextTimeMatch[1], 10);
              const nextMinutes = parseInt(nextTimeMatch[2], 10);
              const currentHours = parseInt(hours, 10);
              const currentMinutes = parseInt(minutes, 10);
              
              const currentTotalMinutes = currentHours * 60 + currentMinutes;
              const nextTotalMinutes = nextHours * 60 + nextMinutes;
              
              // Calculate duration (accounting for breaks)
              let diff = nextTotalMinutes - currentTotalMinutes;
              if (diff < 0) diff += 24 * 60; // Handle day wrap
              
              // Common patterns: 45min classes, 90min classes (with 5min break = 45+5+45)
              // But breaks can be longer (e.g., 08:45 to 09:50 = 65min break)
              if (diff >= 45 && diff <= 50) {
                durationMinutes = 45;
              } else if (diff >= 90 && diff <= 95) {
                durationMinutes = 90;
              } else if (diff >= 60 && diff <= 70) {
                // Likely a break, use default 45min
                durationMinutes = 45;
              } else {
                // Use calculated duration minus typical break (5-10min)
                durationMinutes = Math.max(45, diff - 10);
              }
            }
          }
        }

        // Process each day column
        for (const [dayName, colIdx] of Object.entries(dayMap)) {
          if (colIdx >= cells.length) {
            console.log(`[parseDAVINCISchedule] Column ${colIdx} for ${dayName} out of range (${cells.length} cells)`);
            continue;
          }
          
          const cellContent = cells[colIdx].trim();
          // Skip empty cells or cells with just whitespace/special chars
          if (!cellContent || cellContent.length < 2 || cellContent.match(/^[\s\-|]+$/)) {
            continue;
          }
          
          console.log(`[parseDAVINCISchedule] Found class on ${dayName} at ${time}: ${cellContent}`);

        // Parse cell content: "TAF12.05b Stra 214" or "Deu Schä 214" or "Spo Solm Halle-FBS"
        // Pattern: [Subject] [Teacher] [Room]
        const parts = cellContent.split(/\s+/).filter(p => p.length > 0);
        
        if (parts.length < 2) continue;

        // Try to identify subject, teacher, and room
        let subject = '';
        let teacher = '';
        let room = '';

        // Common subject abbreviations (German)
        const subjectAbbrs: Record<string, string> = {
          'Deu': 'Deutsch',
          'Mat': 'Mathematik',
          'Eng': 'Englisch',
          'Che': 'Chemie',
          'Bio': 'Biologie',
          'Phy': 'Physik',
          'Spo': 'Sport',
          'Eth': 'Ethik',
          'Pol': 'Politik',
          'Gesch': 'Geschichte',
          'Geo': 'Geographie',
          'Kun': 'Kunst',
          'Mus': 'Musik',
          'Inf': 'Informatik',
        };

        // Check if first part is a subject abbreviation
        const firstPart = parts[0];
        if (subjectAbbrs[firstPart]) {
          subject = subjectAbbrs[firstPart];
          if (parts.length >= 2) teacher = parts[1];
          if (parts.length >= 3) room = parts.slice(2).join(' ');
        } else if (firstPart.startsWith('TAF') || firstPart.startsWith('WPfU') || firstPart.startsWith('WA')) {
          // Special course codes (keep as-is)
          subject = firstPart;
          if (parts.length >= 2) teacher = parts[1];
          if (parts.length >= 3) room = parts.slice(2).join(' ');
        } else {
          // Generic: assume first part is subject, second is teacher, rest is room
          subject = firstPart;
          if (parts.length >= 2) teacher = parts[1];
          if (parts.length >= 3) room = parts.slice(2).join(' ');
        }

        // Clean up room (remove common prefixes, handle special cases like "Halle-FBS")
        room = room.replace(/^(Raum|Room|R\.?|Saal)\s*/i, '').trim();
        
        // If room contains "Nawi" or "PC", include it
        if (cellContent.includes('Nawi') && !room.includes('Nawi')) {
          room = cellContent.split(/\s+/).slice(2).join(' ');
        }

          if (subject) {
            // Adjust duration based on day and time
            let finalDuration = durationMinutes;
            
            // Check if this is the last class of the day based on day-specific end times
            const classHours = parseInt(hours, 10);
            const classMinutes = parseInt(minutes, 10);
            const classTotalMinutes = classHours * 60 + classMinutes;
            
            // Day-specific end times (in minutes from midnight)
            const dayEndTimes: Record<string, number> = {
              'Montag': 15 * 60,      // 15:00 = 900 minutes
              'Dienstag': 14 * 60 + 15, // 14:15 = 855 minutes
              'Mittwoch': 13 * 60 + 10, // 13:10 = 790 minutes
              'Donnerstag': 13 * 60 + 10, // 13:10 = 790 minutes
              'Freitag': 13 * 60 + 10,   // 13:10 = 790 minutes
            };
            
            const dayEndTime = dayEndTimes[dayName];
            if (dayEndTime) {
              // If this class starts close to the end time, adjust duration
              const timeUntilEnd = dayEndTime - classTotalMinutes;
              if (timeUntilEnd > 0 && timeUntilEnd < 60) {
                // This might be the last class, use remaining time
                finalDuration = Math.min(durationMinutes, timeUntilEnd);
              }
            }
            
            classes.push({
              time,
              subject: subject.trim(),
              room: room.trim() || '',
              day: dayName,
              durationMinutes: finalDuration,
            });
          }
        }
      }

      // If we found classes in this table, we're done
      if (classes.length > 0) {
        console.log(`[parseDAVINCISchedule] Found ${classes.length} classes in table ${tableIdx + 1}`);
        break;
      } else {
        console.log(`[parseDAVINCISchedule] No classes found in table ${tableIdx + 1}`);
      }
    }
    
    console.log(`[parseDAVINCISchedule] Total classes found: ${classes.length}`);
  } catch (error) {
    console.error('[parseDAVINCISchedule] Error:', error);
    if (error instanceof Error) {
      console.error('[parseDAVINCISchedule] Error stack:', error.stack);
    }
  }

  return classes;
}

// Extract text from HTML (simple approach)
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags but keep line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  
  return text.trim();
}

// Parse schedule from PDF text
// This is a flexible parser that tries to identify common patterns
function parseScheduleFromText(text: string): ParsedClass[] {
  const classes: ParsedClass[] = [];
  
  // Normalize text: remove extra whitespace, normalize line breaks
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split into lines
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Pattern 1: Look for time patterns (HH:MM or HH.MM)
  const timePattern = /(\d{1,2})[:.](\d{2})/;
  
  // Pattern 2: Look for common subject patterns (German school subjects)
  const subjectPatterns = [
    /Mathematik|Math|Mathe/i,
    /Deutsch|German/i,
    /Englisch|English/i,
    /Physik|Physics/i,
    /Chemie|Chemistry/i,
    /Biologie|Biology/i,
    /Geschichte|History/i,
    /Geographie|Geography/i,
    /Informatik|Computer Science|IT/i,
    /Sport|PE|Physical Education/i,
    /Kunst|Art/i,
    /Musik|Music/i,
  ];

  // Pattern 3: Look for room patterns (e.g., B201, Raum 3, R. 205)
  const roomPattern = /(?:Raum|Room|R\.?|Saal)\s*([A-Z]?\d+[A-Z]?)|([A-Z]\d{3})|([A-Z]\d{2})/i;

  // Try to find schedule entries
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for time in the line
    const timeMatch = line.match(timePattern);
    if (!timeMatch) continue;

    // Extract time
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2];
    const time = `${hours}:${minutes}`;

    // Look for subject in current or next lines
    let subject = '';
    let room = '';
    
    // Check current line and next few lines for subject and room
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      const checkLine = lines[j];
      
      // Try to find subject
      if (!subject) {
        for (const pattern of subjectPatterns) {
          const match = checkLine.match(pattern);
          if (match) {
            // Extract the full subject name (take a few words around the match)
            const words = checkLine.split(/\s+/);
            const matchIndex = words.findIndex(w => pattern.test(w));
            if (matchIndex >= 0) {
              subject = words.slice(Math.max(0, matchIndex - 1), matchIndex + 2).join(' ');
              break;
            }
          }
        }
      }
      
      // Try to find room
      if (!room) {
        const roomMatch = checkLine.match(roomPattern);
        if (roomMatch) {
          room = roomMatch[1] || roomMatch[2] || roomMatch[3] || '';
        }
      }
    }

    // If we found at least time and subject, add it
    if (time && subject) {
      classes.push({
        time,
        subject: subject.trim(),
        room: room.trim() || '',
      });
    }
  }

  // If pattern matching didn't work well, try a more generic approach
  if (classes.length === 0) {
    // Look for lines that contain both time and some text (potential subject)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const timeMatch = line.match(timePattern);
      
      if (timeMatch) {
        const hours = timeMatch[1].padStart(2, '0');
        const minutes = timeMatch[2];
        const time = `${hours}:${minutes}`;
        
        // Extract text after time as potential subject
        const afterTime = line.substring(timeMatch.index! + timeMatch[0].length).trim();
        const words = afterTime.split(/\s+/).filter(w => w.length > 2);
        
        if (words.length > 0) {
          // Take first 2-3 words as subject
          const subject = words.slice(0, 3).join(' ');
          
          // Look for room in the same or next line
          let room = '';
          for (let j = i; j < Math.min(i + 3, lines.length); j++) {
            const roomMatch = lines[j].match(roomPattern);
            if (roomMatch) {
              room = roomMatch[1] || roomMatch[2] || roomMatch[3] || '';
              break;
            }
          }
          
          classes.push({
            time,
            subject,
            room: room.trim(),
          });
        }
      }
    }
  }

  // Remove duplicates (same time and subject)
  const uniqueClasses = classes.filter((cls, index, self) =>
    index === self.findIndex((c) => c.time === cls.time && c.subject === cls.subject)
  );

  return uniqueClasses;
}
