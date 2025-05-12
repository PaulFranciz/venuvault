import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import SyncUserWithConvex from "@/components/SyncUserWithConvex";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "@/components/AppProviders";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "EventPulse - Your Ultimate Event Management Platform",
  description: "Discover, create, and manage events with ease. EventPulse offers seamless ticketing, analytics, and engagement tools for organizers and attendees.",
  // Add more specific metadata like open graph tags, icons, etc.
  icons: {
    icon: "/favicon.ico", // Make sure you have a favicon.ico in your public folder
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
        <AppProviders>
          <Header />
          <SyncUserWithConvex />
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
