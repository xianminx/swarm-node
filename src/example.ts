import { invokeWithNamedParams, invokeWithOrderedArgs, getFormalParameters } from './utils/functionInvoker';

function add(a: number, b: number = 0, c?: number): number {
    console.log(`Adding a: ${a}, b: ${b}, c: ${c}`);
    return a + b + (c ?? 0);
}

export { add };

// Get parameter info
const params = getFormalParameters(add);
console.log('Parameters:', params);
// Output: Parameters: [
//   { name: 'a', required: true },
//   { name: 'b', required: false },
//   { name: 'c', required: false }
// ]

// These will all work:
invokeWithNamedParams<typeof add>('add', { a: 3 });
invokeWithNamedParams<typeof add>('add', { a: 3, b: 4 });
invokeWithNamedParams<typeof add>('add', { a: 3, b: 4, c: 5 });

// This will throw an error:
invokeWithNamedParams<typeof add>('add', { b: 4, c: 5 });
// Error: Missing required parameters: a
// Required: a
// Optional: b, c
// Provided: b, c 