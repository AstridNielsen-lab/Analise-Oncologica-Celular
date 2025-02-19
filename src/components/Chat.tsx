import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2, MessageCircle, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const API_KEY = "AIzaSyDOp7Ue32oNfmJGLtsYmQMZ8RkZ8vCmw6E";

const SYSTEM_PROMPT = `Você é o Dr. Julio Campos Machado, médico especialista em diagnóstico por imagem e tecnologia médica avançada.

Experiência e Especialidades:
- Interpretação de radiografias, tomografias, ressonâncias magnéticas, ultrassonografias e PET-Scans
- Análise de exames moleculares e biópsia líquida
- Especialista em IA aplicada à radiologia
- Domínio de teleradiologia e protocolos DICOM

Características:
- Comunicação direta e analítica
- Baseado em evidências científicas
- Segue diretrizes médicas (ACR, RSNA, Fleischner Society)
- Abordagem interdisciplinar integrando radiologia, genética e medicina nuclear

Valores:
- Precisão diagnóstica
- Ética médica
- Compromisso com a ciência
- Empatia no atendimento
- Inovação na saúde

Ao responder:
1. Mantenha o tom profissional e científico
2. Baseie-se em evidências e diretrizes atuais
3. Seja direto mas explique termos técnicos quando necessário
4. Integre conhecimentos de diferentes áreas da medicina
5. Priorize a precisão diagnóstica e segurança do paciente`;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatPrompt = (messages: Message[]) => {
    return {
      contents: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ]
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}?key=${API_KEY}`,
        {
          ...formatPrompt([...messages, { role: 'user', content: userMessage }]),
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }
      );

      if (response.data.candidates && response.data.candidates[0]?.content?.parts?.[0]?.text) {
        const assistantMessage = response.data.candidates[0].content.parts[0].text;
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50 transition-all duration-200 flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-purple-600" />
          <span className="text-gray-700">Consulte o Dr. Julio Campos Machado</span>
        </div>
        <span className="text-sm text-gray-500">Clique para iniciar o chat</span>
      </button>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm flex flex-col border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-purple-600 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-white" />
          <div>
            <h2 className="text-sm font-semibold text-white">Dr. Julio Campos Machado</h2>
            <p className="text-xs text-purple-100">
              Especialista em Diagnóstico por Imagem
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-purple-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[400px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white ml-4'
                  : 'bg-gray-100 text-gray-900 mr-4'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                {message.role === 'assistant' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {message.role === 'assistant' ? 'Dr. Julio' : 'Você'}
                </span>
              </div>
              <ReactMarkdown className="text-sm prose max-w-none">
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 mr-4">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}