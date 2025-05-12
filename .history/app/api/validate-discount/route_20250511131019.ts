import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const eventId = searchParams.get("eventId");

  if (!code || !eventId) {
    return NextResponse.json(
      { message: "Code and eventId are required" },
      { status: 400 }
    );
  }

  try {
    const convex = getConvexClient();
    
    const result = await convex.query(api.discountCodes.validateCode, {
      code,
      eventId,
    });

    if (result.isValid) {
      return NextResponse.json({
        isValid: true,
        code: result.code,
        discountType: result.discountType,
        discountAmount: result.discountAmount,
        ticketTypeIds: result.ticketTypeIds || undefined,
      });
    } else {
      return NextResponse.json({
        isValid: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Error validating discount code:", error);
    return NextResponse.json(
      { message: "Failed to validate discount code" },
      { status: 500 }
    );
  }
} 