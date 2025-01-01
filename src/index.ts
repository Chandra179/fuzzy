import { Server } from './api/server';

if (require.main === module) {
  const server = new Server(3000);
  server.start();
}
