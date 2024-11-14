import OpenAI from "openai";
import type {
    ChatCompletionMessageParam,
    ChatCompletionMessageToolCall,
    ChatCompletionCreateParams,
    ChatCompletion,
    ChatCompletionChunk,
} from "openai/resources/chat/completions";
import { Agent, AgentFunction, Response, Result } from "./types";
import { mergeChunk, functionToJson, debugPrint } from "./util";
import { APIPromise } from "openai/core";
import { Stream } from "openai/streaming";

const __CTX_VARS_NAME__ = "context_variables";

export class Swarm {
    private client: OpenAI;

    constructor(apiKey?: string) {
        this.client = new OpenAI({ apiKey });
    }

    private getChatCompletion(
        agent: Agent,
        history: ChatCompletionMessageParam[],
        contextVariables: Record<string, any>,
        modelOverride: string | null,
        stream: boolean,
        debug: boolean
    ): APIPromise<ChatCompletion> | APIPromise<Stream<ChatCompletionChunk>> {
        const instructions = this.getInstructions(agent, contextVariables);
        const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: instructions }, ...history];
        const tools = this.prepareTools(agent.functions);

        const createParams: ChatCompletionCreateParams = {
            model: modelOverride || agent.model,
            messages,
            tools,
            tool_choice: tools ? agent.tool_choice : undefined,
            stream
        };
        debugPrint(debug, "Getting chat completion for...:", JSON.stringify(createParams, null, 2));
        return this.client.chat.completions.create(createParams) as
            | APIPromise<ChatCompletion>
            | APIPromise<Stream<ChatCompletionChunk>>;
    }

    private getInstructions(agent: Agent, contextVariables: Record<string, any>): string {
        const context = new Proxy(contextVariables, {
            get: (target, prop) => (prop in target ? target[prop as keyof typeof target] : ""),
        });
        return typeof agent.instructions === "function" ? agent.instructions(context) : agent.instructions;
    }

    private prepareTools(functions: AgentFunction[]): ChatCompletionCreateParams["tools"] {
        const tools = functions.map((f) => functionToJson(f));
        tools.forEach((tool) => {
            const params = tool.function?.parameters as any;
            if (params && "properties" in params) {
                delete params.properties[__CTX_VARS_NAME__];
                if (params.required && Array.isArray(params.required)) {
                    const index = params.required.indexOf(__CTX_VARS_NAME__);
                    if (index > -1) {
                        params.required.splice(index, 1);
                    }
                }
            }
        });
        return tools.length > 0 ? tools : undefined;
    }

    private handleFunctionResult(result: any, debug: boolean): Result {
        if (Result.isResult(result)) {
            return result;
        } else if (Agent.isAgent(result)) {
            return {
                value: JSON.stringify({ assistant: result.name }),
                agent: result,
                context_variables: {},
            };
        } else {
            try {
                return { value: String(result), agent: null, context_variables: {} };
            } catch (e) {
                const errorMessage = `Failed to cast response to string: ${result}. Make sure agent functions return a string or Result object. Error: ${e}`;
                debugPrint(debug, errorMessage);
                throw new TypeError(errorMessage);
            }
        }
    }

    private async handleToolCalls(
        toolCalls: ChatCompletionMessageToolCall[],
        functions: AgentFunction[],
        contextVariables: Record<string, any>,
        debug: boolean
    ): Promise<Response> {
        const functionMap = new Map(functions.map((f) => [f.name, f]));
        const partialResponse: Response = { messages: [], agent: null, context_variables: {} };

        for (const toolCall of toolCalls) {
            const name = toolCall.function.name;
            if (!functionMap.has(name)) {
                debugPrint(debug, `Tool ${name} not found in function map.`);
                partialResponse.messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: `Error: Tool ${name} not found.`,
                } as ChatCompletionMessageParam);
                continue;
            }

            const args = JSON.parse(toolCall.function.arguments);
            debugPrint(debug, `Processing tool call: ${name} with arguments ${JSON.stringify(args, null, 2)}`);

            const func = functionMap.get(name)!;
            const funcArgs = this.prepareFunctionArguments(func, args, contextVariables);
            const rawResult = await func(...funcArgs);
            const result = this.handleFunctionResult(rawResult, debug);

            partialResponse.messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name,
                content: result.value,
            } as ChatCompletionMessageParam);
            partialResponse.context_variables = { ...partialResponse.context_variables, ...result.context_variables };
            if (result.agent) partialResponse.agent = result.agent;
        }

        return partialResponse;
    }

    private prepareFunctionArguments(
        func: AgentFunction,
        args: Record<string, any>,
        contextVariables: Record<string, any>
    ): any[] {
        const funcParams =
            func
                .toString()
                .match(/\(([^)]*)\)/)?.[1]
                .split(",")
                .map((p) => p.trim()) || [];

        if (funcParams.length === 1 && funcParams[0] === __CTX_VARS_NAME__) {
            return [contextVariables];
        }

        return funcParams.map((param) => {
            if (param === __CTX_VARS_NAME__) return contextVariables;
            const [paramName] = param.split(":");
            return args[paramName.trim()];
        });
    }

    // Overload for non-streaming case
    run(
        agent: Agent,
        messages: ChatCompletionMessageParam[],
        contextVariables?: Record<string, any>,
        modelOverride?: string | null,
        stream?: false,
        debug?: boolean,
        maxTurns?: number,
        executeTools?: boolean
    ): Promise<Response>;

    // Overload for streaming case
    run(
        agent: Agent,
        messages: ChatCompletionMessageParam[],
        contextVariables?: Record<string, any>,
        modelOverride?: string | null,
        stream?: true,
        debug?: boolean,
        maxTurns?: number,
        executeTools?: boolean
    ): Promise<AsyncGenerator<any, Response, unknown>>;

    async run(
        agent: Agent,
        messages: ChatCompletionMessageParam[],
        contextVariables: Record<string, any> = {},
        modelOverride: string | null = null,
        stream: boolean = false,
        debug: boolean = false,
        maxTurns: number = Infinity,
        executeTools: boolean = true
    ): Promise<Response | AsyncGenerator<any, Response, unknown>> {
        if (stream) {
            return this.runAndStream(agent, messages, contextVariables, modelOverride, debug, maxTurns, executeTools);
        }

        let activeAgent = agent;
        const history = [...messages];
        const initLen = messages.length;

        while (history.length - initLen < maxTurns && activeAgent) {
            const completion: any = await this.getChatCompletion(
                activeAgent,
                history,
                contextVariables,
                modelOverride,
                stream,
                debug
            );

            const message = completion.choices[0].message;
            debugPrint(debug, "Received completion:", JSON.stringify(message, null, 2));
            message.sender = activeAgent.name;
            history.push(JSON.parse(JSON.stringify(message)));

            if (!message.tool_calls || !executeTools) {
                debugPrint(debug, "Ending turn.");
                break;
            }

            const partialResponse = await this.handleToolCalls(
                message.tool_calls,
                activeAgent.functions,
                contextVariables,
                debug
            );

            history.push(...partialResponse.messages);
            contextVariables = { ...contextVariables, ...partialResponse.context_variables };
            if (partialResponse.agent) {
                activeAgent = partialResponse.agent;
            }
        }

        return {
            messages: history.slice(initLen),
            agent: activeAgent,
            context_variables: contextVariables,
        };
    }

    private async *runAndStream(
        agent: Agent,
        messages: ChatCompletionMessageParam[],
        contextVariables: Record<string, any> = {},
        modelOverride: string | null = null,
        debug: boolean = false,
        maxTurns: number = Infinity,
        executeTools: boolean = true
    ): AsyncGenerator<any, Response, unknown> {
        let activeAgent = agent;
        const history = [...messages];
        const initLen = messages.length;

        while (history.length - initLen < maxTurns) {
            let message: any = {
                content: "",
                sender: agent.name,
                role: "assistant",
                function_call: null,
                tool_calls: {},
            };

            const completion = (await this.getChatCompletion(
                activeAgent,
                history,
                contextVariables,
                modelOverride,
                true, // stream
                debug
            )) as Stream<ChatCompletionChunk>;

            yield { delim: "start" };
            for await (const chunk of completion) {
                const delta: any = chunk.choices[0].delta;
                if (delta.role === "assistant") {
                    delta.sender = activeAgent.name;
                }
                yield delta;
                mergeChunk(message, delta);
            }
            yield { delim: "end" };

            message.tool_calls = Object.values(message.tool_calls);
            if (message.tool_calls.length === 0) {
                message.tool_calls = null;
            }
            debugPrint(debug, "Received completion:", message);
            history.push(message);

            if (!message.tool_calls || !executeTools) {
                debugPrint(debug, "Ending turn.");
                break;
            }

            const partialResponse = await this.handleToolCalls(
                message.tool_calls,
                activeAgent.functions,
                contextVariables,
                debug
            );

            history.push(...partialResponse.messages);
            contextVariables = { ...contextVariables, ...partialResponse.context_variables };
            if (partialResponse.agent) {
                activeAgent = partialResponse.agent;
            }
        }

        return {
            messages: history.slice(initLen),
            agent: activeAgent,
            context_variables: contextVariables,
        };
    }
}
