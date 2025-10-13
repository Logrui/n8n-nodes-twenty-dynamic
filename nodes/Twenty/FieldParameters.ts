/**
 * Field Parameter Definitions for Complex Types
 * 
 * This module exports n8n parameter definitions for complex field types.
 * Each complex type has its own set of parameter definitions that are
 * conditionally displayed based on the selected field name.
 */

import { INodeProperties } from 'n8n-workflow';

/**
 * FullName field parameters
 * Used for: name (Person only), pointOfContact
 * Note: Company.name is a simple String, Person.name is a FullName object
 * 
 * IMPORTANT: displayOptions removed because these are children of fixedCollection.
 * n8n does NOT support displayOptions on child parameters of fixedCollection/collection.
 * The field visibility is controlled by the parent fixedCollection's fieldName selection.
 */
export const fullNameFields: INodeProperties[] = [
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		description: 'First name / given name',
		placeholder: 'John',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		description: 'Last name / family name',
		placeholder: 'Doe',
	},
];

/**
 * Links field parameters
 * Used for: domainName, linkedinLink, xLink, website, cvcWebsite
 * 
 * IMPORTANT: displayOptions removed because these are children of fixedCollection.
 * The field visibility is controlled by the parent fixedCollection's fieldName selection.
 */
export const linksFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'primaryLinkUrl',
		type: 'string',
		default: '',
		description: 'The complete URL',
		placeholder: 'https://example.com',
	},
	{
		displayName: 'Label',
		name: 'primaryLinkLabel',
		type: 'string',
		default: '',
		description: 'Display label for the URL',
		placeholder: 'example.com',
	},
];

/**
 * Currency field parameters
 * Used for: annualRecurringRevenue
 * 
 * IMPORTANT: displayOptions removed because these are children of fixedCollection.
 * The field visibility is controlled by the parent fixedCollection's fieldName selection.
 */
export const currencyFields: INodeProperties[] = [
	{
		displayName: 'Amount',
		name: 'currencyAmount',
		type: 'number',
		default: 0,
		description: 'Amount in your currency (will be converted to micros automatically)',
		placeholder: '100000',
	},
	{
		displayName: 'Currency Code',
		name: 'currencyCode',
		type: 'options',
		options: [
			{ name: 'Australian Dollar (AUD)', value: 'AUD' },
			{ name: 'British Pound (GBP)', value: 'GBP' },
			{ name: 'Canadian Dollar (CAD)', value: 'CAD' },
			{ name: 'Chinese Yuan (CNY)', value: 'CNY' },
			{ name: 'Euro (EUR)', value: 'EUR' },
			{ name: 'Japanese Yen (JPY)', value: 'JPY' },
			{ name: 'Swiss Franc (CHF)', value: 'CHF' },
			{ name: 'US Dollar (USD)', value: 'USD' },
		],
		default: 'USD',
		description: 'Three-letter currency code',
	},
];

/**
 * Address field parameters
 * Used for: address
 * 
 * IMPORTANT: displayOptions removed because these are children of fixedCollection.
 * The field visibility is controlled by the parent fixedCollection's fieldName selection.
 */
export const addressFields: INodeProperties[] = [
	{
		displayName: 'Street Address 1',
		name: 'addressStreet1',
		type: 'string',
		default: '',
		description: 'Primary street address',
		placeholder: '123 Main Street',
	},
	{
		displayName: 'Street Address 2',
		name: 'addressStreet2',
		type: 'string',
		default: '',
		description: 'Apartment, suite, unit, etc. (optional).',
		placeholder: 'Suite 100',
	},
	{
		displayName: 'City',
		name: 'addressCity',
		type: 'string',
		default: '',
		description: 'City or locality',
		placeholder: 'New York',
	},
	{
		displayName: 'Postal Code',
		name: 'addressPostcode',
		type: 'string',
		default: '',
		description: 'ZIP or postal code',
		placeholder: '10001',
	},
	{
		displayName: 'State / Province',
		name: 'addressState',
		type: 'string',
		default: '',
		description: 'State, province, or region',
		placeholder: 'NY',
	},
	{
		displayName: 'Country',
		name: 'addressCountry',
		type: 'string',
		default: '',
		description: 'Country name',
		placeholder: 'United States',
	},
	{
		displayName: 'Latitude',
		name: 'addressLat',
		type: 'number',
		default: undefined,
		description: 'Geographic latitude (optional)',
		placeholder: '40.7128',
	},
	{
		displayName: 'Longitude',
		name: 'addressLng',
		type: 'number',
		default: undefined,
		description: 'Geographic longitude (optional)',
		placeholder: '-74.0060',
	},
];

/**
 * Emails field parameters
 * Used for: emails (Person), sentTo (UpcomingEvent)
 * Note: Only primaryEmail implemented. additionalEmails (JSON array) not implemented.
 * 
 * IMPORTANT: displayOptions removed because these are children of fixedCollection.
 * The field visibility is controlled by the parent fixedCollection's fieldName selection.
 */
export const emailsFields: INodeProperties[] = [
	{
		displayName: 'Primary Email',
		name: 'primaryEmail',
		type: 'string',
		default: '',
		description: 'Primary email address',
		placeholder: 'john@example.com',
	},
];

/**
 * Phones field parameters
 * Used for: phones (when added to Person or other objects)
 * Note: Only primary phone fields implemented. additionalPhones (JSON array) not implemented.
 * 
 * IMPORTANT: displayOptions removed because these are children of fixedCollection.
 * The field visibility is controlled by the parent fixedCollection's fieldName selection.
 */
export const phonesFields: INodeProperties[] = [
	{
		displayName: 'Primary Phone Number',
		name: 'primaryPhoneNumber',
		type: 'string',
		default: '',
		placeholder: '+1-555-0123',
	},
	{
		displayName: 'Country Code',
		name: 'primaryPhoneCountryCode',
		type: 'string',
		default: '',
		description: 'Two-letter country code (ISO 3166-1 alpha-2)',
		placeholder: 'US',
	},
	{
		displayName: 'Calling Code',
		name: 'primaryPhoneCallingCode',
		type: 'string',
		default: '',
		description: 'International calling code with plus sign',
		placeholder: '+1',
	},
];

/**
 * Get all complex field parameter definitions
 * @returns Array of all complex field parameters
 */
export function getAllComplexFieldParameters(): INodeProperties[] {
	return [
		...fullNameFields,
		...linksFields,
		...currencyFields,
		...addressFields,
		...emailsFields,
		...phonesFields,
	];
}

/**
 * Get list of all field names that use complex templates
 * Note: 'name' is included because it's complex for Person (FullName)
 * For Company, name is simple text, but the FullName fields won't show
 * because they have resource: ['person'] condition
 * @returns Array of field names
 */
export function getComplexFieldNames(): string[] {
	return [
		'name', // Complex for Person, simple for Company (handled by resource condition)
		'domainName',
		'linkedinLink',
		'xLink',
		'website',
		'cvcWebsite',
		'annualRecurringRevenue',
		'address',
	];
}

/**
 * Get complex field names that apply to Person resource
 * Person.name is FullName (firstName/lastName), not simple text
 */
export function getComplexFieldNamesForPerson(): string[] {
	return [
		'name', // FullName for Person
		...getComplexFieldNames(),
	];
}
