import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reportes",
  description: "Sistema de reportes internos CityMall",
  icons: {
    icon: '/citymall-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
