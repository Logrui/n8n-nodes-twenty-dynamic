import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { twentyApiRequest } from '../TwentyApi.client';

type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * GraphQL field type information
 */
export interface IGraphQLField {
	name: string;
	typeName: string;
	typeKind: string;
	isConnection: boolean;
	isScalar: boolean;
	isEnum: boolean;
	isObject: boolean;
}

/**
 * Known subfield patterns for complex Twenty CRM types.
 * These define how to query complex object fields properly.
 */
const COMPLEX_TYPE_SUBFIELDS: Record<string, string> = {
	'Links': `primaryLinkUrl
		primaryLinkLabel
		secondaryLinks`,
	'Address': `addressStreet1
		addressStreet2
		addressCity
		addressState
		addressCountry
		addressPostcode
		addressLat
		addressLng`,
	'Currency': `amountMicros
		currencyCode`,
	'Actor': `source
		workspaceMemberId
		name`,
	'WorkspaceMember': `id
		name {
			firstName
			lastName
		}
		userEmail`,
	'FullName': `firstName
		lastName`,
	'Emails': `primaryEmail
		additionalEmails`,
	'Phones': `primaryPhoneNumber
		primaryPhoneCountryCode
		primaryPhoneCallingCode
		additionalPhones`,
};

/**
 * Introspect a GraphQL type to discover all its fields.
 * 
 * @param context The n8n execution context
 * @param typeName The GraphQL type name (e.g., 'Company', 'Person')
 * @returns Array of field information
 */
export async function introspectType(
	context: TwentyApiContext,
	typeName: string,
): Promise<IGraphQLField[]> {
	const introspectionQuery = `
		query IntrospectType {
			__type(name: "${typeName}") {
				name
				fields {
					name
					type {
						name
						kind
						ofType {
							name
							kind
							ofType {
								name
								kind
							}
						}
					}
				}
			}
		}
	`;

	const response: any = await twentyApiRequest.call(context, 'graphql', introspectionQuery);
	
	if (!response.__type?.fields) {
		return [];
	}

	const fields: IGraphQLField[] = [];

	for (const field of response.__type.fields) {
		// Skip __typename meta field
		if (field.name === '__typename') continue;

		const fieldType = field.type;
		const typeName = fieldType.name || fieldType.ofType?.name || fieldType.ofType?.ofType?.name;
		const typeKind = fieldType.kind || fieldType.ofType?.kind || fieldType.ofType?.ofType?.kind;

		const isConnection = typeName?.endsWith('Connection') || false;
		const isScalar = typeKind === 'SCALAR' || 
			['ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Date', 'Time', 'UUID'].includes(typeName);
		const isEnum = typeKind === 'ENUM';
		const isObject = typeKind === 'OBJECT' && !isConnection;

		fields.push({
			name: field.name,
			typeName: typeName || 'Unknown',
			typeKind: typeKind || 'Unknown',
			isConnection,
			isScalar,
			isEnum,
			isObject,
		});
	}

	return fields;
}

/**
 * Build comprehensive field selections for a Twenty CRM object type.
 * Includes scalar, enum, and complex object fields with proper subfield selections.
 * Excludes connection fields (relations) as they require pagination.
 * 
 * @param context The n8n execution context
 * @param typeName The GraphQL type name (e.g., 'Company', 'Person')
 * @returns GraphQL field selections string ready to use in queries
 */
export async function buildComprehensiveFieldSelections(
	context: TwentyApiContext,
	typeName: string,
): Promise<string> {
	const fields = await introspectType(context, typeName);

	if (fields.length === 0) {
		// Fallback to basic fields if introspection fails
		// For Person, use name with subfields; for others, use simple name
		const nameField = typeName === 'Person' 
			? `name {\n\t\t\t\t\tfirstName\n\t\t\t\t\tlastName\n\t\t\t\t}`
			: 'name';
		
		return `id\n\t\t\t\tcreatedAt\n\t\t\t\tupdatedAt\n\t\t\t\tdeletedAt\n\t\t\t\t${nameField}`;
	}

	const fieldSelections: string[] = [];

	for (const field of fields) {
		// Skip connection fields (they need pagination and separate queries)
		if (field.isConnection) continue;

		// Handle scalar and enum fields
		if (field.isScalar || field.isEnum) {
			fieldSelections.push(field.name);
		}
		// Handle complex object fields with known subfield patterns
		else if (field.isObject && COMPLEX_TYPE_SUBFIELDS[field.typeName]) {
			fieldSelections.push(`${field.name} {\n\t\t\t\t\t${COMPLEX_TYPE_SUBFIELDS[field.typeName]}\n\t\t\t\t}`);
		}
		// For unknown object types, skip them (they're likely relations or need custom handling)
		// Don't try to query them as it will cause errors
		// Examples: Company (relation), custom objects without defined patterns
	}

	return fieldSelections.join('\n\t\t\t\t');
}

/**
 * Build basic field selections (scalar + enum only) without introspection.
 * This is a fallback when introspection is not available or for simpler queries.
 * 
 * @param objectMetadata Object metadata from schema
 * @returns GraphQL field selections string
 */
export function buildBasicFieldSelections(objectMetadata: any): string {
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT', 'RAW_JSON'];
	
	// Get fields from schema metadata
	const metadataFields = objectMetadata.fields
		.filter((field: any) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field: any) => field.name);
	
	// Add essential fields that should always be requested but might be missing from metadata
	const essentialFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name', 'position', 'searchVector'];
	
	// Combine and deduplicate
	const allFields = [...new Set([...essentialFields, ...metadataFields])];
	return allFields.join('\n\t\t\t\t');
}
