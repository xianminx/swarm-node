import { Swarm, Agent } from 'swarm';
import { logAssistantMessage, logUserMessage } from '../util';

const client = new Swarm();

function instructions(context: Record<string, any>): string {
    const name = context.name || "User";
    return `You are a helpful agent. Greet the user by name (${name}).`;
}

async function printAccountDetails(context_variables: Record<string, any>): Promise<string> {
    const userId = context_variables.user_id;
    const name = context_variables.name;
    console.log(`Account Details: ${name} ${userId}`);
    return "Success";
}

const agent = new Agent({
    name: "Agent",
    instructions: instructions,
    functions: [printAccountDetails],
});

const context_variables = { name: "James", user_id: 123 };

async function main() {
    let response = await client.run(
        agent,
        [{ role: "user", content: "Hi!" }],
        context_variables
    );
    logAssistantMessage(response.messages[response.messages.length - 1].content as string);

    response = await client.run(
        agent,
        [{ role: "user", content: "Print my account details!" }],
        context_variables, 
        null,
        false,
        true
    );
    logAssistantMessage(response.messages[response.messages.length - 1].content as string);
}

main();
