"use client";

import {
	formChipClassName,
	formFieldClassName,
	formHintClassName,
	formLabelClassName,
	formPrimaryButtonClassName,
	formSecondaryButtonClassName,
	formSurfaceClassName,
} from "@/components/forms/auth-form-chrome";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	toast,
} from "@oneglanse/ui";
import { cn } from "@oneglanse/utils";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

const SUGGESTED_PROMPTS = [
	"What are the best alternatives to {brand} for growing teams?",
	"Which tools are most recommended for sales pipeline management?",
	"What are the top platforms for customer support automation in 2026?",
	"Compare {brand} with top competitors for pricing and value.",
	"Which software is best for CRM + marketing automation together?",
	"What are the most trusted solutions for enterprise workflow automation?",
	"What tool is easiest to set up for small businesses in this category?",
	"Which brands are most frequently cited for reliability and support?",
];

export default function FirstWorkspaceOnboardingPage() {
	const router = useRouter();
	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";

	const [prompts, setPrompts] = useState<string[]>([]);
	const [inputValue, setInputValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const workspaceQuery = api.workspace.getById.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const storePrompts = api.prompt.store.useMutation();
	const runAgent = api.agent.run.useMutation();

	const brandName = workspaceQuery.data?.name ?? "your brand";
	const brandDomain = workspaceQuery.data?.domain ?? "";

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
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-sm text-muted-foreground">No workspace selected.</p>
			</div>
		);
	}

	const isPending = storePrompts.isPending || runAgent.isPending;

	return (
		<div className="ui-page-enter min-h-screen bg-stone-50 px-4 py-8 dark:bg-neutral-950 sm:px-6 sm:py-10">
			<div className="ui-stagger mx-auto w-full min-w-0 max-w-2xl">
				<Card className={formSurfaceClassName}>
					<CardHeader className="border-b border-gray-100 bg-white pb-6 dark:border-gray-900 dark:bg-neutral-950">
						<div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 dark:bg-gray-900">
							<Sparkles className="h-5 w-5 text-gray-700 dark:text-gray-200" />
						</div>
						<CardTitle className="text-[1.85rem] tracking-[-0.05em]">
							Set up your first GEO visibility run
						</CardTitle>
						<CardDescription className="max-w-xl text-sm leading-6">
							Add prompts that matter for buyers in your category. We'll run and
							analyze them now and take you straight to your dashboard.
						</CardDescription>
						<p className={cn(formHintClassName, "mt-2")}>
							Brand:{" "}
							<span className="font-medium text-gray-900 dark:text-gray-100">
								{brandName}
							</span>
							{brandDomain ? ` (${brandDomain})` : ""}
						</p>
					</CardHeader>

					<CardContent className="space-y-6 bg-white px-5 py-5 sm:px-6 sm:py-6 dark:bg-neutral-950">
						{/* Input row */}
						<div className="space-y-2">
							<Label className={formLabelClassName}>Add a prompt</Label>
							<div className="flex gap-2">
								<Input
									ref={inputRef}
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="e.g. What are the best tools for sales pipeline management?"
									className={cn(formFieldClassName, "flex-1")}
									disabled={isPending}
								/>
								<Button
									type="button"
									onClick={() => addPrompt(inputValue)}
									disabled={!inputValue.trim() || isPending}
									className={cn(
										formSecondaryButtonClassName,
										"w-11 shrink-0 !px-0 justify-center",
									)}
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
							<p className={formHintClassName}>
								Press Enter or click + to add. Aim for 6–10 prompts.
							</p>
						</div>

						{/* Added prompts */}
						{prompts.length > 0 && (
							<div className="space-y-2">
								<Label className={formLabelClassName}>
									Your prompts{" "}
									<span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500">
										({prompts.length})
									</span>
								</Label>
								<div className="flex flex-wrap gap-2">
									{prompts.map((prompt, index) => (
										<span
											key={`${index}-${prompt}`}
											className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200/80 bg-stone-50 py-1.5 pl-3.5 pr-2 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
										>
											<span className="min-w-0 break-words leading-4 [overflow-wrap:anywhere]">
												{prompt}
											</span>
											<button
												type="button"
												onClick={() => removePrompt(index)}
												disabled={isPending}
												className="shrink-0 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
								</div>
							</div>
						)}

						{/* Suggested prompts */}
						<div className="space-y-2">
							<Label className={formLabelClassName}>Suggested prompts</Label>
							<div className="flex flex-wrap gap-2">
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
												formChipClassName,
												alreadyAdded && "cursor-default opacity-40 pointer-events-none",
											)}
										>
											+ {prompt}
										</button>
									);
								})}
							</div>
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end">
							<Button
								variant="outline"
								onClick={() =>
									router.replace(`/dashboard?workspace=${workspaceId}`)
								}
								disabled={isPending}
								className={cn(formSecondaryButtonClassName, "w-full sm:w-auto")}
							>
								Skip for now
							</Button>
							<Button
								onClick={handleStart}
								disabled={prompts.length === 0 || isPending}
								className={cn(
									formPrimaryButtonClassName,
									"w-full sm:w-auto sm:min-w-[220px]",
								)}
							>
								{isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Save Prompts & Run Analysis"
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
