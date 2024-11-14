import { AgentFunction } from './types';
import type { ChatCompletionMessage, ChatCompletionTool } from 'openai/resources/chat/completions';

export function mergeChunk(finalResponse: ChatCompletionMessage, delta: Partial<ChatCompletionMessage>): void {
    if (delta.role) {
        finalResponse.role = delta.role;
    }

    if (delta.content) {
        finalResponse.content = (finalResponse.content ?? '') + delta.content;
    }

    if (delta.tool_calls) {
        finalResponse.tool_calls = [...(finalResponse.tool_calls ?? []), ...delta.tool_calls];
    }
}

export function functionToJson(func: AgentFunction): ChatCompletionTool {
    const funcStr = func.toString();
    const paramMatch = funcStr.match(/\(([^)]*)\)/);
    const bodyMatch = funcStr.match(/{([^}]*)}/);

    if (!paramMatch || !bodyMatch) {
        throw new Error('Unable to parse function');
    }

    const params = paramMatch[1].split(',').map(p => p.trim()).filter(p => p !== '');
    const body = bodyMatch[1].trim();

    const description = body.split('\n')[0].trim().replace(/^\/\/\s*/, '') || func.name;

    const parameters: any = {
        type: 'object',
        properties: {},
        required: [],
    };

    params.forEach(param => {
        const [name, type] = param.split(':').map(p => p.trim());
        parameters.properties[name] = { type: type || 'string' };
        parameters.required.push(name);
    });

    return {
        type: 'function',
        function: {
            name: func.name,
            description,
            parameters,
        },
    };
}

export function debugPrint(debug: boolean, ...args: any[]): void {
    if (!debug) return;
    const timestamp = new Date().toISOString();
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    console.log(`\x1b[97m[\x1b[90m${timestamp}\x1b[97m]\x1b[90m ${message}\x1b[0m`);
}
