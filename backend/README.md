# ClinicBooking Backend API

## 📋 Tổng quan
Backend API cho hệ thống quản lý phòng khám được xây dựng bằng Spring Boot 3.5.6 và Java 21.

## 🗄️ Database Schema
- **Database**: PostgreSQL (Railway) hoặc SQL Server (Local)
- **Schema**: Tự động tạo bởi Hibernate
- **Tables**: Users, Roles, Departments, và các bảng khác theo thiết kế ban đầu
- **Migration**: Hibernate tự động tạo/update tables (`ddl-auto: update`)

## 🚀 Cấu trúc Project

```
backend/
├── src/main/java/com/example/backend/
│   ├── controller/          # REST Controllers
│   │   ├── UserController.java
│   │   └── DepartmentController.java
│   ├── service/            # Business Logic Layer
│   │   ├── UserService.java
│   │   └── DepartmentService.java
│   ├── repository/         # Data Access Layer
│   │   ├── UserRepository.java
│   │   ├── RoleRepository.java
│   │   └── DepartmentRepository.java
│   ├── model/              # Entity Classes
│   │   ├── User.java
│   │   ├── Role.java
│   │   └── Department.java
│   ├── dto/                # Data Transfer Objects
│   │   ├── UserCreateDTO.java
│   │   ├── UserUpdateDTO.java
│   │   ├── UserResponseDTO.java
│   │   ├── DepartmentCreateDTO.java
│   │   ├── DepartmentUpdateDTO.java
│   │   └── DepartmentResponseDTO.java
│   ├── mapper/             # Entity-DTO Mappers
│   │   ├── UserMapper.java
│   │   └── DepartmentMapper.java
│   ├── constant/           # Application Constants
│   │   └── AppConstants.java
│   ├── exception/          # Exception Classes
│   │   ├── NotFoundException.java
│   │   ├── ConflictException.java
│   │   └── GlobalExceptionHandler.java
│   └── config/             # Configuration Classes
│       └── SecurityConfig.java
└── src/main/resources/
    ├── application.yml     # Application Configuration
    └── data.sql           # Initial Data
```

## 📡 API Endpoints

### 👥 User Management API

#### Base URL: `/api/users`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get all users with pagination | - | Page<UserResponseDTO> |
| GET | `/{id}` | Get user by ID | - | UserResponseDTO |
| GET | `/email/{email}` | Get user by email | - | UserResponseDTO |
| GET | `/search` | Search users with filters | Query params | Page<UserResponseDTO> |
| POST | `/` | Create new user | UserCreateDTO | UserResponseDTO |
| PUT | `/{id}` | Update user | UserUpdateDTO | UserResponseDTO |
| DELETE | `/{id}` | Soft delete user | - | 204 No Content |
| DELETE | `/{id}/hard` | Hard delete user | - | 204 No Content |

#### Search Parameters:
- `email` (optional): Filter by email
- `firstName` (optional): Filter by first name
- `lastName` (optional): Filter by last name
- `status` (optional): Filter by status (ACTIVE, INACTIVE, SUSPENDED, DELETED)
- `roleId` (optional): Filter by role ID
- `page` (default: 0): Page number
- `size` (default: 20): Page size
- `sort` (default: createdAt): Sort field

### 🏢 Department Management API

#### Base URL: `/api/departments`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get all departments with pagination | - | Page<DepartmentResponseDTO> |
| GET | `/{id}` | Get department by ID | - | DepartmentResponseDTO |
| GET | `/name/{departmentName}` | Get department by name | - | DepartmentResponseDTO |
| GET | `/active` | Get active departments only | - | Page<DepartmentResponseDTO> |
| GET | `/search` | Search departments with filters | Query params | Page<DepartmentResponseDTO> |
| GET | `/count/active` | Get count of active departments | - | Long |
| POST | `/` | Create new department | DepartmentCreateDTO | DepartmentResponseDTO |
| PUT | `/{id}` | Update department | DepartmentUpdateDTO | DepartmentResponseDTO |
| DELETE | `/{id}` | Soft delete department | - | 204 No Content |
| DELETE | `/{id}/hard` | Hard delete department | - | 204 No Content |

#### Search Parameters:
- `departmentName` (optional): Filter by department name
- `status` (optional): Filter by status (ACTIVE, INACTIVE)
- `page` (default: 0): Page number
- `size` (default: 20): Page size
- `sort` (default: departmentName): Sort field

## 📝 Data Models

