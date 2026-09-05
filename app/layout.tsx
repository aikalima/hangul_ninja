import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Hangul Ninja — The Dojo',
  description:
    'Learn your first Hangul stroke in a lantern-lit WebXR dojo. Play on desktop or enter VR with Meta Quest.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
