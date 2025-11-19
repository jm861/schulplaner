import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

type StudyPlanPayload = {
  focus?: string;
  availability?: string;
  priorities?: string;
};

type StudyBlock = {
  day: string;
  start: string;
  duration: string;
  focus: string;
  activity: string;
  tip?: string;
};

const baseDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function createFallbackBlocks(focus: string, priorities: string) {
  const subjects = priorities
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const focusList = subjects.length > 0 ? subjects : [focus];

  return focusList.slice(0, 5).map((subject, index) => ({
    day: baseDays[index] ?? baseDays[index % baseDays.length],
    start: '16:00',
    duration: '60 min',
    focus: subject,
    activity: `60 Minuten konzentriert an "${subject}" arbeiten (${focus}).`,
    tip: 'Plane am Ende 5 Minuten Review und hake erledigte Aufgaben ab.',
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as StudyPlanPayload;
    const focus = body.focus?.trim() || 'Vorbereitung auf Klausuren in FOS 12';
    const availability = body.availability?.trim() || 'Montag bis Freitag, Nachmittags- und Abendblöcke';
    const priorities = body.priorities?.trim() || 'Mathematik, Naturwissenschaften und Hausaufgaben-Review';

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ blocks: createFallbackBlocks(focus, priorities) });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = [
      'Du bist ein Lerncoach für Schüler:innen einer FOS (12. Klasse).',
      'Erstelle einen strukturierten Lernplan als Liste von Blöcken.',
      'Jeder Block soll einen Wochentag, Startzeit, Dauer, Fokus und konkrete Aktivität enthalten.',
      'Begrenze dich auf 5-7 Blöcke und nutze klares Deutsch.',
      'Gib deine Antwort ausschließlich als JSON im folgenden Format aus: {"blocks":[{...}]}',
      'Fülle für jeden Block die Felder day, start, duration, focus, activity und optional tip.',
      '',
      `Fokus: ${focus}`,
      `Verfügbarkeit: ${availability}`,
      `Prioritäten: ${priorities}`,
    ].join('\n');

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.3,
      max_output_tokens: 600,
    });

    let blocks: StudyBlock[] = [];

    const textOutput = response.output_text;
    if (textOutput) {
      try {
        const parsed = JSON.parse(textOutput) as { blocks?: StudyBlock[] };
        blocks = parsed.blocks ?? [];
      } catch (error) {
        console.warn('[generate-study-plan] Failed to parse JSON output:', error);
      }
    }

    const responseBlocks = blocks.length > 0 ? blocks : createFallbackBlocks(focus, priorities);

    return NextResponse.json({ blocks: responseBlocks });
  } catch (error) {
    console.error('[generate-study-plan] Error:', error);
    return NextResponse.json(
      { error: 'Could not generate study plan.' },
      { status: 500 },
    );
  }
}

