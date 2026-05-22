import ConversationList from "./ConversationList.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../supabase";
import styles from "./Messages.module.css";

// Local fallback used only when a profile has no avatar_url.
const DEFAULT_AVATAR = "/avatar-placeholder.svg";
const MESSAGE_ATTACHMENT_BUCKET = "message-attachments";
const MESSAGE_SELECT_FIELDS =
  "id, listing_id, sender_id, receiver_id, message_text, attachment_url, transaction_id, is_read, created_at";
const MESSAGE_SELECT_FIELDS_FALLBACK =
  "id, listing_id, sender_id, receiver_id, message_text, attachment_url, is_read, created_at";
const SYSTEM_MESSAGE_PREFIX = "[SYSTEM] ";

const isMissingTransactionColumnError = (error) => {
  if (!error) return false;
  const text = `${error.code || ""} ${error.message || ""} ${error.details || ""}`;
  return text.includes("transaction_id") || text.includes("PGRST204");
};

const makeSystemMessage = (message) => `${SYSTEM_MESSAGE_PREFIX}${message}`;

const parseMessageText = (messageText = "") => {
  const isSystem = messageText.startsWith(SYSTEM_MESSAGE_PREFIX);
  return {
    isSystem,
    text: isSystem ? messageText.slice(SYSTEM_MESSAGE_PREFIX.length) : messageText,
  };
};

// Conversation identity is pairwise by participant + listing context.
const getConversationId = (otherUserId, listingId) => `${otherUserId}::${listingId || "no-listing"}`;

const sanitizeFileName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const getAttachmentLabelFromUrl = (attachmentUrl) => {
  if (!attachmentUrl) return "";

  try {
    const fileName = decodeURIComponent(attachmentUrl.split("/").pop() || "");
    const label = fileName.includes("__") ? fileName.split("__").slice(1).join("__") : fileName;
    return label || "Attachment";
  } catch {
    return "Attachment";
  }
};

// Message-level timestamp (used inside a thread).
const formatMessageTime = (isoDate) => {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

// Conversation-level time (used in left sidebar list).
const formatConversationTime = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return formatMessageTime(isoDate);
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Date chip text shown above messages in the chat body.
const formatDateLabel = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
};

// Read the viewport immediately so the first mobile render is already single-pane.
const getIsMobileViewport = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  const mq = window.matchMedia("(max-width: 900px)");
  return mq ? mq.matches : false;
};


