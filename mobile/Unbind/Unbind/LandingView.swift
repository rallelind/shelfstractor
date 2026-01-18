import SwiftUI

struct LandingView: View {
    var body: some View {
        VStack(spacing: 32) {
            Text("Unbind")
                .font(.system(size: 48, weight: .regular, design: .serif))
                .foregroundStyle(Color.stone100)
            
            Text("Simply take a photo of your bookshelf and we'll identify every title to unbind them from the physical shelf and adding them to your digital library.")
                .font(.system(size: 18))
                .foregroundStyle(Color.stone400)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
            
            Button {
                
            } label: {
                Text("Scan Bookshelf")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.stone300)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Color.stone700)
                    .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.stone800)
    }
}

#Preview {
    LandingView()
}