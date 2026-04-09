import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "ol/ol.css";
import "yet-another-react-lightbox/styles.css";

export const metadata: Metadata = {
  title: "Realty Minibus",
  description: "Minsk rental monitor in 300-450 USD range"
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
