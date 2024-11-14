import { Swarm, Agent } from 'swarm';
import { logUserMessage, logAssistantMessage } from '../util';

const client = new Swarm();

const agent = new Agent({
    name: "Agent",
    instructions: "You are a helpful agent.",
});

const messages = [{ role: "user", content: "Hi!" } as const];

async function main() {
    logUserMessage(`${messages[0].content}`);
    const response = await client.run(
        agent,
        messages,
        {},  // context_variables
        null, // model_override
        false, // stream
        true  // debug
    );

    logAssistantMessage(`${response.messages[response.messages.length - 1].content}`);

    // in stream mode, the response is streamed to the client
    let stream = await client.run(agent, messages, {}, null, true, true);
    let streamResponse = "";
    for await (const chunk of stream) {
        streamResponse = (JSON.stringify(chunk) || "") + "\n";
        logAssistantMessage(streamResponse);
    }
}

main();
