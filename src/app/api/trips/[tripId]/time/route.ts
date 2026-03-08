import { NextRequest, NextResponse } from "next/server";
import  db  from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { seconds } = body;

    if (!seconds || typeof seconds !== "number") {
      return NextResponse.json({ error: "Segundos inválidos" }, { status: 400 });
    }

    await db.query(`
      UPDATE trips 
      SET planning_time_seconds = planning_time_seconds + $1
      WHERE trip_id = $2
    `, [seconds, params.tripId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
