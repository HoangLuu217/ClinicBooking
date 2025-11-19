package com.example.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.backend.model.Conversation;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    List<Conversation> findByPatientUser_Id(Long patientUserId);

    List<Conversation> findByDoctorUser_Id(Long doctorUserId);

    Optional<Conversation> findByPatientUser_IdAndDoctorUser_Id(Long patientUserId, Long doctorUserId);

    List<Conversation> findByPatientUser_IdOrderByCreatedAtDesc(Long patientUserId);

    List<Conversation> findByDoctorUser_IdOrderByCreatedAtDesc(Long doctorUserId);

    Long countByPatientUser_Id(Long patientUserId);

    Long countByDoctorUser_Id(Long doctorUserId);

    @Query("SELECT c FROM Conversation c LEFT JOIN FETCH c.messages WHERE c.conversationId = :conversationId")
    Optional<Conversation> findByIdWithMessages(@Param("conversationId") Long conversationId);

    @Query("SELECT c FROM Conversation c LEFT JOIN FETCH c.messages WHERE c.patientUser.id = :patientUserId AND c.doctorUser.id = :doctorUserId")
    Optional<Conversation> findByParticipantUserIdsWithMessages(@Param("patientUserId") Long patientUserId,
                                                                @Param("doctorUserId") Long doctorUserId);
}
