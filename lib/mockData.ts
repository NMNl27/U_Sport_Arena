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
    name: "Stadium Central",
    description:
      "Premium football field located in the heart of the city. Features professional-grade turf and excellent lighting for evening games.",
    location: "Downtown District",
    pricePerHour: 50,
    size: "11v11 (Full Size)",
    surface: "Artificial Turf",
  },
  {
    id: "2",
    name: "Riverside Arena",
    description:
      "Beautiful field overlooking the river with natural grass surface. Perfect for competitive matches and training sessions.",
    location: "Riverside Park",
    pricePerHour: 45,
    size: "11v11 (Full Size)",
    surface: "Natural Grass",
  },
  {
    id: "3",
    name: "Community Field North",
    description:
      "Well-maintained community field ideal for casual games and local tournaments. Great facilities and parking available.",
    location: "North Community Center",
    pricePerHour: 35,
    size: "7v7",
    surface: "Artificial Turf",
  },
  {
    id: "4",
    name: "Elite Sports Complex",
    description:
      "State-of-the-art facility with multiple fields, changing rooms, and professional equipment. Used by local professional teams.",
    location: "Sports District",
    pricePerHour: 75,
    size: "11v11 (Full Size)",
    surface: "Hybrid Grass",
  },
  {
    id: "5",
    name: "Park Field East",
    description:
      "Family-friendly field in a scenic park setting. Perfect for weekend games and recreational play.",
    location: "East Park",
    pricePerHour: 30,
    size: "5v5",
    surface: "Artificial Turf",
  },
  {
    id: "6",
    name: "Championship Stadium",
    description:
      "Premier venue hosting major tournaments. Features spectator stands, floodlights, and professional-grade facilities.",
    location: "Sports Complex",
    pricePerHour: 100,
    size: "11v11 (Full Size)",
    surface: "Natural Grass",
  },
]

