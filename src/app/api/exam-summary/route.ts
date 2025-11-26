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

    // Analyze subject and topics for specific recommendations
    const subjectLower = subject.toLowerCase();
    const topicsLower = topics?.toLowerCase() || '';
    const notesLower = notes?.toLowerCase() || '';
    
    const isMath = subjectLower.includes('mathe') || subjectLower.includes('math') || topicsLower.includes('rechnung') || topicsLower.includes('formel');
    const isScience = subjectLower.includes('physik') || subjectLower.includes('chemie') || subjectLower.includes('biologie') || subjectLower.includes('naturwissenschaft');
    const isLanguage = subjectLower.includes('deutsch') || subjectLower.includes('englisch') || subjectLower.includes('sprache');
    const isSocial = subjectLower.includes('geschichte') || subjectLower.includes('geographie') || subjectLower.includes('sozial') || subjectLower.includes('politik');
    const isEconomics = subjectLower.includes('wirtschaft') || subjectLower.includes('bwl') || subjectLower.includes('vwl') || subjectLower.includes('ökonomie');
    
    const hasFormulas = topicsLower.includes('formel') || notesLower.includes('formel') || topicsLower.includes('berechnung');
    const hasDates = topicsLower.includes('datum') || topicsLower.includes('jahr') || notesLower.includes('datum');
    const hasConcepts = topicsLower.includes('konzept') || topicsLower.includes('theorie') || topicsLower.includes('modell');

    const prompt = [
      'Du bist ein hochqualifizierter, erfahrener Lerncoach für Schüler:innen einer FOS (Jahrgangsstufe 12) mit Expertise in verschiedenen Fachbereichen.',
      '',
      'AUFGABE: Erstelle eine individuelle, maßgeschneiderte Lernzusammenfassung für diese spezifische Prüfung.',
      '',
      'WICHTIGE ANFORDERUNGEN:',
      '- Analysiere das Fach und die Themen GENAU und erstelle eine SPEZIFISCHE Zusammenfassung (nicht generisch!)',
      '- Nutze klares, verständliches Deutsch auf FOS 12 Niveau',
      '- Strukturiere in logische Abschnitte mit klaren Absätzen',
      '- Hebe die wichtigsten Lernschwerpunkte und Kernkonzepte hervor',
      '- Gib konkrete, umsetzbare Lernempfehlungen',
      '- Erkenne Zusammenhänge zwischen den Themen',
      '- Priorisiere nach Wichtigkeit für die Prüfung',
      '- Jede Zusammenfassung muss EINZIGARTIG und auf diese Prüfung zugeschnitten sein',
      '',
      `FACH: ${subject}`,
      topics ? `THEMEN: ${topics}` : undefined,
      notes ? `HINWEISE DES SCHÜLERS: ${notes}` : undefined,
      '',
      'FACHSPEZIFISCHE ANALYSE:',
      isMath ? '- Mathematische Inhalte: Fokus auf Formeln, Rechenwege, Anwendungen' : '',
      isScience ? '- Naturwissenschaftliche Fächer: Fokus auf Experimente, Gesetze, Zusammenhänge' : '',
      isLanguage ? '- Sprachliche Fächer: Fokus auf Grammatik, Vokabular, Textanalyse' : '',
      isSocial ? '- Gesellschaftswissenschaften: Fokus auf Zusammenhänge, Entwicklungen, Kontexte' : '',
      isEconomics ? '- Wirtschaft: Fokus auf Modelle, Prozesse, Anwendungen' : '',
      hasFormulas ? '- Formeln und Berechnungen sind wichtig - erkläre sie verständlich' : '',
      hasDates ? '- Historische Daten und Zeiträume sind relevant' : '',
      hasConcepts ? '- Theoretische Konzepte benötigen Erklärung und Beispiele' : '',
      '',
      'Erstelle eine EINZIGARTIGE, umfassende Zusammenfassung, die genau auf diese Prüfung zugeschnitten ist.',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener, kreativer Lerncoach mit Expertise in verschiedenen Fächern. Du erstellst immer einzigartige, spezifische Lernzusammenfassungen, die genau auf die gegebene Prüfung zugeschnitten sind. Jede Zusammenfassung ist anders und maßgeschneidert.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000, // Increased for more detailed summaries
    }, {
      timeout: 30000, // 30 second timeout
    });

    const summary = response.choices[0]?.message?.content?.trim() ?? fallbackExamSummary({ subject, topics, notes });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[exam-summary] Error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('rate_limit') || error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 },
        );
      }
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 },
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Exam summary generation failed. Please try again.' },
      { status: 500 },
    );
  }
}

