import { NextResponse } from "next/server";

function unavailable() {
  return NextResponse.json(
    {
      error:
        "Temporarily unavailable during SQL migration. This endpoint is being moved off MongoDB.",
    },
    { status: 503 }
  );
}

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}

export async function PUT() {
  return unavailable();
}

export async function PATCH() {
  return unavailable();
}

export async function DELETE() {
  return unavailable();
}
