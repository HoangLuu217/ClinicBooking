package com.example.backend.model;

public enum ClinicalReferralStatus {
    PENDING("Chờ thực hiện"),
    IN_PROGRESS("Đang thực hiện"),
    DONE("Đã hoàn thành"),
    CANCELLED("Đã hủy");

    private final String displayName;

    ClinicalReferralStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
