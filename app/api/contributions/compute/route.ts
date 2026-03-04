import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeContributions } from "@/lib/services/contribution.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const salary = parseFloat(body.monthlySalary);

  if (isNaN(salary) || salary <= 0) {
    return NextResponse.json({ error: "Invalid salary amount" }, { status: 400 });
  }

  const result = computeContributions(salary);
  return NextResponse.json({ success: true, data: result });
}
