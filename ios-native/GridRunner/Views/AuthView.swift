import SwiftUI

struct AuthView: View {
    @StateObject private var viewModel = AuthViewModel()
    @State private var isLogin = true

    var body: some View {
        VStack(spacing: 20) {
            Text(isLogin ? "Login" : "Register")
                .font(.largeTitle)
                .bold()

            if !isLogin {
                TextField("Username", text: $viewModel.username)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding(.horizontal)
            }

            TextField("Email", text: $viewModel.email)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding(.horizontal)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)

            SecureField("Password", text: $viewModel.password)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding(.horizontal)

            Button(action: {
                if isLogin {
                    viewModel.login()
                } else {
                    viewModel.register()
                }
            }) {
                Text(isLogin ? "Login" : "Register")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            .padding(.horizontal)

            Button(action: {
                isLogin.toggle()
            }) {
                Text(isLogin ? "No account? Register" : "Already have an account? Login")
                    .foregroundColor(.blue)
            }
        }
        .padding()
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
    }
}