# CLINIC BOOKING SYSTEM - HỆ THỐNG ĐẶT LỊCH KHÁM BỆNH

## 📖 Giới thiệu

Hệ thống quản lý phòng khám (Clinic Booking System) là một ứng dụng web fullstack cho phép:
- **Bệnh nhân**: Đặt lịch khám bệnh online, xem bệnh án điện tử, chat với bác sĩ, thanh toán online
- **Bác sĩ**: Quản lý lịch làm việc, tạo bệnh án, kê đơn thuốc, chat với bệnh nhân
- **Admin**: Quản lý toàn bộ hệ thống, thống kê, báo cáo

### Công nghệ sử dụng

- **Frontend**: React 19.1.1, Tailwind CSS, Bootstrap 5
- **Backend**: Spring Boot 3.5.6, Java 21
- **Database**: Microsoft SQL Server
- **Real-time**: WebSocket (STOMP.js)
- **Payment**: PayOS Integration
- **AI**: Google Gemini AI Chatbot

---

## 📋 Yêu cầu hệ thống

### Bắt buộc cài đặt:

| Công cụ | Phiên bản yêu cầu | Link tải |
|---------|-------------------|----------|
| **Node.js** | 16.x trở lên (khuyến nghị 18.x hoặc 20.x) | [Download Node.js](https://nodejs.org/) |
| **npm** | Đi kèm với Node.js (8.x trở lên) | Tự động cài với Node.js |
| **JDK** | 21 (Java Development Kit) | [Oracle JDK 21](https://www.oracle.com/java/technologies/downloads/#java21) hoặc [OpenJDK 21](https://adoptium.net/) |
| **Maven** | 3.9+ | [Download Maven](https://maven.apache.org/download.cgi) |
| **SQL Server** | 2019+ (khuyến nghị SQL Server Express) | [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) |
| **SQL Server Management Studio (SSMS)** | Latest | [Download SSMS](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms) |
| **Git** | Latest | [Download Git](https://git-scm.com/downloads) |

### Khuyến nghị:

- **IDE**: 
  - **VS Code** với extensions: ESLint, Prettier, Tailwind CSS IntelliSense, Extension Pack for Java
  - **IntelliJ IDEA** (Community hoặc Ultimate)
  - [Download VS Code](https://code.visualstudio.com/)
  - [Download IntelliJ IDEA](https://www.jetbrains.com/idea/download/)
- **Postman** hoặc **Thunder Client**: Để test API
  - [Download Postman](https://www.postman.com/downloads/)
- **Browser**: Chrome/Firefox với React Developer Tools extension

---

## 🚀 Hướng dẫn cài đặt và chạy dự án

### Bước 1: Clone dự án

```bash
git clone https://github.com/nambautroi00/ClinicBooking.git
cd ClinicBooking
```

### Bước 2: Cài đặt SQL Server

1. **Tải và cài đặt SQL Server Express**:
   - Truy cập: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
   - Chọn "Express" (miễn phí)
   - Cài đặt với cấu hình mặc định
   - Ghi nhớ **username** và **password** của SQL Server (thường là `sa` và mật khẩu bạn đặt)

2. **Tải và cài đặt SQL Server Management Studio (SSMS)**:
   - Truy cập: https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
   - Cài đặt SSMS để quản lý database

3. **Tạo database**:
   - Mở SSMS
   - Kết nối với SQL Server (Server name: `localhost` hoặc `localhost\SQLEXPRESS`)
   - Right-click vào "Databases" → "New Database"
   - Tên database: `CLINIC`
   - Click "OK"

### Bước 3: Cài đặt Backend

#### 3.1. Cài đặt JDK 21

1. **Tải JDK 21**:
   - **Oracle JDK**: https://www.oracle.com/java/technologies/downloads/#java21
   - **OpenJDK** (khuyến nghị): https://adoptium.net/
   - Chọn phiên bản cho Windows (x64)

2. **Cài đặt JDK**:
   - Chạy file installer
   - Chọn "Set JAVA_HOME variable" trong quá trình cài đặt
   - Hoặc tự set biến môi trường:
     - `JAVA_HOME` = `C:\Program Files\Java\jdk-21` (hoặc đường dẫn bạn cài)
     - Thêm `%JAVA_HOME%\bin` vào `PATH`

3. **Kiểm tra cài đặt**:
   ```bash
   java -version
   # Kết quả mong đợi: java version "21.x.x"
   ```

#### 3.2. Cài đặt Maven

1. **Tải Maven**:
   - Truy cập: https://maven.apache.org/download.cgi
   - Tải file `apache-maven-3.9.x-bin.zip` (hoặc phiên bản mới nhất)

2. **Giải nén và cấu hình**:
   - Giải nén vào thư mục (ví dụ: `C:\Program Files\Apache\maven`)
   - Thêm biến môi trường:
     - `MAVEN_HOME` = `C:\Program Files\Apache\maven`
     - Thêm `%MAVEN_HOME%\bin` vào `PATH`

3. **Kiểm tra cài đặt**:
   ```bash
   mvn -version
   # Kết quả mong đợi: Apache Maven 3.9.x
   ```

#### 3.3. Cấu hình Backend

1. **Di chuyển vào thư mục backend**:
   ```bash
   cd backend
   ```

2. **Cập nhật cấu hình database**:
   - Mở file: `src/main/resources/application.yml`
   - Cập nhật thông tin kết nối database:
     ```yaml
     spring:
       datasource:
         url: jdbc:sqlserver://localhost:1433;databaseName=CLINIC;encrypt=false
         username: sa              # Thay bằng username SQL Server của bạn
         password: 123              # Thay bằng password SQL Server của bạn
     ```
   - **Lưu ý**: Nếu SQL Server chạy trên instance khác (ví dụ: `SQLEXPRESS`), sửa URL thành:
     ```yaml
     url: jdbc:sqlserver://localhost:1433;instanceName=SQLEXPRESS;databaseName=CLINIC;encrypt=false
     ```

3. **Build và chạy Backend**:

   **Cách 1: Sử dụng Maven Wrapper (khuyến nghị)**:
   ```bash
   # Windows
   .\mvnw.cmd clean install
   .\mvnw.cmd spring-boot:run
   
   # Linux/Mac
   ./mvnw clean install
   ./mvnw spring-boot:run
   ```

   **Cách 2: Sử dụng Maven global**:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

   **Cách 3: Chạy từ IDE**:
   - Mở project trong IntelliJ IDEA hoặc VS Code
   - Tìm file `BackendApplication.java`
   - Right-click → Run 'BackendApplication'

4. **Kiểm tra Backend đã chạy**:
   - Mở trình duyệt: `http://localhost:8080`
   - Hoặc test API: `http://localhost:8080/api/ping`
   - Console sẽ hiển thị: `Started BackendApplication in X seconds`

### Bước 4: Cài đặt Frontend

#### 4.1. Cài đặt Node.js và npm

1. **Tải Node.js**:
   - Truy cập: https://nodejs.org/
   - Tải phiên bản **LTS** (Long Term Support) - khuyến nghị 18.x hoặc 20.x
   - Chạy file installer và cài đặt với cấu hình mặc định

2. **Kiểm tra cài đặt**:
   ```bash
   node -v
   # Kết quả mong đợi: v18.x.x hoặc v20.x.x
   
   npm -v
   # Kết quả mong đợi: 8.x.x trở lên
   ```

#### 4.2. Cài đặt dependencies cho Frontend

1. **Di chuyển vào thư mục frontend**:
   ```bash
   cd frontend
   ```

2. **Cài đặt các thư viện**:
   ```bash
   npm install
   ```

   **Lưu ý**: Nếu gặp lỗi dependency conflicts, thử:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Cấu hình môi trường** (nếu cần):
   - Tạo file `.env` trong thư mục `frontend/`:
     ```env
     REACT_APP_API_BASE_URL=http://localhost:8080/api
     ```
   - File này không bắt buộc nếu backend chạy ở `http://localhost:8080`

4. **Chạy Frontend**:
   ```bash
   npm start
   ```

5. **Kiểm tra Frontend đã chạy**:
   - Tự động mở trình duyệt: `http://localhost:3000`
   - Hoặc mở thủ công: `http://localhost:3000`

---

## 🔄 Quy trình chạy dự án (Thứ tự quan trọng)

### Thứ tự chạy:

1. **Bật SQL Server**:
   - Đảm bảo SQL Server đang chạy
   - Kiểm tra: Mở SSMS và kết nối thành công

2. **Chạy Backend** (Terminal 1):
   ```bash
   cd backend
   .\mvnw.cmd spring-boot:run
   ```
   - Đợi đến khi thấy: `Started BackendApplication in X seconds`
   - Backend chạy ở: `http://localhost:8080`

3. **Chạy Frontend** (Terminal 2 - mở terminal mới):
   ```bash
   cd frontend
   npm start
   ```
   - Frontend chạy ở: `http://localhost:3000`
   - Tự động mở trình duyệt

### ⚠️ Lưu ý quan trọng:

- **Backend PHẢI chạy trước** Frontend
- Nếu Backend chưa chạy, Frontend sẽ không kết nối được API
- Có thể chạy Backend và Frontend song song trong 2 terminal riêng biệt

---

## 📦 Danh sách thư viện và phiên bản

### Frontend Dependencies

| Thư viện | Phiên bản | Mô tả | Link |
|----------|-----------|-------|------|
| **react** | 19.1.1 | React library | [npm](https://www.npmjs.com/package/react) |
| **react-dom** | 19.1.1 | React DOM | [npm](https://www.npmjs.com/package/react-dom) |
| **react-router-dom** | 7.9.3 | Routing | [npm](https://www.npmjs.com/package/react-router-dom) |
| **axios** | 1.12.2 | HTTP client | [npm](https://www.npmjs.com/package/axios) |
| **tailwindcss** | 3.4.18 | CSS framework | [npm](https://www.npmjs.com/package/tailwindcss) |
| **bootstrap** | 5.3.8 | UI framework | [npm](https://www.npmjs.com/package/bootstrap) |
| **react-bootstrap** | 2.10.10 | Bootstrap cho React | [npm](https://www.npmjs.com/package/react-bootstrap) |
| **@stomp/stompjs** | 7.2.1 | WebSocket STOMP | [npm](https://www.npmjs.com/package/@stomp/stompjs) |
| **sockjs-client** | 1.6.1 | WebSocket fallback | [npm](https://www.npmjs.com/package/sockjs-client) |
| **html2pdf.js** | 0.12.1 | PDF export | [npm](https://www.npmjs.com/package/html2pdf.js) |
| **react-icons** | 5.5.0 | Icon library | [npm](https://www.npmjs.com/package/react-icons) |
| **lucide-react** | 0.545.0 | Icon library | [npm](https://www.npmjs.com/package/lucide-react) |
| **bootstrap-icons** | 1.13.1 | Bootstrap icons | [npm](https://www.npmjs.com/package/bootstrap-icons) |
| **js-cookie** | 3.0.5 | Cookie management | [npm](https://www.npmjs.com/package/js-cookie) |
| **react-google-recaptcha** | 3.1.0 | reCAPTCHA | [npm](https://www.npmjs.com/package/react-google-recaptcha) |
| **react-scripts** | 5.0.1 | Create React App | [npm](https://www.npmjs.com/package/react-scripts) |

**Cài đặt tất cả**:
```bash
cd frontend
npm install
```

### Backend Dependencies

| Thư viện | Phiên bản | Mô tả | Link |
|----------|-----------|-------|------|
| **Spring Boot** | 3.5.6 | Framework chính | [Maven](https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-parent) |
| **Spring Data JPA** | 3.5.6 | ORM framework | [Maven](https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-data-jpa) |
| **Spring Security** | 6.x | Security | [Maven](https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-security) |
| **Spring WebSocket** | 3.5.6 | WebSocket support | [Maven](https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-websocket) |
| **JWT (jjwt)** | 0.12.3 | JWT authentication | [Maven](https://mvnrepository.com/artifact/io.jsonwebtoken/jjwt-api) |
| **SQL Server JDBC** | Latest | Database driver | [Maven](https://mvnrepository.com/artifact/com.microsoft.sqlserver/mssql-jdbc) |
| **Lombok** | 1.18.32 | Code generation | [Maven](https://mvnrepository.com/artifact/org.projectlombok/lombok) |
| **PayOS SDK** | 2.0.1 | Payment integration | [Maven](https://mvnrepository.com/artifact/vn.payos/payos-java) |
| **Apache PDFBox** | 2.0.30 | PDF generation | [Maven](https://mvnrepository.com/artifact/org.apache.pdfbox/pdfbox) |

**Cài đặt tất cả** (tự động khi build):
```bash
cd backend
mvn clean install
```

---

## ⚙️ Cấu hình chi tiết

### Backend Configuration (`backend/src/main/resources/application.yml`)

```yaml
spring:
  datasource:
    url: jdbc:sqlserver://localhost:1433;databaseName=CLINIC;encrypt=false
    username: sa              # Thay đổi theo SQL Server của bạn
    password: 123             # Thay đổi theo SQL Server của bạn
    driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver
  
  jpa:
    hibernate:
      ddl-auto: update        # Tự động tạo/cập nhật schema
    show-sql: true            # Hiển thị SQL queries

server:
  port: 8080                  # Port chạy backend
```

### Frontend Configuration (`frontend/src/config/config.js`)

```javascript
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
```

Hoặc tạo file `.env` trong `frontend/`:
```env
REACT_APP_API_BASE_URL=http://localhost:8080/api
```

---

## 🧪 Kiểm tra cài đặt

### Kiểm tra Backend:

```bash
# Kiểm tra Java
java -version
# Kết quả: java version "21.x.x"

# Kiểm tra Maven
mvn -version
# Kết quả: Apache Maven 3.9.x

# Test Backend API
curl http://localhost:8080/api/ping
# Hoặc mở trình duyệt: http://localhost:8080/api/ping
```

### Kiểm tra Frontend:

```bash
# Kiểm tra Node.js
node -v
# Kết quả: v18.x.x hoặc v20.x.x

# Kiểm tra npm
npm -v
# Kết quả: 8.x.x trở lên

# Test Frontend
# Mở trình duyệt: http://localhost:3000
```

---

## 🐛 Troubleshooting - Xử lý lỗi thường gặp

### 1. Lỗi kết nối Database

**Lỗi**: `Cannot create PoolableConnectionFactory` hoặc `Login failed for user`

**Giải pháp**:
- Kiểm tra SQL Server đã bật chưa
- Kiểm tra username/password trong `application.yml`
- Kiểm tra database `CLINIC` đã được tạo chưa
- Kiểm tra SQL Server đang chạy trên port 1433
- Kiểm tra firewall có chặn port 1433 không
- Thử kết nối bằng SSMS trước

### 2. Port đã bị chiếm

**Lỗi**: `Port 8080 is already in use` (Backend) hoặc `Port 3000 is already in use` (Frontend)

**Giải pháp**:
- **Backend**: Đổi port trong `application.yml`:
  ```yaml
  server:
    port: 8081
  ```
- **Frontend**: Chạy với port khác:
  ```bash
  # Windows
  set PORT=3001 && npm start
  
  # Linux/Mac
  PORT=3001 npm start
  ```

### 3. Lỗi JDK version

**Lỗi**: `class file has wrong version XX` hoặc `Unsupported class file major version`

**Giải pháp**:
- Kiểm tra JDK version: `java -version`
- Project yêu cầu JDK 21, cài đặt đúng version
- Trong IDE: File → Project Structure → SDK → Chọn JDK 21
- Set `JAVA_HOME` environment variable

### 4. npm install failed

**Lỗi**: `Unable to resolve dependency tree` hoặc `ERESOLVE unable to resolve dependency`

**Giải pháp**:
```bash
# Xóa node_modules và package-lock.json
rm -rf node_modules package-lock.json

# Cài lại với legacy peer deps
npm install --legacy-peer-deps

# Hoặc cài với force
npm install --force
```

### 5. Maven build failed

**Lỗi**: `Cannot resolve dependencies`

**Giải pháp**:
```bash
# Xóa repository cache
rm -rf ~/.m2/repository

# Build lại với update
mvn clean install -U

# Kiểm tra kết nối internet (Maven cần download từ Maven Central)
```

### 6. Frontend không kết nối được Backend

**Lỗi**: `Network Error` hoặc `CORS Error`

**Giải pháp**:
- Kiểm tra Backend đã chạy chưa (`http://localhost:8080`)
- Kiểm tra `REACT_APP_API_BASE_URL` trong `.env` hoặc `config.js`
- Kiểm tra CORS đã được enable ở Backend (file `WebConfig.java`)
- Kiểm tra firewall/antivirus có chặn không

### 7. SQL Server không khởi động được

**Lỗi**: SQL Server service không start

**Giải pháp**:
- Mở **Services** (Windows + R → `services.msc`)
- Tìm "SQL Server (MSSQLSERVER)" hoặc "SQL Server (SQLEXPRESS)"
- Right-click → Start
- Kiểm tra log trong Event Viewer nếu vẫn lỗi

---

## 📚 Tài liệu tham khảo

### README chi tiết:

- **Frontend README**: Xem [frontend/README.md](frontend/README.md)
- **Backend README**: Xem [backend/README.md](backend/README.md)

### Tài khoản mặc định (nếu có):

- **Admin**: admin@clinic.com / admin123
- **Doctor**: doctor1@clinic.com / doctor123
- **Patient**: patient1@clinic.com / patient123

**Lưu ý**: Tài khoản mặc định có thể khác tùy theo dữ liệu trong database.

---

## 🎯 Quick Start (Tóm tắt nhanh)

```bash
# 1. Clone project
git clone https://github.com/nambautroi00/ClinicBooking.git
cd ClinicBooking

# 2. Tạo database CLINIC trong SQL Server

# 3. Cấu hình database trong backend/src/main/resources/application.yml

# 4. Chạy Backend (Terminal 1)
cd backend
.\mvnw.cmd spring-boot:run

# 5. Chạy Frontend (Terminal 2 - mở terminal mới)
cd frontend
npm install
npm start

# 6. Mở trình duyệt: http://localhost:3000
```

---

## 📞 Hỗ trợ

- **Repository**: [ClinicBooking GitHub](https://github.com/nambautroi00/ClinicBooking)
- **Issues**: Tạo issue trên GitHub nếu gặp vấn đề

---

## 📝 Ghi chú

- Đảm bảo đã cài đặt đầy đủ các công cụ theo yêu cầu
- Backend phải chạy trước Frontend
- Kiểm tra kết nối database trước khi chạy Backend
- Đọc kỹ phần Troubleshooting nếu gặp lỗi

---

**Cập nhật lần cuối**: 15/11/2025

**Phiên bản dự án**: 1.0.0

