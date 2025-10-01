# MCP-Appwrite Integration Setup Guide

This guide walks you through setting up Model Context Protocol (MCP) integration with Appwrite for the MOSÉ platform.

## Prerequisites

1. **Appwrite Account**: Create an account at [Appwrite Cloud](https://cloud.appwrite.io/)
2. **Appwrite Project**: Create a new project in your Appwrite console
3. **API Key**: Generate an API key with the following scopes:
   - `databases.read`
   - `databases.write`
   - `collections.read`
   - `collections.write`
   - `attributes.read`
   - `attributes.write`
   - `indexes.read`
   - `indexes.write`
   - `documents.read`
   - `documents.write`
   - `buckets.read`
   - `buckets.write`
   - `files.read`
   - `files.write`
   - `users.read`
   - `users.write`

## Step 1: Update Environment Variables

1. Copy `.env.local` to your actual configuration:
```bash
cp .env.local .env.local.backup
```

2. Update `.env.local` with your actual Appwrite credentials:
```bash
# Replace these with your actual values
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-actual-project-id
APPWRITE_PROJECT_ID=your-actual-project-id
APPWRITE_API_KEY=your-actual-api-key-with-full-permissions
```

## Step 2: Test MCP Connection

Verify your MCP setup is working:

```bash
# Test basic MCP connectivity
npm run mcp:test

# List existing databases (should show your database)
export PATH="$HOME/.local/bin:$PATH"
uvx mcp-server-appwrite --databases list-databases
```

## Step 3: Create Database Collections

Run the MCP-enhanced collection setup:

```bash
# Create all collections and storage buckets
npm run setup:collections
```

This will create:
- **Database Collections**: products, orders, reviews, categories, gift_events, gift_contributions, conversations, messages
- **Storage Buckets**: product-images, user-avatars, gift-images, gift-videos, message-attachments
- **Indexes**: Optimized for search and query performance
- **Permissions**: Proper role-based access control

## Step 4: Verify Setup

Check that everything was created successfully:

```bash
# List all collections
npm run mcp:collections

# List all storage buckets
npm run mcp:buckets

# Check collection details
uvx mcp-server-appwrite --databases list-documents --collection-id products
```

## Step 5: Claude Desktop Integration (Optional)

For enhanced development experience with Claude Desktop:

1. Create `claude_desktop_config.json` in your Claude config directory:
   - **macOS**: `~/Library/Application Support/Claude/`
   - **Windows**: `%APPDATA%/Claude/`

2. Add this configuration:
```json
{
  "mcpServers": {
    "appwrite": {
      "command": "uvx",
      "args": [
        "mcp-server-appwrite",
        "--databases",
        "--users",
        "--storage",
        "--functions"
      ],
      "env": {
        "APPWRITE_PROJECT_ID": "your-project-id",
        "APPWRITE_API_KEY": "your-api-key",
        "APPWRITE_ENDPOINT": "https://cloud.appwrite.io/v1"
      }
    }
  }
}
```

3. Restart Claude Desktop and you'll have direct access to your Appwrite project!

## Step 6: Development Workflow

With MCP integrated, you can now:

### Direct Database Operations
```bash
# Create a test product
uvx mcp-server-appwrite --databases create-document \
  --collection-id products \
  --data '{"title":"Test Product","price":1000,"category":"art"}'

# Query products
uvx mcp-server-appwrite --databases list-documents \
  --collection-id products \
  --queries '["Query.equal(\"category\", \"art\")"]'
```

### File Operations
```bash
# Upload a test image
uvx mcp-server-appwrite --storage create-file \
  --bucket-id product-images \
  --file ./test-image.jpg

# List files
uvx mcp-server-appwrite --storage list-files \
  --bucket-id product-images
```

### Real-time Development
The MCP integration enables:
- **Live data validation** during development
- **Instant schema updates** without manual console work
- **Real-time testing** with actual data
- **Automated optimization** suggestions

## Troubleshooting

### Common Issues

**1. "APPWRITE_PROJECT_ID must be set" error**
- Ensure your `.env.local` file has the correct project ID
- Restart your development server after updating environment variables

**2. "Permission denied" errors**
- Verify your API key has all required scopes
- Check that your Appwrite project is active

**3. "Collection already exists" warnings**
- This is normal - MCP will skip existing collections
- Use `--force` flag to recreate if needed

**4. Rate limiting issues**
- The setup script includes delays to avoid rate limits
- If you encounter issues, try running setup again

### Getting Help

1. **Check MCP server logs**:
```bash
uvx mcp-server-appwrite --databases list-collections --verbose
```

2. **Verify Appwrite console**: Log into your Appwrite console to verify collections were created

3. **Test individual operations**: Use the MCP commands to test specific operations

## Next Steps

Once MCP is set up:

1. **Run the service layer implementation** (Phase 4)
2. **Test real-time features** with actual data
3. **Use Claude Desktop** for enhanced development
4. **Implement remaining features** with MCP validation

The MCP integration will accelerate your development by providing:
- ✅ Real-time data validation
- ✅ Automated schema management  
- ✅ Live testing capabilities
- ✅ Enhanced debugging tools
- ✅ Direct Claude integration

You're now ready to build the complete MOSÉ platform with MCP-enhanced Appwrite integration! 🚀