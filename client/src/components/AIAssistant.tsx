import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Bot, User, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "¡Hola! Soy tu asistente de IA para Four One Solutions. Puedo ayudarte con gestión de productos, análisis de ventas, configuración del sistema y más. ¿En qué puedo ayudarte hoy?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest(`/api/ai/chat`, {
        method: "POST",
        body: { message }
      });
    },
    onSuccess: (data: any) => {
      console.log('AI Response received:', data);
      if (data && data.response) {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + "_ai",
          content: data.response,
          isUser: false,
          timestamp: new Date()
        }]);
      } else {
        console.error('Invalid response format:', data);
        toast({
          title: "Error",
          description: "Respuesta de IA inválida",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      if (error.message.includes("AI service not configured")) {
        toast({
          title: "Servicio de IA no configurado",
          description: "Configure la clave API de Anthropic para usar el asistente de IA.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo procesar tu mensaje. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString() + "_user",
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(inputMessage);
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="relative">
            <Bot className="h-5 w-5" />
            <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-blue-500" />
          </div>
          Asistente de IA
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[80%] gap-2 ${
                    message.isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.isUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    {message.isUser ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      message.isUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.isUser
                          ? "text-blue-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu pregunta aquí..."
            disabled={chatMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || chatMutation.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}