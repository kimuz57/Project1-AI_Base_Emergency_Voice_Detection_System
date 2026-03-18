"use client";

import { useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useEventStore } from "@/stores/eventStore";
import { useDeviceStore } from "@/stores/deviceStore";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const addEvent = useEventStore((s) => s.addEvent);
  const updateDeviceStatus = useDeviceStore((s) => s.updateDeviceStatus);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      const socket = io(WS_URL, {
        transports: ["websocket"],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 3000,
      });

      socket.on("connect", () => {
        console.log("[WS] Connected to Guardian AI server");
      });

      socket.on("ai_result", (data) => {
        addEvent({
          id: Date.now().toString(),
          event_type: data.event_type || "เสียง",
          confidence: data.confidence || 0,
          description: data.description || "ตรวจพบเหตุการณ์ใหม่",
          zone: data.zone || "ไม่ทราบ",
          created_at: new Date().toISOString(),
          icon: data.icon || "warning",
          audio_url: data.audio_url,
        });
      });

      socket.on("status_update", (data) => {
        if (data.device_id && data.status) {
          updateDeviceStatus(data.device_id, data.status);
        }
      });

      socket.on("disconnect", () => {
        console.log("[WS] Disconnected");
      });

      socketRef.current = socket;
    } catch (err) {
      console.log("[WS] Connection failed (backend may not be running):", err);
    }
  }, [addEvent, updateDeviceStatus]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, socket: socketRef.current };
}
