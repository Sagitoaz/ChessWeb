import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { clsx } from 'clsx'
import { Send } from 'lucide-react'

/**
 * GameChat Component
 * Chat box for in-game communication
 */
const GameChat = ({
  messages = [],
  onSendMessage,
  currentUserId,
  disabled = false,
  maxMessages = 100,
}) => {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()

    const trimmed = inputText.trim()
    if (!trimmed || disabled) return

    onSendMessage?.(trimmed)
    setInputText('')
    inputRef.current?.focus()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Limit displayed messages
  const displayedMessages = messages.slice(-maxMessages)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {displayedMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          displayedMessages.map((msg, index) => {
            const isOwnMessage = msg.userId === currentUserId
            const isSystemMessage = msg.type === 'system'

            return (
              <div
                key={msg.id || index}
                className={clsx('flex', {
                  'justify-end': isOwnMessage && !isSystemMessage,
                  'justify-start': !isOwnMessage && !isSystemMessage,
                  'justify-center': isSystemMessage,
                })}
              >
                <div
                  className={clsx('max-w-[80%] rounded-lg px-3 py-2', {
                    'bg-blue-500 text-white': isOwnMessage && !isSystemMessage,
                    'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100':
                      !isOwnMessage && !isSystemMessage,
                    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 text-xs':
                      isSystemMessage,
                  })}
                >
                  {!isSystemMessage && !isOwnMessage && (
                    <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                      {msg.username || 'Opponent'}
                    </div>
                  )}

                  <div className="text-sm whitespace-pre-wrap break-words">{msg.text}</div>

                  {msg.timestamp && (
                    <div
                      className={clsx('text-xs mt-1', {
                        'text-blue-100': isOwnMessage,
                        'text-gray-500 dark:text-gray-400': !isOwnMessage && !isSystemMessage,
                        'text-yellow-700 dark:text-yellow-400': isSystemMessage,
                      })}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? 'Chat disabled' : 'Type a message...'}
            disabled={disabled}
            maxLength={200}
            className={clsx(
              'flex-1 px-3 py-2 border rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
              {
                'bg-gray-100 cursor-not-allowed': disabled,
                'bg-white': !disabled,
              }
            )}
          />

          <button
            type="submit"
            disabled={disabled || !inputText.trim()}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              {
                'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed':
                  disabled || !inputText.trim(),
                'bg-blue-500 hover:bg-blue-600 text-white': !disabled && inputText.trim(),
              }
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

GameChat.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      userId: PropTypes.string,
      username: PropTypes.string,
      text: PropTypes.string.isRequired,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      type: PropTypes.oneOf(['user', 'system']),
    })
  ),
  onSendMessage: PropTypes.func,
  currentUserId: PropTypes.string,
  disabled: PropTypes.bool,
  maxMessages: PropTypes.number,
}

export default GameChat
