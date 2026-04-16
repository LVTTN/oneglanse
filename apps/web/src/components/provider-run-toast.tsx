"use client";

import { api } from "@/trpc/react";
import { PROVIDER_LIST, type Provider } from "@oneglanse/types";
import { ProviderRunStatusCard, toast } from "@oneglanse/ui";
import { getProviderDisplayName } from "@oneglanse/utils";
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
const STOPPED_HANDOFF_DELAY_MS = 350;

export function showDisconnectedProvidersToast(args: {
	disconnectedProviders?: string[];
}) {
	const providers = (args.disconnectedProviders ?? [])
		.filter(Boolean)
		.map((provider) => getProviderDisplayName(provider));
	const description =
		providers.length > 0
			? `Connect at least one provider to continue. Missing: ${providers.join(", ")}.`
			: "Connect at least one provider to continue.";

	toast.error("Providers are not connected.", {
		id: PROVIDER_RUN_TOAST_ID,
		description,
	});
}

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
	toast.dismiss(PROVIDER_RUN_TOAST_ID);
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
					: args.phase === "stopped"
						? STOPPED_HANDOFF_DELAY_MS
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
	const latestParsedRef = useRef<{
		updateId: number;
		providers: Record<string, ProviderState>;
		results: Record<string, number>;
		totalPrompts?: number;
	}>({
		updateId: 0,
		providers: {},
		results: {},
		totalPrompts: undefined,
	});
	const previousProviderStatesRef = useRef<Record<string, ProviderState>>({});
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
		latestParsedRef.current = parsed;
	}, [parsed]);

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
		const previousStates = previousProviderStatesRef.current;
		const runningProviders = PROVIDER_LIST.filter(
			(provider) => providerStates[provider] === "running",
		);
		const currentDisplay = displayRef.current;
		const transitionedProvider = PROVIDER_LIST.find((provider) => {
			const previousState = previousStates[provider];
			const nextState = providerStates[provider];

			return (
				previousState === "running" &&
				(nextState === "completed" ||
					nextState === "failed" ||
					nextState === "stopped")
			);
		});

		previousProviderStatesRef.current = providerStates;

		if (transitionedProvider) {
			const nextPhase =
				providerStates[transitionedProvider] === "completed"
					? "completed"
					: providerStates[transitionedProvider] === "stopped"
						? "stopped"
						: "failed";

			displayRef.current = { provider: transitionedProvider, phase: nextPhase };
			if (jobId) {
				showProviderToast({
					provider: transitionedProvider,
					phase: nextPhase,
					workspaceId,
					jobId,
				});
			}

			if (completionTimerRef.current) {
				clearTimeout(completionTimerRef.current);
			}
			const handoffDelay =
				nextPhase === "stopped"
					? STOPPED_HANDOFF_DELAY_MS
					: COMPLETION_TOAST_DURATION_MS;
			completionTimerRef.current = setTimeout(() => {
				completionTimerRef.current = null;
				const latest = latestParsedRef.current;
				const nextRunningProvider = PROVIDER_LIST.find(
					(provider) => latest.providers[provider] === "running",
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
			}, handoffDelay);
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
			if (
				parsed.updateId > 0 &&
				parsed.providers &&
				Object.keys(parsed.providers).length > 0
			) {
				displayRef.current = null;
				toast.dismiss(PROVIDER_RUN_TOAST_ID);
			}
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

		displayRef.current = { provider: nextRunningProvider, phase: "running" };
		if (jobId) {
			showProviderToast({
				provider: nextRunningProvider,
				phase: "running",
				workspaceId,
				jobId,
			});
		}
	}, [active, jobId, parsed, workspaceId]);
}
