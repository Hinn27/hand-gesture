# Christmas Hand Tracking Project

## 🎄 Tổng quan
Dự án tương tác sử dụng **Hand Tracking** (MediaPipe) + **Particle System** (Three.js) để tạo trải nghiệm Giáng Sinh độc đáo.

## ✨ Tính năng chính

### 1. Nhận diện cử chỉ tay (Real-time)
- **👊 Nắm tay (Fist)**: 2000 particles tụ lại tạo thành cây thông Noel + chữ "MERRY CHRISTMAS"
- **🖐️ Xòe tay (Open Palm)**: Particles nổ tung, phân tán vào không gian vũ trụ
- **👌 OK Sign**: Hiển thị hình ảnh (cycle qua 3 ảnh: cặp đôi → Yao Ming meme → Wojak meme)

### 2. Công nghệ sử dụng
- **MediaPipe Hands**: Nhận diện 21 landmarks của bàn tay với độ chính xác cao
- **Three.js**: Render 2000 particles 3D với hiệu ứng lighting và fog
- **Pure JavaScript**: Không framework, chạy trực tiếp trên trình duyệt

### 3. UI/UX
- Camera preview nhỏ ở góc phải dưới (mirror mode)
- Status panel hiển thị:
  - Cử chỉ hiện tại
  - Hướng dẫn sử dụng
  - FPS counter
  - Số lượng particles
- Hand landmarks overlay (có thể toggle on/off)

## 🚀 Cách chạy

1. Mở file `index.html` bằng trình duyệt (Chrome/Edge recommended)
2. Cho phép truy cập camera khi được yêu cầu
3. Đợi MediaPipe load model (~2-3 giây)
4. Thử các cử chỉ tay trước camera!

## 📝 Cấu trúc code

### `index.html`
- Setup canvas cho Three.js và hand landmarks
- Import libraries (Three.js, MediaPipe)
- UI overlay structure

### `style.css`
- Styling cho UI panels
- Camera preview positioning
- Loading screen animation
- Responsive design

### `script.js`
Các module chính:
1. **Three.js Setup** (`setupThreeJS`, `createParticleSystem`)
   - Khởi tạo scene, camera, renderer
   - Tạo 2000 particles với màu Giáng Sinh (đỏ/xanh/trắng)

2. **MediaPipe Setup** (`setupMediaPipe`)
   - Khởi tạo MediaPipe Hands model
   - Access camera và bắt đầu tracking

3. **Gesture Detection** (`detectGesture`)
   - Phân tích 21 landmarks để nhận diện cử chỉ
   - Logic:
     - **Fist**: Tất cả ngón tay gấp (tip < MCP)
     - **Open Palm**: Tất cả ngón tay duỗi (tip > MCP)
     - **OK**: Khoảng cách thumb-index < 0.05 + các ngón còn lại duỗi

4. **State Transitions** (`transitionToChristmasTree`, `transitionToScatter`, `transitionToImage`)
   - Tính toán target positions cho particles
   - Lerp animation (smooth transition)

5. **Animation Loop** (`animate`)
   - Update particle positions mỗi frame
   - Render scene
   - Update FPS counter

## 🎨 Customization Ideas

### 1. Thêm cử chỉ mới
```javascript
// Trong detectGesture()
if (thumbTip.y < indexMCP.y && indexClosed && middleClosed) {
    return 'thumbsup'; // Cử chỉ like
}

// Trong onGestureChange()
case 'thumbsup':
    transitionToHeart(); // Tạo hình trái tim
    break;
```

### 2. Thay đổi hình dạng particles
```javascript
// Trong transitionToChristmasTree()
// Thay vì cây thông, tạo hình trái tim/ngôi sao/snowflake
```

### 3. Thêm âm thanh
```javascript
const audio = new Audio('jingle-bells.mp3');
audio.play(); // Khi chuyển sang christmas tree
```

### 4. Load ảnh thật (thay placeholder)
```javascript
const imageUrls = [
    './images/couple.jpg',        // Ảnh cặp đôi của bạn
    './images/yao-ming.png',      // Meme Yao Ming
    './images/wojak.png'          // Meme Wojak
];
```

### 5. Particle texture
```javascript
// Trong createParticleSystem()
const textureLoader = new THREE.TextureLoader();
particleMaterial = new THREE.PointsMaterial({
    size: 0.5,
    map: textureLoader.load('snowflake.png'),
    vertexColors: true,
    transparent: true,
    alphaTest: 0.5
});
```

## 🐛 Debugging Tips

### Camera không hoạt động
- Check browser console (F12)
- Đảm bảo HTTPS hoặc localhost
- Kiểm tra camera permissions

### FPS thấp
- Giảm `particleCount` xuống 1000
- Tắt `scene.fog`
- Giảm `modelComplexity` trong MediaPipe xuống 0

### Gesture không nhận diện
- Tăng độ sáng môi trường
- Giữ tay trong khung camera
- Điều chỉnh ngưỡng trong `detectGesture()`

## 🎯 Ý tưởng mở rộng

1. **Multi-hand tracking**: Nhận diện 2 tay cùng lúc
2. **Voice commands**: Thêm Web Speech API
3. **AR mode**: Dùng AR.js để hiển thị particles trong không gian thực
4. **Mobile optimization**: Touch gestures thay vì hand tracking
5. **Save/Share**: Chụp ảnh màn hình và share lên social media
6. **Music reactive**: Particles nhảy theo nhạc Giáng Sinh
7. **Multiplayer**: WebRTC để nhiều người cùng chơi

## 📦 Dependencies
- Three.js v0.150.0
- MediaPipe Hands
- MediaPipe Camera Utils
- MediaPipe Drawing Utils

## 📄 License
MIT - Free to use and modify!

---
**Made with ❤️ for Christmas 2024**
