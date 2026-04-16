"use client";

import {
	formLabelClassName,
	formPrimaryButtonClassName,
	formSecondaryButtonClassName,
	formSurfaceClassName,
} from "@/components/forms/auth-form-chrome";
import {
	clearActiveProviderRun,
	persistActiveProviderRun,
	showDisconnectedProvidersToast,
} from "@/components/provider-run-toast";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { useProviderConnections } from "@/lib/provider-connections/client";
import { api } from "@/trpc/react";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	Label,
	Textarea,
	toast,
} from "@oneglanse/ui";
import { cn, getFaviconUrls } from "@oneglanse/utils";
import {
	ChevronDown,
	ChevronUp,
	Loader2,
	Plus,
	Sparkles,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const SUGGESTED_PROMPTS = [
	"What are the best alternatives to {brand} for buyers comparing options in this category?",
	"How does {brand} compare with competitors on pricing, usability, and overall value?",
	"What are the main reasons customers choose {brand} versus other brands in this market?",
];

export default function FirstWorkspaceOnboardingPage() {
	const router = useRouter();
	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";

	const [prompts, setPrompts] = useState<string[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [faviconError, setFaviconError] = useState(false);
	const [isStartingRun, setIsStartingRun] = useState(false);
	const [isSuggestedPromptsExpanded, setIsSuggestedPromptsExpanded] =
		useState(true);
	const [suggestedPromptsHeight, setSuggestedPromptsHeight] = useState(0);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const suggestedPromptsRef = useRef<HTMLDivElement>(null);

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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
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

		setIsStartingRun(true);
		try {
			await storePrompts.mutateAsync({ workspaceId, prompts });
			const run = await runAgent.mutateAsync({ workspaceId });
			if (run.status === "no-providers") {
				setIsStartingRun(false);
				clearActiveProviderRun();
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
				setIsStartingRun(false);
				clearActiveProviderRun();
				toast.error("Prompts were saved, but the run could not be started.");
				return;
			}
			persistActiveProviderRun({ workspaceId, jobId });
			router.replace(`/dashboard?workspace=${workspaceId}&jobId=${jobId}`);
		} catch {
			setIsStartingRun(false);
			clearActiveProviderRun();
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

	const isPending =
		isStartingRun || storePrompts.isPending || runAgent.isPending;

	useEffect(() => {
		setIsSuggestedPromptsExpanded(prompts.length === 0);
	}, [prompts.length]);

	useEffect(() => {
		const element = suggestedPromptsRef.current;
		if (!element) return;

		const updateHeight = () => {
			setSuggestedPromptsHeight(element.scrollHeight + 8);
		};

		updateHeight();

		const observer = new ResizeObserver(() => {
			updateHeight();
		});
		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		const element = inputRef.current;
		if (!element) return;

		element.style.height = "0px";
		const nextHeight = Math.min(element.scrollHeight, 160);
		element.style.height = `${Math.max(nextHeight, 44)}px`;
	});

	return (
		<div className="web-centered-page">
			<div className="ui-stagger w-full min-w-0 max-w-md xl:max-w-[34rem] 2xl:max-w-[36rem]">
				<Card className={formSurfaceClassName}>
					{/* Header: favicon left, title + subtitle stacked right */}
					<CardHeader className="flex items-center gap-3 px-4 pb-5 pt-6 sm:px-5 sm:pb-4.5 sm:pt-5.5 xl:gap-4 xl:px-6 xl:pb-5.5 xl:pt-6.5">
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
							<div className="flex items-center gap-2 xl:gap-2.5">
								<Textarea
									ref={inputRef}
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									onKeyDown={handleKeyDown}
									rows={1}
									placeholder="e.g. What's the best CRM for small teams?"
									disabled={isPending}
									className="min-h-11 flex-1 resize-none overflow-hidden px-3 py-2.5 text-[11px] leading-5 placeholder:text-[10px] sm:text-[11.5px] sm:placeholder:text-[10.5px] lg:text-[12px] lg:placeholder:text-[11px] xl:text-[13px] xl:placeholder:text-[12px]"
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
						</div>

						{/* Added prompts */}
						{prompts.length > 0 && (
							<div className="space-y-1.5 xl:space-y-2">
								<Label className={formLabelClassName}>
									Your prompts{" "}
									<span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">
										({prompts.length})
									</span>
								</Label>
								<div className="space-y-2">
									{prompts.map((prompt, index) => (
										<div
											key={`${index}-${prompt}`}
											className="flex w-full items-start gap-2 rounded-[var(--app-radius)] border border-gray-200/80 bg-stone-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900 xl:px-4 xl:py-3"
										>
											<span className="min-w-0 flex-1 break-words text-[11px] leading-5 text-gray-700 [overflow-wrap:anywhere] dark:text-gray-300 xl:text-[13px] xl:leading-6">
												{prompt}
											</span>
											<button
												type="button"
												onClick={() => removePrompt(index)}
												disabled={isPending}
												className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--app-radius)] text-gray-400 transition hover:bg-gray-200/70 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-gray-200 xl:h-6 xl:w-6"
											>
												<X className="h-3 w-3 xl:h-3.5 xl:w-3.5" />
											</button>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Suggested prompts */}
						<div className="space-y-2 xl:space-y-2.5">
							<div className="flex items-center justify-between gap-3">
								<Label className={formLabelClassName}>Suggested prompts</Label>
								<button
									type="button"
									onClick={() =>
										setIsSuggestedPromptsExpanded((current) => !current)
									}
									className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-radius)] bg-transparent text-gray-600 transition hover:bg-stone-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 xl:h-10 xl:w-10"
									aria-expanded={isSuggestedPromptsExpanded}
									aria-controls="suggested-prompts-list"
									aria-label={
										isSuggestedPromptsExpanded
											? "Collapse suggested prompts"
											: "Expand suggested prompts"
									}
								>
									{isSuggestedPromptsExpanded ? (
										<ChevronUp className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
									) : (
										<ChevronDown className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
									)}
								</button>
							</div>
							<div
								id="suggested-prompts-list"
								className={cn(
									"overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
									isSuggestedPromptsExpanded
										? "opacity-100 translate-y-0"
										: "pointer-events-none opacity-0 -translate-y-1",
								)}
								style={{
									maxHeight: isSuggestedPromptsExpanded
										? `${suggestedPromptsHeight}px`
										: "0px",
								}}
								aria-hidden={!isSuggestedPromptsExpanded}
							>
								<div
									ref={suggestedPromptsRef}
									className="space-y-2 pt-0.5 xl:space-y-2.5"
								>
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
													"group flex w-full rounded-[var(--app-radius)] border border-gray-200/80 bg-white px-3 py-2.5 text-left shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition duration-150 xl:px-4 xl:py-3",
													"hover:border-gray-300 hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.1)]",
													"dark:border-gray-800 dark:bg-neutral-950 dark:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.3)]",
													"dark:hover:border-gray-700 dark:hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.4)]",
													alreadyAdded &&
														"pointer-events-none cursor-default opacity-40",
												)}
											>
												<div className="flex min-w-0 flex-1 items-center gap-2">
													<Plus className="h-3.5 w-3.5 shrink-0 text-gray-400 transition group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
													<span className="line-clamp-2 text-[11px] leading-5 text-gray-700 dark:text-gray-300 xl:text-[13px] xl:leading-6">
														{prompt}
													</span>
												</div>
											</button>
										);
									})}
								</div>
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
