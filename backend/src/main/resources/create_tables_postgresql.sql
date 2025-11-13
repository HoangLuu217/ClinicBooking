-- PostgreSQL Script to create tables for Clinic Booking System
-- Note: Database is already created on Railway, so we only create tables here

-- 1) QUYỀN NGƯỜI DÙNG
CREATE TABLE IF NOT EXISTS Roles (
    RoleID SERIAL PRIMARY KEY,
    Name VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT
);

-- 2) NGƯỜI DÙNG
CREATE TABLE IF NOT EXISTS Users (
    UserID SERIAL PRIMARY KEY,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FirstName TEXT NOT NULL,
    LastName TEXT NOT NULL,
    Phone VARCHAR(20),
    Gender VARCHAR(10) CHECK (Gender IN ('MALE', 'FEMALE', 'OTHER')),
    DOB DATE,
    Address TEXT,
    RoleID INT NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(20) DEFAULT 'ACTIVE',
    AvatarUrl VARCHAR(500),
    FailedLoginAttempts INT DEFAULT 0,
    LockedAt TIMESTAMP,
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

-- 3) KHOA
CREATE TABLE IF NOT EXISTS Departments (
    DepartmentID SERIAL PRIMARY KEY,
    DepartmentName TEXT NOT NULL,
    Description TEXT,
    Status VARCHAR(20) DEFAULT 'ACTIVE',
    ImageUrl VARCHAR(500)
);

-- 4) BÁC SĨ
CREATE TABLE IF NOT EXISTS Doctors (
    DoctorID BIGINT PRIMARY KEY,
    DepartmentID BIGINT NOT NULL,
    Specialty TEXT,
    Bio TEXT,
    Degree TEXT,
    WorkExperience TEXT,
    WorkingHours TEXT,
    PracticeCertificateNumber TEXT,
    CitizenId TEXT,
    UserID BIGINT,
    Status VARCHAR(255),
    CreatedAt DATE,
    FOREIGN KEY (DoctorID) REFERENCES Users(UserID),
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    UNIQUE (UserID)
);

-- 5) BỆNH NHÂN
CREATE TABLE IF NOT EXISTS Patients (
    PatientID BIGINT PRIMARY KEY,
    HealthInsuranceNumber VARCHAR(50),
    MedicalHistory TEXT,
    UserID BIGINT,
    Status VARCHAR(255),
    CreatedAt DATE,
    FOREIGN KEY (PatientID) REFERENCES Users(UserID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    UNIQUE (UserID)
);

-- 6) LỊCH LÀM VIỆC BÁC SĨ
CREATE TABLE IF NOT EXISTS DoctorSchedules (
    ScheduleID SERIAL PRIMARY KEY,
    DoctorID BIGINT NOT NULL,
    WorkDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    Status VARCHAR(20) DEFAULT 'Available',
    Notes VARCHAR(255),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID) ON DELETE CASCADE
);

-- 7) CUỘC HẸN
CREATE TABLE IF NOT EXISTS Appointments (
    AppointmentID SERIAL PRIMARY KEY,
    PatientID BIGINT,
    DoctorID BIGINT NOT NULL,
    ScheduleID BIGINT,
    StartTime TIMESTAMP NOT NULL,
    EndTime TIMESTAMP NOT NULL,
    Status VARCHAR(30) DEFAULT 'Scheduled',
    Notes TEXT,
    Fee NUMERIC(12,2),
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    FOREIGN KEY (ScheduleID) REFERENCES DoctorSchedules(ScheduleID)
);

-- 8) BỆNH ÁN
CREATE TABLE IF NOT EXISTS MedicalRecords (
    RecordID SERIAL PRIMARY KEY,
    AppointmentID BIGINT NOT NULL,
    Diagnosis TEXT,
    Advice TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID) ON DELETE CASCADE,
    UNIQUE (AppointmentID)
);

-- 9) THUỐC & ĐƠN THUỐC
CREATE TABLE IF NOT EXISTS Medicines (
    MedicineID SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL UNIQUE,
    Strength VARCHAR(255),
    UnitPrice NUMERIC(12,2),
    Note TEXT
);

CREATE TABLE IF NOT EXISTS Prescriptions (
    PrescriptionID SERIAL PRIMARY KEY,
    RecordID INT NOT NULL,
    PatientID BIGINT,
    AppointmentID BIGINT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Notes TEXT,
    Diagnosis TEXT,
    FOREIGN KEY (RecordID) REFERENCES MedicalRecords(RecordID) ON DELETE CASCADE,
    UNIQUE (RecordID)
);

CREATE TABLE IF NOT EXISTS PrescriptionItems (
    ItemID SERIAL PRIMARY KEY,
    PrescriptionID INT NOT NULL,
    MedicineID INT NOT NULL,
    Dosage TEXT,
    Duration TEXT,
    Note TEXT,
    Quantity INT DEFAULT 1,
    FOREIGN KEY (PrescriptionID) REFERENCES Prescriptions(PrescriptionID) ON DELETE CASCADE,
    FOREIGN KEY (MedicineID) REFERENCES Medicines(MedicineID)
);

