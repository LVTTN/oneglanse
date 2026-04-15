import { ProviderConnectionsPanel } from "@/components/provider-connections-panel";

export function ProvidersScreen(props: {
	title?: string | null;
	description?: string | null;
	nextHref?: string | null;
	showSetupNotice?: boolean;
}) {
	const {
		title = null,
		description = null,
		nextHref = null,
		showSetupNotice = true,
	} = props;

	return (
		<div className="web-centered-page">
			<div className="w-full max-w-5xl">
				<ProviderConnectionsPanel
					title={title}
					description={description}
					nextHref={nextHref}
					showSetupNotice={showSetupNotice}
				/>
			</div>
		</div>
	);
}
