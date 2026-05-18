import MessageInput from "./MessagesInput.jsx";
import styles from "./Messages.module.css";

// Used when an incoming/outgoing message has no avatar URL.
const DEFAULT_AVATAR = "/avatar-placeholder.svg";

function ChatWindow({
  conversation,
  onSendMessage,
  isSending,
  isSelfConversation = false,
  currentUserId,
  onRequestBooking,
  onBackToList,
  onAcceptTransaction,
  onDeclineTransaction,
  onMakePayment,
  transactionActionLoading,
}) {
  const isSeller = !isSelfConversation && currentUserId === conversation.sellerId;
  const isBuyer = !isSelfConversation && currentUserId && currentUserId !== conversation.sellerId;
  const transactionStatus = conversation.transactionStatus || "";
  const paymentStatus = (conversation.paymentStatus || "unpaid").toLowerCase();
  const hasPaymentAmount =
    conversation.cashShortfallDue !== null &&
    conversation.cashShortfallDue !== undefined &&
    conversation.agreedAmount !== null &&
    conversation.agreedAmount !== undefined;
  const outstandingBalance = Number(conversation.cashShortfallDue ?? conversation.agreedAmount ?? 0);
  const paymentComplete = paymentStatus === "fully_paid" || (hasPaymentAmount && outstandingBalance <= 0);
  const hasPendingTransaction = Boolean(
    conversation.transactionId &&
    isSeller &&
    (!transactionStatus || transactionStatus === "pending_seller_acceptance" || transactionStatus === "pending")
  );
  const hasAcceptedTransaction = Boolean(
    conversation.transactionId &&
    isSeller &&
    (transactionStatus === "accepted_pending_booking" || transactionStatus === "pending_booking") &&
    !paymentComplete
  );
  const hasExistingBooking = Boolean(
    conversation.bookingStatus &&
    conversation.bookingStatus !== "not_booked" &&
    conversation.bookingStatus !== "cancelled" &&
    conversation.bookingStatus !== "expired"
  );
  const buyerCanPay = Boolean(
    conversation.transactionId &&
    isBuyer &&
    hasExistingBooking &&
    outstandingBalance > 0 &&
    paymentStatus !== "fully_paid"
  );
  const requestText =
    conversation.transactionRequestText ||
    conversation.messages.find((message) => message.incoming && message.text?.includes("Transaction ID:"))?.text ||
    conversation.message ||
    "This conversation is attached to a transaction request.";

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

      {conversation.listingId && hasAcceptedTransaction ? (
        <section className={styles["booking-banner"]}>
          <p>
            {hasExistingBooking
              ? "A trade facility booking has been requested. Request a new booking if the slot or agreed price needs to change."
              : "Offer accepted. Request a safe trade facility booking to lock in the handover."}
          </p>
          <button type="button" className={styles["booking-button"]} onClick={onRequestBooking}>
            {hasExistingBooking ? "Request a new booking" : "Request facility booking"}
          </button>
        </section>
      ) : null}

      {buyerCanPay ? (
        <section className={styles["payment-banner"]}>
          <p>
            {paymentStatus === "pending_payment"
              ? "There is still an outstanding balance. Please pay the remaining amount before collection."
              : "The seller has requested a trade facility booking. Please make payment before the deadline to keep this slot reserved."}
          </p>
          {outstandingBalance > 0 ? (
            <strong>Amount due: R{outstandingBalance.toFixed(2)}</strong>
          ) : null}
          <button type="button" className={styles["payment-button"]} onClick={onMakePayment}>
            Make payment
          </button>
        </section>
      ) : null}

      {hasPendingTransaction ? (
        <section className={styles["transaction-actions"]}>
          <p>This conversation is attached to a pending transaction. Accept or decline the request.</p>
          <blockquote className={styles["transaction-request-text"]}>{requestText}</blockquote>
          <div className={styles["transaction-button-row"]}>
            <button
              type="button"
              className={styles["decline-button"]}
              onClick={onDeclineTransaction}
              disabled={transactionActionLoading}
            >
              Decline Offer
            </button>
            <button
              type="button"
              className={styles["accept-button"]}
              onClick={onAcceptTransaction}
              disabled={transactionActionLoading}
            >
              Accept Offer
            </button>
          </div>
        </section>
      ) : null}

      <section className={styles["messages-stream"]} aria-label="Messages">
        <p className={styles.timestamp}>{conversation.dateLabel}</p>

        {conversation.action && conversation.messages.length === 0 ? (
          <section className={styles["thread-intro"]}>
            <h2>Transaction started</h2>
            <p>
              {conversation.action === 'buy' && 'You created a purchase request for this listing.'}
              {conversation.action === 'offer' && 'You opened the offer thread. Send a message to negotiate the price.'}
              {conversation.action === 'trade' && 'You opened a trade request. Tell the seller what you want to trade and any cash supplement.'}
            </p>
            {conversation.transactionId ? (
              <p className={styles["transaction-hint"]}>Transaction ID: {conversation.transactionId}</p>
            ) : null}
          </section>
        ) : null}

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
                message.isSystem
                  ? `${styles["message-row"]} ${styles.system}`
                  : message.incoming
                  ? `${styles["message-row"]} ${styles.incoming}`
                  : `${styles["message-row"]} ${styles.outgoing}`
              }
            >
              {message.isSystem ? (
                <article className={styles["system-message"]}>
                  <p>{message.text}</p>
                  <time>{message.time}</time>
                </article>
              ) : (
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
              )}
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
