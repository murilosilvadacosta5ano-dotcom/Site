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
  getDocFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, googleProvider } from './firebase';
import { LogIn, LogOut, Trash2, Image as ImageIcon, Send, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

const OWNER_EMAIL = "murilosilvadacosta5ano@gmail.com";
const LOGO_URL = "https://cdn.discordapp.com/attachments/1484297535681204367/1489314650045808731/file_00000000b5b871f5b5e8e0ca1017c4dd.png?ex=69cff7da&is=69cea65a&hm=60843ae569e8521d85b7e0d62999304bdebde0a349fa6c3da7c07b73fc5d83ee&";
const OWNER_PHOTO_URL = "https://cdn.discordapp.com/attachments/1484297535681204367/1489317578513055764/noFilter.webp?ex=69cffa94&is=69cea914&hm=bb945f5324e34c7f3a7795ca87d79a850ce6cdef5c6b84a22d9c53ddaf6cee8c&";

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  authorId: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DevTools Protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        window.location.href = "https://www.google.com";
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    // Detect DevTools by window size change (rough check)
    const threshold = 160;
    const checkDevTools = () => {
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        window.location.href = "https://www.google.com";
      }
    };
    
    const interval = setInterval(checkDevTools, 1000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(interval);
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Posts Listener
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });
    return () => unsubscribe();
  }, []);

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

  const handlePost = async () => {
    if (!user || user.email !== OWNER_EMAIL) return;
    if (!newPost.trim() && !imageFile) return;

    setIsUploading(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "posts"), {
        content: newPost,
        imageUrl,
        createdAt: new Date().toISOString(),
        authorId: user.uid
      });

      setNewPost("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Post Error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!user || user.email !== OWNER_EMAIL) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const isOwner = user?.email === OWNER_EMAIL;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={LOGO_URL} 
              alt="Kaise Studios Logo" 
              className="w-10 h-10 rounded-full object-cover border border-zinc-700"
              referrerPolicy="no-referrer"
            />
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">Kaise Studios</h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.displayName}</p>
                  <p className="text-xs text-zinc-500">Comunidade</p>
                </div>
                <img 
                  src={user.photoURL || ""} 
                  alt="User Avatar" 
                  className="w-8 h-8 rounded-full border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-[6px] border border-white/20 rounded-full transition-all active:scale-95"
              >
                <LogIn size={18} />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Owner Profile Card */}
        <section className="mb-12 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25"></div>
            <img 
              src={OWNER_PHOTO_URL} 
              alt="Owner" 
              className="relative w-24 h-24 rounded-full object-cover border-2 border-zinc-800"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-2xl font-bold mb-1">Dono da Comunidade</h2>
          <p className="text-zinc-400 max-w-md">Bem-vindo à Kaise Studios! Aqui compartilhamos novidades e criações do nosso estúdio de Roblox.</p>
        </section>

        {/* Post Creation (Restricted) */}
        {isOwner && (
          <section className="mb-12 p-6 bg-white/5 backdrop-blur-[6px] border border-white/10 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send size={18} className="text-blue-400" />
              Criar Novo Post
            </h3>
            <textarea 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="O que há de novo na Kaise Studios?"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none mb-4"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                    imageFile ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  )}
                >
                  <ImageIcon size={18} />
                  <span>{imageFile ? "Imagem Selecionada" : "Adicionar Imagem"}</span>
                </button>
                {imageFile && (
                  <button 
                    onClick={() => {
                      setImageFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>

              <button 
                onClick={handlePost}
                disabled={isUploading || (!newPost.trim() && !imageFile)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-medium transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {isUploading ? "Postando..." : "Postar"}
              </button>
            </div>
          </section>
        )}

        {/* Posts List */}
        <div className="space-y-8">
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-white/5 backdrop-blur-[6px] border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Delete Button (Owner Only) */}
                {isOwner && (
                  <button 
                    onClick={() => handleDelete(post.id)}
                    className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Excluir Post"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {post.imageUrl && (
                  <div className="w-full aspect-video overflow-hidden border-b border-zinc-800">
                    <img 
                      src={post.imageUrl} 
                      alt="Post content" 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => {
                          const isLink = props.href?.startsWith('http') || props.href?.startsWith('www');
                          return (
                            <a 
                              {...props} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={cn(
                                "inline-flex items-center gap-1 transition-all",
                                isLink ? "bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-md hover:bg-blue-600/30 no-underline" : "text-blue-400 hover:underline"
                              )}
                            >
                              {props.children}
                              <ExternalLink size={12} />
                            </a>
                          );
                        },
                        p: ({ children }) => {
                          // Custom link detection for plain text that doesn't get caught by markdown
                          if (typeof children === 'string') {
                            const parts = children.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);
                            return (
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {parts.map((part, i) => {
                                  if (part.match(/^https?:\/\//) || part.match(/^www\./)) {
                                    const href = part.startsWith('www.') ? `https://${part}` : part;
                                    return (
                                      <a 
                                        key={i}
                                        href={href}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-md hover:bg-blue-600/30 transition-all no-underline mx-0.5"
                                      >
                                        {part}
                                        <ExternalLink size={12} />
                                      </a>
                                    );
                                  }
                                  return part;
                                })}
                              </p>
                            );
                          }
                          return <p className="whitespace-pre-wrap break-words leading-relaxed">{children}</p>;
                        }
                      }}
                    >
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
                    <span>Postado em {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      Kaise Studios Official
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-20 bg-white/5 border border-dashed border-zinc-800 rounded-2xl">
              <p className="text-zinc-500">Nenhum post ainda. Fique ligado!</p>
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 border-t border-zinc-900 mt-20">
        <div className="max-w-4xl mx-auto px-4 text-center text-zinc-600 text-sm">
          <p>© {new Date().getFullYear()} Kaise Studios. Todos os direitos reservados.</p>
          <p className="mt-2">Desenvolvido para a comunidade Roblox.</p>
        </div>
      </footer>
    </div>
  );
}
