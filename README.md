![Swarm Logo](https://github.com/openai/swarm/raw/main/assets/logo.png)

# Swarm in Node.js (experimental, educational)

The Node.js / Typescript translation for [OpenAI Swarm in Python](https://github.com/openai/swarm). Check the original repo for agent background the framework design.

An educational framework exploring ergonomic, lightweight multi-agent orchestration in Node.js.

> [!WARNING]
> Swarm Node.js is currently an experimental sample framework intended to explore ergonomic interfaces for multi-agent systems. It is not intended to be used in production, and therefore has no official support. (This also means we will not be reviewing PRs or issues!)
>
> The primary goal of Swarm Node.js is to showcase the handoff & routines patterns explored in the [Orchestrating Agents: Handoffs & Routines](https://cookbook.openai.com/examples/orchestrating_agents) cookbook. It is not meant as a standalone library, and is primarily for educational purposes.

## Install

Requires Node.js 14+

```shell
npm install git+https://github.com/xianminx/swarm-node.git
```

or

```shell
yarn add git+https://github.com/xianminx/swarm-node.git
```

## Usage

```typescript
import { Swarm, Agent } from 'swarm';

const client = new Swarm();

function transferToAgentB() {
    return agentB;
}

const agentA = new Agent({
    name: "Agent A",
    instructions: "You are a helpful agent.",
    functions: [transferToAgentB],
});

const agentB = new Agent({
    name: "Agent B",
    instructions: "Only speak in Haikus.",
});

async function main() {
    const response = await client.run({
        agent: agentA,
        messages: [{ role: "user", content: "I want to talk to agent B." }],
    });

    console.log(response.messages[response.messages.length - 1].content);
}

main();
```

```
Hope glimmers brightly,
New paths converge gracefully,
What can I assist?
```

## Table of Contents

- [Overview](#overview)
- [Examples](#examples)
- [Documentation](#documentation)
  - [Running Swarm](#running-swarm)
  - [Agents](#agents)
  - [Functions](#functions)
  - [Streaming](#streaming)
- [Evaluations](#evaluations)
- [Utils](#utils)

# Overview

Swarm focuses on making agent **coordination** and **execution** lightweight, highly controllable, and easily testable.

It accomplishes this through two primitive abstractions: `Agent`s and **handoffs**. An `Agent` encompasses `instructions` and `tools`, and can at any point choose to hand off a conversation to another `Agent`.

These primitives are powerful enough to express rich dynamics between tools and networks of agents, allowing you to build scalable, real-world solutions while avoiding a steep learning curve.

> [!NOTE]
> Swarm Agents are not related to Assistants in the Assistants API. They are named similarly for convenience, but are otherwise completely unrelated. Swarm is entirely powered by the Chat Completions API and is hence stateless between calls.

# Examples
The `/examples` is a typescript translation of corresponding python version.

Check out `/examples` for inspiration! Learn more about each one in its README.

- `basic`: Simple examples of fundamentals like setup, function calling, handoffs, and context variables
- `triage_agent`: Simple example of setting up a basic triage step to hand off to the right agent
- `weather_agent`: Simple example of function calling
- `airline`: A multi-agent setup for handling different customer service requests in an airline context.
- `support_bot`: A customer service bot which includes a user interface agent and a help center agent with several tools
- `personal_shopper`: A personal shopping agent that can help with making sales and refunding orders

# Documentation

![Swarm Diagram](https://github.com/openai/swarm/raw/main/assets/swarm_diagram.png)

## Running Swarm

Start by instantiating a Swarm client (which internally just instantiates an `OpenAI` client).

```typescript
import { Swarm } from 'swarm';

const client = new Swarm();
```

### `client.run()`

Swarm's `run()` function is analogous to the `chat.completions.create()` function in the Chat Completions API – it takes `messages` and returns `messages` and saves no state between calls. Importantly, however, it also handles Agent function execution, hand-offs, context variable references, and can take multiple turns before returning to the user.

[... Detailed documentation on client.run() ...]

## Agents

[... Detailed documentation on Agents ...]

## Functions

[... Detailed documentation on Functions ...]

## Streaming

[... Detailed documentation on Streaming ...]

# Evaluations

Evaluations are crucial to any project, and we encourage developers to bring their own eval suites to test the performance of their swarms. For reference, we have some examples for how to eval swarm in the `airline`, `weather_agent` and `triage_agent` quickstart examples. See the READMEs for more details.

# Utils

Use the `runDemoLoop` to test out your swarm! This will run a REPL on your command line. Supports streaming.

```typescript
import { runDemoLoop } from 'swarm/utils';
...
runDemoLoop(agent, { stream: true });
```

# Core Contributors

- [List of contributors]
