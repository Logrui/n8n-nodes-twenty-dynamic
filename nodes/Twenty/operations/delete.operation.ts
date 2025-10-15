import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Build a GraphQL mutation to delete a record.
 * 
 * @param context The n8n execution context
 * @param objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param recordId The UUID of the record to delete
 * @param objectMetadata The object metadata from schema
 * @returns GraphQL mutation and variables
 */
export async function buildDeleteMutation(
	context: TwentyApiContext,
	objectNameSingular: string,
	recordId: string,
	objectMetadata: any,
): Promise<{ query: string; variables: Record<string, any> }> {
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
