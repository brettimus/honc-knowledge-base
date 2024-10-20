import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";

export const openaiModel = openai("gpt-4o-mini");
export const mistralModel = mistral("mistral-large");

export const activeModel = openaiModel;
