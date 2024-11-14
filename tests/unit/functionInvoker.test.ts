import { invokeWithNamedParams, invokeWithOrderedArgs, getFormalParameters } from '../../src/utils/functionInvoker';
import { describe, it, expect } from '@jest/globals';

describe('functionInvoker', () => {
    // Test context with various function types
    const testContext = {
        // Regular function
        greet: function(name: string, age?: number) {
            return `Hello ${name}${age ? `, you are ${age}` : ''}`;
        },

        // Arrow function
        add: (a: number, b: number = 0) => a + b,

        // Function with destructuring
        processUser: ({ name, age }: { name: string; age: number }) => {
            return `${name} is ${age} years old`;
        },

        // Function with rest parameters
        sum: (...numbers: number[]) => numbers.reduce((a, b) => a + b, 0),

        // Function with complex default values
        configure: (options = { debug: true }) => options.debug,
    };

    describe('getFormalParameters', () => {
        it('should extract parameters from regular function', () => {
            const params = getFormalParameters(testContext.greet);
            expect(params).toEqual([
                { name: 'name', required: true },
                { name: 'age', required: true }
            ]);
        });

        it('should extract parameters from arrow function', () => {
            const params = getFormalParameters(testContext.add);
            const [param1, param2] = params;
            
            expect(param1).toMatchObject({ name: 'a', required: true });
            expect(param2).toMatchObject({ name: 'b', required: false });
            expect(param2.defaultValue).toBeDefined();
        });

        it('should handle destructured parameters', () => {
            const params = getFormalParameters(testContext.processUser);
            expect(params).toEqual([
                { name: 'param', required: true }
            ]);
        });

        it('should handle rest parameters', () => {
            const params = getFormalParameters(testContext.sum);
            expect(params).toEqual([
                { name: 'numbers', required: true }
            ]);
        });

        it('should handle complex default values', () => {
            const params = getFormalParameters(testContext.configure);
            const [param] = params;
            
            expect(param).toMatchObject({ 
                name: 'options', 
                required: false 
            });
            expect(param.defaultValue).toBeDefined();
        });
    });

    describe('invokeWithNamedParams', () => {
        it('should call function with required parameters', () => {
            const result = invokeWithNamedParams('greet', { name: 'John' }, testContext);
            expect(result).toBe('Hello John');
        });

        it('should call function with optional parameters', () => {
            const result = invokeWithNamedParams('greet', { name: 'John', age: 30 }, testContext);
            expect(result).toBe('Hello John, you are 30');
        });

        it('should throw error for missing required parameters', () => {
            expect(() => {
                invokeWithNamedParams('greet', {}, testContext);
            }).toThrow(/Missing required parameters/);
        });

        it('should throw error for non-existent function', () => {
            expect(() => {
                invokeWithNamedParams('nonexistent', {}, testContext);
            }).toThrow(/not found or is not a function/);
        });

        it('should work with default parameters', () => {
            const result = invokeWithNamedParams('add', { a: 5 }, testContext);
            expect(result).toBe(5);
        });

        it('should work with destructured parameters', () => {
            const result = invokeWithNamedParams('processUser', {
                param: { name: 'John', age: 30 }
            }, testContext);
            expect(result).toBe('John is 30 years old');
        });
    });

    describe('invokeWithOrderedArgs', () => {
        it('should call function with ordered arguments', () => {
            const result = invokeWithOrderedArgs('greet', ['John', 30], testContext);
            expect(result).toBe('Hello John, you are 30');
        });

        it('should work with partial arguments', () => {
            const result = invokeWithOrderedArgs('greet', ['John'], testContext);
            expect(result).toBe('Hello John');
        });

        it('should throw error for non-existent function', () => {
            expect(() => {
                invokeWithOrderedArgs('nonexistent', [], testContext);
            }).toThrow(/not found or is not a function/);
        });

        it('should work with rest parameters', () => {
            const result = invokeWithOrderedArgs('sum', [1, 2, 3, 4], testContext);
            expect(result).toBe(10);
        });
    });
}); 