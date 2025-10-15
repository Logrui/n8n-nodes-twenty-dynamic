/**
 * Test script to discover the correct GraphQL query structure for Twenty CRM
 * This will help us understand what arguments and structure the API actually accepts
 */

const https = require('https');
const http = require('http');

// Configuration - UPDATE THESE VALUES
const TWENTY_DOMAIN = 'https://your-instance.twenty.com'; // e.g., https://demo.twenty.com
const API_KEY = 'your-api-key-here';

/**
 * Make a GraphQL request to Twenty CRM
 */
async function makeGraphQLRequest(endpoint, query, variables = null) {
    const url = new URL(`/${endpoint}`, TWENTY_DOMAIN);
    const protocol = url.protocol === 'https:' ? https : http;

    const body = JSON.stringify({
        query,
        ...(variables && { variables }),
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(body);
        req.end();
    });
}

/**
 * Test different query patterns to find what works
 */
async function runTests() {
    console.log('🧪 Testing GraphQL Query Patterns for Twenty CRM\n');
    console.log('=' .repeat(80));

    // Test 1: Introspection query to see what's available
    console.log('\n📋 Test 1: GraphQL Schema Introspection');
    console.log('-'.repeat(80));
    
    const introspectionQuery = `
        query IntrospectSchema {
            __schema {
                queryType {
                    fields {
                        name
                        args {
                            name
                            type {
                                name
                                kind
                            }
                        }
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
        }
    `;

    try {
        const result = await makeGraphQLRequest('graphql', introspectionQuery);
        if (result.errors) {
            console.log('❌ Introspection failed:', JSON.stringify(result.errors, null, 2));
        } else {
            console.log('✅ Introspection successful!');
            
            // Find document-related queries
            const documentQueries = result.data.__schema.queryType.fields.filter(f => 
                f.name.toLowerCase().includes('document')
            );
            
            if (documentQueries.length > 0) {
                console.log('\n📄 Document-related queries found:');
                documentQueries.forEach(field => {
                    console.log(`\n  Query: ${field.name}`);
                    console.log(`  Return Type: ${field.type.name || field.type.kind}`);
                    if (field.args.length > 0) {
                        console.log('  Arguments:');
                        field.args.forEach(arg => {
                            console.log(`    - ${arg.name}: ${arg.type.name || arg.type.kind}`);
                        });
                    } else {
                        console.log('  Arguments: None');
                    }
                });
            }

            // Find company-related queries
            const companyQueries = result.data.__schema.queryType.fields.filter(f => 
                f.name.toLowerCase().includes('compan')
            );
            
            if (companyQueries.length > 0) {
                console.log('\n🏢 Company-related queries found:');
                companyQueries.forEach(field => {
                    console.log(`\n  Query: ${field.name}`);
                    console.log(`  Return Type: ${field.type.name || field.type.kind}`);
                    if (field.args.length > 0) {
                        console.log('  Arguments:');
                        field.args.forEach(arg => {
                            console.log(`    - ${arg.name}: ${arg.type.name || arg.type.kind}`);
                        });
                    } else {
                        console.log('  Arguments: None');
                    }
                });
            }
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 2: Query with filter (current pattern in buildGetQuery)
    console.log('\n\n📋 Test 2: Query with filter parameter (current buildGetQuery pattern)');
    console.log('-'.repeat(80));
    
    const queryWithFilter = `
        query TestWithFilter {
            company(filter: {}) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;

    try {
        const result = await makeGraphQLRequest('graphql', queryWithFilter);
        if (result.errors) {
            console.log('❌ Failed:', result.errors[0].message);
        } else {
            console.log('✅ Success! Pattern works.');
            console.log('   Records found:', result.data.company?.edges?.length || 0);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 3: Query without any parameters
    console.log('\n\n📋 Test 3: Query without parameters');
    console.log('-'.repeat(80));
    
    const queryNoParams = `
        query TestNoParams {
            company {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;

    try {
        const result = await makeGraphQLRequest('graphql', queryNoParams);
        if (result.errors) {
            console.log('❌ Failed:', result.errors[0].message);
        } else {
            console.log('✅ Success! Pattern works.');
            console.log('   Records found:', result.data.company?.edges?.length || 0);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 4: Direct array response (no edges/node)
    console.log('\n\n📋 Test 4: Direct array response (no edges/node)');
    console.log('-'.repeat(80));
    
    const queryDirectArray = `
        query TestDirectArray {
            companies {
                id
                name
            }
        }
    `;

    try {
        const result = await makeGraphQLRequest('graphql', queryDirectArray);
        if (result.errors) {
            console.log('❌ Failed:', result.errors[0].message);
        } else {
            console.log('✅ Success! Pattern works.');
            console.log('   Records found:', Array.isArray(result.data.companies) ? result.data.companies.length : 'Not an array');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 5: Plural with paging
    console.log('\n\n📋 Test 5: Plural form with paging parameter');
    console.log('-'.repeat(80));
    
    const queryPluralPaging = `
        query TestPluralPaging($limit: Int!) {
            companies(paging: { first: $limit }) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;

    try {
        const result = await makeGraphQLRequest('graphql', queryPluralPaging, { limit: 10 });
        if (result.errors) {
            console.log('❌ Failed:', result.errors[0].message);
        } else {
            console.log('✅ Success! Pattern works.');
            console.log('   Records found:', result.data.companies?.edges?.length || 0);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 6: Connection pattern
    console.log('\n\n📋 Test 6: Connection pattern (allCompanies or companiesConnection)');
    console.log('-'.repeat(80));
    
    const queryConnection = `
        query TestConnection {
            companiesConnection {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;

    try {
        const result = await makeGraphQLRequest('graphql', queryConnection);
        if (result.errors) {
            console.log('❌ Failed:', result.errors[0].message);
        } else {
            console.log('✅ Success! Pattern works.');
            console.log('   Records found:', result.data.companiesConnection?.edges?.length || 0);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    // Test 7: Singular with limit argument
    console.log('\n\n📋 Test 7: Singular form with limit argument');
    console.log('-'.repeat(80));
    
    const querySingularLimit = `
        query TestSingularLimit($limit: Int!) {
            company(limit: $limit) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;

    try {
        const result = await makeGraphQLRequest('graphql', querySingularLimit, { limit: 10 });
        if (result.errors) {
            console.log('❌ Failed:', result.errors[0].message);
        } else {
            console.log('✅ Success! Pattern works.');
            console.log('   Records found:', result.data.company?.edges?.length || 0);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🏁 Testing Complete!\n');
}

// Run the tests
if (API_KEY === 'your-api-key-here' || TWENTY_DOMAIN === 'https://your-instance.twenty.com') {
    console.log('⚠️  Please update TWENTY_DOMAIN and API_KEY at the top of this file first!');
    console.log('\nEdit test-graphql-queries.js and set:');
    console.log('  TWENTY_DOMAIN = "https://your-instance.twenty.com"');
    console.log('  API_KEY = "your-actual-api-key"');
    process.exit(1);
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
