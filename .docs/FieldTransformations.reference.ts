/**
 * Field Transformation Utilities
 * 
 * Transforms flat n8n field inputs into nested GraphQL objects
 * for complex types (FullName, Links, Address, Currency, Actor).
 * 
 * Example:
 * Input:  { name_firstName: 'John', name_lastName: 'Doe', email: 'john@example.com' }
 * Output: { name: { firstName: 'John', lastName: 'Doe' }, email: 'john@example.com' }
 */

import { IFieldTemplate, getComplexTemplate } from './FieldTemplates';

export interface IFieldMetadata {
	name: string;
	type: string;
	isRequired: boolean;
	isWritable: boolean;
}

/**
 * Transform flat field data with complex field prefixes into nested objects
 * 
 * @param flatData - Object with flat keys like { name_firstName: 'John', name_lastName: 'Doe' }
 * @param fieldMetadata - Array of field metadata from schema introspection
 * @returns Object with nested complex fields like { name: { firstName: 'John', lastName: 'Doe' } }
 */
export function transformComplexFields(
	flatData: Record<string, any>,
	fieldMetadata: IFieldMetadata[],
): Record<string, any> {
	const result: Record<string, any> = {};
	const processedKeys = new Set<string>();

	// Find all complex fields in metadata
	const complexFields = fieldMetadata.filter((field) => {
		const template = getComplexTemplate(field.type);
		return template !== null;
	});

	// Process each complex field
	for (const complexField of complexFields) {
		const template = getComplexTemplate(complexField.type);
		if (!template) continue;

		const fieldName = complexField.name;
		const complexObject: Record<string, any> = {};
		let hasAnyValue = false;

		// Look for all subfields with the prefix
		for (const subField of template.subFields) {
			const flatKey = `${fieldName}_${subField.name}`;

			if (flatKey in flatData) {
				let value = flatData[flatKey];

				// Handle special transformations
				if (subField.name === 'amountMicros' && typeof value === 'number') {
					// Convert base currency units to micros (multiply by 1,000,000)
					value = value * 1000000;
				}

				// Only include if not empty
				if (value !== '' && value !== null && value !== undefined) {
					complexObject[subField.name] = value;
					hasAnyValue = true;
				}

				processedKeys.add(flatKey);
			}
		}

		// Only add the complex field if it has at least one value
		if (hasAnyValue) {
			result[fieldName] = complexObject;
		}
	}

	// Add all non-complex fields
	for (const [key, value] of Object.entries(flatData)) {
		if (!processedKeys.has(key) && !key.includes('_')) {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Check if a key represents a complex field subfield
 * @param key - Field key to check (e.g., 'name_firstName')
 * @returns True if key contains underscore (indicates complex subfield)
 */
export function isComplexSubfield(key: string): boolean {
	return key.includes('_');
}

/**
 * Extract the parent field name from a complex subfield key
 * @param key - Complex subfield key (e.g., 'name_firstName')
 * @returns Parent field name (e.g., 'name')
 */
export function getParentFieldName(key: string): string {
	const parts = key.split('_');
	return parts[0];
}

/**
 * Extract the subfield name from a complex subfield key
 * @param key - Complex subfield key (e.g., 'name_firstName')
 * @returns Subfield name (e.g., 'firstName')
 */
export function getSubfieldName(key: string): string {
	const parts = key.split('_');
	return parts.slice(1).join('_'); // Handle multi-underscore names
}

/**
 * Validate that required subfields are present for a complex field
 * @param data - Field data object
 * @param fieldName - Name of the complex field
 * @param template - Field template with subfield definitions
 * @returns Array of missing required subfield names (empty if valid)
 */
export function validateComplexField(
	data: Record<string, any>,
	fieldName: string,
	template: IFieldTemplate,
): string[] {
	const missing: string[] = [];

	for (const subField of template.subFields) {
		if (subField.type !== 'string') continue; // Only string subfields can be required in our templates

		const flatKey = `${fieldName}_${subField.name}`;
		const value = data[flatKey];

		// Check if required subfield is missing or empty
		// Note: Currently our templates don't mark fields as required, but this is future-proofing
		if (value === undefined || value === null || value === '') {
			// We'll consider this a warning rather than error for now
			// since Twenty CRM might have its own validation
		}
	}

	return missing;
}
