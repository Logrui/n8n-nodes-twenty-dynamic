import { IExecuteFunctions, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

// Define a union type for the 'this' context, as the function can be called from both execute and loadOptions
type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Schema metadata interfaces
 */
export interface IFieldMetadata {
	id: string;
	name: string;
	label: string;
	type: string;
	isNullable: boolean;
	isWritable: boolean;
	isActive?: boolean;
	isSystem?: boolean;
	options?: Array<{
		id: string;
		color: string;
		label: string;
		value: string;
		position: number;
	}>;
	relationMetadata?: {
		toObjectMetadata: {
			nameSingular: string;
		};
		relationType: string;
	} | null;
	// Dual-source architecture fields
	isBuiltInEnum?: boolean;  // True if this is a built-in enum field (from GraphQL)
	enumType?: string;        // The GraphQL enum type name (e.g., 'CompanyCategoryEnum')
	source?: 'metadata' | 'graphql';  // Where this field was discovered
}

export interface IObjectMetadata {
	id: string;
	nameSingular: string;
	namePlural: string;
	labelSingular: string;
	labelPlural: string;
	isCustom: boolean;
	isSystem: boolean;
	isActive: boolean;
	isRemote?: boolean;
	isUIReadOnly?: boolean;
	isSearchable?: boolean;
	fields: IFieldMetadata[];
}

export interface ISchemaMetadata {
	objects: IObjectMetadata[];
	cachedAt: number;
	domain: string;
}

/**
 * Makes an authenticated GraphQL request to the Twenty API using n8n's built-in helper.
 * Transforms GraphQL errors into user-friendly messages.
 *
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @param {'metadata' | 'graphql'} endpoint The GraphQL endpoint to target.
 * @param {string} query The GraphQL query string.
 * @param {object} [variables] Optional variables for the GraphQL query.
 * @returns {Promise<T>} A promise that resolves to the response data.
 */
export async function twentyApiRequest<T>(
	this: TwentyApiContext,
	endpoint: 'metadata' | 'graphql',
	query: string,
	variables?: object,
): Promise<T> {
	const credentials = await this.getCredentials('twentyApi');

	const options = {
		method: 'POST' as const,
		baseURL: credentials.domain as string,
		url: `/${endpoint}`,
		body: {
			query,
			...(variables && { variables }),
		},
		json: true, // Automatically stringifies the body and parses the response
	};

	try {
		// Use the built-in helper which handles authentication automatically
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'twentyApi',
			options,
		);

		// GraphQL errors are often in the response body
		if (response.errors) {
			// Transform GraphQL errors to user-friendly messages
			const errorMessages = response.errors.map((error: any) => {
				const code = error.extensions?.code;
				const message = error.message;

				switch (code) {
					case 'UNAUTHENTICATED':
						return 'Authentication failed. Check your API key in Twenty CRM credentials.';
					case 'NOT_FOUND':
						return `Record not found. ${message}`;
					case 'BAD_USER_INPUT':
						return `Validation error: ${message}`;
					case 'FORBIDDEN':
						return 'Permission denied. Check your Twenty CRM user permissions.';
					default:
						return message;
				}
			});

			throw new Error(errorMessages.join('; '));
		}

		return response.data;
	} catch (error) {
		// Handle network errors and other exceptions
		if (error.message) {
			// If it's already our formatted error, re-throw it
			if (error.message.includes('Authentication failed') ||
				error.message.includes('Record not found') ||
				error.message.includes('Validation error') ||
				error.message.includes('Permission denied')) {
				throw error;
			}

			// Handle connection errors
			if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
				throw new Error('Connection failed. Check your Twenty CRM domain.');
			}

			// Handle timeout errors
			if (error.message.includes('ETIMEDOUT')) {
				throw new Error('Request timed out. Check your network connection.');
			}
		}

		// Generic error fallback
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Makes an authenticated REST API request to the Twenty API.
 * Used for operations that benefit from REST's automatic field handling (Get, List, etc.)
 *
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @param {string} method HTTP method (GET, POST, PATCH, DELETE)
 * @param {string} path REST API path (e.g., '/people/{id}')
 * @param {object} [body] Optional request body for POST/PATCH
 * @returns {Promise<T>} A promise that resolves to the response data.
 */
export async function twentyRestApiRequest<T>(
	this: TwentyApiContext,
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
	path: string,
	body?: object,
): Promise<T> {
	const credentials = await this.getCredentials('twentyApi');

	// Remove /graphql or /metadata from domain if present
	let baseUrl = credentials.domain as string;
	baseUrl = baseUrl.replace(/\/graphql\/?$/, '').replace(/\/metadata\/?$/, '').replace(/\/$/, '');

	const options = {
		method,
		baseURL: baseUrl,
		url: `/rest${path}`,
		json: true,
		...(body && { body }),
	};

	try {
		// Use the built-in helper which handles authentication automatically
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'twentyApi',
			options,
		);

		return response;
	} catch (error) {
		// Handle REST API errors
		if (error.statusCode) {
			switch (error.statusCode) {
				case 400:
					throw new Error(`Bad Request: ${error.message || 'Invalid request parameters'}`);
				case 401:
					throw new Error('Authentication failed. Check your API key in Twenty CRM credentials.');
				case 403:
					throw new Error('Permission denied. Check your Twenty CRM user permissions.');
				case 404:
					throw new Error(`Record not found. ${error.message || ''}`);
				case 500:
					throw new Error(`Server error: ${error.message || 'Internal server error'}`);
				default:
					throw new Error(`HTTP ${error.statusCode}: ${error.message}`);
			}
		}

		// Handle connection errors
		if (error.message) {
			if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
				throw new Error('Connection failed. Check your Twenty CRM domain.');
			}

			if (error.message.includes('ETIMEDOUT')) {
				throw new Error('Request timed out. Check your network connection.');
			}
		}

		// Generic error fallback
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Fetches the complete schema metadata from Twenty CRM.
 * Queries the /metadata endpoint to get all objects and their fields.
 *
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @returns {Promise<IObjectMetadata[]>} Array of object metadata.
 */
export async function getSchemaMetadata(
	this: TwentyApiContext,
): Promise<IObjectMetadata[]> {
	const query = `
		query GetObjects {
			objects(paging: { first: 200 }) {
				edges {
					node {
						id
						nameSingular
						namePlural
						labelSingular
						labelPlural
						isCustom
						isSystem
						isActive
						isRemote
						isUIReadOnly
						isSearchable
						fields(paging: { first: 200 }, filter: {}) {
							edges {
								node {
									id
									name
									label
									type
									isNullable
									isUIReadOnly
									isActive
									isSystem
									options
								}
							}
						}
					}
				}
			}
		}
	`;

	const response: any = await twentyApiRequest.call(this, 'metadata', query);

	// Parse the GraphQL edges/node structure
	const objects = response.objects.edges.map((edge: any) => {
		const node = edge.node;
		return {
			id: node.id,
			nameSingular: node.nameSingular,
			namePlural: node.namePlural,
			labelSingular: node.labelSingular,
			labelPlural: node.labelPlural,
			isCustom: node.isCustom,
			isSystem: node.isSystem,
			isActive: node.isActive,
			isRemote: node.isRemote,
			isUIReadOnly: node.isUIReadOnly,
			isSearchable: node.isSearchable,
			fields: node.fields.edges.map((fieldEdge: any) => ({
				id: fieldEdge.node.id,
				name: fieldEdge.node.name,
				label: fieldEdge.node.label,
				type: fieldEdge.node.type,
				isNullable: fieldEdge.node.isNullable,
				// isWritable is the inverse of isUIReadOnly
				// If isUIReadOnly is true, field is NOT writable
				// If isUIReadOnly is false/null/undefined, field IS writable
				isWritable: fieldEdge.node.isUIReadOnly !== true,
				// Additional field metadata for debugging
				isActive: fieldEdge.node.isActive,
				isSystem: fieldEdge.node.isSystem,
				// Options for SELECT and MULTI_SELECT fields
				options: fieldEdge.node.options || undefined,
				// relationMetadata not available in current API, set to null
				relationMetadata: null,
			})),
		};
	});

	return objects;
}

/**
 * Gets schema metadata with 10-minute TTL caching.
 * Checks credential data for cached schema and returns it if still valid.
 * Otherwise, fetches fresh schema from Twenty CRM and caches it.
 *
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @param {boolean} forceRefresh If true, bypass cache and fetch fresh schema.
 * @returns {Promise<ISchemaMetadata>} Schema metadata with caching info.
 */
export async function getCachedSchema(
	this: TwentyApiContext,
	forceRefresh = false,
): Promise<ISchemaMetadata> {
	const credentials = await this.getCredentials('twentyApi');
	const domain = credentials.domain as string;

	// Try to get cached schema from credential data
	const cachedSchema = (credentials.schemaCache as unknown) as ISchemaMetadata | undefined;
	const cacheTimestamp = credentials.cacheTimestamp as number | undefined;

	// Check if cache is valid
	const now = Date.now();
	const cacheAge = cacheTimestamp ? now - cacheTimestamp : Infinity;
	const cacheValid = cacheAge < 600000; // 10 minutes = 600000 ms

	// Check if domain has changed (invalidate cache)
	const domainChanged = cachedSchema && cachedSchema.domain !== domain;

	// DEBUG: Cache diagnostics (remove before production)
	// Cache age: ${cacheTimestamp ? Math.floor(cacheAge / 1000) + 's' : 'no cache'}
	// Valid: ${cacheValid}, Force refresh: ${forceRefresh}, Domain changed: ${domainChanged}

	// Return cached schema if valid and not forcing refresh
	if (!forceRefresh && cacheValid && cachedSchema && !domainChanged) {
		// DEBUG: Cache HIT - using cached schema
		return cachedSchema;
	}

	// Fetch fresh schema
	// DEBUG: Cache MISS - fetching fresh schema
	// Reason: ${forceRefresh ? 'force refresh' : !cacheValid ? 'cache expired' : domainChanged ? 'domain changed' : 'no cache'}
	const objects = await getSchemaMetadata.call(this);

	// Create new schema metadata
	const freshSchema: ISchemaMetadata = {
		objects,
		cachedAt: now,
		domain,
	};

	// Store in credential data for next time
	// Note: This updates the in-memory credential data, but doesn't persist to database
	// Caching is per-execution session only
	(credentials as any).schemaCache = freshSchema;
	(credentials as any).cacheTimestamp = now;

	return freshSchema;
}

/**
 * Helper function to capitalize the first letter of a string.
 * Used to convert Twenty object names (e.g., 'company') to GraphQL type names (e.g., 'Company').
 *
 * @param {string} str The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper function to convert camelCase to human-readable format.
 * Examples: 'accountOwnerId' -> 'Account Owner Id', 'createdAt' -> 'Created At'
 *
 * @param {string} str The camelCase string
 * @returns {string} The humanized string
 */
function humanize(str: string): string {
	return str
		.replace(/([A-Z])/g, ' $1') // Add space before capital letters
		.replace(/^./, (match) => match.toUpperCase()) // Capitalize first letter
		.trim();
}

/**
 * Helper function to extract clean display name from label.
 * Twenty API often returns verbose labels like:
 * - "The company name" (when field is "name")
 * - "Address of the company" (when field is "address")
 * - "Attachments linked to the company" (when field is "attachments")
 * 
 * Strategy: Use humanized field name for consistency and clarity.
 * Only use the API label if it's concise and matches expected patterns.
 * 
 * Examples: 
 * - fieldName: "name" → "Name"
 * - fieldName: "domainName" → "Domain Name"
 * - fieldName: "idealCustomerProfile" → "Ideal Customer Profile"
 * - fieldName: "deletedAt" → "Deleted At"
 * - fieldName: "phoneNumber" → "Phone Number"
 *
 * @param {string} label The label from the API (often verbose/descriptive)
 * @param {string} fieldName The field name (camelCase)
 * @returns {string} The clean display name
 */
export function getCleanFieldLabel(label: string | undefined | null, fieldName: string): string {
	// Always humanize the field name for consistency
	// This gives us predictable, clean names like "Domain Name", "Phone Number", etc.
	const humanizedName = humanize(fieldName);
	
	// If no label provided, use humanized field name
	if (!label) {
		return humanizedName;
	}
	
	// If label is just the field name itself, humanize it
	if (label.toLowerCase() === fieldName.toLowerCase()) {
		return humanizedName;
	}
	
	// For timestamp fields (createdAt, updatedAt, deletedAt), always use humanized name
	// This ensures consistency: "Created At", "Updated At", "Deleted At"
	if (fieldName.endsWith('At') || fieldName.endsWith('Date') || fieldName.endsWith('Time')) {
		return humanizedName;
	}
	
	// If label contains ": " (colon separator), extract the title part
	// Example: "Ideal Customer Profile: Indicates whether..." → "Ideal Customer Profile"
	if (label.includes(': ')) {
		const titlePart = label.split(': ')[0].trim();
		// Only use the title if it's reasonable length (not overly verbose)
		if (titlePart.length <= 50) {
			return titlePart;
		}
	}
	
	// Detect verbose/descriptive patterns and prefer humanized name
	const verbosePatterns = [
		' of the ',
		' linked to ',
		' for the ',
		' from the ',
		'The ',  // Starts with "The " like "The company name"
		' when ',
		' that ',
	];
	
	const isVerbose = verbosePatterns.some(pattern => label.includes(pattern));
	if (isVerbose) {
		return humanizedName;
	}
	
	// For short, concise labels (under 30 chars), use them as-is
	// This handles cases like "Id", "Category", "Status" nicely
	if (label.length <= 30) {
		return label;
	}
	
	// For anything else that's verbose, use humanized field name
	return humanizedName;
}

/**
 * Maps GraphQL type information to Twenty CRM field types.
 * Handles both simple types and wrapped types (NON_NULL, LIST).
 *
 * @param {any} graphQLType The GraphQL type object from introspection
 * @returns {string} The Twenty CRM field type
 */
function mapGraphQLTypeToTwentyType(graphQLType: any): string {
	// Handle NON_NULL wrapper
	let type = graphQLType;
	if (type.kind === 'NON_NULL') {
		type = type.ofType;
	}

	// Handle LIST wrapper
	if (type.kind === 'LIST') {
		const elementType = type.ofType?.name || 'Unknown';
		return `LIST<${elementType}>`;
	}

	// Get the actual type name
	const typeName = type.name;

	// Map GraphQL scalar types to Twenty CRM types
	const typeMap: Record<string, string> = {
		'String': 'TEXT',
		'Int': 'NUMBER',
		'Float': 'NUMBER',
		'Boolean': 'BOOLEAN',
		'UUID': 'UUID',
		'ID': 'UUID',
		'DateTime': 'DATE_TIME',
		'Date': 'DATE',
		'Time': 'TIME',
		'JSON': 'RAW_JSON',
	};

	// Return mapped type or original type name for custom types
	return typeMap[typeName] || typeName;
}

/**
 * Determines if a field is read-only based on its name.
 * Read-only fields should not be shown in Create/Update operations.
 *
 * @param {string} fieldName The field name to check
 * @returns {boolean} True if the field is read-only
 */
function isReadOnlyField(fieldName: string): boolean {
	const readOnlyFields = [
		'id',
		'createdAt',
		'updatedAt',
		'deletedAt',
		'position',
		'searchVector',
	];
	return readOnlyFields.includes(fieldName);
}

/**
 * Fetches complete field metadata for an object using GraphQL introspection on the data schema.
 * This queries the /graphql endpoint (not /metadata) to get ALL fields including standard fields.
 *
 * Background: The /metadata endpoint only returns custom fields (8 for Company).
 * The /graphql data schema introspection returns ALL fields (29 for Company).
 *
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @param {string} objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @returns {Promise<IFieldMetadata[]>} Array of field metadata including all standard and custom fields
 */
export async function getDataSchemaForObject(
	this: TwentyApiContext,
	objectNameSingular: string,
): Promise<IFieldMetadata[]> {
	// Convert object name to GraphQL type name (e.g., 'company' -> 'Company')
	const typeName = capitalize(objectNameSingular);

	// GraphQL introspection query to get all fields for this type
	const query = `
		query IntrospectObject {
			__type(name: "${typeName}") {
				name
				fields {
					name
					description
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
					isDeprecated
				}
			}
		}
	`;

	const response: any = await twentyApiRequest.call(this, 'graphql', query);

	// Check if the type exists
	if (!response.__type?.fields) {
		return [];
	}

	// Convert GraphQL field metadata to Twenty field metadata
	const fields: IFieldMetadata[] = response.__type.fields
		.filter((field: any) => !field.isDeprecated) // Exclude deprecated fields
		.map((field: any) => {
			const fieldType = mapGraphQLTypeToTwentyType(field.type);
			const isNullable = field.type.kind !== 'NON_NULL';
			const isWritable = !isReadOnlyField(field.name);

			// Determine if this is a relation field (ends with 'Connection' or is a known relation type)
			const isRelation = fieldType.includes('Connection') || 
				fieldType === 'WorkspaceMember' || 
				fieldType === 'Actor';

			return {
				id: field.name, // Use field name as ID since we don't have a UUID from introspection
				name: field.name,
				label: field.description || humanize(field.name),
				type: fieldType,
				isNullable,
				isWritable,
				isActive: true, // Introspection only returns active fields
				isSystem: isReadOnlyField(field.name), // Read-only fields are typically system fields
				relationMetadata: isRelation ? {
					toObjectMetadata: {
						nameSingular: fieldType.replace('Connection', '').toLowerCase(),
					},
					relationType: 'ONE_TO_MANY',
				} : null,
			};
		});

	return fields;
}

/**
 * Query GraphQL type schema for a resource using introspection.
 * Used to discover built-in enum fields that are NOT in the metadata API.
 * 
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @param {string} typeName The GraphQL type name (e.g., 'Company', 'Person')
 * @returns {Promise<any>} The GraphQL type schema with fields and types
 */
export async function queryGraphQLType(
	this: TwentyApiContext,
	typeName: string,
): Promise<any> {
	const query = `
		query GetTypeSchema {
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
						}
					}
				}
			}
		}
	`;
	
	const response: any = await twentyApiRequest.call(this, 'graphql', query);
	return response;
}

/**
 * Query enum values for a GraphQL enum type.
 * Used to get options for SELECT/MULTI_SELECT fields that are built-in enums.
 * 
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @param {string} enumName The enum type name (e.g., 'CompanyCategoryEnum')
 * @returns {Promise<Array<{name: string, label: string}>>} Array of enum values with formatted labels
 */
export async function queryEnumValues(
	this: TwentyApiContext,
	enumName: string,
): Promise<Array<{name: string, label: string}>> {
	const query = `
		query GetEnumValues {
			__type(name: "${enumName}") {
				name
				enumValues {
					name
					description
				}
			}
		}
	`;
	
	const response: any = await twentyApiRequest.call(this, 'graphql', query);
	
	if (response.__type?.enumValues) {
		return response.__type.enumValues.map((v: any) => ({
			name: v.name,
			label: v.name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()),
		}));
	}
	
	return [];
}

