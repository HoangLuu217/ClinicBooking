package com.example.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.RoleDTO;
import com.example.backend.service.RoleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ResponseEntity<List<RoleDTO.Response>> getAllRoles() {
        List<RoleDTO.Response> roles = roleService.getAllRoles();
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleDTO.Response> getRoleById(@PathVariable Long id) {
        RoleDTO.Response role = roleService.getRoleById(id);
        return ResponseEntity.ok(role);
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<RoleDTO.Response> getRoleByName(@PathVariable String name) {
        RoleDTO.Response role = roleService.getRoleByName(name);
        return ResponseEntity.ok(role);
    }

    @PostMapping
    public ResponseEntity<RoleDTO.Response> createRole(@Valid @RequestBody RoleDTO.Create createDTO) {
        RoleDTO.Response createdRole = roleService.createRole(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRole);
    }
}