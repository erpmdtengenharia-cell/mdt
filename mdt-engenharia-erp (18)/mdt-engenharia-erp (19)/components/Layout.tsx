import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Users, HardHat, LayoutDashboard, ClipboardList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatWidget } from './ChatWidget';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                <div className="bg-primary-700 p-2 rounded-lg shadow-sm">
                    <HardHat className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-none">MDT</h1>
                    <span className="text-xs text-primary-700 font-semibold tracking-wider">ENGENHARIA v5</span>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => navigate('/')}
                  className={`${
                    isActive('/') ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/clients')}
                  className={`${
                    isActive('/clients') || location.pathname.startsWith('/client/') ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Clientes
                </button>
                <button
                  onClick={() => navigate('/tasks')}
                  className={`${
                    isActive('/tasks') ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Tarefas
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden md:flex md:items-center md:ml-6 gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{profile?.name || 'Usuário'}</div>
                  <div className="text-xs text-gray-500 capitalize">{isAdmin ? 'Administrador' : 'Colaborador'}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <ChatWidget />
    </div>
  );
};