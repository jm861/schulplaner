import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type SubstitutionEntry = {
  id: string;
  date: string;
  class: string;
  period: string;
  subject: string;
  originalTeacher?: string;
  substituteTeacher?: string;
  room?: string;
  note?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { url, className } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Ungültige URL' }, { status: 400 });
    }

    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      signal: AbortSignal.timeout(15000), // 15 seconds
      cache: 'no-store' as RequestCache, // Force no caching
    };

    // Check if this is the Feldbergschule index page, class page oder daily substitutions page
    const isFeldbergschuleIndex = parsedUrl.hostname.includes('feldbergschule.de') && 
                                   parsedUrl.pathname.includes('klassenvertretungen') &&
                                   parsedUrl.pathname.includes('index');
    const isFeldbergschuleClassPage = parsedUrl.hostname.includes('feldbergschule.de') &&
                                      parsedUrl.pathname.includes('klassenvertretungen') &&
                                      parsedUrl.pathname.includes('V_CL');
    const isFeldbergschuleDaily = parsedUrl.hostname.includes('feldbergschule.de') && 
                                   parsedUrl.pathname.includes('tagesvertretungen');

    let targetUrl = url;
    let html: string = '';

    if (isFeldbergschuleDaily) {
      console.log(`[fetch-substitution-plan] Using daily substitutions page directly: ${url}`);
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      const dailyResponse = await fetch(`${url}${cacheBuster}`, fetchOptions);
      if (!dailyResponse.ok) {
        return NextResponse.json(
          { error: `Tagesvertretungs-Seite antwortete mit Status ${dailyResponse.status}` },
          { status: dailyResponse.status }
        );
      }
      html = await dailyResponse.text();
      targetUrl = url;
    } else if (isFeldbergschuleClassPage) {
      console.log(`[fetch-substitution-plan] Direct class page provided: ${url}`);
      const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      const classResponse = await fetch(`${url}${cacheBuster}`, fetchOptions);
      if (!classResponse.ok) {
        return NextResponse.json(
          { error: `Klassenvertretungs-Seite antwortete mit Status ${classResponse.status}` },
          { status: classResponse.status }
        );
      }
      html = await classResponse.text();
      targetUrl = url;
    } else if (isFeldbergschuleIndex && className) {
      // Step 1: Fetch the index page to find the class link (ALWAYS fresh, no cache)
      // Add timestamp to URL to prevent caching
      const cacheBuster = `?t=${Date.now()}`;
      const indexUrlWithCacheBuster = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}${cacheBuster}`;
      
      console.log(`[fetch-substitution-plan] Fetching fresh index page: ${indexUrlWithCacheBuster}`);
      const indexResponse = await fetch(indexUrlWithCacheBuster, fetchOptions);
      if (!indexResponse.ok) {
        return NextResponse.json(
          { error: `Index-Seite antwortete mit Status ${indexResponse.status}` },
          { status: indexResponse.status }
        );
      }
      const indexHtml = await indexResponse.text();
      
      // Log a snippet of the HTML for debugging (first 2000 chars)
      console.log(`[fetch-substitution-plan] Index HTML snippet (first 2000 chars):`, indexHtml.substring(0, 2000));
      
      // Verify that the class name exists in the HTML
      const normalizedClassName = className.trim().toLowerCase().replace(/[\s\-_]/g, '');
      const classExists = new RegExp(
        `(${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${normalizedClassName})`,
        'i'
      ).test(indexHtml);
      
      if (!classExists) {
        console.warn(`[fetch-substitution-plan] WARNING: Class "${className}" not found in index HTML`);
      } else {
        console.log(`[fetch-substitution-plan] Verified: Class "${className}" exists in index HTML`);
      }
      
      // Step 2: Find the link or button for the specified class (case-insensitive)
      // Use the full base URL (with path) for proper relative URL resolution
      const baseUrlForLink = url.replace(/\/index\.html?$/, '');
      const classLink = findClassLink(indexHtml, className, baseUrlForLink);
      
      if (classLink) {
        targetUrl = classLink;
        console.log(`[fetch-substitution-plan] Using link found by findClassLink: ${targetUrl}`);
      } else {
        // Try to find ANY V_CL_ link in the HTML and use it as a pattern
        // Since all classes use the same pattern, we can extract the base structure
        const vclPattern = /V_CL_[A-F0-9-]+\.html/gi;
        const vclMatches = indexHtml.match(vclPattern);
        
        console.log(`[fetch-substitution-plan] findClassLink returned null, found ${vclMatches?.length || 0} V_CL_ links in HTML`);
        
        if (vclMatches && vclMatches.length > 0) {
          // Found V_CL_ links, but need to find the one for our class
          // Search for the class name and find the nearest V_CL_ link
          
          // Try to find the class name in the HTML - look for exact matches first
          const classPattern = new RegExp(
            `(${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
            'gi'
          );
          const classMatches = Array.from(indexHtml.matchAll(classPattern));
          
          if (classMatches.length > 0) {
            // Find the V_CL_ link closest to each class name occurrence
            let bestMatch: { vclLink: string; distance: number } | null = null;
            
            for (const classMatch of classMatches) {
              const classIndex = classMatch.index || 0;
              
              // Search for V_CL_ links near this class name (within 300 chars)
              const searchStart = Math.max(0, classIndex - 300);
              const searchEnd = Math.min(indexHtml.length, classIndex + className.length + 300);
              const searchArea = indexHtml.substring(searchStart, searchEnd);
              
              // Find all V_CL_ links in this area
              const vclInArea = searchArea.match(/V_CL_[A-F0-9-]+\.html/gi);
              
              if (vclInArea && vclInArea.length > 0) {
                // Use the first V_CL_ link found in this area (closest to class name)
                const vclLink = vclInArea[0];
                const vclIndex = searchArea.indexOf(vclLink);
                const distance = Math.abs(vclIndex - (classIndex - searchStart));
                
                if (!bestMatch || distance < bestMatch.distance) {
                  bestMatch = { vclLink, distance };
                }
              }
            }
            
            if (bestMatch) {
              const basePath = url.replace(/\/index\.html?$/, '');
              targetUrl = `${basePath}/${bestMatch.vclLink}`;
              console.log(`[fetch-substitution-plan] Found V_CL_ link closest to "${className}": ${targetUrl} (distance: ${bestMatch.distance})`);
            } else {
              // No V_CL_ link found near class name, try to find it in button/link context
              console.log(`[fetch-substitution-plan] No V_CL_ link found near "${className}", trying to find in button/link context...`);
              // This will be handled by findClassLink which should have found it
              const basePath = url.replace(/\/index\.html?$/, '');
              targetUrl = `${basePath}/${vclMatches[0]}`;
              console.log(`[fetch-substitution-plan] Using first V_CL_ link as fallback: ${targetUrl}`);
            }
          } else {
            // Class name not found in HTML at all
            console.log(`[fetch-substitution-plan] Class name "${className}" not found in HTML`);
            const basePath = url.replace(/\/index\.html?$/, '');
            targetUrl = `${basePath}/${vclMatches[0]}`;
            console.log(`[fetch-substitution-plan] Using first V_CL_ link: ${targetUrl}`);
          }
        } else {
          // No V_CL_ links found, try direct construction
          const basePath = url.replace(/\/index\.html?$/, '');
          const classSlug = className.trim().replace(/\s+/g, '');
          targetUrl = `${basePath}/${classSlug}/index.html`;
          console.log(`[fetch-substitution-plan] No V_CL_ links found, constructing URL directly: ${targetUrl}`);
        }
      }

      // Step 3: Fetch the substitution plan page for this class (ALWAYS fresh, no cache)
      // Add cache buster to ensure we get the latest data
      const planCacheBuster = targetUrl.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      const targetUrlWithCacheBuster = `${targetUrl}${planCacheBuster}`;
      
      console.log(`[fetch-substitution-plan] Fetching fresh substitution plan from: ${targetUrlWithCacheBuster}`);
      
      try {
        const planResponse = await fetch(targetUrlWithCacheBuster, fetchOptions);
        if (!planResponse.ok) {
          // If the first URL fails, try alternative patterns
          if (planResponse.status === 404) {
            const basePath = url.replace(/\/index\.html?$/, '');
            const classSlug = className.trim().replace(/\s+/g, '');
            const possibleUrls = [
              `${basePath}/${classSlug}/index.html`,
              `${basePath}/${classSlug}.html`,
              `${basePath}/${classSlug}/`,
              `${basePath}/${classSlug}`,
              `${basePath}/${classSlug.toLowerCase()}/index.html`,
              `${basePath}/${classSlug.toLowerCase()}.html`,
            ];

            let found = false;
            for (const testUrl of possibleUrls) {
              if (testUrl === targetUrl) continue; // Skip the one we already tried
              console.log(`[fetch-substitution-plan] Trying alternative URL: ${testUrl}`);
              try {
                const testResponse = await fetch(testUrl, fetchOptions);
                if (testResponse.ok) {
                  targetUrl = testUrl;
                  html = await testResponse.text();
                  found = true;
                  console.log(`[fetch-substitution-plan] Successfully fetched from: ${testUrl}`);
                  break;
                } else {
                  console.log(`[fetch-substitution-plan] URL ${testUrl} returned status ${testResponse.status}`);
                }
              } catch (testError) {
                console.log(`[fetch-substitution-plan] URL ${testUrl} failed:`, testError instanceof Error ? testError.message : String(testError));
                continue;
              }
            }

            if (!found) {
              return NextResponse.json(
                { error: `Vertretungsplan-Seite für Klasse "${className}" nicht gefunden (Status ${planResponse.status}). Die Klasse existiert auf der Index-Seite, aber die Vertretungsplan-URL konnte nicht ermittelt werden.` },
                { status: 404 }
              );
            }
          } else {
            return NextResponse.json(
              { error: `Vertretungsplan-Seite antwortete mit Status ${planResponse.status}` },
              { status: planResponse.status }
            );
          }
        } else {
          html = await planResponse.text();
          console.log(`[fetch-substitution-plan] Successfully fetched HTML (${html.length} chars)`);
          
          // Extract the actual class from the fetched page and verify it matches
          const headingRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
          const headings: string[] = [];
          let headingMatch;
          while ((headingMatch = headingRegex.exec(html)) !== null) {
            headings.push(headingMatch[1].trim());
          }
          
          // Look for class pattern in headings (e.g., "12FO-3", "12Fo-b", "12FO-b")
          // Pattern: 1-2 digits, 1-2 letters, optional dash, optional letter, optional digit
          const classPatternRegex = /\b(\d{1,2}[A-Z][A-Za-z]?[-\s]?[a-z]?[0-9]?)\b/;
          let extractedClass: string | null = null;
          
          for (const heading of headings) {
            const match = heading.match(classPatternRegex);
            if (match) {
              extractedClass = match[1].trim();
              break;
            }
          }
          
          // Also check in the HTML content if not found in headings
          if (!extractedClass) {
            const contentMatch = html.match(classPatternRegex);
            if (contentMatch) {
              extractedClass = contentMatch[1].trim();
            }
          }
          
          // Normalize both classes for comparison
          const normalizedInputClass = className.trim().toLowerCase().replace(/[\s\-_]/g, '');
          const normalizedExtractedClass = extractedClass?.toLowerCase().replace(/[\s\-_]/g, '') || '';
          
          console.log(`[fetch-substitution-plan] Extracted class from page: "${extractedClass}" (normalized: "${normalizedExtractedClass}")`);
          console.log(`[fetch-substitution-plan] Expected class: "${className}" (normalized: "${normalizedInputClass}")`);
          console.log(`[fetch-substitution-plan] Found headings:`, headings);
          
          // Check if classes match (flexible matching for case variations)
          const classesMatch = normalizedExtractedClass === normalizedInputClass ||
            normalizedExtractedClass.includes(normalizedInputClass) ||
            normalizedInputClass.includes(normalizedExtractedClass);
          
          if (!classesMatch && extractedClass) {
            console.error(`[fetch-substitution-plan] ERROR: Page is for class "${extractedClass}" but expected "${className}"`);
            console.log(`[fetch-substitution-plan] Attempting to find correct link for "${className}" in index HTML...`);
            
            // Try to find the correct link by searching the index HTML more carefully
            const correctLink = findClassLink(indexHtml, className, baseUrlForLink);
            
            if (correctLink && correctLink !== targetUrl) {
              console.log(`[fetch-substitution-plan] Found different link for "${className}": ${correctLink}`);
              // Try fetching with the correct link
              try {
                const correctLinkCacheBuster = correctLink.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
                const correctLinkUrl = `${correctLink}${correctLinkCacheBuster}`;
                console.log(`[fetch-substitution-plan] Retrying with correct link: ${correctLinkUrl}`);
                
                const retryResponse = await fetch(correctLinkUrl, fetchOptions);
                if (retryResponse.ok) {
                  html = await retryResponse.text();
                  targetUrl = correctLink;
                  
                  // Verify again
                  const retryHeadingRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
                  const retryHeadings: string[] = [];
                  let retryHeadingMatch;
                  while ((retryHeadingMatch = retryHeadingRegex.exec(html)) !== null) {
                    retryHeadings.push(retryHeadingMatch[1].trim());
                  }
                  
                  const retryClassMatch = retryHeadings.some(h => {
                    const match = h.match(classPatternRegex);
                    if (match) {
                      const retryExtracted = match[1].trim().toLowerCase().replace(/[\s\-_]/g, '');
                      return retryExtracted === normalizedInputClass || 
                             retryExtracted.includes(normalizedInputClass) ||
                             normalizedInputClass.includes(retryExtracted);
                    }
                    return false;
                  });
                  
                  if (retryClassMatch) {
                    console.log(`[fetch-substitution-plan] Successfully fetched correct page for "${className}"`);
                  } else {
                    return NextResponse.json(
                      { 
                        error: `Die abgerufene Seite ist für die Klasse "${extractedClass}", nicht für "${className}". Der Link-Finder konnte den richtigen Link nicht finden. Bitte überprüfe, ob die Klasse "${className}" auf der Index-Seite existiert.`,
                        extractedClass,
                        expectedClass: className
                      },
                      { status: 400 }
                    );
                  }
                } else {
                  return NextResponse.json(
                    { 
                      error: `Die abgerufene Seite ist für die Klasse "${extractedClass}", nicht für "${className}". Der Versuch, den richtigen Link zu finden, schlug fehl (Status ${retryResponse.status}).`,
                      extractedClass,
                      expectedClass: className
                    },
                    { status: 400 }
                  );
                }
              } catch (retryError) {
                console.error(`[fetch-substitution-plan] Retry failed:`, retryError);
                return NextResponse.json(
                  { 
                    error: `Die abgerufene Seite ist für die Klasse "${extractedClass}", nicht für "${className}". Bitte versuche es erneut - der Link wird jedes Mal neu aus der Index-Seite extrahiert.`,
                    extractedClass,
                    expectedClass: className
                  },
                  { status: 400 }
                );
              }
            } else {
              return NextResponse.json(
                { 
                  error: `Die abgerufene Seite ist für die Klasse "${extractedClass}", nicht für "${className}". Der Link-Finder konnte den richtigen Link nicht finden. Bitte überprüfe, ob die Klasse "${className}" auf der Index-Seite existiert.`,
                  extractedClass,
                  expectedClass: className
                },
                { status: 400 }
              );
            }
          } else if (!extractedClass) {
            console.warn(`[fetch-substitution-plan] WARNING: Could not extract class from page, but continuing anyway`);
          } else {
            console.log(`[fetch-substitution-plan] Verified: Page is for the correct class "${extractedClass}"`);
          }
        }
      } catch (fetchError) {
        console.error(`[fetch-substitution-plan] Fetch error for ${targetUrl}:`, fetchError);
        throw fetchError;
      }
    } else {
      // Direct URL fetch (for other websites or direct class links)
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Website antwortete mit Status ${response.status}` },
          { status: response.status }
        );
      }
      html = await response.text();
    }

    // Parse the substitution plan
    // If it's a daily substitutions page, filter by className
    // If it's a class-specific page, use the className from parameter
    const entries = parseFeldbergschulePlan(html, targetUrl, className || '', isFeldbergschuleDaily);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('[fetch-substitution-plan] Error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Zeitüberschreitung beim Abrufen der Website',
          details: 'Die Website hat nicht innerhalb von 15 Sekunden geantwortet.'
        }, { status: 408 });
      }
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return NextResponse.json({ 
          error: 'Website konnte nicht erreicht werden',
          details: error.message || 'Möglicherweise blockiert die Website Anfragen von Vercel-Servern oder es gibt ein Netzwerkproblem.'
        }, { status: 503 });
      }
      if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
        return NextResponse.json({ 
          error: 'SSL/TLS-Fehler',
          details: 'Problem mit dem SSL-Zertifikat der Website.'
        }, { status: 503 });
      }
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

function findClassLink(html: string, className: string, baseUrl: string): string | null {
  try {
    // Keep script tags for now to check for JavaScript-based navigation
    const cleanHtml = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Normalize className for comparison (case-insensitive, handle variations)
    const normalizedClassName = className.trim().toLowerCase().replace(/[\s\-_]/g, '');

    // First, check if the class exists in the HTML (as button, link, or text)
    const classExists = new RegExp(normalizedClassName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(cleanHtml);
    
    if (!classExists) {
      console.log(`[findClassLink] Class "${className}" not found in HTML`);
      return null;
    }

    console.log(`[findClassLink] Class "${className}" found in HTML, searching for link or button...`);

    // Filter out invalid links, but ACCEPT V_CL_ links (they are the actual links!)
    const isValidLink = (href: string): boolean => {
      if (!href || href.trim().length === 0) return false;
      // ACCEPT V_CL_ links - these are the actual dynamic links used by Feldbergschule!
      // Reject JavaScript links
      if (href.startsWith('javascript:') || href.startsWith('#')) return false;
      // Reject data URIs
      if (href.startsWith('data:')) return false;
      return true;
    };

    // Try to find buttons/links that contain the class name and extract V_CL_ links
    // Pattern: Look for elements containing the class name, then find nearby V_CL_ links
    const classElementRegex = new RegExp(
      `(<(?:button|a|div|span|li|td)[^>]*>.*?${normalizedClassName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?</(?:button|a|div|span|li|td)>)`,
      'gi'
    );
    let classElementMatch;
    
    while ((classElementMatch = classElementRegex.exec(cleanHtml)) !== null) {
      const elementContent = classElementMatch[1];
      
      // Look for V_CL_ links in or near this element
      // Try to find href attributes or onclick handlers with V_CL_ links
      const vclLinkRegex = /(?:href|onclick|data-[^=]*)=["']([^"']*V_CL_[^"']+)["']/gi;
      let vclMatch;
      
      while ((vclMatch = vclLinkRegex.exec(elementContent)) !== null) {
        const vclHref = vclMatch[1];
        if (isValidLink(vclHref)) {
          let resolvedUrl: string;
          if (vclHref.startsWith('http://') || vclHref.startsWith('https://')) {
            resolvedUrl = vclHref;
          } else if (vclHref.startsWith('/')) {
            // Absolute path from domain root
            const baseDomain = baseUrl.match(/https?:\/\/[^\/]+/)?.[0] || baseUrl;
            resolvedUrl = `${baseDomain}${vclHref}`;
          } else {
            // Relative path - construct from base path
            const basePath = baseUrl.replace(/\/index\.html?$/, '').replace(/\/$/, '');
            resolvedUrl = `${basePath}/${vclHref}`;
          }
          console.log(`[findClassLink] Found V_CL_ link for "${className}": ${resolvedUrl}`);
          return resolvedUrl;
        }
      }
      
      // Also check the surrounding context (next 500 chars) for V_CL_ links
      const contextStart = Math.max(0, classElementMatch.index - 100);
      const contextEnd = Math.min(cleanHtml.length, classElementMatch.index + classElementMatch[0].length + 500);
      const context = cleanHtml.substring(contextStart, contextEnd);
      
      const contextVclRegex = /(?:href|onclick|data-[^=]*)=["']([^"']*V_CL_[^"']+)["']/gi;
      let contextVclMatch;
      
      while ((contextVclMatch = contextVclRegex.exec(context)) !== null) {
        const vclHref = contextVclMatch[1];
        if (isValidLink(vclHref)) {
          let resolvedUrl: string;
          if (vclHref.startsWith('http://') || vclHref.startsWith('https://')) {
            resolvedUrl = vclHref;
          } else if (vclHref.startsWith('/')) {
            // Absolute path from domain root
            const baseDomain = baseUrl.match(/https?:\/\/[^\/]+/)?.[0] || baseUrl;
            resolvedUrl = `${baseDomain}${vclHref}`;
          } else {
            // Relative path - construct from base path
            const basePath = baseUrl.replace(/\/index\.html?$/, '').replace(/\/$/, '');
            resolvedUrl = `${basePath}/${vclHref}`;
          }
          console.log(`[findClassLink] Found V_CL_ link in context for "${className}": ${resolvedUrl}`);
          return resolvedUrl;
        }
      }
    }
    
    // Also search the entire HTML for V_CL_ links and check if they're associated with the class
    const allVclLinksRegex = /(?:href|onclick|data-[^=]*)=["']([^"']*V_CL_[^"']+)["']/gi;
    let allVclMatch;
    const foundVclLinks: string[] = [];
    
    while ((allVclMatch = allVclLinksRegex.exec(cleanHtml)) !== null) {
      const vclHref = allVclMatch[1];
      if (isValidLink(vclHref) && !foundVclLinks.includes(vclHref)) {
        foundVclLinks.push(vclHref);
      }
    }
    
    // If we found V_CL_ links and the class exists, try to find the one associated with the class
    // by checking the surrounding HTML context
    for (const vclLink of foundVclLinks) {
      const linkIndex = cleanHtml.indexOf(vclLink);
      if (linkIndex !== -1) {
        // Check context around the link for the class name
        const contextStart = Math.max(0, linkIndex - 200);
        const contextEnd = Math.min(cleanHtml.length, linkIndex + vclLink.length + 200);
        const linkContext = cleanHtml.substring(contextStart, contextEnd);
        
        if (new RegExp(normalizedClassName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(linkContext)) {
          let resolvedUrl: string;
          if (vclLink.startsWith('http://') || vclLink.startsWith('https://')) {
            resolvedUrl = vclLink;
          } else if (vclLink.startsWith('/')) {
            // Absolute path from domain root
            const baseDomain = baseUrl.match(/https?:\/\/[^\/]+/)?.[0] || baseUrl;
            resolvedUrl = `${baseDomain}${vclLink}`;
          } else {
            // Relative path - construct from base path
            const basePath = baseUrl.replace(/\/index\.html?$/, '').replace(/\/$/, '');
            resolvedUrl = `${basePath}/${vclLink}`;
          }
          console.log(`[findClassLink] Found V_CL_ link associated with "${className}": ${resolvedUrl}`);
          return resolvedUrl;
        }
      }
    }

    // Try multiple patterns to find links
    // Pattern 1: Standard <a> tags - extract all links first, then filter
    const linkRegex1 = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const foundLinks: Array<{ href: string; text: string }> = [];

    while ((match = linkRegex1.exec(cleanHtml)) !== null) {
      const href = match[1];
      const linkText = match[2]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Only consider valid links
      if (isValidLink(href)) {
        foundLinks.push({ href, text: linkText });
      }
    }

    // Now check each found link for class name match
    for (const link of foundLinks) {
      const normalizedLinkText = link.text.toLowerCase().replace(/[\s\-_]/g, '');
      
      // Check if the link text matches the class name (case-insensitive, flexible matching)
      if (normalizedLinkText === normalizedClassName || 
          normalizedLinkText.includes(normalizedClassName) ||
          normalizedClassName.includes(normalizedLinkText)) {
        // Also check if the href itself contains the class name (some sites use it in the URL)
        const normalizedHref = link.href.toLowerCase().replace(/[\s\-_]/g, '');
        if (normalizedHref.includes(normalizedClassName)) {
          // Resolve relative URLs
          let resolvedUrl: string;
          if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
            resolvedUrl = link.href;
          } else if (link.href.startsWith('/')) {
            resolvedUrl = `${baseUrl}${link.href}`;
          } else if (link.href.startsWith('../')) {
            // Handle relative paths like ../12Fo-b/index.html
            const basePath = baseUrl.replace(/\/[^/]*$/, '/');
            resolvedUrl = `${basePath}${link.href.replace(/^\.\.\//, '')}`;
          } else {
            // Relative path from current directory
            const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
            resolvedUrl = `${basePath}${link.href}`;
          }
          
          console.log(`[findClassLink] Found valid link for "${className}": ${resolvedUrl} (text: "${link.text}")`);
          return resolvedUrl;
        }
      }
    }

    // Pattern 2: Look for links where the href contains the class name
    for (const link of foundLinks) {
      const normalizedHref = link.href.toLowerCase().replace(/[\s\-_]/g, '');
      if (normalizedHref.includes(normalizedClassName)) {
        let resolvedUrl: string;
        if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
          resolvedUrl = link.href;
        } else if (link.href.startsWith('/')) {
          resolvedUrl = `${baseUrl}${link.href}`;
        } else if (link.href.startsWith('../')) {
          const basePath = baseUrl.replace(/\/[^/]*$/, '/');
          resolvedUrl = `${basePath}${link.href.replace(/^\.\.\//, '')}`;
        } else {
          const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
          resolvedUrl = `${basePath}${link.href}`;
        }
        
        console.log(`[findClassLink] Found link by href match for "${className}": ${resolvedUrl}`);
        return resolvedUrl;
      }
    }

    // Pattern 3: Since class exists as button, construct URL directly
    // For Feldbergschule, structure is: /klassenvertretungen/12Fo-b/index.html
    const classSlug = className.trim().replace(/\s+/g, '');
    const basePath = baseUrl.replace(/\/index\.html?$/, '');
    const directUrl = `${basePath}/${classSlug}/index.html`;
    
    console.log(`[findClassLink] Class "${className}" exists as button, using direct URL: ${directUrl}`);
    // Return null - let the main function try the direct URL and alternatives
    return null;
  } catch (error) {
    console.error('[findClassLink] Error:', error);
    return null;
  }
}

