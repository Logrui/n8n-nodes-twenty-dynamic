import { IExecuteFunctions } from 'n8n-workflow';
import { buildComprehensiveFieldSelections } from '../introspection/fieldIntrospection';

/**
 * Build GraphQL mutations for updating multiple records.
 * Supports partial updates - only provided fields are updated.
 * 
 * @param context The n8n execution context
 * @param objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param updates Array of {id, fieldsData} objects
 * @param objectMetadata The object metadata from schema
 * @returns Array of GraphQL mutations and variables
 */
export async function buildUpdateManyMutations(
	context: IExecuteFunctions,
	objectNameSingular: string,
	updates: Array<{ id: string; fieldsData: Record<string, any> }>,
	objectMetadata: any,
): Promise<Array<{ query: string; variables: Record<string, any>; id: string }>> {
	// Capitalize the object name for the GraphQL type
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Use introspection to get ALL fields including complex types (only once)
	const fieldSelections = await buildComprehensiveFieldSelections(context, capitalizedObjectName);

	// Build mutation for each update
	return updates.map(({ id, fieldsData }, index) => {
		const mutation = `
			mutation UpdateMany${objectMetadata.labelSingular.replace(/\s+/g, '')}_${index}($id: UUID!, $data: ${capitalizedObjectName}UpdateInput!) {
				update${capitalizedObjectName}(id: $id, data: $data) {
					${fieldSelections}
				}
			}
		`;

		const variables = {
			id,
			data: fieldsData,
		};

		return { query: mutation, variables, id };
	});
}

/**
 * Execute multiple update operations in parallel.
 * Returns array of updated records with success/error status for each.
 * 
 * @param context The n8n execution context
 * @param resource The resource/object name (singular)
 * @param updates Array of {id, fieldsData} objects
 * @param objectMetadata The object metadata from schema
 * @returns Array of results with updated records or errors
 */
export async function executeUpdateMany(
	context: IExecuteFunctions,
	resource: string,
	updates: Array<{ id: string; fieldsData: Record<string, any> }>,
	objectMetadata: any,
): Promise<Array<{ success: boolean; record?: any; error?: string; id: string; index: number }>> {
	const { twentyApiRequest } = await import('../TwentyApi.client');
	
	// Build all mutations
	const mutations = await buildUpdateManyMutations(
		context,
		resource,
		updates,
		objectMetadata,
	);

	// Execute all mutations in parallel
	const results = await Promise.allSettled(
		mutations.map(async ({ query, variables, id }, index) => {
			const response: any = await twentyApiRequest.call(
				context,
				'graphql',
				query,
				variables,
			);

			const operationName = `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
			return {
				success: true,
				record: response[operationName],
				id,
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
				id: updates[index].id,
				index,
			};
		}
	});
}