### User Entity
```json
{
  "id": "Long",
  "email": "String (max 100, unique)",
  "passwordHash": "String (max 255)",
  "firstName": "String (max 50)",
  "lastName": "String (max 50)",
  "phone": "String (max 20)",
  "gender": "Enum (M, F, O)",
  "dateOfBirth": "LocalDate",
  "address": "String (max 255)",
  "roleId": "Long",
  "status": "Enum (ACTIVE, INACTIVE, SUSPENDED, DELETED)",
  "createdAt": "LocalDateTime"
}
```

### Department Entity
```json
{
  "id": "Long",
  "departmentName": "String (max 100, unique)",
  "description": "String (max 255)",
  "status": "Enum (ACTIVE, INACTIVE)"
}
```

### Role Entity
```json
{
  "id": "Long",
  "name": "String (max 50, unique)",
  "description": "String (max 255)"
}
```

## 🔧 Configuration

### Database Connection

**Mặc định (SQL Server):**
```yaml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:sqlserver://localhost:1433;databaseName=CLINIC;...}
    username: ${DB_USERNAME:sa}
    password: ${DB_PASSWORD:123}
    driver-class-name: ${DB_DRIVER:com.microsoft.sqlserver.jdbc.SQLServerDriver}
```

**PostgreSQL (Railway):**
Set environment variables:
- `DATABASE_URL`: `jdbc:postgresql://host:port/database?sslmode=require`
- `DB_DRIVER`: `org.postgresql.Driver`
- `HIBERNATE_DIALECT`: `org.hibernate.dialect.PostgreSQLDialect`

Xem chi tiết trong `POSTGRESQL_SETUP.md`

### Server Configuration
- **Port**: 8080
- **Context Path**: /

## 🛠️ Build & Run

### Prerequisites
- Java 21
- Database: PostgreSQL (Railway) hoặc SQL Server (Local)
- Maven 3.9+

### Build Commands
```bash
# Clean and compile
./mvnw clean compile

# Run tests
./mvnw test

# Run application
./mvnw spring-boot:run

# Package
./mvnw clean package
```

## 🧪 Testing

### Run All Tests
```bash
./mvnw test
```

### Test Coverage
- Unit tests for Services
- Integration tests for Controllers
- Repository tests with @DataJpaTest

## 📊 Default Data

### Roles
1. **Admin** - Quản trị hệ thống
2. **Doctor** - Bác sĩ có thể khám, tạo lịch trình, quản lý bệnh án
3. **Patient** - Bệnh nhân có thể đặt lịch và trò chuyện với bác sĩ
4. **Staff** - Nhân viên hỗ trợ quản lý lịch hẹn và thanh toán

### Departments
1. **Tim mạch** - Khoa Tim mạch
2. **Thần kinh** - Khoa Thần kinh
3. **Chấn thương chỉnh hình** - Khoa Chấn thương chỉnh hình
4. **Nhi khoa** - Khoa Nhi
5. **Nội tổng hợp** - Khoa Nội tổng hợp

### Default Users
- **Admin**: admin@clinic.com / admin123
- **Doctor**: doctor1@clinic.com / doctor123
- **Patient**: patient1@clinic.com / patient123
- **Staff**: staff1@clinic.com / staff123

## 🔐 Security Features
- Password encoding với BCrypt
- Input validation với Bean Validation
- SQL Injection protection với JPA
- Cross-Origin Resource Sharing (CORS) enabled

## 📈 Performance Optimizations
- Database indexing cho các trường thường query
- Lazy loading cho relationships
- Pagination cho tất cả list endpoints
- Query optimization với JPQL

## 🐛 Error Handling
- Global exception handler
- Structured error responses
- Validation error details
- HTTP status codes phù hợp

## 📚 Dependencies
- **Spring Boot**: 3.5.6
- **Java**: 21
- **Lombok**: Giảm boilerplate code
- **JPA/Hibernate**: ORM framework
- **PostgreSQL Driver**: Database connectivity (Railway)
- **SQL Server Driver**: Database connectivity (Local)
- **Spring Validation**: Input validation
- **Spring Test**: Testing framework

## 📚 Tài liệu tham khảo

- `POSTGRESQL_SETUP.md` - Hướng dẫn cấu hình PostgreSQL
- `MODEL_POSTGRESQL_CHECKLIST.md` - Checklist model files cho PostgreSQL
- `RAILWAY_POSTGRESQL_LOCAL.md` - Kết nối Railway PostgreSQL từ local
- `LOCAL_SETUP.md` - Hướng dẫn chạy local
- `HOW_TO_TEST_API.md` - Hướng dẫn test API