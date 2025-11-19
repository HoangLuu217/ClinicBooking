package com.example.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.PrescriptionItem;

@Repository
public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Integer> {
    
    @Query("SELECT DISTINCT pi FROM PrescriptionItem pi " +
           "LEFT JOIN FETCH pi.medicine " +
           "WHERE pi.prescription.prescriptionId = :prescriptionId")
    List<PrescriptionItem> findByPrescriptionPrescriptionId(@Param("prescriptionId") Integer prescriptionId);
    
    List<PrescriptionItem> findByMedicineMedicineId(Integer medicineId);
}
