import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import SyncUserWithConvex from "@/components/SyncUserWithConvex";
import { Toaster } from "@/components/ui/toaster";

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

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
        <ClerkProvider>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <Header />
            <SyncUserWithConvex />
            {children}
            <Toaster />
          </ConvexProviderWithClerk>
        </ClerkProvider>
      </body>
    </html>
  );
}
