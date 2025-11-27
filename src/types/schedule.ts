export type ClassEntry = {
  id: string;
  title: string;
  time: string;
  room: string;
  subjectColor: string;
  durationMinutes?: number;
  participants?: string[];
};

export type TaskEntry = {
  id: string;
  title: string;
  subject: string;
  due: string;
  subjectColor: string;
};

export type DayData = {
  id: string;
  date: string;
  classes: ClassEntry[];
  tasks: TaskEntry[];
};


