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

type StudyPlan = {
  title: string;
  overview: string;
  steps: string[];
  tips: string[];
  estimatedDuration: string;
  researchLinks?: Array<{
    step: number; // Which step this link belongs to (1-indexed)
    platform: string; // e.g. "YouTube", "Wikipedia", "StudySmarter"
    title: string; // Title or description
    url?: string; // Optional URL if available
    searchTerms?: string; // Search terms if no URL
  }>;
};

const baseDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function createFallbackBlocks(focus: string, _priorities: string) {
  // Always use focus, not priorities
  const focusLower = focus.toLowerCase();
  
  // Extract key words from focus
  const focusWords = focus.split(/[\s,;.]+/).filter(w => w.length > 3).slice(0, 5);
  const focusList = focusWords.length > 0 ? focusWords : [focus];
  
  // Extract specific topics from focus
  const hasABC = focusLower.includes('abc');
  const hasBeschaffung = focusLower.includes('beschaffung');
  const hasLagerung = focusLower.includes('lagerung');
  
  const times = ['08:00', '14:00', '16:00', '18:00', '19:00'];
  const durations = ['45 min', '60 min', '75 min', '90 min'];
  
  return focusList.slice(0, 5).map((subject, index) => {
    const day = baseDays[index] ?? baseDays[index % baseDays.length];
    const time = times[index % times.length];
    const duration = durations[index % durations.length];
    
    // Create specific activities based on focus
    let activity = '';
    let tip = '';
    
    if (hasABC && hasBeschaffung) {
      const activities = [
        `ABC-Analyse Grundlagen erarbeiten: Definition, Klassifizierung von A-, B- und C-Gütern verstehen`,
        `Beschaffungsprozess Schritt für Schritt durcharbeiten: Bedarfsermittlung, Lieferantenauswahl, Bestellung`,
        `ABC-Analyse in der Beschaffung anwenden: Praktische Beispiele für A-Güter (hoher Wert, niedrige Menge)`,
        `Lagerungskosten berechnen: Zusammenhang zwischen Bestellmenge und Lagerkosten`,
        `ABC-Analyse und Beschaffung kombinieren: Wie A-Güter beschafft werden sollten`,
      ];
      const tips = [
        'Beginne mit einem Überblick, dann arbeite die Klassifizierungskriterien durch',
        'Erstelle eine Checkliste für jeden Schritt des Beschaffungsprozesses',
        'Suche nach realen Beispielen aus Unternehmen',
        'Übe mit verschiedenen Zahlenbeispielen',
        'Verbinde die Konzepte: Wie beeinflusst die ABC-Analyse die Beschaffung?',
      ];
      activity = activities[index % activities.length];
      tip = tips[index % tips.length];
    } else {
      // Generic but still specific activities
      const activities = [
        `${subject} Grundlagen durcharbeiten: Wichtige Konzepte und Definitionen`,
        `${subject} Übungsaufgaben lösen: Praktische Anwendung der gelernten Konzepte`,
        `${subject} Zusammenfassung erstellen: Kernpunkte strukturiert aufschreiben`,
        `${subject} Wiederholung: Wichtige Punkte nochmal durchgehen`,
        `${subject} Vertiefung: Komplexere Aspekte erarbeiten`,
      ];
      activity = activities[index % activities.length];
      tip = index === 0 ? 'Beginne mit einem Überblick' : 
            index === 1 ? 'Fokussiere auf praktische Anwendung' :
            index === 2 ? 'Struktur ist wichtig - nutze Überschriften' :
            index === 3 ? 'Wiederhole aktiv, nicht nur passiv lesen' :
            'Gehe in die Tiefe, aber bleib fokussiert';
    }
    
    return {
      day,
      start: time,
      duration,
      focus: subject,
      activity: `${activity} (${focus})`,
      tip,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as StudyPlanPayload;
    const focus = body.focus?.trim() || 'Vorbereitung auf Klausuren in FOS 12';
    const availability = body.availability?.trim() || 'Montag bis Freitag, Nachmittags- und Abendblöcke';
    const priorities = body.priorities?.trim() || 'Mathematik, Naturwissenschaften und Hausaufgaben-Review';

    if (!process.env.OPENAI_API_KEY) {
      console.error('[generate-study-plan] OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please configure OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    console.log('[generate-study-plan] OpenAI API key is configured, starting generation...');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // STEP 1: Analyze the focus input to extract specific topics and requirements
    const analysisPrompt = `Analysiere den folgenden Lernfokus und extrahiere die wichtigsten Informationen:

"${focus}"

Antworte NUR mit einem JSON-Objekt im Format:
{
  "subject": "Hauptfach/Thema",
  "specificTopics": ["spezifisches Thema 1", "spezifisches Thema 2"],
  "taskType": "Zusammenfassung/Quiz/Vorbereitung/etc.",
  "requirements": ["Anforderung 1", "Anforderung 2"],
  "timeframe": "Zeitrahmen falls erwähnt"
}

WICHTIG: Verwende NUR die Informationen aus dem Input. Erfinde nichts.`;

    let analysis: {
      subject?: string;
      specificTopics?: string[];
      taskType?: string;
      requirements?: string[];
      timeframe?: string;
    } = {};

    try {
      const analysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Du analysierst Lernfokus-Inputs und extrahierst spezifische Informationen. Antworte NUR mit gültigem JSON.',
          },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }, {
        timeout: 30000,
      });

      const analysisContent = analysisResponse.choices[0]?.message?.content?.trim();
      if (analysisContent) {
        try {
          const jsonMatch = analysisContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, analysisContent];
          const jsonText = jsonMatch[1] || analysisContent;
          analysis = JSON.parse(jsonText);
        } catch (e) {
          console.warn('[generate-study-plan] Failed to parse analysis:', e);
        }
      }
    } catch (openaiError: any) {
      // Log analysis error but continue - analysis is optional
      const errorStatus = openaiError?.status || openaiError?.response?.status || 500;
      const errorMessage = openaiError?.message || String(openaiError);
      const errorBody = openaiError?.response?.data || openaiError?.error || {};
      const rawError = JSON.stringify({
        message: errorMessage,
        status: errorStatus,
        body: errorBody,
        step: 'analysis',
      });
      console.warn('[generate-study-plan] Analysis step failed, continuing with direct generation:', errorStatus, rawError);
    }

    // Deep analysis of focus input
    const focusLower = focus.toLowerCase();
    
    // Extract specific topics and keywords
    const keywords = focus.split(/[\s,;.]+/).filter(w => w.length > 3).map(w => w.toLowerCase());
    const hasMath = focusLower.includes('mathe') || focusLower.includes('math') || focusLower.includes('rechnung') || focusLower.includes('berechnung') || focusLower.includes('analyse');
    const hasScience = focusLower.includes('physik') || focusLower.includes('chemie') || focusLower.includes('biologie') || focusLower.includes('naturwissenschaft');
    const hasLanguage = focusLower.includes('deutsch') || focusLower.includes('englisch') || focusLower.includes('sprache');
    const hasEconomics = focusLower.includes('wirtschaft') || focusLower.includes('bwl') || focusLower.includes('beschaffung') || focusLower.includes('lagerung') || focusLower.includes('abc');
    const hasExam = focusLower.includes('prüfung') || focusLower.includes('klausur') || focusLower.includes('test') || focusLower.includes('exam');
    const hasProject = focusLower.includes('projekt') || focusLower.includes('arbeit') || focusLower.includes('referat');
    
    // Extract specific topics mentioned
    const specificTopics: string[] = [];
    if (focusLower.includes('abc')) specificTopics.push('ABC-Analyse');
    if (focusLower.includes('beschaffung')) specificTopics.push('Beschaffung');
    if (focusLower.includes('lagerung')) specificTopics.push('Lagerung');
    if (focusLower.includes('bestellmenge')) specificTopics.push('optimale Bestellmenge');
    if (focusLower.includes('kosten')) specificTopics.push('Kostenanalyse');
    
    // Determine study intensity and time preferences
    const intensity = hasExam ? 'hoch' : hasProject ? 'mittel' : 'normal';
    const timePreference = focusLower.includes('morgen') || focusLower.includes('morgens') ? 'morgen' :
                          focusLower.includes('abend') || focusLower.includes('abends') ? 'abend' : 'nachmittag';

    // Create a unique seed based on focus content for variation
    const contentHash = focus.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variationSeed = contentHash % 10;

    // STEP 2: Generate study plan based on analysis
    const analyzedSubject = analysis.subject || 'Allgemein';
    const analyzedTopics = analysis.specificTopics || [];
    const taskType = analysis.taskType || 'Vorbereitung';
    const requirements = analysis.requirements || [];

    const prompt = [
      'Du bist ein hochqualifizierter, erfahrener Lerncoach für Schüler:innen einer FOS (12. Klasse) mit umfassendem Wissen über verschiedene Fachbereiche.',
      '',
      'AUFGABE: Erstelle eine GESAMTE, UMFASSENDE Zusammenfassung des Themas und einen praktischen Lernplan.',
      '',
      `ORIGINALER INPUT: "${focus}"`,
      '',
      'WICHTIG: Der Input ist eine AUFGABE oder FRAGE. Du sollst NICHT die Aufgabe wörtlich übernehmen, sondern das THEMA analysieren und eine vollständige Zusammenfassung erstellen!',
      '',
      'EXTRAHIERTE INFORMATIONEN:',
      `- Hauptfach/Thema: ${analyzedSubject}`,
      analyzedTopics.length > 0 ? `- Spezifische Themen: ${analyzedTopics.join(', ')}` : '',
      `- Aufgabenart: ${taskType}`,
      requirements.length > 0 ? `- Anforderungen: ${requirements.join(', ')}` : '',
      '',
      'KRITISCH - DIE "OVERVIEW" MUSS EINE GESAMTE ZUSAMMENFASSUNG SEIN:',
      '- Die "overview" soll eine UMFASSENDE, DETAILLIERTE Zusammenfassung des gesamten Themas sein',
      '- Erkläre das Thema von Grund auf: Was ist es? Wie funktioniert es? Warum ist es wichtig?',
      '- Gehe auf alle wichtigen Aspekte, Konzepte, Definitionen und Zusammenhänge ein',
      '- Die Zusammenfassung soll so umfassend sein, dass der Schüler das Thema versteht, auch wenn er es noch nicht kennt',
      '- Nutze dein vollständiges Wissen über das Thema - sei nicht oberflächlich!',
      '- Mindestens 200-300 Wörter für eine wirklich umfassende Zusammenfassung',
      '',
      'KRITISCH - DIESE FEHLER MÜSSEN VERMIEDEN WERDEN:',
      '❌ Die Aufgabe wörtlich als ersten Schritt übernehmen (z.B. "Bitte die ABC Analyse erklären Grundlagen erarbeiten")',
      '❌ Generische Schritte wie "Grundlagen erarbeiten: Wichtige Konzepte verstehen" ohne spezifische Details',
      '❌ Die Eingabe-Aufgabe in den Titel oder Schritte kopieren',
      '',
      'RICHTIG:',
      '✅ Analysiere die Aufgabe und extrahiere das THEMA (z.B. aus "Bitte die ABC Analyse erklären" → Thema: "ABC-Analyse")',
      '✅ Erstelle einen Plan zur BEARBEITUNG des Themas, nicht zur Wiederholung der Aufgabe',
      '✅ Verwende spezifische, konkrete Schritte mit Details',
      '',
      'KRITISCH - ABSOLUT VERBOTEN (diese Formulierungen sind zu generisch):',
      '❌ "60 Minuten konzentriert an [Fach] arbeiten"',
      '❌ "an [Fach] arbeiten"',
      '❌ "Wiederholung von [Fach]"',
      '❌ "Übungsaufgaben lösen: Praktische Anwendung"',
      '❌ "Grundlagen durcharbeiten: Wichtige Konzepte"',
      '❌ "Zusammenfassung erstellen: Kernpunkte strukturieren" (ohne spezifische Details)',
      '❌ Jede Formulierung, die den Input ignoriert oder zu allgemein ist',
      '',
      'ERFORDERLICH - SO MUSS DER PLAN AUSSEHEN:',
      `- Analysiere die Aufgabe und extrahiere das THEMA (nicht die Aufgabe selbst!)`,
      `- Der Plan soll zur BEARBEITUNG des Themas dienen: ${analyzedSubject || analyzedTopics.join(', ') || 'aus dem Input extrahiertes Thema'}`,
      `- Verwende die spezifischen Themen: ${analyzedTopics.length > 0 ? analyzedTopics.join(', ') : 'aus dem Input extrahiert'}`,
      `- Berücksichtige die Aufgabenart: ${taskType}`,
      '- Erstelle einen zusammenhängenden Plan mit 5-8 konkreten Lernschritten',
      '- Jeder Schritt muss SPEZIFISCH sein und konkrete Aufgaben enthalten',
      '- Der Titel soll das THEMA sein, nicht die Aufgabe (z.B. "ABC-Analyse" statt "Bitte die ABC Analyse erklären")',
      '',
      '🔍 KRITISCH - ONLINE-RECHERCHE IST PFLICHT:',
      '- MINDESTENS 3-4 Schritte MÜSSEN explizit Online-Recherche enthalten!',
      '- Jeder Recherche-Schritt muss mit "Online recherchieren:" oder "Recherchiere online:" beginnen',
      '- Gib konkrete Recherche-Anweisungen: "Recherchiere online zu [spezifischem Thema] auf [Plattform/Website]"',
      '- Recherche-Schritte sollten über den gesamten Plan verteilt sein (nicht alle am Anfang oder Ende)',
      '- Recherche dient: Vertiefung, aktuelle Informationen, Beispiele, Fallstudien, Übungsaufgaben, etc.',
      '',
      '📺 WICHTIG - YOUTUBE-VIDEOS UND ARTIKEL-LINKS:',
      '- Bei YouTube-Recherche: Gib konkrete Video-Titel oder Suchbegriffe an',
      '- Bei Wikipedia: Gib den Artikel-Namen an (der Link wird automatisch generiert)',
      '- Die Links werden automatisch generiert, du musst nur die Suchbegriffe/Artikel-Namen angeben',
      '- Beispiele für Recherche-Schritte:',
      '  • "Online recherchieren: Suche auf YouTube nach Videos zu [Thema]" → Link wird automatisch generiert',
      '  • "Recherchiere online: Wikipedia-Artikel zu [Thema] lesen" → Link wird automatisch generiert',
      '  • "Online recherchieren: Finde Erklärvideos auf YouTube mit den Suchbegriffen [konkrete Suchbegriffe]"',
      '',
      'KONKRETE BEISPIELE für Lernpläne MIT ONLINE-RECHERCHE (mindestens 3-4 Recherche-Schritte!):',
      '',
      `Beispiel 1 - Input: "Summarize Chapter 8 of 'Modern Europe'"`,
      `  ✅ Schritt 1: "Kapitel 8 'Modern Europe' lesen: Hauptthemen (Industrialisierung, Nationalismus) identifizieren, wichtige Ereignisse notieren"`,
      `  ✅ Schritt 2: "Online recherchieren: Aktuelle historische Quellen zu den Ereignissen von 1848 und der deutschen Einigung auf seriösen Geschichtsportalen (z.B. Wikipedia, historische Archive) finden"`,
      `  ✅ Schritt 3: "Historische Zusammenhänge analysieren: Die recherchierten Informationen mit dem Lehrbuch vergleichen"`,
      `  ✅ Schritt 4: "Online recherchieren: Videos und Dokumentationen zu den historischen Ereignissen auf YouTube oder Bildungsplattformen ansehen"`,
      `  ✅ Schritt 5: "Zusammenfassung erstellen: Alle Informationen strukturieren und Kernpunkte formulieren"`,
      '',
      `Beispiel 2 - Input: "Create a quiz for organic chemistry functional groups"`,
      `  ✅ Schritt 1: "Grundlagen erarbeiten: Alkane, Alkene, Alkine definieren, Strukturformeln zeichnen"`,
      `  ✅ Schritt 2: "Online recherchieren: Aktuelle Beispiele und Anwendungen der Funktionsgruppen in der Industrie auf Chemie-Portalen (z.B. Chemie.de, Chemgapedia) finden"`,
      `  ✅ Schritt 3: "Eigenschaften vergleichen: Die recherchierten Informationen mit den Grundlagen kombinieren"`,
      `  ✅ Schritt 4: "Online recherchieren: Übungsaufgaben und Quiz-Beispiele zu Funktionsgruppen auf Lernplattformen (z.B. StudySmarter, Khan Academy) finden"`,
      `  ✅ Schritt 5: "Quiz-Fragen formulieren: Basierend auf den recherchierten Informationen eigene Quiz-Fragen erstellen"`,
      '',
      `Beispiel 3 - Input: "Plan a 3-day countdown for the math exam"`,
      `  ✅ Schritt 1: "Mathe-Formeln wiederholen: Alle wichtigen Formeln auf Karteikarten schreiben"`,
      `  ✅ Schritt 2: "Online recherchieren: Übungsaufgaben und Lösungswege zu den Formeln auf Lernplattformen (z.B. Matheguru, StudySmarter) finden"`,
      `  ✅ Schritt 3: "Praktische Anwendung: Die recherchierten Übungsaufgaben lösen"`,
      `  ✅ Schritt 4: "Online recherchieren: Erklärvideos zu schwierigen Themen auf YouTube oder Bildungsplattformen ansehen"`,
      `  ✅ Schritt 5: "Schwachstellen identifizieren: Basierend auf den Übungen und Videos Lücken im Verständnis erkennen"`,
      '',
      'WICHTIG - STRUKTUR DES PLANS:',
      '- Jeder Schritt sollte konkret und umsetzbar sein',
      '- Verwende konkrete Beispiele, Zahlen, Namen, Konzepte aus dem Input',
      '- MINDESTENS 3-4 Schritte MÜSSEN mit "Online recherchieren:" oder "Recherchiere online:" beginnen!',
      '- Recherche-Schritte sollten über den gesamten Plan verteilt sein (z.B. Schritt 2, 4, 6)',
      '- Gib konkrete Recherche-Hinweise mit Plattformen (z.B. "Recherchiere auf Wikipedia/YouTube/Lernplattformen zu [Thema]")',
      '- Die Recherche sollte dem Verständnis, der Vertiefung, dem Finden von Beispielen und Übungsaufgaben dienen',
      '',
      'PRÜFE VOR DEM ABSENDEN:',
      '- Enthält der Plan mindestens 3-4 explizite Online-Recherche-Schritte?',
      '- Beginnen die Recherche-Schritte mit "Online recherchieren:" oder "Recherchiere online:"?',
      '- Sind die Recherche-Schritte über den gesamten Plan verteilt?',
      '- Enthalten die Recherche-Schritte konkrete Hinweise zu Plattformen oder Themen?',
      '',
      'Erstelle einen zusammenhängenden Lernplan für die gesamte Thematik, der DIREKT auf den Input eingeht.',
      '',
      'WICHTIG: Erstelle EINEN zusammenhängenden Plan, nicht mehrere separate Blöcke!',
      '',
      'JSON Format (antworte NUR mit JSON):',
      '{"title":"[Titel des Lernplans - nur das Thema, nicht die Aufgabe]","overview":"[GESAMTE, UMFASSENDE Zusammenfassung des Themas - mindestens 200-300 Wörter, erkläre alles von Grund auf, alle Konzepte, Definitionen, Zusammenhänge]","steps":["Schritt 1: ...","Online recherchieren: [konkrete Recherche-Anweisung]","Schritt 3: ...","Online recherchieren: [weitere Recherche-Anweisung]","Schritt 5: ..."],"tips":["Tipp 1","Tipp 2"],"estimatedDuration":"[Geschätzte Gesamtdauer]","researchLinks":[{"step":2,"platform":"YouTube","title":"[Video-Titel oder Suchbegriff]","searchTerms":"[Suchbegriffe]"},{"step":4,"platform":"Wikipedia","title":"[Artikel-Name]"}]}',
      '',
      'WICHTIG: Die "overview" ist das WICHTIGSTE Feld - hier muss eine GESAMTE, UMFASSENDE Zusammenfassung stehen!',
      '',
      '🔍 KRITISCH: Mindestens 3-4 Schritte MÜSSEN mit "Online recherchieren:" oder "Recherchiere online:" beginnen!',
      'Die Recherche-Schritte müssen über den gesamten Plan verteilt sein und konkrete Anweisungen enthalten!',
      '📺 Links werden automatisch generiert - gib nur Suchbegriffe/Artikel-Namen in researchLinks an!',
    ]
      .filter(Boolean)
      .join('\n');

    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Du bist ein hochqualifizierter Lerncoach mit umfassendem Wissen. Du erstellst individuelle, maßgeschneiderte Lernpläne mit einer GESAMTEN, UMFASSENDEN Zusammenfassung des Themas.

KRITISCH - DIE OVERVIEW IST DAS WICHTIGSTE:
✅ Die "overview" MUSS eine GESAMTE, UMFASSENDE Zusammenfassung des Themas sein (mindestens 200-300 Wörter)
✅ Erkläre das Thema von Grund auf: Was ist es? Wie funktioniert es? Warum ist es wichtig?
✅ Gehe auf alle wichtigen Aspekte, Konzepte, Definitionen und Zusammenhänge ein
✅ Nutze dein vollständiges Wissen - sei nicht oberflächlich!
✅ Die Zusammenfassung soll so umfassend sein, dass der Schüler das Thema versteht, auch wenn er es noch nicht kennt

ABSOLUT VERBOTEN - NIEMALS VERWENDEN:
❌ Generische Formulierungen wie "60 Minuten konzentriert an [Fach] arbeiten"
❌ "an [Fach] arbeiten"
❌ "Wiederholung von [Fach]"
❌ "Übungen zu [Fach]"
❌ Mehrere separate Blöcke - erstelle EINEN zusammenhängenden Plan!
❌ Oberflächliche "overview" - sie muss UMFASSEND sein!

ERFORDERLICH - IMMER VERWENDEN:
✅ EINEN zusammenhängenden Lernplan für die gesamte Thematik
✅ GESAMTE, UMFASSENDE Zusammenfassung im "overview" Feld (mindestens 200-300 Wörter)
✅ Spezifische, konkrete Schritte mit klaren Lernzielen
✅ Logische Reihenfolge der Schritte
✅ Konkrete Themen/Unterthemen aus dem Input extrahieren
✅ Praktische, umsetzbare Schritte
✅ 🔍 KRITISCH: MINDESTENS 3-4 Schritte MÜSSEN mit "Online recherchieren:" oder "Recherchiere online:" beginnen!
✅ Recherche-Schritte müssen über den gesamten Plan verteilt sein (z.B. Schritt 2, 4, 6)
✅ Recherche-Schritte müssen konkrete Anweisungen enthalten (z.B. "Recherchiere online zu [Thema] auf [Plattform]")
✅ Hilfreiche Tipps für die gesamte Thematik

PRÜFE VOR DEM ABSENDEN:
- Ist die "overview" eine GESAMTE, UMFASSENDE Zusammenfassung (mindestens 200-300 Wörter)?
- Erklärt die "overview" das Thema von Grund auf?
- Enthält der Plan mindestens 3-4 explizite Online-Recherche-Schritte?
- Beginnen die Recherche-Schritte mit "Online recherchieren:" oder "Recherchiere online:"?
- Sind die Recherche-Schritte über den gesamten Plan verteilt?

Du antwortest ausschließlich mit gültigem JSON im Format {"title":"...","overview":"[GESAMTE ZUSAMMENFASSUNG - mindestens 200-300 Wörter]","steps":[...],"tips":[...],"estimatedDuration":"..."}.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }, {
        timeout: 60000,
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
        step: 'main_generation',
      });

      console.error('[generate-study-plan] OPENAI_FEHLER', errorStatus, rawError);
      
      return NextResponse.json(
        { 
          ok: false,
          status: errorStatus,
          raw: rawError,
        },
        { status: errorStatus },
      );
    }

    let plan: StudyPlan | null = null;

    console.log('[generate-study-plan] Received response from OpenAI');
    const content = response.choices[0]?.message?.content?.trim();
    if (content) {
      console.log('[generate-study-plan] Content length:', content.length);
      try {
        // Try to extract JSON if wrapped in markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, content];
        const jsonText = jsonMatch[1] || content;
        const parsed = JSON.parse(jsonText) as StudyPlan;
        
        // Validate plan structure
        if (parsed.title && parsed.overview && parsed.steps && Array.isArray(parsed.steps)) {
          // Clean title - remove task words and ensure it's the topic, not the task
          let cleanTitle = parsed.title;
          if (cleanTitle.toLowerCase().includes('bitte') || cleanTitle.toLowerCase().includes('erklären') || cleanTitle.toLowerCase().includes('beschreibe')) {
            // Extract the actual topic from the title
            cleanTitle = cleanTitle
              .replace(/^(bitte|please|erkläre|erklären|beschreibe|beschreiben|zeige|zeigen)\s*/i, '')
              .replace(/\s*(erklären|erkläre|beschreiben|beschreibe|zeigen|zeige)$/i, '')
              .trim();
          }
          
          // Clean steps - remove task repetition
          const cleanedSteps = parsed.steps.map(step => {
            // Remove task repetition at the beginning of steps
            const focusLower = focus.toLowerCase();
            const stepLower = step.toLowerCase();
            if (stepLower.startsWith(focusLower.substring(0, Math.min(20, focusLower.length)))) {
              // Step starts with the task, remove it
              return step.substring(focus.length).trim();
            }
            return step;
          }).filter(step => step.length > 0);
          
          // Generate research links from steps if not provided
          const generatedLinks: Array<{
            step: number;
            platform: string;
            title: string;
            url?: string;
            searchTerms?: string;
          }> = [];
          
          cleanedSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            const stepLower = step.toLowerCase();
            
            // Check if this is a research step
            if (stepLower.includes('online recherchieren') || stepLower.includes('recherchiere online') || stepLower.includes('youtube') || stepLower.includes('wikipedia')) {
              // Extract search terms from step
              let searchTerms = '';
              let platform = 'YouTube';
              
              // Try to extract topic from step
              if (stepLower.includes('youtube')) {
                platform = 'YouTube';
                // Extract search terms after "youtube" or "suche"
                const youtubeMatch = step.match(/(?:youtube|suche|suchbegriff)[\s:]+(?:nach|zu|mit)?\s*[":]?([^"]+?)(?:["\s]|$)/i);
                if (youtubeMatch) {
                  searchTerms = youtubeMatch[1].trim();
                } else {
                  // Fallback: use the main topic
                  searchTerms = cleanTitle || analyzedSubject || analyzedTopics[0] || 'Thema';
                }
                // Generate YouTube search URL
                const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}`;
                generatedLinks.push({
                  step: stepNumber,
                  platform: 'YouTube',
                  title: searchTerms || cleanTitle || 'Video',
                  url: youtubeSearchUrl,
                  searchTerms: searchTerms,
                });
              } else if (stepLower.includes('wikipedia')) {
                platform = 'Wikipedia';
                // Extract topic for Wikipedia
                const wikiTopic = analyzedSubject || analyzedTopics[0] || cleanTitle || 'Thema';
                const wikiUrl = `https://de.wikipedia.org/wiki/${encodeURIComponent(wikiTopic.replace(/\s+/g, '_'))}`;
                generatedLinks.push({
                  step: stepNumber,
                  platform: 'Wikipedia',
                  title: wikiTopic,
                  url: wikiUrl,
                });
              } else {
                // Generic research step - generate YouTube search
                const topic = analyzedSubject || analyzedTopics[0] || cleanTitle || 'Thema';
                searchTerms = topic;
                const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}`;
                generatedLinks.push({
                  step: stepNumber,
                  platform: 'YouTube',
                  title: searchTerms,
                  url: youtubeSearchUrl,
                  searchTerms: searchTerms,
                });
              }
            }
          });
          
          // Merge provided links with generated ones
          const mergedLinks = [...(parsed.researchLinks || []), ...generatedLinks];
          // Remove duplicates (keep first occurrence)
          const uniqueLinks = mergedLinks.filter((link, index, self) =>
            index === self.findIndex(l => l.step === link.step && l.platform === link.platform)
          );
          
          plan = {
            title: cleanTitle || analyzedSubject || analyzedTopics[0] || 'Thema',
            overview: parsed.overview || '',
            steps: cleanedSteps.length > 0 ? cleanedSteps : parsed.steps,
            tips: parsed.tips || [],
            estimatedDuration: parsed.estimatedDuration || '3-5 Stunden',
            researchLinks: uniqueLinks.length > 0 ? uniqueLinks : generatedLinks,
          };
        } else {
          throw new Error('Invalid plan structure');
        }
      } catch (error) {
        console.error('[generate-study-plan] Failed to parse JSON output:', error);
        console.error('[generate-study-plan] Raw output:', content);
        return NextResponse.json(
          { error: 'Failed to generate study plan. Please ensure OpenAI API is properly configured and try again.' },
          { status: 500 }
        );
      }
    } else {
        // If no content, return error - we need OpenAI to work properly
        console.error('[generate-study-plan] No content from OpenAI, API key is required');
        return NextResponse.json(
          { error: 'Failed to generate study plan. Please ensure OpenAI API is properly configured.' },
          { status: 500 }
        );
    }

    if (!plan) {
      console.error('[generate-study-plan] No plan generated after processing');
      return NextResponse.json(
        { error: 'Failed to generate study plan. Please try again or check your OpenAI API configuration.' },
        { status: 500 },
      );
    }

    console.log('[generate-study-plan] Successfully generated plan:', { title: plan.title, stepsCount: plan.steps.length });
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('[generate-study-plan] Unexpected Error:', error);
    
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

