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
}

/**
 * Transform field data array into GraphQL mutation data
 * Converts flat field inputs into nested object structures
 * 
 * @param fields Array of field data from n8n parameters
 * @param resource The resource type (person, company, etc.) - used for resource-specific transformations
 * @returns Object with properly structured field data for GraphQL
 */
export function transformFieldsData(fields: IFieldData[], resource?: string): Record<string, any> {
	const result: Record<string, any> = {};

	for (const field of fields) {
		const fieldName = field.fieldName;

		// FullName fields - only for Person.name (Company.name is simple String)
		if (fieldName === 'name' && resource === 'person') {
			const fullName: any = {};
			if (field.firstName) fullName.firstName = field.firstName;
			if (field.lastName) fullName.lastName = field.lastName;
			if (Object.keys(fullName).length > 0) {
				result[fieldName] = fullName;
			}
		}
		// Links fields (domainName, linkedinLink, xLink, website, cvcWebsite)
		else if (['domainName', 'linkedinLink', 'xLink', 'website', 'cvcWebsite'].includes(fieldName)) {
			const links: any = {};
			if (field.primaryLinkUrl) links.primaryLinkUrl = field.primaryLinkUrl;
			if (field.primaryLinkLabel) links.primaryLinkLabel = field.primaryLinkLabel;
			if (Object.keys(links).length > 0) {
				result[fieldName] = links;
			}
		}
		// Currency fields (annualRecurringRevenue)
		else if (fieldName === 'annualRecurringRevenue') {
			const currency: any = {};
			if (field.currencyAmount !== undefined && field.currencyAmount !== null) {
				// Convert amount to micros (multiply by 1,000,000)
				currency.amountMicros = field.currencyAmount * 1000000;
			}
			if (field.currencyCode) currency.currencyCode = field.currencyCode;
			if (Object.keys(currency).length > 0) {
				result[fieldName] = currency;
			}
		}
		// Address fields (address)
		else if (fieldName === 'address') {
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
		}
		// Simple fields - use fieldValue directly
		else {
			if (field.fieldValue !== undefined && field.fieldValue !== '') {
				result[fieldName] = field.fieldValue;
			}
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
