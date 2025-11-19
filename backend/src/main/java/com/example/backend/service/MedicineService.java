package com.example.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.MedicineDto;
import com.example.backend.exception.NotFoundException;
import com.example.backend.mapper.MedicineMapper;
import com.example.backend.model.Medicine;
import com.example.backend.repository.MedicineRepository;

@Service
@Transactional
public class MedicineService {

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private MedicineMapper medicineMapper;

    public List<MedicineDto> getAllMedicines() {
        return medicineRepository.findAll().stream()
                .map(medicineMapper::toDto)
                .collect(Collectors.toList());
    }

    public Page<MedicineDto> getAllMedicines(Pageable pageable) {
        return medicineRepository.findAll(pageable)
                .map(medicineMapper::toDto);
    }

    public MedicineDto getMedicineById(Integer id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Medicine not found with id: " + id));
        return medicineMapper.toDto(medicine);
    }

    public List<MedicineDto> searchMedicinesByName(String name) {
        return medicineRepository.findByNameContainingIgnoreCase(name).stream()
                .map(medicineMapper::toDto)
                .collect(Collectors.toList());
    }

    public MedicineDto createMedicine(MedicineDto requestDto) {
        Medicine medicine = medicineMapper.toEntity(requestDto);
        Medicine savedMedicine = medicineRepository.save(medicine);
        return medicineMapper.toDto(savedMedicine);
    }

    public MedicineDto updateMedicine(Integer id, MedicineDto requestDto) {
        Medicine existingMedicine = medicineRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Medicine not found with id: " + id));
        
        medicineMapper.updateEntity(existingMedicine, requestDto);
        Medicine updatedMedicine = medicineRepository.save(existingMedicine);
        return medicineMapper.toDto(updatedMedicine);
    }

    public void deleteMedicine(Integer id) {
        if (!medicineRepository.existsById(id)) {
            throw new NotFoundException("Medicine not found with id: " + id);
        }
        medicineRepository.deleteById(id);
    }
}