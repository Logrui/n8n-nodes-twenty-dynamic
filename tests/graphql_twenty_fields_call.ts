/**
 * Part 2: Unit test for Twenty GraphQL fields query
 * 
 * This test hardcodes the Company resource and queries all its fields
 * using the same GraphQL structure as the n8n node implementation.
 * 
 * Purpose: Understand why only 8 fields are returned instead of 25
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL;

// Interfaces matching the node implementation
interface IFieldMetadata {
    id: string;
    name: string;
    label: string;
    type: string;
    isNullable: boolean;
    isWritable: boolean;
    isActive?: boolean;
    isSystem?: boolean;
    relationMetadata?: any;
}

interface IFieldOption {
    name: string;
    value: string;
    description: string;
}

interface IGraphQLResponse {
    data?: {
        objects: {
            edges: Array<{
                node: {
                    id: string;
                    nameSingular: string;
                    namePlural: string;
                    labelSingular: string;
                    labelPlural: string;
                    isCustom: boolean;
                    fields: {
                        edges: Array<{
                            node: {
                                id: string;
                                name: string;
                                label: string;
                                type: string;
                                isNullable: boolean;
                                isUIReadOnly: boolean;
                                isActive?: boolean;
                                isSystem?: boolean;
                            };
                        }>;
                    };
                };
            }>;
        };
    };
    errors?: Array<{
        message: string;
        [key: string]: any;
    }>;
}

/**
 * Query fields for the Company object using the exact GraphQL structure
 * from the n8n node implementation (v0.1.11)
 */
async function queryCompanyFields(): Promise<IFieldOption[]> {
    // Hardcoded values matching user's test scenario
    const resourceValue = 'company';
    
    // GraphQL query matching TwentyApi.client.ts getSchemaMetadata (v0.1.11)
    // This gets ALL objects with their fields, then we filter for Company
    // TESTING: Try WITHOUT any filter parameter at all
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
                        fields(paging: { first: 200 }) {
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

    console.log('🔍 Querying ALL objects and fields from Twenty CRM metadata API...');
    console.log(`📊 Will filter for resource: ${resourceValue}`);
    console.log(`🔧 Filter: NO FILTER (removed filter parameter entirely)`);
    // Remove trailing slash from TWENTY_URL if present
    const baseUrl = TWENTY_URL!.endsWith('/') ? TWENTY_URL!.slice(0, -1) : TWENTY_URL;
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

    // Parse the GraphQL response - find the Company object
    if (!result.data?.objects.edges) {
        throw new Error('No objects found in response');
    }

    // Find the Company object by nameSingular
    const companyObject = result.data.objects.edges.find(
        edge => edge.node.nameSingular === resourceValue
    );

    if (!companyObject) {
        throw new Error(`Object with nameSingular "${resourceValue}" not found`);
    }

    const fieldEdges = companyObject.node.fields.edges;
    
    console.log(`✅ Successfully retrieved ${fieldEdges.length} fields for Company from Twenty CRM`);
    console.log('');

    // Convert to IFieldMetadata matching node implementation
    const fields: IFieldMetadata[] = fieldEdges.map((edge) => ({
        id: edge.node.id,
        name: edge.node.name,
        label: edge.node.label,
        type: edge.node.type,
        isNullable: edge.node.isNullable,
        isWritable: edge.node.isUIReadOnly !== true, // Inverted logic per v0.1.3
        isActive: edge.node.isActive,
        isSystem: edge.node.isSystem,
        relationMetadata: null, // Not querying relation field in this test
    }));

    // Transform to dropdown options matching node implementation
    const fieldOptions: IFieldOption[] = fields.map((field) => ({
        name: `${field.label} (${field.name})`,
        value: field.name,
        description: `Type: ${field.type} | Nullable: ${field.isNullable} | Writable: ${field.isWritable} | Active: ${field.isActive} | System: ${field.isSystem}`,
    }));

    return fieldOptions;
}

/**
 * Display field options in a readable format
 */
function displayFieldOptions(fields: IFieldOption[]): void {
    console.log('📋 COMPANY FIELD DROPDOWN OPTIONS (as seen in N8N node):');
    console.log('───────────────────────────────────────────────────────');
    console.log('');

    // Count field categories
    const activeFields = fields.filter(f => f.description.includes('Active: true'));
    const systemFields = fields.filter(f => f.description.includes('System: true'));
    const writableFields = fields.filter(f => f.description.includes('Writable: true'));

    console.log(`📊 Field Statistics:`);
    console.log(`   Total fields: ${fields.length}`);
    console.log(`   Active fields: ${activeFields.length}`);
    console.log(`   System fields: ${systemFields.length}`);
    console.log(`   Writable fields: ${writableFields.length}`);
    console.log('');
    console.log('💡 Note: This query uses the /metadata endpoint which only returns custom fields.');
    console.log('   To get ALL fields (standard + custom), use data schema introspection instead.');
    console.log('');

    // Display all fields
    console.log('📝 All Fields:');
    fields.forEach((field, index) => {
        const paddedIndex = String(index + 1).padStart(3, ' ');
        const namePadded = field.name.padEnd(30, ' ');
        console.log(`   ${paddedIndex}. ${namePadded} | ${field.description}`);
    });
    console.log('');
}

/**
 * Main test execution
 */
async function runTest(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TEST: GraphQL Twenty Company Fields Call');
    console.log('  File: graphql_twenty_fields_call.ts');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    try {
        // Validate environment variables
        if (!TWENTY_API_KEY || !TWENTY_URL) {
            throw new Error('Missing required environment variables: TWENTY_API_KEY or TWENTY_URL');
        }

        // Query Company fields
        const fields = await queryCompanyFields();

        // Display results
        displayFieldOptions(fields);

        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ TEST PASSED - Total Company fields: ${fields.length}`);
        console.log('═══════════════════════════════════════════════════════');
        
    } catch (error) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ TEST FAILED');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        console.log('');
        console.log('Stack trace:');
        if (error instanceof Error && error.stack) {
            console.log(error.stack);
        }
        console.log('');
        process.exit(1);
    }
}

// Run the test
runTest();
