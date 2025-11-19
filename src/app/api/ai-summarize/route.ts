import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

type SummarizePayload = {
  text?: string;
  tone?: 'concise' | 'friendly' | 'motivating';
};

const tonePrompts: Record<NonNullable<SummarizePayload['tone']>, string> = {
  concise: 'Schreibe sehr knapp und strukturiert.',
  friendly: 'Nutze einen freundlichen, unterstützenden Ton.',
  motivating: 'Füge motivierende, aber sachliche Formulierungen hinzu.',
};

function fallbackSummary(text: string, tone: SummarizePayload['tone'] = 'concise') {
  const cleanLines = text
    .split(/\r?\n|[•\-]/)
    .map((line) => line.replace(/^\s*\d+[\).\s-]*/, '').trim())
    .filter((line) => line.length > 0);

  const bullets = cleanLines.slice(0, 6);
  if (bullets.length === 0) {
    return 'Keine Inhalte gefunden, bitte mehr Details eingeben.';
  }

  const toneSuffix =
    tone === 'friendly'
      ? '\nBleib dran und plane kurze Pausen ein!'
      : tone === 'motivating'
        ? '\nSetze dir kleine Ziele und hake sie nacheinander ab.'
        : '';

  return bullets.map((line, idx) => `${idx + 1}. ${line}`).join('\n') + toneSuffix;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SummarizePayload;
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required.' },
        { status: 400 },
      );
    }

    const toneInstruction = body.tone ? tonePrompts[body.tone] : tonePrompts.concise;

    const prompt = [
      'Du bist ein Lerncoach für Schüler:innen einer FOS (12. Klasse).',
      'Bereinige die folgende Agenda oder Notizliste und fasse sie in klaren, nummerierten Stichpunkten zusammen.',
      'Markiere To-dos, Deadlines und Hinweise deutlich.',
      toneInstruction,
      '',
      'Agenda / Text:',
      text,
    ].join('\n');

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ summary: fallbackSummary(text, body.tone) });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 500,
    });

    const summary = response.output_text ?? fallbackSummary(text, body.tone);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[ai-summarize] Error:', error);
    return NextResponse.json(
      { error: 'AI cleanup failed.' },
      { status: 500 },
    );
  }
}

