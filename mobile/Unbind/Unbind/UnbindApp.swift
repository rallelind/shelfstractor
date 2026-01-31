import SwiftUI

@main
struct UnbindApp: App {

    @State private var analyzerViewModel = AnalyzerViewModel()

    var body: some Scene {
        WindowGroup {
            LandingView()
                .environment(analyzerViewModel)
        }
    }
}
