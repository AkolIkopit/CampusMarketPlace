import MessageInput from "./MessagesInput.jsx";
import styles from "./Messages.module.css";

// Used when an incoming/outgoing message has no avatar URL.
const DEFAULT_AVATAR = "/avatar-placeholder.svg";

function ChatWindow({
  conversation,
  onSendMessage,
  isSending,
  isSelfConversation = false,
  onBackToList,
}) {
  return (
    <section className={styles["chat-window"]} aria-label="Conversation view">
      <header className={styles["chat-header"]}>
        <button type="button" className={styles["mobile-back-button"]} onClick={onBackToList}>
          ← Back
        </button>

        <article className={styles["chat-user"]}>
          <figure className={styles["avatar-small"]}>
            <img
              alt={conversation.name}
              src={conversation.avatar || DEFAULT_AVATAR}
            />
          </figure>
          <header className={styles["chat-user-text"]}>
            <section className={styles["chat-name-row"]}>
              <h3>{conversation.name}</h3>
              <p className={styles["verified-pill"]}>
                <strong className={styles["verified-icon"]} aria-hidden="true">✓</strong>
                Verified
              </p>
            </section>
            <p>
              Inquiring about <strong className={styles.highlight}>{conversation.headline}</strong>
            </p>
          </header>
        </article>
        <nav className={styles["chat-actions"]} aria-label="Conversation actions">
          <button type="button" aria-label="Flag">
            Flag
          </button>
          <button type="button" aria-label="More options">
            More
          </button>
        </nav>
      </header>

      <section className={styles["messages-stream"]} aria-label="Messages">
        <p className={styles.timestamp}>{conversation.dateLabel}</p>

        {isSelfConversation ? (
          <section className={styles["empty-state"]}>
            <h2>This is your own listing</h2>
            <p>You can view the thread layout, but sending a message to yourself is disabled.</p>
          </section>
        ) : null}

        <ul className={styles["message-list"]}>
          {/* Render each message bubble in timestamp order. */}
          {conversation.messages.map((message) => (
            <li
              key={message.id || `${message.time}-${message.incoming}`}
              className={
                message.incoming
                  ? `${styles["message-row"]} ${styles.incoming}`
                  : `${styles["message-row"]} ${styles.outgoing}`
              }
            >
              <article className={styles["message-bubble"]}>
                <figure className={styles["message-avatar"]}>
                  <img alt={message.incoming ? conversation.name : "You"} src={message.avatar || DEFAULT_AVATAR} />
                </figure>
                <section className={styles["bubble-stack"]}>
                  <p
                    className={
                      message.incoming
                        ? `${styles.bubble} ${styles["incoming-bubble"]}`
                        : `${styles.bubble} ${styles["outgoing-bubble"]}`
                    }
                  >
                    {message.text}
                  </p>
                  {message.attachmentUrl ? (
                    <a
                      className={styles["message-attachment"]}
                      href={message.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {message.attachmentLabel || "Open attachment"}
                    </a>
                  ) : null}
                  <time className={styles["message-time"]}>{message.time}</time>
                </section>
              </article>
            </li>
          ))}

        </ul>
      </section>

      {/* Composer delegates send logic to parent and disables while posting. */}
      <MessageInput onSendMessage={onSendMessage} disabled={isSending || isSelfConversation} />
    </section>
  );
}

export default ChatWindow;