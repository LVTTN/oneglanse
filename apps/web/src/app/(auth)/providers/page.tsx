import { ProviderConnectionsPanel } from "@/components/provider-connections-panel";
import { getPostProvidersContinuePath } from "@/lib/auth/redirect";
import { getWorkspace } from "@/lib/workspace/getWorkspace";

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

	return (
		<div className="web-centered-page">
			<div className="w-full max-w-5xl">
				<ProviderConnectionsPanel
					title={null}
					description={null}
					nextHref={nextHref}
				/>
			</div>
		</div>
	);
}
