/**
 * Simple test to verify GraphQL query structure for Twenty CRM
 * 
 * This test will help us discover the correct query pattern for the /graphql endpoint.
 * It tests various patterns to see which one works.
 * 
 * HOW TO RUN:
 * 1. Make sure tests/.env file has TWENTY_URL and TWENTY_API_KEY
 * 2. Run: node test-simple.js
 * 3. Look for ✅ SUCCESS messages to see which pattern works
 * 4. Share the results so we can fix the n8n node
 */

// Load environment variables from tests/.env
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, 'tests', '.env');
    if (!fs.existsSync(envPath)) {
        console.log('❌ .env file not found at:', envPath);
        process.exit(1);
    }
    
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

// ============================================================================
// CONFIGURATION - LOADED FROM tests/.env
// ============================================================================
const CONFIG = {
    domain: env.TWENTY_URL?.replace(/\/$/, ''),  // Remove trailing slash
    apiKey: env.TWENTY_API_KEY,
};
// ============================================================================

async function testQuery(queryName, query, variables = null) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Testing: ${queryName}`);
    console.log('─'.repeat(80));
    console.log('Query:', query.trim());
    if (variables) {
        console.log('Variables:', JSON.stringify(variables, null, 2));
    }
    console.log('─'.repeat(80));

    try {
        const response = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                query,
                ...(variables && { variables }),
            }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ FAILED');
            console.log('Errors:', result.errors.map(e => e.message).join(', '));
            return false;
        } else {
            console.log('✅ SUCCESS');
            console.log('Response data keys:', Object.keys(result.data || {}));
            
            // Show sample data
            const firstKey = Object.keys(result.data || {})[0];
            if (firstKey && result.data[firstKey]) {
                const data = result.data[firstKey];
                if (Array.isArray(data)) {
                    console.log(`Found ${data.length} records (array format)`);
                    if (data[0]) console.log('Sample:', JSON.stringify(data[0], null, 2));
                } else if (data.edges) {
                    console.log(`Found ${data.edges.length} records (edges/node format)`);
                    if (data.edges[0]?.node) console.log('Sample:', JSON.stringify(data.edges[0].node, null, 2));
                } else {
                    console.log('Data structure:', JSON.stringify(data, null, 2));
                }
            }
            return true;
        }
    } catch (error) {
        console.log('❌ ERROR');
        console.log('Error:', error.message);
        return false;
    }
}

async function main() {
    console.log('\n🧪 Twenty CRM GraphQL Query Structure Test\n');

    // Check config
    if (!CONFIG.apiKey || !CONFIG.domain) {
        console.log('❌ Missing configuration in tests/.env file!\n');
        console.log('Please ensure tests/.env has:');
        console.log('  TWENTY_URL=https://your-instance.twenty.com');
        console.log('  TWENTY_API_KEY=your-api-key-here');
        process.exit(1);
    }

    console.log('📍 Testing against:', CONFIG.domain);
    console.log('🔑 Using API key:', CONFIG.apiKey.substring(0, 20) + '...\n');

    const results = [];

    // Test 0: Introspection to see what's available
    console.log('\n🔍 First, let\'s discover what queries are available...\n');
    const introspectionQuery = `
        query IntrospectionQuery {
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
        if (result.data && result.data.__schema) {
            const queries = result.data.__schema.queryType.fields;
            const companyQueries = queries.filter(q => q.name.toLowerCase().includes('compan'));
            console.log('📋 Available company-related queries:');
            companyQueries.forEach(q => {
                const args = q.args.map(a => `${a.name}: ${a.type.name || a.type.kind}`).join(', ');
                console.log(`   • ${q.name}${args ? `(${args})` : ''}`);
            });
            console.log('');
        }
    } catch (error) {
        console.log('⚠️  Could not fetch introspection data, continuing with tests...\n');
    }

    // Test 1: Singular with filter (current buildGetQuery pattern)
    results.push(await testQuery(
        'Test 1: Singular with filter (current buildGetQuery pattern)',
        `query Test1($id: UUID!) {
            company(filter: { id: { eq: $id } }) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`,
        { id: '00000000-0000-0000-0000-000000000000' } // Dummy UUID for testing structure
    ));

    // Test 2: Singular without parameters
    results.push(await testQuery(
        'Test 2: Singular without parameters',
        `query Test2 {
            company {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`
    ));

    // Test 3: Plural without parameters
    results.push(await testQuery(
        'Test 3: Plural without parameters',
        `query Test3 {
            companies {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`
    ));

    // Test 4: Plural with paging
    results.push(await testQuery(
        'Test 4: Plural with paging',
        `query Test4($limit: Int!) {
            companies(paging: { first: $limit }) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`,
        { limit: 10 }
    ));

    // Test 5: Direct array (no edges)
    results.push(await testQuery(
        'Test 5: Direct array response',
        `query Test5 {
            companies {
                id
                name
            }
        }`
    ));

    // Test 6: findManyCompanies pattern
    results.push(await testQuery(
        'Test 6: findMany pattern',
        `query Test6 {
            findManyCompanies {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`
    ));

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    const successCount = results.filter(r => r).length;
    console.log(`✅ Successful: ${successCount}/${results.length}`);
    console.log(`❌ Failed: ${results.length - successCount}/${results.length}`);
    
    if (successCount > 0) {
        console.log('\n✨ At least one pattern works! Check the successful queries above.');
    } else {
        console.log('\n⚠️  None of the common patterns worked. You may need to:');
        console.log('   1. Check your API key and domain');
        console.log('   2. Verify the Twenty CRM version');
        console.log('   3. Check if the company object exists in your instance');
    }
    console.log('');
}

main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
