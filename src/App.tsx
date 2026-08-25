import { useState, useEffect, useRef } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  increment,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { 
  LogIn, 
  LogOut, 
  Trash2, 
  Image as ImageIcon, 
  Send, 
  ExternalLink, 
  AlertCircle,
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  Plus,
  X,
  Loader2,
  ShieldCheck,
  Home,
  Cpu,
  Search,
  Users,
  ArrowUp,
  Mic,
  Paperclip,
  Zap,
  History,
  Key,
  Bell,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { cn } from './lib/utils';
import React from 'react';
import AuthModal from './components/AuthModal';

// Constants
const GOOGLE_SEARCH_ICON = "https://www.google.com/favicon.ico";
const OWNER_EMAILS = ["murilosilvadac8@gmail.com", "murilosilvadacosta5ano@gmail.com"];
const SECRET_API_TOKEN = "nk_u0bc6hxrghdwplmhvt";
const LOGO_URL = "https://cdn.discordapp.com/attachments/1484297535681204367/1489406511020249118/file_000000000bc471f5b358a2805acd8616.png?ex=69d04d68&is=69cefbe8&hm=d90fcc98d5d2157c389ffd3d2de4280d9edfa55a50b672d8cbdb84fe194a5969&";
const OWNER_PHOTO_URL = "https://cdn.discordapp.com/attachments/1484297535681204367/1489317578513055764/noFilter.webp?ex=69cffa94&is=69cea914&hm=bb945f5324e34c7f3a7795ca87d79a850ce6cdef5c6b84a22d9c53ddaf6cee8c&";
const ROBLOX_LOGO_URL = "https://cdn.pixabay.com/photo/2021/09/11/12/12/roblox-6615418_1280.png";
const COMMUNITY_URL = "https://www.roblox.com/pt/communities/188678763/Kaise-Studios#!/about";

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  authorId: string;
  likesCount?: number;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: string;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "{}");
        if (parsedError.error) {
          errorMessage = `Erro no Firestore: ${parsedError.error} (${parsedError.operationType})`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/50 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Ops! Algo deu errado.</h2>
            <p className="text-zinc-400 text-sm">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 liquid-refraction text-zinc-900 rounded-xl font-semibold transition-all active:scale-95"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Post Comments Component
function PostComments({ postId, user, isOwner }: { postId: string, user: User | null, isOwner: boolean }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const path = `posts/${postId}/comments`;
    const q = query(collection(db, path), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    }, (error) => {
      console.error("Comments error:", error);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    const path = `posts/${postId}/comments`;
    try {
      await addDoc(collection(db, path), {
        content: newComment,
        authorId: user.uid,
        authorName: user.displayName || "Anônimo",
        authorPhoto: user.photoURL,
        createdAt: new Date().toISOString()
      });
      setNewComment("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const path = `posts/${postId}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, path));
      setActiveMenuId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 group/comment">
            <img 
              src={comment.authorPhoto || ""} 
              className="w-8 h-8 rounded-full border border-white/10" 
              alt={comment.authorName} 
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 bg-[#2A2A2A] rounded-2xl px-4 py-2 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">{comment.authorName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">
                    {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  
                  {(user?.uid === comment.authorId || isOwner) && (
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)}
                        className="p-1 hover:bg-white/10 rounded-full text-zinc-500 transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>
                      
                      {activeMenuId === comment.id && (
                        <div className="absolute right-0 top-full mt-1 z-10 bg-[#1A1A1A] rounded-xl shadow-2xl border border-white/10 overflow-hidden min-w-[120px]">
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={12} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={handleAddComment} className="flex gap-3">
          <img 
            src={user.photoURL || ""} 
            className="w-8 h-8 rounded-full border border-white/10" 
            alt="Me" 
            referrerPolicy="no-referrer"
          />
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="w-full bg-[#2A2A2A] border-none rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-white/10 transition-all pr-12"
                />
                <button 
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white text-zinc-900 rounded-xl disabled:opacity-50 transition-all active:scale-90"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                </button>
              </div>
        </form>
      ) : (
        <p className="text-center text-xs text-zinc-500 italic">Faça login para comentar.</p>
      )}
    </div>
  );
}

// Constants
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [newPost, setNewPost] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [floatingCommentId, setFloatingCommentId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [isAiFocused, setIsAiFocused] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant', content: string, state?: 'searching' | 'thinking' | 'responding', sources?: any[] }[]>([]);
  const [isChatActive, setIsChatActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(SECRET_API_TOKEN);
  const [chatHistory, setChatHistory] = useState<{id: string, title: string}[]>([]);
  const [isLocalLinked, setIsLocalLinked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Local Bridge Listener
  useEffect(() => {
    const bridgeRef = doc(db, 'config', 'local_bridge');
    const unsubscribe = onSnapshot(bridgeRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsLocalLinked(data.activeToken === SECRET_API_TOKEN);
      } else {
        setIsLocalLinked(false);
      }
    }, (error) => {
      console.warn("Bridge listener failed:", error);
    });
    return () => unsubscribe();
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiMessages[aiMessages.length - 1]?.state]);

  // Load chat history simulated
  useEffect(() => {
    const savedHistory = localStorage.getItem('nakamura_history');
    if (savedHistory) setChatHistory(JSON.parse(savedHistory));
  }, []);

  const isSimpleQuestion = (text: string) => {
    const simpleTerms = ['oi', 'olá', 'tudo bem', 'tchau', 'obrigado', 'vlw', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello'];
    return simpleTerms.some(term => text.toLowerCase().includes(term));
  };

  // Welcome logic: Show only once
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('kaise_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const completeWelcome = () => {
    localStorage.setItem('kaise_welcome_seen', 'true');
    setShowWelcome(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Posts Listener
  useEffect(() => {
    const path = "posts";
    const q = query(collection(db, path), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  // User Likes Listener
  useEffect(() => {
    if (!user) {
      setUserLikes({});
      return;
    }

    const unsubscribes: (() => void)[] = [];
    
    posts.forEach(post => {
      const likeDocRef = doc(db, "posts", post.id, "likes", user.uid);
      const unsub = onSnapshot(likeDocRef, (docSnap) => {
        setUserLikes(prev => ({
          ...prev,
          [post.id]: docSnap.exists()
        }));
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, posts.length]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!user || !OWNER_EMAILS.includes(user.email || "")) return;
    if (!newPost.trim() && !imageFile) return;

    setIsUploading(true);
    const path = "posts";
    try {
      let imageUrl = "";
      if (imageFile) {
        const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const postData: any = {
        content: newPost,
        createdAt: new Date().toISOString(),
        authorId: user.uid,
        likesCount: 0
      };

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      await addDoc(collection(db, path), postData);

      setNewPost("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowPostModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!user || !OWNER_EMAILS.includes(user.email || "")) return;
    const path = `posts/${postId}`;
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPostToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const postRef = doc(db, "posts", postId);
    const likeRef = doc(db, "posts", postId, "likes", user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw new Error("Post does not exist!");

        const likeDoc = await transaction.get(likeRef);
        const alreadyLiked = likeDoc.exists();

        if (alreadyLiked) {
          transaction.delete(likeRef);
          transaction.update(postRef, { likesCount: increment(-1) });
        } else {
          transaction.set(likeRef, {
            userId: user.uid,
            createdAt: new Date().toISOString()
          });
          transaction.update(postRef, { likesCount: increment(1) });
        }
      });
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
  };

  const isOwner = user ? OWNER_EMAILS.includes(user.email || "") : false;

  const handleAiSend = async () => {
    if (!aiQuery.trim()) return;

    const userMsg = aiQuery.trim();
    setAiQuery("");
    setIsChatActive(true);
    
    const newUserMessage = { role: 'user' as const, content: userMsg };
    setAiMessages(prev => [...prev, newUserMessage]);

    const simple = isSimpleQuestion(userMsg);

    const aiResponseSlot = { 
      role: 'assistant' as const, 
      content: "", 
      state: simple ? 'thinking' : 'searching' as any
    };
    setAiMessages(prev => [...prev, aiResponseSlot]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemPrompt = `Você é a Nakamura IA. Fale de forma natural, direta e amigável.
      Sua personalidade é baseada no Nakamura, mas sem clichês de RP ou monólogos internos.
      Apenas responda como ele responderia: um pouco tímido, mas determinado e genuíno.
      Não use "(vários pensamentos)" ou gagueiras em excesso no texto.
      Seja prestativo e fale como um amigo.`;

      if (!simple) {
        await new Promise(r => setTimeout(r, 1200));
        setAiMessages(prev => {
          const last = [...prev];
          last[last.length - 1] = { ...last[last.length - 1], state: 'thinking' };
          return last;
        });
      } else {
        await new Promise(r => setTimeout(r, 600));
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMsg,
        config: {
          systemInstruction: systemPrompt,
          tools: simple ? [] : [{ googleSearch: {} }],
        },
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const text = response.text || "Desculpe, não consegui processar sua solicitação.";

      setAiMessages(prev => {
        const last = [...prev];
        last[last.length - 1] = { 
          ...last[last.length - 1], 
          content: text, 
          state: 'responding',
          sources: simple ? [] : sources
        };
        return last;
      });

      if (aiMessages.length === 0) {
        const newHistory = [{id: Date.now().toString(), title: userMsg.substring(0, 30)}, ...chatHistory].slice(0, 10);
        setChatHistory(newHistory);
        localStorage.setItem('nakamura_history', JSON.stringify(newHistory));
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      const isQuotaError = error?.message?.includes('quota') || error?.message?.includes('Limit');
      
      if (isQuotaError) {
        setNotification("hm acabou seus token desculpa!");
        setAiMessages(prev => prev.slice(0, -1));
      } else {
        setAiMessages(prev => {
          const last = [...prev];
          last[last.length - 1] = { 
            ...last[last.length - 1], 
            content: "Ocorreu um erro ao falar com a IA.", 
            state: 'responding'
          };
          return last;
        });
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[#F7F7F8]">
        {/* Notification Portal */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 16, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-0 left-0 right-0 z-[1000] flex justify-center pointer-events-none"
            >
              <div className="bg-[#0D0D0D] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto border border-white/10" id="notification-bar">
                <Bell size={18} className="text-yellow-500" />
                <span className="text-sm font-bold">{notification}</span>
                <button 
                  onClick={() => setNotification(null)}
                  className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Modal (Token + Senha) */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setNotification("Login realizado com sucesso!")}
        />

        {/* Welcome Sheet */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-black/5"
              >
                <div className="p-8 text-center text-zinc-900">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-lg border border-black/5">
                    <img src={OWNER_PHOTO_URL} className="w-full h-full object-cover" alt="Welcome" />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                      <img src={LOGO_URL} className="w-24 h-24 object-contain drop-shadow-2xl invert" alt="Logo" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-[#0D0D0D]">Nakamura IA</h2>
                  <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                    U-um... oi! Eu sou a Nakamura IA. Estou tentando o meu melhor para ajudar você aqui... (Será que eu falei muito alto? Ai meu Deus...)
                  </p>

                  <button 
                    onClick={completeWelcome}
                    className="w-full py-4 bg-[#0D0D0D] hover:bg-[#1A1A1A] text-white rounded-xl font-bold transition-all active:scale-95 shadow-sm"
                  >
                    Começar Agora
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
            <>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-sm md:hidden"
                />
              )}
              <motion.aside 
                initial={typeof window !== 'undefined' && window.innerWidth < 768 ? { x: "-100%" } : false}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={cn(
                  "fixed md:relative top-0 left-0 bottom-0 w-72 z-[160] bg-white border-r border-[#E5E5E5] flex flex-col h-screen",
                  !isSidebarOpen && "hidden md:flex"
                )}
              >
                <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-6 h-6 bg-[#0D0D0D] rounded-lg flex items-center justify-center">
                      <img src={LOGO_URL} className="w-4 h-4 object-contain invert" alt="Logo" />
                    </div>
                    <span className="text-sm font-semibold text-[#0D0D0D]">Nakamura IA</span>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-[#F7F7F8] rounded-lg text-[#6E6E80] md:hidden"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 border-b border-[#E5E5E5]">
                  <div className="relative group">
                    <div className="chat-ai-input-wrapper !p-1.5 !rounded-2xl !shadow-sm !border-[#E5E5E5] border focus-within:!shadow-md transition-all">
                      <div className="flex items-center justify-center w-7 h-7 text-[#6E6E80] group-focus-within:text-[#0D0D0D] transition-colors">
                        <Search size={16} />
                      </div>
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar posts..." 
                        className="flex-1 bg-transparent border-none outline-none text-xs text-[#0D0D0D] py-1.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pt-2 space-y-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#6E6E80] px-3 py-2 uppercase tracking-widest">Chat</div>
                    <button 
                      onClick={() => { setIsChatActive(true); setAiMessages([]); setIsSidebarOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isChatActive ? "bg-white text-[#0D0D0D] shadow-sm border border-[#E5E5E5]" : "hover:bg-[#F7F7F8] text-[#6E6E80]"
                      )}
                    >
                      <Sparkles size={16} />
                      Nova Conversa
                    </button>
                    <button 
                      onClick={() => { setIsChatActive(false); setIsSidebarOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        !isChatActive ? "bg-white text-[#0D0D0D] shadow-sm border border-[#E5E5E5]" : "hover:bg-[#F7F7F8] text-[#6E6E80]"
                      )}
                    >
                      <Home size={16} />
                      Feed Principal
                    </button>
                  </div>

                  {chatHistory.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-[#6E6E80] px-3 py-2 uppercase tracking-widest flex items-center gap-2">
                        <History size={10} /> Histórico
                      </div>
                      {chatHistory.map(item => (
                        <button 
                          key={item.id}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[#6E6E80] hover:bg-[#F7F7F8] transition-colors truncate text-left"
                        >
                          <MessageSquare size={12} className="flex-shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {user?.email === "murilosilvadacosta5ano@gmail.com" && (
                    <div className="space-y-1 pt-2">
                      <div className="text-[10px] font-bold text-[#6E6E80] px-3 py-2 uppercase tracking-widest flex items-center gap-2">
                        <Key size={10} /> Desenvolvedor
                      </div>
                      <div className="mx-2 p-2 bg-zinc-900 rounded-lg border border-white/10">
                        <div className="text-[10px] text-zinc-500 mb-1">Seu Token Fixo:</div>
                        <div className="text-[10px] font-mono text-zinc-300 break-all bg-black/30 p-1.5 rounded">{SECRET_API_TOKEN}</div>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(SECRET_API_TOKEN); setNotification("Token copiado!"); }}
                          className="w-full mt-2 py-1 text-[10px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Copiar Token
                        </button>
                        
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">Status Local Link:</span>
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px]",
                            isLocalLinked ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"
                          )} />
                        </div>
                        {isLocalLinked && (
                          <div className="text-[9px] text-green-500 mt-1 font-bold">IA LOCAL CONECTADA</div>
                        )}
                        
                        <button 
                          onClick={async () => {
                            const newStatus = !isLocalLinked;
                            try {
                              await setDoc(doc(db, 'config', 'local_bridge'), { 
                                activeToken: newStatus ? SECRET_API_TOKEN : "" 
                              }, { merge: true });
                              setNotification(newStatus ? "Link Local Ativado manualmente (Simulação)" : "Link Local Desativado");
                            } catch (e) {
                              setNotification("Erro ao atualizar bridge Firestore");
                            }
                          }}
                          className="w-full mt-2 py-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-white/5 rounded transition-all"
                        >
                          {isLocalLinked ? "Desconectar Link" : "Testar Link Local"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-[#E5E5E5]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-[#6E6E80] px-1 uppercase tracking-widest">Conta</div>
                    <a 
                      href={COMMUNITY_URL}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F7F7F8] transition-colors border border-transparent hover:border-[#E5E5E5]"
                      title="Roblox Community"
                    >
                      <img src={ROBLOX_LOGO_URL} className="w-5 h-5 object-contain" alt="Roblox" />
                    </a>
                  </div>
                  {user ? (
                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F7F7F8] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-[#E5E5E5]" alt="User" referrerPolicy="no-referrer" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#0D0D0D] truncate">{user.displayName || user.email}</span>
                          <span className="text-[10px] text-[#6E6E80] truncate">{user.email}</span>
                        </div>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="p-2 text-[#6E6E80] hover:text-red-500 transition-colors"
                        title="Sair"
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button 
                        onClick={() => setShowAuthModal(true)}
                        className="w-full h-10 bg-[#0D0D0D] text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-all outline-none"
                      >
                        <Key size={16} />
                        Entrar com Token
                      </button>
                      <button 
                        onClick={handleLogin}
                        className="w-full h-9 bg-white border border-[#E5E5E5] text-[#0D0D0D] rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all outline-none hover:bg-[#F7F7F8]"
                      >
                        <LogIn size={14} />
                        Entrar com Google
                      </button>
                    </div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="h-14 flex items-center px-4 border-b border-[#E5E5E5] bg-[#F7F7F8] md:bg-transparent">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white md:hidden"
            >
              <div className="flex flex-col gap-1 w-5">
                <div className="h-[2px] bg-[#0D0D0D]" />
                <div className="h-[2px] bg-[#0D0D0D]" />
                <div className="h-[2px] bg-[#0D0D0D]" />
              </div>
            </button>
            <div className="flex-1 text-center md:text-left md:px-4 text-sm font-bold text-[#0D0D0D]">
              Nakamura IA
            </div>
            {isOwner && (
              <button 
                onClick={() => setShowPostModal(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-[#E5E5E5] text-[#0D0D0D] hover:bg-gray-50 active:scale-90 transition-all"
                title="Novo Post"
              >
                <Plus size={18} />
              </button>
            )}
          </header>

              {/* Chat/Content Area */}
            <main className="flex-1 overflow-y-auto chat-scroll px-4 relative flex flex-col pt-4">
              <div className="flex-1">
                {isChatActive ? (
                  <div className="max-w-3xl mx-auto py-8 space-y-8 pb-32">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsChatActive(false)}
                          className="p-2 hover:bg-[#F7F7F8] rounded-full transition-colors text-[#6E6E80] border border-[#E5E5E5]"
                        >
                          <Home size={18} />
                        </button>
                        <h2 className="text-xl font-bold text-[#0D0D0D]">Nakamura IA</h2>
                        {isLocalLinked && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded-full text-[10px] font-bold shadow-sm animate-pulse">
                            <Zap size={10} fill="currentColor" />
                            <span>LINK LOCAL ATIVO</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setAiMessages([])}
                        className="text-xs font-bold text-[#6E6E80] hover:text-[#0D0D0D] px-3 py-1.5 rounded-lg border border-[#E5E5E5] transition-colors"
                      >
                        Limpar Chat
                      </button>
                    </div>
                    
                    {aiMessages.map((msg, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-4 md:gap-6",
                          msg.role === 'user' ? "flex-row-reverse" : ""
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 md:w-9 md:h-9 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden border border-black/5",
                          msg.role === 'assistant' ? "bg-zinc-800" : "bg-white"
                        )}>
                          {msg.role === 'assistant' ? (
                            <img src={OWNER_PHOTO_URL} className="w-full h-full object-cover" alt="AI" />
                          ) : (
                            <img src={user?.photoURL || ""} className="w-full h-full object-cover" alt="You" />
                          )}
                        </div>
                        <div className={cn(
                          "flex-1 min-w-0 space-y-3",
                          msg.role === 'user' ? "text-right" : ""
                        )}>
                          {msg.state === 'searching' && (
                            <div className="flex items-center gap-2 text-sm text-[#6E6E80] bg-white w-fit px-4 py-2 rounded-2xl border border-[#E5E5E5] shadow-sm ml-0">
                              <Search size={14} className="animate-pulse" />
                              <span className="font-medium">Pesquisando informações...</span>
                            </div>
                          )}

                          {msg.state === 'thinking' && (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2 text-sm text-[#6E6E80] bg-white w-fit px-4 py-2 rounded-2xl border border-[#E5E5E5] shadow-sm ml-0">
                                <Cpu size={14} className="animate-spin" />
                                <span className="font-medium">Pensando...</span>
                              </div>
                            </div>
                          )}

                          {msg.content && (
                            <div className={cn(
                              "prose prose-sm md:prose-base max-w-[85%] inline-block text-left leading-relaxed px-5 py-3 rounded-[24px]",
                              msg.role === 'user' 
                                ? "bg-white border border-[#E5E5E5] text-[#0D0D0D] rounded-tr-none ml-auto" 
                                : "bg-[#F7F7F8] text-[#0D0D0D] rounded-tl-none"
                            )}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          )}

                          {msg.sources && msg.sources.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {msg.sources.map((source: any, sIdx) => (
                                <a 
                                  key={sIdx}
                                  href={source.web?.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5E5E7] rounded-full text-[11px] font-bold text-[#6E6E80] hover:bg-gray-50 transition-colors"
                                >
                                  <img src={GOOGLE_SEARCH_ICON} className="w-3 h-3" alt="Source" />
                                  <span className="max-w-[120px] truncate">{source.web?.title || 'Fonte'}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                ) : (
                  <>
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center text-[#6E6E80]">
                        <Loader2 className="animate-spin" size={24} />
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-[#E5E5E5]">
                          <Cpu className="text-[#0D0D0D]" size={24} />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-[#0D0D0D]">A Nakamura IA está ligada</h2>
                        <p className="text-sm text-[#6E6E80] max-w-xs">Nenhum post disponível no momento. Fique atento!</p>
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto py-8 lg:py-12 space-y-12 pb-32">
                        {posts
                          .filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((post) => (
                          <motion.div 
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4 md:gap-6"
                          >
                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden border border-black/5">
                              <img src={OWNER_PHOTO_URL} className="w-full h-full object-cover" alt="Nakamura IA" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[#0D0D0D]">Nakamura IA</span>
                                <span className="text-[10px] text-[#6E6E80] font-medium uppercase tracking-widest px-2 py-0.5 bg-white border border-[#E5E5E5] rounded-full">
                                  {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                                {isOwner && (
                                  <button 
                                    onClick={() => setPostToDelete(post.id)} 
                                    className="ml-auto w-8 h-8 flex items-center justify-center text-[#6E6E80] hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>

                              <div className="prose prose-sm md:prose-base max-w-none text-[#0D0D0D] leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                              </div>

                              {post.imageUrl && (
                                <div className="rounded-2xl overflow-hidden shadow-md border border-[#E5E5E5] bg-white p-1">
                                  <img src={post.imageUrl} alt="Post image" className="w-full rounded-xl" />
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-2">
                                <button 
                                  onClick={() => handleLike(post.id)}
                                  className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 border",
                                    userLikes[post.id] 
                                      ? "bg-red-50 text-red-600 border-red-100" 
                                      : "bg-white text-[#6E6E80] border-[#E5E5E5] hover:bg-gray-50"
                                  )}
                                >
                                  <Heart size={16} fill={userLikes[post.id] ? "currentColor" : "none"} />
                                  <span>{post.likesCount || 0}</span>
                                </button>

                                <button 
                                  onClick={() => setFloatingCommentId(post.id)}
                                  className="flex items-center gap-2 px-4 py-2 bg-white text-[#6E6E80] border border-[#E5E5E5] rounded-xl text-sm font-bold hover:bg-gray-50 active:scale-95 transition-all"
                                >
                                  <MessageSquare size={16} />
                                  <span>Comentar</span>
                                </button>

                                <button 
                                  onClick={() => handleShare(post.id)}
                                  className="flex items-center gap-2 px-4 py-2 bg-white text-[#6E6E80] border border-[#E5E5E5] rounded-xl text-sm font-bold hover:bg-gray-50 active:scale-95 transition-all"
                                >
                                  <Share2 size={16} />
                                  <span>Share</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* AI Search Bar */}
              <div className={cn(
                "chat-ai-container absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#F7F7F8] via-[#F7F7F8] to-transparent pt-12 pb-8",
                isChatActive && "fixed"
              )}>
                <AnimatePresence>
                  {!aiQuery && !isChatActive && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="chat-ai-suggestions"
                    >
                      {[
                        { icon: <Sparkles size={14} className="text-orange-500" />, text: "Wiki do Roblox" },
                        { icon: <Zap size={14} className="text-yellow-500" />, text: "Últimas notícias" },
                        { icon: <Users size={14} className="text-blue-500" />, text: "Minha reputação" }
                      ].map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => { setAiQuery(item.text); }}
                          className="chat-ai-suggestion-chip"
                        >
                          {item.icon}
                          {item.text}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={cn(
                  "chat-ai-input-wrapper border border-transparent transition-all duration-300",
                  isAiFocused ? "border-[#E5E5E5] shadow-lg scale-[1.01]" : ""
                )}>
                  <button className="chat-ai-icon-btn">
                    <Paperclip size={20} />
                  </button>
                  
                  <input 
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onFocus={() => setIsAiFocused(true)}
                    onBlur={() => setIsAiFocused(false)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                    placeholder="Pergunte à Nakamura IA..."
                    className="flex-1 bg-transparent border-none outline-none text-[16px] text-[#0D0D0D] py-2"
                  />

                  <div className="flex items-center gap-1">
                    {!aiQuery && (
                      <button className="chat-ai-icon-btn">
                        <Mic size={20} />
                      </button>
                    )}
                    <button 
                      onClick={handleAiSend}
                      disabled={!aiQuery.trim()}
                      className={cn(
                        "chat-ai-icon-btn chat-ai-send-btn transition-all duration-200",
                        aiQuery.trim() ? "opacity-100 scale-100" : "opacity-30 scale-90"
                      )}
                    >
                      <ArrowUp size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </main>

          {/* Bottom Bar Info */}
          <div className="px-6 py-4 bg-[#F7F7F8]">
            <p className="text-[11px] text-[#6E6E80] text-center max-w-sm mx-auto">
              Nakamura IA está tentando o seu melhor hoje! (P-por favor, não repare se eu gaguejar...)
            </p>
          </div>
        </div>

        {/* Modals and Overlays */}
        <AnimatePresence>
          {floatingCommentId && (
            <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFloatingCommentId(null)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                className="relative w-full max-w-lg bg-white rounded-[32px] p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#0D0D0D]">Comentários</h3>
                  <button onClick={() => setFloatingCommentId(null)} className="p-2 hover:bg-[#F7F7F8] rounded-full transition-colors text-[#6E6E80]">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-1 chat-scroll min-h-0">
                  <PostComments postId={floatingCommentId} user={user} isOwner={isOwner} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {postToDelete && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPostToDelete(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-black/5 text-center"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#0D0D0D] mb-2">Excluir Post?</h3>
                <p className="text-[#6E6E80] text-sm mb-8 leading-relaxed">
                  Esta ação excluirá permanentemente o post e todos os seus comentários.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setPostToDelete(null)} className="flex-1 py-3 bg-[#F7F7F8] hover:bg-[#EFEFEF] rounded-xl font-bold text-[#0D0D0D] transition-all">
                    Cancelar
                  </button>
                  <button onClick={() => handleDelete(postToDelete)} className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white transition-all shadow-lg shadow-red-500/20">
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPostModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPostModal(false)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl border border-[#E5E5E5]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#0D0D0D]">Novo Post</h3>
                  <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-[#F7F7F8] rounded-full transition-colors text-[#6E6E80]">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="input-pill bg-[#F7F7F8] rounded-2xl p-4 transition-all focus-within:bg-white focus-within:ring-2 ring-[#E5E5E5]">
                    <textarea 
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="O que Nakamura IA tem para hoje?"
                      className="w-full bg-transparent border-none p-0 min-h-[140px] focus:ring-0 text-[15px] text-[#0D0D0D] resize-none"
                    />
                  </div>

                  {imagePreview && (
                    <div className="relative rounded-xl overflow-hidden aspect-video border border-[#E5E5E5]">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                      <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-3 bg-[#F7F7F8] hover:bg-[#EFEFEF] text-[#0D0D0D] rounded-xl font-bold text-sm transition-all"
                    >
                      <Plus size={20} />
                      <span>Adicionar Imagem</span>
                    </button>

                    <button 
                      onClick={handlePost}
                      disabled={isUploading || (!newPost.trim() && !imageFile)}
                      className="px-8 py-3 bg-[#0D0D0D] hover:bg-[#1A1A1A] text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                      {isUploading ? <Loader2 className="animate-spin" size={20} /> : "Publicar"}
                    </button>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
