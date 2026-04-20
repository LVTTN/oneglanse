import {
	edgeNetworkName,
	ensureDockerNetwork,
	ensureEnvFiles,
	runCommand,
} from "./lib/runtime.mjs";

const COMMANDS_REQUIRING_EDGE_NETWORK = new Set(["create", "start", "up"]);
const COMPOSE_FILE = "docker-compose.yml";
const DEFAULT_IMAGES = {
	ONEGLANSE_AGENT_IMAGE: "ghcr.io/aryamantodkar/oneglanse-agent:latest",
	ONEGLANSE_POSTGRES_IMAGE: "ghcr.io/aryamantodkar/oneglanse-postgres:latest",
	ONEGLANSE_WEB_IMAGE: "ghcr.io/aryamantodkar/oneglanse-web:latest",
};
const PULLABLE_SERVICES = [
	{ service: "redis" },
	{ service: "clickhouse" },
	{
		service: "agent-worker",
		envKey: "ONEGLANSE_AGENT_IMAGE",
		defaultImage: DEFAULT_IMAGES.ONEGLANSE_AGENT_IMAGE,
	},
	{
		service: "db",
		envKey: "ONEGLANSE_POSTGRES_IMAGE",
		defaultImage: DEFAULT_IMAGES.ONEGLANSE_POSTGRES_IMAGE,
	},
	{
		service: "web",
		envKey: "ONEGLANSE_WEB_IMAGE",
		defaultImage: DEFAULT_IMAGES.ONEGLANSE_WEB_IMAGE,
	},
	{
		service: "migrate",
		envKey: "ONEGLANSE_WEB_IMAGE",
		defaultImage: DEFAULT_IMAGES.ONEGLANSE_WEB_IMAGE,
	},
];

function parseArgs(argv) {
	const args = [...argv];
	const stackIndex = args.indexOf("--stack");
	if (stackIndex !== -1) {
		const stack = args[stackIndex + 1] ?? "app";
		if (stack !== "app") {
			throw new Error(
				`Unknown stack "${stack}". Self-hosting now deploys the app stack only.`,
			);
		}
		args.splice(stackIndex, 2);
	}

	return {
		composeArgs: args.length > 0 ? args : ["up", "-d", "--build"],
	};
}

function shouldPullConfiguredImage(envKey, defaultImage) {
	if (!envKey) {
		return true;
	}

	const configured = process.env[envKey]?.trim();
	if (!configured) {
		return defaultImage.includes("/");
	}

	return configured.includes("/");
}

async function runCompose(composeArgs) {
	await runCommand("docker", ["compose", "-f", COMPOSE_FILE, ...composeArgs]);
}

async function runSmartPull() {
	const pullableServices = PULLABLE_SERVICES.filter((entry) =>
		shouldPullConfiguredImage(entry.envKey, entry.defaultImage),
	).map((entry) => entry.service);

	if (pullableServices.length === 0) {
		console.log(
			"Skipping docker pull: no remote images configured for the app stack.",
		);
		return;
	}

	await runCommand("docker", [
		"compose",
		"-f",
		COMPOSE_FILE,
		"pull",
		...pullableServices,
	]);
}

async function runBootstrap() {
	await ensureDockerNetwork(edgeNetworkName);
	await runSmartPull();
	await runCompose(["up", "-d", "--force-recreate"]);
	console.log("Self-host stack started from published images.");
}

async function main() {
	await ensureEnvFiles();
	const { composeArgs } = parseArgs(process.argv.slice(2));
	if (composeArgs[0] === "bootstrap") {
		await runBootstrap();
		return;
	}
	if (composeArgs[0] === "pull") {
		await runSmartPull();
		return;
	}
	if (COMMANDS_REQUIRING_EDGE_NETWORK.has(composeArgs[0] ?? "")) {
		await ensureDockerNetwork(edgeNetworkName);
	}
	await runCompose(composeArgs);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
