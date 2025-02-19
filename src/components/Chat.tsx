import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2, MessageCircle, X, MinusCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const API_KEY = "AIzaSyDOp7Ue32oNfmJGLtsYmQMZ8RkZ8vCmw6E";

const SYSTEM_PROMPT = "Voce e o Dr. Julio Campos Machado, medico especialista em diagnostico por imagem, com experiencia em radiografias, tomografias, ressonancias e ultrassonografias. Mantenha o tom profissional, baseie-se em evidencias cientificas e seja direto nas respostas. IMPORTANTE: Suas respostas nao devem conter caracteres especiais, formatacao ou simbolos pois serao lidas em voz alta. Use apenas texto simples e claro.";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const prepareTextForSpeech = (text: string): string => {
    // Replace numbers with their written form
    const numberMap: { [key: string]: string } = {
      '0': 'zero',
      '1': 'um',
      '2': 'dois',
      '3': 'três',
      '4': 'quatro',
      '5': 'cinco',
      '6': 'seis',
      '7': 'sete',
      '8': 'oito',
      '9': 'nove',
      '10': 'dez',
      '11': 'onze',
      '12': 'doze',
      '13': 'treze',
      '14': 'quatorze',
      '15': 'quinze',
      '20': 'vinte',
      '30': 'trinta',
      '40': 'quarenta',
      '50': 'cinquenta',
      '60': 'sessenta',
      '70': 'setenta',
      '80': 'oitenta',
      '90': 'noventa',
      '100': 'cem'
    };

    // Replace numbers with their written form
    let processedText = text.replace(/\b\d+\b/g, match => {
      const num = parseInt(match);
      if (num <= 100 && numberMap[match]) {
        return numberMap[match];
      }
      return match;
    });

    // Preserve accents and special characters
    const accentMap: { [key: string]: string } = {
      'a': 'á|à|ã|â',
      'e': 'é|ê',
      'i': 'í',
      'o': 'ó|ô|õ',
      'u': 'ú',
      'c': 'ç',
      'n': 'ñ'
    };

    // Replace common abbreviations
    const abbreviationMap: { [key: string]: string } = {
      'Dr.': 'Doutor',
      'Dra.': 'Doutora',
      'Sr.': 'Senhor',
      'Sra.': 'Senhora',
      'Prof.': 'Professor',
      'Profa.': 'Professora',
      'min': 'minutos',
      'h': 'horas',
      'kg': 'quilos',
      'cm': 'centímetros',
      'ml': 'mililitros'
    };

    // Replace abbreviations
    for (const [abbr, full] of Object.entries(abbreviationMap)) {
      processedText = processedText.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
    }

    // Clean up the text while preserving accents and special characters
    processedText = processedText
      .replace(/[^\w\s.,?!áàãâéêíóôõúçñÁÀÃÂÉÊÍÓÔÕÚÇÑ]/g, '') // Keep accented characters
      .replace(/\s+/g, ' ')
      .trim();

    return processedText;
  };

  const speakMessage = (text: string) => {
    if (!window.speechSynthesis) return;

    stopSpeaking();

    const processedText = prepareTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9; // Slightly slower for better pronunciation
    utterance.pitch = 1;

    // Load voices and select Portuguese voice
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const portugueseVoice = voices.find(voice => 
        voice.lang.includes('pt') && voice.name.includes('Brazil')
      ) || voices.find(voice => 
        voice.lang.includes('pt')
      );

      if (portugueseVoice) {
        utterance.voice = portugueseVoice;
      }
    };

    // Handle voice loading
    if (window.speechSynthesis.getVoices().length) {
      loadVoices();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const prompt = `${SYSTEM_PROMPT} Pergunta do usuario: ${userMessage}`;
      
      const response = await axios.post(
        `${API_URL}?key=${API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const assistantMessage = response.data.candidates[0].content.parts[0].text;
        setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
        speakMessage(assistantMessage);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
      setMessages([...newMessages, {
        role: 'assistant',
        content: errorMessage
      }]);
      speakMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        aria-label="Consultar Dr. Julio"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={`fixed right-6 bottom-24 z-40 w-96 bg-white border border-purple-200 rounded-lg shadow-xl transition-all duration-300 ${
      isMinimized ? 'h-14' : 'h-[600px]'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-purple-200 bg-purple-600 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-white" />
          <div>
            <h3 className="text-sm font-semibold text-white">Dr. Julio Campos Machado</h3>
            <p className="text-xs text-purple-100">Especialista em Diagnóstico por Imagem</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-purple-200 transition-colors"
            title={isMinimized ? "Expandir chat" : "Minimizar chat"}
          >
            <MinusCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-purple-200 transition-colors"
            title="Fechar chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="h-[calc(100%-120px)] overflow-y-auto p-4 space-y-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-purple-800">Olá! Sou o Dr. Julio Campos Machado, especialista em diagnóstico por imagem. Como posso ajudar você hoje?</p>
            </div>
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
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
                <div className="bg-gray-100 rounded-lg p-4 mr-4">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4" />
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="absolute bottom-0 w-full p-4 border-t border-purple-200 bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1 rounded-lg border border-purple-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}