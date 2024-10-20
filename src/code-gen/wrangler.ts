import { generateObject } from "ai";
import { z } from "zod";
import { activeModel } from "./models";

const TEMPLATE_WRANGLER_TOML = `
name = "honc-d1-template"
compatibility_date = "2024-07-25"
compatibility_flags = [ "nodejs_compat" ]

[[d1_databases]]
binding = "DB"
database_name = "honc-d1-database"
database_id = "local-honc-d1-database"
migrations_dir = "drizzle/migrations"

# [vars]
# MY_VAR = "my-variable"

# Workers Logs
# Docs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
# Configuration: https://developers.cloudflare.com/workers/observability/logs/workers-logs/#enable-workers-logs
[observability]
enabled = true

# [[kv_namespaces]]
# binding = "MY_KV_NAMESPACE"
# id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# [[r2_buckets]]
# binding = "MY_BUCKET"
# bucket_name = "my-bucket"

# [ai]
# binding = "AI"
`.trim();

// TODO - We can actually do this without an LLM if Durable Objects are not involved in the bindings
export async function generateWranglerConfig(
	bindings: Array<string>,
	example = TEMPLATE_WRANGLER_TOML,
) {
	if (bindings.length === 0) {
		return {
			reasoning: "No bindings to enable",
			wranglerToml: example,
		};
	}

	const PROMPT = `
You are a Cloudflare developer expert.

I am using Cloudflare Workers to host my api.

I need you to moidfy a wrangler.toml file in order to enable certain bindings for my api.

I have this current wrangler.toml file:

<file language=toml name=wrangler.toml>
${example}
</file>

Here are the bindings I need enabled:
${formatBindings(bindings)}

Tips:
- Explain your reasoning for the changes you make.
- Make only the changes necessary to enable the bindings.
- Do not add a newline or general comment to the first line of the file.
- Do not modify any unrelated sections of the file.
- Preserve existing comments when possible.
`.trim();

	const result = await generateObject({
		model: activeModel,
		schema: z.object({
			reasoning: z
				.string()
				.describe("Your reasoning for the wrangler.toml file"),
			// IDEA - Instead of regenerating the files, uncomment certain sections as needed
			//        However, this could cause issues for Durable Objects or new features?
			wranglerToml: z.string().describe("The final wrangler.toml file"),
		}),
		prompt: PROMPT,
	});

	return result.object;
}

function formatBindings(bindings: Array<string>) {
	return bindings.map((binding) => `  * ${binding}`).join("\n");
}
