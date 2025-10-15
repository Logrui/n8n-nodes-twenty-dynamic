/**
 * Test: Field Labels vs Field Names
 * 
 * Purpose: Determine if Twenty CRM API provides display names (labels) for fields
 * and how we can use them in the n8n field dropdown.
 * 
 * Test Cases:
 * 1. Metadata API - Check if it returns field labels
 * 2. GraphQL Introspection - Check if it returns field descriptions/labels
 * 3. Compare label vs name for various fields
 */

const https = require('https');

const DOMAIN = 'https://twenty.envisicapital.com';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzI3NzA0OS04MWNmLTQ4MjEtOWEzOC1lMzM4NzJhN2RhZmMiLCJ3b3Jrc3BhY2VJZCI6ImUyMWI5Njc1LWIxZTEtNGY2Ny04MGJlLWNiZDgxYWVhZmUxZSIsIndvcmtzcGFjZU1lbWJlcklkIjoiOGMyNzcwNDktODFjZi00ODIxLTlhMzgtZTMzODcyYTdkYWZjIiwiaWF0IjoxNzI4ODgzNTcyLCJleHAiOjE3NjA0MTk1NzJ9.jP0rOl_9wKL6qPrVrj8LKmG_kT7tGUe8ktw1CQ_YTeI';

/**
 * Make GraphQL request
 */
