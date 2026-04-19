const SKIP_PROVIDER_GATE_STORAGE_KEY = "oneglanse.skip-provider-gate";

export function readSkipProviderGate(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	return window.sessionStorage.getItem(SKIP_PROVIDER_GATE_STORAGE_KEY) === "1";
}

export function writeSkipProviderGate(value: boolean): void {
	if (typeof window === "undefined") {
		return;
	}

	if (value) {
		window.sessionStorage.setItem(SKIP_PROVIDER_GATE_STORAGE_KEY, "1");
		return;
	}

	window.sessionStorage.removeItem(SKIP_PROVIDER_GATE_STORAGE_KEY);
}
