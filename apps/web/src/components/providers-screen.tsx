import { ProviderConnectionsPanel } from "@/components/provider-connections-panel";

export function ProvidersScreen(props: {
	title?: string | null;
	description?: string | null;
	nextHref?: string | null;
	showSetupNotice?: boolean;
	isSelfHost?: boolean;
	workspaceId?: string | null;
}) {
	const {
		title = null,
		description = null,
		nextHref = null,
		showSetupNotice = true,
		isSelfHost = false,
		workspaceId = null,
	} = props;

	return (
		<div className="web-centered-page">
			<div className="w-full max-w-4xl xl:max-w-5xl">
				<ProviderConnectionsPanel
					title={title}
					description={description}
					nextHref={nextHref}
					showSetupNotice={showSetupNotice}
					isSelfHost={isSelfHost}
					workspaceId={workspaceId}
				/>
			</div>
		</div>
	);
}
