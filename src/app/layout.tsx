import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Schulplaner",
    template: "%s | Schulplaner",
  },
  description: "Plan classes, tasks, exams, and study sessions with AI support.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ProtectedRoute>
                <AppShell>{children}</AppShell>
              </ProtectedRoute>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
