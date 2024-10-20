import * as readline from "node:readline/promises";
import { type CoreMessage, streamText } from "ai";
import dotenv from "dotenv";
import { generateApiRoutes } from "./api-routes";
import { activeModel } from "./models";
import { generatePlan } from "./planner";
import { generateSchema } from "./schema";
import { visualizeTrace } from "./utils/latest-trace";
import {
	getCurrentTraceId,
	initializeTraceId,
	saveOutput,
} from "./utils/output-manager";
dotenv.config();

const terminal = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const messages: CoreMessage[] = [];

async function main() {
	const traceId = initializeTraceId();
	console.log(`Starting new run with trace ID: ${traceId}`);

	const idea = await terminal.question("What is your idea for an api?");
	await saveOutput("00-initial-idea", idea);

	const plan = await generatePlan(idea);
	console.log(plan);

	await saveOutput("01-initial-plan", plan);

	const dbSchema = await generateSchema(plan.databaseSchema);

	await saveOutput("02-db-schema.ts", dbSchema.dbSchemaTs);

	const apiRoutes = await generateApiRoutes({
		dbSchema: dbSchema.dbSchemaTs,
		apiPlan: plan.apiRoutes,
	});

	await saveOutput("03-api-routes.ts", apiRoutes.indexTs);

	// TODO (parallel)
	// - Create seed.ts
	// - Create index.ts
	// - [optional] Modify wrangler.toml
	// - [optional] Packages
	//   * Modify package.json

	await visualizeTrace(traceId);

	console.log(`Run completed. Trace ID: ${getCurrentTraceId()}`);
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
