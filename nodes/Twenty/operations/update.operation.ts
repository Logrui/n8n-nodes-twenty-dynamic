import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { buildComprehensiveFieldSelections } from '../introspection/fieldIntrospection';

type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Build a GraphQL mutation to update an existing record.
 * Supports partial updates - only provided fields are updated.
 * Uses introspection to discover ALL fields including complex types for the response.
 * 
 * @param context The n8n execution context
 * @param objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param recordId The UUID of the record to update
 * @param fieldsData Field names and values to update (partial update supported)
 * @param objectMetadata The object metadata from schema
 * @returns GraphQL mutation and variables
 */
export async function buildUpdateMutation(
	context: TwentyApiContext,
	objectNameSingular: string,
	recordId: string,
	fieldsData: Record<string, any>,
	objectMetadata: any,
): Promise<{ query: string; variables: Record<string, any> }> {
	// Capitalize the object name for the GraphQL type (e.g., 'company' -> 'Company')
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Use introspection to get ALL fields including complex types
	const fieldSelections = await buildComprehensiveFieldSelections(context, capitalizedObjectName);

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
