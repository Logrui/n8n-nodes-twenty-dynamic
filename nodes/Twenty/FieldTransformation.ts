/**
 * Field Data Transformation
 * 
 * Transforms flat field inputs from n8n UI into nested object structures
 * required by Twenty CRM GraphQL API.
 */

/**
 * Field data interface matching n8n parameter structure
 */
export interface IFieldData {
	fieldName: string;
	fieldType?: string; // 'simple', 'fullName', 'link', 'currency', 'address', 'emails', 'phones'
	fieldValue?: any;
	// FullName fields
	firstName?: string;
	lastName?: string;
	// Links fields
	primaryLinkUrl?: string;
	primaryLinkLabel?: string;
	// Currency fields
	currencyAmount?: number;
	currencyCode?: string;
	// Address fields
	addressStreet1?: string;
	addressStreet2?: string;
	addressCity?: string;
	addressPostcode?: string;
	addressState?: string;
	addressCountry?: string;
	addressLat?: number;
	addressLng?: number;
	// Emails fields
	primaryEmail?: string;
	// Phones fields
	primaryPhoneNumber?: string;
	primaryPhoneCountryCode?: string;
	primaryPhoneCallingCode?: string;
}

/**
 * Transform field data array into GraphQL mutation data
 * Converts flat field inputs into nested object structures
 * 
 * @param fields Array of field data from n8n parameters
 * @param resource The resource type (person, company, etc.) - used for resource-specific transformations (deprecated, use fieldType instead)
 * @returns Object with properly structured field data for GraphQL
 */
export function transformFieldsData(fields: IFieldData[], resource?: string): Record<string, any> {
	const result: Record<string, any> = {};

	for (const field of fields) {
		const fieldName = field.fieldName;
		const fieldType = field.fieldType || 'simple';

		// Transform based on explicitly selected field type
		switch (fieldType) {
			case 'fullName':
				// FullName fields (firstName + lastName)
				const fullName: any = {};
				if (field.firstName) fullName.firstName = field.firstName;
				if (field.lastName) fullName.lastName = field.lastName;
				if (Object.keys(fullName).length > 0) {
					result[fieldName] = fullName;
				}
				break;

			case 'link':
				// Links fields (URL + Label)
				const links: any = {};
				if (field.primaryLinkUrl) links.primaryLinkUrl = field.primaryLinkUrl;
				if (field.primaryLinkLabel) links.primaryLinkLabel = field.primaryLinkLabel;
				if (Object.keys(links).length > 0) {
					result[fieldName] = links;
				}
				break;

			case 'currency':
				// Currency fields (Amount + Currency Code)
				const currency: any = {};
				if (field.currencyAmount !== undefined && field.currencyAmount !== null) {
					// Convert amount to micros (multiply by 1,000,000)
					currency.amountMicros = field.currencyAmount * 1000000;
				}
				if (field.currencyCode) currency.currencyCode = field.currencyCode;
				if (Object.keys(currency).length > 0) {
					result[fieldName] = currency;
				}
				break;

			case 'address':
				// Address fields (8 address components)
				const address: any = {};
				if (field.addressStreet1) address.addressStreet1 = field.addressStreet1;
				if (field.addressStreet2) address.addressStreet2 = field.addressStreet2;
				if (field.addressCity) address.addressCity = field.addressCity;
				if (field.addressPostcode) address.addressPostcode = field.addressPostcode;
				if (field.addressState) address.addressState = field.addressState;
				if (field.addressCountry) address.addressCountry = field.addressCountry;
				if (field.addressLat !== undefined && field.addressLat !== null) {
					address.addressLat = field.addressLat;
				}
				if (field.addressLng !== undefined && field.addressLng !== null) {
					address.addressLng = field.addressLng;
				}
				if (Object.keys(address).length > 0) {
					result[fieldName] = address;
				}
				break;

			case 'emails':
				// Emails fields (primaryEmail only, no additionalEmails)
				const emails: any = {};
				if (field.primaryEmail) emails.primaryEmail = field.primaryEmail;
				if (Object.keys(emails).length > 0) {
					result[fieldName] = emails;
				}
				break;

			case 'phones':
				// Phones fields (primary phone fields only, no additionalPhones)
				const phones: any = {};
				if (field.primaryPhoneNumber) phones.primaryPhoneNumber = field.primaryPhoneNumber;
				if (field.primaryPhoneCountryCode) phones.primaryPhoneCountryCode = field.primaryPhoneCountryCode;
				if (field.primaryPhoneCallingCode) phones.primaryPhoneCallingCode = field.primaryPhoneCallingCode;
				if (Object.keys(phones).length > 0) {
					result[fieldName] = phones;
				}
				break;

			case 'simple':
			default:
				// Simple fields - use fieldValue directly
				if (field.fieldValue !== undefined && field.fieldValue !== '') {
					result[fieldName] = field.fieldValue;
				}
				break;
		}
	}

	return result;
}

/**
 * Check if a field name uses a complex template
 * @param fieldName Name of the field to check
 * @returns True if field uses a complex template
 */
export function isComplexField(fieldName: string): boolean {
	const complexFields = [
		'name',
		'pointOfContact',
		'domainName',
		'linkedinLink',
		'xLink',
		'website',
		'cvcWebsite',
		'annualRecurringRevenue',
		'address',
	];
	return complexFields.includes(fieldName);
}

/**
 * Get the type of complex field
 * @param fieldName Name of the field
 * @returns Type identifier (FullName, Links, Currency, Address) or null
 */
export function getComplexFieldType(fieldName: string): string | null {
	if (fieldName === 'name' || fieldName === 'pointOfContact') {
		return 'FullName';
	}
	if (['domainName', 'linkedinLink', 'xLink', 'website', 'cvcWebsite'].includes(fieldName)) {
		return 'Links';
	}
	if (fieldName === 'annualRecurringRevenue') {
		return 'Currency';
	}
	if (fieldName === 'address') {
		return 'Address';
	}
	return null;
}
