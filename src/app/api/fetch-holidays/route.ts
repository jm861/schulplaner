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

    // OpenHolidays API aufrufen
    const apiUrl = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=${subdivisionCode}&validFrom=${validFrom}&validTo=${validTo}`;

    console.log('[fetch-holidays] Fetching from:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Schulplaner/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    if (!response.ok) {
      console.error('[fetch-holidays] API error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: `API-Fehler: ${response.status} ${response.statusText}`,
          details: 'Die Ferien-API konnte nicht erreicht werden.'
        },
        { status: response.status }
      );
    }

    const data: OpenHolidaysHoliday[] = await response.json();

    // Daten in unser Format konvertieren
    const holidays = data
      .filter((holiday) => {
        // Nur Schulferien (type === "public_holiday" oder "school_holiday")
        // und nur die, die für unser Bundesland gelten
        return (
          (holiday.type === 'public_holiday' || holiday.type === 'school_holiday') &&
          (holiday.nationwide || 
           holiday.subdivisions?.some((sub) => sub.code === subdivisionCode))
        );
      })
      .map((holiday) => {
        // Deutschen Namen finden
        const germanName = holiday.name.find((n) => n.language === 'DE')?.text || 
                          holiday.name.find((n) => n.language === 'de')?.text ||
                          holiday.name[0]?.text || 
                          'Ferien';

        return {
          name: germanName,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          state: state,
        };
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

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

