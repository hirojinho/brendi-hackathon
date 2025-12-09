import { ValidationError } from './errorHandler.js';

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateString(value: any, fieldName: string, minLength?: number): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }
}

export function validateArray(value: any, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
}

export function validateId(id: any, fieldName: string = 'ID'): void {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new ValidationError(`${fieldName} is required and must be a non-empty string`);
  }
}

export function validateNumber(
  value: any, 
  fieldName: string, 
  options?: { min?: number; max?: number }
): void {
  if (typeof value !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (options?.min !== undefined && value < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min}`);
  }
  if (options?.max !== undefined && value > options.max) {
    throw new ValidationError(`${fieldName} must be at most ${options.max}`);
  }
}

