/**
 * Field Format Specifications - Empirical Testing Results
 * 
 * This file contains hardcoded format specifications for Twenty CRM field types.
 * These specifications are based on empirical testing (see tests/test-all-field-formats.js).
 * 
 * Why hardcoded?
 * - Twenty's OpenAPI provides only generic format hints (e.g., "date-time", "uuid")
 * - The Metadata API doesn't expose input format specifications
 * - GraphQL introspection doesn't include format patterns
 * - Therefore, we determined actual behavior through systematic testing
 * 
 * @see specs/003-get-schema-operation/FIELD_FORMAT_SPECIFICATIONS.md
 * @see tests/format-test-results.json
 */

export interface FieldFormatSpec {
	/** Human-readable pattern description */
	pattern: string;
	/** Concrete example value in the correct format */
	example: any;
	/** Brief description of the format */
	description: string;
	/** List of accepted input format variations */
	accepts?: string[];
	/** Description of what format is always returned */
	returns?: string;
	/** Validation behavior (strict/flexible/none) */
	validation: 'strict' | 'flexible' | 'none';
	/** Critical notes about format behavior */
	criticalNotes?: string[];
	/** Additional helpful notes */
	notes?: string[];
}

/**
 * Field Format Specifications Map
 * 
 * Each field type has detailed format information derived from empirical testing.
 */
