/**
 * Quick test to verify the GraphQL query fixes work
 * Tests the exact patterns we're using in the node code
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

async function testQuery(name, query, variables = null) {
    console.log(`\n🧪 Testing: ${name}`);
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
            console.log('❌ FAILED:', result.errors.map(e => e.message).join(', '));
            return false;
        } else {
            console.log('✅ SUCCESS');
            const firstKey = Object.keys(result.data || {})[0];
            if (firstKey && result.data[firstKey]?.edges) {
                console.log(`   Found ${result.data[firstKey].edges.length} records`);
                if (result.data[firstKey].edges[0]) {
                    console.log('   Sample:', JSON.stringify(result.data[firstKey].edges[0].node, null, 2));
                }
            }
            return true;
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
        return false;
    }
}

async function main() {
    console.log('\n🔍 Verifying GraphQL Query Fixes\n');
    console.log('Testing against:', CONFIG.domain);
    console.log('');

    // Test 1: buildListQuery pattern (findMany operation)
    const test1 = await testQuery(
        'buildListQuery (findMany) - companies(first: $limit)',
        `query ListCompanies($limit: Int!) {
            companies(first: $limit) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`,
        { limit: 10 }
    );

    // Test 2: buildGetQuery pattern (get operation)
    // First get a valid ID from the list
    let companyId = null;
    try {
        const listResponse = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                query: `query { companies(first: 1) { edges { node { id } } } }`,
            }),
        });
        const listResult = await listResponse.json();
        if (listResult.data?.companies?.edges?.[0]?.node?.id) {
            companyId = listResult.data.companies.edges[0].node.id;
        }
    } catch (e) {
        console.log('⚠️  Could not fetch company ID for get test');
    }

    const test2 = companyId ? await testQuery(
        'buildGetQuery (get) - companies(filter: { id: { eq: $id } })',
        `query GetCompany($id: UUID!) {
            companies(filter: { id: { eq: $id } }) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`,
        { id: companyId }
    ) : false;

    // Test 3: getRecordsForDatabase pattern (From List dropdown)
    const test3 = await testQuery(
        'getRecordsForDatabase (From List) - companies(first: $limit)',
        `query ListCompanies($limit: Int!) {
            companies(first: $limit) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }`,
        { limit: 100 }
    );

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    const tests = [
        { name: 'buildListQuery (findMany)', passed: test1 },
        { name: 'buildGetQuery (get)', passed: test2 },
        { name: 'getRecordsForDatabase (From List)', passed: test3 },
    ];
    
    tests.forEach(t => {
        console.log(`${t.passed ? '✅' : '❌'} ${t.name}`);
    });
    
    const allPassed = tests.every(t => t.passed);
    console.log('');
    if (allPassed) {
        console.log('🎉 All tests passed! Ready to publish v0.5.19');
    } else {
        console.log('⚠️  Some tests failed. Review the errors above.');
    }
    console.log('');
}

main().catch(console.error);
