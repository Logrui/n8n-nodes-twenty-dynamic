/**
 * Part 4: Query actual Company data from /graphql endpoint
 * 
 * This test queries real Company records to see what fields are available
 * in the data API (not metadata API). This will help determine if standard
 * fields like 'name', 'id', 'createdAt' are available in actual queries
 * even though they don't appear in the metadata.
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL;

interface IGraphQLResponse {
    data?: {
        companies?: {
            edges: Array<{
                node: any; // Use 'any' to see what fields are actually returned
            }>;
        };
    };
    errors?: Array<{
        message: string;
        extensions?: any;
        [key: string]: any;
    }>;
}

/**
 * Query actual Company data with common standard fields
 */
async function queryCompanyData(): Promise<void> {
    // Fixed query based on error messages:
    // - No "paging" argument, use "first" and "after" directly
    // - domainName needs subfields (Links type)
    // - accountOwner name is FullName type with firstName/lastName subfields
    // - createdBy name is also FullName type
    // - addressPostCode -> addressPostcode
    const query = `
        query GetCompanies {
            companies(first: 5) {
                edges {
                    node {
                        id
                        name
                        domainName {
                            primaryLinkUrl
                            primaryLinkLabel
                        }
                        accountOwner {
                            id
                            name {
                                firstName
                                lastName
                            }
                        }
                        createdBy {
                            name
                        }
                        address {
                            addressStreet1
                            addressStreet2
                            addressCity
                            addressState
                            addressPostcode
                            addressCountry
                        }
                        employees
                        linkedinLink {
                            primaryLinkUrl
                            primaryLinkLabel
                        }
                        xLink {
                            primaryLinkUrl
                            primaryLinkLabel
                        }
                        annualRecurringRevenue {
                            amountMicros
                            currencyCode
                        }
                        idealCustomerProfile
                        position
                        createdAt
                        updatedAt
                        deletedAt
                        favorites {
                            edges {
                                node {
                                    id
                                }
                            }
                        }
                        opportunities {
                            edges {
                                node {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    console.log('🔍 Querying actual Company data from /graphql endpoint...');
    const baseUrl = TWENTY_URL!.endsWith('/') ? TWENTY_URL!.slice(0, -1) : TWENTY_URL;
    console.log(`📍 URL: ${baseUrl}/graphql`);
    console.log('📊 Requesting first 5 companies with all expected fields');
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

    const result = await response.json() as IGraphQLResponse;

    console.log('📋 GRAPHQL RESPONSE:');
    console.log('───────────────────────────────────────────────────────');
    console.log('');

    if (result.errors) {
        console.log('❌ GraphQL Errors Encountered:');
        result.errors.forEach((error, index) => {
            console.log(`\n  Error ${index + 1}:`);
            console.log(`  Message: ${error.message}`);
            if (error.extensions) {
                console.log(`  Extensions: ${JSON.stringify(error.extensions, null, 2)}`);
            }
        });
        console.log('');
        console.log('⚠️  These errors indicate which fields are NOT available in the data API');
        console.log('');
    }

    if (result.data?.companies?.edges) {
        const companies = result.data.companies.edges;
        console.log(`✅ Successfully retrieved ${companies.length} company records`);
        console.log('');

        if (companies.length > 0) {
            console.log('📝 Sample Company Record (first result):');
            console.log('───────────────────────────────────────────────────────');
            const firstCompany = companies[0].node;
            
            // Display all fields that were successfully retrieved
            console.log(JSON.stringify(firstCompany, null, 2));
            console.log('');

            // Analyze which fields are available
            const availableFields = Object.keys(firstCompany);
            console.log('✅ Available Fields in Data API:');
            availableFields.forEach(field => {
                const value = firstCompany[field];
                const type = Array.isArray(value) ? 'Array' : typeof value;
                const preview = value === null ? 'null' : 
                               value === undefined ? 'undefined' :
                               typeof value === 'object' ? '{...}' :
                               String(value).substring(0, 50);
                console.log(`  - ${field}: ${type} = ${preview}`);
            });
            console.log('');
            console.log(`Total available fields: ${availableFields.length}`);
        }
    } else {
        console.log('⚠️  No company data returned');
        console.log('');
        console.log('Full response:');
        console.log(JSON.stringify(result, null, 2));
    }
    console.log('');
}

/**
 * Query with minimal fields to establish baseline
 */
async function queryCompanyMinimal(): Promise<string[]> {
    // Start with just ID to see if the query works at all
    // Fixed: use "first" instead of "paging: { first: }"
    const query = `
        query GetCompaniesMinimal {
            companies(first: 1) {
                edges {
                    node {
                        id
                    }
                }
            }
        }
    `;

    console.log('🔍 Testing minimal Company query (id only)...');
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

    const result = await response.json() as IGraphQLResponse;

    if (result.errors) {
        console.log('❌ Even minimal query failed:');
        console.log(JSON.stringify(result.errors, null, 2));
        console.log('');
        return [];
    }

    if (result.data?.companies?.edges && result.data.companies.edges.length > 0) {
        const company = result.data.companies.edges[0].node;
        console.log(`✅ Minimal query successful! Retrieved company ID: ${company.id || 'unknown'}`);
        console.log('');
        return Object.keys(company);
    }

    return [];
}

/**
 * Main test execution
 */
async function runTest(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TEST: GraphQL Company Data Query');
    console.log('  File: graphql_company_data_query.ts');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    try {
        // Validate environment variables
        if (!TWENTY_API_KEY || !TWENTY_URL) {
            throw new Error('Missing required environment variables: TWENTY_API_KEY or TWENTY_URL');
        }

        // Step 1: Test minimal query
        console.log('STEP 1: Minimal Query Test');
        console.log('───────────────────────────────────────────────────────');
        const minimalFields = await queryCompanyMinimal();
        console.log('');

        // Step 2: Query with all expected fields
        console.log('STEP 2: Full Query Test');
        console.log('───────────────────────────────────────────────────────');
        await queryCompanyData();

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ TEST COMPLETED');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('💡 Key Insights:');
        console.log('   1. Check errors to see which fields are NOT available');
        console.log('   2. Check sample data to see which fields ARE available');
        console.log('   3. Compare with metadata API results (only 8 fields)');
        console.log('   4. If more fields available here, we can query without metadata!');
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