-- 10) BÀI VIẾT
CREATE TABLE IF NOT EXISTS Articles (
    ArticleID SERIAL PRIMARY KEY,
    Title TEXT NOT NULL,
    Content TEXT,
    ImageURL VARCHAR(255),
    AuthorID BIGINT NOT NULL,
    CreatedAt TIMESTAMP NOT NULL,
    Status VARCHAR(20) DEFAULT 'ACTIVE',
    LikeCount INT DEFAULT 0,
    FOREIGN KEY (AuthorID) REFERENCES Users(UserID)
);

-- 11) ĐÁNH GIÁ BÁC SĨ
CREATE TABLE IF NOT EXISTS Reviews (
    ReviewID SERIAL PRIMARY KEY,
    PatientID BIGINT NOT NULL,
    DoctorID BIGINT NOT NULL,
    AppointmentID BIGINT NOT NULL,
    Rating INT CHECK (Rating BETWEEN 1 AND 5),
    Comment VARCHAR(255),
    CreatedAt TIMESTAMP,
    Status VARCHAR(20) DEFAULT 'ACTIVE',
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID)
);

-- 12) THANH TOÁN
CREATE TABLE IF NOT EXISTS Payments (
    PaymentID SERIAL PRIMARY KEY,
    OrderID VARCHAR(100) UNIQUE,
    AppointmentID BIGINT,
    Amount NUMERIC(12,2) NOT NULL,
    Status VARCHAR(255) NOT NULL,
    TransactionID VARCHAR(100),
    CreatedAt TIMESTAMP NOT NULL,
    UpdatedAt TIMESTAMP,
    Currency VARCHAR(255) NOT NULL,
    Description VARCHAR(255),
    FailureReason VARCHAR(255),
    PaidAt TIMESTAMP,
    PatientID BIGINT,
    PayOSCode VARCHAR(255),
    PayOSLink VARCHAR(255),
    PayOSPaymentID VARCHAR(255),
    PaymentMethod VARCHAR(255),
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID),
    UNIQUE (AppointmentID),
    UNIQUE (PayOSPaymentID)
);

-- 13) TIN NHẮN
CREATE TABLE IF NOT EXISTS Conversations (
    ConversationID SERIAL PRIMARY KEY,
    UserIdOfPatient BIGINT NOT NULL,
    UserIdOfDoctor BIGINT NOT NULL,
    CreatedAt TIMESTAMP,
    FOREIGN KEY (UserIdOfPatient) REFERENCES Users(UserID),
    FOREIGN KEY (UserIdOfDoctor) REFERENCES Users(UserID)
);

CREATE TABLE IF NOT EXISTS Messages (
    MessageID SERIAL PRIMARY KEY,
    ConversationID BIGINT NOT NULL,
    SenderID BIGINT NOT NULL,
    Content TEXT,
    AttachmentURL VARCHAR(255),
    SentAt TIMESTAMP,
    IsRead BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (ConversationID) REFERENCES Conversations(ConversationID) ON DELETE CASCADE,
    FOREIGN KEY (SenderID) REFERENCES Users(UserID)
);

-- 14) THÔNG BÁO
CREATE TABLE IF NOT EXISTS SystemNotifications (
    NotificationID SERIAL PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Message TEXT,
    Type VARCHAR(50),
    UserID BIGINT NOT NULL,
    AppointmentID BIGINT,
    CreatedAt TIMESTAMP,
    IsRead BOOLEAN,
    ReadAt TIMESTAMP,
    EmailSent BOOLEAN,
    EmailSentAt TIMESTAMP,
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID)
);

-- 15) CHUYỂN KHOA
CREATE TABLE IF NOT EXISTS ClinicalReferrals (
    ReferralID SERIAL PRIMARY KEY,
    FromDoctorID BIGINT NOT NULL,
    ToDepartmentID BIGINT NOT NULL,
    PerformedByDoctorID BIGINT,
    AppointmentID BIGINT NOT NULL,
    Notes TEXT,
    ResultText TEXT,
    ResultFileURL VARCHAR(500),
    Status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    CreatedAt TIMESTAMP NOT NULL,
    CompletedAt TIMESTAMP,
    FOREIGN KEY (FromDoctorID) REFERENCES Doctors(DoctorID),
    FOREIGN KEY (ToDepartmentID) REFERENCES Departments(DepartmentID),
    FOREIGN KEY (PerformedByDoctorID) REFERENCES Doctors(DoctorID),
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID),
    CHECK (Status IN ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'))
);

-- Insert default Roles
INSERT INTO Roles (Name, Description) VALUES 
('Admin', 'Quản trị hệ thống'),
('Doctor', 'Bác sĩ có thể khám, tạo lịch trình, quản lý bệnh án'),
('Patient', 'Bệnh nhân có thể đặt lịch và trò chuyện với bác sĩ')
ON CONFLICT (Name) DO NOTHING;
