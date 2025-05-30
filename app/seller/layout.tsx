import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SellerRouteGuard from "@/components/seller/SellerRouteGuard";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <SellerRouteGuard>
        {children}
      </SellerRouteGuard>
    </div>
  );
}
