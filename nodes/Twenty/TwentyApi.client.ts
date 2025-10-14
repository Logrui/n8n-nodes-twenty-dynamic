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
}

export interface IObjectMetadata {
	id: string;
	nameSingular: string;
	namePlural: string;
	labelSingular: string;
	labelPlural: string;
	isCustom: boolean;
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
	// Build field selection for response - only simple scalar fields
	// Exclude complex types that require subfield selection (Objects, Lists, Connections)
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT'];
	const fieldSelections = objectMetadata.fields
		.filter((field) => {
			// Include scalar types
			if (scalarTypes.includes(field.type)) return true;
			// Include ID fields
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			// Exclude everything else (Address, Links, Currency, Connection types, etc.)
			return false;
		})
		.map((field) => field.name)
		.join('\n\t\t\t');

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
	// Build field selection for response - only simple scalar fields
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT'];
	const fieldSelections = objectMetadata.fields
		.filter((field) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field) => field.name)
		.join('\n\t\t\t');

	// Construct query
	const query = `
		query Get${objectMetadata.labelSingular.replace(/\s+/g, '')}($id: UUID!) {
			${objectNameSingular}(filter: { id: { eq: $id } }) {
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
	// Build field selection for response - only simple scalar fields
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT'];
	const fieldSelections = objectMetadata.fields
		.filter((field) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field) => field.name)
		.join('\n\t\t\t');

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
	// Build field selection for response - only simple scalar fields
	const scalarTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'UUID', 'DATE_TIME', 'DATE', 'TIME', 'PHONE', 'EMAIL', 'SELECT'];
	const fieldSelections = objectMetadata.fields
		.filter((field) => {
			if (scalarTypes.includes(field.type)) return true;
			if (field.name === 'id' || field.name.endsWith('Id')) return true;
			return false;
		})
		.map((field) => field.name)
		.join('\n\t\t\t\t');

	// Use namePlural for the query name (e.g., 'companies', 'people')
	const pluralName = objectMetadata.namePlural;

	// Construct query with edges/node structure
	const query = `
		query List${objectMetadata.labelPlural.replace(/\s+/g, '')}($limit: Int!) {
			${pluralName}(paging: { first: $limit }) {
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
