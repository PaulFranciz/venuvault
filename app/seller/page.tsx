import SellerDashboard from "@/components/SellerDashboard";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SellerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  // Access control is now handled by the SellerRouteGuard component in the layout
  // This prevents the server error from the Convex query
  return (
    <div className="min-h-screen bg-gray-50">
      <SellerDashboard />
    </div>
  );
}
