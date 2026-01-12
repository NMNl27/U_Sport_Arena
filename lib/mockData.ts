export interface FootballField {
  id: string
  name: string
  description: string
  location: string
  pricePerHour: number
  size: string
  surface: string
}

export const mockFields: FootballField[] = [
  {
    id: "1",
    name: "Stadium 1(VIP)",
    description:
      "สนามหญ้าเทียมมาตรฐานระดับโลก พร้อมสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับการแข่งขันและการฝึกซ้อมระดับมืออาชีพ",
    location: "Khlong 6, Pathum Thani",
    pricePerHour: 1200,
    size: "สนามหญ้าเทียม 7 คน",
    surface: "Artificial Turf",
    // Availability status used by booking UI
    // allowed values: 'available' | 'maintenance' | 'unavailable'
    // default to 'available'
    // (not part of FootballField type to keep compatibility; accessed via any)
    // @ts-ignore
    status: "available",
  },
  {
    id: "2",
    name: "Stadium 2(VIP)",
    description:
      "สนามหญ้าเทียมมาตรฐานระดับโลก พร้อมสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับการแข่งขันและการฝึกซ้อมระดับมืออาชีพ",
    location: "Khlong 6, Pathum Thani",
    pricePerHour: 1200,
    size: "สนามหญ้าเทียม 7 คน",
    surface: "Artificial Turf",
    // @ts-ignore
    status: "available",
  },
  {
    id: "3",
    name: "Stadium 3",
    description:
      "สนามหญ้าเทียมมาตรฐานระดับโลก พร้อมสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับการแข่งขันและการฝึกซ้อมระดับมืออาชีพ",
    location: "Khlong 6, Pathum Thani",
    pricePerHour: 1000,
    size: "สนามหญ้าเทียม 7 คน",
    surface: "Artificial Turf",
    // @ts-ignore
    status: "available",
  },
  {
    id: "4",
    name: "Stadium 4",
    description:
      "สนามหญ้าเทียมมาตรฐานระดับโลก พร้อมสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับการแข่งขันและการฝึกซ้อมระดับมืออาชีพ",
    location: "Khlong 6, Pathum Thani",
    pricePerHour: 1000,
    size: "สนามหญ้าเทียม 7 คน",
    surface: "Hybrid Grass",
    // @ts-ignore
    status: "available",
  },
  {
    id: "5",
    name: "Fitness U Sport",
    description:
      "ฟิตเนสครบวงจร พร้อมอุปกรณ์ทันสมัยและโปรแกรมการฝึกที่หลากหลาย เหมาะสำหรับทุกระดับความฟิตเนส",
    location: "Khlong 6, Pathum Thani",
    pricePerHour: 100,
    size: "-",
    surface: "Gym",
    // @ts-ignore
    status: "available",
  },
]

