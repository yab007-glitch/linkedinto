import os from 'os';
import logger from '../config/logger.js';

// System health metrics
export const getSystemHealth = () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: `${((usedMem / totalMem) * 100).toFixed(2)}%`,
      },
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memoryUsage: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB`,
      },
    },
  };
};

// Application health check
export const healthCheck = async (req, res) => {
  try {
    const health = getSystemHealth();
    
    // Check critical services
    const checks = {
      database: await checkDatabase(),
      scheduler: checkScheduler(),
      externalAPIs: await checkExternalAPIs(),
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      ...health,
      services: checks,
      overall: allHealthy ? 'healthy' : 'degraded',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Simple liveness probe
export const liveness = (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

// Readiness probe
export const readiness = async (req, res) => {
  try {
    // Check if app is ready to serve traffic
    const dbReady = await checkDatabase();
    
    if (dbReady.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Database not available',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Check database connection
async function checkDatabase() {
  try {
    // For now, using JSON file - always healthy
    // TODO: Add actual database health check when migrated to PostgreSQL
    return {
      status: 'healthy',
      type: 'json-file',
      responseTime: '< 1ms',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

// Check scheduler status
function checkScheduler() {
  try {
    // Basic check - scheduler is running if process is running
    return {
      status: 'healthy',
      jobs: {
        postGeneration: 'scheduled',
        feedRefresh: 'scheduled',
        publishing: 'scheduled',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

// Check external APIs
async function checkExternalAPIs() {
  const apis = {
    huggingface: 'unknown',
    linkedin: 'unknown',
  };

  try {
    // Check if HuggingFace API key is configured
    if (process.env.VITE_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY) {
      apis.huggingface = 'configured';
    } else {
      apis.huggingface = 'not configured';
    }

    // LinkedIn API check would go here
    apis.linkedin = 'not configured';

    const allConfigured = Object.values(apis).every(status => status === 'configured');

    return {
      status: allConfigured ? 'healthy' : 'degraded',
      apis,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

// Metrics endpoint (Prometheus format)
export const metrics = (req, res) => {
  const health = getSystemHealth();
  const memUsage = process.memoryUsage();
  
  const prometheusMetrics = `
# HELP nodejs_process_uptime_seconds Process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${process.uptime()}

# HELP nodejs_memory_heap_used_bytes Heap memory used in bytes
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP nodejs_memory_heap_total_bytes Total heap memory in bytes
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP nodejs_memory_rss_bytes Resident set size in bytes
# TYPE nodejs_memory_rss_bytes gauge
nodejs_memory_rss_bytes ${memUsage.rss}

# HELP system_cpu_count Number of CPUs
# TYPE system_cpu_count gauge
system_cpu_count ${os.cpus().length}

# HELP system_load_average_1m System load average (1 minute)
# TYPE system_load_average_1m gauge
system_load_average_1m ${os.loadavg()[0]}
  `.trim();

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
};