function makeGraphQLRequest(endpoint, query) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${DOMAIN}/${endpoint}`);
        
        const postData = JSON.stringify({ query });
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * Test 1: Get field labels from Metadata API
 */
async function testMetadataLabels() {
    console.log('\n=== TEST 1: Metadata API Field Labels ===\n');
    
    const query = `
        query GetCompanyFields {
            objects(filter: { nameSingular: { eq: "company" } }) {
                edges {
                    node {
                        nameSingular
                        labelSingular
                        fields(paging: { first: 50 }) {
                            edges {
                                node {
                                    id
                                    name
                                    label
                                    description
                                    type
                                    isActive
                                    isCustom
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const response = await makeGraphQLRequest('metadata', query);
    
    // Debug: log the response structure
    console.log('Response structure:', JSON.stringify(response, null, 2).substring(0, 500));
    
    if (response.data?.objects?.edges?.[0]?.node) {
        const object = response.data.objects.edges[0].node;
        const fields = object.fields.edges.map(e => e.node);
        
        console.log(`Object: ${object.nameSingular} (${object.labelSingular})`);
        console.log(`Total fields: ${fields.length}\n`);
        
        console.log('Sample Fields (Name vs Label):');
        console.log('─'.repeat(80));
        
        // Show first 10 fields with their names and labels
        fields.slice(0, 15).forEach(field => {
            const nameLabel = field.label !== field.name ? `"${field.label}"` : '(same as name)';
            const status = field.isActive ? '✓' : '✗';
            const custom = field.isCustom ? '[CUSTOM]' : '[STANDARD]';
            
            console.log(`${status} ${field.name.padEnd(30)} → ${nameLabel}`);
            console.log(`   Type: ${field.type.padEnd(20)} ${custom}`);
            if (field.description) {
                console.log(`   Description: ${field.description}`);
            }
            console.log();
        });
        
        // Summary statistics
        const withLabels = fields.filter(f => f.label && f.label !== f.name);
        const withDescriptions = fields.filter(f => f.description);
        
        console.log('\n=== Summary ===');
        console.log(`Fields with labels different from name: ${withLabels.length}/${fields.length}`);
        console.log(`Fields with descriptions: ${withDescriptions.length}/${fields.length}`);
        console.log(`Active fields: ${fields.filter(f => f.isActive).length}/${fields.length}`);
        console.log(`Custom fields: ${fields.filter(f => f.isCustom).length}/${fields.length}`);
        
        return fields;
    }
    
    throw new Error('No fields found in metadata response');
}

/**
 * Test 2: Get field labels from GraphQL Introspection
 */
async function testGraphQLLabels() {
    console.log('\n\n=== TEST 2: GraphQL Introspection Field Labels ===\n');
    
    const query = `
        query IntrospectCompany {
            __type(name: "Company") {
                name
                description
                fields {
                    name
                    description
                    type {
                        name
                        kind
                    }
                    isDeprecated
                    deprecationReason
                }
            }
        }
    `;

    const response = await makeGraphQLRequest('graphql', query);
    
    if (response.data?.__type?.fields) {
        const type = response.data.__type;
        const fields = type.fields.filter(f => !f.isDeprecated);
        
        console.log(`Type: ${type.name}`);
        if (type.description) {
            console.log(`Description: ${type.description}`);
        }
        console.log(`Total fields: ${fields.length}\n`);
        
        console.log('Sample Fields (Name vs Description):');
        console.log('─'.repeat(80));
        
        // Show first 10 fields
        fields.slice(0, 15).forEach(field => {
            const desc = field.description || '(no description)';
            const typeName = field.type.name || 'N/A';
            
            console.log(`${field.name.padEnd(30)} → "${desc}"`);
            console.log(`   GraphQL Type: ${typeName}`);
            console.log();
        });
        
        // Summary
        const withDescriptions = fields.filter(f => f.description);
        
        console.log('\n=== Summary ===');
        console.log(`Fields with descriptions: ${withDescriptions.length}/${fields.length}`);
        
        return fields;
    }
    
    throw new Error('No fields found in GraphQL introspection response');
}

/**
 * Test 3: Compare both sources for specific fields
 */
async function testCompareLabels(metadataFields, graphqlFields) {
    console.log('\n\n=== TEST 3: Label Comparison (Metadata vs GraphQL) ===\n');
    
    // Create maps for easy lookup
    const metadataMap = new Map(metadataFields.map(f => [f.name, f]));
    const graphqlMap = new Map(graphqlFields.map(f => [f.name, f]));
    
    // Find common fields
    const commonFieldNames = [...metadataMap.keys()].filter(name => graphqlMap.has(name));
    
    console.log(`Common fields: ${commonFieldNames.length}\n`);
    console.log('Field Name Comparison:');
    console.log('─'.repeat(100));
    
    commonFieldNames.slice(0, 10).forEach(fieldName => {
        const meta = metadataMap.get(fieldName);
        const gql = graphqlMap.get(fieldName);
        
        console.log(`Field: ${fieldName}`);
        console.log(`  Metadata Label:      "${meta.label}"`);
        console.log(`  GraphQL Description: "${gql.description || '(none)'}"`);
        console.log(`  Match: ${meta.label === gql.description ? '✓ Same' : '✗ Different'}`);
        console.log();
    });
    
    // Recommendation
    console.log('\n=== RECOMMENDATION ===\n');
    
    const metadataHasLabels = metadataFields.filter(f => f.label && f.label !== f.name).length;
    const graphqlHasDescriptions = graphqlFields.filter(f => f.description).length;
    
    console.log('Data Quality:');
    console.log(`  Metadata API: ${metadataHasLabels}/${metadataFields.length} fields have meaningful labels`);
    console.log(`  GraphQL:      ${graphqlHasDescriptions}/${graphqlFields.length} fields have descriptions`);
    console.log();
    
    if (metadataHasLabels > graphqlHasDescriptions) {
        console.log('✅ RECOMMENDATION: Use Metadata API labels for field display names');
        console.log('   - Richer label data');
        console.log('   - More fields have meaningful labels');
        console.log('   - Can fall back to GraphQL descriptions when metadata unavailable');
    } else {
        console.log('✅ RECOMMENDATION: Use GraphQL descriptions for field display names');
        console.log('   - More complete coverage');
        console.log('   - Can fall back to metadata labels when available');
    }
    
    console.log('\nImplementation Strategy:');
    console.log('1. Merge both sources (metadata + GraphQL)');
    console.log('2. For each field, prefer:');
    console.log('   a. Metadata label (if available and different from name)');
    console.log('   b. GraphQL description (if available)');
    console.log('   c. Humanize field name (as fallback)');
    console.log('3. Store both name and label in field options');
    console.log('4. Display label in dropdown, use name as value');
}

/**
 * Test 4: Proposed Field Option Format
 */
async function testProposedFormat(metadataFields) {
    console.log('\n\n=== TEST 4: Proposed n8n Field Option Format ===\n');
    
    console.log('Current Format (v0.5.3):');
    console.log('─'.repeat(80));
    console.log('{\n' +
                '  name: "idealCustomerProfile",  // Field name (API name)\n' +
                '  value: "idealCustomerProfile|select",\n' +
                '  description: "SELECT"\n' +
                '}');
    
    console.log('\n\nProposed Format (with labels):');
    console.log('─'.repeat(80));
    console.log('{\n' +
                '  name: "Ideal Customer Profile",  // Display label (user-friendly)\n' +
                '  value: "idealCustomerProfile|select",  // Still use API name in value\n' +
                '  description: "SELECT"\n' +
                '}');
    
    console.log('\n\nSample Field Options:');
    console.log('─'.repeat(80));
    
    metadataFields.slice(0, 10).forEach(field => {
        const label = field.label || field.name;
        const displayName = label !== field.name ? label : `${field.name} (no label)`;
        
        console.log('{\n' +
                    `  name: "${displayName}",\n` +
                    `  value: "${field.name}|${field.type.toLowerCase()}",\n` +
                    `  description: "${field.type}"\n` +
                    '},');
    });
    
    console.log('\n\nBenefits:');
    console.log('✓ Users see friendly labels ("Ideal Customer Profile")');
    console.log('✓ API still uses correct field names ("idealCustomerProfile")');
    console.log('✓ No breaking changes (value format stays the same)');
    console.log('✓ Backward compatible');
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          FIELD LABELS INVESTIGATION - TWENTY CRM API              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    
    try {
        const metadataFields = await testMetadataLabels();
        const graphqlFields = await testGraphQLLabels();
        await testCompareLabels(metadataFields, graphqlFields);
        await testProposedFormat(metadataFields);
        
        console.log('\n\n✅ All tests completed successfully!\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run the tests
runTests();
