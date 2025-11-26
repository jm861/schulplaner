# Vercel-Konfiguration für Vertretungsplan

## Überprüfung der Vercel-Logs

Wenn der Fehler "Website konnte nicht erreicht werden" auftritt:

1. **Gehe zu deinem Vercel-Dashboard**: https://vercel.com/dashboard
2. **Wähle dein Projekt**: `schulplaner`
4. **Klicke auf "Functions"** oder **"Logs"**
5. **Suche nach**: `[fetch-substitution-plan]`

Die Logs zeigen dir:
- Welche URL versucht wurde
- Den genauen Fehler (z.B. ECONNREFUSED, ENOTFOUND, timeout)
- Ob die Website die Anfrage blockiert

## Mögliche Probleme und Lösungen

### Problem 1: Website blockiert Vercel-Server
**Symptom**: ECONNREFUSED oder 403 Forbidden in den Logs

**Lösung**: Die Website könnte Vercel's IP-Adressen blockieren. In diesem Fall müssten wir einen Proxy verwenden oder die Anfrage anders strukturieren.

### Problem 2: SSL/TLS-Fehler
**Symptom**: Certificate oder SSL-Fehler in den Logs

**Lösung**: Die Website hat möglicherweise ein ungültiges oder selbst-signiertes Zertifikat.

### Problem 3: Timeout
**Symptom**: AbortError oder timeout in den Logs

**Lösung**: Die Website antwortet zu langsam. Wir könnten das Timeout erhöhen.

## Keine zusätzlichen Vercel-Konfigurationen nötig

✅ **Vercel erlaubt standardmäßig externe HTTP-Requests** - es sind keine zusätzlichen Konfigurationen in den Vercel-Einstellungen nötig.

Die API-Route verwendet:
- `runtime: 'nodejs'` - für volle Node.js-Funktionalität
- `maxDuration: 30` - 30 Sekunden Timeout
- Standard `fetch()` API - sollte ohne Probleme funktionieren

## Nächste Schritte

1. **Überprüfe die Vercel-Logs** (siehe oben)
2. **Teile mir die Fehlermeldung aus den Logs mit**
3. Dann kann ich den Parser entsprechend anpassen


