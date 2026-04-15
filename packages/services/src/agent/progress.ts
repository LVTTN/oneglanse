import type { Provider } from "@oneglanse/types";
import { redis } from "./redis.js";

const AGENT_PROGRESS_TTL_SECONDS = 24 * 60 * 60;

export type ProviderExecutionStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "stopped";

const UPDATE_PROGRESS_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return nil end
local data = cjson.decode(raw)
data['providers'][ARGV[1]] = ARGV[2]
if ARGV[3] ~= '' then
  data['results'][ARGV[1]] = tonumber(ARGV[3])
end
data['updateId'] = (data['updateId'] or 0) + 1
local total = 0
for _, v in pairs(data['results']) do total = total + v end
data['stats']['actualResponses'] = total
local allDone = true
for _, v in pairs(data['providers']) do
  if v ~= 'completed' and v ~= 'failed' and v ~= 'stopped' then allDone = false; break end
end
if allDone then data['status'] = 'completed' end
redis.call('SET', KEYS[1], cjson.encode(data), 'EX', ${AGENT_PROGRESS_TTL_SECONDS})
return cjson.encode(data)
`;

export function buildProgressKey(jobGroupId: string): string {
	return `job:${jobGroupId}:result`;
}

export async function updateProviderProgress(args: {
	jobGroupId: string;
	provider: Provider;
	status: ProviderExecutionStatus;
	resultCount?: number | null;
}): Promise<void> {
	const countArg =
		args.resultCount === undefined || args.resultCount === null
			? ""
			: String(args.resultCount);

	await redis.eval(
		UPDATE_PROGRESS_LUA,
		1,
		buildProgressKey(args.jobGroupId),
		args.provider,
		args.status,
		countArg,
	);
}
