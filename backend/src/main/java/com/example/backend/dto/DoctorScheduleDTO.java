package com.example.backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class DoctorScheduleDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Create {
        @NotNull(message = "DoctorID không được để trống")
        private Long doctorId;

        @NotNull(message = "Ngày làm việc không được để trống")
        @FutureOrPresent(message = "Ngày làm việc phải từ hôm nay trở đi")
        private LocalDate workDate;

        @NotNull(message = "Thời gian bắt đầu không được để trống")
        private LocalTime startTime;

        @NotNull(message = "Thời gian kết thúc không được để trống")
        private LocalTime endTime;

        @Size(max = 20, message = "Trạng thái không quá 20 ký tự")
        private String status;

        @Size(max = 255, message = "Ghi chú không quá 255 ký tự")
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Update {
        @FutureOrPresent(message = "Ngày làm việc phải từ hôm nay trở đi")
        private LocalDate workDate;

        private LocalTime startTime;

        private LocalTime endTime;

        @Size(max = 20, message = "Trạng thái không quá 20 ký tự")
        private String status;

        @Size(max = 255, message = "Ghi chú không quá 255 ký tự")
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long scheduleId;
        private Long doctorId;
        private String doctorName;
        private LocalDate workDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private String status;
        private String notes;
        private Long appointmentCount; // Số lượng appointments cho schedule này
    }
}


