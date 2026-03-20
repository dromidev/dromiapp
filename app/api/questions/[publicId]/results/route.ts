import { NextResponse } from "next/server";
import { getPublicQuestionProjection } from "@/lib/vote-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params;
  const data = await getPublicQuestionProjection(publicId);
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
