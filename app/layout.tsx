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
  title: "RepRecall",
  description: "Simplifying the way gym-goers log and track their workouts",
  applicationName: "RepRecall",
  keywords: ["gym", "workout tracker", "fitness", "QR code", "weight training"],
  authors: [{ name: "RepRecall" }],
  openGraph: {
    title: "RepRecall",
    description: "Simplifying the way gym-goers log and track their workouts",
    type: "website",
    url: "https://rep-recall.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}