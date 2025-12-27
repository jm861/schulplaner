# UI System Quickstart

Apple-like Design System für Schulplaner - basierend auf Apple Human Interface Guidelines.

## Design Tokens

Alle Design-Tokens sind in `src/lib/design-tokens.ts` definiert:

- **Spacing**: 8px Base Unit (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24)
- **Radius**: `sm` (8px), `md` (12px), `lg` (16px), `xl` (24px), `2xl` (32px), `3xl` (40px)
- **Shadows**: Light & Dark Mode Varianten (`sm`, `md`, `lg`, `xl`, `2xl`)
- **Elevation**: `base`, `card`, `raised`, `overlay`, `modal`, `toast`
- **Motion**: Durations (90ms-400ms), Easing Curves, Spring Configs
- **Typography**: SF Pro Text Font Family, Size Scale, Weights
- **Colors**: Apple-like Grays + Accent Blue (#007aff)

## Komponenten

### Core UI Components (`src/components/ui/`)

#### Card
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card variant="default" interactive>
  <CardHeader>
    <CardTitle>Titel</CardTitle>
    <CardDescription>Beschreibung</CardDescription>
  </CardHeader>
  <CardContent>Inhalt</CardContent>
</Card>
```

**Variants**: `default`, `elevated`, `outlined`  
**Props**: `interactive` (für hover/tap effects)

#### ListRow
```tsx
import { ListRow } from '@/components/ui/list-row';

<ListRow
  leading={<Icon />}
  trailing={<Badge />}
  subtitle="Untertitel"
  interactive
  selected
>
  Hauptinhalt
</ListRow>
```

#### Button
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="md" loading>
  Klick mich
</Button>
```

**Variants**: `default`, `secondary`, `outline`, `ghost`, `destructive`  
**Sizes**: `sm`, `md`, `lg`, `icon`

#### Sheet (Bottom Sheet / Side Sheet)
```tsx
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetClose } from '@/components/ui/sheet';

<Sheet open={isOpen} onOpenChange={setIsOpen} side="bottom" size="md">
  <SheetHeader>
    <SheetTitle>Titel</SheetTitle>
  </SheetHeader>
  <SheetContent>Inhalt</SheetContent>
  <SheetClose />
</Sheet>
```

**Sides**: `top`, `right`, `bottom`, `left`  
**Sizes**: `sm`, `md`, `lg`, `xl`, `full`

#### Modal
```tsx
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalClose } from '@/components/ui/modal';

<Modal open={isOpen} onOpenChange={setIsOpen} size="md">
  <ModalHeader>
    <ModalTitle>Titel</ModalTitle>
  </ModalHeader>
  <ModalContent>Inhalt</ModalContent>
  <ModalClose />
</Modal>
```

#### EmptyState
```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState
  icon={<Icon />}
  title="Keine Daten"
  description="Beschreibung"
  action={<Button>Aktion</Button>}
/>
```

#### Skeleton
```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton variant="rectangular" className="h-20 w-full" />
```

**Variants**: `text`, `circular`, `rectangular`

#### SmartLink & ContextBadge
```tsx
import { SmartLink, ContextBadge } from '@/components/ui/smart-link';

<SmartLink
  entity={{ type: 'task', id: '123' }}
  showBadge
>
  Link Text
</SmartLink>

<ContextBadge type="subject" label="Mathematik" />
```

### App Components (`src/components/app/`)

#### Command Palette (⌘K)
Globale Komponente - öffnet sich automatisch mit ⌘K / Ctrl+K.

#### Quick Add Sheet
Schnelles Hinzufügen von Tasks, Notes, Materials mit smarten Defaults.

#### AppShell V2
Responsive Navigation:
- **Desktop**: Sidebar links
- **Mobile**: Bottom Tabbar + Floating Action Button

## Motion Rules

### Dauer
- **Micro**: 90ms (Button taps, toggles)
- **Fast**: 140ms (Quick transitions)
- **Normal**: 200ms (Standard UI transitions)
- **Slow**: 260ms (Complex animations)
- **Slower**: 400ms (Page transitions)

### Easing
- **Standard**: `cubic-bezier(0.4, 0.0, 0.2, 1)` - iOS Standard
- **Decelerate**: `cubic-bezier(0.0, 0.0, 0.2, 1)` - Ease-out
- **Spring**: Für interaktive Elemente (Framer Motion)

### Reduce Motion
Respektiere `prefers-reduced-motion`:
```tsx
const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

## Entity Model

Alle Entities sind in `src/types/entities.ts` definiert:

- **Subject** (Fach)
- **Lesson** (Stunde)
- **Task** (Aufgabe)
- **Note** (Notiz)
- **Material** (Material)
- **Exam** (Klausur)
- **Teacher** (Lehrer)

### Deep Linking

```tsx
import { generateDeepLink, parseDeepLink } from '@/types/entities';

// Generate
const link = generateDeepLink({ type: 'task', id: '123', params: { view: 'detail' } });
// → "/tasks/123?view=detail"

// Parse
const entity = parseDeepLink('/tasks/123?view=detail');
// → { type: 'task', id: '123', params: { view: 'detail' } }
```

## State Management (Zustand)

Store in `src/store/app-store.ts`:

```tsx
import { useAppStore } from '@/store/app-store';

const { tasks, addTask, updateTask } = useAppStore();
```

**Features**:
- Persistiert in localStorage
- DevTools Support
- Selectors für computed values
- Cascade Deletes (z.B. Subject löschen → alle Tasks löschen)

## Patterns

### 1. Context Links
Jede Entity-Seite sollte Links zu verwandten Entities haben:
- Task → Subject, Lesson, Note, Material
- Lesson → Subject, Tasks, Notes, Materials
- Subject → Lessons, Tasks, Notes, Materials, Exams

### 2. Smart Defaults
Beim Erstellen neuer Entities:
- Aktuelles Fach ausgewählter Lesson
- Aktuelle Zeit für neue Tasks
- Nächstes Fach für neue Notes

### 3. Sheet-based Interactions
Verwende Sheets statt harter Page-Wechsel:
- Quick Add → Sheet
- Entity Details → Sheet
- Filter/Search → Sheet

### 4. Empty States
Jede Liste sollte ein EmptyState haben mit:
- Icon
- Titel
- Beschreibung
- Optional: Call-to-Action Button

## Accessibility

- **Keyboard Navigation**: Alle interaktiven Elemente sind per Tastatur erreichbar
- **ARIA Labels**: Radix UI Komponenten haben ARIA Support
- **Focus Trap**: Modals/Sheets fangen Focus ein
- **Focus Visible**: Klare Focus-Indikatoren
- **Contrast**: WCAG AA konform

## Performance

- **Code Splitting**: Route-level (Next.js App Router)
- **Memoization**: `useMemo` für computed values
- **Lazy Loading**: Sheets/Modals nur bei Bedarf rendern
- **Optimistic Updates**: UI sofort aktualisieren, dann sync

## Nächste Schritte

1. ✅ Design Tokens System
2. ✅ Core UI Components
3. ✅ Entity Model & Store
4. ✅ Command Palette
5. ✅ Quick Add Sheet
6. ✅ AppShell V2
7. ⏳ Dashboard mit Context Links
8. ⏳ Tasks Page Migration
9. ⏳ Calendar/Timetable mit Sheets
10. ⏳ Notes & Materials Pages
11. ⏳ Toast System
12. ⏳ Search & Filter Components

## Verwendung

### Neue Seite erstellen

```tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';

export default function MyPage() {
  const { tasks } = useAppStore();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meine Seite</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Inhalt */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Entity hinzufügen

```tsx
const { addTask } = useAppStore();

addTask({
  title: 'Neue Aufgabe',
  priority: 'high',
  status: 'todo',
  subjectId: '123',
  subjectName: 'Mathematik',
});
```

### Deep Link verwenden

```tsx
import { SmartLink } from '@/components/ui/smart-link';

<SmartLink entity={{ type: 'task', id: task.id }} showBadge>
  {task.title}
</SmartLink>
```

