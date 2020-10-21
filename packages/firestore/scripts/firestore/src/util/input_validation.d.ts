import { ResourcePath } from '../model/path';
/** Types accepted by validateType() and related methods for validation. */
export declare type ValidationType = 'undefined' | 'object' | 'function' | 'boolean' | 'number' | 'string' | 'non-empty string';
/**
 * Validates that no arguments were passed in the invocation of functionName.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateNoArgs('myFunction', arguments);
 */
export declare function validateNoArgs(functionName: string, args: IArguments): void;
/**
 * Validates the invocation of functionName has the exact number of arguments.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateExactNumberOfArgs('myFunction', arguments, 2);
 */
export declare function validateExactNumberOfArgs(functionName: string, args: ArrayLike<unknown>, numberOfArgs: number): void;
/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */
export declare function validateAtLeastNumberOfArgs(functionName: string, args: IArguments, minNumberOfArgs: number): void;
/**
 * Validates the invocation of functionName has number of arguments between
 * the values provided.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
 */
export declare function validateBetweenNumberOfArgs(functionName: string, args: IArguments, minNumberOfArgs: number, maxNumberOfArgs: number): void;
/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
export declare function validateNamedArrayAtLeastNumberOfElements<T>(functionName: string, value: T[], name: string, minNumberOfElements: number): void;
/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */
export declare function validateArgType(functionName: string, type: ValidationType, position: number, argument: unknown): void;
/**
 * Validates the provided argument has the native JavaScript type using
 * typeof checks or is undefined.
 */
export declare function validateOptionalArgType(functionName: string, type: ValidationType, position: number, argument: unknown): void;
/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks.
 */
export declare function validateNamedType(functionName: string, type: ValidationType, optionName: string, argument: unknown): void;
/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks or is undefined.
 */
export declare function validateNamedOptionalType(functionName: string, type: ValidationType, optionName: string, argument: unknown): void;
/**
 * Validates that two boolean options are not set at the same time.
 */
export declare function validateIsNotUsedTogether(optionName1: string, argument1: boolean | undefined, optionName2: string, argument2: boolean | undefined): void;
export declare function validateArrayElements<T>(functionName: string, optionName: string, typeDescription: string, argument: T[], validator: (arg0: T) => boolean): void;
export declare function validateOptionalArrayElements<T>(functionName: string, optionName: string, typeDescription: string, argument: T[] | undefined, validator: (arg0: T) => boolean): void;
/**
 * Validates that the provided named option equals one of the expected values.
 */
export declare function validateNamedPropertyEquals<T>(functionName: string, inputName: string, optionName: string, input: T, expected: T[]): void;
/**
 * Validates that the provided named option equals one of the expected values or
 * is undefined.
 */
export declare function validateNamedOptionalPropertyEquals<T>(functionName: string, inputName: string, optionName: string, input: T, expected: T[]): void;
/**
 * Validates that the provided argument is a valid enum.
 *
 * @param functionName Function making the validation call.
 * @param enums Array containing all possible values for the enum.
 * @param position Position of the argument in `functionName`.
 * @param argument Argument to validate.
 * @return The value as T if the argument can be converted.
 */
export declare function validateStringEnum<T>(functionName: string, enums: T[], position: number, argument: unknown): T;
/**
 * Validates that `path` refers to a document (indicated by the fact it contains
 * an even numbers of segments).
 */
export declare function validateDocumentPath(path: ResourcePath): void;
/**
 * Validates that `path` refers to a collection (indicated by the fact it
 * contains an odd numbers of segments).
 */
export declare function validateCollectionPath(path: ResourcePath): void;
/**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */
export declare function isPlainObject(input: unknown): boolean;
/** Returns a string describing the type / value of the provided input. */
export declare function valueDescription(input: unknown): string;
/** Hacky method to try to get the constructor name for an object. */
export declare function tryGetCustomObjectType(input: object): string | null;
/** Validates the provided argument is defined. */
export declare function validateDefined(functionName: string, position: number, argument: unknown): void;
/**
 * Validates the provided positional argument is an object, and its keys and
 * values match the expected keys and types provided in optionTypes.
 */
export declare function validateOptionNames(functionName: string, options: object, optionNames: string[]): void;
/**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */
export declare function invalidClassError(functionName: string, type: string, position: number, argument: unknown): Error;
export declare function validatePositiveNumber(functionName: string, position: number, n: number): void;
