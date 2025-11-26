export type MaterialRecord = {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  text: string;
  sourceType: 'pdf' | 'image';
  originalName?: string;
  meta?: {
    pageCount?: number;
    charCount?: number;
    lang?: string;
  };
  createdAt: string;
  summary?: string;
};


