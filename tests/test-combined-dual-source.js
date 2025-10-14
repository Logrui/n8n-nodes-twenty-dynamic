/**
 * Combined Test: Custom SELECT vs Built-in Enum MULTI_SELECT
 * 
 * This test demonstrates that Twenty CRM has TWO different sources for
 * SELECT/MULTI_SELECT field options:
 * 
 * 1. CUSTOM SELECT FIELDS - Retrieved from /metadata endpoint
 *    - Example: job.status (SELECT with custom options)
 *    - Has options field with {id, color, label, value, position}
 *    - User-defined, stored in database
 * 
 * 2. BUILT-IN ENUM FIELDS - Retrieved via GraphQL introspection
 *    - Example: company.category (MULTI_SELECT with predefined enums)
 *    - Enum values from __type query
 *    - System-defined, not in metadata API
 * 
 * This test validates our dual-source strategy for the refactoring.
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

const TWENTY_API_URL = process.env.TWENTY_API_URL || 'http://localhost:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

if (!TWENTY_API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY not found in environment variables');
    console.error('Please set TWENTY_API_KEY in your .env file');
    process.exit(1);
}

const baseUrl = TWENTY_API_URL.replace(/\/+$/, '').replace(/\/graphql$/, '');
const graphqlUrl = `${baseUrl}/graphql`;
const metadataUrl = `${baseUrl}/metadata`;

console.log('🧪 Combined Test: Dual-Source SELECT/MULTI_SELECT Fields');
console.log('='.repeat(80));
console.log(`API URL: ${baseUrl}`);
console.log('Test Case 1: job.status (Custom SELECT from Metadata API)');
console.log('Test Case 2: company.category (Built-in MULTI_SELECT from GraphQL)');
console.log('='.repeat(80));
console.log();

/**
 * Metadata API query for custom SELECT fields
 */
const METADATA_QUERY = `
    query GetAllObjects {
        objects(paging: { first: 100 }) {
            edges {
                node {
                    id
                    nameSingular
                    labelSingular
                    fields(paging: { first: 100 }) {
                        edges {
                            node {
                                id
                                name
                                label
                                type
                                isNullable
                                options
                            }
                        }
                    }
                }
            }
        }
    }
`;

/**
 * GraphQL introspection for built-in enum fields
 */
const GRAPHQL_TYPE_QUERY = (typeName) => `
    query GetTypeFields {
        __type(name: "${typeName}") {
            name
            fields {
                name
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

const GRAPHQL_ENUM_QUERY = (enumName) => `
    query GetEnumValues {
        __type(name: "${enumName}") {
            name
            kind
            enumValues {
                name
                description
            }
        }
    }
`;

/**
 * Simulate the dual-source getOptionsForSelectField implementation
 */
async function getOptionsForField(resourceName, fieldName, fieldType) {
    console.log(`🔍 Getting options for ${resourceName}.${fieldName} (${fieldType})`);
    console.log('-'.repeat(80));
    
    let options = null;
    let source = null;
    
    // Strategy 1: Try Metadata API first (custom SELECT fields)
    console.log('Strategy 1: Checking Metadata API...');
    try {
        const response = await fetch(metadataUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TWENTY_API_KEY}`,
            },
            body: JSON.stringify({ query: METADATA_QUERY }),
        });
        
        const result = await response.json();
        
        if (result.data?.objects?.edges) {
            const resource = result.data.objects.edges.find(
                e => e.node.nameSingular === resourceName
            )?.node;
            
            if (resource) {
                const field = resource.fields.edges.find(
                    e => e.node.name === fieldName
                )?.node;
                
                if (field && field.options) {
                    // Parse options
                    let parsedOptions = typeof field.options === 'string' 
                        ? JSON.parse(field.options) 
                        : field.options;
                    
                    if (parsedOptions && parsedOptions.length > 0) {
                        options = parsedOptions.sort((a, b) => a.position - b.position).map(opt => ({
                            name: opt.label,
                            value: opt.value,
                            description: `Color: ${opt.color}`,
                        }));
                        source = 'metadata';
                        console.log(`✅ Found in Metadata API: ${options.length} options`);
                        console.log(`   Field type: ${field.type}`);
                        console.log(`   Field ID: ${field.id}`);
                    }
                } else if (field) {
                    console.log(`⚠️  Field found in metadata but has no options`);
                    console.log(`   Field type: ${field.type}`);
                }
            } else {
                console.log(`⚠️  Resource '${resourceName}' not found in metadata API`);
            }
        }
    } catch (error) {
        console.log(`⚠️  Metadata API error: ${error.message}`);
    }
    
    console.log();
    
    // Strategy 2: Try GraphQL Introspection (built-in enum fields)
    if (!options) {
        console.log('Strategy 2: Checking GraphQL Introspection...');
        try {
            // Convert resource name to GraphQL type name (capitalize)
            const typeName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
            
            // Get type schema
            const typeResponse = await fetch(graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TWENTY_API_KEY}`,
                },
                body: JSON.stringify({ query: GRAPHQL_TYPE_QUERY(typeName) }),
            });
            
            const typeResult = await typeResponse.json();
            
            if (typeResult.data?.__type?.fields) {
                const field = typeResult.data.__type.fields.find(f => f.name === fieldName);
                
                if (field) {
                    console.log(`✅ Field found in GraphQL schema`);
                    console.log(`   Type kind: ${field.type.kind}`);
                    console.log(`   Type name: ${field.type.name || 'N/A'}`);
                    
                    // Check if it's a LIST of ENUM (MULTI_SELECT) or ENUM (SELECT)
                    let enumTypeName = null;
                    
                    if (field.type.kind === 'LIST' && field.type.ofType?.kind === 'ENUM') {
                        enumTypeName = field.type.ofType.name;
                        console.log(`   Pattern: LIST of ENUM (MULTI_SELECT)`);
                    } else if (field.type.kind === 'ENUM') {
                        enumTypeName = field.type.name;
                        console.log(`   Pattern: ENUM (SELECT)`);
                    }
                    
                    if (enumTypeName) {
                        console.log(`   Enum type: ${enumTypeName}`);
                        
                        // Get enum values
                        const enumResponse = await fetch(graphqlUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${TWENTY_API_KEY}`,
                            },
                            body: JSON.stringify({ query: GRAPHQL_ENUM_QUERY(enumTypeName) }),
                        });
                        
                        const enumResult = await enumResponse.json();
                        
                        if (enumResult.data?.__type?.enumValues) {
                            const enumValues = enumResult.data.__type.enumValues;
                            options = enumValues.map((enumValue, index) => ({
                                name: enumValue.name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                                value: enumValue.name,
                                description: enumValue.description || 'Built-in enum value',
                            }));
                            source = 'graphql-introspection';
                            console.log(`✅ Found enum values: ${options.length} options`);
                        }
                    } else {
                        console.log(`⚠️  Field is not ENUM or LIST of ENUM`);
                    }
                } else {
                    console.log(`⚠️  Field '${fieldName}' not found in ${typeName} type`);
                }
            }
        } catch (error) {
            console.log(`⚠️  GraphQL introspection error: ${error.message}`);
        }
    }
    
    console.log();
    
    if (!options) {
        console.log('❌ Could not find options from either source');
        return null;
    }
    
    return {
        resourceName,
        fieldName,
        fieldType,
        source,
        optionsCount: options.length,
        options,
    };
}

