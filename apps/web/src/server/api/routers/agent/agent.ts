import { cancelProviderRun, redis } from "@oneglanse/services";
import { PROVIDER_LIST } from "@oneglanse/types";
import { z } from "zod";
import { validWorkspace } from "../../middleware/validWorkspace";
import { createRateLimiter } from "../../middleware/rateLimit";
import {
	authorizedWorkspaceProcedure,
	protectedProcedure,
} from "../../procedures";
import { createTRPCRouter } from "../../trpc";
import { submitAgentRun } from "../_shared/submitAgentRun";

export const agentRouter = createTRPCRouter({
	run: authorizedWorkspaceProcedure
		.use(createRateLimiter("agent.run", { limit: 3, windowSecs: 60 }))
		.mutation(async ({ ctx }) => {
			const {
				user: { id: userId },
				workspaceId,
			} = ctx;

			return submitAgentRun({ workspaceId, userId });
		}),

	status: authorizedWorkspaceProcedure
		.input(z.object({ jobId: z.string() }))
		.output(
			z.object({
				status: z.enum(["pending", "completed"]),
				response: z.unknown(),
			}),
		)
		.query(async ({ input }) => {
			const result = await redis.get(`job:${input.jobId}:result`);

			if (!result) {
				return { status: "pending" as const, response: null };
			}

			const parsed = JSON.parse(result);
			return {
				status: parsed?.status === "completed" ? "completed" : "pending",
				response: parsed,
			};
		}),

	stopProvider: protectedProcedure
		.input(
			z.object({
				workspaceId: z.string(),
				jobId: z.string(),
				provider: z.enum(PROVIDER_LIST),
			}),
		)
		.use(validWorkspace)
		.mutation(async ({ input }) => {
			return cancelProviderRun({
				jobGroupId: input.jobId,
				provider: input.provider,
			});
		}),
});
