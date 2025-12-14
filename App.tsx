import React, { useState, useEffect } from 'react';
import VectoraApp from './VectoraApp';
import TrigoApp from './TrigoApp';
import LoginScreen from './components/LoginScreen';
import { User } from './types';
import { supabase } from './utils/supabaseClient';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [currentModule, setCurrentModule] = useState<'home' | 'vectora' | 'trigo'>('home');

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`
        });
      }
      setLoadingSession(false);
    }).catch(err => {
      console.warn("Failed to check session:", err);
      setLoadingSession(false);
    });

    // 2. Listen for auth changes (Login, Logout, Auto-refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
         setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`
        });
      } else {
        setUser(null);
        setCurrentModule('home');
      }
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleLoginGoogle = async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin // Retorna para a mesma página após login
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error("Erro ao logar com Google:", error);
        alert("Erro ao conectar com Google. Verifique se o projeto Supabase está configurado corretamente.");
    }
  };

  const handleLoginGuest = () => {
    setUser({
      id: 'guest',
      name: 'Convidado',
      email: 'guest@mathsuite.app',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'
    });
  };

  const handleLogout = async () => {
    // If guest, just clear state. If Supabase user, call signOut.
    if (user?.id === 'guest') {
        setUser(null);
    } else {
        await supabase.auth.signOut();
    }
    setCurrentModule('home');
  };

  // --- LOADING SCREEN ---
  if (loadingSession) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-[#F5F7FA]">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
      );
  }

  // --- RENDER LOGIN IF NO USER ---
  if (!user) {
    return <LoginScreen onLoginGoogle={handleLoginGoogle} onLoginGuest={handleLoginGuest} />;
  }

  // --- MAIN APP UI ---
  return (
    <div className="flex h-screen w-full bg-[#F5F7FA] overflow-hidden font-sans animate-in fade-in duration-300">
      {/* Sidebar Navigation */}
      <div className="w-64 flex flex-col bg-slate-900 text-white border-r border-slate-800 shadow-2xl z-50 shrink-0">
        <div className="p-6 border-b border-slate-800 cursor-pointer" onClick={() => setCurrentModule('home')}>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg text-white">M</div>
             <h1 className="font-bold text-lg tracking-tight text-white">Math Suite <span className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-normal">Pro</span></h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setCurrentModule('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentModule === 'home' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="flex items-center justify-center w-6 h-6">🏠</span>
            Início
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Módulos</div>

          <button 
            onClick={() => setCurrentModule('vectora')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentModule === 'vectora' ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-900/50 text-white font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded ${currentModule === 'vectora' ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>↗</span>
            Vectora Pro
          </button>

          <button 
            onClick={() => setCurrentModule('trigo')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentModule === 'trigo' ? 'bg-gradient-to-r from-teal-600 to-teal-500 shadow-lg shadow-teal-900/50 text-white font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className={`flex items-center justify-center w-6 h-6 rounded ${currentModule === 'trigo' ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>○</span>
            TrigoMestre
          </button>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4 px-2">
              <img src={user.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600" />
              <div className="flex-1 min-w-0">
                 <div className="text-sm font-bold text-white truncate">{user.name}</div>
                 <div className="text-xs text-slate-400 truncate">{user.email}</div>
              </div>
           </div>
           
           <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-colors"
           >
              <span>Sair da conta</span>
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden relative bg-slate-50">
        {currentModule === 'home' && (
          <div className="h-full w-full overflow-y-auto p-8 md:p-12 flex flex-col items-center justify-center animate-in fade-in duration-500">
             
             <div className="text-center max-w-2xl mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-4">
                  Bem-vindo, {user.name.split(' ')[0]}
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                  Ferramentas Precisas para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Ciências Exatas</span>
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Selecione um módulo abaixo para começar. Crie simulações, calcule resultados complexos e gere listas de exercícios em PDF prontos para impressão.
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* VECTORA CARD */}
                <button 
                  onClick={() => setCurrentModule('vectora')}
                  className="group relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-left hover:scale-[1.02] hover:shadow-2xl hover:border-blue-200 transition-all duration-300"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400 rounded-t-2xl"></div>
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    ↗
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">Vectora Pro</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">
                    Simulador vetorial completo. Decomposição cartesiana, soma de vetores, cálculo de resultantes e rotação de eixos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">Física</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">Vetores</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">Mecânica</span>
                  </div>
                </button>

                {/* TRIGO CARD */}
                <button 
                  onClick={() => setCurrentModule('trigo')}
                  className="group relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-left hover:scale-[1.02] hover:shadow-2xl hover:border-teal-200 transition-all duration-300"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-teal-400 rounded-t-2xl"></div>
                  <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center mb-6 text-2xl group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                    ○
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-teal-700 transition-colors">TrigoMestre</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">
                    Solucionador de triângulos inteligente. Resolve qualquer caso (Lei dos Senos, Cossenos) com visualização geométrica precisa.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">Matemática</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">Geometria</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">Trigonometria</span>
                  </div>
                </button>
             </div>

             <div className="mt-16 text-slate-400 text-sm font-medium">
                Desenvolvido para Professores e Estudantes do Ensino Médio e Superior.
             </div>

          </div>
        )}
        {currentModule === 'vectora' && <VectoraApp />}
        {currentModule === 'trigo' && <TrigoApp />}
      </div>
    </div>
  );
};

export default App;