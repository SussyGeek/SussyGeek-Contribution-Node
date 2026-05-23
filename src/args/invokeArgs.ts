import yargs from "yargs";
import { hideBin } from "yargs/helpers";


export const invokeArgs = async () => {
    const args = await yargs(hideBin(process.argv))
        .option("session-id", {
            type: "string"
        })
        .option("institute-id", {
            type: "string"
        })
        .option("mode", {
            choices: ["contribute", "stop", "exit"]
        })
        .parse();

    return {
        args,
        isAutomated: args.instituteId && args.sessionId && args.mode
    };
};