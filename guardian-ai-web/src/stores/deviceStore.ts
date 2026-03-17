import { create } from "zustand";

export interface Device {
  id: string;
  name: string;
  code: string;
  status: "online" | "offline" | "warning";
  signal?: string;
  temperature?: string;
  warningMessage?: string;
}

interface DeviceState {
  devices: Device[];
  totalNodes: number;
  onlineNodes: number;
  alertCount: number;
  isLoading: boolean;
  fetchDevices: () => Promise<void>;
  updateDeviceStatus: (id: string, status: Device["status"]) => void;
}

const mockDevices: Device[] = [
  { id: "1", name: "Node_ESP_A01", code: "A01", status: "online", signal: "-45 dBm", temperature: "24.5°C" },
  { id: "2", name: "Node_ESP_B04", code: "B04", status: "offline" },
  { id: "3", name: "Node_ESP_C12", code: "C12", status: "warning", temperature: "42.8°C", warningMessage: "อุณหภูมิสูง" },
  { id: "4", name: "Node_ESP_A05", code: "A05", status: "online", signal: "-38 dBm", temperature: "22.1°C" },
  { id: "5", name: "Node_ESP_A09", code: "A09", status: "online", signal: "-51 dBm", temperature: "23.8°C" },
];

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  totalNodes: 128,
  onlineNodes: 124,
  alertCount: 2,
  isLoading: false,

  fetchDevices: async () => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 600));
    set({ devices: mockDevices, isLoading: false });
  },

  updateDeviceStatus: (id, status) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, status } : d)),
    })),
}));
