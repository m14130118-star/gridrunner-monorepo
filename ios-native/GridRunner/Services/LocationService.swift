import Foundation
import CoreLocation
import Combine

class LocationService: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var currentLocation: CLLocationCoordinate2D?
    @Published var speed: Double = 0 // km/h
    @Published var hp: Int = 100
    @Published var fuel: Int = 100
    @Published var canCheckIn: Bool = false

    private let locationManager = CLLocationManager()
    private var lastLocation: CLLocation?
    private let maxSpeed: Double = 50 // km/h (для пешехода/велосипедиста)

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
    }

    // MARK: - CLLocationManagerDelegate
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        currentLocation = location.coordinate
        speed = location.speed * 3.6 // m/s → km/h
        applyAntiCheat(location: location)
        checkProximityToCheckpoints()
    }

    // Анти-чит: проверка скорости и GPS-джиттера
    private func applyAntiCheat(location: CLLocation) {
        // 1. Проверка скорости (максимум 50 км/ч)
        if speed > maxSpeed {
            hp = max(0, hp - 10)
        }

        // 2. Проверка GPS-джиттера (резкие скачки координат)
        if let lastLocation = lastLocation {
            let distance = location.distance(from: lastLocation)
            if distance > 100 && speed < 5 { // Скачок на 100+ метров при низкой скорости
                fuel = max(0, fuel - 20)
            }
        }
        lastLocation = location
    }

    // Проверка близости к чекпоинтам
    private func checkProximityToCheckpoints() {
        // TODO: Заменить на реальные координаты чекпоинтов
        let checkpoints = [
            CLLocationCoordinate2D(latitude: 55.751244, longitude: 37.618423),
            CLLocationCoordinate2D(latitude: 55.7505, longitude: 37.6195)
        ]

        guard let currentLocation = currentLocation else { return }
        for checkpoint in checkpoints {
            let distance = CLLocation(latitude: currentLocation.latitude, longitude: currentLocation.longitude)
                .distance(from: CLLocation(latitude: checkpoint.latitude, longitude: checkpoint.longitude))
            if distance < 50 { // 50 метров до чекпоинта
                canCheckIn = true
                return
            }
        }
        canCheckIn = false
    }

    // Чек-ин
    func checkIn() -> AnyPublisher<CheckInResponse, Error> {
        guard let currentLocation = currentLocation else {
            return Fail(error: URLError(.badURL)).eraseToAnyPublisher()
        }

        let url = URL(string: "http://localhost:3000/api/v1/player/check-in")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(AuthService().getToken() ?? "")", forHTTPHeaderField: "Authorization")

        let body: [String: Double] = [
            "latitude": currentLocation.latitude,
            "longitude": currentLocation.longitude
        ]
        request.httpBody = try? JSONEncoder().encode(body)

        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: CheckInResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
}

struct CheckInResponse: Codable {
    let goldEarned: Int
    let xpEarned: Int
}