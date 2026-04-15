"use client";

import { api } from "@/trpc/react";
import { PROVIDER_LIST, type Provider } from "@oneglanse/types";
import { ProviderRunStatusCard, toast } from "@oneglanse/ui";
import { useEffect, useMemo, useRef, useState } from "react";

type ProviderState = "pending" | "running" | "completed" | "failed" | "stopped";

type ProviderProgressResponse = {
	updateId?: number;
	providers?: Record<string, ProviderState>;
};

type DisplayPhase = "running" | "completed" | "failed" | "stopped";

const PROVIDER_RUN_TOAST_ID = "provider-run-progress";
const COMPLETION_TOAST_DURATION_MS = 1400;

function ProviderRunToastCard({
	provider,
	phase,
	workspaceId,
	jobId,
}: {
	provider: Provider;
	phase: DisplayPhase;
	workspaceId: string;
	jobId: string;
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
		/>
	);
}

function showProviderToast(args: {
	provider: Provider;
	phase: DisplayPhase;
	workspaceId: string;
	jobId: string;
}) {
	toast.dismiss();
	toast.custom(
		() => (
			<ProviderRunToastCard
				provider={args.provider}
				phase={args.phase}
				workspaceId={args.workspaceId}
				jobId={args.jobId}
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
	const displayRef = useRef<{ provider: Provider; phase: DisplayPhase } | null>(
		null,
	);

	const parsed = useMemo(() => {
		const data = response as ProviderProgressResponse | null | undefined;
		return {
			updateId: data?.updateId ?? 0,
			providers: (data?.providers ?? {}) as Record<string, ProviderState>,
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
			displayRef.current = {
				provider: currentDisplay.provider,
				phase: nextPhase,
			};
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
					displayRef.current = {
						provider: nextRunningProvider,
						phase: "running",
					};
					if (jobId) {
						showProviderToast({
							provider: nextRunningProvider,
							phase: "running",
							workspaceId,
							jobId,
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

		if (
			currentDisplay?.provider === nextRunningProvider &&
			currentDisplay.phase === "running"
		) {
			return;
		}

		if (completionTimerRef.current) {
			clearTimeout(completionTimerRef.current);
			completionTimerRef.current = null;
		}

		displayRef.current = {
			provider: nextRunningProvider,
			phase: "running",
		};
		if (jobId) {
			showProviderToast({
				provider: nextRunningProvider,
				phase: "running",
				workspaceId,
				jobId,
			});
		}
	}, [active, jobId, parsed.providers, workspaceId]);
}
