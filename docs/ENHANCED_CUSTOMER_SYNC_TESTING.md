# Enhanced SPY-Specific Customer Sync - Testing Guide

## Overview
We've created an enhanced customer sync that specifically handles the SPY system's customer list page structure and workflow. This addresses the login and customer extraction issues you were experiencing.

## 🎯 **Key Enhancements**

### 1. **SPY-Specific URL and Workflow**
- **Exact URL**: [https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CIndex&action=ActiveList&Spy\Model\Admin\Customer\Index\ListReportSearch[bForceSearch]=true](https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CIndex&action=ActiveList&Spy\Model\Admin\Customer\Index\ListReportSearch[bForceSearch]=true)
- **Waits for**: `#MainContent` element
- **Clicks**: `<button name="show_all">Show All</button>` if present
- **Extracts from**: `#CustomerList tbody tr` elements

### 2. **Enhanced Data Extraction**
Based on your SPY table structure, we now extract:
- **Customer ID**: From `customer_id=` parameter in edit links
- **Customer Name**: From `data-name` attribute or `title` attribute
- **UUID**: From edit link for session management
- **Contact Info**: Phone numbers, email (if present)
- **Address**: Postal code, city, country
- **Business Info**: Salesperson, brand
- **Metadata**: Reference numbers, row data for debugging

### 3. **Improved Login with Dynamic Selectors**
- Uses the new dynamic login system with `customer_sync` action
- Multiple post-login selector strategies for better reliability
- Enhanced error recovery and session validation

## 🧪 **How to Test**

### Test 1: Enhanced SPY Customer Sync
```bash
curl -X POST http://localhost:3002/api/sync-customers \
  -H "Content-Type: application/json" \
  -d '{"action": "enhanced"}'
```

**Expected Response Structure**:
```json
{
  "success": true,
  "customersFound": 150,
  "customersSaved": 150,
  "operation": "enhanced_spy_sync",
  "duration": 12000,
  "credentialsProvided": true,
  "debugInfo": {
    "showAllButtonFound": true,
    "successfulUrl": "https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CIndex&action=ActiveList&Spy\\Model\\Admin\\Customer\\Index\\ListReportSearch[bForceSearch]=true",
    "totalExtracted": 150,
    "validatedCount": 150,
    "newCustomers": 15,
    "sampleCustomers": [
      {
        "id": "879",
        "name": "2-BIZ RESERVER VARER",
        "editUrl": "https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CEdit&action=Edit&customer_id=879&uuid=df9caa74c0",
        "metadata": {
          "uuid": "df9caa74c0",
          "phone": "86151811",
          "address": "8240 RISSKOV",
          "country": "Denmark",
          "salesperson": "Internal",
          "brand": "2-BIZ",
          "postalCode": "8240",
          "city": "RISSKOV"
        }
      }
    ]
  }
}
```

### Test 2: Compare with Original Sync
```bash
# Test original sync
curl -X POST http://localhost:3002/api/sync-customers \
  -H "Content-Type: application/json" \
  -d '{"action": "quick"}'

# Then test enhanced sync  
curl -X POST http://localhost:3002/api/sync-customers \
  -H "Content-Type: application/json" \
  -d '{"action": "enhanced"}'
```

### Test 3: AI Customer Search Integration
After running the enhanced sync, test the AI integration:

```bash
curl -X POST http://localhost:3002/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "message": "create order for ABC Corp",
    "conversationHistory": []
  }'
```

**Expected**: The AI should now be able to find customers more reliably using the enhanced metadata.

## 🔍 **Debug Information**

### Enhanced Logging
The enhanced sync provides detailed logging:

1. **Phase-by-phase progress**: Login → Navigation → Show All → Data Extraction
2. **SPY-specific checks**: MainContent found, CustomerList table found
3. **Data validation**: Customer ID extraction, name validation, metadata parsing
4. **Storage operations**: Before/after customer counts, new customer detection

### Common Issues and Solutions

#### Issue: "No customers found in #CustomerList tbody"
**Cause**: Page structure might be different or data not loaded
**Solution**: Check the debug info for:
- `#CustomerList exists: true/false`
- `#CustomerList tbody exists: true/false`
- Table HTML sample in logs

#### Issue: "Show All button not found"
**Cause**: Button might not exist or have different attributes
**Solution**: This is non-fatal - sync continues without clicking the button

#### Issue: "Could not extract customer_id from URL"
**Cause**: Edit link format changed
**Solution**: Check the debug logs for actual URL patterns found

## 📊 **Data Quality Validation**

The enhanced sync includes validation for:

### Required Fields
- ✅ **Customer ID**: Must be present and non-empty
- ✅ **Customer Name**: Must be at least 2 characters
- ✅ **Edit URL**: Must contain `customer_id=` parameter

### Metadata Extraction
- 📞 **Phone**: Extracted from columns 9 and 12
- 🏢 **Address**: Combined postal code and city
- 🌍 **Country**: From column 7
- 👤 **Salesperson**: From column 3
- 🏷️ **Brand**: From column 4
- 📧 **Email**: Scanned across all columns for `@` pattern

### Storage Format
```json
{
  "id": "879",
  "name": "2-BIZ RESERVER VARER", 
  "editUrl": "https://2-biz.spysystem.dk/?controller=Admin%5CCustomer%5CEdit&action=Edit&customer_id=879&uuid=df9caa74c0",
  "metadata": {
    "uuid": "df9caa74c0",
    "email": "contact@example.com",
    "phone": "86151811", 
    "address": "8240 RISSKOV",
    "country": "Denmark",
    "salesperson": "Internal",
    "brand": "2-BIZ",
    "postalCode": "8240",
    "city": "RISSKOV",
    "lastSync": "2025-01-30T19:00:00.000Z",
    "rawData": {
      "reference": "879",
      "dataName": "2-BIZ RESERVER VARER",
      "phone1": "86151811",
      "phone2": "+45 86154311",
      "rowIndex": "0"
    }
  }
}
```

## 🚀 **Production Considerations**

### Performance
- **Expected Duration**: 10-30 seconds for 100-500 customers
- **Memory Usage**: ~50MB for processing 1000 customers
- **Network**: Multiple page loads + data extraction

### Error Recovery
- **Login Failures**: Detailed error messages with debugging info
- **Page Load Issues**: Fallback strategies and timeout handling
- **Data Extraction**: Partial success reporting (e.g., 140/150 customers extracted)

### Monitoring
- Check logs for phase completion: `✅ Phase X completed`
- Monitor customer count changes: `📊 Customers before/after sync`
- Validate data quality: `Validated X of Y customers`

## 📈 **Success Metrics**

### Sync Success Indicators
- ✅ `success: true` in response
- ✅ `customersFound > 0`
- ✅ `validatedCount === totalExtracted` (100% data quality)
- ✅ `showAllButtonFound: true` (full data access)

### Data Quality Indicators  
- ✅ All customers have valid edit URLs
- ✅ Customer names are properly extracted
- ✅ Metadata fields populated (phone, address, country)
- ✅ No duplicate customer IDs

### AI Integration Success
- ✅ Customer search by name works in AI chat
- ✅ Sales order creation finds customers automatically
- ✅ Fuzzy matching works for partial company names

---

## 🎯 **Ready to Test!**

The enhanced customer sync is now ready for testing. It should resolve the login issues and provide much more reliable customer data extraction with comprehensive metadata for AI integration.

**Start with**: `{"action": "enhanced"}` and check the detailed debug logs for any issues! 🚀 