/**
 * Part 5: Introspect the /graphql data schema to discover all Company fields
 * 
 * This test uses GraphQL introspection on the DATA endpoint (not metadata)
 * to see if we can dynamically discover all available fields.
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL;

/**
 * Introspect the Company type from the data schema
 */
async function introspectCompanyType(): Promise<void> {
    const query = `
        query IntrospectCompany {
            __type(name: "Company") {
                name
                kind
                description
                fields {
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
                    isDeprecated
                }
            }
        }
    `;

    console.log('🔍 Introspecting Company type from /graphql data schema...');
    const baseUrl = TWENTY_URL!.endsWith('/') ? TWENTY_URL!.slice(0, -1) : TWENTY_URL;
    console.log(`📍 URL: ${baseUrl}/graphql`);
    console.log('');

    const response = await fetch(`${baseUrl}/graphql`, {
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
        console.log('❌ GraphQL Errors:');
        console.log(JSON.stringify(result.errors, null, 2));
        console.log('');
        return;
    }

    if (result.data?.__type) {
        const companyType = result.data.__type;
        console.log('📋 COMPANY TYPE INTROSPECTION:');
        console.log('───────────────────────────────────────────────────────');
        console.log(`Type: ${companyType.name} (${companyType.kind})`);
        if (companyType.description) {
            console.log(`Description: ${companyType.description}`);
        }
        console.log('');

        if (companyType.fields) {
            console.log(`✅ Found ${companyType.fields.length} fields via introspection!`);
            console.log('');
            console.log('📝 All Fields:');
            companyType.fields.forEach((field: any, index: number) => {
                const typeName = field.type.ofType?.name || field.type.name || 'unknown';
                const typeKind = field.type.kind;
                const deprecated = field.isDeprecated ? ' [DEPRECATED]' : '';
                console.log(`  ${String(index + 1).padStart(3, ' ')}. ${field.name.padEnd(30, ' ')} : ${typeName} (${typeKind})${deprecated}`);
            });
            console.log('');
            console.log(`💡 Total fields discovered: ${companyType.fields.length}`);
            console.log('   This is the COMPLETE field list from the data schema.');
            console.log('   Metadata API only returned 8 fields (custom fields only).');
        }
    } else {
        console.log('⚠️  No Company type found');
        console.log(JSON.stringify(result, null, 2));
    }
    console.log('');
}

/**
 * Main test execution
 */
async function runTest(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TEST: GraphQL Data Schema Introspection');
    console.log('  File: graphql_data_introspection.ts');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    try {
        // Validate environment variables
        if (!TWENTY_API_KEY || !TWENTY_URL) {
            throw new Error('Missing required environment variables: TWENTY_API_KEY or TWENTY_URL');
        }

        await introspectCompanyType();

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ TEST COMPLETED');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('💡 Key Insights:');
        console.log('   1. If introspection succeeds, we can discover fields dynamically!');
        console.log('   2. This would eliminate the need for hardcoded field lists');
        console.log('   3. Compare field count: Metadata=8, Data Introspection=?');
        console.log('');
        
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
