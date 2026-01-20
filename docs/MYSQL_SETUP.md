# MySQL Database Setup Guide

This application supports two storage backends:
- **JSON** (default) - File-based storage using db.json
- **MySQL** - Relational database with persistent volumes

## Quick Start

### Local Development with Docker

1. **Start services with MySQL:**
   ```bash
   docker-compose up -d
   ```

2. **Verify MySQL is running:**
   ```bash
   docker-compose logs mysql
   ```

3. **Check database initialization:**
   ```bash
   docker exec -it linkedinto-mysql mysql -u linkedinto_user -plinkedinto_pass linkedinto_db -e "SHOW TABLES;"
   ```

### Environment Configuration

Create `.env` file from template:
```bash
cp .env.example .env
```

**For MySQL storage (recommended for production):**
```env
DATABASE_TYPE=mysql
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=linkedinto_db
MYSQL_USER=linkedinto_user
MYSQL_PASSWORD=linkedinto_pass
MYSQL_ROOT_PASSWORD=linkedinto_root_pass
```

**For JSON storage (development/testing):**
```env
DATABASE_TYPE=json
```

## Database Schema

The application uses 10 tables:

| Table | Purpose |
|-------|---------|
| `posts` | Generated LinkedIn posts |
| `articles` | Scraped/fetched articles |
| `scheduled_posts` | Posts scheduled for publishing |
| `analytics` | Performance metrics |
| `templates` | Post templates |
| `ab_tests` | A/B test definitions |
| `ab_test_variants` | Test variations |
| `automation_config` | System configuration |
| `feeds` | RSS/Content feeds |
| `feed_articles` | Feed-article relationships |

## Docker Compose Configuration

### MySQL Service

```yaml
mysql:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-linkedinto_root_pass}
    MYSQL_DATABASE: ${MYSQL_DATABASE:-linkedinto_db}
    MYSQL_USER: ${MYSQL_USER:-linkedinto_user}
    MYSQL_PASSWORD: ${MYSQL_PASSWORD:-linkedinto_pass}
  ports:
    - "3306:3306"
  volumes:
    - mysql_data:/var/lib/mysql              # Persistent storage
    - ./db/migrations:/docker-entrypoint-initdb.d  # Auto-init schema
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Persistent Volume

Data is stored in the `mysql_data` Docker volume:

```bash
# View volume details
docker volume inspect mysql_data

# Backup database
docker exec linkedinto-mysql mysqldump -u root -plinkedinto_root_pass linkedinto_db > backup_$(date +%Y%m%d).sql

#  Restore database
docker exec -i linkedinto-mysql mysql -u root -plinkedinto_root_pass linkedinto_db < backup.sql
```

## Database Migrations

Schema is automatically initialized from `db/migrations/001_initial_schema.sql` when MySQL starts for the first time.

**To add new migrations:**

1. Create new file: `db/migrations/002_your_migration.sql`
2. Restart MySQL service: `docker-compose restart mysql`

**Manual migration:**
```bash
docker exec -i linkedinto-mysql mysql -u root -plinkedinto_root_pass linkedinto_db < db/migrations/002_your_migration.sql
```

## Railway Deployment

### Setup MySQL on Railway

1. **Add MySQL Plugin:**
   - Go to your Railway project
   - Click "New" → "Database" → "Add MySQL"
   - Railway will auto-provision MySQL and set environment variables

2. **Configure Environment Variables:**
   Railway automatically sets:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

   Add manually:
   - `DATABASE_TYPE=mysql`

3. **Initialize Schema:**
   Connect to Railway MySQL and run:
   ```bash
   # Get connection string from Railway dashboard
   mysql -h <host> -u<user> -p<password> <database> < db/migrations/001_initial_schema.sql
   ```

4. **Deploy:**
   ```bash
   git push origin main
   ```
   Railway will automatically deploy with MySQL integration.

## Development Workflow

### Switching Between Storage Backends

**Use JSON (no Docker needed):**
```bash
export DATABASE_TYPE=json
npm run dev
```

**Use MySQL (requires Docker):**
```bash
export DATABASE_TYPE=mysql
docker-compose up -d mysql
npm run dev
```

### Testing

**Test MySQL connection:**
```bash
docker exec -it linkedinto-mysql mysql -u linkedinto_user -plinkedinto_pass
```

**Check application logs:**
```bash
docker-compose logs app
# Should show: "Database initialized: mysql"
```

## Repository Pattern

Services use repository pattern for database abstraction:

```javascript
// Example: Using posts repository
import { createPost, getAllPosts } from './repositories/posts-repository.js';

// Works with both MySQL and JSON automatically
const post = await createPost({
  content: 'New LinkedIn post',
  tone: 'professional',
  format: 'standard'
});

const posts = await getAllPosts(10);
```

## Troubleshooting

### MySQL connection refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solution:**
```bash
# Check if MySQL is running
docker-compose ps mysql

# Restart MySQL
docker-compose restart mysql

# Check logs
docker-compose logs mysql
```

### Schema not initialized

**Problem:** Tables missing in database

**Solution:**
```bash
# Re-run migrations
docker exec -i linkedinto-mysql mysql -u root -plinkedinto_root_pass linkedinto_db < db/migrations/001_initial_schema.sql
```

### Character encoding issues

**Problem:** Emojis or special characters not displaying correctly

**Solution:** Ensure UTF8MB4 in `docker-compose.yml`:
```yaml
command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

### Application fails to start

**Problem:** Database initialization error

**Solution:**
```bash
# Check DATABASE_TYPE environment variable
echo $DATABASE_TYPE

# Fall back to JSON mode
export DATABASE_TYPE=json
npm run dev
```

## Performance Considerations

- **Connection Pooling:** Max 10 connections configured
- **Indexes:** Added on frequently queried columns
- **Query Optimization:** Use `LIMIT` for large result sets
- **Volume Performance:** Use named volumes for better I/O

## Security Best Practices

1. **Change default passwords** in production
2. **Use environment variables** for credentials (never commit .env)
3. **Enable SSL** for MySQL connections in production
4. **Restrict network access** to MySQL port (3306)
5. **Regular backups** of mysql_data volume

## Additional Resources

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/refman/8.0/en/)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)
- [Railway MySQL Plugin](https://docs.railway.app/databases/mysql)
