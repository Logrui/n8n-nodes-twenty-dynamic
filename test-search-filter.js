/**
 * Test to verify GraphQL filter query for searching records
 * 
 * This tests the filter syntax to enable search functionality
 * in the "From List" dropdown
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, 'tests', '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return envVars;
}

const env = loadEnv();
const CONFIG = {
    domain: env.TWENTY_URL?.replace(/\/$/, ''),
    apiKey: env.TWENTY_API_KEY,
};

async function testSearchQuery(searchTerm, testName) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 ${testName}`);
    console.log('='.repeat(80));
    console.log(`Search term: "${searchTerm}"`);
    console.log('');

    // Test different filter patterns
    const queries = [
        {
            name: 'Pattern 1: iLike filter (case-insensitive partial match)',
            query: `
                query SearchCompanies($limit: Int!, $searchTerm: String!) {
                    companies(first: $limit, filter: { name: { iLike: $searchTerm } }) {
                        edges {
                            node {
                                id
                                name
                            }
                        }
                    }
                }
            `,
            variables: { limit: 10, searchTerm: `%${searchTerm}%` }
        },
        {
            name: 'Pattern 2: startsWith filter',
            query: `
                query SearchCompanies($limit: Int!, $searchTerm: String!) {
                    companies(first: $limit, filter: { name: { startsWith: $searchTerm } }) {
                        edges {
                            node {
                                id
                                name
                            }
                        }
                    }
                }
            `,
            variables: { limit: 10, searchTerm }
        },
        {
            name: 'Pattern 3: eq filter (exact match)',
            query: `
                query SearchCompanies($limit: Int!, $searchTerm: String!) {
                    companies(first: $limit, filter: { name: { eq: $searchTerm } }) {
                        edges {
                            node {
                                id
                                name
                            }
                        }
                    }
                }
            `,
            variables: { limit: 10, searchTerm }
        }
    ];

    for (const test of queries) {
        console.log(`Testing: ${test.name}`);
        console.log('Variables:', JSON.stringify(test.variables, null, 2));
        
        try {
            const response = await fetch(`${CONFIG.domain}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.apiKey}`,
                },
                body: JSON.stringify({
                    query: test.query,
                    variables: test.variables,
                }),
            });

            const result = await response.json();

            if (result.errors) {
                console.log('❌ FAILED:', result.errors.map(e => e.message).join(', '));
            } else {
                const edges = result.data.companies.edges;
                console.log(`✅ SUCCESS - Found ${edges.length} results`);
                if (edges.length > 0) {
                    console.log('Results:');
                    edges.forEach((edge, i) => {
                        console.log(`   ${i + 1}. ${edge.node.name} (${edge.node.id})`);
                    });
                } else {
                    console.log('   (No results - filter may be too restrictive)');
                }
            }
        } catch (error) {
            console.log('❌ ERROR:', error.message);
        }
        console.log('');
    }
}

async function testIntrospection() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Introspecting CompanyFilterInput to see available filters');
    console.log('='.repeat(80));
    
    const introspectionQuery = `
        query IntrospectFilter {
            __type(name: "CompanyFilterInput") {
                inputFields {
                    name
                    type {
                        name
                        kind
                        inputFields {
                            name
                            type {
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
        const response = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({ query: introspectionQuery }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ FAILED:', result.errors.map(e => e.message).join(', '));
        } else if (result.data.__type) {
            console.log('✅ Available filter fields:\n');
            const nameFilter = result.data.__type.inputFields.find(f => f.name === 'name');
            if (nameFilter) {
                console.log('name field filter options:');
                if (nameFilter.type.inputFields) {
                    nameFilter.type.inputFields.forEach(f => {
                        console.log(`   • ${f.name}: ${f.type.name || f.type.kind}`);
                    });
                } else {
                    console.log('   Type:', nameFilter.type.name);
                }
            } else {
                console.log('❌ name field not found in CompanyFilterInput');
            }
            
            console.log('\nAll available filters:');
            result.data.__type.inputFields.forEach(f => {
                console.log(`   • ${f.name}`);
            });
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

async function main() {
    console.log('\n🔍 Testing Search Filters for "From List" Dropdown\n');
    console.log('Testing against:', CONFIG.domain);

    // First, do introspection to see what's available
    await testIntrospection();

    // Test with "Siren" (should match exactly)
    await testSearchQuery('Siren', 'Test A: Search for "Siren"');

    // Test with partial match "Mona" (should match "Monadical")
    await testSearchQuery('Mona', 'Test B: Search for "Mona" (partial)');

    // Test with empty string (should return all)
    await testSearchQuery('', 'Test C: Empty search (should return all)');

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`
Based on these results, we need to:
1. Identify which filter pattern works (iLike, startsWith, eq, etc.)
2. Update getRecordsForDatabase() to accept filter parameter
3. Apply the filter when user types in search box
4. Handle empty search (return all records)
`);
}

main().catch(console.error);
