import { ProvidersScreen } from "@/components/providers-screen";
import { env } from "@/env";
import { getPostProvidersContinuePath } from "@/lib/auth/redirect";
import { getWorkspace } from "@/lib/workspace/getWorkspace";
import { resolveAppMode } from "@oneglanse/types";

export default async function ProvidersPage({
	searchParams,
}: {
	searchParams?: Promise<{ next?: string }>;
}) {
	let workspace = null;
	try {
		workspace = await getWorkspace();
	} catch {
		workspace = null;
	}
	const params = await searchParams;
	const nextHref = params?.next
		? getPostProvidersContinuePath({
				rawNext: params.next,
				workspaceId: workspace?.id ?? null,
			})
		: null;
	const appMode = resolveAppMode(env.NEXT_PUBLIC_ONEGLANSE_APP_MODE);
	const isSelfHost = appMode === "self-host";

	return (
		<ProvidersScreen
			title={null}
			description={
				isSelfHost
					? "Run `pnpm run auth` on your local machine, complete provider sign-in there, and upload the saved session to this VPS."
					: null
			}
			nextHref={nextHref}
			showSetupNotice={!isSelfHost}
		/>
	);
}
