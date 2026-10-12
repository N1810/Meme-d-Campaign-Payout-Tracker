import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: "Meme'd - Creator Campaign Payout Tracker",
  description:
    'A high-performance creator marketplace and automated milestone payout engine with atomic budget protection.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>© 2026 Meme&apos;d Campaign Payout Tracker. Built with atomic ACID budget protection.</p>
              <div className="flex items-center gap-4 text-slate-400">
                <span>Integer Paise Accounting</span>
                <span>•</span>
                <span>MongoDB Replica Set Transactions</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
