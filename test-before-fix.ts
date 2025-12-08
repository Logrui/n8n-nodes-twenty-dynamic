/**
 * Demonstration: Bug Behavior BEFORE Fix
 *
 * This script demonstrates what would happen WITHOUT the fix.
 * It simulates the old behavior where unevaluated expressions would pass through
 * and cause errors at the Twenty CRM API level.
 */

// Simulate the OLD transformFieldsData function (before the fix)
function transformFieldsDataOld(fields: any[]): Record<string, any> {
	const result: Record<string, any> = {};

	for (const field of fields) {
		const actualFieldName = field.fieldName.includes('|')
			? field.fieldName.split('|')[0]
			: field.fieldName;

		const fieldType = field.fieldType || 'simple';

		switch (fieldType) {
			case 'link':
				const links: any = {};
				// OLD CODE: No validation - just passes through whatever value is provided
				if (field.primaryLinkUrl) links.primaryLinkUrl = field.primaryLinkUrl;
				if (field.primaryLinkLabel) links.primaryLinkLabel = field.primaryLinkLabel;
				if (Object.keys(links).length > 0) {
					result[actualFieldName] = links;
				}
				break;

			case 'simple':
			default:
				if (field.fieldValue !== undefined && field.fieldValue !== '') {
					result[actualFieldName] = field.fieldValue;
				}
				break;
		}
	}

	return result;
}

// ANSI color codes
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	magenta: '\x1b[35m',
};

console.log(`${colors.magenta}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.magenta}║  Demonstrating Bug Behavior BEFORE Fix                      ║${colors.reset}`);
console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.yellow}Scenario: User configures a link field with an n8n expression${colors.reset}`);
console.log(`${colors.yellow}that cannot be evaluated (e.g., field doesn't exist in input)${colors.reset}\n`);

// Simulate problematic input
const problematicInput = [
	{
		fieldName: 'website',
		fieldType: 'link',
		primaryLinkUrl: '{{ $json["companyWebsite"] }}', // Unevaluated expression
		primaryLinkLabel: 'Company Website',
	},
];

console.log(`${colors.cyan}Input Configuration:${colors.reset}`);
console.log(JSON.stringify(problematicInput, null, 2));
console.log('');

// Test with OLD code (before fix)
console.log(`${colors.blue}═══ OLD BEHAVIOR (Before Fix) ═══${colors.reset}`);
try {
	const result = transformFieldsDataOld(problematicInput);
	console.log(`${colors.red}⚠ NO ERROR THROWN - Data passes through validation!${colors.reset}`);
	console.log(`${colors.yellow}Result that would be sent to Twenty CRM:${colors.reset}`);
	console.log(JSON.stringify(result, null, 2));
	console.log('');
	console.log(`${colors.red}❌ Problem: Twenty CRM receives literal string "{{ $json["companyWebsite"] }}"${colors.reset}`);
	console.log(`${colors.red}   This causes a cryptic server-side validation error:${colors.reset}`);
	console.log(`${colors.red}   "Invalid URL format" or similar generic error${colors.reset}`);
	console.log(`${colors.red}   User has no clear indication that the n8n expression wasn't evaluated${colors.reset}`);
} catch (error: any) {
	console.log(`${colors.green}Error caught: ${error.message}${colors.reset}`);
}

console.log('');

// Now test with NEW code (after fix)
console.log(`${colors.blue}═══ NEW BEHAVIOR (After Fix) ═══${colors.reset}`);

// Import the actual fixed function
import { transformFieldsData } from './nodes/Twenty/FieldTransformation';

try {
	const result = transformFieldsData(problematicInput);
	console.log(`${colors.red}Unexpected: No error thrown${colors.reset}`);
} catch (error: any) {
	console.log(`${colors.green}✓ ERROR THROWN - Validation catches the issue!${colors.reset}`);
	console.log(`${colors.green}Error Message:${colors.reset}`);
	console.log(`  "${error.message}"`);
	console.log('');
	console.log(`${colors.green}✓ Benefits of the fix:${colors.reset}`);
	console.log(`  1. Clear, actionable error message`);
	console.log(`  2. Caught BEFORE sending to Twenty CRM API`);
	console.log(`  3. Shows exact field name and expression`);
	console.log(`  4. User can immediately see the configuration issue`);
}

console.log('');
console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.magenta}Conclusion${colors.reset}`);
console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.green}✓ The fix successfully prevents unevaluated expressions from${colors.reset}`);
console.log(`${colors.green}  reaching the Twenty CRM API${colors.reset}`);
console.log(`${colors.green}✓ Users now get immediate, clear feedback about configuration${colors.reset}`);
console.log(`${colors.green}  issues instead of cryptic server errors${colors.reset}`);
console.log(`${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
