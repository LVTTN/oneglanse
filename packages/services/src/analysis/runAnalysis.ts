import { ExternalServiceError, ValidationError } from "@oneglanse/errors";
import type { AnalysisInputSingle, BrandAnalysisResult } from "@oneglanse/types";
import { env } from "../env.js";
import { chatgpt, claude, groq, ollama } from "../llm/index.js";
import { analysisPrompt } from "./analysisPrompt.js";

const systemPrompt =
	"You are an expert brand intelligence analyst. " +
	"You respond ONLY with valid JSON — no markdown, no code fences, no commentary. " +
	"Return only valid JSON matching the requested schema. " +
	"Be precise, evidence-based, and conservative in your scoring. " +
	"If the brand is not mentioned in the response, return zeroed-out scores and empty arrays rather than fabricating data.";

const DEFAULT_MODELS = {
	openai: "gpt-4.1",
	claude: "claude-sonnet-4-6",
	groq: "llama-3.3-70b-versatile",
	ollama: "llama3.1",
} as const;

function modelFor(provider: keyof typeof DEFAULT_MODELS): string {
	return env.ANALYSIS_LLM_MODEL?.trim() || DEFAULT_MODELS[provider];
}

async function runWithOpenAI(prompt: string, responseLength: number): Promise<string> {
	let response;
	try {
		response = await chatgpt.responses.create({
			model: modelFor("openai"),
			temperature: 0,
			input: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: prompt },
			],
			text: { format: { type: "json_object" } },
		});
	} catch (err) {
		throw new ExternalServiceError(
			"ChatGPT",
			"Failed to analyze response.",
			502,
			{ responseLength },
			err,
		);
	}
	return response.output_text?.trim() || "";
}

async function runWithClaude(prompt: string, responseLength: number): Promise<string> {
	let response;
	try {
		response = await claude.messages.create({
			model: modelFor("claude"),
			max_tokens: 4096,
			temperature: 0,
			system: systemPrompt,
			messages: [{ role: "user", content: prompt }],
		});
	} catch (err) {
		throw new ExternalServiceError(
			"Claude",
			"Failed to analyze response.",
			502,
			{ responseLength },
			err,
		);
	}
	const block = response.content[0];
	return block?.type === "text" ? block.text.trim() : "";
}

async function runWithOpenAICompatible(
	client: typeof groq,
	model: string,
	serviceLabel: string,
	prompt: string,
	responseLength: number,
): Promise<string> {
	let response;
	try {
		response = await client.chat.completions.create({
			model,
			temperature: 0,
			response_format: { type: "json_object" },
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: prompt },
			],
		});
	} catch (err) {
		throw new ExternalServiceError(
			serviceLabel,
			"Failed to analyze response.",
			502,
			{ responseLength },
			err,
		);
	}
	const text = response.choices[0]?.message?.content ?? "";
	return text.trim();
}

async function runWithGroq(prompt: string, responseLength: number): Promise<string> {
	return runWithOpenAICompatible(groq, modelFor("groq"), "Groq", prompt, responseLength);
}

async function runWithOllama(prompt: string, responseLength: number): Promise<string> {
	return runWithOpenAICompatible(
		ollama,
		modelFor("ollama"),
		"Ollama",
		prompt,
		responseLength,
	);
}

export async function runAnalysis(
	input: AnalysisInputSingle,
): Promise<BrandAnalysisResult> {
	const prompt = analysisPrompt(input);
	const responseLength = input.response.length;

	let text: string;
	switch (env.ANALYSIS_LLM_PROVIDER) {
		case "claude":
			text = await runWithClaude(prompt, responseLength);
			break;
		case "groq":
			text = await runWithGroq(prompt, responseLength);
			break;
		case "ollama":
			text = await runWithOllama(prompt, responseLength);
			break;
		default:
			text = await runWithOpenAI(prompt, responseLength);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (err) {
		throw new ValidationError(
			"Invalid JSON returned from LLM during analysis.",
			{ rawOutput: text.slice(0, 200) },
		);
	}

	if (typeof parsed !== "object" || parsed === null) {
		throw new ValidationError("Invalid JSON shape", { type: typeof parsed });
	}

	return parsed as BrandAnalysisResult;
}
