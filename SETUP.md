# Setup Guide for Sales Order Functionality

## Environment Variables Setup

The sales order functionality requires environment variables to be configured. Follow these steps:

### 1. Create .env.local file

Copy the example environment file and create your own:

```bash
cp env.example .env.local
```

### 2. Configure the required variables

Edit `.env.local` and fill in your actual credentials:

```env
# Stock Checker Environment Variables

# Your 2-BIZ system credentials
SPY_USER=your_actual_username
SPY_PASS=your_actual_password

# System URL - your 2-BIZ system login URL
SYSTEM_URL=https://2-biz.spysystem.dk/login

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Required Variables Explained

- **SPY_USER**: Your username for the 2-BIZ system
- **SPY_PASS**: Your password for the 2-BIZ system  
- **SYSTEM_URL**: The login URL for your 2-BIZ system (usually https://2-biz.spysystem.dk/login)
- **OPENAI_API_KEY**: Your OpenAI API key for AI functionality

### 4. Restart the development server

After creating the `.env.local` file, restart your development server:

```bash
npm run dev
```

### 5. Test the functionality

Once configured, you can test the sales order functionality:

1. **Natural Language**: Try "Create order for AASKOV in Denmark" in the chat
2. **Manual Test**: Visit `/sales-order-test` to use the form interface

## Troubleshooting

If you see "System credentials not configured" error:

1. Check that `.env.local` file exists in the project root
2. Verify all required variables are set
3. Restart the development server
4. Check the console logs for environment variable status

## Security Notes

- Never commit `.env.local` to version control
- Keep your credentials secure
- The `.env.local` file is already in `.gitignore` 