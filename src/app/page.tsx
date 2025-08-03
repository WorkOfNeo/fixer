'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Bot, User, Send } from 'lucide-react'
import { toast } from 'react-toastify'
import DataDisplay from '@/components/DataDisplay'
import { TabbedInterface } from '@/components/TabbedInterface'
import 'react-toastify/dist/ReactToastify.css'

interface ConversationMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  data?: any
  intent?: any
}

// Typing animation component
const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="flex max-w-3xl flex-row">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 mr-3">
        <Bot className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="inline-block px-4 py-3 rounded-2xl bg-white border border-gray-200">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default function Home() {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentIntent, setCurrentIntent] = useState<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, isLoading])

  const handleSend = async () => {
    if (!message.trim()) return

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    setConversation(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: conversation,
          isClarification: !!currentIntent,
          currentIntent
        })
      })

      const result = await response.json()

      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: result.message,
        timestamp: new Date(),
        data: result.data,
        intent: result.intent
      }

      setConversation(prev => [...prev, aiMessage])
      setCurrentIntent(result.requiresClarification ? result.intent : null)

      if (result.success && result.data) {
        toast.success('Action completed successfully!')
      }
      if (!result.success) {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setConversation(prev => [...prev, errorMessage])
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TabbedInterface>
        <div className="flex flex-col h-full">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-16 h-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to 2-BIZ AI Assistant</h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  I can help you with stock checks, sales orders, and business operations. 
                  Just ask me anything!
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>Try: "Check stock for RANY"</p>
                  <p>Try: "Order 50 RANY WHITE for ABC Corp"</p>
                  <p>Try: "What's the available stock for ABC123?"</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {conversation.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-3xl ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.type === 'user' ? 'bg-blue-600 ml-3' : 'bg-gray-200 mr-3'
                      }`}>
                        {msg.type === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      
                      {/* Message */}
                      <div className={`flex-1 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block px-4 py-3 rounded-2xl ${
                          msg.type === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}>
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                          
                          {/* Data display for AI messages */}
                          {msg.type === 'ai' && msg.data && (
                            <DataDisplay data={msg.data} message={msg.content} />
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <div className={`text-xs text-gray-500 mt-1 ${
                          msg.type === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {isLoading && <TypingIndicator />}
                
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-200 px-4 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here... (e.g., 'Check stock for RANY' or 'Order 50 RANY WHITE for ABC Corp')"
                    disabled={isLoading}
                    className="pr-12 resize-none"
                    style={{ minHeight: '44px' }}
                  />
                </div>
                <Button 
                  onClick={handleSend} 
                  disabled={isLoading || !message.trim()}
                  size="icon"
                  className="h-11 w-11 flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      </TabbedInterface>
    </div>
  )
} 