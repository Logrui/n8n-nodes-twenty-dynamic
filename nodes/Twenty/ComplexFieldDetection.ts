/**
 * Field Type Detection and Templates
 * 
 * Identifies complex field types and provides metadata for generating
 * sub-field inputs in the n8n UI.
 */

export interface IComplexFieldInfo {
	fieldType: string;
	needsSubFields: boolean;
}

/**
 * Map of field names to their complex types
 * This will be used to detect when a field needs sub-field inputs
 */
export const COMPLEX_FIELD_MAPPINGS: Record<string, string> = {
	// FullName fields
	name: 'FullName',
	pointOfContact: 'FullName',
	
	// Links fields
	domainName: 'Links',
	linkedinLink: 'Links',
	xLink: 'Links',
	website: 'Links',
	cvcWebsite: 'Links',
	
	// Currency fields
	annualRecurringRevenue: 'Currency',
	
	// Address fields
	address: 'Address',
};

/**
 * Check if a field name corresponds to a complex type
 */
export function isComplexField(fieldName: string): boolean {
	return fieldName in COMPLEX_FIELD_MAPPINGS;
}

/**
 * Get the complex type for a field name
 */
export function getComplexType(fieldName: string): string | null {
	return COMPLEX_FIELD_MAPPINGS[fieldName] || null;
}

/**
 * Get all field names that use a specific complex type
 */
export function getFieldsForComplexType(complexType: string): string[] {
	return Object.entries(COMPLEX_FIELD_MAPPINGS)
		.filter(([_, type]) => type === complexType)
		.map(([fieldName, _]) => fieldName);
}
