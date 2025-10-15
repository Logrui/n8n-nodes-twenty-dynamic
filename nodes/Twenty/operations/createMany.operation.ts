import { IExecuteFunctions } from 'n8n-workflow';
import { buildComprehensiveFieldSelections } from '../introspection/fieldIntrospection';

/**
 * Build GraphQL mutations for creating multiple records.
 * Executes multiple create operations in parallel for performance.
 * 
 * @param context The n8n execution context
 * @param objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param recordsData Array of field data objects to create
 * @param objectMetadata The object metadata from schema
 * @returns Array of GraphQL mutations and variables
 */
export async function buildCreateManyMutations(
	context: IExecuteFunctions,
	objectNameSingular: string,
	recordsData: Array<Record<string, any>>,
	objectMetadata: any,
): Promise<Array<{ query: string; variables: Record<string, any> }>> {
	// Capitalize the object name for the GraphQL type
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Use introspection to get ALL fields including complex types (only once)
	const fieldSelections = await buildComprehensiveFieldSelections(context, capitalizedObjectName);

	// Build mutation for each record
	return recordsData.map((fieldsData, index) => {
		const query = `
			mutation CreateMany${objectMetadata.labelSingular.replace(/\s+/g, '')}_${index}($data: ${capitalizedObjectName}CreateInput!) {
				create${capitalizedObjectName}(data: $data) {
					${fieldSelections}
				}
			}
		`;

		const variables = {
			data: fieldsData,
		};

		return { query, variables };
	});
}

/**
 * Execute multiple create operations in parallel.
 * Returns array of created records with success/error status for each.
 * 
 * @param context The n8n execution context
 * @param resource The resource/object name (singular)
 * @param recordsData Array of field data objects to create
 * @param objectMetadata The object metadata from schema
 * @returns Array of results with created records or errors
 */
export async function executeCreateMany(
	context: IExecuteFunctions,
	resource: string,
	recordsData: Array<Record<string, any>>,
	objectMetadata: any,
): Promise<Array<{ success: boolean; record?: any; error?: string; index: number }>> {
	const { twentyApiRequest } = await import('../TwentyApi.client');
	
	// Build all mutations
	const mutations = await buildCreateManyMutations(
		context,
		resource,
		recordsData,
		objectMetadata,
	);

	// Execute all mutations in parallel
	const results = await Promise.allSettled(
		mutations.map(async ({ query, variables }, index) => {
			const response: any = await twentyApiRequest.call(
				context,
				'graphql',
				query,
				variables,
			);

			const operationName = `create${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
			return {
				success: true,
				record: response[operationName],
				index,
			};
		}),
	);

	// Map results to consistent format
	return results.map((result, index) => {
		if (result.status === 'fulfilled') {
			return result.value;
		} else {
			return {
				success: false,
				error: result.reason?.message || String(result.reason),
				index,
			};
		}
	});
}
