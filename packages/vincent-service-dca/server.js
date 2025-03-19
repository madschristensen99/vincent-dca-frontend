// Main entry point for the refactored Vincent DCA service
import { start } from './src/server/index.js';

// Start the server only if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
