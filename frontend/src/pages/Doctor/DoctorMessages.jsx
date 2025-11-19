import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import patientApi from "../../api/patientApi";
import appointmentApi from "../../api/appointmentApi";
import doctorApi from "../../api/doctorApi";
import conversationApi from "../../api/conversationApi";
import messageApi from "../../api/messageApi";
import fileUploadApi from "../../api/fileUploadApi";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import Cookies from "js-cookie";
import config from "../../config/config";
import {
  Search,
  Send,
  MessageCircle,
  User,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";

// UI components
const Button = (props) => (
  <button
    {...props}
    className={`btn ${props.variant === "outline" ? "btn-outline-primary" : "btn-primary"
      } ${props.className || ""}`}
  >
    {props.children}
  </button>
);

const Input = (props) => (
  <input {...props} className={`form-control ${props.className || ""}`} />
);

const Avatar = ({ src, alt, children, size = 40, online = false }) => {
  const hasValidSrc = src && src.trim() !== "" && src !== "/placeholder.svg";
  return (
    <div className="position-relative">
      <div
        className="avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
        style={{
          width: size,
          height: size,
          overflow: "hidden",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "3px solid #fff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {hasValidSrc ? (
          <img
            src={src}
            alt={alt}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            className="fw-bold text-white"
            style={{ fontSize: `${size * 0.4}px` }}
          >
            {children}
          </span>
        )}
      </div>
      {online && (
        <div
          className="position-absolute bg-success rounded-circle"
          style={{
            width: 12,
            height: 12,
            bottom: 2,
            right: 2,
            border: "2px solid white",
          }}
        />
      )}
    </div>
  );
};

// Messages are loaded from API

function DoctorMessages() {
  const [searchParams] = useSearchParams();
  const selectedPatientId = searchParams.get("patientId");
  const urlDoctorId = searchParams.get("doctorId");

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // local preview URL
  const [pendingFile, setPendingFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const seenMessageIdsRef = React.useRef(new Set());
  const lastWsMessageAtRef = React.useRef(0);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [menuOpenMessageId, setMenuOpenMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);

  const markConversationAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    try {
      await messageApi.markMessagesAsRead(conversationId, currentUserId);
      setMessages(prev => prev.map(msg =>
        Number(msg.senderId) === Number(currentUserId) ? msg : { ...msg, isRead: true }
      ));
      setPatients(prev => prev.map(p =>
        selectedPatient && p.patientId === selectedPatient.patientId
          ? { ...p, unreadCount: 0 }
          : p
      ));
    } catch (e) {
      console.error("Failed to mark conversation as read:", e);
    }
  }, [conversationId, currentUserId, setMessages, setPatients, selectedPatient]);

  const mergeUniqueMessages = useCallback((existing, incomingList) => {
    const toKey = (msg) => {
      const id = msg.messageId ?? msg.id;
      if (id !== undefined && id !== null) {
        return `id-${id}`;
      }
      const sender = msg.senderId ?? "unknown";
      const timestamp = msg.createdAt || msg.sentAt || msg._arrivalAt || "";
      const content = msg.content || "";
      return `fallback-${sender}-${timestamp}-${content}`;
    };

    const next = [...existing];
    const indexByKey = new Map();
    next.forEach((msg, idx) => {
      indexByKey.set(toKey(msg), idx);
    });

    incomingList.forEach((msg) => {
      const key = toKey(msg);
      if (indexByKey.has(key)) {
        const idx = indexByKey.get(key);
        next[idx] = { ...next[idx], ...msg };
      } else {
        const enriched = { ...msg, _arrivalAt: Date.now() };
        next.push(enriched);
        indexByKey.set(key, next.length - 1);
        const id = msg.messageId ?? msg.id;
        if (id !== undefined && id !== null) {
          seenMessageIdsRef.current.add(String(id));
        }
      }
    });

    return next;
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById("messages-container");
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Chuẩn hoá URL ảnh đính kèm: nếu backend trả path tương đối (/uploads/..)
  // thì thêm origin http://localhost:8080, còn nếu đã absolute thì giữ nguyên
  const resolveAttachmentUrl = useCallback((url) => {
    if (!url) return url;
    try {
      // absolute URL -> trả lại luôn
      const u = new URL(url);
      return u.href;
    } catch {
      // relative path -> prefix server origin (không /api)
      const base = window.location.origin.replace(/:\d+$/, ':8080');
      return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
    }
  }, []);

  // Get current user from localStorage (memoized)
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  const currentUserName = useMemo(() => {
    if (!currentUser) return "";
    const parts = [currentUser.firstName, currentUser.lastName].filter(Boolean);
    const joined = parts.join(" ").trim();
    return joined || currentUser.email || "";
  }, [currentUser]);

  const currentUserAvatarUrl = useMemo(() => {
    if (!currentUser) return null;
    return currentUser.avatarUrl || currentUser.avatarURL || null;
  }, [currentUser]);

  const resolveSenderAvatar = useCallback((avatarUrl) => {
    if (!avatarUrl) return null;
    return config.helpers.getAvatarUrl(avatarUrl);
  }, []);

  // Fetch doctorId and currentUserId
  useEffect(() => {
    const fetchDoctorId = async () => {
      const userId = Cookies.get("userId") || currentUser?.id;
      if (userId) {
        setCurrentUserId(userId);
        try {
          const res = await doctorApi.getDoctorByUserId(userId);
          const data = res.data || res;
          console.log("✅ Fetched doctor data:", data);
          setDoctorId(data.doctorId);
          console.log("✅ Set doctorId:", data.doctorId);
        } catch (err) {
          console.error("❌ Error fetching doctorId:", err);
        }
      }
    };
    fetchDoctorId();
  }, [currentUser]);

  // Fetch patients with appointments
  const fetchPatients = useCallback(async () => {
    console.log("🔄 fetchPatients called with doctorId:", doctorId);
    if (!doctorId) {
      console.log("❌ No doctorId, skipping fetchPatients");
      return;
    }

    // Tránh flicker: chỉ bật loading trong lần tải đầu
    if (patients.length === 0) setLoading(true);
    try {
      // Lấy tất cả appointments của bác sĩ
      const appointmentsRes = await appointmentApi.getAppointmentsByDoctor(doctorId);
      console.log(`✅ Loaded appointments for doctor ${doctorId}:`, appointmentsRes.data?.length || 0);
      
      // Nếu không có appointments, không hiển thị patients nào
      if (!appointmentsRes.data || appointmentsRes.data.length === 0) {
        console.log("❌ No appointments found for doctor", doctorId, "- no patients to display");
        console.log("Appointments response:", appointmentsRes);
        setPatients([]);
        return;
      }
      
      console.log("✅ Found appointments:", appointmentsRes.data.length);
      
      // Lấy danh sách patient IDs từ appointments
      const patientIds = [...new Set(
        appointmentsRes.data
          .filter(appointment => appointment.patientId !== null)
          .map(appointment => appointment.patientId)
      )];
      
      console.log("✅ Patient IDs from appointments:", patientIds);

      // Lấy thông tin chi tiết của từng patient
      const patientsWithDetails = await Promise.all(
        patientIds.map(async (patientId) => {
          try {
            const patientRes = await patientApi.getPatientById(patientId);
            const patient = patientRes.data;
            
            // Lấy appointments của patient này với bác sĩ
            const patientAppointments = appointmentsRes.data.filter(
              appointment => appointment.patientId === patientId
            );

            // Lấy conversation và tin nhắn cuối cùng từ backend
            let lastMessageContent = "Chưa có tin nhắn";
            let lastMessageTime = null;
            let unreadCount = 0;
            try {
              const convRes = await conversationApi.getConversationByPatientAndDoctor(patientId, doctorId);
              const conv = convRes?.data;
              if (conv?.conversationId) {
                try {
                  const latestRes = await messageApi.getLatestByConversation(conv.conversationId);
                  const latest = latestRes?.data;
                  if (latest) {
                    lastMessageContent = latest.content || lastMessageContent;
                    lastMessageTime = latest.createdAt || latest.sentAt || null;
                  }
                  
                  // Lấy số tin nhắn chưa đọc
                  try {
                    const unreadRes = await messageApi.getUnreadCount(conv.conversationId, currentUserId);
                    unreadCount = unreadRes?.data || 0;
                  } catch (e) {
                    // ignore if no unread count
                  }
                } catch (e) {
                  // ignore if no latest message
                }
              }
            } catch (e) {
              // No conversation yet
            }

            return {
              ...patient,
              patientId,
              patientUserId: patient.user?.id ?? patient?.userId,
              patientName: patient.user?.lastName + " " + patient.user?.firstName ||
                          patient.lastName + " " + patient.firstName ||
                          "Không rõ",
              patientEmail: patient.user?.email || "",
              patientPhone: patient.user?.phone || "",
              patientAvatar: patient.user?.avatarUrl || "",
              lastMessage: lastMessageContent,
              lastMessageTime: lastMessageTime,
              unreadCount,
              totalAppointments: patientAppointments.length,
            };
          } catch (error) {
            console.error(`Error fetching patient ${patientId}:`, error);
            return null;
          }
        })
      );

      // Filter out null results
      const validPatients = patientsWithDetails.filter(patient => patient !== null);
      setPatients(validPatients);

      // Set selected patient if patientId is provided
      if (selectedPatientId) {
        const patient = validPatients.find(p => p.patientId == selectedPatientId);
        if (patient) {
          setSelectedPatient(patient);
        }
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, selectedPatientId, patients.length]);

  // Fetch conversations for doctor and map to sidebar items
  const fetchConversations = useCallback(async () => {
    if (!doctorId) return 0;

    if (patients.length === 0) setLoading(true);
    try {
      const convRes = await conversationApi.getConversationsByDoctor(doctorId);
      const conversations = Array.isArray(convRes?.data) ? convRes.data : [];
      console.log('Loaded conversations for doctor', doctorId, conversations);

      const items = await Promise.all(
        conversations.map(async (conv) => {
          const convId = conv.conversationId || conv.id;
          const patientId = conv.patientId || conv.patient?.patientId || conv.patient?.id;
          if (!patientId) {
            console.warn('Conversation missing patientId', conv);
            return null;
          }
          let patient = null;
          try {
            const patientRes = await patientApi.getPatientById(patientId);
            patient = patientRes?.data || null;
          } catch (e) {
            console.warn('Fallback to conv.patient due to patient API error:', e?.message);
            patient = conv.patient || {};
          }

          let lastMessageContent = "Chưa có tin nhắn";
          let lastMessageTime = null;
          let unreadCount = 0;

          try {
            const latestRes = await messageApi.getLatestByConversation(convId);
            const latest = latestRes?.data;
            if (latest) {
              lastMessageContent = latest.content || lastMessageContent;
              lastMessageTime = latest.createdAt || latest.sentAt || null;
            }
            try {
              if (currentUserId) {
                const unreadRes = await messageApi.getUnreadCount(convId, currentUserId);
                unreadCount = unreadRes?.data || 0;
              }
            } catch (_) {}
          } catch (_) {}

          const nameFromPatient = () => {
            const u = patient?.user;
            if (u?.firstName || u?.lastName) return `${u?.lastName || ''} ${u?.firstName || ''}`.trim();
            if (patient?.firstName || patient?.lastName) return `${patient?.lastName || ''} ${patient?.firstName || ''}`.trim();
            return 'Không rõ';
          };

          return {
            ...patient,
            conversationId: convId,
            patientId,
            patientUserId: conv.patientUserId || patient?.user?.id,
            patientName: nameFromPatient(),
            patientEmail: patient?.user?.email || patient?.email || "",
            patientPhone: patient?.user?.phone || patient?.phone || "",
            patientAvatar: patient?.user?.avatarUrl || patient?.avatarUrl || "",
            lastMessage: lastMessageContent,
            lastMessageTime,
            unreadCount,
            totalAppointments: undefined,
          };
        })
      );

      const valid = items.filter(Boolean);
      setPatients(valid);

      if (selectedPatientId) {
        const target = valid.find((p) => p.patientId == selectedPatientId);
        if (target) setSelectedPatient(target);
      }

      return valid.length;
    } catch (e) {
      console.error("Error fetching conversations:", e);
      return 0;
    } finally {
      setLoading(false);
    }
  }, [doctorId, selectedPatientId, patients.length, currentUserId]);

  // Load patients when URL parameters are present or when doctor is logged in
  useEffect(() => {
    if (doctorId && (selectedPatientId || doctorId)) {
      fetchPatients();
    }
  }, [doctorId, selectedPatientId, fetchPatients]);

  // Create conversation for specific patient if needed
  const createConversationForPatient = useCallback(async (patientId, doctorId) => {
    if (!patientId || !doctorId) {
      console.log("Missing patientId or doctorId:", { patientId, doctorId });
      return null;
    }

    console.log("Checking for existing conversation between patient:", patientId, "and doctor:", doctorId);

    try {
      // Check if conversation already exists
      const existingConversation = await conversationApi.getConversationByPatientAndDoctor(patientId, doctorId);
      if (existingConversation?.data) {
        return existingConversation.data;
      }
    } catch (error) {
      // If API returns 404 or error, conversation doesn't exist
      console.log("❌ Conversation doesn't exist, will check appointment first. Error:", error.message);
    }

    // Check if there's an appointment between patient and doctor before creating conversation
    try {
      console.log("🔍 Checking for appointments between patient:", patientId, "and doctor:", doctorId);
      const appointmentResponse = await appointmentApi.checkAppointmentBetweenPatientAndDoctor(patientId, doctorId);
      
      if (!appointmentResponse.data || appointmentResponse.data.length === 0) {
        console.log("❌ No appointments found between patient and doctor. Cannot create conversation.");
        alert("Bệnh nhân cần đặt lịch khám với bạn trước khi có thể nhắn tin.");
        return null;
      }
      
      console.log("✅ Found appointments, proceeding to create conversation");
    } catch (error) {
      console.error("❌ Error checking appointments:", error);
      alert("Không thể kiểm tra lịch hẹn. Vui lòng thử lại sau.");
      return null;
    }

    // Only create if conversation doesn't exist and appointment exists
    try {
      const conversationData = {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId)
      };

      console.log("🔄 Creating new conversation with data:", conversationData);
      const newConversation = await conversationApi.createConversation(conversationData);
      return newConversation.data || newConversation;
    } catch (error) {
      console.error("❌ Error creating conversation:", error);
      return null;
    }
  }, []);

  // Ensure conversation exists and load messages when patient is selected (from URL or sidebar)
  useEffect(() => {
    const ensureAndLoad = async () => {
      const targetDoctorId = urlDoctorId || doctorId;
      const targetPatientId = selectedPatient?.patientId || selectedPatientId;
      if (targetPatientId && targetDoctorId) {
        const conv = await createConversationForPatient(targetPatientId, targetDoctorId);
        const convId = conv?.conversationId;
        setConversationId(convId || null);
        if (convId) {
          try {
            const res = await messageApi.getByConversation(convId);
            const data = Array.isArray(res.data) ? res.data : [];
            const ids = data
              .map((m) => m.messageId ?? m.id)
              .filter((id) => id !== null && id !== undefined)
              .map((id) => String(id));
            seenMessageIdsRef.current = new Set(ids);
            setMessages(data);
            setVisibleCount(20);
            scrollToBottom();
            setLastFetchedAt(new Date().toISOString());
            
            // Đánh dấu tin nhắn đã đọc khi doctor mở conversation
            try {
              await messageApi.markMessagesAsRead(convId, currentUserId);
              // Cập nhật unreadCount trong danh sách patients
              setPatients(prev => prev.map(p =>
                p.patientId === targetPatientId
                  ? { ...p, unreadCount: 0 }
                  : p
              ));
            } catch (e) {
              console.error("Error marking messages as read:", e);
            }
          } catch (e) {
            console.error("Error loading messages:", e);
            setMessages([]);
          }
        }
      }
    };
    if ((doctorId || urlDoctorId) && (selectedPatient?.patientId || selectedPatientId)) {
      ensureAndLoad();
    }
  }, [doctorId, urlDoctorId, selectedPatient, selectedPatientId, createConversationForPatient, scrollToBottom]);

  // Scroll to bottom when switching patient explicitly
  useEffect(() => {
    if (selectedPatient) {
      scrollToBottom();
    }
  }, [selectedPatient, scrollToBottom]);

  // Poll for new messages (fallback when WS không hoạt động hoặc im ắng)
  useEffect(() => {
    const now = Date.now();
    const wsActive = wsConnected && now - lastWsMessageAtRef.current < 6000; // 6s không nhận gì thì coi như im ắng
    if (wsActive) return; // WS đang hoạt động, bỏ polling
    let intervalId;
    if (conversationId) {
      intervalId = setInterval(async () => {
        try {
          // Format since for backend LocalDateTime.parse (no timezone suffix)
          const toBackendLocalDateTime = (dateObj) => {
            const pad = (n) => String(n).padStart(2, '0');
            const y = dateObj.getFullYear();
            const m = pad(dateObj.getMonth() + 1);
            const d = pad(dateObj.getDate());
            const h = pad(dateObj.getHours());
            const mi = pad(dateObj.getMinutes());
            const s = pad(dateObj.getSeconds());
            return `${y}-${m}-${d}T${h}:${mi}:${s}`;
          };
          const baseDate = lastFetchedAt ? new Date(lastFetchedAt) : new Date(Date.now() - 60 * 60 * 1000);
          const sinceParam = toBackendLocalDateTime(baseDate);
          const res = await messageApi.getNewMessages(conversationId, sinceParam);
          const newMsgs = Array.isArray(res.data) ? res.data : [];
          if (newMsgs.length > 0) {
            setMessages(prev => mergeUniqueMessages(prev, newMsgs));
            // Cập nhật last message cho patient đang chọn ở sidebar
            const latest = newMsgs[newMsgs.length - 1];
            if (latest && selectedPatient) {
              // Kiểm tra xem tin nhắn mới có phải từ patient không
              const isFromPatient = Number(latest.senderId) !== Number(currentUserId);
              setPatients(prev => prev.map(p =>
                p.patientId === selectedPatient.patientId
                  ? {
                      ...p,
                      lastMessage: latest.content || p.lastMessage,
                      lastMessageTime: latest.createdAt || latest.sentAt || p.lastMessageTime,
                      unreadCount: isFromPatient ? p.unreadCount + 1 : p.unreadCount,
                    }
                  : p
              ));
            }
            // Tự động cuộn xuống cuối khi có tin nhắn mới
            setTimeout(() => {
              const messagesContainer = document.getElementById("messages-container");
              if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            }, 50);
          }
          setLastFetchedAt(new Date().toISOString());
        } catch (e) {
          // silent fail
        }
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [conversationId, lastFetchedAt, wsConnected]);

  // WebSocket/STOMP real-time messages
  useEffect(() => {
    if (!conversationId) return;

    const sock = new SockJS(config.helpers.getWebSocketUrl());
    const client = new Client({
      webSocketFactory: () => sock,
      reconnectDelay: 3000,
      debug: (str) => {
        console.log("WebSocket Debug:", str);
      },
    });

    client.onConnect = () => {
      console.log("✅ WebSocket connected for conversation:", conversationId);
      setWsConnected(true);
      client.subscribe(`/topic/conversations/${conversationId}`, (frame) => {
        console.log("📨 Received WebSocket message:", frame.body);
        try {
          const incoming = JSON.parse(frame.body);
          lastWsMessageAtRef.current = Date.now();
          // Tránh thêm trùng
          setMessages((prev) => mergeUniqueMessages(prev, [incoming]));
          // Cập nhật dòng preview ở sidebar
          const isFromPatient = Number(incoming.senderId) !== Number(currentUserId);
          setPatients(prev => prev.map(p =>
            selectedPatient?.patientId && p.patientId === selectedPatient.patientId
              ? {
                  ...p,
                  lastMessage: incoming.content || p.lastMessage,
                  lastMessageTime: incoming.createdAt || incoming.sentAt || p.lastMessageTime,
                  unreadCount: isFromPatient ? p.unreadCount + 1 : p.unreadCount,
                }
              : p
          ));
          // Cuộn xuống cuối
          requestAnimationFrame(() => {
            const el = document.getElementById("messages-container");
            if (el) el.scrollTop = el.scrollHeight;
          });
        } catch (e) {
          console.error("❌ Error parsing WebSocket message:", e);
        }
      });
    };

    client.onStompError = (error) => {
      console.error("❌ WebSocket STOMP error:", error);
      setWsConnected(false);
    };
    client.onWebSocketClose = (event) => {
      console.log("❌ WebSocket closed:", event);
      setWsConnected(false);
    };

    client.activate();
    return () => {
      setWsConnected(false);
      client.deactivate();
    };
  }, [conversationId, selectedPatient]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    const matches = patients.filter(patient => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          patient.patientName?.toLowerCase().includes(query) ||
          patient.patientEmail?.toLowerCase().includes(query) ||
          patient.patientPhone?.includes(query)
        );
      }
      return true;
    });

    matches.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    return matches;
  }, [patients, searchQuery]);

  // Messages for current conversation (already filtered)
  const patientMessages = useMemo(() => {
    const getTs = (m) => new Date(m.createdAt || m.sentAt || m._arrivalAt || 0).getTime();
    const sorted = [...messages].sort((a, b) => getTs(a) - getTs(b));
    const start = Math.max(0, sorted.length - visibleCount);
    return sorted.slice(start);
  }, [messages, visibleCount]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPatient || !conversationId || !currentUserId) return;

    const payload = {
      conversationId: Number(conversationId),
      senderId: Number(currentUserId),
      content: newMessage.trim(),
    };

    // Nếu đang có WebSocket, không dùng optimistic để tránh hiển thị 2 lần
    // WS sẽ push message sau khi backend lưu xong
    let optimistic = null;
    if (!wsConnected) {
      optimistic = {
        messageId: `temp-${Date.now()}`,
        conversationId: Number(conversationId),
        senderId: Number(currentUserId),
        content: newMessage.trim(),
        attachmentURL: null,
        sentAt: new Date().toISOString(),
        messageType: "TEXT",
        senderAvatarUrl: currentUserAvatarUrl,
        senderName: currentUserName || "Ban",
        senderRole: "DOCTOR",
      };
      setMessages(prev => [...prev, optimistic]);
    }
    setNewMessage("");

    try {
      const res = await messageApi.createMessage(payload);
      const created = res.data || res;
      if (!wsConnected && optimistic) {
        setMessages(prev => prev.map(m => (m.messageId === optimistic.messageId ? created : m)));
      }
      setMessages(prev => mergeUniqueMessages(prev, [created]));
      setPatients(prev => prev.map(p =>
        selectedPatient && p.patientId === selectedPatient.patientId
          ? {
              ...p,
              lastMessage: created.content || p.lastMessage,
              lastMessageTime: created.createdAt || created.sentAt || p.lastMessageTime,
              unreadCount: p.unreadCount,
            }
          : p
      ));
      markConversationAsRead();
    } catch (e) {
      console.error("Failed to send message:", e);
      // rollback optimistic
      if (!wsConnected && optimistic) {
        setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
      }
    }

    // Scroll to bottom
    setTimeout(() => {
      const messagesContainer = document.getElementById("messages-container");
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  };

  // Edit message actions (only own messages)
  const beginEditMessage = (msg) => {
    setEditingMessageId(msg.messageId);
    setEditingText(msg.content || "");
    setMenuOpenMessageId(null);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEditMessage = async (msg) => {
    try {
      const id = msg.messageId;
      const res = await messageApi.update(id, { content: editingText, attachmentURL: msg.attachmentURL });
      const updated = res?.data || res;
      setMessages(prev => prev.map(m => (m.messageId === id ? { ...m, ...updated } : m)));
      setEditingMessageId(null);
      setEditingText("");
    } catch (e) {
      console.error("Update message failed:", e);
    }
  };

  const recallMessage = async (msg) => {
    try {
      const id = msg.messageId;
      await messageApi.remove(id);
      setMessages(prev => prev.filter(m => m.messageId !== id));
    } catch (e) {
      console.error("Delete message failed:", e);
    } finally {
      setMenuOpenMessageId(null);
    }
  };

  // 1) Chọn ảnh: tạo preview tạm thời, chưa upload
  const handleChooseImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(`Ảnh quá lớn (${(file.size/1024/1024).toFixed(1)}MB). Giới hạn ${Math.round(MAX_IMAGE_BYTES/1024/1024)}MB.`);
      e.target.value = "";
      return;
    }
    setUploadError("");
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPendingImage(url);
    // reset input to allow re-select same file later
    e.target.value = "";
  };

  // 2) Gửi tin nhắn với ảnh: tạo message trước để có messageId, sau đó upload file với messageId để lưu đúng tên file
  const handleSendImageMessage = async () => {
    if (!pendingFile || !conversationId || !currentUserId) return;
    setUploading(true);
    try {
      // A) Tạo optimistic ngay với preview
      let optimistic = null;
      if (!wsConnected) {
        optimistic = {
          messageId: `temp-img-${Date.now()}`,
          conversationId: Number(conversationId),
        senderId: Number(currentUserId),
        content: (newMessage && newMessage.trim()) || "",
        attachmentURL: pendingImage, // local preview
        sentAt: new Date().toISOString(),
        messageType: "IMAGE",
        senderAvatarUrl: currentUserAvatarUrl,
        senderName: currentUserName || "Ban",
        senderRole: "DOCTOR",
      };
        setMessages(prev => [...prev, optimistic]);
      }

      // B) Upload file -> lấy URL public
  const uploadRes = await fileUploadApi.upload(pendingFile);
      const storedUrl = uploadRes?.data?.url || uploadRes?.data || null;
      if (!storedUrl) throw new Error("Upload failed");

      // C) Tạo message có attachmentURL
      const createRes = await messageApi.createMessage({
        conversationId: Number(conversationId),
        senderId: Number(currentUserId),
        content: (newMessage && newMessage.trim()) || "[image]",
        attachmentURL: storedUrl,
      });
      const created = createRes?.data || createRes;
      if (!wsConnected && optimistic) {
        setMessages(prev => prev.map(m => (m.messageId === optimistic.messageId ? created : m)));
      }
      setMessages(prev => mergeUniqueMessages(prev, [created]));
      setPatients(prev => prev.map(p =>
        selectedPatient && p.patientId === selectedPatient.patientId
          ? {
              ...p,
              lastMessage: created.content || (newMessage && newMessage.trim()) || p.lastMessage,
              lastMessageTime: created.createdAt || created.sentAt || p.lastMessageTime,
              unreadCount: p.unreadCount,
            }
          : p
      ));
      markConversationAsRead();

      setNewMessage("");
      setPendingFile(null);
      if (pendingImage) URL.revokeObjectURL(pendingImage);
      setPendingImage(null);
    } catch (err) {
      console.error("Send image message failed:", err);
      const status = err?.response?.status;
      if (status === 413 || /max(imum)? upload size/i.test(String(err?.message))) {
        setUploadError(`Ảnh vượt quá dung lượng máy chủ cho phép. Vui lòng chọn ảnh ≤ ${Math.round(MAX_IMAGE_BYTES/1024/1024)}MB.`);
      } else {
        setUploadError("Không thể gửi ảnh. Vui lòng thử lại.");
      }
      // rollback optimistic nếu có
      setMessages(prev => prev.filter(m => !String(m.messageId).startsWith('temp-img-')));
    } finally {
      setUploading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format time: hiển thị bao nhiêu phút trước, ưu tiên createdAt
  const formatTime = (ts) => {
    if (!ts) return "";
    const messageTime = new Date(ts);
    const now = new Date();
    const diffMs = now - messageTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins <= 0) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  // Lock outer page scroll while this page is mounted
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Close image lightbox with ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxSrc(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Responsive: detect mobile
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Render
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status"></div>
        <p className="mt-2">Đang tải tin nhắn...</p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white rounded-4 shadow-sm border" style={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>
      <div className="d-flex h-100">
        {/* Patients List Sidebar */}
        {(!isMobile || (isMobile && sidebarVisible)) && (
        <div
          className="border-end bg-light"
          style={{ width: isMobile ? "100%" : "350px", minWidth: isMobile ? "auto" : "350px" }}
        >
          {/* Header */}
          <div className="p-3 border-bottom">
            <h5 className="mb-3 fw-bold">Tin nhắn</h5>
            <div className="position-relative">
              <Search
                className="position-absolute"
                style={{
                  left: 12,
                  top: 12,
                  width: 16,
                  height: 16,
                  color: "#888",
                }}
              />
              <Input
                type="text"
                placeholder="Tìm kiếm bệnh nhân..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>

          {/* Patients List */}
          <div className="overflow-auto" style={{ height: "calc(100% - 120px)" }}>
            {filteredPatients.length === 0 ? (
              <div className="text-center py-5">
                <MessageCircle size={48} color="#ccc" className="mb-3" />
                <p className="text-muted">Chưa có cuộc hội thoại nào</p>
                <p className="text-muted small">Bệnh nhân đặt lịch khám để bắt đầu nhắn tin</p>
                <button 
                  className="btn btn-outline-primary btn-sm mt-2"
                  onClick={() => fetchPatients()}
                  disabled={loading}
                >
                  {loading ? "Đang tải..." : "Tải danh sách"}
                </button>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div
                  key={patient.patientId}
                  className={`p-3 border-bottom cursor-pointer ${
                    selectedPatient?.patientId === patient.patientId
                      ? "bg-primary text-white"
                      : "hover-bg-light"
                  }`}
                  onClick={() => {
                    setSelectedPatient(patient);
                    // Load patients if list is empty
                    if (patients.length === 0) {
                      fetchPatients();
                    }
                    if (isMobile) setSidebarVisible(false);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <Avatar
                      size={50}
                      src={config.helpers.getAvatarUrl(patient.patientAvatar) || null}
                      alt={patient.patientName}
                      online={patient.unreadCount > 0}
                    >
                      {patient.patientName
                        ? patient.patientName.charAt(0).toUpperCase()
                        : "?"}
                    </Avatar>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <h6 className="mb-0 fw-bold">{patient.patientName}</h6>
                        {patient.unreadCount > 0 && (
                          <span className="badge bg-danger rounded-pill">
                            {patient.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="mb-1 small text-truncate">
                        {patient.lastMessage}
                      </p>
                      <small className="text-muted">
                        {patient.lastMessageTime ? formatTime(patient.lastMessageTime) : ""}
                      </small>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Chat Area */}
        {(!isMobile || (isMobile && !sidebarVisible)) && (
        <div className="flex-grow-1 d-flex flex-column">
          {selectedPatient ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  {isMobile && (
                    <button
                      className="btn btn-outline-secondary d-flex align-items-center"
                      onClick={() => setSidebarVisible(true)}
                      title="Danh sách bệnh nhân"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <Avatar
                    size={45}
                    src={config.helpers.getAvatarUrl(selectedPatient.patientAvatar) || null}
                    alt={selectedPatient.patientName}
                  >
                    {selectedPatient.patientName
                      ? selectedPatient.patientName.charAt(0).toUpperCase()
                      : "?"}
                  </Avatar>
                  <div>
                    <h6 className="mb-0 fw-bold">{selectedPatient.patientName}</h6>
                    <small className="text-muted">
                      {selectedPatient.totalAppointments} lịch hẹn
                    </small>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                id="messages-container"
                className="flex-grow-1 p-3 overflow-auto"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollTop <= 0) {
                    const prevHeight = el.scrollHeight;
                    setVisibleCount((v) => {
                      const next = Math.min(v + 20, messages.length);
                      return next;
                    });
                    // Restore position after more items prepended
                    setTimeout(() => {
                      el.scrollTop = el.scrollHeight - prevHeight;
                    }, 0);
                  }
                }}
              >
                {patientMessages.length === 0 ? (
                  <div className="text-center py-5">
                    <MessageCircle size={48} color="#ccc" className="mb-3" />
                    <p className="text-muted">Chưa có tin nhắn nào</p>
                    <p className="text-muted small">
                      Bắt đầu cuộc trò chuyện với {selectedPatient.patientName}
                    </p>
                  </div>
                ) : (
                  patientMessages.map((message) => {
                    const senderRole = (message.senderRole || "").toUpperCase();
                    const isCurrentUser = Number(message.senderId) === Number(currentUserId);
                    const patientUserId =
                      selectedPatient?.user?.id ?? selectedPatient?.patientUserId ?? selectedPatient?.userId ?? null;
                    const isDoctorSender =
                      senderRole === "DOCTOR" || (!senderRole && isCurrentUser);
                    const isPatientSender =
                      senderRole === "PATIENT" ||
                      (!senderRole &&
                        ((patientUserId != null &&
                          Number(message.senderId) === Number(patientUserId)) ||
                          (!isCurrentUser && patientUserId == null)));
                    const alignRight = isDoctorSender;
                    const containerClass = alignRight ? "justify-content-end" : "justify-content-start";
                    const bubbleClass = alignRight ? "bg-primary text-white" : "bg-light text-dark";
                    const timeClass = alignRight ? "text-white-50" : "text-muted";
                    const menuBtnClass = alignRight ? "btn-light" : "btn-outline-secondary";

                    const key = message.messageId || message.id || `${message.senderId}-${message.sentAt}`;
                    const rawAvatar =
                      message.senderAvatarUrl ||
                      (isDoctorSender
                        ? currentUserAvatarUrl
                        : selectedPatient?.patientAvatar || selectedPatient?.user?.avatarUrl);
                    const senderAvatar = resolveSenderAvatar(rawAvatar);
                    const fallbackNameRaw = (message.senderName && message.senderName.trim().length > 0)
                      ? message.senderName
                      : isDoctorSender
                        ? (currentUserName || "Ban")
                        : (selectedPatient?.patientName || "Nguoi dung");
                    const fallbackName = fallbackNameRaw.trim();
                    const senderInitial = fallbackName ? fallbackName.charAt(0).toUpperCase() : "?";

                    return (
                      <div
                        key={key}
                        className={`mb-3 d-flex align-items-end ${containerClass}`}
                        onMouseEnter={() => setHoveredMessageId(message.messageId)}
                        onMouseLeave={() => {
                          if (menuOpenMessageId !== message.messageId) setHoveredMessageId(null);
                        }}
                      >
                        {!alignRight && (
                          <div className="me-2">
                            <Avatar size={36} src={senderAvatar} alt={fallbackName || "User"}>
                              {senderInitial}
                            </Avatar>
                          </div>
                        )}
                        <div className="position-relative" style={{ maxWidth: "70%" }}>
                          <div className={`p-3 rounded-3 ${bubbleClass}`} style={{ maxWidth: "100%" }}>
                            {isCurrentUser && (
                              <div className="position-relative" style={{ height: 0 }}>
                                {(hoveredMessageId === message.messageId || menuOpenMessageId === message.messageId) && (
                                  <button
                                    className={`btn btn-sm ${menuBtnClass}`}
                                    style={{ position: "absolute", top: -14, right: -14, padding: "2px 6px" }}
                                    onClick={() =>
                                      setMenuOpenMessageId(prev => (prev === message.messageId ? null : message.messageId))
                                    }
                                  >
                                    <MoreVertical size={14} />
                                  </button>
                                )}
                                {menuOpenMessageId === message.messageId && (
                                  <div className="dropdown-menu show" style={{ position: "absolute", top: 0, right: 16 }}>
                                    <button className="dropdown-item" onClick={() => beginEditMessage(message)}>
                                      Chỉnh sửa
                                    </button>
                                    <button className="dropdown-item text-danger" onClick={() => recallMessage(message)}>
                                      Thu hồi
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {editingMessageId === message.messageId ? (
                              <>
                                <Input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="mb-2"
                                />
                                <div className="d-flex gap-2">
                                  <button
                                    className={`btn btn-sm ${alignRight ? "btn-light" : "btn-primary"}`}
                                    onClick={() => saveEditMessage(message)}
                                  >
                                    Lưu
                                  </button>
                                  <button className="btn btn-sm btn-outline-secondary" onClick={cancelEditMessage}>
                                    Hủy
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                {message.attachmentURL && (
                                  <div className="mb-2">
                                    <img
                                      src={resolveAttachmentUrl(message.attachmentURL)}
                                      alt="attachment"
                                      onDoubleClick={() => setLightboxSrc(resolveAttachmentUrl(message.attachmentURL))}
                                      style={{
                                        display: "block",
                                        maxWidth: "100%",
                                        maxHeight: 300,
                                        width: "auto",
                                        height: "auto",
                                        objectFit: "contain",
                                        borderRadius: 8,
                                        cursor: "zoom-in",
                                      }}
                                    />
                                  </div>
                                )}
                                {message.content && <p className="mb-0">{message.content}</p>}
                              </>
                            )}
                          </div>
                          <small className={`d-block mt-1 ${alignRight ? "text-end text-muted" : "text-start text-muted"}`}>
                            {formatTime(message.createdAt || message.sentAt)}
                          </small>
                        </div>
                        {alignRight && (
                          <div className="ms-2">
                            <Avatar size={36} src={senderAvatar} alt={fallbackName || "User"}>
                              {senderInitial}
                            </Avatar>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="p-3 border-top">
                <div className="d-flex gap-2">
                  <label className="btn btn-outline-primary d-flex align-items-center mb-0" style={{cursor:"pointer"}}>
                    <input type="file" accept="image/*" onChange={handleChooseImage} hidden disabled={uploading} />
                    <i className="bi bi-image-fill" aria-hidden="true"></i>
                  </label>
                  <Input
                    type="text"
                    placeholder="Nhập tin nhắn..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-grow-1"
                  />
                  {pendingImage && (
                    <img src={pendingImage} alt="preview" style={{height:40, width:40, objectFit:'cover', borderRadius:6}} />
                  )}
                  <Button
                    onClick={pendingImage ? handleSendImageMessage : handleSendMessage}
                    disabled={pendingImage ? uploading : !newMessage.trim()}
                    className="d-flex align-items-center gap-1"
                  >
                    <Send size={16} />
                    Gửi
                  </Button>
                </div>
                {uploadError && (
                  <div className="mt-2">
                    <small className="text-danger">{uploadError}</small>
                  </div>
                )}
                {pendingImage && (
                  <div className="mt-2">
                    <small className="text-muted">Ảnh sẽ được lưu với tên là ID của tin nhắn sau khi gửi.</small>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center">
                <MessageCircle size={64} color="#ccc" className="mb-3" />
                <h5 className="text-muted">Chọn bệnh nhân để bắt đầu trò chuyện</h5>
                <p className="text-muted">
                  Chọn một bệnh nhân từ danh sách bên trái để xem tin nhắn
                </p>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>

    {lightboxSrc && (
      <div
        onClick={() => setLightboxSrc(null)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          cursor: 'zoom-out',
        }}
      >
        <img
          src={lightboxSrc}
          alt="preview"
          style={{
            maxWidth: '95vw',
            maxHeight: '95vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}
        />
      </div>
    )}
    </>
  );
}

export default DoctorMessages;
