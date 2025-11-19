# Schulplaner - School Planner App

A modern, AI-powered school planner web application built with Next.js, TypeScript, and Tailwind CSS. Help students plan their daily life with class schedules, tasks, exams, and AI-assisted study planning.

## Features

- 📅 **Weekly Calendar View** - Visualize your entire week with classes, tasks, and exams
- ✅ **Task Management** - Create and track homework with priorities and due dates
- 📝 **Exam Planning** - Plan exams with topics and AI-generated summaries
- 📚 **Study Plan** - AI-powered weekly study plan generation
- 🎨 **Dark Mode** - Full dark mode support with system preference detection
- 🌍 **Multi-language** - English and German (Deutsch) support
- 🔐 **User Authentication** - Login and registration system
- 👤 **User Profiles** - Personalized settings and preferences
- 🤖 **AI Integration** - OpenAI integration for homework summaries and study plans

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma with SQLite
- **AI**: OpenAI API
- **State Management**: React Hooks + localStorage
- **Authentication**: Custom auth context with localStorage

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jm861/schulplaner.git
cd schulplaner
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-openai-api-key-here"  # Optional
```

4. Initialize the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

- **Admin**: `admin@schulplaner.de` / `admin123`
- **Student**: `student@schulplaner.de` / `student123`

## Project Structure

```
schulplaner/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js app router pages
│   │   ├── api/              # API routes
│   │   ├── calendar/         # Calendar page
│   │   ├── exams/            # Exams page
│   │   ├── login/            # Login page
│   │   ├── register/         # Registration page
│   │   ├── settings/         # Settings page
│   │   ├── study-plan/       # Study plan page
│   │   └── tasks/            # Tasks page
│   ├── components/           # React components
│   │   ├── ai/              # AI-related components
│   │   ├── auth/            # Authentication components
│   │   ├── layout/          # Layout components
│   │   ├── navigation/      # Navigation components
│   │   ├── schedule/        # Schedule components
│   │   ├── study-plan/      # Study plan components
│   │   ├── theme/           # Theme components
│   │   └── ui/              # UI components
│   ├── contexts/             # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   └── styles/              # Global styles
└── public/                  # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `DATABASE_URL` (for production database)
   - `OPENAI_API_KEY` (optional)
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify
- DigitalOcean App Platform

Make sure to:
- Set up a production database (PostgreSQL recommended)
- Configure environment variables
- Run database migrations before deployment

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | No |

## Features in Detail

### Calendar
- Weekly view with Monday-Sunday
- Toggle weekends on/off
- Add tasks and exams directly from calendar
- Edit and delete items inline
- German date formatting

### Tasks
- Create tasks with title, subject, due date, and priority
- Mark tasks as done
- Sort by due date automatically
- localStorage persistence

### Exams
- Plan exams with subject, date, topics, and notes
- AI-generated exam summaries
- Sort by exam date

### Study Plan
- Weekly study plan slots
- AI-powered study plan generation
- Demo data option for new users
- Editable weekly blueprint

### Settings
- Profile management
- Theme toggle (Light/Dark/System)
- Language selection (English/German)
- Notification preferences
- AI assistant preferences
- Account management and logout

## Development

### Adding New Features

1. Create components in `src/components/`
2. Add pages in `src/app/`
3. Create hooks in `src/hooks/` for reusable logic
4. Add translations in `src/lib/i18n.ts`
5. Update navigation in `src/lib/nav.ts` if needed

### Database Changes

1. Update `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Update Prisma client: `npm run prisma:generate`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Commit and push
5. Create a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and TypeScript
