import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PRJrms | Ekip İçi Mesajlaşma ve Chat-to-Task',
  description: 'Self-hosted Özel Ekip İçi Gerçek Zamanlı Mesajlaşma ve Görev Yönetim Sistemi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="antialiased select-none">{children}</body>
    </html>
  );
}
