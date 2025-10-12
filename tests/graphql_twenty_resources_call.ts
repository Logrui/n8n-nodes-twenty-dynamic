/**
 * Unit Test: GraphQL Twenty Resources Call
 * 
 * Purpose: Test the Resource Name/ID population query
 * Mimics: The getResources loadOptions method in Twenty.node.ts
 * 
 * This test directly queries the Twenty GraphQL metadata API
 * to retrieve all available objects (resources) and outputs them
 * in the same format as the N8N node dropdown.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

interface IObjectMetadata {
    id: string;
    nameSingular: string;
    namePlural: string;
    labelSingular: string;
    labelPlural: string;
    isCustom: boolean;
}

interface IResourceOption {
    name: string;
    value: string;
    description: string;
}

interface IGraphQLResponse {
    data?: {
        objects: {
            edges: Array<{
                node: IObjectMetadata;
            }>;
        };
    };
    errors?: Array<{
        message: string;
        [key: string]: any;
    }>;
}

/**
 * Execute GraphQL query against Twenty metadata API
 */
async function queryTwentyResources(): Promise<IObjectMetadata[]> {
    const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
    const TWENTY_URL = process.env.TWENTY_URL;

    if (!TWENTY_API_KEY || !TWENTY_URL) {
        throw new Error('Missing required environment variables: TWENTY_API_KEY or TWENTY_URL');
    }

    // GraphQL query to get all objects (resources)
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
                    }
                }
            }
        }
    `;

    console.log('🔍 Querying Twenty CRM metadata API...');
    // Remove trailing slash from TWENTY_URL if present
    const baseUrl = TWENTY_URL.endsWith('/') ? TWENTY_URL.slice(0, -1) : TWENTY_URL;
    console.log(`📍 URL: ${baseUrl}/metadata`);
    console.log('');

    // Make HTTP request to Twenty metadata endpoint
    const response = await fetch(`${baseUrl}/metadata`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json() as IGraphQLResponse;

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
    }

    // Parse the GraphQL response
    const objects: IObjectMetadata[] = result.data!.objects.edges.map((edge: any) => ({
        id: edge.node.id,
        nameSingular: edge.node.nameSingular,
        namePlural: edge.node.namePlural,
        labelSingular: edge.node.labelSingular,
        labelPlural: edge.node.labelPlural,
        isCustom: edge.node.isCustom,
    }));

    return objects;
}

/**
 * Transform objects to dropdown options (mimics N8N node logic)
 */
function transformToDropdownOptions(objects: IObjectMetadata[]): IResourceOption[] {
    const options: IResourceOption[] = objects.map((obj) => ({
        name: obj.labelSingular,
        value: obj.nameSingular,
        description: obj.isCustom ? '(Custom Object)' : '(Standard Object)',
    }));

    // Sort: standard objects first, then custom objects, alphabetically within each group
    options.sort((a, b) => {
        const aIsCustom = a.description.includes('Custom');
        const bIsCustom = b.description.includes('Custom');

        if (aIsCustom === bIsCustom) {
            return a.name.localeCompare(b.name);
        }
        return aIsCustom ? 1 : -1;
    });

    return options;
}

/**
 * Main test execution
 */
async function runTest() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TEST: GraphQL Twenty Resources Call');
    console.log('  File: graphql_twenty_resources_call.ts');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    try {
        // Query the API
        const objects = await queryTwentyResources();
        
        console.log(`✅ Successfully retrieved ${objects.length} objects from Twenty CRM`);
        console.log('');

        // Transform to dropdown format
        const dropdownOptions = transformToDropdownOptions(objects);

        // Output results
        console.log('📋 RESOURCE DROPDOWN OPTIONS (as seen in N8N node):');
        console.log('───────────────────────────────────────────────────────');
        console.log('');

        // Group by type
        const standardOptions = dropdownOptions.filter(opt => !opt.description.includes('Custom'));
        const customOptions = dropdownOptions.filter(opt => opt.description.includes('Custom'));

        console.log(`🔹 STANDARD OBJECTS (${standardOptions.length}):`);
        standardOptions.forEach((opt, index) => {
            console.log(`  ${(index + 1).toString().padStart(2)}. ${opt.name.padEnd(30)} | value: ${opt.value}`);
        });

        if (customOptions.length > 0) {
            console.log('');
            console.log(`🔸 CUSTOM OBJECTS (${customOptions.length}):`);
            customOptions.forEach((opt, index) => {
                console.log(`  ${(index + 1).toString().padStart(2)}. ${opt.name.padEnd(30)} | value: ${opt.value}`);
            });
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ TEST PASSED - Total resources: ${dropdownOptions.length}`);
        console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ TEST FAILED');
        console.error('═══════════════════════════════════════════════════════');
        console.error('');
        console.error('Error:', error instanceof Error ? error.message : String(error));
        console.error('');
        if (error instanceof Error && error.stack) {
            console.error('Stack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run the test
runTest();
