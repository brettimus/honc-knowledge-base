import chalk from "chalk";
import { visualizeLatestTrace } from "../latest-trace";

const latestTrace = await visualizeLatestTrace();
console.log(chalk.green(`Latest trace: ${latestTrace}`));
