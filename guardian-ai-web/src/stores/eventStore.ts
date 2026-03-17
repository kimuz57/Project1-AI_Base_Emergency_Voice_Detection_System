import { create } from "zustand";

export interface EventItem {
  id: string;
  event_type: string;
  confidence: number;
  description: string;
  zone: string;
  created_at: string;
  audio_url?: string;
  icon: string;
}

interface EventState {
  events: EventItem[];
  filter: string;
  searchQuery: string;
  isLoading: boolean;
  setFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  fetchEvents: () => Promise<void>;
  addEvent: (event: EventItem) => void;
  filteredEvents: () => EventItem[];
}

// Mock data
const mockEvents: EventItem[] = [
  {
    id: "1",
    event_type: "เสียง",
    confidence: 0.92,
    description: "ตรวจพบเสียงกระแทกดัง",
    zone: "โซนห้องนั่งเล่น B",
    created_at: new Date().toISOString(),
    icon: "warning",
  },
  {
    id: "2",
    event_type: "เสียง",
    confidence: 0.87,
    description: "ตรวจพบเสียงที่ไม่รู้จัก",
    zone: "ทางเข้า",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    icon: "record_voice_over",
  },
  {
    id: "3",
    event_type: "การเคลื่อนไหว",
    confidence: 0.78,
    description: "ตรวจพบน้ำรั่ว",
    zone: "บริเวณอ่างล้างจานในครัว",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    icon: "water_drop",
  },
  {
    id: "4",
    event_type: "การเคลื่อนไหว",
    confidence: 0.65,
    description: "กิจกรรมสัตว์เลี้ยง",
    zone: "หลังบ้าน",
    created_at: new Date(Date.now() - 100000000).toISOString(),
    icon: "pets",
  },
];

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  filter: "ทั้งหมด",
  searchQuery: "",
  isLoading: false,

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchEvents: async () => {
    set({ isLoading: true });
    try {
      // Mock — replace with: const data = await apiGet("/events");
      await new Promise((r) => setTimeout(r, 800));
      set({ events: mockEvents, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addEvent: (event) =>
    set((state) => ({ events: [event, ...state.events] })),

  filteredEvents: () => {
    const { events, filter, searchQuery } = get();
    let filtered = events;
    if (filter !== "ทั้งหมด") {
      filtered = filtered.filter((e) => e.event_type === filter);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.description.includes(searchQuery) ||
          e.zone.includes(searchQuery)
      );
    }
    return filtered;
  },
}));
