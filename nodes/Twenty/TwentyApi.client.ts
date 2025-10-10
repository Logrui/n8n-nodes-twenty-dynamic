import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

// Define a union type for the 'this' context, as the function can be called from both execute and loadOptions
type TwentyApiContext = IExecuteFunctions | ILoadOptionsFunctions;

/**
 * Makes an authenticated GraphQL request to the Twenty API using n8n's built-in helper.
 *
 * @param {TwentyApiContext} this The context object for the n8n function.
 * @param {'metadata' | 'graphql'} endpoint The GraphQL endpoint to target.
 * @param {string} query The GraphQL query string.
 * @param {object} [variables] Optional variables for the GraphQL query.
 * @returns {Promise<T>} A promise that resolves to the response data.
 */
export async function twentyApiRequest<T>(this: TwentyApiContext, endpoint: 'metadata' | 'graphql', query: string, variables?: object): Promise<T> {
	const credentials = await this.getCredentials('twentyApi');

	const body = {
		query,
		variables,
	};

	const options = {
		method: 'POST' as const,
		baseURL: credentials.domain as string,
		url: `/${endpoint}`,
		body,
		json: true, // Automatically stringifies the body and parses the response
	};

	// Use the built-in helper which handles authentication automatically based on the credential type
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'twentyApi', options);

	// GraphQL errors are often in the response body, so we check for them.
	if (response.errors) {
		// Throw a proper error to be caught by the node's error handling
		throw new Error(`GraphQL Error: ${JSON.stringify(response.errors)}`);
	}

	return response.data;
}
