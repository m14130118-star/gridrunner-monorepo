import Foundation
import CoreLocation
import Combine

class TripViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var currentLocation: CLLocationCoordinate2D = CLLocationCoordinate2D(latitude: 55.751244, longitude: 37.618423)
    @Published var speed: Double = 0
    @Published var hp: Int = 100
    @Published var fuel: Int = 100
    @Published var canCheckIn: Bool = false
    @Published var showCheckInSuccess: Bool = false
    @Published var goldEarned: Int = 0
    @Published var xpEarned: Int = 0

    private let locationManager = CLLocationManager()
    private var cancellables = Set<AnyCancellable>()

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
        checkProximityToCheckpoints()
        applyAntiCheat(location: location)
    }

    // Анти-чит: проверка скорости и GPS-джиттера
    private func applyAntiCheat(location: CLLocation) {
        // 1. Проверка скорости (максимум 50 км/ч для пешехода/велосипедиста)
        if speed > 50 {
            hp = max(0, hp - 10)
        }

        // 2. Проверка GPS-джиттера (резкие скачки координат)
        if let lastLocation = locationManager.location {
            let distance = location.distance(from: lastLocation)
            if distance > 100 && speed < 5 { // Скачок на 100+ метров при низкой скорости
                fuel = max(0, fuel - 20)
            }
        }
    }

    // Проверка близости к чекпоинтам
    private func checkProximityToCheckpoints() {
        // TODO: Заменить на реальные координаты чекпоинтов
        let checkpoints = [
            CLLocationCoordinate2D(latitude: 55.751244, longitude: 37.618423),
            CLLocationCoordinate2D(latitude: 55.7505, longitude: 37.6195)
        ]

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
    func checkIn() {
        // TODO: Отправить запрос на сервер
        goldEarned = Int.random(in: 10...50)
        xpEarned = Int.random(in: 5...20)
        showCheckInSuccess = true
        canCheckIn = false
    }
}