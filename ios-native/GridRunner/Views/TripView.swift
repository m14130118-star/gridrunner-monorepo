import SwiftUI
import CoreLocation
import Combine

struct TripView: View {
    @StateObject private var viewModel = TripViewModel()
    @State private var showCheckInAlert = false

    var body: some View {
        ZStack {
            // Карта
            MapView(coordinate: viewModel.currentLocation)
                .edgesIgnoringSafeArea(.all)

            // HUD
            VStack {
                HStack(spacing: 20) {
                    StatView(value: "\(Int(viewModel.speed))", label: "km/h")
                    StatView(value: "\(viewModel.hp)", label: "HP")
                    StatView(value: "\(viewModel.fuel)", label: "Fuel")
                }
                .padding()
                .background(Color.black.opacity(0.7))
                .cornerRadius(10)
                .padding(.top, 50)

                Spacer()

                // Кнопка чек-ина
                Button(action: {
                    viewModel.checkIn()
                }) {
                    Text("Check-In")
                        .font(.headline)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .disabled(!viewModel.canCheckIn)
                .opacity(viewModel.canCheckIn ? 1 : 0.5)
                .padding(.bottom, 30)
            }
        }
        .alert("Check-In Successful!", isPresented: $viewModel.showCheckInSuccess) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("You earned \(viewModel.goldEarned) gold and \(viewModel.xpEarned) XP!")
        }
    }
}

// Компонент для отображения статистики
struct StatView: View {
    let value: String
    let label: String

    var body: some View {
        VStack {
            Text(value)
                .font(.title2)
                .bold()
            Text(label)
                .font(.caption)
        }
        .foregroundColor(.white)
    }
}