export const FIELD_FORMAT_SPECIFICATIONS: Record<string, FieldFormatSpec> = {
	// ============================================================================
	// DATE & TIME TYPES
	// ============================================================================

	DATE_TIME: {
		pattern: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
		example: '2025-10-16T19:28:45.790Z',
		description: 'ISO 8601 timestamp with milliseconds and UTC timezone',
		accepts: [
			'ISO 8601 with milliseconds: 2025-10-16T19:28:45.790Z',
			'ISO 8601 without milliseconds: 2025-10-16T12:00:00Z',
			'ISO 8601 with timezone offset: 2025-10-16T12:00:00+00:00',
			'ISO 8601 without timezone: 2025-10-16T12:00:00 (assumes UTC)',
			'Date only: 2025-10-16 (converts to midnight UTC)',
		],
		returns: 'Always returns YYYY-MM-DDTHH:mm:ss.SSSZ format with UTC timezone',
		validation: 'flexible',
		notes: [
			'Input is flexible - accepts various ISO 8601 formats',
			'Output is consistent - always includes milliseconds and Z timezone',
			'Date-only input is converted to midnight UTC',
		],
	},

	DATE: {
		pattern: 'YYYY-MM-DD (stored as YYYY-MM-DDTHH:mm:ss.SSSZ)',
		example: '2025-10-16',
		description: 'Date without time (stored as midnight UTC timestamp)',
		accepts: [
			'Date only: 2025-10-16',
			'Full ISO 8601 timestamp (time portion ignored in display)',
		],
		returns: 'Returns full timestamp YYYY-MM-DDTHH:mm:ss.SSSZ (display format may differ)',
		validation: 'flexible',
		notes: [
			'DATE fields are stored as DATE_TIME internally (DateTime scalar in GraphQL)',
			'Difference from DATE_TIME is display format only, not storage format',
			'Input date-only format recommended for clarity',
			'Time portion set to 00:00:00.000Z if not provided',
		],
	},

	// ============================================================================
	// CURRENCY TYPE
	// ============================================================================

	CURRENCY: {
		pattern: '{ amountMicros: string, currencyCode: string }',
		example: { amountMicros: '1000000', currencyCode: 'USD' },
		description: 'Currency amount in micros (millionths) with currency code',
		accepts: [
			'Object with integer amountMicros: { amountMicros: 1000000, currencyCode: "USD" }',
			'Object with decimal amountMicros: { amountMicros: 1000000.50, currencyCode: "USD" }',
			'Object with string amountMicros: { amountMicros: "1000000", currencyCode: "USD" }',
			'Different currency codes: { amountMicros: 1000000, currencyCode: "EUR" }',
			'Plain numbers: 1000000 (auto-wrapped with default currency)',
			'Null values accepted',
		],
		returns: 'Always returns { amountMicros: "string", currencyCode: "string" }',
		validation: 'none',
		criticalNotes: [
			'⚠️ amountMicros is returned as STRING, not number',
			'Despite being a numeric value, Twenty stores/returns amountMicros as string',
			'1 unit = 1,000,000 micros (e.g., $1.00 = 1000000 micros)',
		],
		notes: [
			'Extremely flexible input - accepts integers, decimals, strings, plain numbers',
			'No validation on amountMicros value',
			'No validation on currencyCode (accepts any string)',
			'For display: divide amountMicros by 1,000,000 to get decimal amount',
		],
	},

	// ============================================================================
	// CONTACT INFO TYPES
	// ============================================================================

	EMAILS: {
		pattern: '{ primaryEmail: string, additionalEmails: string[] | null }',
		example: {
			primaryEmail: 'user@example.com',
			additionalEmails: ['alt1@example.com', 'alt2@example.com'],
		},
		description: 'Primary email and optional additional emails',
		accepts: [
			'Valid email objects: { primaryEmail: "user@example.com", additionalEmails: [] }',
			'With additional emails: { primaryEmail: "user@example.com", additionalEmails: ["alt@example.com"] }',
			'Empty primary email: { primaryEmail: "", additionalEmails: [] }',
			'Plain strings: "user@example.com" (auto-wrapped)',
			'⚠️ INVALID email formats: { primaryEmail: "notanemail", additionalEmails: [] }',
		],
		returns: '{ primaryEmail: string, additionalEmails: string[] | null }',
		validation: 'none',
		criticalNotes: [
			'⚠️ NO EMAIL VALIDATION - accepts any string as email',
			'Twenty does not validate email format at all',
			'Invalid formats like "notanemail" are accepted',
		],
		notes: [
			'No RFC 5322 email validation performed',
			'Applications should validate email format before sending',
			'Empty strings accepted for primaryEmail',
			'additionalEmails can be null or empty array',
		],
	},

	PHONES: {
		pattern: '{ primaryPhoneNumber: string, primaryPhoneCountryCode: string, primaryPhoneCallingCode: string, additionalPhones: object[] | null }',
		example: {
			primaryPhoneNumber: '2345678901',
			primaryPhoneCountryCode: 'US',
			primaryPhoneCallingCode: '+1',
			additionalPhones: null,
		},
		description: 'Primary phone with country information and optional additional phones',
		accepts: [
			'Complete phone object: { primaryPhoneNumber: "2345678901", primaryPhoneCountryCode: "US", primaryPhoneCallingCode: "+1", additionalPhones: null }',
			'With additional phones: { ..., additionalPhones: [{ number: "9876543210", countryCode: "US", callingCode: "+1" }] }',
			'Phone number with + prefix: { primaryPhoneNumber: "+12345678901", ... } (+ will be stripped)',
			'Phone number without + prefix: { primaryPhoneNumber: "2345678901", ... }',
		],
		returns: '{ primaryPhoneNumber: string (no +), primaryPhoneCountryCode: string, primaryPhoneCallingCode: string (with +), additionalPhones: object[] | null }',
		validation: 'flexible',
		criticalNotes: [
			'⚠️ Requires country code fields - minimal format (number only) REJECTED',
			'⚠️ Strips + prefix from primaryPhoneNumber but keeps it in primaryPhoneCallingCode',
		],
		notes: [
			'Must provide primaryPhoneCountryCode (e.g., "US")',
			'Must provide primaryPhoneCallingCode (e.g., "+1")',
			'Phone number normalization: + removed from number, kept in calling code',
			'Minimal format { primaryPhoneNumber: "1234567890" } is REJECTED',
		],
	},

	LINKS: {
		pattern: '{ primaryLinkLabel: string, primaryLinkUrl: string, secondaryLinks: object[] | null }',
		example: {
			primaryLinkLabel: 'Website',
			primaryLinkUrl: 'https://example.com',
			secondaryLinks: null,
		},
		description: 'Primary link with label/URL and optional secondary links',
		accepts: [
			'Valid HTTPS URL: { primaryLinkLabel: "Website", primaryLinkUrl: "https://example.com", secondaryLinks: null }',
			'Valid HTTP URL: { primaryLinkLabel: "Site", primaryLinkUrl: "http://example.com", secondaryLinks: null }',
			'With secondary links: { ..., secondaryLinks: [{ label: "Blog", url: "https://blog.example.com" }] }',
			'Empty URL: { primaryLinkLabel: "Website", primaryLinkUrl: "", secondaryLinks: null }',
		],
		returns: '{ primaryLinkLabel: string, primaryLinkUrl: string, secondaryLinks: object[] | null }',
		validation: 'strict',
		criticalNotes: [
			'⚠️ DOES validate URL format (unlike EMAILS)',
			'Invalid URLs like "not-a-url" are REJECTED with 400 error',
		],
		notes: [
			'URL validation enforced',
			'Must be valid http:// or https:// URL',
			'Empty strings accepted for primaryLinkUrl',
			'secondaryLinks can be null or array of link objects',
		],
	},

	// ============================================================================
	// STRUCTURED DATA TYPES
	// ============================================================================

	FULL_NAME: {
		pattern: '{ firstName: string, lastName: string }',
		example: { firstName: 'John', lastName: 'Doe' },
		description: 'Person name with separate first and last name fields',
		accepts: [
			'Complete name: { firstName: "John", lastName: "Doe" }',
			'First name only: { firstName: "John", lastName: "" }',
			'Last name only: { firstName: "", lastName: "Doe" }',
			'Both empty: { firstName: "", lastName: "" }',
			'Null values: { firstName: null, lastName: null }',
			'Plain string: "John Doe" (auto-wrapped, may not parse correctly)',
		],
		returns: '{ firstName: string | null, lastName: string | null }',
		validation: 'none',
		notes: [
			'Extremely flexible - no validation',
			'Accepts plain strings but returns firstName/lastName as null',
			'Empty strings accepted',
			'Null values accepted',
			'Best practice: Always provide structured object',
		],
	},

	ADDRESS: {
		pattern: '{ addressStreet1: string, addressStreet2: string, addressCity: string, addressState: string, addressPostcode: string, addressCountry: string, addressLat: string, addressLng: string }',
		example: {
			addressStreet1: '123 Main St',
			addressStreet2: 'Apt 4B',
			addressCity: 'San Francisco',
			addressState: 'CA',
			addressPostcode: '94102',
			addressCountry: 'USA',
			addressLat: '37.7749',
			addressLng: '-122.4194',
		},
		description: 'Complete address with street, city, state, postal, country, and optional coordinates',
		accepts: [
			'Complete address with all fields populated',
			'Minimal address: only addressStreet1 and addressCity required',
			'Coordinates as numbers: { ..., addressLat: 37.7749, addressLng: -122.4194 }',
			'Coordinates as strings: { ..., addressLat: "37.7749", addressLng: "-122.4194" }',
			'All null values: { addressStreet1: null, addressStreet2: null, ... }',
			'Empty strings: { addressStreet1: "", addressStreet2: "", ... }',
		],
		returns: 'All fields as strings, coordinates returned as STRINGS not numbers',
		validation: 'none',
		criticalNotes: [
			'⚠️ addressLat and addressLng returned as STRINGS, not numbers',
			'Even if you send coordinates as numbers, they are returned as strings',
		],
		notes: [
			'No validation on any field',
			'No validation on coordinate values (accepts any string/number)',
			'Empty strings and null values accepted',
			'Applications should validate coordinates if using for mapping',
			'Sub-fields: addressStreet1, addressStreet2, addressCity, addressState, addressPostcode, addressCountry, addressLat, addressLng',
		],
	},

	// ============================================================================
	// GENERIC DATA TYPES
	// ============================================================================

	ARRAY: {
		pattern: 'string[] | number[] | object[]',
		example: ['item1', 'item2', 'item3'],
		description: 'Array of any type (strings, numbers, objects)',
		accepts: [
			'String array: ["item1", "item2", "item3"]',
			'Number array: [1, 2, 3]',
			'Object array: [{ key: "value" }, { key: "value2" }]',
			'Empty array: []',
			'Null value',
		],
		returns: 'Returns array exactly as stored (preserves item types)',
		validation: 'flexible',
		criticalNotes: [
			'⚠️ Must be an array - single string REJECTED',
			'Single values like "item1" are rejected with 500 error',
		],
		notes: [
			'No validation on array item types',
			'Arrays can contain strings, numbers, objects, or mixed types',
			'Empty arrays accepted',
			'Must send as array, not single value',
		],
	},

	RAW_JSON: {
		pattern: 'Valid JSON object, array, number, boolean, or null',
		example: { key: 'value', nested: { count: 42, active: true } },
		description: 'Arbitrary JSON data structure',
		accepts: [
			'JSON object: { key: "value", number: 42 }',
			'Nested objects: { nested: { deep: { value: "test" } } }',
			'JSON array: [1, 2, 3, "string"]',
			'Primitive values: 42, true, false',
			'Null value',
			'Empty object: {}',
		],
		returns: 'Returns exactly as stored (preserves structure)',
		validation: 'flexible',
		criticalNotes: [
			'⚠️ Plain strings REJECTED - must be valid JSON structure',
			'String values like "just a string" are rejected',
		],
		notes: [
			'Validates JSON structure (object, array, primitive, null)',
			'Does not accept plain strings as value',
			'Nested structures preserved exactly',
			'Empty objects and arrays accepted',
		],
	},

	NUMBER: {
		pattern: 'Integer or decimal number',
		example: 42,
		description: 'Numeric value (integer or floating point)',
		accepts: [
			'Positive integer: 42',
			'Negative integer: -42',
			'Zero: 0',
			'Large number: 9999999999',
			'Decimal number: 42.5',
			'String number: "123" (auto-converted)',
			'Null value',
		],
		returns: 'Returns as number (not string)',
		validation: 'none',
		notes: [
			'Extremely flexible - no validation',
			'Accepts integers, decimals, large numbers',
			'String numbers auto-converted to number type',
			'Decimals preserved (not rounded to integer)',
			'Null values accepted',
		],
	},

	// ============================================================================
	// ENUM TYPES
	// ============================================================================

	RATING: {
		pattern: '"RATING_1" | "RATING_2" | "RATING_3" | "RATING_4" | "RATING_5" | null',
		example: 'RATING_3',
		description: 'Rating from 1 to 5 stars (enum values)',
		accepts: [
			'RATING_1 (1 star)',
			'RATING_2 (2 stars)',
			'RATING_3 (3 stars)',
			'RATING_4 (4 stars)',
			'RATING_5 (5 stars)',
			'Null value',
		],
		returns: 'Returns enum string value or null',
		validation: 'strict',
		criticalNotes: [
			'⚠️ STRICT enum validation - invalid values REJECTED',
			'Must use enum string values (RATING_1 to RATING_5), NOT numeric values',
			'Numbers like 3 are REJECTED (must be "RATING_3")',
			'Out of range values (RATING_0, RATING_6) REJECTED with 400 error',
		],
		notes: [
			'Valid values: RATING_1, RATING_2, RATING_3, RATING_4, RATING_5',
			'Invalid enum values rejected with BadRequestException',
			'Cannot use numeric values (1, 2, 3, etc.) - must be enum strings',
			'Null is valid (unrated)',
		],
	},

	MULTI_SELECT: {
		pattern: 'string[] (array of enum values)',
		example: ['OPTION_1', 'OPTION_3', 'OPTION_5'],
		description: 'Multiple selection from predefined options (enum array)',
		accepts: [
			'Single value: ["OPTION_1"]',
			'Multiple values: ["OPTION_1", "OPTION_3", "OPTION_5"]',
			'All values: ["OPTION_1", "OPTION_2", "OPTION_3", "OPTION_4", "OPTION_5"]',
			'Empty array: []',
			'Null value',
		],
		returns: 'Returns array of enum string values or null',
		validation: 'strict',
		criticalNotes: [
			'⚠️ STRICT enum + array validation',
			'Must be an array - single string like "OPTION_1" REJECTED with 500 error',
			'Invalid enum values REJECTED with 400 error',
			'Mixed valid/invalid values REJECTED (all or nothing)',
		],
		notes: [
			'Must be array format, not single string',
			'All values must be valid enum options',
			'Invalid values cause entire update to fail',
			'Empty arrays accepted',
			'Null is valid (no selections)',
			'Valid options are defined per field in database schema',
		],
	},

	// ============================================================================
	// IDENTIFIER TYPES
	// ============================================================================

	UUID: {
		pattern: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
		example: '114642b9-b8c4-4ff1-ac81-3da1092cd03d',
		description: 'UUID version 4 (universally unique identifier)',
		validation: 'strict',
		notes: [
			'Standard UUID v4 format',
			'Twenty validates UUID format on input',
			'Used for entity identifiers and references',
			'Cannot be manually set in most cases (auto-generated)',
		],
	},

	// ============================================================================
	// SIMPLE TYPES (No special format requirements)
	// ============================================================================

	TEXT: {
		pattern: 'string',
		example: 'Any text string',
		description: 'Plain text field',
		validation: 'none',
		notes: ['Accepts any string value', 'No length validation by default'],
	},

	BOOLEAN: {
		pattern: 'true | false',
		example: true,
		description: 'Boolean true/false value',
		validation: 'none',
		notes: ['Accepts true, false, or null', 'No automatic type coercion from strings'],
	},

	// ============================================================================
	// RELATION TYPES
	// ============================================================================

	RELATION: {
		pattern: 'Related record ID or IDs',
		example: { id: '114642b9-b8c4-4ff1-ac81-3da1092cd03d' },
		description: 'Reference to related record(s)',
		validation: 'flexible',
		notes: [
			'Format depends on relation type (one-to-one, one-to-many, many-to-many)',
			'Typically uses UUID references',
			'Query metadata for specific relation details',
		],
	},
};

/**
 * Get format specification for a field type
 * 
 * @param fieldType - Twenty field type (e.g., "DATE_TIME", "CURRENCY")
 * @returns Format specification or undefined if not found
 */
export function getFormatSpec(fieldType: string): FieldFormatSpec | undefined {
	return FIELD_FORMAT_SPECIFICATIONS[fieldType];
}

/**
 * Check if a field type has detailed format specifications
 * 
 * @param fieldType - Twenty field type
 * @returns True if format spec exists
 */
export function hasFormatSpec(fieldType: string): boolean {
	return fieldType in FIELD_FORMAT_SPECIFICATIONS;
}

/**
 * Get format specification with fallback for unknown types
 * 
 * @param fieldType - Twenty field type
 * @returns Format specification (generic spec if type unknown)
 */
export function getFormatSpecWithFallback(fieldType: string): FieldFormatSpec {
	return (
		FIELD_FORMAT_SPECIFICATIONS[fieldType] || {
			pattern: 'Varies by field type',
			example: null,
			description: `${fieldType} field (format details not yet documented)`,
			validation: 'flexible',
			notes: [
				'Empirical format specification not yet available for this field type',
				'Consult Twenty documentation or test with sample data',
			],
		}
	);
}