function parseFeldbergschulePlan(html: string, sourceUrl: string, className: string, isDailyPage = false): SubstitutionEntry[] {
  const entries: SubstitutionEntry[] = [];
  
  try {
    // Remove script and style tags
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Try to find tables (common in substitution plans)
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = cleanHtml.match(tableRegex);

    if (tables) {
      for (const table of tables) {
        // Extract rows
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        const rows = table.match(rowRegex);

        if (rows && rows.length > 1) {
          // Try to identify header row to understand column structure
          const headerRow = rows[0];
          const headerCells: string[] = [];
          const headerCellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
          let headerMatch;
          
          while ((headerMatch = headerCellRegex.exec(headerRow)) !== null) {
            const cellText = headerMatch[1]
              .replace(/<[^>]+>/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            headerCells.push(cellText);
          }

          // Map header columns to indices
          const getColumnIndex = (searchTerms: string[]): number => {
            for (const term of searchTerms) {
              const idx = headerCells.findIndex(h => 
                h.toLowerCase().includes(term.toLowerCase())
              );
              if (idx !== -1) return idx;
            }
            return -1;
          };

          const classIdx = getColumnIndex(['klasse', 'class']);
          const dateIdx = getColumnIndex(['datum', 'date']);
          const posIdx = getColumnIndex(['pos', 'position', 'stunde', 'period']);
          const artIdx = getColumnIndex(['art', 'type', 'beschreibung']);
          const fachIdx = getColumnIndex(['fach', 'subject']);
          const raumIdx = getColumnIndex(['raum', 'room']);
          const originalLehrerIdx = getColumnIndex(['original', 'lehrer', 'teacher']);
          const vertretungsLehrerIdx = getColumnIndex(['vertretung', 'vertretungslehrkraft', 'substitute']);
          const mitteilungIdx = getColumnIndex(['mitteilung', 'message', 'note']);
          const bemerkungIdx = getColumnIndex(['bemerkung', 'remark', 'hinweis']);
          const infoIdx = getColumnIndex(['info']);

          // Process data rows
          let currentDate = '';
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            const cells: string[] = [];
            let match;

            while ((match = cellRegex.exec(row)) !== null) {
              const cellText = match[1]
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
              cells.push(cellText);
            }

            if (cells.length >= 3) {
              // Extract class from row (for daily substitutions page)
              let rowClass = '';
              if (isDailyPage && classIdx >= 0 && classIdx < cells.length) {
                rowClass = cells[classIdx].trim();
                // If class cell is empty, use the last non-empty class (rows can span multiple cells)
                if (!rowClass && entries.length > 0) {
                  rowClass = entries[entries.length - 1].class;
                }
              }
              
              // For daily page: only process rows that match the requested class
              if (isDailyPage && className) {
                const normalizedRowClass = rowClass.toLowerCase().replace(/[\s\-_]/g, '');
                const normalizedRequestedClass = className.toLowerCase().replace(/[\s\-_]/g, '');
                
                // Skip if class doesn't match (and rowClass is not empty)
                if (rowClass && normalizedRowClass !== normalizedRequestedClass && 
                    !normalizedRowClass.includes(normalizedRequestedClass) &&
                    !normalizedRequestedClass.includes(normalizedRowClass)) {
                  continue; // Skip this row
                }
              }
              
              // Extract date (use current date if cell is empty)
              const dateCell = dateIdx >= 0 && dateIdx < cells.length ? cells[dateIdx] : '';
              if (dateCell && dateCell.trim()) {
                currentDate = parseDate(dateCell) || dateCell;
              }
              
              // Extract period (Pos)
              const period = posIdx >= 0 && posIdx < cells.length ? cells[posIdx].trim() : '';
              
              // Extract subject (Fach)
              const subject = fachIdx >= 0 && fachIdx < cells.length ? cells[fachIdx].trim() : '';
              
              // Extract room (Raum)
              const room = raumIdx >= 0 && raumIdx < cells.length ? cells[raumIdx].trim() : '';
              
              // Extract original teacher
              const originalTeacher = originalLehrerIdx >= 0 && originalLehrerIdx < cells.length 
                ? cells[originalLehrerIdx].trim() 
                : undefined;
              
              // Extract substitute teacher
              const substituteTeacher = vertretungsLehrerIdx >= 0 && vertretungsLehrerIdx < cells.length 
                ? cells[vertretungsLehrerIdx].trim() 
                : undefined;
              
              // Extract note/message
              const art = artIdx >= 0 && artIdx < cells.length ? cells[artIdx].trim() : '';
              const mitteilung = mitteilungIdx >= 0 && mitteilungIdx < cells.length ? cells[mitteilungIdx].trim() : '';
              const bemerkung = bemerkungIdx >= 0 && bemerkungIdx < cells.length ? cells[bemerkungIdx].trim() : '';
              const info = infoIdx >= 0 && infoIdx < cells.length ? cells[infoIdx].trim() : '';
              
              const note = [art, mitteilung, bemerkung, info].filter(Boolean).join(' | ').trim() || undefined;

              // Only add if it has meaningful data (period, subject, or substitute teacher)
              if (period || subject || substituteTeacher) {
                const entry: SubstitutionEntry = {
                  id: `${sourceUrl}-${i}-${Date.now()}`,
                  date: currentDate || new Date().toISOString().split('T')[0],
                  class: isDailyPage ? (rowClass || className) : (className || ''),
                  period: period,
                  subject: subject,
                  originalTeacher: originalTeacher || undefined,
                  substituteTeacher: substituteTeacher || undefined,
                  room: room || undefined,
                  note: note,
                };

                entries.push(entry);
              }
            }
          }
        }
      }
    }

    // If no tables found, try to find patterns in the text
    if (entries.length === 0) {
      // Look for date patterns (DD.MM.YYYY or DD-MM-YYYY)
      const dateRegex = /(\d{1,2})[.\-](\d{1,2})[.\-](\d{2,4})/g;
      const dates = Array.from(cleanHtml.matchAll(dateRegex));
      
      // Look for period patterns (1. Stunde, 2. Std, etc.)
      const periodRegex = /(\d+)\.?\s*(?:Stunde|Std\.?)/gi;
      const periods = Array.from(cleanHtml.matchAll(periodRegex));
      
      // Look for subject abbreviations (common German subjects)
      const subjectRegex = /\b([A-Z]{2,5})\b/g; // 2-5 letter abbreviations like "D", "E", "M", "PH", "CH", etc.
      const subjects = Array.from(cleanHtml.matchAll(subjectRegex));

      // Create entries from found patterns
      if (dates.length > 0 || periods.length > 0) {
        const maxLength = Math.max(dates.length, periods.length, subjects.length || 1);
        for (let i = 0; i < maxLength; i++) {
          const dateMatch = dates[i];
          const periodMatch = periods[i];
          const subjectMatch = subjects[i];
          
          if (dateMatch || periodMatch) {
            let dateStr = new Date().toISOString().split('T')[0];
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0');
              const month = dateMatch[2].padStart(2, '0');
              const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
              dateStr = `${year}-${month}-${day}`;
            }

            entries.push({
              id: `${sourceUrl}-text-${i}-${Date.now()}`,
              date: dateStr,
              class: className || '',
              period: periodMatch?.[1] || '',
              subject: subjectMatch?.[1] || '',
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[parseFeldbergschulePlan] Error:', error);
  }

  return entries;
}

function parseDate(dateString: string): string | null {
  try {
    // Try common German date formats: DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
    const formats = [
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // DD.MM.YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/,    // DD-MM-YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      }
    }

    // Try to parse as ISO date
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split('T')[0];
    }

    return null;
  } catch {
    return null;
  }
}

