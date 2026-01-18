import SwiftUI

struct LandingView: View {
    var body: some View {
        VStack(spacing: 0) {
            Text("Unbind")
                .font(.system(size: 52, weight: .regular, design: .serif))
                .foregroundStyle(Color.stone100)
                .tracking(-0.5)
            
            Image("BookShelf")
                .resizable()
                .scaledToFit()
                .frame(width: 200, height: 168)
                .shadow(color: .black.opacity(0.3), radius: 12, x: 0, y: 4)
                .padding(.top, 24)
                .padding(.bottom, 48)
            
            Text("Simply take a photo of your bookshelf and we'll identify every title to unbind them from the physical shelf and adding them to your digital library.")
                .font(.system(size: 18, design: .serif))
                .foregroundStyle(Color.stone400)
                .multilineTextAlignment(.center)
                .lineSpacing(8)
                .padding(.horizontal, 32)
            
            Button {
                
            } label: {
                Text("Scan Bookshelf")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.stone300)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.stone700)
                    .clipShape(Capsule())
            }
            .padding(.top, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 24)
        .background(Color.stone800)
    }
}

#Preview {
    LandingView()
}