# Installing v0.5.3 in n8n

## ✅ New in v0.5.3

- **Field names** now show actual field names (e.g., `idealCustomerProfile`) instead of labels
- **Deactivated fields** are now filtered out (only active fields shown)
- **Dropdowns work** for SELECT/MULTI_SELECT fields (fixed in v0.5.2)

---

## Installation Steps (n8n UI)

### 1. Open n8n Settings
1. Click on **Settings** (gear icon) in the bottom left
2. Go to **Community Nodes**

### 2. Install the Package
1. Click **"Install a community node"**
2. Enter the package name:
   ```
   n8n-nodes-twenty-dynamic
   ```
3. Click **"Install"**
4. Wait for installation to complete (usually 10-30 seconds)

### 3. Restart n8n (if needed)
- **Docker**: `docker restart n8n` or `docker-compose restart n8n`
- **npm**: Stop and restart your n8n instance
- **n8n Cloud**: No restart needed (auto-updates)

### 4. Verify Installation
1. Create a new workflow
2. Add a new node
3. Search for **"Twenty"**
4. You should see the Twenty CRM node with the icon

---

## Testing the New Features

### Test 1: Field Names Display
1. Add a **Twenty** node
2. Select **company** object
3. Choose **Create One** operation
4. Click **"Add Field"**
5. **Expected**: You should see field names like:
   - `name` (not "Name of the company")
   - `idealCustomerProfile` (not "Ideal Customer Profile...")
   - `domainName` (not "Domain name of the company")
   - `ARR` (not "ARR: Annual Recurring Revenue...")

### Test 2: SELECT Dropdown Works
1. In the same workflow, select field **`idealCustomerProfile`**
2. **Expected**: Dropdown should populate with options:
   - `true`
   - `false`

### Test 3: Deactivated Fields Hidden
1. Look through the field list
2. **Expected**: You should NOT see any deactivated/archived fields
3. Only active, usable fields should appear

---

## Version History

| Version | Release Date | Key Changes |
|---------|-------------|-------------|
| **0.5.3** | Oct 14, 2025 | Field names display fix, deactivated fields filter |
| **0.5.2** | Oct 14, 2025 | SELECT dropdown fix (& prefix) |
| **0.5.1** | Oct 14, 2025 | Better error messages, field cleanup |
| **0.5.0** | Oct 13, 2025 | Dual-source architecture |

---

## Troubleshooting

### "Package not found"
- Make sure you typed the package name correctly: `n8n-nodes-twenty-dynamic`
- Check your n8n version (requires n8n v0.187.0+)

### "Installation failed"
- Check n8n logs for error details
- Verify internet connectivity
- Try uninstalling and reinstalling

### Dropdowns still showing "No data"
- Make sure you installed **v0.5.2 or later** (check Settings → Community Nodes)
- Try toggling **"Force Refresh Schema"** ON/OFF
- Check browser console for error messages

### Field names still showing labels
- Make sure you installed **v0.5.3 or later**
- Refresh the browser page
- Clear browser cache if needed

### Can't find a specific field
- The field might be deactivated in Twenty CRM
- Go to Twenty → Settings → Data Model to check field status
- Use **"Force Refresh Schema"** to reload field metadata

---

## What's Next?

Now that dropdowns work and field names are clean, we can focus on **Notion-style improvements**:

### Quick Wins (Next Patch - v0.5.4):
- [ ] Add `usableAsTool: true` (enable AI agent usage)
- [ ] Add "Simplify" option (cleaner JSON output)
- [ ] Better notice text
- [ ] Timezone parameter

### Future Enhancements (v0.6.0+):
- [ ] Resource Locator pattern (better UX)
- [ ] listSearch methods (searchable dropdowns)
- [ ] Filter/Sort builders
- [ ] Versioned node structure

See **NOTION_STYLE_IMPROVEMENTS.md** for full roadmap.

---

## Support

- **Issues**: https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues
- **Documentation**: https://github.com/Logrui/n8n-nodes-twenty-dynamic
- **Twenty CRM**: https://twenty.com

---

**Published**: October 14, 2025  
**Package**: n8n-nodes-twenty-dynamic@0.5.3  
**Status**: ✅ Available on npm registry
