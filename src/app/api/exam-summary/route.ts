import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

type ExamSummaryPayload = {
  subject?: string;
  topics?: string;
  notes?: string;
};

function fallbackExamSummary({
  subject,
  topics,
  notes,
}: {
  subject: string;
  topics?: string;
  notes?: string;
}) {
  const lines = [
    `Fach: ${subject}`,
    topics ? `Themenfokus: ${topics}` : null,
    notes ? `Hinweise: ${notes}` : null,
    '1. Erstelle eine kurze Übersicht der wichtigsten Kapitel.',
    '2. Plane 2 Lernblöcke à 45 Minuten mit Fragen/Übungen.',
    '3. Notiere offene Fragen und kläre sie mit Lehrkraft oder Gruppe.',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExamSummaryPayload;
    const subject = body.subject?.trim();
    const topics = body.topics?.trim();
    const notes = body.notes?.trim();

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required.' },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ summary: fallbackExamSummary({ subject, topics, notes }) });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = [
      'Du bist ein Lerncoach an einer FOS (Jahrgangsstufe 12).',
      'Erstelle eine präzise, leicht verständliche Stichpunkt-Zusammenfassung für eine anstehende Prüfung.',
      'Nutze klares Deutsch auf Niveau FOS 12 und hebe die wichtigsten Lernschwerpunkte hervor.',
      '',
      `Fach: ${subject}`,
      topics ? `Themen: ${topics}` : undefined,
      notes ? `Hinweise: ${notes}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.4,
      max_output_tokens: 400,
    });

    const summary = response.output_text ?? fallbackExamSummary({ subject, topics, notes });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[exam-summary] Error:', error);
    return NextResponse.json(
      { error: 'Exam summary generation failed.' },
      { status: 500 },
    );
  }
}

