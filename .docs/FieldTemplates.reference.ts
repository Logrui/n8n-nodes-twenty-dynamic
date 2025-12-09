/**
 * Field Templates for Complex Object Types
 * 
 * This module provides hardcoded templates for complex GraphQL input types
 * that require nested object structures (FullName, Links, Address, Currency, Actor).
 * 
 * Phase 1 (Template-Based): Use these predefined templates
 * Phase 2 (Dynamic): Replace with introspection-based generation
 */

export interface ISubFieldDefinition {
	name: string;
	displayName: string;
	type: 'string' | 'number' | 'options';
	default: any;
	description?: string;
	options?: Array<{ name: string; value: string }>;
	placeholder?: string;
}

export interface IFieldTemplate {
	complexType: string;
	description: string;
	subFields: ISubFieldDefinition[];
}

/**
 * Template for FullName complex type
 * Used in: Person.name
 */
export const FULL_NAME_TEMPLATE: IFieldTemplate = {
	complexType: 'FullName',
	description: 'Full name with first and last name components',
	subFields: [
		{
			name: 'firstName',
			displayName: 'First Name',
			type: 'string',
			default: '',
			description: 'Given name / first name',
			placeholder: 'John',
		},
		{
			name: 'lastName',
			displayName: 'Last Name',
			type: 'string',
			default: '',
			description: 'Family name / last name',
			placeholder: 'Doe',
		},
	],
};

/**
 * Template for Links complex type
 * Used in: Company.domainName, linkedinLink, xLink, website, cvcWebsite, Person.linkedinLink
 */
export const LINKS_TEMPLATE: IFieldTemplate = {
	complexType: 'Links',
	description: 'URL links with label and URL',
	subFields: [
		{
			name: 'primaryLinkUrl',
			displayName: 'URL',
			type: 'string',
			default: '',
			description: 'The complete URL (e.g., https://example.com)',
			placeholder: 'https://example.com',
		},
		{
			name: 'primaryLinkLabel',
			displayName: 'Label',
			type: 'string',
			default: '',
			description: 'Display label for the URL (e.g., example.com)',
			placeholder: 'example.com',
		},
	],
};

/**
 * Template for Currency complex type
 * Used in: Company.annualRecurringRevenue
 */
export const CURRENCY_TEMPLATE: IFieldTemplate = {
	complexType: 'Currency',
	description: 'Currency amount with code',
	subFields: [
		{
			name: 'amountMicros',
			displayName: 'Amount',
			type: 'number',
			default: 0,
			description: 'Amount in base currency units (will be converted to micros internally)',
			placeholder: '100000',
		},
		{
			name: 'currencyCode',
			displayName: 'Currency',
			type: 'options',
			default: 'USD',
			description: 'Three-letter currency code',
			options: [
				{ name: 'US Dollar (USD)', value: 'USD' },
				{ name: 'Euro (EUR)', value: 'EUR' },
				{ name: 'British Pound (GBP)', value: 'GBP' },
				{ name: 'Japanese Yen (JPY)', value: 'JPY' },
				{ name: 'Canadian Dollar (CAD)', value: 'CAD' },
				{ name: 'Australian Dollar (AUD)', value: 'AUD' },
				{ name: 'Swiss Franc (CHF)', value: 'CHF' },
				{ name: 'Chinese Yuan (CNY)', value: 'CNY' },
			],
		},
	],
};

/**
 * Template for Address complex type
 * Used in: Company.address, Person.address
 */
export const ADDRESS_TEMPLATE: IFieldTemplate = {
	complexType: 'Address',
	description: 'Physical address with street, city, postal code, and country',
	subFields: [
		{
			name: 'addressStreet1',
			displayName: 'Street Address 1',
			type: 'string',
			default: '',
			description: 'Primary street address',
			placeholder: '123 Main Street',
		},
		{
			name: 'addressStreet2',
			displayName: 'Street Address 2',
			type: 'string',
			default: '',
			description: 'Apartment, suite, unit, building, floor, etc',
			placeholder: 'Suite 100',
		},
		{
			name: 'addressCity',
			displayName: 'City',
			type: 'string',
			default: '',
			description: 'City or locality',
			placeholder: 'New York',
		},
		{
			name: 'addressPostcode',
			displayName: 'Postal Code',
			type: 'string',
			default: '',
			description: 'ZIP or postal code',
			placeholder: '10001',
		},
		{
			name: 'addressState',
			displayName: 'State / Province',
			type: 'string',
			default: '',
			description: 'State, province, or region',
			placeholder: 'NY',
		},
		{
			name: 'addressCountry',
			displayName: 'Country',
			type: 'string',
			default: '',
			description: 'Country name or code',
			placeholder: 'United States',
		},
		{
			name: 'addressLat',
			displayName: 'Latitude',
			type: 'number',
			default: null,
			description: 'Geographic latitude (optional)',
			placeholder: '40.7128',
		},
		{
			name: 'addressLng',
			displayName: 'Longitude',
			type: 'number',
			default: null,
			description: 'Geographic longitude (optional)',
			placeholder: '-74.0060',
		},
	],
};

/**
 * Map of GraphQL type names to their templates
 */
export const FIELD_TEMPLATES: Record<string, IFieldTemplate> = {
	FullName: FULL_NAME_TEMPLATE,
	Links: LINKS_TEMPLATE,
	Currency: CURRENCY_TEMPLATE,
	Address: ADDRESS_TEMPLATE,
};

/**
 * Check if a field type has a complex object template
 */
export function hasComplexTemplate(fieldType: string): boolean {
	return fieldType in FIELD_TEMPLATES;
}

/**
 * Get the template for a complex field type
 */
export function getComplexTemplate(fieldType: string): IFieldTemplate | null {
	return FIELD_TEMPLATES[fieldType] || null;
}

/**
 * Get all complex field types that have templates
 */
export function getComplexFieldTypes(): string[] {
	return Object.keys(FIELD_TEMPLATES);
}
