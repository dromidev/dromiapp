import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dromi - Rastreo de buses en tiempo real",
  description:
    "Rastrea la ubicación exacta de tu bus intermunicipal en tiempo real. Sin más esperas innecesarias, planifica tu viaje con confianza.",
  icons: {
    icon: [
      {
        rel: "icon",
        url: "/dromi-favicon.ico",
        type: "image/x-icon",
        media: "(prefers-color-scheme: light)",
      },
      {
        rel: "icon",
        url: "/dromi-favicon-white.ico",
        type: "image/x-icon",
        media: "(prefers-color-scheme: dark)",
      },
      {
        rel: "icon",
        url: "/dromi-favicon.ico",
        type: "image/x-icon",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
