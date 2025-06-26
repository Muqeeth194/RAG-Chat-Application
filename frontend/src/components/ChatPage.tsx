import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Play, X, Bot, User, ArrowLeft } from "lucide-react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom"; // Add useParams and useNavigate

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  collectionName?: string;
}

interface ChatHookReturn {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent | React.MouseEvent) => Promise<void>;
  isLoading: boolean;
  resetMessages: () => void;
}

const assistantConfig = {
  name: "ChatPDF",
  description:
    "Ask questions, summarize content, or extract key insights—ChatPDF lets you interact with your uploaded PDFs like never before. Simply upload your document, and get instant, accurate answers powered by AI. Perfect for research, study, or quick document analysis!",
  description2: "Upload. Chat. Get Answers. Your PDFs, now conversational.",
  icon: Bot,
  color: "bg-blue-500",
};

export default function ChatPage() {
  const { pdfId } = useParams<{ pdfId: string }>(); // Extract pdfId from URL parameters

  const navigate = useNavigate();

  // console.log("PDF ID from URL params: ", pdfId);

  // Add error handling for missing or invalid pdfId
  if (!pdfId || pdfId.trim() === "") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Invalid PDF ID</h2>
            <p className="text-gray-600 mb-4">
              The PDF ID in the URL is missing or invalid. Please upload a PDF
              first to start chatting.
            </p>
            <Button
              className="flex items-center gap-2"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Go to Upload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function useMockChat(): ChatHookReturn {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const userMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "user",
        content: input,
        collectionName: pdfId,
      };

      console.log(userMessage);

      const updatedMessages = [...messages, userMessage];

      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/chat",
        updatedMessages
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.responseSent,
        collectionName: pdfId,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    };

    const resetMessages = () => {
      setMessages([]);
    };

    return {
      messages,
      input,
      handleInputChange,
      handleSubmit,
      isLoading,
      resetMessages,
    };
  }

  const [conversationActive, setConversationActive] = useState<boolean>(false);
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    resetMessages,
  } = useMockChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const PersonaIcon = assistantConfig.icon;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEndConversation = (): void => {
    resetMessages();
    setConversationActive(false);
  };

  const handleStartConversation = (): void => {
    setConversationActive(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center justify-between text-2xl">
            <Button
              className="flex items-center gap-2"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-center">AI Chat Bot</span>
            <div className="w-10"></div>{" "}
            {/* Invisible spacer to balance the button */}
          </CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <PersonaIcon className="h-3 w-3" />
              {assistantConfig.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {assistantConfig.description}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {!conversationActive && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-center space-y-2">
                <div
                  className={`w-16 h-16 rounded-full ${assistantConfig.color} flex items-center justify-center mx-auto`}
                >
                  <PersonaIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">
                  {assistantConfig.name}
                </h3>
                <p className="text-gray-500 max-w-sm">
                  {assistantConfig.description2}
                </p>
              </div>
              <Button
                onClick={handleStartConversation}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Conversation
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Send a message to start chatting with {assistantConfig.name}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-start gap-2 max-w-[80%]">
                    {message.role === "assistant" ? (
                      <div
                        className={`w-8 h-8 rounded-full ${assistantConfig.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <PersonaIcon className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div
                      className={`w-8 h-8 rounded-full ${assistantConfig.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <PersonaIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="rounded-lg p-3 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <CardFooter className="border-t p-4">
          <div className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Chat with ${assistantConfig.name}...`}
              className="flex-1"
              disabled={isLoading || !conversationActive}
            />
            <Button
              onClick={handleSubmit}
              size="icon"
              disabled={isLoading || !conversationActive || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
            {conversationActive && (
              <Button
                onClick={handleEndConversation}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                End Chat
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
