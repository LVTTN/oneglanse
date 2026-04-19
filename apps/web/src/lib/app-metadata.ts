import type { Metadata } from "next";

export const appIcons: Metadata["icons"] = {
	icon: [
		{
			url: "/logo.png",
			media: "(prefers-color-scheme: light)",
			type: "image/png",
		},
		{
			url: "/logo-dark.png",
			media: "(prefers-color-scheme: dark)",
			type: "image/png",
		},
	],
	shortcut: [
		{
			url: "/logo.png",
			type: "image/png",
		},
	],
	apple: [
		{
			url: "/logo.png",
			type: "image/png",
		},
	],
};
