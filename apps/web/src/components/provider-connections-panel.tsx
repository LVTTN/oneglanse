"use client";

import {
	formPanelClassName,
	formPrimaryButtonClassName,
	formSecondaryButtonClassName,
} from "@/components/forms/auth-form-chrome";
import {
	useProviderConnectionAction,
	useProviderConnections,
	useResetAllProviders,
} from "@/lib/provider-connections/client";
import type { ProviderConnectionCard } from "@/lib/provider-connections/types";
import { api } from "@/trpc/react";
import { Button, toast } from "@oneglanse/ui";
import { cn, getModelFavicon } from "@oneglanse/utils";
import { AUTH_PROVIDER_LIST } from "@oneglanse/types";
import type { AuthProvider } from "@oneglanse/types";
import { CheckCircle2, Loader2, RotateCcw, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

const CARD_ORDER: Array<ProviderConnectionCard["provider"]> = [
	"google",
	"gemini",
	"chatgpt",
	"perplexity",
	"claude",
];

function getConnectionCardTitle(card: ProviderConnectionCard): string {
	return card.provider === "google" ? "AI Overview" : card.displayName;
}

function sortConnectionCards(
	cards: ProviderConnectionCard[],
): ProviderConnectionCard[] {
	return [...cards].sort((left, right) => {
		const leftIndex = CARD_ORDER.indexOf(left.provider);
		const rightIndex = CARD_ORDER.indexOf(right.provider);
		const normalizedLeftIndex =
			leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
		const normalizedRightIndex =
			rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

		if (normalizedLeftIndex !== normalizedRightIndex) {
			return normalizedLeftIndex - normalizedRightIndex;
		}

		return getConnectionCardTitle(left).localeCompare(
			getConnectionCardTitle(right),
		);
	});
}

function getConnectionStatusLabel(card: ProviderConnectionCard): string {
	if (card.status.connecting) {
		return "Connecting";
	}

	return card.status.connected ? "" : "Disconnected";
}

function getConnectionStatusMessage(
	card: ProviderConnectionCard,
): string | null {
	if (card.status.connecting) {
		return "Finish the sign-in flow and close the provider browser window to activate this provider.";
	}

	if (!card.status.connected) {
		return null;
	}

	return card.status.error;
}

function getConnectionCardClasses(card: ProviderConnectionCard): string {
	if (card.status.connected) {
		return `${formPanelClassName} bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.18)] hover:shadow-[0_20px_60px_-28px_rgba(15,23,42,0.22)] dark:bg-neutral-950 dark:shadow-[0_20px_60px_-32px_rgba(0,0,0,0.55)] dark:hover:shadow-[0_20px_60px_-28px_rgba(0,0,0,0.62)]`;
	}

	if (card.status.connecting) {
		return `${formPanelClassName} bg-stone-50 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.18)] hover:shadow-[0_20px_60px_-28px_rgba(15,23,42,0.22)] dark:bg-neutral-900 dark:shadow-[0_20px_60px_-32px_rgba(0,0,0,0.55)] dark:hover:shadow-[0_20px_60px_-28px_rgba(0,0,0,0.62)]`;
	}

	return `${formPanelClassName} bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.18)] hover:shadow-[0_20px_60px_-28px_rgba(15,23,42,0.22)] dark:bg-neutral-950 dark:shadow-[0_20px_60px_-32px_rgba(0,0,0,0.55)] dark:hover:shadow-[0_20px_60px_-28px_rgba(0,0,0,0.62)]`;
}

function getConnectionBadgeClasses(card: ProviderConnectionCard): string {
	if (card.status.connecting) {
		return "border border-gray-200/80 bg-stone-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
	}

	return "border border-gray-200/80 bg-white text-gray-500 dark:border-gray-800 dark:bg-neutral-950 dark:text-gray-400";
}

function getCardMutationState(args: {
	card: ProviderConnectionCard;
	isMutationPending: boolean;
	variables: ReturnType<typeof useProviderConnectionAction>["variables"];
}) {
	const { card, isMutationPending, variables } = args;
	const isPendingForProvider =
		isMutationPending && variables?.provider === card.provider;

	return {
		isPendingForProvider,
		isPendingConnect:
			isPendingForProvider && (variables?.action ?? "connect") === "connect",
		isPendingRefresh: isPendingForProvider && variables?.action === "refresh",
	};
}

export function ProviderConnectionsPanel(props: {
	title?: string | null;
	description?: string | null;
	nextHref?: string | null;
	showSetupNotice?: boolean;
	isSelfHost?: boolean;
	workspaceId?: string | null;
}) {
	const {
		title = "Providers",
		description = "Log in to a provider, then close the browser window. Auth is saved automatically.",
		nextHref = null,
		showSetupNotice = true,
		isSelfHost = false,
		workspaceId = null,
	} = props;
	const router = useRouter();
	const authProvidersQuery = useProviderConnections();

	const enabledProvidersQuery = api.workspace.getEnabledProviders.useQuery(
		{ workspaceId: workspaceId! },
		{ enabled: !!workspaceId },
	);
	const setEnabledMutation = api.workspace.setEnabledProviders.useMutation({
		onError: () => {
			toast.error("Failed to update provider. Please try again.");
		},
		onSettled: () => {
			void enabledProvidersQuery.refetch();
		},
	});

	const isProviderEnabled = (provider: AuthProvider): boolean => {
		if (setEnabledMutation.isPending && setEnabledMutation.variables) {
			const pending = setEnabledMutation.variables.enabledProviders;
			return pending === null || pending.includes(provider);
		}
		const server = enabledProvidersQuery.data?.enabledProviders ?? null;
		return server === null || server.includes(provider);
	};

	const handleProviderToggle = (provider: AuthProvider) => {
		if (!workspaceId) return;
		const serverEnabled = enabledProvidersQuery.data?.enabledProviders ?? null;
		const serverList =
			serverEnabled === null ? ([...AUTH_PROVIDER_LIST] as AuthProvider[]) : serverEnabled;
		const currentlyEnabled = serverEnabled === null || serverEnabled.includes(provider);

		if (currentlyEnabled) {
			const remaining = serverList.filter((p) => p !== provider);
			if (remaining.length === 0) {
				toast.error("At least one provider must be enabled.");
				return;
			}
			setEnabledMutation.mutate({ workspaceId, enabledProviders: remaining });
		} else {
			const nextList = [...serverList, provider] as AuthProvider[];
			const next = nextList.length === AUTH_PROVIDER_LIST.length ? null : nextList;
			setEnabledMutation.mutate({ workspaceId, enabledProviders: next });
		}
	};

	const providerActionMutation = useProviderConnectionAction({
		onSuccess: (result, variables) => {
			toast.success(
				result.started
					? variables.action === "refresh"
						? "Connection flow restarted on this machine."
						: "Connection flow started on this machine."
					: "Connection flow is already running.",
			);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const resetAllMutation = useResetAllProviders({
		onSuccess: () => {
			toast.success("All provider sessions have been reset.");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const cards = sortConnectionCards(authProvidersQuery.data?.cards ?? []);
	const hasAtLeastOneConnection = cards.some((card) => card.status.connected);
	const isAnyConnectionPending =
		providerActionMutation.isPending ||
		cards.some((card) => card.status.connecting);

	return (
		<section>
			<div className="mb-6 space-y-2">
				<div className="space-y-2">
					{title ? (
						<h2 className="text-[1.45rem] font-semibold leading-tight tracking-[-0.03em] text-gray-950 sm:text-[1.8rem] dark:text-gray-50">
							{title}
						</h2>
					) : null}
					{description ? (
						<p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
							{description}
						</p>
					) : null}

					<div className="rounded-[calc(var(--app-radius)+0.1rem)] border border-gray-200/80 bg-white/50 p-4 sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]">
						<div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="space-y-1">
								<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
									Setup Flow
								</p>
								<p className="text-sm font-medium tracking-[-0.02em] text-gray-900 dark:text-gray-100">
									How provider access works
								</p>
								<p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
									{isSelfHost
										? "Connect locally, upload the saved auth session, then use it from the VPS."
										: "Connect once on this machine, then use only the providers you keep active."}
								</p>
							</div>

							<Button
								variant="ghost"
								size="icon"
								className={cn(
									formSecondaryButtonClassName,
									"size-8 shrink-0 rounded-[var(--app-radius)] border border-gray-200/80 bg-white/85 p-0 text-gray-600 sm:size-8.5 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 lg:size-9 xl:size-10",
								)}
								onClick={() => resetAllMutation.mutate()}
								disabled={
									!hasAtLeastOneConnection ||
									resetAllMutation.isPending ||
									isAnyConnectionPending
								}
								aria-label="Reset all provider sessions"
								title="Reset all provider sessions"
							>
								{resetAllMutation.isPending ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
								) : (
									<RotateCcw className="h-3.5 w-3.5" />
								)}
							</Button>
						</div>

						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<div className="rounded-[var(--app-radius)] border border-gray-200/80 bg-white/80 px-3 py-3 dark:border-gray-800 dark:bg-white/5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
									1. Connect
								</p>
								<p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
									{isSelfHost
										? "Connect to the providers."
										: "Open a provider and finish sign-in in the browser window."}
								</p>
							</div>
							<div className="rounded-[var(--app-radius)] border border-gray-200/80 bg-white/80 px-3 py-3 dark:border-gray-800 dark:bg-white/5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
									2. Save
								</p>
								<p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
									Close the window; the session is stored automatically.
								</p>
							</div>
							<div className="rounded-[var(--app-radius)] border border-gray-200/80 bg-white/80 px-3 py-3 dark:border-gray-800 dark:bg-white/5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
									{isSelfHost ? "3. Upload" : "3. Run"}
								</p>
								<p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
									{isSelfHost
										? "Run `pnpm upload vps` so the auth session is transferred to the VPS."
										: "Connect the providers you want available for prompt runs on this machine."}
								</p>
							</div>
							{isSelfHost ? (
								<div className="rounded-[var(--app-radius)] border border-gray-200/80 bg-white/80 px-3 py-3 dark:border-gray-800 dark:bg-white/5 sm:col-span-3">
									<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
										4. Run on VPS
									</p>
									<p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
										You can use it on the VPS to run prompts.
									</p>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>

			{authProvidersQuery.isLoading ? (
				<div className="mb-6 flex items-center gap-2 rounded-[var(--app-radius)] border border-gray-200/80 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading providers...
				</div>
			) : null}

			{authProvidersQuery.error ? (
				<p className="mb-6 rounded-[var(--app-radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
					{authProvidersQuery.error.message}
				</p>
			) : null}

			{showSetupNotice &&
			!authProvidersQuery.data?.interactiveConnectAllowed ? (
				<p className="mb-6 rounded-[var(--app-radius)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
					To connect or refresh providers, run{" "}
					<code className="rounded px-1 font-mono text-xs">pnpm auth</code> on
					your local machine, then finish sign-in on the local{" "}
					<code className="rounded px-1 font-mono text-xs">
						/providers/local
					</code>{" "}
					page. When the local auth flow finishes, you can choose whether to
					upload the saved sessions to your VPS.
				</p>
			) : null}

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{cards.map((card) => {
					const status = card.status;
					const { isPendingForProvider, isPendingConnect, isPendingRefresh } =
						getCardMutationState({
							card,
							isMutationPending: providerActionMutation.isPending,
							variables: providerActionMutation.variables,
						});
					const isConnected = status.connected;
					const primaryProvider = card.providers[0] ?? card.provider;
					const cardTitle = getConnectionCardTitle(card);
					const statusLabel = getConnectionStatusLabel(card);
					const statusMessage = getConnectionStatusMessage(card);
					const canInteractivelyReconnect = Boolean(
						authProvidersQuery.data?.interactiveConnectAllowed,
					);
					const primaryButtonLabel = status.connecting
						? "Connecting"
						: "Connect";

					const isEnabled = isProviderEnabled(card.provider);

					return (
						<div
							key={card.provider}
							className={cn(
								"group relative overflow-hidden px-5 py-5 transition-[background-color,box-shadow,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 sm:px-6 sm:py-5",
								getConnectionCardClasses(card),
							)}
						>
							<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300/70 to-transparent dark:via-white/10" />
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div
									className={cn(
										"min-w-0 flex-1 transition-opacity duration-200",
										!isEnabled && workspaceId ? "opacity-40" : "opacity-100",
									)}
								>
									<div className="flex items-center gap-3">
										<img
											src={getModelFavicon(primaryProvider)}
											alt={cardTitle}
											className="h-7 w-7 shrink-0 rounded-[var(--app-radius)] sm:h-8 sm:w-8"
										/>

										<div className="min-w-0">
											<div className="flex flex-col gap-1">
												<span className="text-[10px] font-medium uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
													Provider
												</span>
												<p className="truncate text-sm font-semibold tracking-[-0.02em] text-gray-900 sm:text-base dark:text-gray-100">
													{cardTitle}
												</p>
											</div>
											{isConnected && !statusMessage ? (
												<div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
													<CheckCircle2 className="h-3.5 w-3.5" />
													Ready for prompt runs
												</div>
											) : null}
											{statusMessage ? (
												<p className="mt-1.5 text-sm leading-5 text-red-500 dark:text-red-300">
													{statusMessage}
												</p>
											) : null}
										</div>
									</div>
								</div>

								<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
									{statusLabel ? (
										<span
											className={cn(
												"inline-flex items-center rounded-[var(--app-radius)] px-3 py-1 text-[10px] font-medium tracking-[0.02em]",
												getConnectionBadgeClasses(card),
											)}
										>
											{statusLabel}
										</span>
									) : null}
									{canInteractivelyReconnect && !isConnected ? (
										<Button
											variant="default"
											className={cn(
												formPrimaryButtonClassName,
												"h-11 w-full shrink-0 px-5 sm:w-auto",
											)}
											onClick={() =>
												providerActionMutation.mutate({
													provider: card.provider,
													action: "connect",
												})
											}
											disabled={status.connecting || isPendingForProvider}
										>
											{status.connecting || isPendingConnect ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : null}
											{primaryButtonLabel}
										</Button>
									) : null}

									{canInteractivelyReconnect && isConnected ? (
										<Button
											variant="ghost"
											size="icon"
											className={cn(
												formSecondaryButtonClassName,
												"size-11 rounded-[var(--app-radius)] p-0 text-gray-500 dark:text-gray-300",
											)}
											onClick={() =>
												providerActionMutation.mutate({
													provider: card.provider,
													action: "refresh",
												})
											}
											disabled={status.connecting || isPendingForProvider}
											aria-label={`Reconnect ${cardTitle}`}
											title={`Reconnect ${cardTitle}`}
										>
											{status.connecting || isPendingRefresh ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<RotateCw className="h-4 w-4" />
											)}
										</Button>
									) : null}

									{workspaceId ? (
										<div className="ml-0.5 flex items-center gap-2">
											<button
												type="button"
												role="switch"
												aria-checked={isEnabled}
												onClick={() => handleProviderToggle(card.provider)}
												disabled={setEnabledMutation.isPending}
												title={
													isEnabled
														? `Disable ${cardTitle}`
														: `Enable ${cardTitle}`
												}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none disabled:cursor-not-allowed",
													isEnabled
														? "bg-emerald-500 dark:bg-emerald-600"
														: "bg-gray-200 dark:bg-gray-700",
												)}
											>
												<span
													className={cn(
														"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
														isEnabled ? "translate-x-4" : "translate-x-0",
													)}
												/>
											</button>
										</div>
									) : null}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{nextHref && hasAtLeastOneConnection ? (
				<div className="mt-6 flex justify-end">
					<Button
						variant="default"
						className={cn(formPrimaryButtonClassName, "h-11 w-auto px-5")}
						onClick={() => router.push(nextHref)}
						disabled={isAnyConnectionPending}
					>
						Next
					</Button>
				</div>
			) : null}
		</section>
	);
}
