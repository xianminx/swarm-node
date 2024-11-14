import type { ChatCompletionMessageParam, ChatCompletionToolChoiceOption } from 'openai/resources/chat/completions';

export type AgentFunction = (...args: any[]) => Promise<string | Agent | Record<string, any>>;

export class Agent {
    name: string;
    model: string;
    instructions: string | ((context: Record<string, any>) => string);
    functions: AgentFunction[];
    tool_choice: ChatCompletionToolChoiceOption | undefined;
    parallel_tool_calls: boolean | number;

    constructor({
        name = "Agent",
        model = "gpt-4o-mini",
        instructions = "You are a helpful agent.",
        functions = [],
        tool_choice = undefined,
        parallel_tool_calls = true
    }: Partial<Agent> = {}) {
        this.name = name;
        this.model = model;
        this.instructions = instructions;
        this.functions = functions;
        this.tool_choice = tool_choice;
        this.parallel_tool_calls = parallel_tool_calls;
    }

    static isAgent(obj: any): obj is Agent {
        return obj instanceof Agent;
    }
}

export interface Response {
    messages: ChatCompletionMessageParam[];
    agent: Agent | null;
    context_variables: Record<string, any>;
}

export class Result {
    value: string;
    agent: Agent | null;
    context_variables: Record<string, any>;

    constructor(value: string = "", agent: Agent | null = null, context_variables: Record<string, any> = {}) {
        this.value = value;
        this.agent = agent;
        this.context_variables = context_variables;
    }

    static isResult(obj: any): obj is Result {
        return obj instanceof Result;
    }
}
