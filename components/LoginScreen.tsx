import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginGoogle: () => void;
  onLoginGuest: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginGoogle, onLoginGuest }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleClick = () => {
    setLoading(true);
    // Simulating network request for UX
    setTimeout(() => {
        onLoginGoogle();
        setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F7FA] font-sans overflow-hidden relative">
      {/* Background Abstract Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="m-auto w-full max-w-md p-6 z-10 relative">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-6 text-white text-3xl font-bold">
              M
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Math Suite Pro</h1>
            <p className="text-slate-500 text-sm">
              Plataforma avançada para cálculos vetoriais e trigonometria.
            </p>
          </div>

          {/* Login Actions */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm group hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continuar com Google</span>
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Ou</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              onClick={onLoginGuest}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-slate-200"
            >
              Entrar como Convidado
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Ao continuar, você concorda com os Termos de Serviço.</p>
            <p className="mt-2">Versão 3.2.0 • Unified Build</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;