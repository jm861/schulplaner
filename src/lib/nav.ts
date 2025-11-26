export type NavLink = {
  href: string;
  labelKey: string;
  descriptionKey: string;
};

export const navLinks: NavLink[] = [
  { href: '/', labelKey: 'nav.home', descriptionKey: 'nav.homeDesc' },
  { href: '/calendar', labelKey: 'nav.calendar', descriptionKey: 'nav.calendarDesc' },
  { href: '/tasks', labelKey: 'nav.tasks', descriptionKey: 'nav.tasksDesc' },
  { href: '/exams', labelKey: 'nav.exams', descriptionKey: 'nav.examsDesc' },
  { href: '/study-plan', labelKey: 'nav.studyPlan', descriptionKey: 'nav.studyPlanDesc' },
  { href: '/substitution-plan', labelKey: 'nav.substitutionPlan', descriptionKey: 'nav.substitutionPlanDesc' },
  { href: '/materials', labelKey: 'nav.materials', descriptionKey: 'nav.materialsDesc' },
  { href: '/chat', labelKey: 'nav.chat', descriptionKey: 'nav.chatDesc' },
  { href: '/settings', labelKey: 'nav.settings', descriptionKey: 'nav.settingsDesc' },
];

