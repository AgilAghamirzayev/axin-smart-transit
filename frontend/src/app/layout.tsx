import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata: Metadata = { title: 'Axın — Smart Transit Bakı', description: 'Bakı üçün ağıllı nəqliyyat və sərnişin bildirişləri platforması.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="az"><body>{children}</body></html>;
}
