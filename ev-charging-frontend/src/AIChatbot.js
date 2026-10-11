import { useRef, useState } from 'react';
import api from './services/api';

const ROLE_CONFIG = {
  ADMIN: {
    title: 'EV Platform Admin Assistant',
    placeholder: 'Ask about users, managers, stations, chargers, bookings, or analytics...',
  },
  MANAGER: {
    title: 'Station Manager Assistant',
    placeholder: 'Ask about your station, chargers, bookings, slots, or reports...',
  },
  USER: {
    title: 'EV Charging Assistant',
    placeholder: 'Ask about stations, chargers, bookings, waitlist, or notifications...',
  },
};

function getStoredRole() {
  const role =
    localStorage.getItem('role') ||
    localStorage.getItem('userRole') ||
    'USER';

  return role.replace('ROLE_', '').toUpperCase();
}

function requiresConfirmation(text) {
  if (!text) return false;

  return (
    /confirmation is required/i.test(text) ||
    /confirm.*(booking|cancel|delete|remove|maintenance|manager|charger|status)/i.test(text)
  );
}

function indicatesOtpRequired(text) {
  if (!text) return false;

  return (
    /\bOTP\b/i.test(text) &&
    /(sent|enter|verification|verify)/i.test(text)
  );
}

function ChatIcon({ name, size = 16, stroke = 'currentColor', strokeWidth = 2 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      display: 'inline-block',
      flexShrink: 0,
      verticalAlign: 'middle'
    }
  };

  switch (name) {
    case 'assistant':
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="13" rx="4" />
          <path d="M8 6V4" />
          <path d="M16 6V4" />
          <path d="M9 12h.01" />
          <path d="M15 12h.01" />
          <path d="M9 16h6" />
        </svg>
      );

    case 'booking':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 9h16" />
          <path d="M8 13h3" />
          <path d="M8 16h5" />
        </svg>
      );

    case 'charger':
      return (
        <svg {...common}>
          <path d="M13 2 6 13h5l-1 9 8-12h-5l0-8z" />
        </svg>
      );

    case 'station':
      return (
        <svg {...common}>
          <path d="M12 21s7-6.2 7-12A7 7 0 0 0 5 9c0 5.8 7 12 7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 9h16" />
        </svg>
      );

    case 'notification':
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case 'warning':
      return (
        <svg {...common}>
          <path d="M12 3 2.5 20h19L12 3z" />
          <path d="M12 9v5" />
          <path d="M12 17h.01" />
        </svg>
      );

    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <circle cx="12" cy="15" r="1" />
        </svg>
      );

    case 'success':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );

    case 'close':
      return (
        <svg {...common}>
          <path d="m7 7 10 10" />
          <path d="m17 7-10 10" />
        </svg>
      );

    case 'message':
      return (
        <svg {...common}>
          <path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H11l-5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          <path d="M7 10h10" />
          <path d="M7 14h6" />
        </svg>
      );

    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 5h16l2 10v4H2v-4L4 5z" />
          <path d="M2 15h5l2 2h6l2-2h5" />
        </svg>
      );

    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}
function parseBookingSuccess(text) {
  if (!text || !/BOOKED/i.test(text)) return null;

  const match = text.match(
    /bookingId=(\d+).*?chargerNumber=([^,}]+).*?stationName=([^,}]+).*?durationMinutes=(\d+).*?startTime=([^,}]+).*?endTime=([^,}]+)/
  );

  if (!match) return null;

  return {
    bookingId: match[1],
    chargerNumber: match[2],
    stationName: match[3],
    durationMinutes: match[4],
    startTime: match[5],
    endTime: match[6],
  };
}

function parseStructuredResponse(text) {
  if (!text) return null;

  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed);

    if (parsed && typeof parsed === 'object' && parsed.status) {
      return parsed;
    }
  } catch (error) {
    // Normal assistant text is not JSON.
  }

  return null;
}

function parseBookingsResponse(text) {
  if (!text) {
    return null;
  }

  const lower = text.toLowerCase();

  const looksLikeBookingHistory =
    /your bookings are as follows|here are your bookings|your bookings|booking history|bookings:/i.test(text) &&
    /\d+\.\s/.test(text);

  if (!looksLikeBookingHistory) {
    return null;
  }

  const cleaned = text
    .replace(/\r/g, '')
    .trim();

  const entries = cleaned
    .split(/\s+(?=\d+\.\s)/)
    .filter((entry) => /^\d+\.\s/.test(entry));

  const bookings = [];

  entries.forEach((entry) => {
    const numberMatch = entry.match(/^(\d+)\.\s*/);

    if (!numberMatch) {
      return;
    }

    const stationMatch = entry.match(
      /(?:at|booking at)\s+(.+?)\s+with\s+charger\s+([^\s]+)\s+from\s+(\d{4}-\d{2}-\d{2}T[\d:.]+)(?:\s+to\s+(\d{4}-\d{2}-\d{2}T[\d:.]+))?/i
    );

    if (stationMatch) {
      const station = stationMatch[1].trim();
      const charger = stationMatch[2].trim();
      const startTime = stationMatch[3].trim();
      const endTime = stationMatch[4] ? stationMatch[4].trim() : '';

      let status = '';

      if (/cancelled/i.test(entry)) {
        status = 'CANCELLED';
      } else if (/completed/i.test(entry)) {
        status = 'COMPLETED';
      } else if (/active|scheduled|booked/i.test(entry)) {
        status = 'ACTIVE';
      }

      let duration = '';

      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          duration = Math.round((end - start) / 60000).toString();
        }
      }

      bookings.push({
        number: numberMatch[1],
        bookingId: Number((entry.match(/Booking ID:\s*(\d+)/i) || [])[1] || numberMatch[1]) || null,
        station,
        charger,
        startTime,
        endTime,
        duration,
        battery: '',
        status
      });

      return;
    }

    const olderFormat = entry.match(
      /(?:at|booking at)\s+(.+?)\s+on\s+(\d{4}-\d{2}-\d{2}T[\d:.]+).*?(?:for\s+(\d+)\s+minutes)?/i
    );

    if (olderFormat) {
      const station = olderFormat[1].trim();
      const startTime = olderFormat[2].trim();
      const duration = olderFormat[3] || '';

      let status = '';

      if (/cancelled/i.test(entry)) {
        status = 'CANCELLED';
      } else if (/completed/i.test(entry)) {
        status = 'COMPLETED';
      } else {
        status = 'ACTIVE';
      }

      let endTime = '';

      if (duration) {
        const start = new Date(startTime);

        if (!Number.isNaN(start.getTime())) {
          const end = new Date(
            start.getTime() + parseInt(duration, 10) * 60000
          );

          endTime = end.toISOString().replace('Z', '');
        }
      }

      bookings.push({
        number: numberMatch[1],
        bookingId: Number((entry.match(/Booking ID:\s*(\d+)/i) || [])[1] || numberMatch[1]) || null,
        station,
        charger: '',
        startTime,
        endTime,
        duration,
        battery: '',
        status
      });
    }
  });

  return bookings.length > 0 ? bookings : null;
}
function getBookingStatusStyle(status) {
  switch (status) {
    case 'ACTIVE':
      return {
        icon: 'check',
        background: '#ecfdf5',
        border: '#10b981',
        text: '#065f46'
      };

    case 'COMPLETED':
      return {
        icon: 'success',
        background: '#eff6ff',
        border: '#3b82f6',
        text: '#1e40af'
      };

    case 'CANCELLED':
      return {
        icon: 'check',
        background: '#fef2f2',
        border: '#ef4444',
        text: '#991b1b'
      };

    default:
      return {
        icon: 'notification',
        background: '#f9fafb',
        border: '#9ca3af',
        text: '#374151'
      };
  }
}

