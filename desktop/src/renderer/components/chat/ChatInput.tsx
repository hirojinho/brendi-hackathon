import React, { FormEvent, forwardRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled: boolean;
  placeholder?: string;
}

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Ask a question... (Press Enter to send)',
}, ref) => {
  return (
    <form className="chat-input-form" onSubmit={onSubmit}>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
});

