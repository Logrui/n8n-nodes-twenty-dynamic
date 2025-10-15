import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { buildComprehensiveFieldSelections } from '../introspection/fieldIntrospection';

type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Build a GraphQL mutation for creating a record.
 * Uses introspection to discover ALL fields including complex types for the response.
 * 
 * @param context The n8n execution context
 * @param objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param fieldsData The field values to create
 * @param objectMetadata The object metadata from schema
 * @returns GraphQL mutation and variables
 */
export async function buildCreateMutation(
	context: TwentyApiContext,
	objectNameSingular: string,
	fieldsData: Record<string, any>,
	objectMetadata: any,
): Promise<{ query: string; variables: Record<string, any> }> {
	// Capitalize the object name for the GraphQL type (e.g., 'company' -> 'Company')
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Use introspection to get ALL fields including complex types
	const fieldSelections = await buildComprehensiveFieldSelections(context, capitalizedObjectName);

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