function renderBookingsResponse(bookings, isMaximized = false) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMaximized ? 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' : 'minmax(0, 1fr)',
        gap: '10px',
        width: '100%',
        minWidth: 0,
        alignItems: 'stretch'
      }}
    >
      <div
        style={{
          fontWeight: '700',
          fontSize: '15px',
          color: '#111827',
          marginBottom: '2px',
          gridColumn: '1 / -1'
        }}
      >
        <ChatIcon name='booking' size={16} stroke='#111827' /> Your Bookings
      </div>

      {bookings.map((booking) => {
        const statusStyle = getBookingStatusStyle(booking.status);

        return (
          <div
            key={`${booking.number}-${booking.startTime}`}
            style={{
              background: statusStyle.background,
              border: `1px solid ${statusStyle.border}`,
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '9px'
              }}
            >
              <div
                style={{
                  fontWeight: '700',
                  fontSize: '14px',
                  color: '#111827'
                }}
              >
                <ChatIcon name='booking' size={14} stroke='#111827' /> Booking #{booking.bookingId}
              </div>

              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: statusStyle.text,
                  background: '#ffffff',
                  padding: '4px 7px',
                  borderRadius: '999px',
                  border: `1px solid ${statusStyle.border}`,
                  whiteSpace: 'nowrap'
                }}
              >
                <ChatIcon name={statusStyle.icon} size={12} stroke={statusStyle.text} /> {booking.status}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12.5px',
                color: '#374151'
              }}
            >
              <div>
                <ChatIcon name='station' size={14} stroke='#64748b' /> <strong>Station:</strong> {booking.station}
              </div>

              <div>
                <ChatIcon name='clock' size={14} stroke='#64748b' /> <strong>Start:</strong> {booking.startTime}
              </div>

              {booking.endTime && (
                <div>
                  <ChatIcon name='calendar' size={14} stroke='#64748b' /> <strong>End:</strong> {booking.endTime}
                </div>
              )}

              {booking.duration && (
                <div>
                  <ChatIcon name='clock' size={14} stroke='#64748b' /> <strong>Duration:</strong> {booking.duration} minutes
                </div>
              )}

              {booking.battery && (
                <div>
                  <ChatIcon name='notification' size={16} stroke='currentColor' /> <strong>Battery:</strong> {booking.battery}%
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function parseNotificationsResponse(text) {
  if (!text) return null;

  const looksLikeNotifications =
    /your notifications are as follows|your notifications|notifications:/i.test(text) &&
    /\d+\.\s/.test(text);

  if (!looksLikeNotifications) {
    return null;
  }

  const cleaned = text
    .replace(/\r/g, '')
    .trim();

  const entries = cleaned
    .split(/\s+(?=\d+\.\s)/)
    .filter((entry) => /^\d+\.\s/.test(entry));

  const notifications = [];

  entries.forEach((entry) => {
    const numberMatch = entry.match(/^(\d+)\.\s*/);

    if (!numberMatch) {
      return;
    }

    const body = entry.replace(/^\d+\.\s*/, '').trim();

    const metaMatch = body.match(
      /Type:\s*(.*?)\s*\|\s*Time:\s*(.*?)\s*\|\s*Read:\s*(true|false)\s*$/i
    );

    let content = body;
    let type = 'GENERAL';
    let createdAt = '';
    let isRead = true;

    if (metaMatch) {
      type = metaMatch[1].trim();
      createdAt = metaMatch[2].trim();
      isRead = metaMatch[3].toLowerCase() === 'true';

      content = body
        .replace(metaMatch[0], '')
        .trim();
    }

    const lines = content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return;
    }

    const title = lines[0];
    const message = lines.slice(1).join(' ');

    notifications.push({
      number: numberMatch[1],
      title,
      message,
      type,
      createdAt,
      isRead
    });
  });

  return notifications.length > 0 ? notifications : null;
}

function getNotificationStyle(type, isRead) {
  const normalized = String(type || '').toUpperCase();

  if (normalized.includes('CONFIRMED')) {
    return {
      icon: 'notification',
      background: '#ecfdf5',
      border: '#10b981',
      text: '#065f46',
      badge: 'BOOKING'
    };
  }

  if (normalized.includes('COMPLETED')) {
    return {
      icon: 'check',
      background: '#eff6ff',
      border: '#3b82f6',
      text: '#1e40af',
      badge: 'COMPLETED'
    };
  }

  if (normalized.includes('CANCEL')) {
    return {
      icon: 'close',
      background: '#fef2f2',
      border: '#ef4444',
      text: '#991b1b',
      badge: 'CANCELLED'
    };
  }

  if (!isRead) {
    return {
      icon: 'check',
      background: '#fffbeb',
      border: '#f59e0b',
      text: '#92400e',
      badge: 'NEW'
    };
  }

  return {
    icon: 'check',
    background: '#f8fafc',
    border: '#94a3b8',
    text: '#334155',
    badge: 'GENERAL'
  };
}

function formatVisualDate(value) {
  if (!value) return '';

  return String(value)
    .replace('T', ' ');
}

function renderNotificationsResponse(notifications) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '800',
          fontSize: '15px',
          color: '#111827',
          paddingBottom: '2px'
        }}
      >
        <span style={{ fontSize: '18px' }}><ChatIcon name='notification' size={16} stroke='currentColor' /></span>
        <span>Your Notifications</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            fontWeight: '700',
            background: '#e5e7eb',
            color: '#374151',
            padding: '3px 8px',
            borderRadius: '999px'
          }}
        >
          {notifications.length}
        </span>
      </div>

      {notifications.map((notification) => {
        const style = getNotificationStyle(
          notification.type,
          notification.isRead
        );

        return (
          <div
            key={`${notification.number}-${notification.createdAt}`}
            style={{
              background: style.background,
              border: `1px solid ${style.border}`,
              borderRadius: '13px',
              padding: '11px 12px',
              boxSizing: 'border-box',
              width: '100%'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px'
              }}
            >
              <span style={{ fontSize: '17px' }}>
                <ChatIcon name={style.icon} size={17} stroke={style.text} />
              </span>

              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontWeight: '800',
                  color: style.text,
                  fontSize: '13px'
                }}
              >
                {notification.title}
              </span>

              <span
                style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  color: style.text,
                  border: `1px solid ${style.border}`,
                  padding: '3px 6px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap'
                }}
              >
                {notification.isRead ? style.badge : 'NEW'}
              </span>
            </div>

            {notification.message && (
              <div
                style={{
                  color: '#374151',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  marginBottom: notification.createdAt ? '7px' : '0'
                }}
              >
                {notification.message}
              </div>
            )}

            {notification.createdAt && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#6b7280',
                  fontSize: '10px'
                }}
              >
                <span><ChatIcon name='notification' size={16} stroke='currentColor' /></span>
                <span>
                  {formatVisualDate(notification.createdAt)}
                </span>

                <span
                  style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {notification.isRead ? (
                    <>
                      <ChatIcon
                        name="check"
                        size={12}
                        stroke="#64748b"
                      />
                      <span>Read</span>
                    </>
                  ) : (
                    <>
                      <ChatIcon
                        name="bell"
                        size={12}
                        stroke="#d97706"
                      />
                      <span>Unread</span>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderEmptyResponse(title, message, icon = 'inbox') {
  return (
    <div
      style={{
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        padding: '15px',
        boxSizing: 'border-box',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '7px' }}>
        <ChatIcon name={icon} size={28} stroke='#64748b' />
      </div>

      <div
        style={{
          fontWeight: '800',
          fontSize: '14px',
          color: '#111827',
          marginBottom: '4px'
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: '#6b7280',
          fontSize: '12px',
          lineHeight: '1.5'
        }}
      >
        {message}
      </div>
    </div>
  );
}

function renderInlineMarkdown(text) {
  const parts = String(text ?? '').split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} style={{
          background: '#f3f4f6',
          padding: '1px 4px',
          borderRadius: '4px'
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}
function renderRichTextResponse(text) {
  if (!text) {
    return renderEmptyResponse(
      'No response',
      'The assistant did not return any information.',
      'inbox'
    );
  }

  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !/^[-*_]{3,}$/.test(line));

  const content = [];

  lines.forEach((line, index) => {
    const isBullet =
    /^[-*]\s+/.test(line);

    const isNumbered =
      /^\d+[.)]\s+/.test(line);

    const isMarkdownHeading = /^#{1,6}\s+/.test(line);

    const isHeading =
      isMarkdownHeading ||
      (/:$/.test(line) &&
        line.length < 80 &&
        !isNumbered);

    if (isHeading) {
      content.push(
        <div
          key={`heading-${index}`}
          style={{
            fontWeight: '800',
            color: '#111827',
            fontSize: '14px',
            marginTop: index === 0 ? '0' : '8px',
            marginBottom: '4px'
          }}
        >
          {renderInlineMarkdown(line.replace(/^#{1,6}\s+/, ''))}
        </div>
      );

      return;
    }

    content.push(
      <div
        key={`line-${index}`}
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
          padding: '5px 0',
          color: '#374151',
          fontSize: '13px',
          lineHeight: '1.5'
        }}
      >
        {(isBullet || isNumbered) && (
          <span
            style={{
              color: '#16a34a',
              fontWeight: '800',
              flexShrink: 0
            }}
          >
              {isNumbered ? line.match(/^\d+[.)]/)?.[0] : '\u2022'}
          </span>
        )}

        <span>
              {renderInlineMarkdown(line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, ''))}
        </span>
      </div>
    );
  });

  return (
    <div
      style={{
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        padding: '13px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingBottom: '7px',
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '4px'
        }}
      >
        <span style={{ fontSize: '17px' }}><ChatIcon name='notification' size={16} stroke='currentColor' /></span>

        <span
          style={{
            fontWeight: '800',
            fontSize: '14px',
            color: '#111827'
          }}
        >
          EV Assistant
        </span>
      </div>

      <div>{content}</div>
    </div>
  );
}
function parseManagerVisualData(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // Prefer JSON responses whenever the backend supplies JSON.
  try {
    const parsed = JSON.parse(trimmed);

    if (!Array.isArray(parsed) && parsed && typeof parsed === 'object') {
      if (parsed.name && (parsed.address || parsed.city)) {
        return { kind: 'station', data: parsed };
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];

      if (first && first.chargerNumber) {
        return { kind: 'chargers', data: parsed };
      }

      if (first && first.userName) {
        return { kind: 'bookings', data: parsed };
      }

      if (first && first.name && ('latitude' in first || 'managerName' in first || 'totalChargers' in first)) {
        return { kind: 'stations', data: parsed };
      }

      if (first && first.name && ('email' in first || 'role' in first || 'vehicleNumber' in first)) {
        const managers = parsed.some(item => String(item.role || '').toUpperCase() === 'MANAGER');
        return { kind: managers ? 'managers' : 'users', data: parsed };
      }
    }
  } catch (error) {
    // Continue to parse Java-style record/map responses below.
  }

  // Parse Java record lists such as UserResponse[id=7, name=..., role=USER].
  const recordMatches = [...trimmed.matchAll(/UserResponse\[([^\]]*)\]/g)];
  if (recordMatches.length) {
    const records = recordMatches.map(match => {
      const item = {};
      const fieldPattern = /(\w+)=([\s\S]*?)(?=,\s*\w+=|$)/g;
      let field;
      while ((field = fieldPattern.exec(match[1])) !== null) {
        let value = field[2].trim();
        if (value === 'null') value = '';
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        item[field[1]] = value;
      }
      return item;
    });

    const managers = records.some(item => String(item.role || '').toUpperCase() === 'MANAGER');
    return { kind: managers ? 'managers' : 'users', data: records };
  }

  // Parse Java Map booking responses without changing the existing booking flow.
  if (trimmed.startsWith('[') && trimmed.includes('userName=')) {
    const entries = [...trimmed.matchAll(/\{([^{}]+)\}/g)];
    const bookings = entries.map(entry => {
      const item = {};
      for (const field of entry[1].matchAll(/(\w+)=([^,}]+)/g)) {
        item[field[1]] = field[2].trim();
      }
      return item;
    }).filter(item => item.userName || item.stationName);

    if (bookings.length) return { kind: 'bookings', data: bookings };
  }

  return null;
}
function renderManagerVisualData(result) {
  const card = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '9px',
    boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0
  };

  const heading = {
    fontSize: '14px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '8px'
  };

  const label = {
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '2px'
  };

  const value = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#1e293b',
    overflowWrap: 'anywhere'
  };

  const badge = (text, positive) => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 800,
    background: positive ? '#dcfce7' : '#f1f5f9',
    color: positive ? '#166534' : '#475569'
  });

  const field = (name, content) => (
    <div key={name} style={{ minWidth: 0 }}>
      <div style={label}>{name}</div>
       <div style={value}>{content ?? 'N/A'}</div>
    </div>
  );

  if (result.kind === 'station') {
    const station = result.data;

    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <div style={{ ...card, borderTop: '3px solid #16a34a' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
            MANAGED STATION
          </div>
          <div style={{ ...heading, fontSize: '17px' }}>
            {station.name}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
            {station.address}{station.city ? `, ${station.city}` : ''}
          </div>
          <span style={badge(station.isActive, !!station.isActive)}>
            {station.isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '12px',
            marginTop: '14px'
          }}>
            {field('Total chargers', station.totalChargers)}
            {field('Available slots', station.availableSlots)}
            {field('Total slots', station.totalSlots)}
            {field('Station ID', station.id)}
          </div>
        </div>
      </div>
    );
  }

  if (result.kind === 'users' || result.kind === 'managers') {
    const people = result.data;
    const isManagerList = result.kind === 'managers';
    const accent = isManagerList ? '#7c3aed' : '#0284c7';

    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <div style={{ ...heading, marginBottom: '10px' }}>
          {isManagerList ? 'Manager Directory' : 'User Directory'} ({people.length})
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: '10px'
        }}>
          {people.map((person, index) => (
            <div key={person.id ?? index} style={{
              ...card,
              marginBottom: 0,
              borderTop: `3px solid ${accent}`,
              background: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{
                  width: '38px', height: '38px', flexShrink: 0, borderRadius: '12px',
                  display: 'grid', placeItems: 'center', color: accent,
                  background: isManagerList ? '#ede9fe' : '#e0f2fe',
                  fontSize: '15px', fontWeight: 900
                }}>
                  {String(person.name || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...heading, marginBottom: '3px', overflowWrap: 'anywhere' }}>
                    {person.name || 'Unnamed'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                     ID: {person.id ?? 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span style={badge(person.isActive !== false, person.isActive !== false)}>
                  {person.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                </span>
                <span style={{
                  ...badge(true, true),
                  background: isManagerList ? '#ede9fe' : '#e0f2fe',
                  color: accent
                }}>
                  {person.role || (isManagerList ? 'MANAGER' : 'USER')}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '9px' }}>
                {field('Email', person.email || 'Not provided')}
                {field('Phone', person.phone || 'Not provided')}
                {!isManagerList && field('Vehicle', person.vehicleNumber || 'Not provided')}
                {field('City', person.city || 'Not provided')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result.kind === 'stations') {
    const stations = result.data;
    const activeCount = stations.filter(station => station.isActive === true).length;

    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <div style={{ ...heading, marginBottom: '10px' }}>
           Charging Network <span style={{ color: '#16a34a' }}>Ã‚Â· {stations.length} stations</span>
        </div>
        <div style={{
          ...card,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '10px',
          background: '#f8fafc'
        }}>
          <div>
            <div style={label}>Total stations</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>{stations.length}</div>
          </div>
          <div>
            <div style={label}>Active stations</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803d' }}>{activeCount}</div>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '10px'
        }}>
          {stations.map((station, index) => (
            <div key={station.id ?? index} style={{ ...card, marginBottom: 0, borderTop: '3px solid #16a34a' }}>
              <div style={{ ...heading, fontSize: '14px' }}>{station.name || `Station ${index + 1}`}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', overflowWrap: 'anywhere' }}>
                {station.address || 'Address not provided'}{station.city ? `, ${station.city}` : ''}
              </div>
              <span style={badge(station.isActive, station.isActive === true)}>
                {station.isActive === true ? 'ACTIVE' : station.isActive === false ? 'INACTIVE' : 'UNKNOWN'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '12px' }}>
                {field('Station ID', station.id)}
                {field('Chargers', station.totalChargers)}
                {field('Manager', station.managerName || 'Unassigned')}
                {field('Available slots', station.availableSlots)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (result.kind === 'chargers') {
    const chargers = result.data;

    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <div style={{ ...heading, marginBottom: '10px' }}>
           <span style={{ color: '#16a34a' }}>Ã¢Å¡Â¡ </span>
          Station Chargers ({chargers.length})
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))',
          gap: '10px',
          alignItems: 'stretch',
          width: '100%',
          minWidth: 0
        }}>
        {chargers.map((charger, index) => (
          <div key={charger.id ?? index} style={{ ...card, marginBottom: 0, height: "100%" }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '10px'
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={heading}>{charger.chargerNumber || `Charger ${index + 1}`}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '5px', marginBottom: '5px' }}>
                  <strong>Station:</strong> {charger.stationName || (charger.station && charger.station.name) || 'Station name unavailable'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {charger.chargerType || 'Standard'} charger
                </div>
              </div>
              <span style={badge(
                String(charger.status).toUpperCase() === 'ACTIVE',
                String(charger.status).toUpperCase() === 'ACTIVE'
              )}>
                {charger.status || 'UNKNOWN'}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px'
            }}>
               {field('Power output', `${charger.powerOutput ?? 'N/A'} kW`)}
              {field('Total slots', charger.totalSlots ?? charger.slots?.length ?? 0)}
            </div>
          </div>
        ))}
        </div>
      </div>
    );
  }

  if (result.kind === 'bookings') {
    const bookings = result.data;

    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <div style={{ ...heading, marginBottom: '10px' }}>
          Station Bookings ({bookings.length})
        </div>
        {bookings.map((booking, index) => {
          const status = String(booking.status || 'UNKNOWN').toUpperCase();
          const positive = status === 'COMPLETED' || status === 'ACTIVE';

          return (
            <div key={booking.id ?? index} style={card}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '10px'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={heading}>
                    Booking #{booking.id ?? index + 1}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', overflowWrap: 'anywhere' }}>
                    {booking.userName || 'Customer'}
                  </div>
                </div>
                <span style={badge(status, positive)}>{status}</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '10px'
              }}>
                {field('Charger', booking.chargerNumber)}
                {field('Type', booking.chargerType)}
                {field('Duration', booking.durationMinutes != null ? `${booking.durationMinutes} min` : 'N/A')}
                {field('Battery at booking', booking.batteryPercentage != null ? `${booking.batteryPercentage}%` : 'N/A')}
                {field('Start time', booking.startTime)}
                {field('End time', booking.endTime)}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: '14px' }}>
        {trendsLoading && (
          <div style={{
            padding: '12px',
            color: '#64748b',
            fontSize: '12px',
            background: '#f8fafc',
            borderRadius: '10px'
          }}>
            Loading booking and energy trends...
          </div>
        )}

        {!trendsLoading && trendsError && (
          <div style={{
            padding: '12px',
            color: '#991b1b',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            fontSize: '12px'
          }}>
            <div>{trendsError}</div>
            <button
              type="button"
              onClick={onRetryTrends}
              style={{
                marginTop: '8px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #dc2626',
                background: '#ffffff',
                color: '#991b1b',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!trendsLoading && !trendsError && trends && renderBookingTrends(trends)}
      </div>    </div>
    );
  }

  return null;
}
function renderAnalyticsResponse(data, isMaximized = false, trends = null, trendsLoading = false, trendsError = "", onRetryTrends = null) {
  const metrics = [
    { key: 'totalUsers', label: 'Total Users', color: '#2563eb', bg: '#eff6ff', icon: 'ðŸ‘¥' },
    { key: 'totalStations', label: 'Total Stations', color: '#7c3aed', bg: '#f5f3ff', icon: 'ðŸ“' },
    { key: 'totalBookings', label: 'Total Bookings', color: '#0891b2', bg: '#ecfeff', icon: 'ðŸ“…' },
    { key: 'todayBookings', label: "Today's Bookings", color: '#ea580c', bg: '#fff7ed', icon: 'âš¡' },
    { key: 'totalChargers', label: 'Total Chargers', color: '#16a34a', bg: '#f0fdf4', icon: 'ðŸ”Œ' },
    { key: 'availableSlots', label: 'Available Slots', color: '#0d9488', bg: '#f0fdfa', icon: 'ðŸ…¿ï¸' },
    { key: 'managers', label: 'Managers', color: '#9333ea', bg: '#faf5ff', icon: 'ðŸ§‘â€ðŸ’¼' },
    { key: 'weeklyEnergyKwh', label: 'Weekly Energy', color: '#ca8a04', bg: '#fefce8', icon: 'ðŸ”‹', suffix: ' kWh' }
  ];

  const present = metrics.filter(item =>
    Object.prototype.hasOwnProperty.call(data, item.key)
  );

  if (!present.length) return null;

  return (
    <div style={{
      width: '100%',
      boxSizing: 'border-box',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '14px',
      color: '#0f172a'
    }}>
      <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>
        System Analytics
      </div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
        EV charging network overview
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
        gap: '12px',
        width: '100%',
        minWidth: 0
      }}>
        {present.map(item => (
          <div key={item.key} style={{
            minWidth: 0,
            padding: '16px',
            background: `linear-gradient(135deg, ${item.bg} 0%, #ffffff 100%)`,
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${item.color}`,
            borderRadius: '12px',
            boxSizing: 'border-box',
            boxShadow: '0 3px 10px rgba(15, 23, 42, 0.05)',
            transition: 'box-shadow 0.2s ease'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: 1.4
              }}>
                {item.label}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: item.bg,
                fontSize: '18px'
              }}>
                {item.icon}
              </div>
            </div>
            <div style={{
              color: item.color,
              fontSize: 'clamp(24px, 2vw, 30px)',
              lineHeight: 1.2,
              fontWeight: 800,
              overflowWrap: 'anywhere',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {typeof data[item.key] === 'number'
                ? data[item.key].toLocaleString()
                : String(data[item.key] ?? 'N/A')}{item.suffix || ''}
            </div>
          </div>
        ))}
      </div>
    </div>

  );
}


function renderBookingTrends(data) {
  if (!Array.isArray(data?.daily) || data.daily.length === 0) {
    return null;
  }

  const daily = data.daily;
  const maxBookings = Math.max(
    1,
    ...daily.map(item => Number(item.bookings) || 0)
  );
  const maxEnergy = Math.max(
    1,
    ...daily.map(item => Number(item.energyKwh) || 0)
  );

  const chartCard = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px',
    minWidth: 0,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
  };

  const labelForDate = date => {
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? date
      : parsed.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short'
        });
  };

  const renderBarChart = (title, field, maximum, color, unit = '') => (
    <div style={chartCard}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '18px'
      }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 800,
          color: '#0f172a'
        }}>
          {title}
        </div>
        <span style={{
          fontSize: '11px',
          color: '#64748b',
          background: '#f1f5f9',
          padding: '5px 9px',
          borderRadius: '20px'
        }}>
          Last {daily.length} days
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))`,
        gap: 'clamp(4px, 1.5vw, 14px)',
        alignItems: 'stretch'
      }}>
        {daily.map((item, index) => {
          const value = Math.max(0, Number(item[field]) || 0);
          const height = value > 0
            ? Math.max(5, (value / maximum) * 140)
            : 0;

          return (
            <div
              key={`${item.date || 'day'}-${index}`}
              title={`${labelForDate(item.date)}: ${value}${unit ? ` ${unit}` : ''}`}
              style={{
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div style={{
                fontSize: 'clamp(10px, 1.2vw, 12px)',
                fontWeight: 800,
                color: '#334155',
                marginBottom: '8px',
                textAlign: 'center',
                overflowWrap: 'anywhere'
              }}>
                {value.toLocaleString('en-IN')}{unit ? ` ${unit}` : ''}
              </div>

              <div style={{
                width: '100%',
                maxWidth: '52px',
                height: '150px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                borderBottom: '1px solid #cbd5e1',
                backgroundImage:
                  'linear-gradient(to top, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '100% 25%'
              }}>
                <div style={{
                  width: 'min(72%, 32px)',
                  height: `${height}px`,
                  minHeight: value > 0 ? '5px' : '0',
                  background: color,
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.25s ease'
                }} />
              </div>

              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginTop: '9px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}>
                {labelForDate(item.date)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '16px',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      marginTop: '14px'
    }}>
      {renderBarChart(
        '7-Day Booking Activity',
        'bookings',
        maxBookings,
        '#2563eb'
      )}

      {renderBarChart(
        'Daily Estimated Energy',
        'energyKwh',
        maxEnergy,
        '#16a34a',
        'kWh'
      )}

      <div style={{
        gridColumn: '1 / -1',
        color: '#64748b',
        fontSize: '11px',
        lineHeight: 1.6,
        padding: '0 2px'
      }}>
        Energy is estimated from charger power and booking duration,
        grouped by booking creation date. These are not measured meter readings.
      </div>
    </div>
  );
}

function parseTextAnalyticsMetrics(text) {
  if (!text) return null;

  const normalized = text.replace(/\*\*/g, '').replace(/`/g, '');

  const patterns = [
    ['totalUsers', /(?:Total\s+Registered\s+Users|Registered\s+Users|Total\s+Users)\s*:\s*([\d,]+)/i],
    ['totalStations', /(?:Total\s+Charging\s+Stations|Charging\s+Stations|Total\s+Stations)\s*:\s*([\d,]+)/i],
    ['totalBookings', /(?:Total\s+Bookings(?:\s+Recorded)?)\s*:\s*([\d,]+)/i],
    ['todayBookings', /(?:Today's|Todayâ€™s|Bookings\s+Today)\s+Bookings\s*:\s*([\d,]+)/i],
    ['totalChargers', /(?:Total\s+Charging\s+Units|Total\s+Chargers|Charging\s+Units)\s*:\s*([\d,]+)/i],
    ['availableSlots', /(?:Available\s+Charging\s+Slots|Available\s+Slots)\s*:\s*([\d,]+)/i],
    ['managers', /(?:Station\s+Managers|Total\s+Managers|Managers)\s*:\s*([\d,]+)/i],
    ['weeklyEnergyKwh', /(?:Weekly\s+Energy(?:\s+Delivered)?|Energy\s+This\s+Week)\s*:\s*([\d,.]+)\s*kWh/i]
  ];

  const result = {};
  for (const [key, pattern] of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(value)) result[key] = value;
    }
  }

  return Object.keys(result).length >= 2 ? result : null;
}
function renderAssistantMessage(text, isMaximized = false, analyticsProps = {}) {
  const analyticsText = (text || '').trim();
  if (analyticsText.startsWith('{') && analyticsText.endsWith('}')) {
    try {
      const analyticsData = JSON.parse(analyticsText);
      const analyticsCard = renderAnalyticsResponse(
        analyticsData,
        isMaximized,
        analyticsProps.trends,
        analyticsProps.trendsLoading,
        analyticsProps.trendsError,
        analyticsProps.onRetryTrends
      );
      if (analyticsCard) return analyticsCard;
    } catch (error) {
      // Continue with the existing response renderers.
    }
  }

  const textAnalyticsData = parseTextAnalyticsMetrics(text);
  if (textAnalyticsData) {
    const analyticsCard = renderAnalyticsResponse(
      textAnalyticsData,
      isMaximized,
      analyticsProps.trends,
      analyticsProps.trendsLoading,
      analyticsProps.trendsError,
      analyticsProps.onRetryTrends
    );

    if (analyticsCard) {
      return (
        <div style={{ width: '100%', display: 'grid', gap: '12px' }}>
          {analyticsCard}
          {renderRichTextResponse(text)}
        </div>
      );
    }
  }

  const managerVisual = parseManagerVisualData(text);
  if (managerVisual) return renderManagerVisualData(managerVisual);
  const bookings = parseBookingsResponse(text);

  if (bookings) {
    return renderBookingsResponse(bookings, isMaximized);
  }

  const notifications = parseNotificationsResponse(text);

  if (notifications) {
    return renderNotificationsResponse(notifications);
  }

  const structured = parseStructuredResponse(text);

  if (structured?.status === 'CONFIRMATION_REQUIRED') {
    return (
      <div
        style={{
          width: '100%',
          background: '#fff7ed',
          border: '1px solid #fdba74',
          borderRadius: '14px',
          padding: '14px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '800',
            color: '#9a3412',
            fontSize: '14px',
            marginBottom: '6px'
          }}
        >
          <span style={{ fontSize: '19px' }}><ChatIcon name='notification' size={16} stroke='currentColor' /></span>
          <span>Confirmation Required</span>
        </div>

        <div
          style={{
            color: '#7c2d12',
            fontSize: '12px',
            lineHeight: '1.5'
          }}
        >
          {structured.message ||
            'Please confirm this action before continuing.'}
        </div>
      </div>
    );
  }

  if (structured?.status === 'OTP_REQUIRED') {
    return (
      <div
        style={{
          width: '100%',
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: '14px',
          padding: '14px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '800',
            color: '#1e3a8a',
            fontSize: '14px',
            marginBottom: '6px'
          }}
        >
          <span style={{ fontSize: '19px' }}><ChatIcon name='notification' size={16} stroke='currentColor' /></span>
          <span>OTP Verification Required</span>
        </div>

        <div
          style={{
            color: '#1e40af',
            fontSize: '12px',
            lineHeight: '1.5'
          }}
        >
          {structured.message ||
            'An OTP has been sent. Enter it to complete the action.'}
        </div>
      </div>
    );
  }

  const booking = parseBookingSuccess(text);

  if (booking) {
    return (
      <div
        style={{
          width: '100%',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '14px',
          padding: '14px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#166534',
            fontWeight: '800',
            fontSize: '14px',
            marginBottom: '9px'
          }}
        >
          <span style={{ fontSize: '19px' }}><ChatIcon name='success' size={17} stroke='currentColor' /></span>
          <span>Booking Confirmed</span>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '6px',
            color: '#374151',
            fontSize: '12px'
          }}
        >
          <div><ChatIcon name='charger' size={14} stroke='#64748b' /> <strong>Charger:</strong> {booking.chargerNumber}</div>
          <div><ChatIcon name='station' size={14} stroke='#64748b' /> <strong>Station:</strong> {booking.stationName}</div>
          <div><ChatIcon name='clock' size={14} stroke='#64748b' /> <strong>Start:</strong> {booking.startTime}</div>
          <div><ChatIcon name='calendar' size={14} stroke='#64748b' /> <strong>End:</strong> {booking.endTime}</div>
          <div><ChatIcon name='clock' size={14} stroke='#64748b' /> <strong>Duration:</strong> {booking.durationMinutes} min</div>
        </div>
      </div>
    );
  }

  if (/^\s*\[\s*\]\s*$/.test(text || '') ||
      /your .*waitlist.*(?:no|empty)/i.test(text || '')) {
    return renderEmptyResponse(
      'Your Waitlist',
      'You currently have no waitlist entries.',
      <ChatIcon name='inbox' size={28} stroke='#64748b' />
    );
  }

  if (requiresConfirmation(text)) {
    return (
      <div
        style={{
          width: '100%',
          background: '#fff7ed',
          border: '1px solid #fdba74',
          borderRadius: '14px',
          padding: '14px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontWeight: '800',
            color: '#9a3412',
            fontSize: '14px',
            marginBottom: '5px'
          }}
        >
          <ChatIcon name='notification' size={16} stroke='currentColor' /> Confirmation Required
        </div>

        <div
          style={{
            color: '#7c2d12',
            fontSize: '12px',
            lineHeight: '1.5'
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  if (indicatesOtpRequired(text)) {
    return (
      <div
        style={{
          width: '100%',
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: '14px',
          padding: '14px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            fontWeight: '800',
            color: '#1e3a8a',
            fontSize: '14px',
            marginBottom: '5px'
          }}
        >
          <ChatIcon name='notification' size={16} stroke='currentColor' /> OTP Verification
        </div>

        <div
          style={{
            color: '#1e40af',
            fontSize: '12px',
            lineHeight: '1.5'
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  return renderRichTextResponse(text);
}
export default function AIChatbot({ role }) {
  const currentRole =
    role?.replace('ROLE_', '').toUpperCase() || getStoredRole();

  const config =
    ROLE_CONFIG[currentRole] || ROLE_CONFIG.USER;

  const [isOpen, setIsOpen] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 460, height: 650 });
  const [isMaximized, setIsMaximized] = useState(false);
  const resizeStart = useRef(null);

  const startChatResize = (event) => {
    if (isMaximized) return;
    event.preventDefault();
    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: chatSize.width,
      height: chatSize.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveChatResize = (event) => {
    if (!resizeStart.current || isMaximized) return;
    const start = resizeStart.current;
    setChatSize({
      width: Math.min(window.innerWidth - 32, Math.max(320, start.width + start.x - event.clientX)),
      height: Math.min(window.innerHeight - 48, Math.max(360, start.height + start.y - event.clientY)),
    });
  };

  const endChatResize = () => {
    resizeStart.current = null;
  };


  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello! I am your ${config.title}. How can I help you?`,
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  const loadAdminAnalytics = async () => {
    if (currentRole !== 'ADMIN') return;

    setAnalyticsLoading(true);
    setAnalyticsError('');

    try {
      const response = await api.get('/admin/analytics');
      setAdminAnalytics(response.data);
    } catch (error) {
      setAnalyticsError(
        error.response?.status === 401
          ? 'Your session has expired. Please log in again.'
          : error.response?.status === 403
            ? 'Administrator access is required to view analytics.'
            : 'Unable to load admin analytics. Please try again.'
      );
    } finally {
      setAnalyticsLoading(false);
    }
  };
  const [bookingTrends, setBookingTrends] = useState(null);
const [trendsLoading, setTrendsLoading] = useState(false);
const [trendsError, setTrendsError] = useState('');

const loadBookingTrends = async () => {
  if (currentRole !== 'ADMIN' || trendsLoading) return;

  setTrendsLoading(true);
  setTrendsError('');

  try {
    const response = await api.get('/admin/analytics/booking-trends');
    setBookingTrends(response.data);
  } catch (error) {
    setTrendsError(
      error.response?.status === 401
        ? 'Your session has expired. Please log in again.'
        : error.response?.status === 403
          ? 'Administrator access is required to view booking trends.'
          : 'Unable to load booking trends. Please try again.'
    );
  } finally {
    setTrendsLoading(false);
  }
};

  const [pendingConfirm, setPendingConfirm] = useState(null);

  const [pendingOtp, setPendingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const addMessage = (sender, text) => {
    setMessages((prev) => [
      ...prev,
      {
        sender,
        text,
      },
    ]);
  };

  const sendToBackend = async (userText, confirmed = false) => {
    if (!userText || !userText.trim()) return;

    setLoading(true);

    
    const isAdminAnalyticsRequest =
      currentRole === 'ADMIN' &&
      /analytics|booking trends|booking activity/i.test(userText);

    if (isAdminAnalyticsRequest) {
      void loadAdminAnalytics();
      void loadBookingTrends();
    }

try {
      const response = await api.post('/ai/chat', {
        message: userText.trim(),
        confirmed: !!confirmed,
      });

      const answer =
        response.data?.message ||
        'I received your request, but no response was returned.';

      addMessage('ai', answer);

      if (requiresConfirmation(answer)) {
        setPendingConfirm({
          originalMessage: userText.trim(),
        });
      } else {
        setPendingConfirm(null);
      }

      if (indicatesOtpRequired(answer)) {
        setPendingOtp(true);
        setOtp('');
      }

      return answer;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Sorry, I could not process your request.';

      addMessage('ai', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const userText = input.trim();

    if (!userText || loading || pendingOtp) return;

    setInput('');

    addMessage('user', userText);

    await sendToBackend(userText, false);
  };

  const handleConfirm = async () => {
    if (!pendingConfirm || loading || pendingOtp) return;

    const originalMessage = pendingConfirm.originalMessage;

    setPendingConfirm(null);

    await sendToBackend(originalMessage, true);
  };

  const handleCancelConfirmation = () => {
    setPendingConfirm(null);
    addMessage('ai', 'Action cancelled.');
  };

  const handleOtpSubmit = async () => {
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      addMessage(
        'ai',
        'Please enter the 6-digit OTP sent to your registered email.'
      );
      return;
    }

    setOtpLoading(true);

    try {
      const response = await api.post('/ai/verify-booking-otp', {
        otp: cleanOtp,
      });

      const answer =
        response.data?.message ||
        'OTP verification completed.';

      addMessage('ai', answer);

      setPendingOtp(false);
      setOtp('');
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Invalid or expired OTP. Please try again.';

      addMessage('ai', errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleOtpSubmit();
    }
  };

  return (
    <>
      {/* Floating AI Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            border: 'none',
            background: '#16a34a',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '29px',
            transition: 'transform .2s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <ChatIcon name='notification' size={16} stroke='currentColor' />
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            right: isMaximized ? '16px' : '24px',
            bottom: isMaximized ? '16px' : '24px',
            left: isMaximized ? '16px' : 'auto',
            top: isMaximized ? '16px' : 'auto',
            width: isMaximized ? 'auto' : `${chatSize.width}px`,
            minWidth: isMaximized ? 0 : '320px',
            maxWidth: isMaximized ? 'none' : 'calc(100vw - 32px)',
            height: isMaximized ? 'auto' : `${chatSize.height}px`,
            minHeight: isMaximized ? 0 : '360px',
            maxHeight: isMaximized ? 'none' : 'calc(100vh - 48px)',
            resize: 'none',
            boxSizing: 'border-box',
            background: '#ffffff',
            borderRadius: '18px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
            overflow: 'hidden',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e5e7eb',
          }}
        >
          
          {!isMaximized && (
            <div
              role="separator"
              aria-label="Drag to resize chatbot"
              title="Drag to resize"
              onPointerDown={startChatResize}
              onPointerMove={moveChatResize}
              onPointerUp={endChatResize}
              onPointerCancel={endChatResize}
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '18px',
                height: '18px',
                zIndex: 10,
                cursor: 'nwse-resize',
                touchAction: 'none',
                borderTop: '3px solid #94a3b8',
                borderLeft: '3px solid #94a3b8',
                borderTopLeftRadius: '7px',
              }}
            />
          )}
{/* Header */}
          <div
            style={{
              height: '62px',
              flexShrink: 0,
              padding: '0 16px',
              background: '#1f2937',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '19px',
                }}
              >
                <ChatIcon name='notification' size={16} stroke='currentColor' />
              </div>

              <div>
                <div
                  style={{
                    fontWeight: '700',
                    fontSize: '15px',
                  }}
                >
                  {config.title}
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#d1d5db',
                    marginTop: '2px',
                  }}
                >
                  Smart EV Assistant
                </div>
              </div>
            </div>

            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setIsMaximized((value) => !value)}
                aria-label={isMaximized ? 'Restore AI Assistant' : 'Maximize AI Assistant'}
                title={isMaximized ? 'Restore' : 'Maximize'}
                style={{ width: '34px', height: '34px', border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
              >
                {isMaximized ? (
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                    <rect x='8' y='8' width='12' height='12' rx='1.5' />
                    <path d='M16 8V4H4V16H8' />
                  </svg>
                ) : (
                  <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                    <rect x='5' y='5' width='14' height='14' rx='1.5' />
                  </svg>
                )}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsMaximized(false); }}
                aria-label="Close AI Assistant"
                title="Close"
                style={{ width: '34px', height: '34px', border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: '22px', cursor: 'pointer' }}
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                  <path d='M18 6 6 18' />
                  <path d='m6 6 12 12' />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px',
              background: '#f8fafc',
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent:
                    message.sender === 'user'
                      ? 'flex-end'
                      : 'flex-start',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    width: message.sender === 'ai' ? '100%' : 'auto',
                    maxWidth: message.sender === 'ai' ? '100%' : '82%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    padding: '10px 13px',
                    borderRadius:
                      message.sender === 'user'
                        ? '14px 14px 4px 14px'
                        : '14px 14px 14px 4px',
                    background:
                      message.sender === 'user'
                        ? '#16a34a'
                        : '#e5e7eb',
                    color:
                      message.sender === 'user'
                        ? '#ffffff'
                        : '#111827',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.45',
                    fontSize: '14px',
                  }}
                >
                  {message.sender === 'ai' ? (
                    <>
                    

{currentRole === 'ADMIN' &&
  /show admin analytics|system-wide analytics|booking trends|booking activity/i.test(
    [...messages]
      .slice(0, index)
      .reverse()
      .find(item => item.sender === 'user')?.text || ''
  ) && (
    <div style={{ width: '100%', marginBottom: '12px' }}>
      {analyticsLoading && (
        <div style={{ padding: '12px', color: '#64748b' }}>
          Loading admin analytics...
        </div>
      )}

      {!analyticsLoading && analyticsError && (
        <div style={{ padding: '12px', color: '#991b1b' }}>
          {analyticsError}
          <button
            type="button"
            onClick={loadAdminAnalytics}
            style={{ marginLeft: '10px', cursor: 'pointer' }}
          >
            Retry analytics
          </button>
        </div>
      )}

      {!analyticsLoading && !analyticsError && adminAnalytics &&
        renderAnalyticsResponse(adminAnalytics, isMaximized)
      }
    </div>
  )}


                      {renderAssistantMessage(message.text, isMaximized, {
                        trends: currentRole === 'ADMIN' ? bookingTrends : null,
                        trendsLoading,
                        trendsError,
                        onRetryTrends: loadBookingTrends
                      })}

                      {currentRole === 'ADMIN' &&
                        /show admin analytics|system-wide analytics|analytics|booking trends|booking activity|total stations|total bookings/i.test(([...messages].slice(0, index).reverse().find(item => item.sender === 'user')?.text || '')) && (
                        <div style={{ marginTop: '12px' }}>
                          {trendsLoading && (
                            <div style={{ padding: '12px', color: '#64748b' }}>
                              Loading booking and energy trends...
                            </div>
                          )}

                          {!trendsLoading && trendsError && (
                            <div style={{ padding: '12px', color: '#991b1b' }}>
                              {trendsError}
                              <button
                                type="button"
                                onClick={loadBookingTrends}
                                style={{ marginLeft: '10px', cursor: 'pointer' }}
                              >
                                Retry
                              </button>
                            </div>
                          )}

                          {!trendsLoading && !trendsError && bookingTrends &&
                            renderBookingTrends(bookingTrends)}
                        </div>
                      )}
                    </>
                  ) : message.text}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  padding: '8px',
                  color: '#6b7280',
                  fontSize: '13px',
                }}
              >
                Assistant is thinking...
              </div>
            )}

            {/* Confirmation */}
            {pendingConfirm && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    marginBottom: '9px',
                    fontWeight: '600',
                    color: '#9a3412',
                    fontSize: '13px',
                  }}
                >
                  This action requires your confirmation.
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  style={{
                    marginRight: '7px',
                    padding: '7px 13px',
                    border: 'none',
                    borderRadius: '7px',
                    background: '#16a34a',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Confirm
                </button>

                <button
                  onClick={handleCancelConfirmation}
                  disabled={loading}
                  style={{
                    padding: '7px 13px',
                    border: 'none',
                    borderRadius: '7px',
                    background: '#dc2626',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* OTP */}
            {pendingOtp && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    fontWeight: '700',
                    color: '#1e3a8a',
                    marginBottom: '5px',
                    fontSize: '14px',
                  }}
                >
                  <ChatIcon name='notification' size={16} stroke='currentColor' /> Booking OTP Verification
                </div>

                <div
                  style={{
                    color: '#374151',
                    marginBottom: '10px',
                    fontSize: '12px',
                    lineHeight: '1.4',
                  }}
                >
                  Enter the 6-digit OTP sent to your registered email.
                  The booking is created only after successful verification.
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '7px',
                  }}
                >
                  <input
                    type="text"
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6)
                      )
                    }
                    onKeyDown={handleOtpKeyDown}
                    placeholder="6-digit OTP"
                    maxLength={6}
                    disabled={otpLoading}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '9px 10px',
                      border: '1px solid #93c5fd',
                      borderRadius: '7px',
                      fontSize: '14px',
                      letterSpacing: '2px',
                    }}
                  />

                  <button
                    onClick={handleOtpSubmit}
                    disabled={
                      otpLoading ||
                      otp.length !== 6
                    }
                    style={{
                      padding: '9px 12px',
                      border: 'none',
                      borderRadius: '7px',
                      background:
                        otpLoading || otp.length !== 6
                          ? '#9ca3af'
                          : '#2563eb',
                      color: '#ffffff',
                      cursor:
                        otpLoading || otp.length !== 6
                          ? 'not-allowed'
                          : 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                    }}
                  >
                    {otpLoading ? '...' : 'Verify'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              flexShrink: 0,
              padding: '10px',
              borderTop: '1px solid #e5e7eb',
              background: '#ffffff',
              display: 'flex',
              gap: '7px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSend();
                }
              }}
              placeholder={
                pendingOtp
                  ? 'Complete OTP verification first...'
                  : config.placeholder
              }
              disabled={loading || pendingOtp}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 11px',
                border: '1px solid #d1d5db',
                borderRadius: '9px',
                fontSize: '13px',
                outline: 'none',
              }}
            />

            <button
              onClick={handleSend}
              disabled={
                loading ||
                pendingOtp ||
                !input.trim()
              }
              style={{
                padding: '10px 13px',
                border: 'none',
                borderRadius: '9px',
                background:
                  loading ||
                  pendingOtp ||
                  !input.trim()
                    ? '#9ca3af'
                    : '#16a34a',
                color: '#ffffff',
                cursor:
                  loading ||
                  pendingOtp ||
                  !input.trim()
                    ? 'not-allowed'
                    : 'pointer',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
