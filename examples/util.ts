
export function logUserMessage(message: string) {
    console.log('\x1b[92m%s\x1b[0m', `User: ${message}`);
}

export function logAssistantMessage(message: string) {
    console.log('\x1b[93m%s\x1b[0m', `Assistant: ${message}`);
}
