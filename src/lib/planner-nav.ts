import { PlannerNavItem } from '@/components/layout/planner-shell';

export const buildPlannerNavItems = (
  t: (key: string) => string,
  options?: { isAdmin?: boolean; isOperator?: boolean }
): PlannerNavItem[] => {
  const items: PlannerNavItem[] = [
    { href: '/', label: t('nav.home') },
    { href: '/calendar', label: t('nav.calendar'), badge: t('planner.now') },
    { href: '/tasks', label: t('nav.tasks') },
    { href: '/exams', label: t('nav.exams') },
    { href: '/study-plan', label: t('nav.studyPlan') },
    { href: '/substitution-plan', label: t('nav.substitutionPlan') },
    { href: '/materials', label: t('nav.materials') },
    { href: '/chat', label: t('nav.chat') },
    { href: '/settings', label: t('nav.settings') },
  ];

  // Add admin link if user is admin or operator
  if (options?.isAdmin || options?.isOperator) {
    items.push({ href: '/admin', label: t('nav.admin') });
  }

  return items;
};

