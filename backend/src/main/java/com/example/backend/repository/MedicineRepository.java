package com.example.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Medicine;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Integer> {
    Optional<Medicine> findByName(String name);
    List<Medicine> findByNameContainingIgnoreCase(String name);
}
