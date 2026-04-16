import { useState } from "react";
import styles from "./Messages.module.css";

function MessageInput({ onSendMessage, disabled = false }) {
  // Local draft state for the text input.
  const [inputValue, setInputValue] = useState("");

  const handleSend = async () => {
    if (inputValue.trim()) {
      // Parent returns true on success so we only clear input when DB insert succeeds.
      const sent = await onSendMessage(inputValue);
      if (sent) {
        setInputValue("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSend();
  };

  return (
    <form className={styles["message-input-area"]} onSubmit={handleSubmit}>
      <button type="button" className={styles["composer-action"]} aria-label="Add attachment" disabled={disabled}>
        Add
      </button>
      <label className={styles["visually-hidden"]} htmlFor="message-composer">
        Write a message
      </label>
      <input
        id="message-composer"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Write a message..."
        className={styles["message-textarea"]}
        autoComplete="off"
        disabled={disabled}
      />
      <button type="button" className={styles["composer-action"]} aria-label="Insert emoji" disabled={disabled}>
        Emoji
      </button>
      <button
        type="submit"
        className={styles["send-button"]}
        disabled={!inputValue.trim() || disabled}
        aria-label="Send message"
      >
        {disabled ? "Sending..." : "Send"}
      </button>
    </form>
  );
}

export default MessageInput;
