"use client";

import {
	formHintClassName,
	formLabelClassName,
	formPrimaryButtonClassName,
	formSecondaryButtonClassName,
	formSurfaceClassName,
} from "@/components/forms/auth-form-chrome";
import { showDisconnectedProvidersToast } from "@/components/provider-run-toast";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { useProviderConnections } from "@/lib/provider-connections/client";
import { api } from "@/trpc/react";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	Input,
	Label,
	toast,
} from "@oneglanse/ui";
import { cn, getFaviconUrls } from "@oneglanse/utils";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

const SUGGESTED_PROMPTS = [
	"What are the best alternatives to {brand} for growing teams?",
	"Compare {brand} with top competitors for pricing and value.",
	"Which brands are most frequently cited for reliability and support?",
];

export default function FirstWorkspaceOnboardingPage() {
	const router = useRouter();
	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";

	const [prompts, setPrompts] = useState<string[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [faviconError, setFaviconError] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const workspaceQuery = api.workspace.getById.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const providerConnectionsQuery = useProviderConnections();
	const storePrompts = api.prompt.store.useMutation();
	const runAgent = api.agent.run.useMutation();

	const brandName = workspaceQuery.data?.name ?? "your brand";
	const brandDomain = workspaceQuery.data?.domain ?? "";

	const faviconUrl = useMemo(() => {
		if (!brandDomain) return null;
		return getFaviconUrls(brandDomain)[0] ?? null;
	}, [brandDomain]);

	const suggestedPrompts = useMemo(
		() =>
			SUGGESTED_PROMPTS.map((p) =>
				p.replaceAll("{brand}", brandName || "your brand"),
			),
		[brandName],
	);

	const addPrompt = (value: string) => {
		const trimmed = value.trim();
		if (!trimmed) return;
		if (prompts.some((p) => p.trim() === trimmed)) return;
		setPrompts((prev) => [...prev, trimmed]);
		setInputValue("");
		inputRef.current?.focus();
	};

	const removePrompt = (index: number) => {
		setPrompts((prev) => prev.filter((_, i) => i !== index));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addPrompt(inputValue);
		}
	};

	const handleStart = async () => {
		if (!workspaceId) {
			toast.error("Workspace is missing.");
			return;
		}
		if (prompts.length === 0) {
			toast.error("Add at least one prompt to continue.");
			return;
		}

		try {
			await storePrompts.mutateAsync({ workspaceId, prompts });
			const run = await runAgent.mutateAsync({ workspaceId });
			if (run.status === "no-providers") {
				showDisconnectedProvidersToast({
					disconnectedProviders:
						run.disconnectedProviders.length > 0
							? run.disconnectedProviders
							: providerConnectionsQuery.data?.cards
									.filter((card) => !card.status.connected)
									.map((card) => card.displayName),
				});
				return;
			}
			const jobId = run?.jobId;
			if (!jobId) {
				toast.error("Prompts were saved, but the run could not be started.");
				return;
			}
			router.replace(`/dashboard?workspace=${workspaceId}&jobId=${jobId}`);
		} catch {
			toast.error("Failed to start. Please try again.");
		}
	};

	if (!workspaceId) {
		return (
			<div className="flex min-h-full items-center justify-center">
				<p className="text-sm text-muted-foreground">No workspace selected.</p>
			</div>
		);
	}

	const isPending = storePrompts.isPending || runAgent.isPending;

	return (
		<div className="web-centered-page">
			<div className="ui-stagger w-full min-w-0 max-w-md xl:max-w-[34rem] 2xl:max-w-[36rem]">
				<Card className={formSurfaceClassName}>
					{/* Header: favicon left, title + subtitle stacked right */}
					<CardHeader className="flex items-center gap-3 px-4 py-5 sm:px-5 sm:py-4.5 xl:gap-4 xl:px-6 xl:py-5.5">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--app-radius)] bg-stone-100 dark:bg-gray-900 xl:h-10 xl:w-10 xl:rounded-[var(--app-radius)]">
							{faviconUrl && !faviconError ? (
								<img
									src={faviconUrl}
									onError={() => setFaviconError(true)}
									alt={brandName}
									className="h-4.5 w-4.5 rounded-[var(--app-radius)] object-contain xl:h-5.5 xl:w-5.5"
								/>
							) : (
								<Sparkles className="h-4 w-4 text-gray-700 dark:text-gray-200 xl:h-5 xl:w-5" />
							)}
						</div>

						<div className="min-w-0 flex-1 flex flex-col">
							<p className="text-[1.4rem] font-medium leading-tight tracking-[-0.02em] text-gray-950 dark:text-gray-50 xl:text-[1.75rem]">
								Start tracking your brand in AI
							</p>
							<p className="mt-0.5 truncate text-[0.75rem] leading-tight text-gray-400 dark:text-gray-500 xl:text-[0.9rem]">
								{brandName}
								{brandDomain ? ` · ${brandDomain}` : ""}
							</p>
						</div>
					</CardHeader>

					{/* Body — no top padding, tight even spacing */}
					<CardContent className="space-y-3.5 px-4 pb-4 pt-0 sm:space-y-4 sm:px-5 sm:pb-5 xl:space-y-5 xl:px-6 xl:pb-6">
						{/* Prompt input */}
						<div className="space-y-1.5 xl:space-y-2">
							<Label className={formLabelClassName}>Add a prompt</Label>
							<div className="flex gap-2 xl:gap-2.5">
								<Input
									ref={inputRef}
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="e.g. What's the best CRM for small teams?"
									disabled={isPending}
									className="h-9 flex-1 text-[12px] xl:h-10 xl:text-[14px]"
								/>
								<button
									type="button"
									onClick={() => addPrompt(inputValue)}
									disabled={!inputValue.trim() || isPending}
									className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-radius)] border border-gray-200 bg-white text-gray-600 transition hover:bg-stone-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 xl:h-10 xl:w-10"
								>
									<Plus className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
								</button>
							</div>
							<p className={formHintClassName}>
								Press Enter or + to add. Aim for 6–10 prompts.
							</p>
						</div>

						{/* Added prompts — chips */}
						{prompts.length > 0 && (
							<div className="space-y-1.5 xl:space-y-2">
								<Label className={formLabelClassName}>
									Your prompts{" "}
									<span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">
										({prompts.length})
									</span>
								</Label>
								<div className="flex flex-wrap gap-1.5 xl:gap-2">
									{prompts.map((prompt, index) => (
										<div
											key={`${index}-${prompt}`}
											className="flex items-center gap-1 rounded-[var(--app-radius)] border border-gray-200/80 bg-stone-50 py-1 pl-2.5 pr-1.5 dark:border-gray-800 dark:bg-gray-900 xl:gap-1.5 xl:py-1.5 xl:pl-3 xl:pr-2"
										>
											<span className="max-w-[160px] truncate text-[10.5px] text-gray-700 dark:text-gray-300 sm:max-w-[200px] xl:max-w-[260px] xl:text-[12px]">
												{prompt}
											</span>
											<button
												type="button"
												onClick={() => removePrompt(index)}
												disabled={isPending}
												className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--app-radius)] text-gray-400 transition hover:bg-gray-200/70 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-gray-200 xl:h-5 xl:w-5"
											>
												<X className="h-2.5 w-2.5 xl:h-3 xl:w-3" />
											</button>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Suggested prompts — 3 cards, spacious, stand out */}
						<div className="space-y-2 xl:space-y-2.5">
							<Label className={formLabelClassName}>Suggested prompts</Label>
							<div className="space-y-2 xl:space-y-2.5">
								{suggestedPrompts.map((prompt) => {
									const alreadyAdded = prompts.some(
										(p) => p.trim() === prompt.trim(),
									);
									return (
										<button
											key={prompt}
											type="button"
											onClick={() => addPrompt(prompt)}
											disabled={alreadyAdded || isPending}
											className={cn(
												"group w-full rounded-[var(--app-radius)] border border-gray-200/80 bg-white px-4 py-3 text-left shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition duration-150 xl:px-5 xl:py-4",
												"hover:border-gray-300 hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.1)]",
												"dark:border-gray-800 dark:bg-neutral-950 dark:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.3)]",
												"dark:hover:border-gray-700 dark:hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.4)]",
												alreadyAdded &&
													"pointer-events-none cursor-default opacity-40",
											)}
										>
											<div className="flex items-start gap-2.5 xl:gap-3">
												<Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 transition group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 xl:h-4 xl:w-4" />
												<span className="text-[11.5px] leading-5 text-gray-700 dark:text-gray-300 xl:text-[13px] xl:leading-6">
													{prompt}
												</span>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-2 xl:gap-2.5">
							<Button
								onClick={handleStart}
								disabled={prompts.length === 0 || isPending}
								className={cn(
									formPrimaryButtonClassName,
									"min-w-[9rem] sm:min-w-[10rem] xl:min-w-[11rem]",
								)}
							>
								{isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Save & Run Analysis"
								)}
							</Button>
							<Button
								variant="ghost"
								onClick={() =>
									router.replace(`/dashboard?workspace=${workspaceId}`)
								}
								disabled={isPending}
								className={cn(
									formSecondaryButtonClassName,
									"h-auto border-transparent px-0 py-0 text-[11px] text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-gray-400 dark:hover:bg-transparent dark:hover:text-gray-200",
								)}
							>
								Skip for now
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
