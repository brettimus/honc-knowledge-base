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
dotenv.config();

const terminal = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const messages: CoreMessage[] = [];

async function main() {
	const timings: { [key: string]: number } = {};
	const startTime = Date.now();

	const idea = await terminal.question("What is your idea for an api?");

	const planStartTime = Date.now();
	const plan = await generatePlan(idea);
	timings.generatePlan = Date.now() - planStartTime;

	const traceId = initializeTraceId(plan.appName);
	console.log(`Starting new run with trace ID: ${traceId}`);

	console.log(plan);
	await saveOutput("00-initial-idea", idea);

	await saveOutput("01-initial-plan", plan);

	const schemaStartTime = Date.now();
	const dbSchema = await generateSchema(plan.databaseSchema);
	timings.generateSchema = Date.now() - schemaStartTime;

	await saveOutput("02-db-schema.ts", dbSchema.dbSchemaTs);

	// TODO
	// - [optional] Modify wrangler.toml
	//    * Note the binding names

	// TODO
	// - [optional] Packages
	//   * Modify package.json
	//   * Resolve the package names for use in index.ts
	//   * Install instructions

	// NOTE: These are parallel to reduce overall latency
	const parallelStartTime = Date.now();
	const [apiRoutes, seedFile] = await Promise.all([
		generateApiRoutes({
			dbSchema: dbSchema.dbSchemaTs,
			apiPlan: plan.apiRoutes,
		}),
		generateSeed({
			dbSchema: dbSchema.dbSchemaTs,
		}),
	]);
	timings.generateApiRoutes = Date.now() - parallelStartTime;
	timings.generateSeed = Date.now() - parallelStartTime;

	await saveOutput("03-api-routes.ts", apiRoutes.indexTs);
	await saveOutput("04-seed.ts", seedFile.seedTs);
	await visualizeTrace(traceId);

	const totalTime = Date.now() - startTime;
	timings.total = totalTime;

	console.log(`Run completed. Trace ID: ${getCurrentTraceId()}`);
	console.log("Timing data:");
	console.log(
		Object.entries(timings)
			.map(
				([key, value]) =>
					`${key}: ${value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(2)}s`}`,
			)
			.join("\n"),
	);

	await saveOutput("05-timings.json", JSON.stringify(timings, null, 2));
}

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
