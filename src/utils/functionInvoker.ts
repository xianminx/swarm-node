type AnyFunction = (...args: any[]) => any;
type ParamObject = Record<string, any>;

/**
 * Gets the formal parameter names and their default values from a function's declaration
 * @param func - Function to analyze
 * @returns Array of parameter info {name: string, required: boolean, defaultValue: string | undefined}
 */
function getFormalParameters(func: AnyFunction): Array<{ 
    name: string; 
    required: boolean;
    defaultValue?: string;
}> {
    const funcStr = func.toString();
    
    // Handle arrow functions and regular functions
    const paramMatch = funcStr
        .replace(/[\r\n\s]+/g, ' ')
        .match(/(?:function\s*\w*\s*|\(\s*)\(([^)]*)\)|(?:^|\s)(\([^)]*\)|\w+)\s*=>/);

    // Extract parameters from the match
    let params;
    if (paramMatch) {
        if (paramMatch[1]) {
            // Regular function
            params = paramMatch[1];
        } else if (paramMatch[2]) {
            // Arrow function
            params = paramMatch[2].replace(/^\(|\)$/g, '');
        }
    }
        
    const paramStr = params?.trim() || '';
    if (!paramStr) return [];

    return paramStr.split(',')
        .map(param => param.trim())
        .filter(param => param) // Filter empty strings
        .map(param => {
            // Handle rest parameters
            if (param.startsWith('...')) {
                return {
                    name: param.slice(3),
                    required: true
                };
            }

            // Handle destructuring by checking for object or array pattern
            if (param.includes('{') || param.includes('[')) {
                const hasDefault = param.includes('=');
                const defaultValue = hasDefault ? 
                    param.split('=')[1].trim() : undefined;
                return {
                    name: 'param',
                    required: true,
                    defaultValue
                };
            }

            // Handle optional parameters marked with ?
            if (param.includes('?')) {
                return {
                    name: param.replace('?', '').trim(),
                    required: false
                };
            }

            // Handle regular parameters with default values
            const [fullName, defaultValue] = param.split('=').map(p => p.trim());
            return {
                name: fullName,
                required: !defaultValue,
                defaultValue: defaultValue
            };
        });
}

/**
 * Validates if all required parameters are present in namedParams
 * @param params - Array of parameter info
 * @param providedParams - Object containing provided parameters
 * @throws Error if any required parameter is missing
 */
function validateParameters(
    params: Array<{ name: string; required: boolean }>, 
    providedParams: ParamObject
): void {
    // For destructured parameters, only check if the 'param' object is provided
    if (params.length === 1 && params[0].name === 'param') {
        if (params[0].required && !('param' in providedParams)) {
            throw new Error('Missing required parameter object');
        }
        return;
    }

    const missingParams = params
        .filter(param => param.required && !(param.name in providedParams))
        .map(param => param.name);
    
    if (missingParams.length > 0) {
        const requiredParams = params
            .filter(param => param.required)
            .map(param => param.name);
        const optionalParams = params.filter(p => !p.required).map(p => p.name);
            
        const errorMessage = [
            `Missing required parameters: ${missingParams.join(', ')}`,
            `Required: ${requiredParams.join(', ')}`,
            optionalParams.length ? `Optional: ${optionalParams.join(', ')}` : null,
            `Provided: ${Object.keys(providedParams).join(', ')}`
        ].filter(Boolean).join('\n');

        throw new Error(errorMessage);
    }
}

type FunctionParamInfo = {
    name: string;
    required: boolean;
    defaultValue?: string;
};

function isFunctionType(value: unknown): value is AnyFunction {
    return typeof value === 'function';
}

/**
 * Calls a function using named parameters, automatically matching parameter names
 * @param functionName - Name of the function to call
 * @param namedParams - Object containing named parameters
 * @param context - Object containing the function (default: module.exports)
 * @returns The result of the function call
 * @throws Error if function is not found or if required parameters are missing
 */
function invokeWithNamedParams<T extends AnyFunction>(
    functionName: string, 
    namedParams: ParamObject, 
    context: Record<string, any> = module.exports
): ReturnType<T> {
    const func = context[functionName];
    
    if (!isFunctionType(func)) {
        throw new Error(`Function ${functionName} not found or is not a function`);
    }

    const params = getFormalParameters(func);
    
    // Special handling for destructured parameters
    if (params.length === 1 && params[0].name === 'param') {
        return func.call(null, namedParams.param);
    }
    
    validateParameters(params, namedParams);
    
    const orderedArgs = params.map(param => {
        if (param.name in namedParams) {
            return namedParams[param.name];
        }
        // For parameters with default values, let JavaScript handle them
        return undefined;
    });
    
    return func.apply(null, orderedArgs);
}

/**
 * Calls a function using an ordered array of arguments
 * @param functionName - Name of the function to call
 * @param orderedArgs - Array of arguments in the correct order
 * @param context - Object containing the function (default: module.exports)
 * @returns The result of the function call
 * @throws Error if function is not found
 */
function invokeWithOrderedArgs<T extends AnyFunction>(
    functionName: string,
    orderedArgs: Parameters<T>,
    context: Record<string, any> = module.exports
): ReturnType<T> {
    const func = context[functionName];
    
    if (!isFunctionType(func)) {
        throw new Error(`Function ${functionName} not found or is not a function`);
    }

    return func.apply(null, orderedArgs);
}

export { invokeWithNamedParams, invokeWithOrderedArgs, getFormalParameters }; 