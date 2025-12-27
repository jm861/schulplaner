/**
 * Command Palette Component (⌘K)
 * DEPRECATED: Use SearchFilter instead
 * Kept for backwards compatibility - redirects to SearchFilter
 */

'use client';

import { SearchFilter } from './search-filter';

export function CommandPalette() {
  // Redirect to SearchFilter for backwards compatibility
  return <SearchFilter />;
}
