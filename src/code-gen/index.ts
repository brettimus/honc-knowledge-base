import * as readline from "node:readline/promises";
import { type CoreMessage, streamText } from "ai";
import dotenv from "dotenv";
import { generateApiRoutes } from "./api-routes";
import { activeModel } from "./models";
import { generatePlan } from "./planner";
import { generateSchema } from "./schema";
import { generateSeed } from "./seed";
import {
	getCurrentTraceId,
	initializeTraceId,
	saveOutput,
} from "./utils/output-manager";
import { visualizeTrace } from "./utils/visualize-trace";
import { generateWranglerConfig } from "./wrangler";

dotenv.config();

const terminal = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const messages: CoreMessage[] = [];

async function main() {
	// Initialize an object to track timing data of each step
	const timings: { [key: string]: number } = {};

	// Get user's idea
	const idea = await terminal.question("What is your idea for an api?");

	// Create plan for the api
	const startTime = Date.now();
	const planStartTime = Date.now();
	const plan = await generatePlan(idea);
	timings.generatePlan = Date.now() - planStartTime;

	const traceId = initializeTraceId(plan.appName);
	console.log(`Starting new run with trace ID: ${traceId}`);

	await saveOutput("00-initial-idea", idea);

	await saveOutput("01-initial-plan-reasoning.txt", plan.reasoning);
	await saveOutput("01-initial-plan", plan);

	// Generate database schema
	// This is a necessary first step for generation the seed file and implementing the api routes
	const schemaStartTime = Date.now();
	const dbSchema = await generateSchema(plan.databaseSchema);
	timings.generateSchema = Date.now() - schemaStartTime;

	await saveOutput("02-db-schema-reasoning.txt", dbSchema.reasoning);
	await saveOutput("02-db-schema.ts", dbSchema.dbSchemaTs);

	// TODO
	// - [optional] Determin Packages
	//   * Resolve the package names
	//   * Use latest versions
	//   * Modify package.json
	//   * Import the packages in index.ts
	//   * (Add install instructions for end user?)

	// Generate wrangler config and seed file
	//
	// NOTE: These are parallel to reduce overall latency
	const seedStartTime = Date.now();
	const wranglerStartTime = Date.now();
	await Promise.all([
		// TODO - We can actually do this without an LLM if Durable Objects are not involved
		generateWranglerConfig(plan?.cloudflareBindings?.bindings ?? []).then(
			async (wranglerConfig) => {
				timings.generateWranglerConfig = Date.now() - wranglerStartTime;
				try {
					await saveOutput(
						"03-wrangler-reasoning.txt",
						wranglerConfig.reasoning,
					);
					await saveOutput("03-wrangler.toml", wranglerConfig.wranglerToml);
				} catch (error) {
					console.error("Error saving wrangler config:", error);
				}
				return wranglerConfig;
			},
		),
		generateSeed({
			dbSchema: dbSchema.dbSchemaTs,
		}).then(async (seedFile) => {
			timings.generateSeed = Date.now() - seedStartTime;
			try {
				await saveOutput("03-seed-reasoning.txt", seedFile.reasoning);
				await saveOutput("03-seed.ts", seedFile.seedTs);
			} catch (error) {
				console.error("Error saving seed file:", error);
			}
			return seedFile;
		}),
	]);

	// Generate API routes
	// TODO:
	// - Extract the wrangler bindings to use
	const apiRoutesStartTime = Date.now();
	const apiRoutes = await generateApiRoutes({
		dbSchema: dbSchema.dbSchemaTs,
		apiPlan: plan.apiRoutes,
	});
	timings.generateApiRoutes = Date.now() - apiRoutesStartTime;
	await saveOutput("04-api-routes-reasoning.txt", apiRoutes.reasoning);
	await saveOutput("04-api-routes.ts", apiRoutes.indexTs);

	const totalTime = Date.now() - startTime;
	timings.total = totalTime;

	await saveOutput("99-timings.json", JSON.stringify(timings, null, 2));

	await visualizeTrace(traceId);

	console.log(`Run completed. Trace ID: ${getCurrentTraceId()}`);
}

// NOTE - First pass, using vercel ai example
export async function quickTerminalApp() {
	while (true) {
		const userInput = await terminal.question("You: ");

		messages.push({ role: "user", content: userInput });

		const result = await streamText({
			model: activeModel,
			messages,
		});

		let fullResponse = "";
		process.stdout.write("\nAssistant: ");
		for await (const delta of result.textStream) {
			fullResponse += delta;
			process.stdout.write(delta);
		}
		process.stdout.write("\n\n");

		messages.push({ role: "assistant", content: fullResponse });
	}
}

main().catch(console.error);
