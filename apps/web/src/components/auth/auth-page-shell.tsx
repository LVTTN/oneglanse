import type { ReactNode } from "react";

type AuthPageShellProps = {
	children: ReactNode;
	subtitle?: string;
};

export function AuthPageShell({
	children,
	subtitle,
}: AuthPageShellProps): React.JSX.Element {
	return (
		<div className="flex min-h-svh min-w-0 items-center justify-center overflow-hidden bg-stone-50 px-4 py-6 dark:bg-neutral-950 sm:px-6 sm:py-8 md:px-8">
			<div className="flex w-full min-w-0 max-w-[21.25rem] flex-col gap-5 sm:max-w-[22.5rem] sm:gap-6 lg:max-w-[23.5rem] xl:max-w-[25rem] xl:gap-7">
				<div className="flex flex-col items-center gap-3">
					<img
						src="/logo.png"
						alt="OneGlanse"
						className="h-12 w-12 rounded-2xl object-contain"
					/>
					<div className="space-y-1 text-center">
						<div className="text-[1.4rem] font-semibold tracking-[-0.05em] text-gray-950 sm:text-[1.75rem] lg:text-[1.9rem] xl:text-[2rem] dark:text-gray-50">
							OneGlanse
						</div>
						{subtitle ? (
							<p className="text-[0.78rem] text-gray-500 dark:text-gray-400 sm:text-[0.82rem] xl:text-[0.85rem]">
								{subtitle}
							</p>
						) : null}
					</div>
				</div>
				{children}
			</div>
		</div>
	);
}
