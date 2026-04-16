"use client";

import { cn, getModelFavicon, getProviderDisplayName } from "@oneglanse/utils";
import { CheckCircle2, Loader2, StopCircle, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./button.js";

export type ProviderRunDisplayPhase =
	| "running"
	| "completed"
	| "failed"
	| "stopped";

const RUNNING_SUBTITLES = [
	"Opening the provider and loading your session…",
	"Submitting your prompts — this may take a moment.",
	"Waiting for the AI to respond. Still going…",
	"Extracting the response and cited sources.",
	"Almost there. Saving results in the background.",
	"Still running. Multi-prompt runs can take a while.",
	"Your results will appear once this provider finishes.",
];

export function ProviderRunStatusCard(props: {
	provider: string;
	phase: ProviderRunDisplayPhase;
	onStop?: () => void | Promise<void>;
	isStopping?: boolean;
	promptNumber?: number;
	totalPrompts?: number;
}) {
	const { provider, phase, onStop, isStopping = false, promptNumber, totalPrompts } = props;
	const [subtitleIndex, setSubtitleIndex] = useState(0);
	const title = getProviderDisplayName(provider);
	const canStop = phase === "running" && Boolean(onStop);

	const subtitle = useMemo(() => {
		if (phase === "running") {
			if (promptNumber !== undefined && totalPrompts !== undefined && totalPrompts > 1) {
				return `Prompt ${promptNumber} of ${totalPrompts}`;
			}
			return RUNNING_SUBTITLES[subtitleIndex % RUNNING_SUBTITLES.length];
		}

		if (phase === "completed") {
			return "Responses saved successfully.";
		}

		if (phase === "stopped") {
			return "Stopped at your request.";
		}

		return "This provider needs another attempt.";
	}, [phase, promptNumber, subtitleIndex, totalPrompts]);

	useEffect(() => {
		if (phase !== "running") return;
		const timer = setInterval(() => {
			setSubtitleIndex((current) => current + 1);
		}, 2200);
		return () => clearInterval(timer);
	}, [phase]);

	return (
		<div className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-[24px] border border-gray-200/80 bg-white px-4 py-4 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)] animate-in fade-in-0 slide-in-from-bottom-2 zoom-in-95 duration-200 dark:border-gray-800 dark:bg-neutral-950 dark:shadow-[0_24px_70px_-30px_rgba(0,0,0,0.62)]">
			<div className="flex items-center gap-3">
				<div className="relative shrink-0">
					<div
						className={cn(
							"absolute inset-0 rounded-lg blur-md transition-opacity duration-300",
							phase === "running"
								? "bg-stone-200/70 opacity-80 dark:bg-white/10"
								: phase === "completed"
									? "bg-emerald-200/70 opacity-80 dark:bg-emerald-500/10"
									: phase === "stopped"
										? "bg-slate-200/70 opacity-80 dark:bg-slate-500/10"
										: "bg-red-200/70 opacity-80 dark:bg-red-500/10",
						)}
					/>
					<img
						src={getModelFavicon(provider)}
						alt={title}
						className="relative h-9 w-9 rounded-lg"
					/>
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
						{title}
					</p>
					<p
						className={cn(
							"mt-0.5 text-sm",
							phase === "running"
								? "text-gray-500 dark:text-gray-400"
								: phase === "completed"
									? "text-emerald-600 dark:text-emerald-400"
									: phase === "stopped"
										? "text-slate-600 dark:text-slate-400"
										: "text-red-600 dark:text-red-400",
						)}
					>
						{phase === "running"
							? "Running now"
							: phase === "completed"
								? "Completed"
								: phase === "stopped"
									? "Stopped"
									: "Run failed"}
					</p>
					<p className="mt-1 min-h-4 text-xs text-gray-400 transition-opacity duration-300 dark:text-gray-500">
						{subtitle}
					</p>
				</div>
				<div className="shrink-0">
					{canStop ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => void onStop?.()}
							disabled={isStopping}
							className="h-8 rounded-full border-red-200 bg-red-50 px-2.5 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
						>
							{isStopping ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<>
									<StopCircle className="h-3.5 w-3.5" />
									<span className="text-xs">Stop</span>
								</>
							)}
						</Button>
					) : phase === "running" ? (
						<div className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse dark:bg-gray-500" />
							<Loader2 className="h-4 w-4 animate-[spin_1.6s_linear_infinite] text-gray-500 dark:text-gray-400" />
						</div>
					) : phase === "completed" ? (
						<CheckCircle2 className="h-4 w-4 text-emerald-500" />
					) : phase === "stopped" ? (
						<div className="h-4 w-4 rounded-full border border-slate-400 dark:border-slate-500" />
					) : (
						<XCircle className="h-4 w-4 text-red-500" />
					)}
				</div>
			</div>
		</div>
	);
}
