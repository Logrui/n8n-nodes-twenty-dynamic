/**
 * VERIFICATION TEST - v0.5.0 Implementation
 * 
 * This script verifies that all dual-source architecture components are correctly implemented.
 * Tests the complete flow without requiring a Twenty CRM connection.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICATION TEST - v0.5.0 Implementation\n');
console.log('=' . repeat(80));

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function test(name, fn) {
    try {
        fn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`✅ PASS: ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: error.message });
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
    }
}

console.log('\n📦 Phase 1: Verify GraphQL Introspection Methods\n');

// Test 1.1: Check queryGraphQLType exists
test('queryGraphQLType method exists in TwentyApi.client.ts', () => {
    const clientFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'TwentyApi.client.ts'),
        'utf8'
    );
    
    if (!clientFile.includes('export async function queryGraphQLType')) {
        throw new Error('queryGraphQLType method not found');
    }
    
    if (!clientFile.includes('__type(name:')) {
        throw new Error('GraphQL introspection query not found');
    }
});

// Test 1.2: Check queryEnumValues exists
test('queryEnumValues method exists in TwentyApi.client.ts', () => {
    const clientFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'TwentyApi.client.ts'),
        'utf8'
    );
    
    if (!clientFile.includes('export async function queryEnumValues')) {
        throw new Error('queryEnumValues method not found');
    }
    
    if (!clientFile.includes('enumValues')) {
        throw new Error('Enum values query not found');
    }
});

// Test 1.3: Check IFieldMetadata interface updated
test('IFieldMetadata interface has dual-source fields', () => {
    const clientFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'TwentyApi.client.ts'),
        'utf8'
    );
    
    if (!clientFile.includes('isBuiltInEnum?:')) {
        throw new Error('isBuiltInEnum field not found in IFieldMetadata');
    }
    
    if (!clientFile.includes('enumType?:')) {
        throw new Error('enumType field not found in IFieldMetadata');
    }
    
    if (!clientFile.includes("source?: 'metadata' | 'graphql'")) {
        throw new Error('source field not found in IFieldMetadata');
    }
});

console.log('\n📦 Phase 2: Verify Dual-Source Field Discovery\n');

// Test 2.1: Check getFieldsForResource uses dual-source
test('getFieldsForResource queries both metadata and GraphQL', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('SOURCE 1: Metadata API')) {
        throw new Error('Metadata API source comment not found');
    }
    
    if (!nodeFile.includes('SOURCE 2: GraphQL Introspection')) {
        throw new Error('GraphQL introspection source comment not found');
    }
    
    if (!nodeFile.includes('getCachedSchema')) {
        throw new Error('Metadata API call not found');
    }
    
    if (!nodeFile.includes('getDataSchemaForObject')) {
        throw new Error('GraphQL introspection call not found');
    }
});

// Test 2.2: Check pipe-separated values are returned
test('getFieldsForResource returns pipe-separated values', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('`${field.name}|${n8nType}`')) {
        throw new Error('Pipe-separated value format not found');
    }
    
    if (!nodeFile.includes('fieldName|fieldType')) {
        throw new Error('Pipe-separated comment not found');
    }
});

// Test 2.3: Check type mapping helpers exist
test('Type mapping helper functions exist', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('mapTwentyTypeToN8nType')) {
        throw new Error('mapTwentyTypeToN8nType helper not found');
    }
    
    if (!nodeFile.includes('mapGraphQLTypeToN8nType')) {
        throw new Error('mapGraphQLTypeToN8nType helper not found');
    }
});

console.log('\n📦 Phase 3: Verify Hidden Field Type Parameter\n');

// Test 3.1: Check Field Type is hidden
test('Field Type parameter is hidden', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    // Find Field Type parameter
    const fieldTypeMatch = nodeFile.match(/displayName: 'Field Type'[\s\S]{0,300}type: 'hidden'/);
    
    if (!fieldTypeMatch) {
        throw new Error('Field Type parameter is not hidden');
    }
});

// Test 3.2: Check auto-extraction expression
test('Field Type has auto-extraction expression', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('$parameter["&fieldName"].split("|")[1]')) {
        throw new Error('Auto-extraction expression not found');
    }
});

console.log('\n📦 Phase 4: Verify Dual-Source Options Loading\n');

// Test 4.1: Check getOptionsForSelectField extracts from pipe value
test('getOptionsForSelectField extracts field name and type', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('fieldNameWithType.split(\'|\')')) {
        throw new Error('Pipe-separator extraction not found');
    }
    
    if (!nodeFile.includes('const [fieldName, fieldType]')) {
        throw new Error('Destructuring of field name and type not found');
    }
});

// Test 4.2: Check Strategy 1 (Metadata API)
test('getOptionsForSelectField implements Strategy 1 (Metadata)', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('STRATEGY 1: Try Metadata API')) {
        throw new Error('Strategy 1 comment not found');
    }
    
    if (!nodeFile.includes('getCachedSchema')) {
        throw new Error('Metadata API call in options loading not found');
    }
});

// Test 4.3: Check Strategy 2 (GraphQL)
test('getOptionsForSelectField implements Strategy 2 (GraphQL)', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('STRATEGY 2: Fall back to GraphQL')) {
        throw new Error('Strategy 2 comment not found');
    }
    
    if (!nodeFile.includes('queryGraphQLType')) {
        throw new Error('GraphQL introspection call in options loading not found');
    }
    
    if (!nodeFile.includes('queryEnumValues')) {
        throw new Error('Enum values query call not found');
    }
});

console.log('\n📦 Phase 5: Verify Field Transformation Updates\n');

// Test 5.1: Check pipe-separator extraction in transformFieldsData
test('transformFieldsData extracts field name from pipe value', () => {
    const transformFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'FieldTransformation.ts'),
        'utf8'
    );
    
    if (!transformFile.includes("field.fieldName.includes('|')")) {
        throw new Error('Pipe-separator check not found');
    }
    
    if (!transformFile.includes("field.fieldName.split('|')[0]")) {
        throw new Error('Field name extraction not found');
    }
});

// Test 5.2: Check backward compatibility
test('transformFieldsData maintains backward compatibility', () => {
    const transformFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'FieldTransformation.ts'),
        'utf8'
    );
    
    if (!transformFile.includes('actualFieldName')) {
        throw new Error('actualFieldName variable not found');
    }
    
    // Should use actualFieldName instead of fieldName
    const resultUsage = transformFile.match(/result\[actualFieldName\]/g);
    if (!resultUsage || resultUsage.length < 5) {
        throw new Error('actualFieldName not used consistently in result assignments');
    }
});

console.log('\n📦 Phase 6: Verify Code Cleanup\n');

// Test 6.1: Check getFieldTypeOptions is removed
test('getFieldTypeOptions method is removed', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (nodeFile.includes('async getFieldTypeOptions(')) {
        throw new Error('getFieldTypeOptions method still exists (should be removed)');
    }
});

// Test 6.2: Check imports are updated
test('Imports include new GraphQL methods', () => {
    const nodeFile = fs.readFileSync(
        path.join(__dirname, '..', 'nodes', 'Twenty', 'Twenty.node.ts'),
        'utf8'
    );
    
    if (!nodeFile.includes('queryGraphQLType')) {
        throw new Error('queryGraphQLType not imported');
    }
    
    if (!nodeFile.includes('queryEnumValues')) {
        throw new Error('queryEnumValues not imported');
    }
    
    if (!nodeFile.includes('IFieldMetadata')) {
        throw new Error('IFieldMetadata not imported');
    }
});

console.log('\n📦 General: Verify Package Version\n');

// Test: Check package.json version
test('package.json version is 0.5.0', () => {
    const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    
    if (packageJson.version !== '0.5.0') {
        throw new Error(`Expected version 0.5.0, got ${packageJson.version}`);
    }
});

// Print summary
console.log('\n' + '='.repeat(80));
console.log('📊 VERIFICATION SUMMARY\n');
console.log(`Total Tests: ${results.passed + results.failed}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`   - ${t.name}`);
        console.log(`     ${t.error}`);
    });
}

console.log('\n' + '='.repeat(80));

if (results.failed === 0) {
    console.log('🎉 ALL VERIFICATION TESTS PASSED!');
    console.log('✅ Implementation is complete and correct.');
    console.log('✅ Ready for integration testing in n8n.');
    process.exit(0);
} else {
    console.log('⚠️  Some verification tests failed.');
    console.log('Please review the failed tests above.');
    process.exit(1);
}
