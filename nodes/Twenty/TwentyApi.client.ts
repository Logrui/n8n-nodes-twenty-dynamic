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
 * Build a GraphQL mutation for creating a record.
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
	// Build field selection for response (all fields)
	const fieldSelections = objectMetadata.fields
		.map((field) => field.name)
		.join('\n\t\t\t');

	// Construct mutation
	const query = `
		mutation Create${objectMetadata.labelSingular.replace(/\s+/g, '')}($data: ${objectNameSingular}CreateInput!) {
			create${objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1)}(data: $data) {
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
	// Build field selection for response (all readable fields)
	const fieldSelections = objectMetadata.fields
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
	// Build field selection for response (all readable fields)
	const fieldSelections = objectMetadata.fields
		.map((field) => field.name)
		.join('\n\t\t\t');

	// Construct mutation with parameterized variables for security
	const mutation = `
		mutation Update${objectMetadata.labelSingular.replace(/\s+/g, '')}($id: UUID!, $data: ${objectMetadata.labelSingular.replace(/\s+/g, '')}UpdateInput!) {
			update${objectMetadata.labelSingular.replace(/\s+/g, '')}(id: $id, data: $data) {
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
	// Construct mutation with parameterized variables for security
	const mutation = `
		mutation Delete${objectMetadata.labelSingular.replace(/\s+/g, '')}($id: UUID!) {
			delete${objectMetadata.labelSingular.replace(/\s+/g, '')}(id: $id) {
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
	// Build field selection for response (all readable fields)
	const fieldSelections = objectMetadata.fields
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
