"use client";

import { api } from "@/trpc/react";
import { PROVIDER_LIST, type Provider } from "@oneglanse/types";
import { ProviderRunStatusCard, toast } from "@oneglanse/ui";
import { useEffect, useMemo, useRef, useState } from "react";

type ProviderState = "pending" | "running" | "completed" | "failed" | "stopped";

type ProviderProgressResponse = {
	updateId?: number;
	providers?: Record<string, ProviderState>;
	results?: Record<string, number>;
	stats?: { totalPrompts?: number };
};

type DisplayPhase = "running" | "completed" | "failed" | "stopped";

const PROVIDER_RUN_TOAST_ID = "provider-run-progress";
const COMPLETION_TOAST_DURATION_MS = 1400;

function ProviderRunToastCard({
	provider,
	phase,
	workspaceId,
	jobId,
	promptNumber,
	totalPrompts,
}: {
	provider: Provider;
	phase: DisplayPhase;
	workspaceId: string;
	jobId: string;
	promptNumber?: number;
	totalPrompts?: number;
}) {
	const [isStopping, setIsStopping] = useState(false);
	const stopProviderMutation = api.agent.stopProvider.useMutation();

	const handleStop = async () => {
		if (isStopping) return;
		setIsStopping(true);
		try {
			await stopProviderMutation.mutateAsync({
				workspaceId,
				jobId,
				provider,
			});
		} finally {
			setIsStopping(false);
		}
	};

	return (
		<ProviderRunStatusCard
			provider={provider}
			phase={phase}
			onStop={phase === "running" ? handleStop : undefined}
			isStopping={isStopping}
			promptNumber={promptNumber}
			totalPrompts={totalPrompts}
		/>
	);
}

function showProviderToast(args: {
	provider: Provider;
	phase: DisplayPhase;
	workspaceId: string;
	jobId: string;
	promptNumber?: number;
	totalPrompts?: number;
}) {
	toast.dismiss();
	toast.custom(
		() => (
			<ProviderRunToastCard
				provider={args.provider}
				phase={args.phase}
				workspaceId={args.workspaceId}
				jobId={args.jobId}
				promptNumber={args.promptNumber}
				totalPrompts={args.totalPrompts}
			/>
		),
		{
			id: PROVIDER_RUN_TOAST_ID,
			duration:
				args.phase === "running"
					? Number.POSITIVE_INFINITY
					: COMPLETION_TOAST_DURATION_MS,
		},
	);
}

export function useProviderRunToast(args: {
	active: boolean;
	workspaceId: string;
	jobId: string | null;
	response: unknown;
}) {
	const { active, workspaceId, jobId, response } = args;
	const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const displayRef = useRef<{
		provider: Provider;
		phase: DisplayPhase;
		promptNumber?: number;
	} | null>(null);

	const parsed = useMemo(() => {
		const data = response as ProviderProgressResponse | null | undefined;
		return {
			updateId: data?.updateId ?? 0,
			providers: (data?.providers ?? {}) as Record<string, ProviderState>,
			results: (data?.results ?? {}) as Record<string, number>,
			totalPrompts: data?.stats?.totalPrompts,
		};
	}, [response]);

	useEffect(() => {
		return () => {
			if (completionTimerRef.current) {
				clearTimeout(completionTimerRef.current);
				completionTimerRef.current = null;
			}
			toast.dismiss(PROVIDER_RUN_TOAST_ID);
		};
	}, []);

	useEffect(() => {
		if (!active) {
			if (completionTimerRef.current) {
				clearTimeout(completionTimerRef.current);
				completionTimerRef.current = null;
			}
			displayRef.current = null;
			toast.dismiss(PROVIDER_RUN_TOAST_ID);
			return;
		}

		const providerStates = parsed.providers;
		const { results, totalPrompts } = parsed;
		const runningProviders = PROVIDER_LIST.filter(
			(provider) => providerStates[provider] === "running",
		);
		const currentDisplay = displayRef.current;

		if (
			currentDisplay?.phase === "running" &&
			(providerStates[currentDisplay.provider] === "completed" ||
				providerStates[currentDisplay.provider] === "failed" ||
				providerStates[currentDisplay.provider] === "stopped")
		) {
			const nextPhase =
				providerStates[currentDisplay.provider] === "completed"
					? "completed"
					: providerStates[currentDisplay.provider] === "stopped"
						? "stopped"
						: "failed";
			displayRef.current = { provider: currentDisplay.provider, phase: nextPhase };
			if (jobId) {
				showProviderToast({
					provider: currentDisplay.provider,
					phase: nextPhase,
					workspaceId,
					jobId,
				});
			}

			if (completionTimerRef.current) {
				clearTimeout(completionTimerRef.current);
			}
			completionTimerRef.current = setTimeout(() => {
				completionTimerRef.current = null;
				const nextRunningProvider = PROVIDER_LIST.find(
					(provider) => providerStates[provider] === "running",
				);
				if (nextRunningProvider) {
					const promptNumber = (results[nextRunningProvider] ?? 0) + 1;
					displayRef.current = { provider: nextRunningProvider, phase: "running", promptNumber };
					if (jobId) {
						showProviderToast({
							provider: nextRunningProvider,
							phase: "running",
							workspaceId,
							jobId,
							promptNumber,
							totalPrompts,
						});
					}
					return;
				}

				displayRef.current = null;
				toast.dismiss(PROVIDER_RUN_TOAST_ID);
			}, COMPLETION_TOAST_DURATION_MS);
			return;
		}

		if (
			currentDisplay?.phase === "completed" ||
			currentDisplay?.phase === "failed" ||
			currentDisplay?.phase === "stopped"
		) {
			return;
		}

		const nextRunningProvider = runningProviders[0];
		if (!nextRunningProvider) {
			return;
		}

		const promptNumber = (results[nextRunningProvider] ?? 0) + 1;

		if (
			currentDisplay?.provider === nextRunningProvider &&
			currentDisplay.phase === "running" &&
			currentDisplay.promptNumber === promptNumber
		) {
			return;
		}

		if (completionTimerRef.current) {
			clearTimeout(completionTimerRef.current);
			completionTimerRef.current = null;
		}

		displayRef.current = { provider: nextRunningProvider, phase: "running", promptNumber };
		if (jobId) {
			showProviderToast({
				provider: nextRunningProvider,
				phase: "running",
				workspaceId,
				jobId,
				promptNumber,
				totalPrompts,
			});
		}
	}, [active, jobId, parsed.providers, parsed.results, parsed.totalPrompts, workspaceId]);
}
