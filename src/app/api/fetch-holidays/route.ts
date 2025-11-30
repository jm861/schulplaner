import { NextRequest, NextResponse } from 'next/server';

// Mapping von Bundesland-Codes zu OpenHolidays API subdivision codes
const STATE_TO_SUBDIVISION: Record<string, string> = {
  BW: 'DE-BW', // Baden-Württemberg
  BY: 'DE-BY', // Bayern
  BE: 'DE-BE', // Berlin
  BB: 'DE-BB', // Brandenburg
  HB: 'DE-HB', // Bremen
  HH: 'DE-HH', // Hamburg
  HE: 'DE-HE', // Hessen
  MV: 'DE-MV', // Mecklenburg-Vorpommern
  NI: 'DE-NI', // Niedersachsen
  NW: 'DE-NW', // Nordrhein-Westfalen
  RP: 'DE-RP', // Rheinland-Pfalz
  SL: 'DE-SL', // Saarland
  SN: 'DE-SN', // Sachsen
  ST: 'DE-ST', // Sachsen-Anhalt
  SH: 'DE-SH', // Schleswig-Holstein
  TH: 'DE-TH', // Thüringen
};

type OpenHolidaysHoliday = {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: {
    language: string;
    text: string;
  }[];
  nationwide: boolean;
  subdivisions?: {
    code: string;
    shortName: string;
  }[];
};

export async function POST(req: NextRequest) {
  try {
    const { state, year } = await req.json();

    if (!state || typeof state !== 'string') {
      return NextResponse.json(
        { error: 'Bundesland ist erforderlich' },
        { status: 400 }
      );
    }

    const subdivisionCode = STATE_TO_SUBDIVISION[state];
    if (!subdivisionCode) {
      return NextResponse.json(
        { error: `Unbekanntes Bundesland: ${state}` },
        { status: 400 }
      );
    }

    // Standardmäßig aktuelles Jahr, oder das angegebene Jahr
    const currentYear = year || new Date().getFullYear();
    const validFrom = `${currentYear}-01-01`;
    const validTo = `${currentYear}-12-31`;

    // Verwende OpenHolidays API direkt - zuverlässiger
    const openHolidaysUrl = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=${subdivisionCode}&validFrom=${validFrom}&validTo=${validTo}`;
    
    console.log('[fetch-holidays] Fetching from OpenHolidays API:', openHolidaysUrl);

    const response = await fetch(openHolidaysUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Schulplaner/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000), // 15 seconds
    });

    if (!response.ok) {
      console.error('[fetch-holidays] API error:', response.status, response.statusText);
      const errorText = await response.text().catch(() => '');
      console.error('[fetch-holidays] Error response:', errorText.substring(0, 500));
      return NextResponse.json(
        { 
          error: `API-Fehler: ${response.status} ${response.statusText}`,
          details: 'Die Ferien-API konnte nicht erreicht werden.'
        },
        { status: response.status }
      );
    }

    const data: OpenHolidaysHoliday[] = await response.json();
    console.log('[fetch-holidays] API returned', data.length, 'total holidays');

    // Daten in unser Format konvertieren - weniger strenge Filterung
    const holidays = data
      .filter((holiday) => {
        // Akzeptiere alle holiday types, die relevant sein könnten
        const isRelevant = holiday.type === 'school_holiday' || 
                          holiday.type === 'public_holiday' ||
                          holiday.type?.toLowerCase().includes('holiday') ||
                          holiday.type?.toLowerCase().includes('vacation') ||
                          holiday.type?.toLowerCase().includes('ferien');
        
        if (!isRelevant) return false;
        
        // Prüfe, ob es für unser Bundesland gilt
        // Wenn nationwide=true, gilt es für alle
        if (holiday.nationwide) return true;
        
        // Wenn subdivisions vorhanden, prüfe ob unser Bundesland dabei ist
        if (holiday.subdivisions && holiday.subdivisions.length > 0) {
          return holiday.subdivisions.some((sub) => sub.code === subdivisionCode);
        }
        
        // Wenn keine subdivisions, aber type=school_holiday, nehmen wir es trotzdem
        return holiday.type === 'school_holiday';
      })
      .map((holiday) => {
        // Deutschen Namen finden
        const germanName = holiday.name.find((n) => n.language === 'DE')?.text || 
                          holiday.name.find((n) => n.language === 'de')?.text ||
                          holiday.name.find((n) => n.language === 'DEU')?.text ||
                          holiday.name.find((n) => n.language === 'ger')?.text ||
                          holiday.name[0]?.text || 
                          'Ferien';

        return {
          name: germanName,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          state: state,
        };
      })
      .filter((h) => h.startDate && h.endDate) // Nur gültige Einträge
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    console.log('[fetch-holidays] Filtered to', holidays.length, 'school holidays');

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('[fetch-holidays] Error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Zeitüberschreitung',
            details: 'Die Ferien-API hat nicht innerhalb von 10 Sekunden geantwortet.'
          },
          { status: 408 }
        );
      }
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return NextResponse.json(
          { 
            error: 'API konnte nicht erreicht werden',
            details: error.message || 'Möglicherweise gibt es ein Netzwerkproblem.'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Unbekannter Fehler',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