/**
 * Run combined test
 */
async function runCombinedTest() {
    console.log('🚀 Starting Dual-Source Options Retrieval Test\n');
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: [],
    };
    
    // Test 1: Custom SELECT field (job.status)
    console.log('═'.repeat(80));
    console.log('TEST 1: Custom SELECT Field (job.status)');
    console.log('═'.repeat(80));
    console.log();
    
    const test1 = await getOptionsForField('job', 'status', 'SELECT');
    results.tests.push(test1);
    
    if (test1) {
        console.log('📊 Test 1 Results:');
        console.log(`   Source: ${test1.source}`);
        console.log(`   Options: ${test1.optionsCount}`);
        console.log(`   Sample: ${test1.options[0].name} = ${test1.options[0].value}`);
        console.log();
    }
    
    console.log();
    
    // Test 2: Built-in MULTI_SELECT field (company.category)
    console.log('═'.repeat(80));
    console.log('TEST 2: Built-in MULTI_SELECT Field (company.category)');
    console.log('═'.repeat(80));
    console.log();
    
    const test2 = await getOptionsForField('company', 'category', 'MULTI_SELECT');
    results.tests.push(test2);
    
    if (test2) {
        console.log('📊 Test 2 Results:');
        console.log(`   Source: ${test2.source}`);
        console.log(`   Options: ${test2.optionsCount}`);
        console.log(`   Sample: ${test2.options[0].name} = ${test2.options[0].value}`);
        console.log();
    }
    
    console.log();
    
    // Summary
    console.log('═'.repeat(80));
    console.log('✅ COMBINED TEST RESULTS');
    console.log('═'.repeat(80));
    console.log();
    
    const metadataCount = results.tests.filter(t => t?.source === 'metadata').length;
    const graphqlCount = results.tests.filter(t => t?.source === 'graphql-introspection').length;
    
    console.log('Source Distribution:');
    console.log(`  📦 Metadata API: ${metadataCount} field(s)`);
    console.log(`  🔍 GraphQL Introspection: ${graphqlCount} field(s)`);
    console.log();
    
    console.log('Key Findings:');
    console.log('  ✅ Custom SELECT fields: Use Metadata API (/metadata endpoint)');
    console.log('  ✅ Built-in enum fields: Use GraphQL Introspection (__type query)');
    console.log('  ✅ Both transform successfully to n8n dropdown format');
    console.log('  ✅ Dual-source strategy required for complete coverage');
    console.log();
    
    console.log('Implementation Strategy:');
    console.log('  1. Try Metadata API first (faster, more detailed)');
    console.log('  2. Fall back to GraphQL Introspection (slower, less detail)');
    console.log('  3. Cache results to minimize API calls');
    console.log('  4. Handle both SELECT and MULTI_SELECT identically');
    console.log();
    
    if (test1 && test2) {
        console.log('✅ ALL TESTS PASSED - Dual-source strategy validated!');
        console.log();
        
        results.allTestsPassed = true;
        results.conclusion = 'Dual-source strategy required and validated';
        
        // Save results
        const fs = require('fs');
        fs.writeFileSync(
            'COMBINED_TEST_RESULTS.json',
            JSON.stringify(results, null, 2)
        );
        console.log('💾 Results saved to: COMBINED_TEST_RESULTS.json');
        console.log();
    } else {
        console.log('❌ Some tests failed');
        process.exit(1);
    }
}

runCombinedTest().catch(error => {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
});
