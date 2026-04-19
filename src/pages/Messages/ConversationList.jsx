

import styles from "./Messages.module.css";

// Fallback used only when profile avatar_url is empty.
const DEFAULT_AVATAR = "/avatar-placeholder.svg";

function ConversationList({ conversations, activeConversationId, onSelectConversation }) {
  // Sidebar list: one card per conversation thread.
  return (
    <section className={styles["conversation-list"]} aria-label="Conversations">
      <header className={styles["section-header"]}>
        <h2>Conversations💬</h2>
        <form className={styles["search-wrap"]}>
          <label className={styles["visually-hidden"]} htmlFor="conversation-search">
            Search chats
          </label>
          <input id="conversation-search" type="text" placeholder="Search chats..." />
        </form>
      </header>

      <ul className={styles["conversation-items"]}>
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <button
              type="button"
              // Selecting a row updates the active thread in the right panel.
              onClick={() => onSelectConversation(conversation.id)}
              className={
                conversation.id === activeConversationId
                  ? `${styles["conversation-card"]} ${styles.active}${conversation.unreadCount > 0 ? ` ${styles.unread}` : ""}`
                  : `${styles["conversation-card"]}${conversation.unreadCount > 0 ? ` ${styles.unread}` : ""}`
              }
              aria-pressed={conversation.id === activeConversationId} // Exposes selected state to assistive tech.
            >
              <figure className={styles["conversation-avatar"]}>
                <img
                  src={conversation.avatar || DEFAULT_AVATAR}
                  alt={`${conversation.name} avatar`}
                />
              </figure>

              <article className={styles["conversation-text"]}>
                <header className={styles["conversation-top"]}>
                  <h3 className={styles["conversation-name"]}>{conversation.name}</h3>
                  <section className={styles["conversation-meta"]}>
                    {conversation.unreadCount > 0 ? (
                      <span className={styles["unread-badge"]} aria-label={`${conversation.unreadCount} unread messages`}>
                        {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                      </span>
                    ) : null}
                    <time className={styles["conversation-time"]}>{conversation.time}</time>
                  </section>
                </header>
                <p className={styles["conversation-item"]}>{conversation.item}</p>
                <p className={styles["conversation-preview"]}>{conversation.message}</p>
              </article>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ConversationList;
