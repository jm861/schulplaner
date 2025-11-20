import { NextRequest, NextResponse } from 'next/server';

// Configure runtime for serverless (needed for pdfjs-dist)
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for PDF parsing

type ParsedClass = {
  time: string;
  subject: string;
  room: string;
  day?: string; // Optional day of week
};

// POST /api/parse-schedule-pdf - Parse uploaded PDF and extract schedule
export async function POST(req: NextRequest) {
  try {
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
    const arrayBuffer = await file.arrayBuffer();
    
    // Dynamically import pdfjs for serverless compatibility
    let text = '';
    try {
      // Import pdfjs-dist - use the worker build for serverless
      const pdfjs = await import('pdfjs-dist');
      
      // Use the getDocument function
      const getDocument = pdfjs.getDocument;
      
      if (!getDocument) {
        throw new Error('PDF.js getDocument function not available');
      }
      
      // Configure worker (not needed for text extraction, but good practice)
      // For serverless, we can skip worker setup
      
      // Parse PDF
      const loadingTask = getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0, // Suppress warnings
      });
      
      const pdf = await loadingTask.promise;
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => (item.str || '').trim())
          .filter((str: string) => str.length > 0)
          .join(' ');
        text += pageText + '\n';
      }
    } catch (pdfError) {
      console.error('[parse-schedule-pdf] PDF parsing error:', pdfError);
      // Return error with more details for debugging
      return NextResponse.json(
        { 
          error: 'Failed to parse PDF. The file might be corrupted or in an unsupported format.',
          details: pdfError instanceof Error ? pdfError.message : 'Unknown error',
          type: pdfError instanceof Error ? pdfError.constructor.name : typeof pdfError
        },
        { status: 400 }
      );
    }
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not extract text from PDF. The PDF might be image-based or protected.',
        },
        { status: 400 }
      );
    }

    // Parse the text to extract schedule information
    const classes = parseScheduleFromText(text);

    if (classes.length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not extract schedule from PDF. Please check the format.',
          rawText: text.substring(0, 1000) // Return first 1000 chars for debugging
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      classes,
      rawText: text.substring(0, 500) // Return sample for debugging
    });
  } catch (error) {
    console.error('[parse-schedule-pdf] Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF. Please try again.' },
      { status: 500 }
    );
  }
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

