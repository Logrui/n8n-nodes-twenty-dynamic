import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { buildComprehensiveFieldSelections } from '../introspection/fieldIntrospection';

type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Build a GraphQL query to list/search multiple records.
 * Uses introspection to discover ALL fields including complex types (Links, Address, etc.)
 * 
 * @param context The n8n execution context
 * @param objectNameSingular The singular name of the object (e.g., 'company', 'person')
 * @param limit Maximum number of records to return
 * @param objectMetadata The object metadata from schema
 * @returns GraphQL query and variables
 */
export async function buildListQuery(
	context: TwentyApiContext,
	objectNameSingular: string,
	limit: number,
	objectMetadata: any,
): Promise<{ query: string; variables: Record<string, any> }> {
	// Capitalize the object name for the GraphQL type (e.g., 'company' -> 'Company')
	const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

	// Use introspection to get ALL fields including complex types
	const fieldSelections = await buildComprehensiveFieldSelections(context, capitalizedObjectName);

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
