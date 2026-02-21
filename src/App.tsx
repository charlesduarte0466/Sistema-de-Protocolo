import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  FilePlus, 
  UserPlus,
  ChevronRight,
  ClipboardList,
  FileUp,
  LogOut,
  ShieldCheck,
  FileCode,
  History,
  Activity,
  HelpCircle,
  Info,
  BookOpen,
  Tag,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SYSTEM_VERSION = "1.2.0-stable";

// Types
interface User {
  id: number;
  username: string;
  role: string;
  permissions: string[];
}

interface Protocol {
  id: string;
  title: string;
  description: string;
  doc_type: string;
  status: string;
  created_at: string;
}

interface Template {
  id: number;
  name: string;
  content: string;
}

interface Role {
  id: number;
  name: string;
  permissions: string;
}

interface Log {
  id: number;
  username: string;
  action: string;
  details: string;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'protocols' | 'users' | 'templates' | 'roles' | 'logs' | 'help'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [modalType, setModalType] = useState<'protocol' | 'user' | 'template' | 'role'>('protocol');

  // Form states
  const [newProtocol, setNewProtocol] = useState({ title: '', description: '', template_id: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role_id: '' });
  const [newTemplate, setNewTemplate] = useState({ id: null as number | null, name: '', content: '' });
  const [newRole, setNewRole] = useState({ name: '', permissions: [] as string[] });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        fetchData();
      }
    } catch (error) {
      console.error("Auth check failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        fetchData();
      } else {
        setLoginError('Usuário ou senha inválidos');
      }
    } catch (error) {
      setLoginError('Erro ao conectar ao servidor');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setActiveTab('dashboard');
  };

  const fetchData = async () => {
    try {
      const [protoRes, tempRes, userRes, roleRes, logRes] = await Promise.all([
        fetch('/api/protocols'),
        fetch('/api/templates'),
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/logs')
      ]);
      
      setProtocols(await protoRes.json());
      setTemplates(await tempRes.json());
      setUsers(await userRes.json());
      setRoles(await roleRes.json());
      setLogs(await logRes.json());
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProtocol, created_by: user?.id })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setNewProtocol({ title: '', description: '', template_id: '' });
      } else {
        const err = await res.json();
        alert('Erro ao criar protocolo: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (error) {
      alert('Erro de conexão ao criar protocolo');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchData();
      setNewUser({ username: '', password: '', role_id: '' });
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = newTemplate.id ? 'PUT' : 'POST';
    const url = newTemplate.id ? `/api/templates/${newTemplate.id}` : '/api/templates';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTemplate, created_by: user?.id })
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchData();
      setNewTemplate({ id: null, name: '', content: '' });
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRole)
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchData();
      setNewRole({ name: '', permissions: [] });
    }
  };

  const handlePreviewTemplate = (template: Template) => {
    let content = template.content;
    const dummyData: Record<string, string> = {
      'protocol_id': '20260221132200000',
      'title': 'Exemplo de Título de Processo',
      'description': 'Este é um exemplo de descrição de conteúdo que será substituído dinamicamente pelo sistema quando o protocolo for gerado.',
      'created_at': new Date().toLocaleString(),
      'username': user?.username || 'admin'
    };

    Object.entries(dummyData).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    setPreviewContent(content);
    setIsPreviewModalOpen(true);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    return user.permissions.includes('all') || user.permissions.includes(permission);
  };

  const canCreate = () => {
    if (activeTab === 'users') return hasPermission('manage_users');
    if (activeTab === 'templates') return hasPermission('manage_templates');
    if (activeTab === 'roles') return hasPermission('manage_users'); // Roles are part of user management
    return hasPermission('create_protocol');
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-zinc-50 font-sans">Carregando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <ClipboardList className="w-10 h-10 text-zinc-900" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">ProtocoloX</h2>
            <p className="text-zinc-500 text-sm mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Usuário</label>
              <input 
                required
                type="text" 
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Digite seu usuário"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
              <input 
                required
                type="password" 
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-xs font-medium text-center"
              >
                {loginError}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]"
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-400">
              Sistema de Protocolo Único &copy; 2026
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 text-zinc-400 flex flex-col border-r border-zinc-800">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-zinc-900" />
          </div>
          <span className="font-bold tracking-tight text-lg">ProtocoloX</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="mb-4">
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={<FileText size={20} />} 
              label="Protocolos" 
              active={activeTab === 'protocols'} 
              onClick={() => setActiveTab('protocols')} 
            />
          </div>

          <div className="mb-4">
            <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Cadastros</p>
            <SidebarItem 
              icon={<Users size={20} />} 
              label="Usuários" 
              active={activeTab === 'users'} 
              onClick={() => setActiveTab('users')} 
            />
            <SidebarItem 
              icon={<ShieldCheck size={20} />} 
              label="Perfis de Acesso" 
              active={activeTab === 'roles'} 
              onClick={() => setActiveTab('roles')} 
            />
            <SidebarItem 
              icon={<FileCode size={20} />} 
              label="Modelos de Doc" 
              active={activeTab === 'templates'} 
              onClick={() => setActiveTab('templates')} 
            />
          </div>

          <div className="mb-4">
            <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Sistema</p>
            <SidebarItem 
              icon={<History size={20} />} 
              label="Logs de Auditoria" 
              active={activeTab === 'logs'} 
              onClick={() => setActiveTab('logs')} 
            />
          </div>

          <div className="mb-4">
            <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Ajuda</p>
            <SidebarItem 
              icon={<HelpCircle size={20} />} 
              label="Ajuda & Suporte" 
              active={activeTab === 'help'} 
              onClick={() => setActiveTab('help')} 
            />
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs truncate">{user.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="hover:text-white transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-zinc-800 capitalize">
            {activeTab === 'roles' ? 'Perfis de Acesso' : 
             activeTab === 'templates' ? 'Modelos' : 
             activeTab === 'logs' ? 'Logs de Auditoria' : 
             activeTab === 'help' ? 'Ajuda & Suporte' : activeTab}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 bg-zinc-100 border-none rounded-full text-sm focus:ring-2 focus:ring-emerald-500 transition-all w-64"
              />
            </div>
            {activeTab !== 'logs' && activeTab !== 'help' && canCreate() && (
              <button 
                onClick={() => {
                  if (activeTab === 'users') {
                    setModalType('user');
                    setNewUser({ username: '', password: '', role_id: '' });
                  }
                  else if (activeTab === 'templates') {
                    setModalType('template');
                    setNewTemplate({ id: null, name: '', content: '' });
                  }
                  else if (activeTab === 'roles') {
                    setModalType('role');
                    setNewRole({ name: '', permissions: [] });
                  }
                  else {
                    setModalType('protocol');
                    setNewProtocol({ title: '', description: '', template_id: '' });
                  }
                  setIsModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-zinc-900 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus size={18} />
                Novo {activeTab === 'users' ? 'Usuário' : activeTab === 'templates' ? 'Modelo' : activeTab === 'roles' ? 'Perfil' : 'Protocolo'}
              </button>
            )}
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <StatCard title="Total de Protocolos" value={protocols.length} icon={<FileText className="text-blue-500" />} />
                <StatCard title="Usuários Ativos" value={users.length} icon={<Users className="text-purple-500" />} />
                <StatCard title="Ações Registradas" value={logs.length} icon={<Activity className="text-emerald-500" />} />
                
                <div className="md:col-span-3 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
                  <div className="space-y-4">
                    {protocols.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <FilePlus size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-800">{p.title}</p>
                            <p className="text-xs text-zinc-500">Protocolo: {p.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-800">{p.status}</p>
                          <p className="text-xs text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'protocols' && (
              <motion.div 
                key="protocols"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">ID Protocolo</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Título</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {protocols.map(p => (
                      <tr key={p.id} className="hover:bg-zinc-50 transition-colors group">
                        <td className="px-6 py-4 font-mono text-sm text-emerald-600">{p.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-800">{p.title}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500">{p.doc_type}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{new Date(p.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors">
                            <span>Ver</span>
                            <ChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {users.map(u => (
                  <div key={u.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                      <Users size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-800">{u.username}</h4>
                      <p className="text-sm text-zinc-500">{u.role}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'roles' && (
              <motion.div 
                key="roles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {roles.map(r => (
                  <div key={r.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <ShieldCheck size={20} />
                      </div>
                      <h4 className="font-semibold text-zinc-800">{r.name}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(r.permissions).map((p: string) => (
                        <span key={p} className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'templates' && (
              <motion.div 
                key="templates"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {templates.map(t => (
                  <div key={t.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-zinc-800">{t.name}</h4>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handlePreviewTemplate(t)}
                          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-blue-500 transition-all"
                          title="Pré-visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setNewTemplate({ id: t.id, name: t.name, content: t.content });
                            setModalType('template');
                            setIsModalOpen(true);
                          }}
                          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-emerald-500 transition-all"
                          title="Editar Layout"
                        >
                          <Settings size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-lg text-xs font-mono text-zinc-600 h-24 overflow-hidden">
                      {t.content}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data/Hora</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ação</th>
                      <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-xs text-zinc-500 font-mono">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-800">{l.username}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase">
                            {l.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{l.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'help' && (
              <motion.div 
                key="help"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Info size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-800">Informações do Sistema</h3>
                      <p className="text-sm text-zinc-500">Detalhes sobre a versão atual do ProtocoloX</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Versão</p>
                      <p className="text-lg font-mono font-bold text-zinc-800">{SYSTEM_VERSION}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Ambiente</p>
                      <p className="text-lg font-bold text-zinc-800">Produção</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-800">Documentação de Tags</h3>
                      <p className="text-sm text-zinc-500">Tags dinâmicas para uso em Modelos de Documentos</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <TagInfo 
                      tag="{{protocol_id}}" 
                      description="Insere o número único do protocolo gerado pelo sistema." 
                    />
                    <TagInfo 
                      tag="{{title}}" 
                      description="Insere o título do processo definido na criação." 
                    />
                    <TagInfo 
                      tag="{{description}}" 
                      description="Insere o conteúdo principal ou descrição do processo." 
                    />
                    <TagInfo 
                      tag="{{created_at}}" 
                      description="Insere a data e hora de criação do protocolo." 
                    />
                    <TagInfo 
                      tag="{{username}}" 
                      description="Insere o nome do usuário que criou o protocolo." 
                    />
                  </div>

                  <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-4">
                    <div className="text-amber-600 shrink-0">
                      <Tag size={20} />
                    </div>
                    <p className="text-sm text-amber-800">
                      <strong>Dica:</strong> Você pode usar estas tags em qualquer lugar do seu código HTML/CSS nos modelos de documentos. O sistema substituirá automaticamente pelos valores reais ao gerar o documento.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-800">
                  {modalType === 'protocol' ? 'Novo Protocolo' : 
                   modalType === 'user' ? 'Novo Usuário' : 
                   modalType === 'role' ? 'Novo Perfil' : 
                   (newTemplate.id ? 'Editar Modelo' : 'Novo Modelo')}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form className="p-6 space-y-4" onSubmit={
                modalType === 'protocol' ? handleCreateProtocol : 
                modalType === 'user' ? handleCreateUser : 
                modalType === 'role' ? handleCreateRole :
                handleCreateTemplate
              }>
                {modalType === 'protocol' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Título do Processo</label>
                      <input 
                        required
                        type="text" 
                        value={newProtocol.title}
                        onChange={e => setNewProtocol({...newProtocol, title: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="Ex: Requerimento de Férias"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Documento (Modelo)</label>
                      <select 
                        required
                        value={newProtocol.template_id}
                        onChange={e => setNewProtocol({...newProtocol, template_id: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option value="">Selecione um tipo...</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição / Conteúdo</label>
                      <textarea 
                        required
                        value={newProtocol.description}
                        onChange={e => setNewProtocol({...newProtocol, description: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24"
                        placeholder="Detalhes do processo..."
                      />
                    </div>
                    <div className="pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
                        <FileUp size={16} />
                        <span>Anexar arquivos externos</span>
                      </div>
                      <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer">
                        <p className="text-sm text-zinc-500">Arraste arquivos aqui ou clique para selecionar</p>
                      </div>
                    </div>
                  </>
                )}

                {modalType === 'user' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome de Usuário</label>
                      <input 
                        required
                        type="text" 
                        value={newUser.username}
                        onChange={e => setNewUser({...newUser, username: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
                      <input 
                        required
                        type="password" 
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Perfil de Acesso</label>
                      <select 
                        required
                        value={newUser.role_id}
                        onChange={e => setNewUser({...newUser, role_id: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option value="">Selecione...</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {modalType === 'role' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Perfil</label>
                      <input 
                        required
                        type="text" 
                        value={newRole.name}
                        onChange={e => setNewRole({...newRole, name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="Ex: Gerente"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Permissões</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['all', 'create_protocol', 'view_protocol', 'manage_users', 'manage_templates'].map(p => (
                          <label key={p} className="flex items-center gap-2 p-2 rounded border border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={newRole.permissions.includes(p)}
                              onChange={e => {
                                if (e.target.checked) setNewRole({...newRole, permissions: [...newRole.permissions, p]});
                                else setNewRole({...newRole, permissions: newRole.permissions.filter(x => x !== p)});
                              }}
                              className="accent-emerald-500"
                            />
                            <span className="text-xs font-medium text-zinc-600 uppercase">{p.replace('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {modalType === 'template' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Tipo / Modelo</label>
                      <input 
                        required
                        type="text" 
                        value={newTemplate.name}
                        onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Layout (HTML/CSS)</label>
                      <textarea 
                        required
                        value={newTemplate.content}
                        onChange={e => setNewTemplate({...newTemplate, content: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-48 font-mono"
                        placeholder="Defina o layout HTML/CSS aqui..."
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-zinc-900 font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h2 className="text-xl font-bold text-zinc-800">Pré-visualização do Modelo</h2>
                  <p className="text-xs text-zinc-500 mt-1">Exemplo de como o documento será renderizado</p>
                </div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 p-2 hover:bg-zinc-200 rounded-full transition-all">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-zinc-100">
                <div 
                  className="bg-white shadow-lg mx-auto min-h-[400px] w-full max-w-[210mm] p-[20mm]"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              </div>

              <div className="p-4 border-t border-zinc-100 bg-white flex justify-end">
                <button 
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-6 py-2 rounded-lg bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors"
                >
                  Fechar Visualização
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-emerald-500/10 text-emerald-500' 
          : 'hover:bg-zinc-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-sm text-zinc-500 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-zinc-800 mt-1">{value}</h4>
    </div>
  );
}

function TagInfo({ tag, description }: { tag: string, description: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
      <code className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-mono text-sm font-bold shrink-0">
        {tag}
      </code>
      <p className="text-sm text-zinc-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
