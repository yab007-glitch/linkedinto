# MySQL Database Migration Architecture Plan

## Executive Summary

This document outlines the complete architecture and migration strategy to replace JSON-based file storage with MySQL database for the LinkedInto application. The plan covers database schema design, Docker configuration, migration approach, code changes, and Railway deployment considerations.

---

## 1. Database Schema Design

### 1.1 Core Tables

#### **posts** - Generated/Historical Content
```sql
CREATE TABLE posts (
  id VARCHAR(50) PRIMARY KEY,
  content TEXT NOT NULL,
  topic VARCHAR(255),
  target_audience VARCHAR(100),
  tone VARCHAR(100),
  format VARCHAR(100),
  key_points TEXT,
  auto_post BOOLEAN DEFAULT FALSE,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_created_at (created_at),
  INDEX idx_auto_post (auto_post)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **feeds** - RSS Feed Configuration
```sql
CREATE TABLE feeds (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  category VARCHAR(100),
  last_fetch TIMESTAMP NULL,
  article_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (enabled),
  INDEX idx_category (category),
  INDEX idx_last_fetch (last_fetch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **feed_errors** - Feed Error Tracking
```sql
CREATE TABLE feed_errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feed_id VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
  INDEX idx_feed_id (feed_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **articles** - RSS Feed Articles
```sql
CREATE TABLE articles (
  id VARCHAR(200) PRIMARY KEY,
  feed_id VARCHAR(100) NOT NULL,
  feed_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  title VARCHAR(1000) NOT NULL,
  description TEXT,
  link VARCHAR(2000) NOT NULL,
  pub_date TIMESTAMP NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
  UNIQUE KEY idx_link_unique (link(767)),
  INDEX idx_feed_id (feed_id),
  INDEX idx_processed (processed),
  INDEX idx_pub_date (pub_date),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **scheduled_posts** - Post Queue Management
```sql
CREATE TABLE scheduled_posts (
  id VARCHAR(100) PRIMARY KEY,
  article_id VARCHAR(200),
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status ENUM('pending', 'approved', 'posted', 'failed') DEFAULT 'pending',
  linkedin_post_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  posted_at TIMESTAMP NULL,
  error TEXT,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
  INDEX idx_scheduled_for (scheduled_for),
  INDEX idx_status (status),
  INDEX idx_article_id (article_id),
  INDEX idx_posted_at (posted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **analytics** - Post Performance Metrics
```sql
CREATE TABLE analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL,
  linkedin_post_id VARCHAR(100) NOT NULL,
  impressions INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  clicks INT DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0.00,
  click_through_rate DECIMAL(5,2) DEFAULT 0.00,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_post_unique (post_id),
  INDEX idx_linkedin_post_id (linkedin_post_id),
  INDEX idx_engagement_rate (engagement_rate),
  INDEX idx_fetched_at (fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **templates** - Custom Post Templates
```sql
CREATE TABLE templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  template TEXT NOT NULL,
  variables TEXT,
  is_custom BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_is_custom (is_custom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **ab_tests** - A/B Testing Framework
```sql
CREATE TABLE ab_tests (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  variable_tested VARCHAR(100) NOT NULL,
  variant_a_name VARCHAR(100) DEFAULT 'A',
  variant_a_value TEXT,
  variant_b_name VARCHAR(100) DEFAULT 'B',
  variant_b_value TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  status ENUM('active', 'completed', 'stopped') DEFAULT 'active',
  winner VARCHAR(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **ab_test_results** - A/B Test Post Results
```sql
CREATE TABLE ab_test_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_id VARCHAR(100) NOT NULL,
  variant VARCHAR(1) NOT NULL,
  post_id VARCHAR(100) NOT NULL,
  impressions INT DEFAULT 0,
  engagement_count INT DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  INDEX idx_test_id (test_id),
  INDEX idx_variant (variant),
  INDEX idx_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **automation_config** - System Configuration
```sql
CREATE TABLE automation_config (
  id INT PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN DEFAULT FALSE,
  posting_interval INT DEFAULT 6,
  last_run TIMESTAMP NULL,
  next_run TIMESTAMP NULL,
  schedule_type ENUM('interval', 'custom') DEFAULT 'interval',
  custom_schedule JSON,
  pause_on_weekends BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.2 Schema Features

- **UTF8MB4 Support**: Full Unicode support including emojis
- **Foreign Keys**: Referential integrity with cascading deletes where appropriate
- **Indexes**: Optimized for common query patterns
- **Timestamps**: Automatic tracking of creation and updates
- **InnoDB Engine**: ACID compliance and row-level locking
- **Enums**: Type-safe status fields
- **JSON Fields**: Flexible storage for complex configurations

---

## 2. Docker Compose Configuration

### 2.1 Updated docker-compose.yml

```yaml
version: '3.8'

services:
  # MySQL Database Service
  mysql:
    image: mysql:8.0
    container_name: linkedinto-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: linkedinto
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - linkedinto-network
    command: --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  # Application Service
  linkedinto:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: linkedinto-app
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - CORS_ORIGIN=http://localhost:5173
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=linkedinto
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_CONNECTION_LIMIT=10
      - DB_QUEUE_LIMIT=0
    env_file:
      - .env.local
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - linkedinto-network

networks:
  linkedinto-network:
    driver: bridge

volumes:
  mysql-data:
    driver: local
```

### 2.2 Environment Variables

Add to `.env.local`:
```
# MySQL Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_NAME=linkedinto
DB_USER=linkedinto_user
DB_PASSWORD=<strong-password-here>
DB_ROOT_PASSWORD=<strong-root-password-here>
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0
```

---

## 3. Database Migration Strategy

### 3.1 Migration Phases

#### **Phase 1: Preparation** (Pre-deployment)
1. Create MySQL schema initialization script
2. Add MySQL client library (mysql2) to dependencies
3. Create database configuration and connection pool module
4. Implement database abstraction layer (DAO pattern)

#### **Phase 2: Dual-Write Mode** (Transition Period)
1. Write to both JSON and MySQL during transition
2. Validate data consistency between both systems
3. Test all features with MySQL backend
4. Monitor for errors or data discrepancies

#### **Phase 3: Read Migration**
1. Switch read operations to MySQL one service at a time
2. Keep JSON as fallback for critical operations
3. Monitor performance and error rates
4. Verify data integrity

#### **Phase 4: Cutover**
1. Disable JSON file writes
2. Remove fallback logic
3. Archive JSON files as backup
4. Clean up legacy code

### 3.2 Data Migration Script

```javascript
// database/migrate-json-to-mysql.js
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';

async function migrateData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Starting data migration...');
    
    // Load JSON data
    const dbData = JSON.parse(await fs.readFile('db.json', 'utf-8'));
    const automationData = JSON.parse(await fs.readFile('automation-db.json', 'utf-8'));
    
    // Migrate posts
    if (dbData.posts?.length > 0) {
      console.log(`Migrating ${dbData.posts.length} posts...`);
      for (const post of dbData.posts) {
        await connection.execute(
          `INSERT INTO posts (id, content, topic, target_audience, tone, format, key_points, auto_post, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE content = VALUES(content)`,
          [
            post.id,
            post.content,
            post.config?.topic,
            post.config?.targetAudience,
            post.config?.tone,
            post.config?.format,
            post.config?.keyPoints,
            post.config?.autoPost || false,
            post.timestamp
          ]
        );
      }
    }
    
    // Migrate feeds
    if (automationData.feeds?.length > 0) {
      console.log(`Migrating ${automationData.feeds.length} feeds...`);
      for (const feed of automationData.feeds) {
        await connection.execute(
          `INSERT INTO feeds (id, name, url, enabled, category, last_fetch, article_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [
            feed.id,
            feed.name,
            feed.url,
            feed.enabled,
            feed.category,
            feed.lastFetch,
            feed.articleCount || 0
          ]
        );
        
        // Migrate feed errors
        if (feed.errors?.length > 0) {
          for (const error of feed.errors) {
            await connection.execute(
              `INSERT INTO feed_errors (feed_id, error_message, timestamp) VALUES (?, ?, ?)`,
              [feed.id, error.message, error.timestamp]
            );
          }
        }
      }
    }
    
    // Migrate articles
    if (automationData.articles?.length > 0) {
      console.log(`Migrating ${automationData.articles.length} articles...`);
      for (const article of automationData.articles) {
        await connection.execute(
          `INSERT INTO articles (id, feed_id, feed_name, category, title, description, link, pub_date, processed, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE processed = VALUES(processed)`,
          [
            article.id,
            article.feedId,
            article.feedName,
            article.category,
            article.title,
            article.description,
            article.link,
            article.pubDate,
            article.processed,
            article.createdAt
          ]
        );
      }
    }
    
    // Migrate scheduled posts
    if (automationData.scheduledPosts?.length > 0) {
      console.log(`Migrating ${automationData.scheduledPosts.length} scheduled posts...`);
      for (const post of automationData.scheduledPosts) {
        await connection.execute(
          `INSERT INTO scheduled_posts (id, article_id, content, scheduled_for, status, linkedin_post_id, created_at, posted_at, error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status)`,
          [
            post.id,
            post.articleId,
            post.content,
            post.scheduledFor,
            post.status,
            post.linkedInPostId,
            post.createdAt,
            post.postedAt,
            post.error
          ]
        );
      }
    }
    
    // Migrate automation config
    if (automationData.automationConfig) {
      console.log('Migrating automation configuration...');
      const config = automationData.automationConfig;
      await connection.execute(
        `INSERT INTO automation_config (id, enabled, posting_interval, last_run, next_run, schedule_type, custom_schedule, pause_on_weekends)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           enabled = VALUES(enabled),
           posting_interval = VALUES(posting_interval),
           last_run = VALUES(last_run),
           next_run = VALUES(next_run)`,
        [
          config.enabled,
          config.postingInterval,
          config.lastRun,
          config.nextRun,
          config.scheduleType || 'interval',
          JSON.stringify(config.customSchedule || null),
          config.pauseOnWeekends || false
        ]
      );
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
migrateData().catch(console.error);
```

### 3.3 Rollback Strategy

- **Backup JSON Files**: Archive `db.json` and `automation-db.json` before migration
- **Database Snapshots**: Create MySQL snapshots before each phase
- **Dual-Write Logging**: Maintain logs of all operations during transition
- **Quick Rollback Script**: Revert environment variables and restart with JSON files

---

## 4. Code Changes Required

### 4.1 New Files to Create

#### `config/database.js` - MySQL Connection Pool
```javascript
import mysql from 'mysql2/promise';
import logger from './logger.js';

let pool = null;

export function createPool() {
  if (pool) return pool;
  
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0'),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4'
  });
  
  logger.info('MySQL connection pool created');
  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
}
```

#### `database/init.sql` - Schema Initialization
Contains all CREATE TABLE statements from Section 1.1

#### `database/repositories/` - Data Access Layer
Create repository classes for each table:
- `PostRepository.js`
- `FeedRepository.js`
- `ArticleRepository.js`
- `ScheduledPostRepository.js`
- `AnalyticsRepository.js`
- `TemplateRepository.js`
- `ABTestRepository.js`
- `AutomationConfigRepository.js`

### 4.2 Files to Modify

#### `config/db-config.js`
```javascript
import { createPool } from './database.js';

export function initializeDatabase() {
  return createPool();
}

export { getPool, closePool } from './database.js';
```

#### Service Files (All in `services/` directory)
- `analytics-service.js` - Replace getDb/saveDb with repository calls
- `post-queue-service.js` - Replace getDb/saveDb with repository calls
- `rss-service.js` - Replace getDb/saveDb with repository calls
- `scheduler-service.js` - Update database initialization
- `template-service.js` - Convert to repository pattern
- `ab-testing-service.js` - Convert to repository pattern
- `custom-scheduling-service.js` - Convert to repository pattern

#### `server.js`
- Initialize database pool on startup
- Add graceful shutdown for database connections
- Update health checks to verify database connectivity

#### `package.json`
```json
{
  "dependencies": {
    "mysql2": "^3.6.5"
  },
  "scripts": {
    "db:migrate": "node database/migrate-json-to-mysql.js",
    "db:init": "mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/init.sql"
  }
}
```

### 4.3 Repository Pattern Example

```javascript
// database/repositories/PostRepository.js
import { getPool } from '../../config/database.js';

export class PostRepository {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM posts ORDER BY timestamp DESC'
    );
    return rows;
  }
  
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM posts WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }
  
  async create(post) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO posts (id, content, topic, target_audience, tone, format, key_points, auto_post, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        post.id,
        post.content,
        post.config?.topic,
        post.config?.targetAudience,
        post.config?.tone,
        post.config?.format,
        post.config?.keyPoints,
        post.config?.autoPost || false,
        post.timestamp
      ]
    );
    return this.findById(post.id);
  }
  
  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    });
    
    values.push(id);
    
    await pool.execute(
      `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }
  
  async delete(id) {
    const pool = getPool();
    await pool.execute('DELETE FROM posts WHERE id = ?', [id]);
  }
}
```

---

## 5. Railway Deployment Strategy

### 5.1 Railway MySQL Plugin

Railway provides a managed MySQL service. Steps:

1. **Add MySQL Plugin**
   - Go to Railway dashboard
   - Click "New" → "Database" → "MySQL"
   - Railway automatically provisions MySQL 8.0 instance
   - Connection details provided as environment variables

2. **Environment Variables**
   Railway automatically provides:
   ```
   MYSQL_URL=mysql://user:password@host:port/database
   MYSQL_HOST=containers-us-west-xxx.railway.app
   MYSQL_PORT=6189
   MYSQL_DATABASE=railway
   MYSQL_USER=root
   MYSQL_PASSWORD=<auto-generated>
   MYSQL_ROOT_PASSWORD=<auto-generated>
   ```

3. **Parse MYSQL_URL in Application**
   ```javascript
   // Parse Railway's MYSQL_URL if provided
   if (process.env.MYSQL_URL) {
     const url = new URL(process.env.MYSQL_URL);
     process.env.DB_HOST = url.hostname;
     process.env.DB_PORT = url.port;
     process.env.DB_USER = url.username;
     process.env.DB_PASSWORD = url.password;
     process.env.DB_NAME = url.pathname.slice(1);
   }
   ```

### 5.2 Railway Volume Configuration

Railway provides persistent volumes for MySQL data:

```toml
# railway.toml
[deploy]
startCommand = "npm run start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[[services]]
name = "linkedinto-app"
type = "web"

[[services]]
name = "linkedinto-mysql"
type = "database"
databaseType = "mysql"
```

### 5.3 Database Initialization on Railway

Create a startup script that initializes the schema:

```javascript
// scripts/railway-init.js
import { readFile } from 'fs/promises';
import mysql from 'mysql2/promise';

async function initializeDatabase() {
  // Parse Railway's MYSQL_URL
  const url = new URL(process.env.MYSQL_URL);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    multipleStatements: true
  });
  
  try {
    // Check if tables exist
    const [tables] = await connection.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'posts'"
    );
    
    if (tables[0].count === 0) {
      console.log('Initializing database schema...');
      const schema = await readFile('./database/init.sql', 'utf-8');
      await connection.query(schema);
      console.log('Database schema initialized successfully');
    } else {
      console.log('Database already initialized');
    }
  } finally {
    await connection.end();
  }
}

initializeDatabase().catch(console.error);
```

Update `package.json`:
```json
{
  "scripts": {
    "start": "node scripts/railway-init.js && node server.js"
  }
}
```

### 5.4 Railway Deployment Checklist

- [ ] Add MySQL database to Railway project
- [ ] Configure environment variables
- [ ] Update application to parse MYSQL_URL
- [ ] Deploy application with database initialization
- [ ] Run data migration script (one-time)
- [ ] Verify database connectivity via health checks
- [ ] Monitor logs for connection issues
- [ ] Set up automated backups in Railway dashboard

---

## 6. Performance Optimization

### 6.1 Connection Pooling
- Reuse database connections
- Configure pool size based on Railway plan limits
- Implement connection retry logic

### 6.2 Query Optimization
- Use prepared statements (prevents SQL injection)
- Add indexes for frequently queried columns
- Implement query result caching for read-heavy operations

### 6.3 Batch Operations
- Batch insert multiple records in single transaction
- Use bulk update operations where possible

---

## 7. Risk Assessment and Mitigation

### 7.1 Identified Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during migration | HIGH | Backup JSON files, test migration in staging |
| Downtime during cutover | MEDIUM | Use dual-write mode, plan maintenance window |
| Performance degradation | MEDIUM | Load test before cutover, optimize queries |
| Connection pool exhaustion | MEDIUM | Monitor connections, implement proper cleanup |
| Railway MySQL cost overrun | LOW | Monitor usage, optimize queries, implement caching |
| Schema migration conflicts | MEDIUM | Version control schema changes, test migrations |

### 7.2 Mitigation Strategies

1. **Backup First**
   - Archive JSON files before any migration
   - Export MySQL database regularly
   - Test restore procedures

2. **Phased Rollout**
   - Migrate one service at a time
   - Monitor error rates at each phase
   - Have rollback plan ready

3. **Testing**
   - Test migration script on sample data
   - Load test with realistic data volumes
   - Test failure scenarios

4. **Monitoring**
   - Add database metrics to health checks
   - Monitor query performance
   - Alert on connection pool issues

---

## 8. Testing Strategy

### 8.1 Migration Testing

1. **Unit Tests**
   - Test each repository method
   - Verify data transformation logic
   - Test error handling

2. **Integration Tests**
   - Test complete CRUD operations
   - Verify data consistency
   - Test transaction rollback

3. **Migration Tests**
   - Run migration on copy of production data
   - Verify record counts match
   - Test data integrity with checksums

### 8.2 Performance Testing

1. **Load Testing**
   - Simulate concurrent users
   - Test database under load
   - Measure query response times

2. **Stress Testing**
   - Test connection pool limits
   - Verify graceful degradation
   - Test recovery from failures

---

## 9. Implementation Timeline

### Phase 1: Foundation (Pre-deployment)
- [ ] Design and review database schema
- [ ] Create initialization SQL scripts
- [ ] Add mysql2 dependency
- [ ] Create database configuration module
- [ ] Implement repository pattern for one service (POC)

### Phase 2: Repository Layer (Development)
- [ ] Implement all repository classes
- [ ] Write unit tests for repositories
- [ ] Update services to use repositories
- [ ] Maintain backward compatibility with JSON

### Phase 3: Docker Integration (Local Testing)
- [ ] Update docker-compose.yml with MySQL service
- [ ] Test local MySQL setup
- [ ] Create migration scripts
- [ ] Test dual-write mode locally

### Phase 4: Railway Preparation (Staging)
- [ ] Configure Railway MySQL addon
- [ ] Test Railway database initialization
- [ ] Deploy to Railway staging environment
- [ ] Run migration on staging data

### Phase 5: Production Migration (Deployment)
- [ ] Backup production JSON files
- [ ] Deploy updated application (dual-write mode)
- [ ] Run production data migration
- [ ] Monitor for 48 hours

### Phase 6: Cutover (Finalization)
- [ ] Switch reads to MySQL only
- [ ] Remove JSON fallback code
- [ ] Archive JSON files
- [ ] Update documentation

---

## 10. Maintenance and Operations

### 10.1 Backup Strategy
- **Railway Automatic Backups**: Enable daily backups (if available on plan)
- **Manual Exports**: Weekly mysqldump exports to S3/cloud storage
- **Backup Retention**: 30 days of daily backups, 12 months of monthly backups

### 10.2 Monitoring
- Database connection pool metrics
- Query performance monitoring
- Slow query log analysis
- Disk space monitoring
- Error rate tracking

### 10.3 Maintenance Tasks
- **Weekly**: Review slow queries, optimize indexes
- **Monthly**: Analyze table statistics, optimize tables
- **Quarterly**: Review and update backup procedures

---

## Appendix A: Sample Repository Implementation

See Section 4.3 for complete PostRepository example

## Appendix B: Database ERD

```mermaid
erDiagram
    posts {
        varchar id PK
        text content
        varchar topic
        varchar target_audience
        varchar tone
        varchar format
        text key_points
        boolean auto_post
        bigint timestamp
    }
    
    feeds {
        varchar id PK
        varchar name
        varchar url
        boolean enabled
        varchar category
        timestamp last_fetch
        int article_count
    }
    
    feed_errors {
        int id PK
        varchar feed_id FK
        text error_message
        timestamp timestamp
    }
    
    articles {
        varchar id PK
        varchar feed_id FK
        varchar feed_name
        varchar category
        varchar title
        text description
        varchar link
        timestamp pub_date
        boolean processed
    }
    
    scheduled_posts {
        varchar id PK
        varchar article_id FK
        text content
        timestamp scheduled_for
        enum status
        varchar linkedin_post_id
        timestamp posted_at
    }
    
    analytics {
        int id PK
        varchar post_id
        varchar linkedin_post_id
        int impressions
        int likes
        int comments
        int shares
        int clicks
        decimal engagement_rate
        decimal click_through_rate
    }
    
    templates {
        varchar id PK
        varchar name
        varchar category
        text description
        text template
        text variables
        boolean is_custom
    }
    
    ab_tests {
        varchar id PK
        varchar name
        text description
        varchar variable_tested
        timestamp start_date
        timestamp end_date
        enum status
    }
    
    ab_test_results {
        int id PK
        varchar test_id FK
        varchar variant
        varchar post_id FK
        int impressions
        int engagement_count
        decimal engagement_rate
    }
    
    automation_config {
        int id PK
        boolean enabled
        int posting_interval
        timestamp last_run
        timestamp next_run
        enum schedule_type
        json custom_schedule
        boolean pause_on_weekends
    }
    
    feeds ||--o{ feed_errors : has
    feeds ||--o{ articles : contains
    articles ||--o{ scheduled_posts : generates
    scheduled_posts ||--o| analytics : tracks
    ab_tests ||--o{ ab_test_results : evaluates
    scheduled_posts ||--o{ ab_test_results : includes
```

## Appendix C: Environment Variables Reference

### Required Variables
```
DB_HOST=localhost (or Railway hostname)
DB_PORT=3306
DB_NAME=linkedinto
DB_USER=linkedinto_user
DB_PASSWORD=<secure-password>
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0
```

### Railway-Specific (Auto-provided)
```
MYSQL_URL=mysql://user:pass@host:port/db
MYSQL_HOST=containers-us-west-xxx.railway.app
MYSQL_PORT=6189
MYSQL_DATABASE=railway
MYSQL_USER=root
MYSQL_PASSWORD=<auto-generated>
```

---

## Conclusion

This architecture provides a robust, scalable solution for migrating from JSON-based storage to MySQL. The phased approach minimizes risk while ensuring data integrity throughout the process. The repository pattern provides a clean abstraction layer, making future database changes easier to implement.

**Next Steps:**
1. Review this plan with stakeholders
2. Set up development MySQL environment
3. Begin Phase 1 implementation
4. Schedule regular check-ins during migration process
