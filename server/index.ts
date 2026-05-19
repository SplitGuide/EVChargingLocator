import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  // Try to use the primary port, but fall back to a random port if it's in use
  const startServer = () => {
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      log(`serving on port ${actualPort}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${port} is in use, trying alternative port...`);
        // Kill any existing process using this port (only in development)
        if (process.env.NODE_ENV === 'development') {
          try {
            const { execSync } = require('child_process');
            execSync(`fuser -k ${port}/tcp`);
            log(`Killed existing process on port ${port}`);
            // Try again after killing the process
            setTimeout(startServer, 1000);
          } catch (e) {
            log(`Could not kill process on port ${port}, trying random port`);
            // Use a random port as fallback
            server.listen({
              port: 0, // Use any available port
              host: "0.0.0.0",
            }, () => {
              const address = server.address();
              const randomPort = typeof address === 'object' && address ? address.port : 0;
              log(`serving on random port ${randomPort}`);
            });
          }
        } else {
          // In production, just use a random port
          server.listen({
            port: 0, // Use any available port
            host: "0.0.0.0",
          }, () => {
            const address = server.address();
            const randomPort = typeof address === 'object' && address ? address.port : 0;
            log(`serving on random port ${randomPort}`);
          });
        }
      } else {
        // For other errors, just log them
        log(`Server error: ${err.message}`);
      }
    });
  };
  
  startServer();
})();
