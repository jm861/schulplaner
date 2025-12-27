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

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'home',
        label: 'Zum Dashboard',
        icon: <Home className="h-4 w-4" />,
        action: () => {
          router.push('/');
          closeCommandPalette();
        },
        keywords: ['home', 'dashboard', 'start'],
        category: 'Navigation',
      },
      {
        id: 'tasks',
        label: 'Aufgaben',
        icon: <CheckSquare className="h-4 w-4" />,
        action: () => {
          router.push('/tasks');
          closeCommandPalette();
        },
        keywords: ['tasks', 'aufgaben', 'todo'],
        category: 'Navigation',
      },
      {
        id: 'calendar',
        label: 'Kalender',
        icon: <Calendar className="h-4 w-4" />,
        action: () => {
          router.push('/calendar');
          closeCommandPalette();
        },
        keywords: ['calendar', 'kalender', 'schedule'],
        category: 'Navigation',
      },
      {
        id: 'materials',
        label: 'Materialien',
        icon: <FileText className="h-4 w-4" />,
        action: () => {
          router.push('/materials');
          closeCommandPalette();
        },
        keywords: ['materials', 'materialien', 'files'],
        category: 'Navigation',
      },
      {
        id: 'notes',
        label: 'Notizen',
        icon: <BookOpen className="h-4 w-4" />,
        action: () => {
          router.push('/notes');
          closeCommandPalette();
        },
        keywords: ['notes', 'notizen'],
        category: 'Navigation',
      },
      {
        id: 'settings',
        label: 'Einstellungen',
        icon: <Settings className="h-4 w-4" />,
        action: () => {
          router.push('/settings');
          closeCommandPalette();
        },
        keywords: ['settings', 'einstellungen', 'preferences'],
        category: 'Navigation',
      },
      {
        id: 'add-task',
        label: 'Aufgabe hinzufügen',
        icon: <CheckSquare className="h-4 w-4" />,
        action: () => {
          openQuickAdd('task');
          closeCommandPalette();
        },
        keywords: ['add', 'task', 'aufgabe', 'neu'],
        category: 'Aktionen',
      },
      {
        id: 'add-note',
        label: 'Notiz hinzufügen',
        icon: <FileText className="h-4 w-4" />,
        action: () => {
          openQuickAdd('note');
          closeCommandPalette();
        },
        keywords: ['add', 'note', 'notiz', 'neu'],
        category: 'Aktionen',
      },
      {
        id: 'add-material',
        label: 'Material hinzufügen',
        icon: <BookOpen className="h-4 w-4" />,
        action: () => {
          openQuickAdd('material');
          closeCommandPalette();
        },
        keywords: ['add', 'material', 'neu'],
        category: 'Aktionen',
      },
    ],
    [router, closeCommandPalette, openQuickAdd]
  );

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const query = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.keywords.some((kw) => kw.toLowerCase().includes(query))
    );
  }, [commands, search]);

  // Keyboard navigation
  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, filteredCommands, selectedIndex, closeCommandPalette]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Global ⌘K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useAppStore.getState().openCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  return (
    <Sheet open={isCommandPaletteOpen} onOpenChange={closeCommandPalette} side="top" size="lg">
      <SheetHeader>
        <SheetTitle>Befehlspalette</SheetTitle>
      </SheetHeader>
      <SheetContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Befehl suchen..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              autoFocus
            />
          </div>

          {/* Commands List */}
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {category}
                </h3>
                <div className="space-y-1">
                  {cmds.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <ListRow
                        key={cmd.id}
                        leading={cmd.icon}
                        interactive
                        selected={isSelected}
                        onClick={cmd.action}
                        className={cn(
                          'cursor-pointer',
                          isSelected && 'bg-blue-50 dark:bg-blue-950/30'
                        )}
                      >
                        {cmd.label}
                      </ListRow>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Keine Ergebnisse gefunden
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

