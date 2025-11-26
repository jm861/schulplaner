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
      ? '\n\nBleib dran und plane kurze Pausen ein!'
      : tone === 'motivating'
        ? '\n\nSetze dir kleine Ziele und hake sie nacheinander ab.'
        : '';

  // Gruppiere Punkte und füge Absätze ein (alle 3 Punkte einen Absatz)
  const grouped = bullets.map((line, idx) => {
    const bullet = `${idx + 1}. ${line}`;
    // Füge nach jedem 3. Punkt eine Leerzeile ein (außer beim letzten)
    if ((idx + 1) % 3 === 0 && idx < bullets.length - 1) {
      return bullet + '\n';
    }
    return bullet;
  });

  return grouped.join('\n') + toneSuffix;
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

    // Extract context if provided
    const contextMatch = text.match(/\[Kontext: ([^\]]+)\]/);
    const context = contextMatch ? contextMatch[1] : null;
    const cleanText = contextMatch ? text.replace(/\[Kontext: [^\]]+\]\n\n/, '') : text;

    const prompt = [
      'Du bist ein intelligenter Lerncoach für Schüler:innen einer FOS (12. Klasse).',
      'Deine Aufgabe: Analysiere das folgende Material (Agenda, Notizliste, PDF-Inhalt oder Foto-Text) und erstelle eine strukturierte, übersichtliche Zusammenfassung.',
      '',
      context ? `Kontext: ${context}` : '',
      '',
      'Anforderungen:',
      '- Erkenne die wichtigsten Informationen, Konzepte, To-dos und Deadlines',
      '- Identifiziere das Hauptthema und die Kerninhalte',
      '- Gruppiere zusammengehörige Themen logisch',
      '- Strukturiere die Zusammenfassung in klare Abschnitte mit Leerzeilen dazwischen',
      '- Nummeriere wichtige Punkte für bessere Übersicht',
      '- Hebe Deadlines, wichtige Termine, Formeln, Definitionen und Prioritäten hervor',
      '- Entferne Redundanzen und irrelevante Informationen',
      '- Formuliere präzise und verständlich auf FOS 12 Niveau',
      '- Bei Fachinhalten: Erkläre die wichtigsten Konzepte kurz',
      toneInstruction,
      '',
      'Material / Text:',
      cleanText,
      '',
      'Erstelle eine strukturierte, intelligente Zusammenfassung mit klaren Absätzen zwischen verschiedenen Themenbereichen.',
    ]
      .filter(Boolean)
      .join('\n');

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ summary: fallbackSummary(text, body.tone) });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Analyze text to determine type and extract key information
    const textLower = cleanText.toLowerCase();
    const hasDates = /\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}/.test(cleanText);
    const hasDeadlines = textLower.includes('deadline') || textLower.includes('fällig') || textLower.includes('abgabe') || textLower.includes('termin');
    const hasTasks = textLower.includes('aufgabe') || textLower.includes('task') || textLower.includes('todo') || textLower.includes('erledigen');
    const hasFormulas = /[a-zA-Z]\s*[=<>≤≥]\s*[a-zA-Z0-9]/.test(cleanText) || textLower.includes('formel');
    const isAcademic = textLower.includes('kapitel') || textLower.includes('thema') || textLower.includes('inhalt') || textLower.includes('lern');
    
    const enhancedPrompt = [
      prompt,
      '',
      'ZUSÄTZLICHE ANALYSE:',
      hasDates ? '- Erkenne und hebe alle Daten und Termine hervor' : '',
      hasDeadlines ? '- Priorisiere Deadlines und Fristen' : '',
      hasTasks ? '- Strukturiere Aufgaben klar und übersichtlich' : '',
      hasFormulas ? '- Formeln und mathematische Ausdrücke besonders hervorheben' : '',
      isAcademic ? '- Fokussiere auf Lerninhalte und Konzepte' : '',
      '',
      'Erstelle eine EINZIGARTIGE Zusammenfassung, die spezifisch auf diesen Text zugeschnitten ist.',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein intelligenter, analytischer Lerncoach. Du erstellst immer einzigartige, spezifische Zusammenfassungen, die genau auf den gegebenen Text zugeschnitten sind. Du erkennst Prioritäten, Deadlines, wichtige Informationen und Konzepte. Jede Zusammenfassung ist anders und maßgeschneidert.',
        },
        { role: 'user', content: enhancedPrompt },
      ],
      temperature: 0.7, // Increased for more variation
      max_tokens: 1500, // Increased for more detailed summaries
    });

    const summary = response.choices[0]?.message?.content?.trim() ?? fallbackSummary(text, body.tone);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[ai-summarize] Error:', error);
    return NextResponse.json(
      { error: 'AI cleanup failed.' },
      { status: 500 },
    );
  }
}

