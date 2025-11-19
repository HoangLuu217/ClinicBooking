import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendMessageToBot } from '../../api/chatApi';
import doctorApi from '../../api/doctorApi';
import { getFullAvatarUrl } from '../../utils/avatarUtils';

const STORAGE_KEYS = {
  messages: 'clinic_chat_messages',
  keywords: 'clinic_chat_keywords',
  department: 'clinic_chat_department',
  userName: 'clinic_chat_user_name'
};

const DOCTOR_REQUEST_PATTERNS = [
  'tim bac si',
  'tim bac sy',
  'xem bac si',
  'chon bac si',
  'dat bac si',
  'dat bac sy',
  'dat lich',
  'tim bac si giup'
];

const SAFETY_NOTICE = 'Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y khoa trực tiếp.';
const ALLOWED_LIKELIHOODS = ['common', 'possible', 'rare', 'rule_out'];

const LIKELIHOOD_LABELS = {
  common: 'Phổ biến',
  possible: 'Có thể',
  rare: 'Hiếm gặp',
  rule_out: 'Cần loại trừ'
};

// const LIKELIHOOD_COLORS = {
//   common: { bg: '#dcfce7', color: '#166534' },
//   possible: { bg: '#e0f2fe', color: '#075985' },
//   rare: { bg: '#fef3c7', color: '#92400e' },
//   rule_out: { bg: '#fee2e2', color: '#b91c1c' }
// };

const BOT_AVATAR = '/images/bot.gif';
const MOBILE_BREAKPOINT = 430;

const normalizeVietnamese = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');

const safeString = (value, fallback = '') => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
};

const ensureStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeString(item))
    .filter((item) => Boolean(item));
};

const ensurePossibleCauses = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((cause) => {
      const name = safeString(cause?.name);
      if (!name) return null;
      const likelihoodRaw = safeString(cause?.likelihood).toLowerCase();
      const likelihood = ALLOWED_LIKELIHOODS.includes(likelihoodRaw)
        ? likelihoodRaw
        : 'possible';
      return { name, likelihood };
    })
    .filter(Boolean);
};

const buildSchemaPayload = (rawPayload, fallbackInput = '') => {
  if (!rawPayload) return null;

  let source = rawPayload;
  if (typeof rawPayload === 'string') {
    try {
      source = JSON.parse(rawPayload);
    } catch (error) {
      console.warn('Failed to parse AI schema payload', error);
      return null;
    }
  }

  if (typeof source !== 'object' || Array.isArray(source) || source === null) {
    return null;
  }

  const recommended =
    typeof source.recommended_department === 'object' && source.recommended_department !== null
      ? source.recommended_department
      : {};

  const doctorQueryRaw =
    typeof source.doctor_query === 'object' && source.doctor_query !== null
      ? source.doctor_query
      : {};
  const filtersRaw =
    typeof doctorQueryRaw.filters === 'object' && doctorQueryRaw.filters !== null
      ? doctorQueryRaw.filters
      : {};

  const normalized = {
    input: safeString(source.input, fallbackInput),
    intents: ensureStringArray(source.intents),
    symptoms: ensureStringArray(source.symptoms),
    possibleCauses: ensurePossibleCauses(source.possible_causes),
    relatedConditions: ensureStringArray(source.related_conditions),
    redFlags: ensureStringArray(source.red_flags),
    selfCare: ensureStringArray(source.self_care),
    recommendedDepartment: {
      code: safeString(recommended.code),
      name: safeString(recommended.name || recommended.department || ''),
      confidence: Number(recommended.confidence) || 0,
      alternatives: Array.isArray(recommended.alternatives)
        ? recommended.alternatives
            .map((alt) => ({
              code: safeString(alt?.code),
              name: safeString(alt?.name)
            }))
            .filter((alt) => alt.code || alt.name)
        : []
    },
    doctorQuery: {
      departmentCode:
        safeString(doctorQueryRaw.department_code) || safeString(recommended.code),
      filters: {
        location: safeString(filtersRaw.location),
        ratingMin: Number(filtersRaw.rating_min) || 0
      }
    },
    messageToUserMarkdown:
      safeString(source.message_to_user_markdown) ||
      safeString(source.message_to_user) ||
      '',
    nextQuestions: ensureStringArray(source.next_questions),
    safetyNotice: SAFETY_NOTICE
  };

  if (!normalized.messageToUserMarkdown && normalized.symptoms.length > 0) {
    normalized.messageToUserMarkdown = `Mình ghi nhận các triệu chứng: ${normalized.symptoms.join(', ')}.`;
  }

  if (normalized.symptoms.length > 0 && normalized.redFlags.length > 0) {
    const redFlagSet = new Set(
      normalized.redFlags.map((flag) => normalizeVietnamese(flag || ''))
    );
    normalized.symptoms = normalized.symptoms.filter(
      (symptom) => !redFlagSet.has(normalizeVietnamese(symptom || ''))
    );
  }

  return normalized;
};

