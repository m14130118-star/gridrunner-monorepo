import Foundation
import Combine

class AuthViewModel: ObservableObject {
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var username: String = ""
    @Published var showError: Bool = false
    @Published var errorMessage: String = ""

    private let authService = AuthService()
    private var cancellables = Set<AnyCancellable>()

    func login() {
        authService.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink { completion in
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                    self.showError = true
                }
            } receiveValue: { _ in
                // Успешный логин → переход на главный экран
            }
            .store(in: &cancellables)
    }

    func register() {
        authService.register(username: username, email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink { completion in
                if case .failure(let error) = completion {
                    self.errorMessage = error.localizedDescription
                    self.showError = true
                }
            } receiveValue: { _ in
                // Успешная регистрация → переход на главный экран
            }
            .store(in: &cancellables)
    }
}