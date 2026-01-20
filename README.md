<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1_YcpwEr7f4w_4ncLEgEZbiwTd6y0JSWo

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Database

This application supports two storage backends:

- **JSON** (default) - Simple file-based storage
- **MySQL** - Relational database with persistent storage

For MySQL setup instructions, see [MySQL Setup Guide](docs/MYSQL_SETUP.md).

### Quick Setup

**JSON Mode (Default):**
```bash
npm install
npm run dev
```

**MySQL Mode:**
```bash
docker-compose up -d
```

Set `DATABASE_TYPE=mysql` in your `.env` file.
