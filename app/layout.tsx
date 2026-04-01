import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScanSet",
  description: "Scan. Log. Repeat.",
  applicationName: "ScanSet",
  keywords: ["gym", "workout tracker", "fitness", "QR code", "weight training"],
  authors: [{ name: "ScanSet" }],
  manifest: "/manifest.json",
  themeColor: "#C23B0A",
  other: {
    "mobile-web-app-capable": "yes",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ScanSet",
  },
  openGraph: {
    title: "ScanSet",
    description: "Scan. Log. Repeat.",
    type: "website",
    url: "https://scanset.app",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#080808" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}