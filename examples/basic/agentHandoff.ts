import { Swarm, Agent } from 'swarm';

const client = new Swarm();

const englishAgent = new Agent({
    name: "English Agent",
    instructions: "You only speak English.",
});

const spanishAgent = new Agent({
    name: "Spanish Agent",
    instructions: "You only speak Spanish.",
});

async function transferToSpanishAgent() {
    // Transfer spanish speaking users immediately.
    return spanishAgent;
}

englishAgent.functions.push(transferToSpanishAgent);

const messages = [{ role: "user", content: "Hola. ¿Como estás?" } as const];

async function main() {
    const response = await client.run(
        englishAgent,
        messages
    );

    console.log(response.messages[response.messages.length - 1].content);
}

main();
