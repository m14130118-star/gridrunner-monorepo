import SwiftUI

struct MainView: View {
    var body: some View {
        TabView {
            TripView()
                .tabItem {
                    Label("Trip", systemImage: "map")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person")
                }
        }
    }
}

struct TripView: View {
    var body: some View {
        Text("GPS Tracking")
            .font(.title)
    }
}

struct ProfileView: View {
    var body: some View {
        Text("User Profile")
            .font(.title)
    }
}