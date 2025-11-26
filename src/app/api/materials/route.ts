import { randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import PDFParser from 'pdf2json';

import { upstash } from '@/lib/upstash';
import { MaterialRecord } from '@/types/materials';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MATERIALS_KEY = 'schulplaner:materials';
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  return new Promise((resolve, reject) => {
    try {
      const pdfParser = new PDFParser(null, true);
      const dataBuffer = Buffer.from(buffer);

      pdfParser.on('pdfParser_dataError', (errMsg: Error | { parserError: Error }) => {
        const error = errMsg instanceof Error ? errMsg : errMsg.parserError;
        reject(new Error(`PDF-Parsing-Fehler: ${error.message}`));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: unknown) => {
        try {
          let text = '';
          const data = pdfData as { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> };
          const pages = data.Pages || [];

          for (const page of pages) {
            const texts = page.Texts || [];
            for (const textItem of texts) {
              const runs = textItem.R || [];
              for (const run of runs) {
                if (run.T) {
                  // Decode URI-encoded text
                  try {
                    text += decodeURIComponent(run.T) + ' ';
                  } catch {
                    text += run.T + ' ';
                  }
                }
              }
            }
            text += '\n';
          }

          const extractedText = text.trim();
          if (!extractedText) {
            reject(new Error('Kein Text im PDF gefunden.'));
            return;
          }

          resolve({
            text: extractedText,
            pageCount: pages.length,
          });
        } catch (error) {
          reject(new Error(`Text-Extraktion fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`));
        }
      });

      pdfParser.parseBuffer(dataBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[materials] PDF extraction error:', errorMessage);
      reject(new Error(`PDF-Extraktion fehlgeschlagen: ${errorMessage}`));
    }
  });
}

async function extractTextFromImage(buffer: Buffer, mimeType: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured for OCR');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  let response;
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Extrahiere jeden lesbaren Text aus diesem Foto oder Scan.',
                'Antworte ausschließlich mit dem Klartext, ohne Kommentare oder Formatierung.',
                'Erhalte die Struktur (Absätze, Listen) wenn möglich.',
              ].join(' '),
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2000,
    }, {
      timeout: 30000,
    });
  } catch (openaiError: any) {
    // Extract error details from OpenAI SDK error
    const errorStatus = openaiError?.status || openaiError?.response?.status || 500;
    const errorMessage = openaiError?.message || String(openaiError);
    const errorBody = openaiError?.response?.data || openaiError?.error || {};
    const rawError = JSON.stringify({
      message: errorMessage,
      status: errorStatus,
      body: errorBody,
      stack: openaiError?.stack,
      function: 'extractTextFromImage',
    });

    console.error('[materials] OPENAI_FEHLER (OCR)', errorStatus, rawError);
    
    // Re-throw with structured error info
    const error = new Error(`OCR failed: ${errorMessage}`);
    (error as any).status = errorStatus;
    (error as any).raw = rawError;
    throw error;
  }

  const text = response.choices[0].message.content?.trim() ?? '';
  if (!text) {
    throw new Error('No text returned from OpenAI OCR');
  }
  return text;
}

async function getAllMaterials(): Promise<MaterialRecord[]> {
  if (!upstash.isConfigured()) {
    return [];
  }

  try {
    const existing = await upstash.get<MaterialRecord[]>(MATERIALS_KEY);
    return existing ?? [];
  } catch (error) {
    console.error('[materials] Failed to load existing materials:', error);
    return [];
  }
}

async function saveMaterials(records: MaterialRecord[]) {
  if (!upstash.isConfigured()) {
    throw new Error('Upstash Redis is not configured.');
  }
  await upstash.set(MATERIALS_KEY, records);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const materials = await getAllMaterials();
    const filtered = userId ? materials.filter((item) => item.userId === userId) : materials;
    return NextResponse.json({ materials: filtered });
  } catch (error) {
    console.error('[materials] GET error:', error);
    return NextResponse.json({ error: 'Failed to load materials' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!upstash.isConfigured()) {
    return NextResponse.json(
      { error: 'Server storage not configured. Please set Upstash credentials.' },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = (formData.get('userId') as string) || 'anonymous';
    const userEmail = (formData.get('userEmail') as string) || '';
    const title = (formData.get('title') as string) || file?.name || 'Unbenannt';

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei erhalten.' }, { status: 400 });
    }

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: 'Nur PDF- oder Bilddateien (JPG, PNG, HEIC, WebP) werden unterstützt.' },
        { status: 400 },
      );
    }

    if (isImage && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Bild-OCR benötigt einen OpenAI API Key in OPENAI_API_KEY.' },
        { status: 500 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß. Bitte maximal 15MB hochladen.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let extractedText = '';
    const meta: MaterialRecord['meta'] = {};
    let sourceType: MaterialRecord['sourceType'] = 'pdf';

    if (isPdf) {
      const { text, pageCount } = await extractTextFromPdf(arrayBuffer);
      extractedText = text;
      meta.pageCount = pageCount;
      sourceType = 'pdf';
    } else {
      try {
        const buffer = Buffer.from(arrayBuffer);
        extractedText = await extractTextFromImage(buffer, file.type);
        sourceType = 'image';
        meta.lang = 'deu+eng';
      } catch (ocrError: any) {
        // Handle OCR errors with structured response
        const errorStatus = ocrError?.status || 500;
        const rawError = ocrError?.raw || JSON.stringify({ message: ocrError?.message || String(ocrError) });
        
        console.error('[materials] OPENAI_FEHLER (OCR in POST)', errorStatus, rawError);
        
        return NextResponse.json(
          { 
            ok: false,
            status: errorStatus,
            raw: rawError,
          },
          { status: errorStatus },
        );
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Es konnte kein Text extrahiert werden. Bitte versuche eine klarere Datei.' },
        { status: 400 },
      );
    }

    meta.charCount = extractedText.length;

    const newEntry: MaterialRecord = {
      id: randomUUID(),
      userId,
      userEmail,
      title,
      text: extractedText.trim(),
      originalName: file.name,
      sourceType,
      meta,
      createdAt: new Date().toISOString(),
    };

    const existing = await getAllMaterials();
    const updated = [newEntry, ...existing].slice(0, 200);
    await saveMaterials(updated);

    return NextResponse.json({ material: newEntry });
  } catch (error) {
    console.error('[materials] POST error:', error);
    
    // If error already has structured format, return it
    if (error && typeof error === 'object' && 'status' in error && 'raw' in error) {
      return NextResponse.json(
        {
          ok: false,
          status: (error as any).status,
          raw: (error as any).raw,
        },
        { status: (error as any).status },
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawError = JSON.stringify({ message: errorMessage, type: 'unexpected' });
    
    return NextResponse.json(
      {
        ok: false,
        status: 500,
        raw: rawError,
      },
      { status: 500 },
    );
  }
}


