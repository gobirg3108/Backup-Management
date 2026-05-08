import { useEffect, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const useSSE = (handlers = {}) => {
  const esRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`${API_URL}/backup/events`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const handler =
          handlersRef.current[data.type] || handlersRef.current["*"];
        if (handler) handler(data);
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, [connect]);
};