function MessagesPage({ profile }) {
  // Query params come from "Message Seller" deep-link navigation.
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contextUserId = searchParams.get("user");
  const contextSellerName = searchParams.get("name");
  const contextItemName = searchParams.get("item");
  const contextListingId = searchParams.get("listing");
  const contextAction = searchParams.get("action");
  const contextTransactionId = searchParams.get("transaction");
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserAvatar, setCurrentUserAvatar] = useState("");
  const [contextUserProfile, setContextUserProfile] = useState(null);
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  const [mobileView, setMobileView] = useState(() =>
    getIsMobileViewport() && contextUserId ? "thread" : "list"
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [transactionActionLoading, setTransactionActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [messageTransactionsSupported, setMessageTransactionsSupported] = useState(true);

  // Prefer profile prop avatar, then fetched profile, then local fallback.
  const viewerAvatar = profile?.avatar_url || currentUserAvatar || DEFAULT_AVATAR;

  // If user enters from a listing, this targets that exact seller + listing thread.
  const contextConversationId = useMemo(
    () => (contextUserId ? getConversationId(contextUserId, contextListingId) : null),
    [contextUserId, contextListingId]
  );

  const draftConversationFromQuery = useMemo(() => {
    if (!contextUserId) return null;

    return {
      id: contextConversationId,
      userId: contextUserId,
      sellerId: contextUserId,
      name: contextUserProfile?.full_name || contextSellerName || "Seller",
      avatar: contextUserProfile?.avatar_url || DEFAULT_AVATAR,
      headline: contextItemName || "this listing",
      listingId: contextListingId || null,
      time: "Now",
      item: contextItemName || "Listing",
      message: contextAction ? `Ready to ${contextAction.replace(/^[a-z]/, (ch) => ch.toUpperCase())}.` : "Start a conversation",
      dateLabel: "Today",
      action: contextAction,
      transactionId: contextTransactionId,
      messages: [],
    };
  }, [
    contextConversationId,
    contextUserId,
    contextSellerName,
    contextItemName,
    contextListingId,
    contextUserProfile?.full_name,
    contextUserProfile?.avatar_url,
  ]);

  useEffect(() => {
    if (!contextUserId) {
      setContextUserProfile(null);
      return;
    }

    let cancelled = false;

    // Load seller profile for deep-linked chats so name/avatar are real values.
    const fetchContextUserProfile = async () => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", contextUserId)
        .maybeSingle();

      if (!cancelled && !profileError) {
        setContextUserProfile(data || null);
      }
    };

    fetchContextUserProfile();

    return () => {
      cancelled = true;
    };
  }, [contextUserId]);

  const fetchConversations = useCallback(
    async (userId) => {
      if (!userId) return;

      setError("");

      // Pull every message where the current user is participant.
      let { data: rawMessages, error: messagesError } = await supabase
        .from("messages")
        .select(messageTransactionsSupported ? MESSAGE_SELECT_FIELDS : MESSAGE_SELECT_FIELDS_FALLBACK)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: true });

      if (messagesError && messageTransactionsSupported && isMissingTransactionColumnError(messagesError)) {
        setMessageTransactionsSupported(false);
        const fallbackResult = await supabase
          .from("messages")
          .select(MESSAGE_SELECT_FIELDS_FALLBACK)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: true });

        rawMessages = fallbackResult.data;
        messagesError = fallbackResult.error;
      }

      if (messagesError) {
        throw messagesError;
      }

      if (!rawMessages || rawMessages.length === 0) {
        // Keep a draft row if user opened messages from a listing before sending.
        setConversations((prev) => {
          if (draftConversationFromQuery) {
            return [draftConversationFromQuery];
          }
          return [];
        });
        return;
      }

      const otherUserIds = [
        ...new Set(
          rawMessages.map((message) =>
            message.sender_id === userId ? message.receiver_id : message.sender_id
          )
        ),
      ];

      const listingIds = [
        ...new Set(rawMessages.map((message) => message.listing_id).filter(Boolean)),
      ];

      const transactionIds = [
        ...new Set([
          ...rawMessages.map((message) => message.transaction_id).filter(Boolean),
          contextTransactionId,
        ].filter(Boolean)),
      ];

      // Fetch profile and listing metadata in parallel for display labels.
      const [
        { data: profileRows, error: profileError },
        { data: listingRows, error: listingError },
        { data: transactionRows, error: transactionError },
        { data: bookingRows, error: bookingError },
      ] =
        await Promise.all([
          otherUserIds.length
            ? supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .in("id", otherUserIds)
            : Promise.resolve({ data: [], error: null }),
          listingIds.length
            ? supabase.from("listings").select("id, title, seller_id").in("id", listingIds)
            : Promise.resolve({ data: [], error: null }),
          transactionIds.length
            ? supabase
                .from("transactions")
.select(`
  id,
  status,
  booking_status,
  payment_status,
  agreed_amount,
  cash_shortfall_due,
  listing_title,
  listing_image,
  listing_price
`)
                .in("id", transactionIds)
            : Promise.resolve({ data: [], error: null }),
          transactionIds.length
            ? supabase
                .from("bookings")
                .select("id, transaction_id, status, item_received, item_released, collection_time")
                .in("transaction_id", transactionIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (profileError) throw profileError;
      if (listingError) throw listingError;
      if (transactionError) throw transactionError;
      if (bookingError) throw bookingError;

      const profileMap = Object.fromEntries((profileRows || []).map((row) => [row.id, row]));
      const listingMap = Object.fromEntries((listingRows || []).map((row) => [row.id, row]));
      const transactionMap = Object.fromEntries((transactionRows || []).map((row) => [row.id, row]));
      const bookingMap = Object.fromEntries((bookingRows || []).map((row) => [row.transaction_id, row]));
      const conversationMap = new Map();

      // Group individual message rows into UI conversations.
      rawMessages.forEach((message) => {
        const incoming = message.receiver_id === userId;
        const otherUserId = incoming ? message.sender_id : message.receiver_id;
        const conversationId = getConversationId(otherUserId, message.listing_id);
        const otherProfile = profileMap[otherUserId];
        const listingTitle =
  transactionMap[message.transaction_id]?.listing_title ||
  listingMap[message.listing_id]?.title ||
  "Listing";
        const sellerId = listingMap[message.listing_id]?.seller_id || null;

        if (!conversationMap.has(conversationId)) {
          conversationMap.set(conversationId, {
            id: conversationId,
            userId: otherUserId,
            listingId: message.listing_id || null,
            sellerId: sellerId,
            name: otherProfile?.full_name || "User",
            avatar: otherProfile?.avatar_url || DEFAULT_AVATAR,
            headline: listingTitle,
            item: listingTitle,
            time: formatConversationTime(message.created_at),
            message: parseMessageText(message.message_text || "").text || (message.attachment_url ? "Attachment" : ""),
            dateLabel: formatDateLabel(message.created_at),
            lastCreatedAt: message.created_at,
            unreadCount: 0,
            messages: [],
          });
        }

        const conversation = conversationMap.get(conversationId);

        // Attach transaction association if present.
        if (message.transaction_id) {
          conversation.transactionId = message.transaction_id;
          conversation.transactionStatus = transactionMap[message.transaction_id]?.status || "";
          conversation.bookingStatus =
            bookingMap[message.transaction_id]?.status ||
            transactionMap[message.transaction_id]?.booking_status ||
            "";
          conversation.itemReceived = Boolean(bookingMap[message.transaction_id]?.item_received);
          conversation.itemReleased = Boolean(bookingMap[message.transaction_id]?.item_released);
          conversation.paymentStatus = transactionMap[message.transaction_id]?.payment_status || "";
          conversation.agreedAmount = transactionMap[message.transaction_id]?.agreed_amount;
          conversation.cashShortfallDue = transactionMap[message.transaction_id]?.cash_shortfall_due;
        }

        const parsedMessage = parseMessageText(message.message_text || "");

        if (message.transaction_id && parsedMessage.text?.includes("Transaction ID:")) {
          conversation.transactionRequestText = parsedMessage.text;
        }

        // Build chat bubbles for thread panel.
        conversation.messages.push({
          id: message.id,
          text: parsedMessage.text,
          isSystem: parsedMessage.isSystem,
          time: formatMessageTime(message.created_at),
          incoming,
          avatar: incoming ? conversation.avatar : viewerAvatar,
          attachmentUrl: message.attachment_url || null,
          attachmentLabel: getAttachmentLabelFromUrl(message.attachment_url),
        });

        if (incoming && !message.is_read) {
          conversation.unreadCount += 1;
        }

        // Track latest message so sidebar preview/time is always current.
        if (!conversation.lastCreatedAt || new Date(message.created_at) > new Date(conversation.lastCreatedAt)) {
          conversation.lastCreatedAt = message.created_at;
          conversation.time = formatConversationTime(message.created_at);
          conversation.dateLabel = formatDateLabel(message.created_at);
          conversation.message = parsedMessage.text;
        }
      });

      const builtConversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastCreatedAt) - new Date(a.lastCreatedAt))
        .map(({ lastCreatedAt, ...conversation }) => conversation)
        .map((conversation) =>
          draftConversationFromQuery && conversation.id === draftConversationFromQuery.id
            ? {
                ...conversation,
                action: draftConversationFromQuery.action,
                transactionId: conversation.transactionId || draftConversationFromQuery.transactionId,
              }
            : conversation
        );

      setConversations((prevConversations) => {
        if (!draftConversationFromQuery) return builtConversations;

        const hasDraftInFetched = builtConversations.some(
          (conversation) => conversation.id === draftConversationFromQuery.id
        );

        if (hasDraftInFetched) return builtConversations;

        const draftAlreadyExists = prevConversations.some(
          (conversation) => conversation.id === draftConversationFromQuery.id
        );

        if (draftAlreadyExists) {
          return [
            draftConversationFromQuery,
            ...builtConversations.filter((conversation) => conversation.id !== draftConversationFromQuery.id),
          ];
        }

        return [draftConversationFromQuery, ...builtConversations];
      });
    },
    [contextTransactionId, draftConversationFromQuery, messageTransactionsSupported, viewerAvatar]
  );

  useEffect(() => {
    let cancelled = false;

    // Initial load: auth user + avatar + conversations.
    const bootstrapMessages = async () => {
      try {
        setLoading(true);
        setError("");
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) {
          setCurrentUserId(user.id);
          const { data: ownProfile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (ownProfile?.full_name) {
            setCurrentUserName(ownProfile.full_name);
          }

          if (ownProfile?.avatar_url) {
            setCurrentUserAvatar(ownProfile.avatar_url);
          }

          await fetchConversations(user.id);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load messages.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrapMessages();

    return () => {
      cancelled = true;
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (!draftConversationFromQuery) return;

    // Insert draft once so users can start typing immediately from listing view.
    setConversations((prevConversations) => {
      const alreadyThere = prevConversations.some(
        (conversation) => conversation.id === draftConversationFromQuery.id
      );

      if (alreadyThere) return prevConversations;

      return [draftConversationFromQuery, ...prevConversations];
    });
  }, [draftConversationFromQuery]);

  useEffect(() => {
    // Keep deep-linked conversation selected in sidebar.
    if (!contextConversationId) return;
    setActiveConversationId(contextConversationId);
  }, [contextConversationId]);

  useEffect(() => {
    if (!currentUserId) return;

    // Live refresh on inserts/updates to messages relevant to this user.
    const channel = supabase
      .channel(`messages-stream-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new || payload.old;
          if (!row) return;

          if (row.sender_id === currentUserId || row.receiver_id === currentUserId) {
            fetchConversations(currentUserId).catch(() => {
              // Silent refresh failure; main fetch still surfaces errors.
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchConversations]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) || null;
  const isSelfConversation = Boolean(currentUserId && activeConversation?.userId === currentUserId);

  const handleRequestBooking = () => {
    if (!activeConversation?.listingId || !activeConversation?.userId) return;

    // Determine seller and buyer for the booking page. Use the conversation's
    // sellerId (listing owner). If the current viewer is the seller, pass the
    // other participant as the `buyer` param so the seller can book a drop-off
    // slot on behalf of that buyer. Otherwise, the viewer is the buyer.
    const sellerParam = activeConversation.sellerId || activeConversation.userId;
    const buyerParam = currentUserId === sellerParam ? activeConversation.userId : currentUserId;

    const query = new URLSearchParams({
      listing: activeConversation.listingId,
      seller: sellerParam,
      buyer: buyerParam,
      name: activeConversation.name,
      item: activeConversation.item,
    });

    if (activeConversation.transactionId) {
      query.set("transaction", activeConversation.transactionId);
    }

    navigate(`/bookings/new?${query.toString()}`);
  };

  const handleMakePayment = () => {
    if (!activeConversation?.transactionId) return;
    navigate(`/transactions/${activeConversation.transactionId}/payment`);
  };

  useEffect(() => {
    const rawMediaQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia("(max-width: 900px)")
      : undefined;
    const mediaQuery = rawMediaQuery || {
      matches: false,
      addEventListener: () => {},
      addListener: () => {},
      removeEventListener: () => {},
      removeListener: () => {},
    };

    const syncMobileState = (event) => {
      setIsMobile(event?.matches ?? false);
    };

    syncMobileState(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener("change", syncMobileState);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(syncMobileState);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener("change", syncMobileState);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(syncMobileState);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileView("list");
      return;
    }

    if (contextConversationId) {
      setMobileView("thread");
    }
  }, [isMobile, contextConversationId]);

  useEffect(() => {
    if (!currentUserId || !activeConversation?.userId) return;

    // Mark inbound messages as read when thread is opened.
    const markConversationAsRead = async () => {
      let query = supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", activeConversation.userId)
        .eq("receiver_id", currentUserId)
        .eq("is_read", false);

      if (activeConversation.listingId) {
        query = query.eq("listing_id", activeConversation.listingId);
      } else {
        query = query.is("listing_id", null);
      }

      await query;
    };

    markConversationAsRead();
  }, [activeConversation?.id, activeConversation?.listingId, activeConversation?.userId, currentUserId]);

  const handleSendMessage = async (text, attachmentFile = null) => {
    // Return boolean so composer knows whether to clear the input.
    if (!currentUserId || !activeConversation?.userId) {
      return false;
    }

    // Never allow a user to message themselves, even if they reach the route manually.
    if (isSelfConversation) {
      return false;
    }

    let uploadedAttachmentPath = null;

    try {
      setSending(true);
      setError("");

      const trimmedText = text.trim();
      if (!trimmedText && !attachmentFile) {
        return false;
      }

      const messageText = trimmedText || `Attachment: ${attachmentFile.name}`;
      let attachmentUrl = null;

      if (attachmentFile) {
        const safeName = sanitizeFileName(attachmentFile.name);
        const filePrefix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
        uploadedAttachmentPath = `${currentUserId}/${filePrefix}__${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(MESSAGE_ATTACHMENT_BUCKET)
          .upload(uploadedAttachmentPath, attachmentFile);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from(MESSAGE_ATTACHMENT_BUCKET)
          .getPublicUrl(uploadedAttachmentPath);

        attachmentUrl = publicData.publicUrl;
      }

      const payload = {
        // listing_id is optional to support general (non-listing) conversations.
        listing_id: activeConversation.listingId || null,
        sender_id: currentUserId,
        receiver_id: activeConversation.userId,
        message_text: messageText,
        attachment_url: attachmentUrl,
        is_read: false,
      };

      if (messageTransactionsSupported && activeConversation.transactionId) {
        payload.transaction_id = activeConversation.transactionId;
      }

      let { error: insertError } = await supabase.from("messages").insert([payload]);

      if (insertError && payload.transaction_id && isMissingTransactionColumnError(insertError)) {
        setMessageTransactionsSupported(false);
        const { transaction_id, ...fallbackPayload } = payload;
        const fallbackResult = await supabase.from("messages").insert([fallbackPayload]);
        insertError = fallbackResult.error;
      }

      if (insertError) throw insertError;

      await fetchConversations(currentUserId);
      setActiveConversationId(activeConversation.id);
      return true;
    } catch (err) {
      if (err && uploadedAttachmentPath) {
        await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).remove([uploadedAttachmentPath]);
      }
      const message = err instanceof Error ? err.message : "Failed to send message.";
      setError(message);
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleTransactionStatusChange = async (status, systemMessage) => {
    if (!currentUserId || !activeConversation?.transactionId) return;

    setTransactionActionLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status,
          booking_status: status === "accepted_pending_booking" ? "not_booked" : activeConversation.bookingStatus || "not_booked",
        })
        .eq("id", activeConversation.transactionId);

      if (updateError) throw updateError;

      const messagePayload = {
          listing_id: activeConversation.listingId || null,
          sender_id: currentUserId,
          receiver_id: activeConversation.userId,
          message_text: makeSystemMessage(systemMessage),
          is_read: false,
      };

      if (messageTransactionsSupported) {
        messagePayload.transaction_id = activeConversation.transactionId;
      }

      let { error: insertError } = await supabase.from("messages").insert([messagePayload]);

      if (insertError && messagePayload.transaction_id && isMissingTransactionColumnError(insertError)) {
        setMessageTransactionsSupported(false);
        const { transaction_id, ...fallbackPayload } = messagePayload;
        const fallbackResult = await supabase.from("messages").insert([fallbackPayload]);
        insertError = fallbackResult.error;
      }

      if (insertError) throw insertError;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                transactionStatus: status,
                message: systemMessage,
                messages: [
                  ...conversation.messages,
                  {
                    id: `local-${Date.now()}`,
                    text: systemMessage,
                    isSystem: true,
                    time: formatMessageTime(new Date().toISOString()),
                    incoming: false,
                    avatar: viewerAvatar,
                    attachmentUrl: null,
                    attachmentLabel: "",
                  },
                ],
              }
            : conversation
        )
      );

      await fetchConversations(currentUserId);
      setActiveConversationId(activeConversation.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update transaction.";
      setError(message);
    } finally {
      setTransactionActionLoading(false);
    }
  };

  const handleAcceptTransaction = async () => {
    const sellerName = profile?.full_name || currentUserName || "seller";
    await handleTransactionStatusChange(
      "accepted_pending_booking",
      `${sellerName} has accepted your transaction request. ${sellerName} should now request a trade facility booking.`
    );
  };

  const handleDeclineTransaction = async () => {
    const sellerName = profile?.full_name || currentUserName || "seller";
    const buyerName = activeConversation?.name || "the buyer";
    await handleTransactionStatusChange(
      "declined_by_seller",
      `${sellerName} has declined ${buyerName}'s transaction request. Continue chatting and ${buyerName} can submit a new offer if you agree on a different price.`
    );
  };

  useEffect(() => {
    // Ensure there is always a valid active conversation when list changes.
    if (activeConversationId) {
      const hasActiveConversation = conversations.some(
        (conversation) => conversation.id === activeConversationId
      );
      if (hasActiveConversation) return;
    }

    if (conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    } else {
      setActiveConversationId(null);
    }
  }, [conversations, activeConversationId]);

  const emptyStateMessage = contextUserId
    ? "This chat is ready. Send a message to start the conversation."
    : "Choose a person from the list to open the full conversation.";

  const handleSelectConversation = (conversationId) => {
    setActiveConversationId(conversationId);

    if (isMobile) {
      setMobileView("thread");
    }
  };

  const handleBackToConversations = () => {
    if (isMobile) {
      setMobileView("list");
    }
  };

  return (
    <main className={styles["messages-page"]}>
      <header className={styles["messages-hero"]}>
        <section>
          <p className={styles.eyebrow}>
            <img src="/UniMartlogo.png" alt="UNIMART" className={styles["hero-logo"]} />
            UNIMART
          </p>
          <h1>Messages</h1>
          <p className={styles["hero-copy"]}>
            Open a conversation to read the full thread and continue the chat.
          </p>
          <div className={styles["hero-actions"]}>
            <button type="button" className={styles["back-button"]} onClick={() => navigate("/dashboard/student")}>
              Back to Dashboard
            </button>
            {profile?.full_name ? (
              <p className={styles["viewer-name"]}>Signed in as {profile.full_name}</p>
            ) : null}
          </div>

          {loading ? <p className={styles["status-text"]}>Loading conversations...</p> : null}
          {error ? <p className={styles["status-error"]}>{error}</p> : null}
        </section>
      </header>

      <section className={styles["messages-layout"]} aria-label="Messages workspace">
        {(!isMobile || mobileView === "list") ? (
          <aside className={styles["messages-list-panel"]} aria-label="Conversation list">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
            />
          </aside>
        ) : null}

        {(!isMobile || mobileView === "thread") ? (
          <section className={styles["messages-thread-panel"]} aria-label="Conversation thread">
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                onSendMessage={handleSendMessage}
                isSending={sending}
                isSelfConversation={isSelfConversation}
                currentUserId={currentUserId}
                onRequestBooking={handleRequestBooking}
                onBackToList={handleBackToConversations}
                onAcceptTransaction={handleAcceptTransaction}
                onDeclineTransaction={handleDeclineTransaction}
                onMakePayment={handleMakePayment}
                transactionActionLoading={transactionActionLoading}
              />
            ) : (
              <section className={styles["empty-state"]}>
                <h2>Select a conversation</h2>
                <p>{emptyStateMessage}</p>
              </section>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default MessagesPage;
