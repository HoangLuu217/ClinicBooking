import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import notificationApi from "../../api/notificationApi";
import userApi from "../../api/userApi";
import patientApi from "../../api/patientApi";
import conversationApi from "../../api/conversationApi";
import messageApi from "../../api/messageApi";
import { normalizeAvatar } from "../../utils/avatarUtils";
import { getFullImageUrl } from "../../utils/imageUtils";

const normalizeText = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshteinDistance = (a = "", b = "") => {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      if (a[i - 1] === b[j - 1]) matrix[j][i] = matrix[j - 1][i - 1];
      else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const fuzzyIncludes = (source, token) => {
  if (!token) return true;
  if (!source) return false;
  if (source.includes(token)) return true;
  if (token.length <= 2) return false;
  const maxDistance = token.length <= 4 ? 1 : 2;
  for (let i = 0; i <= source.length - token.length; i++) {
    const window = source.substring(i, i + token.length);
    if (levenshteinDistance(window, token) <= maxDistance) return true;
  }
  return false;
};

const matchesTokens = (source, tokens) =>
  tokens.every((token) => fuzzyIncludes(source, token));

const getInitials = (text = "") => {
  const parts = text.trim().split(/\s+/);
  if (!parts.length) return "CK";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getDoctorAvatarUrl = (doctor = {}) => {
  const rawAvatar =
    doctor.user?.avatarUrl ||
    doctor.user?.avatar ||
    doctor.avatarUrl ||
    doctor.avatar;

  if (rawAvatar) return normalizeAvatar(rawAvatar);

  const fullName = `${doctor.user?.firstName || ""} ${
    doctor.user?.lastName || ""
  }`.trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || "BS"
  )}&background=a855f7&color=fff&size=44`;
};

const getDepartmentImageUrl = (department = {}) => {
  const rawImage =
    department?.imageUrl ||
    department?.image ||
    department?.thumbnail ||
    department?.icon;
  return rawImage ? getFullImageUrl(rawImage) : null;
};

const extractRoleValue = (roleLike) => {
  if (!roleLike) return "";
  if (typeof roleLike === "string") return roleLike;
  return (
    roleLike.name ||
    roleLike.role ||
    roleLike.authority ||
    roleLike.code ||
    roleLike.value ||
    ""
  );
};

const isPatientRole = (userData = {}) => {
  const singleRole = extractRoleValue(userData.role)
    .toString()
    .toUpperCase();
  if (singleRole.includes("PATIENT")) return true;

  const roleArrays = [userData.roles, userData.authorities]
    .filter(Array.isArray)
    .flat();
  if (roleArrays.length > 0) {
    return roleArrays.some((item) =>
      extractRoleValue(item).toString().toUpperCase().includes("PATIENT")
    );
  }

  return !!(
    userData.patientId ||
    userData.patient?.patientId ||
    userData.patient?.id
  );
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileHeader, setShowMobileHeader] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    doctors: [],
    departments: [],
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeminiSearching, setIsGeminiSearching] = useState(false);
  const [searchSource, setSearchSource] = useState("local");
  const navigate = useNavigate();
  const doctorCacheRef = useRef([]);
  const departmentCacheRef = useRef([]);
  const searchFetchPromiseRef = useRef(null);

  const fetchPatientUnreadMessages = useCallback(async () => {
    try {
      const stored = localStorage.getItem("user");
      const parsedUser = user || (stored ? JSON.parse(stored) : null);

      if (!parsedUser?.id || !isPatientRole(parsedUser)) {
        setMessageUnreadCount(0);
        return;
      }

      let patientId =
        parsedUser.patientId ||
        parsedUser.patient?.patientId ||
        parsedUser.patient?.id;

      if (!patientId) {
        try {
          const patientRes = await patientApi.getPatientByUserId(parsedUser.id);
          const payload = patientRes?.data || patientRes;
          patientId =
            payload?.patientId ||
            payload?.id ||
            (Array.isArray(payload) ? payload[0]?.patientId : null);
        } catch (err) {
          console.warn("Header - Unable to resolve patientId for user:", err);
        }
      }

      if (!patientId) {
        setMessageUnreadCount(0);
        return;
      }

      const conversationRes = await conversationApi.getConversationsByPatient({
        patientId,
        patientUserId: parsedUser.id,
      });
      const conversations =
        (Array.isArray(conversationRes?.data)
          ? conversationRes.data
          : Array.isArray(conversationRes)
          ? conversationRes
          : []) || [];

      if (!conversations.length) {
        setMessageUnreadCount(0);
        return;
      }

      const unreadCounts = await Promise.all(
        conversations.map(async (conversation) => {
          const conversationId = conversation.conversationId ?? conversation.id;
          const fallbackCount =
            typeof conversation.unreadCount === "number"
              ? conversation.unreadCount
              : 0;

          if (!conversationId) return fallbackCount;

          try {
            const unreadRes = await messageApi.getUnreadCount(
              conversationId,
              parsedUser.id
            );
            return typeof unreadRes?.data === "number"
              ? unreadRes.data
              : fallbackCount;
          } catch (error) {
            return fallbackCount;
          }
        })
      );

      const totalUnread = unreadCounts.reduce(
        (sum, count) => sum + (Number.isFinite(count) ? count : 0),
        0
      );

      setMessageUnreadCount(totalUnread);
    } catch (error) {
      console.error("Header - Failed to fetch unread messages:", error);
      setMessageUnreadCount(0);
    }
  }, [user]);

  // Function to navigate to messages based on user role
  const handleMessagesClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Always navigate to patient messages page
    navigate("/patient/messages");
  };

  // Function to handle notifications click
  const handleNotificationsClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setShowNotifications(!showNotifications);
    setShowUserDropdown(false); // Close user dropdown if open
  };

  // Function to fetch notifications
  const fetchNotifications = useCallback(async () => {
    // Re-read from localStorage each time to get fresh data
    const userData = localStorage.getItem("user");

    console.log("🔍 fetchNotifications - user exists:", !!userData);

    if (!userData) {
      console.log("⚠️ No user found, skipping notification fetch");
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let currentUser;
    try {
      currentUser = JSON.parse(userData);
    } catch (error) {
      console.error("❌ Error parsing user:", error);
      return;
    }

    if (!currentUser || !currentUser.id) {
      console.log("⚠️ No user ID found");
      return;
    }

    try {
      console.log("🔔 Fetching notifications for user:", currentUser.id);
      const response = await notificationApi.getNotifications(currentUser.id);

      console.log("📡 Raw response:", response);
      console.log("📡 Response.data:", response.data);

      const data = response.data;
      console.log("DEBUG: data type:", typeof data);
      console.log("DEBUG: data.content exists?", !!data?.content);
      console.log(
        "DEBUG: data.content is array?",
        Array.isArray(data?.content)
      );
      console.log("DEBUG: data.content length:", data?.content?.length);

      const list = Array.isArray(data?.content) ? data.content : [];
      const unread =
        typeof data?.unreadCount === "number"
          ? data.unreadCount
          : list.filter((n) => !n.isRead).length;

      console.log("📊 Parsed - list length:", list.length, "unread:", unread);
      console.log("📊 List is array?", Array.isArray(list));
      console.log("📊 List content:", JSON.stringify(list).substring(0, 200));

      console.log("� Calling setNotifications with", list.length, "items");
      setNotifications(list);

      console.log("🔄 Calling setUnreadCount with", unread);
      setUnreadCount(unread);

      console.log("✅ setState calls completed");
    } catch (error) {
      console.error("❌❌❌ ERROR in fetchNotifications:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);

      if (error.response) {
        console.error("❌ Response status:", error.response.status);
        console.error("❌ Response data:", error.response.data);
      }

      setNotifications([]);
      setUnreadCount(0);
    }
  }, []); // No dependencies - always read fresh from localStorage

  // Function to mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      // Update UI immediately for better UX
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.notificationId === notificationId
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Call API to mark as read
      await notificationApi.markAsRead(notificationId);
      console.log("✅ Notification marked as read:", notificationId);
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      // Revert UI changes if API call fails
      fetchNotifications();
    }
  };

  // Function to mark all as read
  const markAllAsRead = async () => {
    if (!user || !user.id) return;

    try {
      // Update UI immediately for better UX
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);

      // Call API to mark all as read
      await notificationApi.markAllAsRead(user.id);
      console.log("✅ All notifications marked as read");
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      // Revert UI changes if API call fails
      fetchNotifications();
    }
  };

  // Listen for user changes (login/logout)
  useEffect(() => {
    const handleUserChange = () => {
      const userData = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      console.log("👤 User changed event - reloading user from localStorage");
      console.log("👤 Token exists:", !!token);
      console.log("👤 User data exists:", !!userData);

      if (userData && token) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log("✅ User reloaded:", parsedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error("❌ Error parsing user:", error);
          setUser(null);
        }
      } else {
        console.log("⚠️ No user or token, setting user to null");
        setUser(null);
      }
    };

    // Listen for userChanged event
    window.addEventListener("userChanged", handleUserChange);

    // Also check on mount
    handleUserChange();

    return () => {
      window.removeEventListener("userChanged", handleUserChange);
    };
  }, []);

  // Fetch notifications when user changes
  useEffect(() => {
    if (user) {
      console.log("🔔 User is set, fetching notifications for:", user.id);
      // Add small delay to ensure token is ready in localStorage
      const timer = setTimeout(() => {
        console.log("🔔 Fetching notifications after delay...");
        fetchNotifications();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      console.log("⚠️ No user, clearing notifications");
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const decorateDoctor = useCallback((doctor) => {
    const fullName = `${doctor.user?.firstName || ""} ${
      doctor.user?.lastName || ""
    }`.trim();
    return {
      ...doctor,
      _searchName: normalizeText(fullName),
      _searchDepartment: normalizeText(doctor.department?.departmentName || ""),
      _searchSpecialty: normalizeText(
        doctor.specialty || doctor.department?.departmentName || ""
      ),
    };
  }, []);

  const decorateDepartment = useCallback(
    (dept) => ({
      ...dept,
      _searchName: normalizeText(dept.departmentName || dept.name || ""),
      _searchDesc: normalizeText(dept.description || dept.desc || ""),
    }),
    []
  );

  const ensureSearchData = useCallback(async () => {
    if (doctorCacheRef.current.length || departmentCacheRef.current.length)
      return;
    if (!searchFetchPromiseRef.current) {
      searchFetchPromiseRef.current = Promise.all([
        axiosClient.get("/doctors"),
        axiosClient.get("/departments"),
      ])
        .then(([doctorsResponse, departmentsResponse]) => {
          const doctorsData = Array.isArray(doctorsResponse.data)
            ? doctorsResponse.data
            : doctorsResponse.data?.content || [];
          const departmentsData = Array.isArray(departmentsResponse.data)
            ? departmentsResponse.data
            : departmentsResponse.data?.content || [];
          doctorCacheRef.current = doctorsData.map(decorateDoctor);
          departmentCacheRef.current = departmentsData.map(decorateDepartment);
        })
        .catch((error) => {
          console.error("❌ Error preloading search data:", error);
        })
        .finally(() => {
          searchFetchPromiseRef.current = null;
        });
    }
    await searchFetchPromiseRef.current;
  }, [decorateDepartment, decorateDoctor]);

  const fetchGeminiSuggestions = useCallback(async (query) => {
    setIsGeminiSearching(true);
    try {
      const payload = {
        message: `Gợi ý nhanh danh sách chuyên khoa hoặc bác sĩ phù hợp với từ khóa tìm kiếm: "${query}". Trả về JSON với các trường department và doctors nếu có.`,
        context: "Autocomplete search suggestions for clinic booking website",
      };
      const response = await axiosClient.post("/gemini-chat", payload);
      const { department, doctors } = response.data || {};

      const aiDepartments = department
        ? [
            {
              departmentId: department.id || department.departmentId,
              departmentName: department.name || department.aiProvidedName,
              description:
                department.reason ||
                department.description ||
                department.suspectedCondition ||
                "",
            },
          ]
        : [];

      const aiDoctors = Array.isArray(doctors)
        ? doctors.map((doc) => ({
            doctorId: doc.id,
            user: {
              firstName:
                doc.fullName?.split(" ").slice(0, -1).join(" ") || doc.fullName,
              lastName: doc.fullName?.split(" ").slice(-1).join(" ") || "",
              avatarUrl: doc.avatarUrl,
            },
            department: { departmentName: doc.departmentName },
            _searchName: normalizeText(doc.fullName || ""),
            _searchDepartment: normalizeText(doc.departmentName || ""),
            _searchSpecialty: normalizeText(
              doc.specialty || doc.departmentName || ""
            ),
          }))
        : [];

      if (aiDepartments.length || aiDoctors.length) {
        setSearchResults({
          departments: aiDepartments,
          doctors: aiDoctors,
        });
        setSearchSource("ai");
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("❌ Error fetching Gemini suggestions:", error);
    } finally {
      setIsGeminiSearching(false);
    }
  }, []);

  // Function to handle search
  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults({ doctors: [], departments: [] });
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      await ensureSearchData();
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) {
        setSearchResults({ doctors: [], departments: [] });
        setIsSearching(false);
        return;
      }
      const tokens = normalizedQuery.split(" ").filter(Boolean);

      const scoredDoctors = doctorCacheRef.current
        .map((doctor) => {
          const nameScore = matchesTokens(doctor._searchName, tokens) ? 2 : 0;
          const deptScore = matchesTokens(doctor._searchDepartment, tokens)
            ? 2
            : 0;
          const specialtyScore = matchesTokens(doctor._searchSpecialty, tokens)
            ? 1
            : 0;
          const score = nameScore + deptScore + specialtyScore;
          return { doctor, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((entry) => entry.doctor);

      const scoredDepartments = departmentCacheRef.current
        .map((dept) => {
          const score =
            (matchesTokens(dept._searchName, tokens) ? 2 : 0) +
            (matchesTokens(dept._searchDesc, tokens) ? 1 : 0);
          return { dept, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((entry) => entry.dept);

      setSearchResults({
        doctors: scoredDoctors,
        departments: scoredDepartments,
      });
      setSearchSource("local");

      if (
        scoredDoctors.length === 0 &&
        scoredDepartments.length === 0 &&
        query.length >= 3
      ) {
        await fetchGeminiSuggestions(query);
      }
    } catch (error) {
      console.error("❌ Error searching:", error);
      setSearchResults({ doctors: [], departments: [] });
    } finally {
      setIsSearching(false);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchResults && !event.target.closest(".search-container")) {
        setShowSearchResults(false);
      }
      if (
        showNotifications &&
        !event.target.closest(".notifications-dropdown")
      ) {
        setShowNotifications(false);
      }
      if (showUserDropdown && !event.target.closest(".user-dropdown")) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearchResults, showNotifications, showUserDropdown]);

  useEffect(() => {
    if (!showMobileHeader && window.innerWidth < 768) {
      setShowSearchResults(false);
    }
  }, [showMobileHeader]);

  useEffect(() => {
    if (user) {
      fetchPatientUnreadMessages();
    } else {
      setMessageUnreadCount(0);
    }
  }, [user, fetchPatientUnreadMessages]);

  useEffect(() => {
    if (!user || !isPatientRole(user)) return;
    const interval = setInterval(() => {
      fetchPatientUnreadMessages();
    }, 10000);
    return () => clearInterval(interval);
  }, [user, fetchPatientUnreadMessages]);

  useEffect(() => {
    const handleUnreadUpdate = (event) => {
      const value = Number(event?.detail);
      if (Number.isFinite(value)) {
        setMessageUnreadCount(value);
      }
    };
    window.addEventListener("patientUnreadUpdated", handleUnreadUpdate);
    return () => {
      window.removeEventListener("patientUnreadUpdated", handleUnreadUpdate);
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load user from localStorage first
        const raw = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        console.log("🔍 Header - Checking localStorage");
        console.log("🔍 Header - User exists:", !!raw);
        console.log("🔍 Header - Token exists:", !!token);
        console.log(
          "🔍 Header - Token value:",
          token ? token.substring(0, 50) + "..." : "null"
        );

        if (raw) {
          const userData = JSON.parse(raw);
          console.log("🔍 Header - Loading user from localStorage:", userData);
          console.log("🔍 Header - User ID:", userData?.id);
          console.log("🔍 Header - User firstName:", userData?.firstName);
          console.log("🔍 Header - User lastName:", userData?.lastName);
          console.log("🔍 Header - User avatar:", userData?.avatar);
          console.log("🔍 Header - User avatarUrl:", userData?.avatarUrl);

          // If avatar fields are missing, try to fetch from backend
          if (!userData?.avatar && !userData?.avatarUrl) {
            console.log(
              "🔄 Header - Avatar fields missing, fetching from backend..."
            );
            try {
              const response = await userApi.getCurrentUser();
              console.log(
                "✅ Header - Fetched user from backend:",
                response.data
              );

              // Update localStorage with fresh data
              const updatedUser = { ...userData, ...response.data };
              localStorage.setItem("user", JSON.stringify(updatedUser));
              setUser(updatedUser);
              return;
            } catch (apiError) {
              console.warn(
                "⚠️ Header - Failed to fetch user from backend:",
                apiError
              );
            }
          }

          setUser(userData);
        } else {
          console.log("❌ Header - No user data found");
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
        setUser(null);
      }
    };

    loadUserData();

    const onUserChanged = () => {
      console.log("🔄 Header received userChanged event");
      const val = localStorage.getItem("user");
      if (val) {
        const parsedUser = JSON.parse(val);
        console.log("👤 Updated user in header:", parsedUser);
        console.log("🔍 Header - User firstName:", parsedUser?.firstName);
        console.log("🔍 Header - User lastName:", parsedUser?.lastName);
        console.log("🔍 Header - User avatar:", parsedUser?.avatar);
        console.log("🔍 Header - User avatarUrl:", parsedUser?.avatarUrl);
        setUser(parsedUser);
      } else {
        setUser(null);
      }
    };

    window.addEventListener("userChanged", onUserChanged);
    return () => {
      window.removeEventListener("userChanged", onUserChanged);
    };
  }, []);

  const handleResultSelect = (variant) => {
    setShowSearchResults(false);
    setSearchQuery("");
    if (variant === "mobile") {
      setShowMobileHeader(false);
      setMobileMenuOpen(false);
    }
  };

  const renderSearchResults = (variant = "desktop") => {
    if (!showSearchResults) return null;

    const containerClasses =
      variant === "desktop"
        ? "absolute top-full left-0 right-0 mt-3 bg-white border border-blue-200 rounded-2xl shadow-[0_25px_80px_rgba(13,110,253,0.25)] max-h-[40rem] overflow-hidden z-50"
        : "mt-3 bg-white border border-blue-200 rounded-2xl shadow-[0_25px_80px_rgba(13,110,253,0.25)] max-h-[40rem] overflow-hidden z-40";

    return (
      <div className={containerClasses}>
        {isSearching ? (
          <div className="p-3 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d6efd] mx-auto"></div>
            <p className="mt-2 text-sm">Đang tìm kiếm...</p>
          </div>
        ) : (
          <>
            {isGeminiSearching && (
              <div className="px-3 py-2 text-xs text-purple-600 flex items-center gap-2 bg-purple-50 border-b border-purple-100">
                <i className="bi bi-arrow-clockwise animate-spin" style={{ fontSize: '12px' }}></i>
              </div>
            )}
            {searchResults.departments.length > 0 ||
            searchResults.doctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 max-h-[35rem] overflow-hidden">
                {/* CHUYÊN KHOA */}
                {searchResults.departments.length > 0 && (
                  <div className="border-r border-gray-200 flex flex-col bg-gradient-to-b from-blue-50 to-white">
                    <div className="px-3 py-3 border-b border-blue-200 bg-white flex items-center gap-2 flex-shrink-0 sticky top-0 shadow-sm">
                      <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        Chuyên khoa
                      </span>
                      {searchSource === "ai" && (
                        <span className="ml-auto text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-semibold flex-shrink-0">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-blue-100 overflow-y-auto flex-1">
                      {searchResults.departments.map((dept) => {
                        const deptId =
                          dept.departmentId ?? dept.id ?? dept.department_id;
                        const deptName =
                          dept.departmentName || dept.name || "ChuyA�n khoa";
                        const deptDescription =
                          dept.description || dept.desc || "ChuyA�n khoa";
                        const deptImageUrl = getDepartmentImageUrl(dept);
                        return (
                          <Link
                            key={deptId || Math.random()}
                            to={`/specialty/${deptId}`}
                            onClick={() => handleResultSelect(variant)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-100 transition-all duration-200 group border-l-4 border-l-transparent hover:border-l-blue-500 active:bg-blue-200"
                          >
                            {deptImageUrl ? (
                              <img
                                src={deptImageUrl}
                                alt={deptName}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-blue-200 shadow-sm group-hover:shadow-md"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/images/placeholder-image.png";
                                }}
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#0d6efd] shadow-sm group-hover:shadow-md transition-shadow">
                                {getInitials(deptName || "CK")}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-gray-900 text-base leading-tight truncate group-hover:text-[#0056cc]">
                                {deptName}
                              </div>
                              <div className="text-sm text-gray-600 line-clamp-1 font-medium">
                                {dept.description || dept.desc || "Chuyên khoa"}
                              </div>
                            </div>
                            <i className="bi bi-arrow-right text-blue-400 group-hover:text-[#0056cc] flex-shrink-0 transition-all opacity-50 group-hover:opacity-100" style={{ fontSize: '20px' }}></i>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BÁC SĨ */}
                {searchResults.doctors.length > 0 && (
                  <div className="flex flex-col bg-gradient-to-b from-purple-50 to-white">
                    <div className="px-3 py-3 border-b border-purple-200 bg-white flex items-center gap-2 flex-shrink-0 sticky top-0 shadow-sm">
                      <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        Bác sĩ
                      </span>
                      {searchSource === "ai" && (
                        <span className="ml-auto text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-semibold flex-shrink-0">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-purple-100 overflow-y-auto flex-1">
                      {searchResults.doctors.map((doctor) => {
                        const doctorName = `${doctor.user?.firstName || ""} ${doctor.user?.lastName || ""}`.trim() || "BA�c s�c";
                        const departmentName =
                          doctor.department?.departmentName ||
                          doctor.department?.name ||
                          "BA�c s�c chuyA�n khoa";
                        const doctorAvatar = getDoctorAvatarUrl(doctor);
                        const departmentImage = getDepartmentImageUrl(doctor.department || {});

                        return (
                        <Link
                          key={doctor.doctorId}
                          to={`/patient/doctordetail/${doctor.doctorId}`}
                          onClick={() => handleResultSelect(variant)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-purple-100 transition-all duration-200 group border-l-4 border-l-transparent hover:border-l-purple-500 active:bg-purple-200"
                        >
                          <img
                            src={doctorAvatar}
                            alt={doctorName}
                            className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border-2 border-purple-300 group-hover:ring-2 group-hover:ring-[#a855f7] transition-all shadow-sm group-hover:shadow-md"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/images/default-doctor.png";
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-900 text-base leading-tight truncate group-hover:text-[#7c3aed]">
                              {doctorName}
                            </div>
                            <div className="text-sm text-gray-600 truncate font-medium flex items-center gap-2">
                              {departmentImage && (
                                <img
                                  src={departmentImage}
                                  alt={departmentName}
                                  className="w-6 h-6 rounded-md object-cover border border-purple-200"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              )}
                              <span className="truncate">{departmentName}</span>
                            </div>
                          </div>
                          <i className="bi bi-arrow-right text-purple-400 group-hover:text-[#7c3aed] flex-shrink-0 transition-all opacity-50 group-hover:opacity-100" style={{ fontSize: '20px' }}></i>
                        </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">Không tìm thấy kết quả phù hợp</p>
                <p className="text-xs mt-1">Thử tìm với từ khóa khác</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const menuItems = [
    { label: "Trang chủ", href: "/", icon: "bi-house" },
    { label: "Chuyên khoa", href: "/#specialties", icon: "bi-hospital" },
    { label: "Bài viết", href: "/articles", icon: "bi-file-text" },
    { label: "Đặt lịch", href: "/patient/book-appointment", icon: "bi-calendar-check" },
    { label: "Trợ lý y khoa", href: "/chatbot", icon: "bi-robot" },
  ];

  const userDropdownItems = [
    {
      label: "Lịch khám",
      href: "/patient/profile?tab=appointments",
      icon: "bi-calendar3",
    },
    { label: "Hồ sơ bệnh án", href: "/patient/profile?tab=medical-records", icon: "bi-clipboard" },
    { label: "Tài khoản", href: "/patient/profile?tab=profile", icon: "bi-person" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      {/* Top thin info bar */}
      <div className="bg-[#e9f6ff] border-b hidden sm:block">
        <div className="w-full px-2">
          <div className="max-w-full mx-auto flex h-9 items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-[#034ea2]">
              <a href="tel:0906545241" className="flex items-center gap-2">
                <i className="bi bi-telephone" style={{ fontSize: '16px' }}></i>
                <span className="font-medium">Hotline: 0906 545 241</span>
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button className="flex items-center gap-1 text-[#6b7280] hover:text-[#034ea2]">
                <i className="bi bi-globe" style={{ fontSize: '16px' }}></i>
                <span>VN</span>
              </button>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6b7280] hover:text-[#034ea2]"
                >
                  <i className="bi bi-facebook" style={{ fontSize: '16px' }}></i>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6b7280] hover:text-[#034ea2]"
                >
                  <i className="bi bi-twitter" style={{ fontSize: '16px' }}></i>
                </a>
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6b7280] hover:text-[#034ea2]"
                >
                  <i className="bi bi-instagram" style={{ fontSize: '16px' }}></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="w-full px-2 sm:px-4">
        <div className="max-w-full mx-auto flex items-center gap-2 sm:gap-4 md:gap-8 py-2 sm:py-4 md:py-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 min-w-0"
          >
            <div className="flex h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 items-center justify-center rounded-xl overflow-hidden bg-white p-1 flex-shrink-0">
              <img
                src="/images/logo.png"
                alt="ClinicBooking Logo"
                className="h-full w-full object-cover rounded-lg"
                onError={(e) => {
                  // Fallback to original design if logo fails to load
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML = `
                    <div class="flex h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 items-center justify-center rounded-xl bg-[#0d6efd] text-white">
                      <svg class="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                  `;
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-base md:text-xl font-bold text-[#0d6efd] whitespace-nowrap">
                ClinicBooking
              </div>
              <div className="hidden sm:block text-xs md:text-sm text-gray-500">
                Tìm bác sĩ, đặt lịch nhanh chóng
              </div>
            </div>
          </Link>

          {/* Center search - shorter with larger text */}
          <div className="flex-1 hidden sm:block min-w-0">
            <div className="relative max-w-xl mx-auto search-container">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '20px' }}></i>
              <input
                type="search"
                placeholder="Tìm bác sĩ, chuyên khoa..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full rounded-full border border-gray-200 bg-white py-3 pl-10 pr-4 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
              />

              {renderSearchResults("desktop")}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 ml-auto flex-shrink-0">
            <nav className="hidden lg:flex items-center gap-6">
              {menuItems.map((item) => {
                const handleClick = (e) => {
                  if (item.href.includes("#")) {
                    e.preventDefault();
                    const [path, anchor] = item.href.split("#");
                    navigate(path);
                    setTimeout(() => {
                      const element = document.getElementById(anchor);
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" });
                      }
                    }, 100);
                  }
                };

                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="text-base font-medium text-gray-700 hover:text-[#0d6efd]"
                    onClick={handleClick}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Messages Button */}
            <button
              onClick={handleMessagesClick}
              className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-[#0d6efd] hover:text-white text-gray-600 transition-all duration-200 group"
              title="Nhắn tin"
            >
              <i className="bi bi-chat-dots group-hover:scale-110 transition-transform duration-200" style={{ fontSize: '18px' }}></i>
              {messageUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center font-semibold">
                  {messageUnreadCount > 9 ? "9+" : messageUnreadCount}
                </span>
              )}
            </button>

            {/* Notifications Button */}
            <div className="relative notifications-dropdown">
              <button
                onClick={handleNotificationsClick}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-[#0d6efd] hover:text-white text-gray-600 transition-all duration-200 group"
                title="Thông báo"
              >
                <i className="bi bi-bell group-hover:scale-110 transition-transform duration-200" style={{ fontSize: '18px' }}></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Thông báo{" "}
                        {notifications.length > 0 &&
                          `(${notifications.length})`}
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-[#0d6efd] hover:underline"
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {(() => {
                      console.log(
                        "🎨 Rendering notifications, length:",
                        notifications.length
                      );
                      console.log("🎨 Notifications array:", notifications);
                      return null;
                    })()}
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p>Không có thông báo nào</p>
                        <p className="text-xs mt-2">
                          Debug: Array length = {notifications.length}
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.notificationId}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notification.isRead ? "bg-blue-50" : ""
                          }`}
                          onClick={() =>
                            markAsRead(notification.notificationId)
                          }
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${
                                notification.isRead
                                  ? "bg-gray-300"
                                  : "bg-[#0d6efd]"
                              }`}
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {notification.title}
                              </h4>
                              <p className="text-gray-600 text-sm mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(
                                  notification.createdAt
                                ).toLocaleString("vi-VN")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-4 border-t border-gray-200 text-center">
                      <button
                        className="text-sm text-[#0d6efd] hover:underline"
                        onClick={() => {
                          setShowNotifications(false);
                          navigate("/notifications");
                        }}
                      >
                        Xem tất cả thông báo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* If user is logged in show name + logout, otherwise show login button */}
            {user ? (
              <div className="hidden md:flex items-center gap-2 sm:gap-3">
                <div className="relative user-dropdown">
                  <button
                    className="text-base font-medium hover:underline flex items-center gap-1"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                  >
                    {user
                      ? user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || user.email || "User"
                      : "Đăng nhập"}
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserDropdown && (
                    <div
                      className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
                      onMouseEnter={() => setShowUserDropdown(true)}
                      onMouseLeave={() => setShowUserDropdown(false)}
                    >
                      {userDropdownItems.map((item, index) => (
                        <Link
                          key={index}
                          to={item.href}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <i className={`bi ${item.icon}`} style={{ fontSize: '18px' }}></i>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-2 text-base text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    try {
                      await axiosClient.post("/auth/logout", {
                        token: localStorage.getItem("token"),
                      });
                    } catch (e) {
                      // ignore
                    }
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.dispatchEvent(new Event("userChanged"));
                    navigate("/");
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-block rounded-md bg-[#0d6efd] px-4 py-2 text-base text-white"
              >
                Đăng nhập
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-1"
              onClick={() => {
                setShowMobileHeader(!showMobileHeader);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <i className="bi bi-x-lg text-gray-700" style={{ fontSize: '20px' }}></i>
              ) : (
                <i className="bi bi-list text-gray-700" style={{ fontSize: '20px' }}></i>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {showMobileHeader && (
          <div className="lg:hidden pb-3 animate-slideDown">
            <div className="max-w-full mx-auto px-2 relative w-full">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '16px' }}></i>
              <input
                type="search"
                placeholder="Tìm bác sĩ, chuyên khoa..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="pl-10 bg-gray-100 w-full rounded-md py-2 text-lg focus:outline-none focus:ring-2 focus:ring-[#cfe9ff]"
              />
              {renderSearchResults("mobile")}
            </div>
          </div>
        )}

        {/* Mobile Navigation */}
        {showMobileHeader && (
          <nav className="lg:hidden border-t py-2 max-w-full mx-auto px-2 animate-slideDown">
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column - General Navigation */}
              <div className="space-y-1">
                {menuItems
                  .filter(item => item.label !== "Chuyên khoa")
                  .map((item) => {
                    const handleClick = (e) => {
                      setMobileMenuOpen(false);
                      setShowMobileHeader(false);
                      if (item.href.includes("#")) {
                        e.preventDefault();
                        const [path, anchor] = item.href.split("#");
                        navigate(path);
                        setTimeout(() => {
                          const element = document.getElementById(anchor);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth" });
                          }
                        }, 100);
                      }
                    };

                    return (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#0d6efd] py-1.5"
                        onClick={handleClick}
                      >
                        <i className={`bi ${item.icon}`} style={{ fontSize: '16px' }}></i>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </div>

              {/* Right Column - Patient Section */}
              <div className="space-y-1">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1 px-1">
                      <i className="bi bi-person" style={{ fontSize: '16px' }}></i>
                      <span>{user.firstName || user.email}</span>
                    </div>
                    {userDropdownItems.map((item, index) => (
                      <Link
                        key={index}
                        to={item.href}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:text-[#0d6efd] hover:bg-gray-50 rounded-md transition-colors"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setShowMobileHeader(false);
                        }}
                      >
                        <i className={`bi ${item.icon}`} style={{ fontSize: '16px' }}></i>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                    <button
                      className="w-full inline-block rounded-md border border-red-200 bg-white px-2 py-1.5 text-sm text-red-600 text-center hover:bg-red-50 mt-1"
                      onClick={async () => {
                        try {
                          await axiosClient.post("/auth/logout", {
                            token: localStorage.getItem("token"),
                          });
                        } catch (e) {
                          // ignore
                        }
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        window.dispatchEvent(new Event("userChanged"));
                        navigate("/");
                        setMobileMenuOpen(false);
                        setShowMobileHeader(false);
                      }}
                    >
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="w-full inline-block rounded-md bg-[#0d6efd] px-2 py-1.5 text-sm text-white text-center"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowMobileHeader(false);
                    }}
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}


