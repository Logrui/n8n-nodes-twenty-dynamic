/**
 * GraphQL Introspection Query
 * 
 * This test queries the Twenty GraphQL schema to understand
 * what filter options are available for the fields query.
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL;

/**
 * Query the GraphQL schema to see field filter options
 */
async function introspectFieldFilters(): Promise<void> {
    // Introspect the FieldFilter type to see what filter options are available
    const query = `
        query IntrospectionQuery {
            __type(name: "FieldFilter") {
                name
                kind
                description
                inputFields {
                    name
                    description
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                }
            }
        }
    `;

    console.log('🔍 Introspecting FieldFilter type...');
    const baseUrl = TWENTY_URL!.endsWith('/') ? TWENTY_URL!.slice(0, -1) : TWENTY_URL;
    console.log(`📍 URL: ${baseUrl}/metadata`);
    console.log('');

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

    const result: any = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
    }

    console.log('📋 FIELD FILTER TYPE DETAILS:');
    console.log('───────────────────────────────────────────────────────');
    
    const fieldFilter = result.data.__type;
    if (fieldFilter && fieldFilter.inputFields) {
        console.log(`Type: ${fieldFilter.name} (${fieldFilter.kind})`);
        if (fieldFilter.description) {
            console.log(`Description: ${fieldFilter.description}`);
        }
        console.log('');
        console.log('Available filter fields:');
        fieldFilter.inputFields.forEach((field: any) => {
            const typeName = field.type.ofType?.name || field.type.name;
            console.log(`  - ${field.name}: ${typeName}`);
            if (field.description) {
                console.log(`    ${field.description}`);
            }
        });
    } else {
        console.log('No inputFields found or type is null');
        console.log(JSON.stringify(result, null, 2));
    }
    console.log('');
}

/**
 * Main test execution
 */
async function runTest(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TEST: GraphQL Schema Introspection');
    console.log('  File: graphql_introspection.ts');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    try {
        // Validate environment variables
        if (!TWENTY_API_KEY || !TWENTY_URL) {
            throw new Error('Missing required environment variables: TWENTY_API_KEY or TWENTY_URL');
        }

        await introspectFieldFilters();

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ TEST PASSED');
        console.log('═══════════════════════════════════════════════════════');
        
    } catch (error) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ TEST FAILED');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        console.log('');
        if (error instanceof Error && error.stack) {
            console.log('Stack trace:');
            console.log(error.stack);
        }
        console.log('');
        process.exit(1);
    }
}

// Run the test
runTest();
