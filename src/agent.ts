import { FunctionTool, ReActAgent } from "llamaindex";
import "./shared";

const sumNumbers = ({ a, b }: { a: number; b: number }) => {
	return `${a + b}`;
};
const tool = FunctionTool.from(sumNumbers, {
	name: "sumNumbers",
	description: "Use this function to sum two numbers",
	parameters: {
		type: "object",
		properties: {
			a: {
				type: "number",
				description: "First number to sum",
			},
			b: {
				type: "number",
				description: "Second number to sum",
			},
		},
		required: ["a", "b"],
	},
});

const tools = [tool];

export async function testAgent() {
	const agent = new ReActAgent({
		tools,
	});

	const response = await agent.chat({
		message: "Add 101 and 303",
	});

	console.log(response);
}