/**
 * Build comprehensive field selections for a Twenty CRM object type using introspection.
 * This discovers ALL fields including complex types (Links, Address, Currency, etc.) and builds
 * proper GraphQL field selections with subfield queries.
 * 
 * @param {string} objectTypeName The GraphQL type name (e.g., 'Company', 'Person')
 * @returns {Promise<string>} GraphQL field selections string
 */
export async function buildComprehensiveFieldSelections(
	this: TwentyApiContext,
	objectTypeName: string,
): Promise<string> {
	// Introspect the object type to discover all fields
	const introspectionQuery = `
		query IntrospectType {
			__type(name: "${objectTypeName}") {
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

	const response: any = await twentyApiRequest.call(this, 'graphql', introspectionQuery);
	
	if (!response.__type?.fields) {
		// Fallback to basic fields if introspection fails
		return 'id\ncreatedAt\nupdatedAt\ndeletedAt\nname';
	}

	const fields = response.__type.fields;
	const fieldSelections: string[] = [];

	// Known subfield patterns for complex Twenty CRM types
	const complexTypeSubfields: Record<string, string> = {
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
	};

	for (const field of fields) {
		// Skip __typename meta field and connection fields (they need pagination)
		if (field.name === '__typename') continue;
		
		const fieldType = field.type;
		const typeName = fieldType.name || fieldType.ofType?.name || fieldType.ofType?.ofType?.name;
		const typeKind = fieldType.kind || fieldType.ofType?.kind || fieldType.ofType?.ofType?.kind;

		// Skip connection fields (end with 'Connection')
		if (typeName?.endsWith('Connection')) continue;

		// Handle scalar and enum fields
		if (typeKind === 'SCALAR' || typeKind === 'ENUM' || 
			['ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Date', 'Time', 'UUID'].includes(typeName)) {
			fieldSelections.push(field.name);
		}
		// Handle complex object fields
		else if (typeKind === 'OBJECT' && complexTypeSubfields[typeName]) {
			fieldSelections.push(`${field.name} {\n\t\t\t\t${complexTypeSubfields[typeName]}\n\t\t\t}`);
		}
	}

	return fieldSelections.join('\n\t\t\t\t');
}

/**
 * Build a GraphQL mutation for creating a record.
 * Only requests simple scalar fields in the response to avoid complex object subfield requirements.
 * 
 * @param {string} objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param {Record<string, any>} fieldsData The field values to create
 * @param {IObjectMetadata} objectMetadata The object metadata from schema
 * @returns {{ query: string, variables: Record<string, any> }} GraphQL mutation and variables
 */
export function buildCreateMutation(
	objectNameSingular: string,
	fieldsData: Record<string, any>,
	objectMetadata: IObjectMetadata,
): { query: string; variables: Record<string, any> } {
	// Build field selection using schema metadata + essential core fields
	// Schema metadata may be incomplete, so we add commonly-used fields manually
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT', 'RAW_JSON'];
	
	// Get fields from schema metadata
	const metadataFields = objectMetadata.fields
		.filter((field) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field) => field.name);
	
	// Add essential fields that should always be requested but might be missing from metadata
	const essentialFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name'];
	
	// Combine and deduplicate
	const allFields = [...new Set([...essentialFields, ...metadataFields])];
	const fieldSelections = allFields.join('\n\t\t\t');

	// Capitalize the object name for the GraphQL type (e.g., 'company' -> 'Company')
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Construct mutation with properly capitalized type name
	const query = `
		mutation Create${objectMetadata.labelSingular.replace(/\s+/g, '')}($data: ${capitalizedObjectName}CreateInput!) {
			create${capitalizedObjectName}(data: $data) {
				${fieldSelections}
			}
		}
	`;

	// Variables
	const variables = {
		data: fieldsData,
	};

	return { query, variables };
}

/**
 * Build a GraphQL query for retrieving a single record by ID.
 * Only requests simple scalar fields to avoid complex object subfield requirements.
 * 
 * @param {string} objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param {string} recordId The UUID of the record to retrieve
 * @param {IObjectMetadata} objectMetadata The object metadata from schema
 * @returns {{ query: string, variables: Record<string, any> }} GraphQL query and variables
 */
export function buildGetQuery(
	objectNameSingular: string,
	recordId: string,
	objectMetadata: IObjectMetadata,
): { query: string; variables: Record<string, any> } {
	// Build field selection using schema metadata + essential core fields
	// Schema metadata may be incomplete, so we add commonly-used fields manually
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT', 'RAW_JSON'];
	
	// Get fields from schema metadata
	const metadataFields = objectMetadata.fields
		.filter((field) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field) => field.name);
	
	// Add essential fields that should always be requested but might be missing from metadata
	const essentialFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name', 'position', 'searchVector'];
	
	// Combine and deduplicate
	const allFields = [...new Set([...essentialFields, ...metadataFields])];
	const fieldSelections = allFields.join('\n\t\t\t\t');

	// Construct query using plural name with filter
	// Note: Use plural name (e.g., 'companies') not singular (e.g., 'company')
	const pluralName = objectMetadata.namePlural;
	const query = `
		query Get${objectMetadata.labelSingular.replace(/\s+/g, '')}($id: UUID!) {
			${pluralName}(filter: { id: { eq: $id } }) {
				edges {
					node {
						${fieldSelections}
					}
				}
			}
		}
	`;

	// Variables
	const variables = {
		id: recordId,
	};

	return { query, variables };
}

/**
 * Build a GraphQL mutation to update an existing record.
 * Supports partial updates - only provided fields are updated.
 * Only requests simple scalar fields in the response.
 *
 * @param {string} objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param {string} recordId The UUID of the record to update
 * @param {Record<string, any>} fieldsData Field names and values to update (partial update supported)
 * @param {IObjectMetadata} objectMetadata The object metadata from schema
 * @returns {{ query: string, variables: Record<string, any> }} GraphQL mutation and variables
 */
export function buildUpdateMutation(
	objectNameSingular: string,
	recordId: string,
	fieldsData: Record<string, any>,
	objectMetadata: IObjectMetadata,
): { query: string; variables: Record<string, any> } {
	// Build field selection using schema metadata + essential core fields
	// Schema metadata may be incomplete, so we add commonly-used fields manually
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT', 'RAW_JSON'];
	
	// Get fields from schema metadata
	const metadataFields = objectMetadata.fields
		.filter((field) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field) => field.name);
	
	// Add essential fields that should always be requested but might be missing from metadata
	const essentialFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name', 'position', 'searchVector'];
	
	// Combine and deduplicate
	const allFields = [...new Set([...essentialFields, ...metadataFields])];
	const fieldSelections = allFields.join('\n\t\t\t');

	// Capitalize the object name for the GraphQL type
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Construct mutation with parameterized variables for security
	const mutation = `
		mutation Update${objectMetadata.labelSingular.replace(/\s+/g, '')}($id: UUID!, $data: ${capitalizedObjectName}UpdateInput!) {
			update${capitalizedObjectName}(id: $id, data: $data) {
				${fieldSelections}
			}
		}
	`;

	// Variables (partial update - only include provided fields)
	const variables = {
		id: recordId,
		data: fieldsData,
	};

	return { query: mutation, variables };
}

/**
 * Build a GraphQL mutation to delete a record.
 *
 * @param {string} objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param {string} recordId The UUID of the record to delete
 * @param {IObjectMetadata} objectMetadata The object metadata from schema
 * @returns {{ query: string, variables: Record<string, any> }} GraphQL mutation and variables
 */
export function buildDeleteMutation(
	objectNameSingular: string,
	recordId: string,
	objectMetadata: IObjectMetadata,
): { query: string; variables: Record<string, any> } {
	// Capitalize the object name for the GraphQL type
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Construct mutation with parameterized variables for security
	const mutation = `
		mutation Delete${objectMetadata.labelSingular.replace(/\s+/g, '')}($id: UUID!) {
			delete${capitalizedObjectName}(id: $id) {
				id
			}
		}
	`;

	// Variables
	const variables = {
		id: recordId,
	};

	return { query: mutation, variables };
}

/**
 * Build a GraphQL query to list/search multiple records.
 * This is a basic implementation without filters (filters will be added in User Story 3).
 * Only requests simple scalar fields to avoid complex object subfield requirements.
 *
 * @param {string} objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param {number} limit Maximum number of records to return
 * @param {IObjectMetadata} objectMetadata The object metadata from schema
 * @returns {{ query: string, variables: Record<string, any> }} GraphQL query and variables
 */
export function buildListQuery(
	objectNameSingular: string,
	limit: number,
	objectMetadata: IObjectMetadata,
): { query: string; variables: Record<string, any> } {
	// Build field selection using schema metadata + essential core fields
	// Schema metadata may be incomplete, so we add commonly-used fields manually
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT', 'RAW_JSON'];
	
	// Get fields from schema metadata
	const metadataFields = objectMetadata.fields
		.filter((field) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field) => field.name);
	
	// Add essential fields that should always be requested but might be missing from metadata
	const essentialFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'name', 'position', 'searchVector'];
	
	// Combine and deduplicate
	const allFields = [...new Set([...essentialFields, ...metadataFields])];
	const fieldSelections = allFields.join('\n\t\t\t\t');

	// Use namePlural for the query name (e.g., 'companies', 'people')
	const pluralName = objectMetadata.namePlural;

	// Construct query with edges/node structure
	// Note: Use 'first' directly, not 'paging: { first: ... }'
	const query = `
		query List${objectMetadata.labelPlural.replace(/\s+/g, '')}($limit: Int!) {
			${pluralName}(first: $limit) {
				edges {
					node {
						${fieldSelections}
					}
				}
			}
		}
	`;

	// Variables
	const variables = {
		limit,
	};

	return { query, variables };
}

/**
 * Re-export new operation builders from the operations module.
 * These use GraphQL introspection to discover ALL fields including complex types.
 * 
 * MIGRATION NOTE: The new operation builders are async and return comprehensive data.
 * Import from './operations' for the new implementations.
 */
export * from './operations';
export * from './introspection/fieldIntrospection';
