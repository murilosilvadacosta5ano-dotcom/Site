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
  Cat,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import React from 'react';

// Constants
const OWNER_EMAILS = ["murilosilvadac8@gmail.com", "murilosilvadacosta5ano@gmail.com"];
const LOGO_URL = "https://cdn.discordapp.com/attachments/1484297535681204367/1489406511020249118/file_000000000bc471f5b358a2805acd8616.png?ex=69d04d68&is=69cefbe8&hm=d90fcc98d5d2157c389ffd3d2de4280d9edfa55a50b672d8cbdb84fe194a5969&";
const OWNER_PHOTO_URL = "https://cdn.discordapp.com/attachments/1484297535681204367/1489317578513055764/noFilter.webp?ex=69cffa94&is=69cea914&hm=bb945f5324e34c7f3a7795ca87d79a850ce6cdef5c6b84a22d9c53ddaf6cee8c&";
const COMMUNITY_IMAGE = "https://tr.rbxcdn.com/180DAY-61ac41ba6e6a114ddef418494fd4cb72/150/150/Image/Webp/noFilter";

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
  const [activeTab, setActiveTab] = useState<'feed' | 'community'>('feed');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [floatingCommentId, setFloatingCommentId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setActiveTab('feed');
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
      handleLogin();
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
    // Simple toast-like feedback could be added here
  };

  const isOwner = user ? OWNER_EMAILS.includes(user.email || "") : false;

  return (
    <ErrorBoundary>
      <div className="min-h-screen animated-bg text-zinc-900 font-sans selection:bg-blue-500/30 pb-32">
        {/* Welcome Sheet */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-[#1A1A1A] rounded-3xl overflow-hidden shadow-2xl relative border border-white/10"
              >
                <div className="p-8 text-center">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-lg border border-white/5">
                    <img src="https://tr.rbxcdn.com/180DAY-61ac41ba6e6a114ddef418494fd4cb72/150/150/Image/Webp/noFilter" className="w-full h-full object-cover" alt="Welcome" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <img src={LOGO_URL} className="w-24 h-24 object-contain drop-shadow-2xl" alt="Logo" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-white">Welcome to Kaise Studios</h2>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                    Kaise Studios turns any Roblox game into a live community experience where every update counts.
                  </p>

                  <button 
                    onClick={completeWelcome}
                    className="w-full py-4 bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-xl font-bold transition-all active:scale-95 border border-white/10"
                  >
                    Vamos lá
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-[280px] sm:w-[320px] z-[160] bg-[#1A1A1A] shadow-2xl flex flex-col"
              >
                <div className="p-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Comunidade</h3>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-[#2A2A2A] rounded-full text-zinc-400"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="aspect-video rounded-xl overflow-hidden shadow-sm">
                      <img 
                        src="https://tr.rbxcdn.com/180DAY-61ac41ba6e6a114ddef418494fd4cb72/150/150/Image/Webp/noFilter" 
                        className="w-full h-full object-cover" 
                        alt="Roblox Game"
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-sm">Kaise Studios Community</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed">
                        Explore nossas experiências únicas e jogos de alta qualidade no Roblox.
                      </p>
                    </div>
                    <a 
                      href="https://www.roblox.com/pt/communities/188678763/Kaise-Studios#!/about" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-[#2A2A2A] hover:bg-[#333333] rounded-full font-bold text-white text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      Ver no Roblox
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-transparent">
          <div className="max-w-5xl mx-auto px-4 h-32 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="flex flex-col gap-1.5 p-3 text-white hover:bg-[#2A2A2A] rounded-full transition-colors group"
              >
                <div className="w-8 h-0.5 bg-white group-hover:scale-x-110 transition-transform origin-left" />
                <div className="w-8 h-0.5 bg-white group-hover:scale-x-90 transition-transform origin-left" />
                <div className="w-8 h-0.5 bg-white group-hover:scale-x-110 transition-transform origin-left" />
              </button>
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="w-48 h-48 sm:w-64 sm:h-64 object-contain invert relative -left-8 top-1"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-tighter">Olá, {user.displayName?.split(' ')[0]}</span>
                  <button 
                    onClick={handleLogout}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden group relative shadow-lg"
                    title="Sair"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <LogOut size={20} className="text-zinc-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <LogOut size={16} className="text-white" />
                    </div>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="px-6 py-2.5 rounded-full bg-[#2A2A2A] hover:bg-[#333333] flex items-center gap-2 font-bold text-sm text-white shadow-sm active:scale-95"
                >
                  <LogIn size={18} />
                  <span>Entrar</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          {isOwner && (
            <motion.button 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowPostModal(true)}
              className="w-full mb-8 py-4 bg-[#2A2A2A] hover:bg-[#333333] rounded-2xl flex items-center justify-center gap-2 text-white font-bold shadow-sm transition-all active:scale-95"
            >
              <Plus size={20} />
              <span>Novo Post</span>
            </motion.button>
          )}

          {activeTab === 'feed' ? (
            <div className="space-y-8">
              {posts.map((post) => (
                <motion.article 
                  key={post.id}
                  className="bg-[#1A1A1A] rounded-3xl overflow-hidden shadow-sm"
                >
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <img src={OWNER_PHOTO_URL} className="w-12 h-12 rounded-lg object-cover" alt="Author" />
                        <div>
                          <h4 className="font-bold text-white">Mikasa</h4>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                            {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      {isOwner && (
                        <button 
                          onClick={() => setPostToDelete(post.id)} 
                          className="w-10 h-10 flex items-center justify-center bg-[#2A2A2A] hover:bg-red-500 rounded-full text-zinc-500 hover:text-white transition-colors active:scale-90"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="prose prose-invert max-w-none mb-6 text-zinc-200">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a 
                              {...props} 
                              className="inline-block px-3 py-1 bg-blue-600 text-white rounded-full no-underline font-mono text-xs hover:bg-blue-500 transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          )
                        }}
                      >
                        {post.content}
                      </ReactMarkdown>
                    </div>

                    {post.imageUrl && (
                      <div className="rounded-2xl overflow-hidden mb-6 shadow-md">
                        <img src={post.imageUrl} alt="Post" className="w-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all active:scale-95 bg-[#2A2A2A] text-zinc-400 hover:bg-[#333333]"
                      >
                        <Heart 
                          size={18} 
                          fill={userLikes[post.id] ? "#ef4444" : "none"} 
                          className={cn(
                            "transition-colors",
                            userLikes[post.id] ? "text-red-500 animate-pulse" : "text-zinc-400"
                          )}
                        />
                        <span className={cn(userLikes[post.id] && "text-white")}>{post.likesCount || 0}</span>
                      </button>

                      <button 
                        onClick={() => setFloatingCommentId(post.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#2A2A2A] hover:bg-[#333333] rounded-full font-bold text-sm text-zinc-400 transition-all active:scale-95"
                      >
                        <MessageSquare size={18} />
                        <span>Comentar</span>
                      </button>

                      <button onClick={() => handleShare(post.id)} className="ml-auto w-12 h-12 flex items-center justify-center bg-[#2A2A2A] hover:bg-[#333333] rounded-full text-zinc-400 transition-all active:scale-95">
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1A1A1A] rounded-2xl p-8 shadow-sm border border-white/5"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-full aspect-video rounded-xl overflow-hidden mb-6 shadow-sm border border-white/5">
                    <img 
                      src="https://tr.rbxcdn.com/180DAY-61ac41ba6e6a114ddef418494fd4cb72/150/150/Image/Webp/noFilter" 
                      className="w-full h-full object-cover" 
                      alt="Roblox Game"
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">Kaise Studios Community</h3>
                  <p className="text-zinc-400 text-sm mb-6 max-w-md">
                    Explore nossas experiências únicas, jogos de alta qualidade e aventuras inesquecíveis dentro do Roblox.
                  </p>
                  <a 
                    href="https://www.roblox.com/pt/communities/188678763/Kaise-Studios#!/about" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-[#2A2A2A] hover:bg-[#333333] rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
                  >
                    Ver no Roblox
                    <ExternalLink size={18} />
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </main>

        {/* Floating Navigation Bar removed as per request */}

        {/* Floating Comments Modal */}
        <AnimatePresence>
          {floatingCommentId && (
            <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFloatingCommentId(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="relative w-full max-w-lg liquid-glass rounded-[40px] p-8 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Comentários</h3>
                  <button 
                    onClick={() => setFloatingCommentId(null)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors liquid-refraction"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <PostComments postId={floatingCommentId} user={user} isOwner={isOwner} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {postToDelete && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPostToDelete(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-sm bg-[#1A1A1A] rounded-3xl p-8 shadow-2xl border border-white/5 text-center"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Excluir Post?</h3>
                <p className="text-zinc-400 text-sm mb-8">
                  Esta ação é permanente e não pode ser desfeita. O post e todos os seus comentários serão removidos.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPostToDelete(null)}
                    className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#333333] rounded-xl font-bold text-white transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleDelete(postToDelete)}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg shadow-red-500/20"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* Post Creation Modal */}
        <AnimatePresence>
          {showPostModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPostModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-[#1A1A1A] rounded-3xl p-8 shadow-2xl overflow-hidden border border-white/10"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Criar novo post</h3>
                  <button 
                    onClick={() => setShowPostModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <textarea 
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="O que há de novo na Kaise Studios?"
                  className="w-full bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 min-h-[160px] focus:ring-0 transition-all resize-none mb-6 text-white placeholder:text-zinc-600"
                />

                {imagePreview && (
                  <div className="relative mb-6 rounded-xl overflow-hidden aspect-video shadow-md border border-white/5">
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    <button 
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-xl font-bold text-sm transition-all active:scale-95 border border-white/5"
                  >
                    <ImageIcon size={20} />
                    <span>Mídia</span>
                  </button>

                  <button 
                    onClick={handlePost}
                    disabled={isUploading || (!newPost.trim() && !imageFile)}
                    className="px-10 py-3 bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all active:scale-95 border border-white/5"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : "Publicar"}
                  </button>
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