const escapeHtml = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatMarkdownText = (value) => {
  const escaped = escapeHtml(value || '');
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const bulletPattern = /(^|\n)\*\s+([^\n]+)/g;
  const withBullets = withBold.replace(
    bulletPattern,
    (match, prefix, item) => `${prefix}&bull; ${item.trim()}`
  );
  return withBullets.replace(/\n/g, '<br/>');
};

const createMessage = (text, sender = 'bot', extra = {}) => {
  const { rawText, animate, ...rest } = extra;
  return {
    text,
    sender,
    timestamp: new Date().toISOString(),
    rawText: rawText ?? text,
    animate: animate ?? sender === 'bot',
    ...rest
  };
};

const createMarkdownMessage = (markdownText, sender = 'bot') =>
  createMessage(formatMarkdownText(markdownText || ''), sender, {
    isMarkdown: true,
    rawText: markdownText || '',
    animate: true
  });

const stripBasicHtml = (value = '') =>
  value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const sanitizeStoredMessages = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    animate: false,
    rawText:
      typeof item.rawText === 'string'
        ? item.rawText
        : item.isMarkdown
        ? stripBasicHtml(item.text || '')
        : item.text || ''
  }));
};

const TypewriterMessage = ({ msg, isMobile }) => {
  const source = msg.rawText || '';
  const [visibleText, setVisibleText] = useState(msg.animate ? '' : source);
  const [isDone, setIsDone] = useState(!msg.animate);

  useEffect(() => {
    if (!msg.animate || !source) {
      setVisibleText(source);
      setIsDone(true);
      return;
    }

    setVisibleText('');
    setIsDone(false);
    let index = 0;
    const baseSpeed = Math.max(5, Math.min(15, 500 / Math.max(source.length, 1)));
    const interval = setInterval(() => {
      index += 1;
      setVisibleText(source.slice(0, index));
      if (index >= source.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, baseSpeed);

    return () => clearInterval(interval);
  }, [source, msg.animate, msg.timestamp]);

  if (msg.isMarkdown) {
    const htmlContent = isDone ? msg.text : formatMarkdownText(visibleText);
    return (
      <div
        style={styles.message(msg.sender, msg.isError, isMobile)}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  const finalText = isDone ? msg.text : visibleText;
  return <div style={styles.message(msg.sender, msg.isError, isMobile)}>{finalText}</div>;
};

const buildHistoryPayload = (historyMessages = []) => {
  if (!Array.isArray(historyMessages)) return [];
  return historyMessages
    .filter((msg) => !msg.type)
    .slice(-6)
    .map((msg) => {
      const baseText = safeString(msg.rawText) ||
        (msg.isMarkdown ? stripBasicHtml(msg.text) : safeString(msg.text));
      if (!baseText) {
        return null;
      }
      return {
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: baseText
      };
    })
    .filter(Boolean);
};

const buildInsightMarkdown = (payload) => {
  if (!payload) return '';

  const parts = [];
  const joinList = (items, prefix = '**', suffix = '**') =>
    items.length > 0 ? `${prefix}${items.join(', ')}${suffix}` : '';
  const bulletList = (items) => items.map((item) => `- ${item}`).join('\n');

  if (payload.symptoms.length > 0) {
    parts.push(`**Triệu chứng chính:** ${payload.symptoms.join(', ')}`);
  }

  if (payload.possibleCauses.length > 0) {
    const causes = payload.possibleCauses
      .map((cause) => `${cause.name} (${LIKELIHOOD_LABELS[cause.likelihood] || cause.likelihood})`)
      .join(', ');
    parts.push(`**Nguyên nhân có thể:** ${causes}`);
  }

  if (payload.relatedConditions.length > 0) {
    parts.push(`**Bệnh liên quan:** ${payload.relatedConditions.join(', ')}`);
  }

  if (payload.redFlags.length > 0) {
    parts.push(`**Bạn cần đi khám ngay nếu:**\n${bulletList(payload.redFlags)}`);
  }

  if (payload.selfCare.length > 0) {
    parts.push(`**Gợi ý tự chăm sóc:**\n${bulletList(payload.selfCare)}`);
  }

  if (payload.recommendedDepartment?.name || payload.recommendedDepartment?.code) {
    const { name, code, confidence } = payload.recommendedDepartment;
    const percent =
      typeof confidence === 'number' ? ` (độ tin cậy ${Math.round(confidence * 100)}%)` : '';
      parts.push(
        `**Khoa gợi ý:** ${name || 'Chưa xác định'}${percent}`
      );
      
    if (Array.isArray(payload.recommendedDepartment.alternatives) && payload.recommendedDepartment.alternatives.length > 0) {
      parts.push(
        `**Phương án khác:** ${payload.recommendedDepartment.alternatives
          .map((alt) => alt.name || alt.code)
          .filter(Boolean)
          .join(', ')}`
      );
    } 
  }

  // if (payload.nextQuestions.length > 0) {
  //   parts.push(`**Câu hỏi tiếp theo:**\n${bulletList(payload.nextQuestions)}`);
  // }

  // Thêm safety notice ở cuối mỗi phản hồi
  if (payload.safetyNotice) {
    parts.push(`*${payload.safetyNotice}*`);
  }

  if (parts.length === 0) return '';
  return `${parts.join('\n\n')}`;
};

const loadFromStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse localStorage item', key, error);
    return fallback;
  }
};

const getUserId = () => {
  if (typeof window === 'undefined') return 'guest';
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'guest';
    const profile = JSON.parse(raw);
    return profile.id || profile.userId || profile.user?.id || 'guest';
  } catch (error) {
    console.warn('Failed to parse user ID', error);
    return 'guest';
  }
};

const getStorageKeys = () => {
  const userId = getUserId();
  return {
    messages: `clinic_chat_messages_${userId}`,
    keywords: `clinic_chat_keywords_${userId}`,
    department: `clinic_chat_department_${userId}`,
    userName: `clinic_chat_user_name_${userId}`
  };
};

const ChatBot = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [userId, setUserId] = useState(() => getUserId());
  const storageKeys = React.useMemo(() => getStorageKeys(), [userId]);

  const createGreetingMessage = (name) => {
    if (name) {
      const text = `Chào ${name}, mình là trợ lý y khoa của Clinic Booking. Mình có thể giúp bạn tìm bác sĩ, phòng khám hoặc tư vấn triệu chứng. Bạn đang gặp vấn đề gì về sức khỏe không?`;
      return createMessage(text, 'bot', { rawText: text });
    }
    const text =
      'Xin chào! Mình là trợ lý y khoa của Clinic Booking. Bạn vui lòng cho mình biết tên để mình tiện hỗ trợ và xưng hô nhé.';
    return createMessage(text, 'bot', { rawText: text });
  };

  const getNameFromUserProfile = () => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return '';
      const profile = JSON.parse(raw);
      const candidates = [
        profile.fullName,
        `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        profile.name,
        profile.user?.fullName,
        `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim()
      ];
      return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
    } catch (error) {
      console.warn('Failed to parse stored user profile', error);
      return '';
    }
  };

  const resolveInitialUserName = () => {
    const cached = loadFromStorage(storageKeys.userName, '');
    if (cached) return cached;
    return getNameFromUserProfile();
  };

  const initialUserName = resolveInitialUserName();

  const [messages, setMessages] = useState(() => {
    const stored = loadFromStorage(storageKeys.messages, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return sanitizeStoredMessages(stored);
    }
    return [createGreetingMessage(initialUserName)];
  });

  const [symptomKeywords, setSymptomKeywords] = useState(() =>
    loadFromStorage(storageKeys.keywords, [])
  );

  const [lastDepartment, setLastDepartment] = useState(() =>
    loadFromStorage(storageKeys.department, null)
  );

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSendHovered, setIsSendHovered] = useState(false);
  const [userName, setUserName] = useState(initialUserName);
  const [awaitingName, setAwaitingName] = useState(() => !initialUserName);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(storageKeys.messages, JSON.stringify(messages));
  }, [messages, storageKeys.messages]);

  useEffect(() => {
    localStorage.setItem(storageKeys.keywords, JSON.stringify(symptomKeywords));
  }, [symptomKeywords, storageKeys.keywords]);

  useEffect(() => {
    if (lastDepartment) {
      localStorage.setItem(storageKeys.department, JSON.stringify(lastDepartment));
    } else {
      localStorage.removeItem(storageKeys.department);
    }
  }, [lastDepartment, storageKeys.department]);

  useEffect(() => {
    if (userName) {
      localStorage.setItem(storageKeys.userName, JSON.stringify(userName));
    } else {
      localStorage.removeItem(storageKeys.userName);
    }
  }, [userName, storageKeys.userName]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theo dõi sự thay đổi của user ID và reload dữ liệu khi đổi tài khoản
  useEffect(() => {
    const checkUserChange = () => {
      const currentUserId = getUserId();
      if (currentUserId !== userId) {
        // Reload dữ liệu với user mới trước khi cập nhật userId
        const newUserId = currentUserId;
        const newStorageKeys = {
          messages: `clinic_chat_messages_${newUserId}`,
          keywords: `clinic_chat_keywords_${newUserId}`,
          department: `clinic_chat_department_${newUserId}`,
          userName: `clinic_chat_user_name_${newUserId}`
        };
        
        const storedMessages = loadFromStorage(newStorageKeys.messages, null);
        const storedKeywords = loadFromStorage(newStorageKeys.keywords, []);
        const storedDepartment = loadFromStorage(newStorageKeys.department, null);
        const storedUserName = loadFromStorage(newStorageKeys.userName, '');
        
        if (storedMessages && Array.isArray(storedMessages) && storedMessages.length > 0) {
          setMessages(sanitizeStoredMessages(storedMessages));
        } else {
          const profileName = getNameFromUserProfile();
          setMessages([createGreetingMessage(profileName)]);
        }
        
        setSymptomKeywords(storedKeywords);
        setLastDepartment(storedDepartment);
        setUserName(storedUserName || getNameFromUserProfile());
        setAwaitingName(!storedUserName && !getNameFromUserProfile());
        
        // Cập nhật userId sau khi đã load dữ liệu
        setUserId(newUserId);
      }
    };

    // Kiểm tra ngay lập tức
    checkUserChange();

    // Lắng nghe sự thay đổi trong localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === null) {
        checkUserChange();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Kiểm tra định kỳ (mỗi 1 giây) để phát hiện thay đổi trong cùng tab
    const interval = setInterval(checkUserChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [userId]);

  const mergeSymptomKeywords = (candidates = []) => {
    const sanitized = candidates.map((item) => safeString(item)).filter(Boolean);
    if (sanitized.length === 0) return;

    setSymptomKeywords((prev) => {
      const next = [...prev];
      sanitized.forEach((item) => {
        if (!next.includes(item)) {
          next.push(item);
        }
      });
      return next.slice(-20);
    });
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const pushMessages = (newMessages) => {
    setMessages((prev) => [...prev, ...(Array.isArray(newMessages) ? newMessages : [newMessages])]);
  };

  const extractDoctorName = (text) => {
    const normalized = normalizeVietnamese(text);
    const patterns = [
      /tim\s+bac\s+si\s+(.+?)(?:\s+giup|\s+cho|\s+minh|$)/i,
      /tim\s+bac\s+sy\s+(.+?)(?:\s+giup|\s+cho|\s+minh|$)/i,
      /bac\s+si\s+(.+?)(?:\s+giup|\s+cho|\s+minh|$)/i,
      /bac\s+sy\s+(.+?)(?:\s+giup|\s+cho|\s+minh|$)/i,
      /tim\s+(.+?)\s+bac\s+si/i,
      /tim\s+(.+?)\s+bac\s+sy/i,
      /cho\s+toi\s+biet\s+ve\s+bac\s+si\s+(.+)/i,
      /thong\s+tin\s+bac\s+si\s+(.+)/i
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        // Loại bỏ các từ không cần thiết ở cuối
        name = name.replace(/\s+(giup|cho|minh|toi|ban|di|nhe|khong|co|duoc)$/i, '').trim();
        if (name.length > 0 && name.length < 50) {
          return name;
        }
      }
    }

    return null;
  };

  const handleDoctorSearchByName = async (doctorName) => {
    if (!doctorName || doctorName.trim().length === 0) {
      pushMessages(
        createMessage(
          'Bạn vui lòng cung cấp tên bác sĩ để mình tìm kiếm nhé. Ví dụ: "tìm bác sĩ Nguyễn Văn A" hoặc "bác sĩ Trần Thị B".'
        )
      );
      return;
    }

    try {
      const response = await doctorApi.searchDoctors(doctorName);
      const doctors = Array.isArray(response?.data) ? response.data : [];

      if (doctors.length === 0) {
        pushMessages(
          createMessage(
            `Mình không tìm thấy bác sĩ nào với tên "${doctorName}". Bạn có thể thử tìm với tên khác hoặc mô tả triệu chứng để mình gợi ý bác sĩ phù hợp nhé.`
          )
        );
        return;
      }

      pushMessages({
        text: '',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'doctors',
        doctors,
        departmentName: null
      });
    } catch (error) {
      console.error('Failed to search doctors by name', error);
      pushMessages(
        createMessage(
          'Xin lỗi, mình chưa tra được danh sách bác sĩ lúc này. Bạn thử lại sau hoặc liên hệ hotline: 0775660817 (Lưu) giúp mình nhé.'
        )
      );
    }
  };

  const handleDoctorRequest = async () => {
    if (!lastDepartment) {
      pushMessages(
        createMessage(
          'Mình chưa ghi nhận khoa phù hợp. Bạn có thể mô tả rõ triệu chứng (ví dụ đau ở đâu, kéo dài bao lâu) để mình tư vấn chính xác hơn nhé.'
        )
      );
      return;
    }

    const summaryText =
      symptomKeywords.length > 0
        ? `Dựa trên triệu chứng bạn cung cấp (${symptomKeywords.join(
            ', '
          )}), khoa phù hợp nhất là ${lastDepartment.name}.`
        : `Khoa phù hợp nhất hiện tại là ${lastDepartment.name}.`;

    pushMessages(createMessage(summaryText));

    if (!lastDepartment.id) {
      pushMessages(
        createMessage(
          'Hiện mình chưa có mã khoa cụ thể để tra cứu bác sĩ. Bạn giúp mình mô tả chi tiết hơn để hệ thống xác nhận nhé.'
        )
      );
      return;
    }

    try {
      const response = await doctorApi.getDoctorsByDepartment(lastDepartment.id);
      const doctors = Array.isArray(response?.data) ? response.data : [];

      if (doctors.length === 0) {
        pushMessages(
          createMessage(
            `Hiện tại chưa có bác sĩ nào thuộc khoa ${lastDepartment.name}. Bạn có thể chọn khoa khác hoặc để lại thông tin để được liên hệ sau nhé.`
          )
        );
        return;
      }

      pushMessages({
        text: '',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'doctors',
        doctors,
        departmentName: lastDepartment.name
      });
    } catch (error) {
      console.error('Failed to fetch doctors', error);
      pushMessages(
        createMessage(
          'Xin lỗi, mình chưa tra được danh sách bác sĩ lúc này. Bạn thử lại sau hoặc liên hệ hotline: 0775660817 (Lưu) giúp mình nhé.'
        )
      );
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const sanitized = inputMessage.trim();
    const normalizedInput = normalizeVietnamese(sanitized);
    const userMessage = createMessage(sanitized, 'user', { rawText: sanitized });
    const historyPayload = buildHistoryPayload([...messages, userMessage]);

    pushMessages(userMessage);
    setInputMessage('');

    if (awaitingName) {
      const safeName = sanitized.replace(/\s+/g, ' ').trim() || 'bạn';
      setUserName(safeName);
      setAwaitingName(false);
      pushMessages(createGreetingMessage(safeName));
      return;
    }

    setIsLoading(true);

    // Kiểm tra tìm bác sĩ theo tên trước
    const doctorName = extractDoctorName(sanitized);
    if (doctorName) {
      await handleDoctorSearchByName(doctorName);
      setIsLoading(false);
      return;
    }

    const userWantsDoctors = DOCTOR_REQUEST_PATTERNS.some((pattern) =>
      normalizedInput.includes(pattern)
    );

    if (userWantsDoctors) {
      await handleDoctorRequest();
      setIsLoading(false);
      return;
    }

    try {
      const reply = await sendMessageToBot({
        message: sanitized,
        keywords: symptomKeywords,
        history: historyPayload
      });
      const botPayload = [];
      const structured = buildSchemaPayload(reply?.schemaPayload || reply?.response, sanitized);

      if (structured) {
        mergeSymptomKeywords(structured.symptoms);
        const insightText = buildInsightMarkdown(structured);
        const combinedMessage = [structured.messageToUserMarkdown, insightText]
          .filter(Boolean)
          .join('\n\n');
        if (combinedMessage) {
          botPayload.push(createMarkdownMessage(combinedMessage));
        }
      }

      if (botPayload.length === 0) {
        const fallbackText =
          reply?.response ||
          'Xin lỗi, hiện tại mình chưa thể phản hồi. Bạn vui lòng thử lại trong giây lát nhé.';
        botPayload.push(createMessage(fallbackText, 'bot', { rawText: fallbackText }));
      }

      if (reply?.needsMoreInfo && reply?.followUpQuestion) {
        botPayload.push(createMessage(reply.followUpQuestion, 'bot', { rawText: reply.followUpQuestion }));
      }

      if (reply?.department) {
        setLastDepartment(reply.department);
      }

      const doctors = Array.isArray(reply?.doctors) ? reply.doctors : [];
      const departmentName = reply?.department?.name;
      const departmentReason = reply?.department?.reason;

      if (!reply?.needsMoreInfo && doctors.length > 0) {
        const doctorIntro = `Mình đã tìm thấy ${doctors.length} bác sĩ phù hợp${
          departmentName ? ` cho khoa ${departmentName}` : ''
        }:`;
        botPayload.push(createMessage(doctorIntro, 'bot', { rawText: doctorIntro }));
        botPayload.push({
          text: '',
          sender: 'bot',
          timestamp: new Date().toISOString(),
          type: 'doctors',
          doctors,
          departmentName
        });
      }

      pushMessages(botPayload);
    } catch (error) {
      console.error('Error sending message:', error);
      const fallbackError = error.message || 'Đã có lỗi xảy ra, bạn vui lòng thử lại sau.';
      pushMessages(
        createMessage(fallbackError, 'bot', {
          isError: true,
          rawText: fallbackError
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleBookDoctor = (doctorId) => {
    if (doctorId) {
      window.location.href = `/patient/booking/${doctorId}`;
    } else {
      navigate('/doctors');
    }
  };

  const goHome = () => {
    navigate('/');
  };

  const handleBrandKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goHome();
    }
  };

  const resetConversation = () => {
    const profileName = getNameFromUserProfile();
    const greeting = createGreetingMessage(profileName);
    setMessages([greeting]);
    setSymptomKeywords([]);
    setLastDepartment(null);
    setUserName(profileName);
    setAwaitingName(!profileName);
    setInputMessage('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKeys.messages);
      localStorage.removeItem(storageKeys.keywords);
      localStorage.removeItem(storageKeys.department);
      if (profileName) {
        localStorage.setItem(storageKeys.userName, JSON.stringify(profileName));
      } else {
        localStorage.removeItem(storageKeys.userName);
      }
    }
    setIsResetModalOpen(false);
  };

  const openResetModal = () => setIsResetModalOpen(true);
  const closeResetModal = () => setIsResetModalOpen(false);

  const DoctorTable = ({ doctors, departmentName }) => {
    if (!doctors || doctors.length === 0) {
      return null;
    }

    const buildDoctorAvatar = (doctor, fallbackName) => {
      const safeName =
        fallbackName && fallbackName.trim().length > 0 ? fallbackName : 'Doctor';
      const potentialSources = [
        doctor.avatarUrl,
        doctor.avatarPath,
        doctor.avatar,
        doctor.user?.avatarUrl,
        doctor.user?.avatarPath,
        doctor.user?.avatar && `/api/files/avatar/${doctor.user.avatar}`
      ].filter(Boolean);

      for (const source of potentialSources) {
        const fullUrl = getFullAvatarUrl(source);
        if (fullUrl) {
          return fullUrl;
        }
      }

      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        safeName
      )}&background=2563EB&color=fff`;
    };

    const normalizeDoctor = (doctor) => {
      const doctorId = doctor.id || doctor.doctorId;
      const fullName =
        doctor.fullName ||
        `${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim() ||
        'Bác Sĩ';
      const dept =
        doctor.departmentName ||
        doctor.department?.departmentName ||
        departmentName ||
        'Đa khoa';
      const rating =
        Number(
          doctor.rating ??
            doctor.avgRating ??
            doctor.averageRating ??
            doctor.averageScore ??
            0
        ) || 0;
      const avatar = buildDoctorAvatar(doctor, fullName);

      return {
        ...doctor,
        doctorId,
        fullName,
        departmentLabel: dept,
        specialty: doctor.specialty || 'Chuyên Khoa Tổng Quát',
        rating,
        avatar,
        degree: doctor.degree || doctor.user?.degree || 'Bác Sĩ',
        experience: doctor.workExperience || '',
        hospital: doctor.user?.address || ''
      };
    };



    const sortedDoctors = doctors
      .map(normalizeDoctor)
      .sort((a, b) => b.rating - a.rating || a.fullName.localeCompare(b.fullName))
      .slice(0, 5);

    const topDoctor = sortedDoctors[0];
    const suggestionDoctors = sortedDoctors.slice(1);

    const renderDoctorCard = (doctor, variant = 'primary', idx = 0) => (
      <div
        key={`${doctor.doctorId || doctor.fullName}-${idx}`}
        style={
          variant === 'primary' ? styles.primaryDoctorCard : styles.suggestionCard
        }
      >
        <div style={styles.doctorCardHead}>
          <img src={doctor.avatar} alt={doctor.fullName} style={styles.avatar} />
          <div style={{ flex: 1 }}>
            <div style={styles.doctorName}>{doctor.fullName}</div>
            <div style={styles.doctorDegree}>
              {doctor.degree}
              {doctor.experience ? ` • ${doctor.experience}` : ''}
            </div>
          </div>
          {doctor.rating > 0 && (
            <div style={styles.ratingBadge}>
              ⭐ {doctor.rating.toFixed(1)}
            </div>
          )}
        </div>
        <div style={styles.tagGroup}>
          {doctor.specialty && <span style={styles.tag}>{doctor.specialty}</span>}
          {doctor.departmentLabel && (
            <span style={styles.tag}>{doctor.departmentLabel}</span>
          )}
        </div>
        <button
          style={styles.cardButton}
          onClick={() => handleBookDoctor(doctor.doctorId)}
        >
          Đặt lịch với bác sĩ
        </button>
      </div>
    );

    return (
      <div style={styles.tableWrapper}>
        <div style={styles.tableIntro}>
          {departmentName ? (
            <>
              <div style={styles.tableIntroTitle}>
                Mình tìm thấy một vài kết quả cho khoa {departmentName}.
              </div>
              <div style={styles.tableIntroSub}>
                Bác sĩ phù hợp nhất ở bên dưới, bạn có muốn đặt lịch ngay không?
              </div>
            </>
          ) : (
            <>
              <div style={styles.tableIntroTitle}>
                Đây là những bác sĩ nổi bật phù hợp với triệu chứng của bạn.
              </div>
              <div style={styles.tableIntroSub}>
                Hãy chọn bác sĩ mong muốn hoặc nói thêm nhu cầu cụ thể nhé.
              </div>
            </>
          )}
        </div>

        {renderDoctorCard(topDoctor, 'primary')}

        {suggestionDoctors.length > 0 && (
          <>
            <div style={styles.suggestionTitle}>Bác sĩ gợi ý thêm:</div>
            <div style={styles.suggestionList}>
              {suggestionDoctors.map((doctor, idx) =>
                renderDoctorCard(doctor, 'secondary', idx)
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
        <div style={{ ...styles.topBar, ...(isMobile ? styles.topBarMobile : {}) }}>
          <div
            style={{ ...styles.brandGroup, ...(isMobile ? styles.brandGroupMobile : {}) }}
            onClick={goHome}
            role="button"
            tabIndex={0}
            onKeyDown={handleBrandKeyDown}
          >
            <img src="/images/logo.png" alt="Clinic Booking" style={styles.brandImage} />
            <div style={{ ...styles.brandText, ...(isMobile ? styles.brandTextMobile : {}) }}>
              <span style={styles.brandName}>CLINIC BOOKING</span>
              <span style={styles.brandDivider}>/</span>
              <span style={styles.brandHelper}>Trợ lý y khoa</span>
            </div>
            <span style={styles.verifiedDot}>✓</span>
          </div>
          <button
            style={{ ...styles.resetButton, ...(isMobile ? styles.resetButtonMobile : {}) }}
            onClick={openResetModal}
          >
            Bắt đầu mới
          </button>
        </div>
        <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
          {lastDepartment?.name && (
            <div style={styles.subHeader}>
              <div style={styles.subHint}>
                Gợi ý hiện tại: <strong>{lastDepartment.name}</strong>
              </div>
            </div>
          )}

          <div style={{ ...styles.chatContainer, ...(isMobile ? styles.chatContainerMobile : {}) }}>
            {messages.map((msg, index) => (
              <div key={index} style={styles.messageWrapper(msg.sender, isMobile)}>
                {msg.sender === 'bot' && (
                  <img
                    src={BOT_AVATAR}
                    alt="AI trợ lý"
                    style={{ ...styles.botAvatar, ...(isMobile ? styles.botAvatarMobile : {}) }}
                  />
                )}
                <div
                  style={{
                    maxWidth: isMobile ? '100%' : '70%'
                  }}
                >
                  {msg.type === 'doctors' ? (
                    <DoctorTable doctors={msg.doctors} departmentName={msg.departmentName} />
                  ) : msg.animate && msg.sender === 'bot' ? (
                    <>
                      <TypewriterMessage msg={msg} isMobile={isMobile} />
                      <div style={styles.timestamp}>{formatTime(msg.timestamp)}</div>
                    </>
                  ) : (
                    <>
                      {msg.isMarkdown ? (
                        <div
                          style={styles.message(msg.sender, msg.isError, isMobile)}
                          dangerouslySetInnerHTML={{ __html: msg.text }}
                        />
                      ) : (
                        <div style={styles.message(msg.sender, msg.isError, isMobile)}>
                          {msg.text}
                        </div>
                      )}
                      <div style={styles.timestamp}>{formatTime(msg.timestamp)}</div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={styles.loadingIndicator}>
                <div style={styles.loadingBubble}>Bot đang trả lời…</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            style={{ ...styles.inputContainer, ...(isMobile ? styles.inputContainerMobile : {}) }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Nhập triệu chứng hoặc câu hỏi của bạn..."
              style={{
                ...styles.input,
                ...(isMobile ? styles.inputMobile : {}),
                ...(isInputFocused ? styles.inputFocus : {})
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              onMouseEnter={() => setIsSendHovered(true)}
              onMouseLeave={() => setIsSendHovered(false)}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                ...styles.sendButton,
                ...(isMobile ? styles.sendButtonMobile : {}),
                ...(isSendHovered && inputMessage.trim() && !isLoading ? styles.sendButtonHover : {}),
                ...(!inputMessage.trim() || isLoading ? styles.sendButtonDisabled : {})
              }}
            >
              {isLoading ? 'Đang gửi...' : 'Gửi'}
            </button>
          </div>
        </div>

        {isResetModalOpen && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <div style={styles.modalTitle}>Bắt đầu cuộc trò chuyện mới?</div>
              <p style={styles.modalText}>
                Toàn bộ lịch sử tin nhắn hiện tại sẽ bị xóa. Bạn có chắc muốn làm mới trợ lý y khoa?
              </p>
              <div style={styles.modalActions}>
                <button style={styles.modalCancel} onClick={closeResetModal}>
                  Hủy
                </button>
                <button style={styles.modalConfirm} onClick={resetConversation}>
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column'
  },
  pageMobile: {
    minHeight: '100dvh'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    boxShadow: '0 4px 12px rgba(15,23,42,0.04)'
  },
  topBarMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px 16px'
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer'
  },
  brandGroupMobile: {
    width: '100%',
    justifyContent: 'space-between'
  },
  brandImage: {
    width: '48px',
    height: '48px',
    objectFit: 'cover',
    borderRadius: '50%',
    backgroundColor: '#e0f2fe',
    padding: '6px'
  },
  brandText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    color: '#1e293b',
    fontWeight: '600'
  },
  brandTextMobile: {
    fontSize: '16px',
    flexWrap: 'wrap'
  },
  brandName: {
    color: '#2563eb',
    letterSpacing: '0.5px'
  },
  brandDivider: {
    color: '#cbd5f5'
  },
  brandHelper: {
    color: '#0f172a'
  },
  verifiedDot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '700'
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    maxWidth: '720px',
    margin: '0 auto',
    width: '100%',
    padding: '12px 20px 16px',
    minHeight: 0
  },
  containerMobile: {
    padding: '8px 16px 12px'
  },
  subHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '12px'
  },
  subTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937'
  },
  subHint: {
    fontSize: '14px',
    color: '#4b5563'
  },
  resetButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.2s',
    boxShadow: '0 8px 16px rgba(37,99,235,0.3)'
  },
  resetButtonMobile: {
    width: '100%',
    textAlign: 'center'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    padding: '16px'
  },
  modalCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 20px 50px rgba(15,23,42,0.2)',
    textAlign: 'center'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '12px'
  },
  modalText: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.5,
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px'
  },
  modalCancel: {
    padding: '10px 18px',
    borderRadius: '999px',
    border: '1px solid #cbd5f5',
    backgroundColor: '#fff',
    color: '#475569',
    fontWeight: '600',
    cursor: 'pointer'
  },
  modalConfirm: {
    padding: '10px 22px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(37,99,235,0.35)'
  },
  chatContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0 96px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'transparent',
    minHeight: 0
  },
  chatContainerMobile: {
    padding: '12px 0 88px',
    gap: '12px'
  },
  messageWrapper: (sender, isMobile = false) => ({
    display: 'flex',
    alignItems: 'flex-start',
    width: '100%',
    gap: isMobile ? '8px' : '12px',
    justifyContent: sender === 'user' ? 'flex-end' : 'flex-start'
  }),
  botAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginRight: '12px',
    boxShadow: '0 4px 10px rgba(15,23,42,0.12)'
  },
  botAvatarMobile: {
    width: '32px',
    height: '32px',
    marginRight: '8px'
  },
  message: (sender, isError, isMobile = false) => ({
    padding: '16px 20px',
    borderRadius: '20px',
    backgroundColor: sender === 'user' ? '#2563eb' : isError ? '#fee2e2' : '#f8fafc',
    color: sender === 'user' ? '#fff' : isError ? '#b91c1c' : '#1f2937',
    boxShadow: sender === 'user' ? '0 6px 16px rgba(37,99,235,0.25)' : '0 6px 16px rgba(15,23,42,0.08)',
    fontSize: '16px',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
    ...(isMobile ? { padding: '14px 16px', fontSize: '15px' } : {})
  }),
  timestamp: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
    textAlign: 'right'
  },
  loadingIndicator: {
    display: 'flex',
    justifyContent: 'flex-start'
  },
  loadingBubble: {
    backgroundColor: '#e2e8f0',
    padding: '10px 16px',
    borderRadius: '16px',
    color: '#475569',
    fontStyle: 'italic'
  },
  inputContainer: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    padding: '12px 0 16px',
    gap: '10px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 40%)',
    backdropFilter: 'blur(4px)',
    zIndex: 15
  },
  inputContainerMobile: {
    padding: '10px 0 12px'
  },
  input: {
    flex: 1,
    padding: '16px 20px',
    borderRadius: '30px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  inputMobile: {
    padding: '14px 16px',
    fontSize: '15px'
  },
  inputFocus: {
    borderColor: '#2563eb',
    boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.15)'
  },
  sendButton: {
    padding: '12px 24px',
    borderRadius: '24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    minWidth: '80px'
  },
  sendButtonMobile: {
    padding: '12px 16px',
    minWidth: '64px'
  },
  sendButtonHover: {
    backgroundColor: '#1e40af',
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)'
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5f5',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  tableWrapper: {
    marginTop: '12px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
    padding: '20px'
  },
  tableIntro: {
    marginBottom: '16px'
  },
  tableIntroTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#0f172a'
  },
  tableIntroSub: {
    marginTop: '4px',
    fontSize: '14px',
    color: '#475569'
  },
  primaryDoctorCard: {
    border: '1px solid #bfdbfe',
    borderRadius: '16px',
    padding: '16px',
    background: 'linear-gradient(135deg, #eff6ff, #ffffff)',
    boxShadow: '0 10px 25px rgba(37,99,235,0.12)',
    marginBottom: '18px'
  },
  suggestionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '10px'
  },
  suggestionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  suggestionCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '14px',
    backgroundColor: '#f8fafc'
  },
  doctorCardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    objectFit: 'cover',
    backgroundColor: '#e0e7ff'
  },
  doctorName: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#0f172a'
  },
  doctorDegree: {
    fontSize: '13px',
    color: '#475569'
  },
  ratingBadge: {
    backgroundColor: '#fde68a',
    color: '#92400e',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: '600'
  },
  doctorMeta: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#475569'
  },
  tagGroup: {
    marginTop: '12px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  tag: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '600'
  },
  cardButton: {
    marginTop: '14px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default ChatBot;
