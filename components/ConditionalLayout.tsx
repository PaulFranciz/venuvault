"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/layout/Footer";
import SyncUserWithConvex from "@/components/SyncUserWithConvex";
import PrefetchManager from "@/components/PrefetchManager";
import ReservationBanner from "@/components/ReservationBanner";
import { Toaster } from "sonner";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/seller');

  return (
    <>
      {!isDashboard && <Header />}
      <SyncUserWithConvex />
      <PrefetchManager />
      {children}
      {!isDashboard && <Footer />}
      <ReservationBanner />
      <Toaster richColors closeButton position="top-right" />
    </>
  );
} 