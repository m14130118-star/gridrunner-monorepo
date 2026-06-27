struct Vehicle: Codable, Identifiable {
    let id: String
    let type: String // feet, skateboard, bicycle, car
    let level: Int
    let isUnlocked: Bool
}