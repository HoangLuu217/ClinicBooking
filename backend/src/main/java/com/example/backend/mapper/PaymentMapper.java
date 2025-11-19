package com.example.backend.mapper;

import com.example.backend.dto.PaymentDTO;
import com.example.backend.model.Payment;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {
    
    public PaymentDTO.Response toResponseDTO(Payment payment) {
        if (payment == null) {
            return null;
        }
        
        PaymentDTO.Response dto = new PaymentDTO.Response();
        dto.setPaymentId(payment.getPaymentId());
        dto.setPayOSPaymentId(payment.getPayOSPaymentId());
        dto.setAmount(payment.getAmount());
        dto.setCurrency(payment.getCurrency());
        dto.setStatus(payment.getStatus());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setPayOSCode(payment.getPayOSCode());
        dto.setPayOSLink(payment.getPayOSLink());
        dto.setDescription(payment.getDescription());
        dto.setCreatedAt(payment.getCreatedAt());
        dto.setUpdatedAt(payment.getUpdatedAt());
        dto.setPaidAt(payment.getPaidAt());
        dto.setFailureReason(payment.getFailureReason());
        
        // Map appointment info if available
        if (payment.getAppointment() != null) {
            dto.setAppointmentId(payment.getAppointment().getAppointmentId());
            
            if (payment.getAppointment().getPatient() != null && 
                payment.getAppointment().getPatient().getUser() != null) {
                String patientName = payment.getAppointment().getPatient().getUser().getFirstName() + 
                                   " " + payment.getAppointment().getPatient().getUser().getLastName();
                dto.setPatientName(patientName);
            }
            
            if (payment.getAppointment().getDoctor() != null && 
                payment.getAppointment().getDoctor().getUser() != null) {
                String doctorName = payment.getAppointment().getDoctor().getUser().getFirstName() + 
                                 " " + payment.getAppointment().getDoctor().getUser().getLastName();
                dto.setDoctorName(doctorName);
            }
            
            if (payment.getAppointment().getStartTime() != null) {
                dto.setAppointmentDate(payment.getAppointment().getStartTime().toString());
            }
        }
        
        return dto;
    }
}
