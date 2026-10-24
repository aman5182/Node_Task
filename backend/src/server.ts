import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { initFirebase } from './config/firebase';

const startServer = async (): Promise<void> => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Initialize Firebase Admin SDK
  initFirebase();

  // 3. Start HTTP Server
  const server = app.listen(env.port, () => {
    console.log(`🚀 Chat Backend running in ${env.nodeEnv} mode at http://localhost:${env.port}`);
    console.log(`📡 Auth:   http://localhost:${env.port}/api/v1/auth`);
    console.log(`💬 Chat:   http://localhost:${env.port}/api/v1/chat`);
    console.log(`👤 User:   http://localhost:${env.port}/api/v1/user`);
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string): Promise<void> => {
    console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed');
      await disconnectDB();
      process.exit(0);
    });

    // Fallback force shutdown after 10s
    setTimeout(() => {
      console.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('Unhandled Rejection detected:', reason);
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception thrown:', err);
    process.exit(1);
  });
};

startServer();
