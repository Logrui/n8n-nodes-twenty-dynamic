import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { buildComprehensiveFieldSelections } from '../introspection/fieldIntrospection';

type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Build a GraphQL query for retrieving a single record by ID.
 * Uses introspection to discover ALL fields including complex types (Links, Address, etc.)
 * 
 * @param context The n8n execution context
 * @param objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param recordId The UUID of the record to retrieve
 * @param objectMetadata The object metadata from schema
 * @returns GraphQL query and variables
 */
export async function buildGetQuery(
	context: TwentyApiContext,
	objectNameSingular: string,
	recordId: string,
	objectMetadata: any,
): Promise<{ query: string; variables: Record<string, any> }> {
	// Capitalize the object name for the GraphQL type (e.g., 'company' -> 'Company')
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Use introspection to get ALL fields including complex types
	const fieldSelections = await buildComprehensiveFieldSelections(context, capitalizedObjectName);

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
