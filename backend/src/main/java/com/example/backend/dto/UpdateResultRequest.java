package com.example.backend.dto;

import com.example.backend.model.ClinicalReferralStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateResultRequest {
    private Long performedByDoctorId;
    private String resultText;
    private String resultFileUrl;
    private ClinicalReferralStatus status;
}
