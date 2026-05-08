class SSEManager {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcast(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((res) => {
      try {
        res.write(payload);
      } catch {
        this.clients.delete(res);
      }
    });
  }

  get size() {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
