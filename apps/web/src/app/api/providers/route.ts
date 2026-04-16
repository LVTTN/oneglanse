import { readProviderConnectionsState } from "@/lib/provider-connections/server";
import {
	resetProviderAuthData,
	spawnProviderAuthLogin,
} from "@oneglanse/services";
import { AUTH_PROVIDER_LIST } from "@oneglanse/types";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const connectProviderSchema = z.object({
	provider: z.enum(AUTH_PROVIDER_LIST),
	action: z.enum(["connect", "refresh"]).default("connect"),
});

export async function GET() {
	return NextResponse.json(await readProviderConnectionsState());
}

export async function POST(request: Request) {
	try {
		const payload = connectProviderSchema.parse(await request.json());
		void payload.action;
		return NextResponse.json(await spawnProviderAuthLogin(payload.provider));
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Invalid request",
			},
			{ status: 400 },
		);
	}
}

export async function DELETE() {
	try {
		await Promise.all(
			AUTH_PROVIDER_LIST.map((provider) => resetProviderAuthData(provider)),
		);
		return NextResponse.json({ ok: true });
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to reset providers",
			},
			{ status: 500 },
		);
	}
}
