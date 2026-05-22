/*
Module: MessagesInput.jsx
Purpose: Composer component for sending messages with optional attachments and emoji.
Units: local draft state, file attachment handling, emoji picker, send handler
Flow: Maintains draft and attachment, calls `onSendMessage` prop to perform upload/insert.
*/

import { useState, useRef } from "react";
import styles from "./Messages.module.css";

const EMOJI_OPTIONS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "💯"];

function MessageInput({ onSendMessage, disabled = false }) {
  // Local draft state for the text input.
  const [inputValue, setInputValue] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const handleAddAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Keep the real File object so the parent can upload it to Supabase Storage.
      setAttachedFile(file);
      // Reset the input so selecting the same file again still triggers change.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
  };

  const handleToggleEmojiPicker = () => {
    setShowEmojiPicker((current) => !current);
  };

  const handleSelectEmoji = (emoji) => {
    setInputValue((current) => `${current}${emoji}`);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (inputValue.trim() || attachedFile) {
      // Parent returns true on success so we only clear input when the upload and insert succeed.
      const sent = await onSendMessage(inputValue, attachedFile);
      if (sent) {
        setInputValue("");
        setAttachedFile(null);
        setShowEmojiPicker(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSend();
  };

  return (
    <form className={styles["message-input-area"]} onSubmit={handleSubmit}>
      <button 
        type="button" 
        className={styles["composer-action"]} 
        aria-label="Add attachment" 
        disabled={disabled}
        onClick={handleAddAttachment}
      >
        Add
      </button>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*,application/pdf"
        className={styles["visually-hidden"]}
        aria-hidden="true"
      />
      {attachedFile && (
        <section className={styles["attachment-preview"]}>
          <p>{attachedFile.name}</p>
          <button
            type="button"
            className={styles["remove-attachment"]}
            onClick={handleRemoveAttachment}
            aria-label="Remove attachment"
          >
            ✕
          </button>
        </section>
      )}
      {showEmojiPicker ? (
        <section className={styles["emoji-picker"]} aria-label="Emoji picker">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles["emoji-option"]}
              onClick={() => handleSelectEmoji(emoji)}
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </section>
      ) : null}
      <label className={styles["visually-hidden"]} htmlFor="message-composer">
        Write a message
      </label>
      <input
        ref={inputRef}
        id="message-composer"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Write a message..."
        className={styles["message-textarea"]}
        autoComplete="off"
        disabled={disabled}
      />
      <button
        type="button"
        className={styles["composer-action"]}
        aria-label="Insert emoji"
        aria-pressed={showEmojiPicker}
        disabled={disabled}
        onClick={handleToggleEmojiPicker}
      >
        Emoji
      </button>
      <button
        type="submit"
        className={styles["send-button"]}
        disabled={(!inputValue.trim() && !attachedFile) || disabled}
        aria-label="Send message"
      >
        {disabled ? "Sending..." : "Send"}
      </button>
    </form>
  );
}

export default MessageInput;
