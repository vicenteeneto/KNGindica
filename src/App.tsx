import React, { useState, useEffect } from 'react';
import HomeScreen from './screens/HomeScreen';
import ServiceListingScreen from './screens/ServiceListingScreen';
import ProfessionalProfileScreen from './screens/ProfessionalProfileScreen';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProviderRegistrationScreen from './screens/ProviderRegistrationScreen';
import ProviderPlanScreen from './screens/ProviderPlanScreen';
import FilterServicesScreen from './screens/FilterServicesScreen';
import MaiaAssistantScreen from './screens/MaiaAssistantScreen';
import ProfessionalReviewsScreen from './screens/ProfessionalReviewsScreen';
import ServiceConfirmationScreen from './screens/ServiceConfirmationScreen';
import ProviderRequestsScreen from './screens/ProviderRequestsScreen';
import ServiceStatusScreen from './screens/ServiceStatusScreen';
import ServiceRequestFormScreen from './screens/ServiceRequestFormScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import MyRequestsScreen from './screens/MyRequestsScreen';
import MyFreelancesScreen from './screens/MyFreelancesScreen';
import ProviderWalletScreen from './screens/ProviderWalletScreen';
import AuthScreen from './screens/AuthScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import UpdatePasswordScreen from './screens/UpdatePasswordScreen';
import HelpCenterScreen from './screens/HelpCenterScreen';
import ProviderScheduleScreen from './screens/ProviderScheduleScreen';
import WriteReviewScreen from './screens/WriteReviewScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import FreelanceRequestScreen from './screens/FreelanceRequestScreen';
import OpenOrdersScreen from './screens/OpenOrdersScreen';
import WhatsAppSearchScreen from './screens/WhatsAppSearchScreen';
import TermsConsentScreen from './screens/TermsConsentScreen';
import BidRoomScreen from './screens/BidRoomScreen';
import RewardsScreen from './screens/RewardsScreen';
import FreelanceStatusScreen from './screens/FreelanceStatusScreen';
import { initOneSignal } from './lib/OneSignalService';
import { Screen } from './types';
import { ThemeProvider, useTheme } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import { NotificationProvider } from './NotificationContext';
import SidebarNav from './components/SidebarNav';
import PullToRefresh from './components/PullToRefresh';
import MobileNav from './components/MobileNav';

// ThemeToggle foi movido para o UserProfileScreen
const STORAGE_KEY = 'KNGindica_currentScreen';
const STORAGE_PARAMS_KEY = 'KNGindica_navParams';

// Telas que nunca devem ser persistidas (sensíveis ou de sessão)
const NON_PERSISTENT_SCREENS = ['auth', 'forgotPassword', 'updatePassword', 'termsConsent', 'bidRoom', 'profile'];

const ADMIN_TABS = [
  { id: 'dashboard', icon: 'grid_view', label: 'Dashboard' },
  { id: 'providers', icon: 'engineering', label: 'Prestadores' },
  { id: 'clients', icon: 'group', label: 'Clientes' },
  { id: 'orders', icon: 'receipt', label: 'Serviços' },
  { id: 'reviews', icon: 'reviews', label: 'Reviews' },
  { id: 'categories', icon: 'category', label: 'Categorias' },
  { id: 'referrals', icon: 'share', label: 'Auditoria de Indicações' },
  { id: 'chat_audit', icon: 'forum', label: 'Auditoria' },
  { id: 'tickets', icon: 'support_agent', label: 'Resoluções' },
  { id: 'verifications', icon: 'verified_user', label: 'Verificações' },
  { id: 'finance', icon: 'payments', label: 'Financeiro' },
  { id: 'settings', icon: 'settings', label: 'Configurações' },
  { id: 'maintenance', icon: 'construction', label: 'Manutenção' },
];

function AppContent() {
  const { user, role, profile, loading } = useAuth();
  const [adminTab, setAdminTab] = React.useState('dashboard');

  // Recuperar tela salva antes de criar o estado
  const getSavedScreen = (): Screen => {
    try {
      // Check for WhatsApp Search URL first
      const path = window.location.pathname;
      if (path.startsWith('/search/')) {
        return 'whatsappSearch';
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !NON_PERSISTENT_SCREENS.includes(saved)) return saved as Screen;
    } catch {}
    return 'auth';
  };

  const getSavedParams = () => {
    try {
      const path = window.location.pathname;
      if (path.startsWith('/search/')) {
        const parts = path.split('/');
        // Pega a parte do ID e remove qualquer query param (ex: ?fbclid=...) ou hash
        const searchId = parts[2]?.split('?')[0]?.split('#')[0];
        return { searchId };
      }

      const saved = localStorage.getItem(STORAGE_PARAMS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(getSavedScreen());
  const [navigationParams, setNavigationParams] = useState<any>(getSavedParams());
  const [activeChat, setActiveChat] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('KNGindica_activeChat');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Sync state with browser history (back/forward buttons)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.screen) {
        setCurrentScreen(state.screen);
        if (state.params) setNavigationParams(state.params);
      } else {
        // Fallback to role-specific home
        if (role === 'admin') setCurrentScreen('adminDashboard');
        else setCurrentScreen('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initial state push for the first load
    if (!window.history.state) {
      window.history.replaceState({ screen: currentScreen, params: navigationParams }, '', '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for password recovery trigger
  useEffect(() => {
    const handlePasswordRecovery = () => {
      setCurrentScreen('updatePassword');
    };
    window.addEventListener('kng-password-recovery', handlePasswordRecovery);
    
    // Check if URL has hash with type=recovery just in case event fired before App mounted
    if (window.location.hash.includes('type=recovery')) {
      handlePasswordRecovery();
    }

    return () => window.removeEventListener('kng-password-recovery', handlePasswordRecovery);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (currentScreen !== 'whatsappSearch' && currentScreen !== 'forgotPassword' && currentScreen !== 'updatePassword') {
          setCurrentScreen('auth');
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_PARAMS_KEY);
        }
      } else {
        // Verifica se havia uma pesquisa pendente do WhatsApp antes do login (prioridade total)
        // Tentamos recuperar do localStorage ou se a tela atual já for a de busca
        const pendingSearchId = localStorage.getItem('pendingSearchId');
        
        if (pendingSearchId) {
          localStorage.removeItem('pendingSearchId');
          setNavigationParams({ searchId: pendingSearchId });
          setCurrentScreen('whatsappSearch');
          localStorage.setItem(STORAGE_KEY, 'whatsappSearch');
          return;
        }

        if (currentScreen === 'auth' && role !== null) {
          const adminEmail = user?.email?.toLowerCase();
          const isAdmin = adminEmail === 'offkngpublicidade@gmail.com' || role === 'admin';
        
        // NOVO: Redirecionar para termos se não aceitou (admins também passam pelo filtro para aceitação oficial)
        // Se currentScreen for auth ou forgotPassword, não atrapalha o fluxo de login
        if (profile && profile.terms_accepted === false && !['auth', 'forgotPassword', 'termsConsent'].includes(currentScreen)) {
          setCurrentScreen('termsConsent');
          return;
        }

        // Inicializa OneSignal ao logar
        if (user) {
          initOneSignal(user.id);
        }

        let dest: Screen;
        if (isAdmin) dest = 'adminDashboard';
        else dest = 'home';
        
        // Only set home if we aren't already on a deep-link or specific screen
        if (currentScreen === 'auth' || !currentScreen) {
          setCurrentScreen(dest);
          localStorage.setItem(STORAGE_KEY, dest);
        }
        }
      }
    }
  }, [user, role, profile, loading, currentScreen]);

  const handleNavigate = (screen: Screen | 'back', params?: any) => {
    if (screen === 'back') {
      window.history.back();
      return;
    }

    if (screen === 'chat') {
      setActiveChat(params);
      localStorage.setItem('KNGindica_activeChat', JSON.stringify(params));
      return;
    }

    // Push state to browser history
    window.history.pushState({ screen, params }, '', '');

    setCurrentScreen(screen);
    const newParams = params || {};
    setNavigationParams(newParams);
    
    if (!NON_PERSISTENT_SCREENS.includes(screen)) {
      localStorage.setItem(STORAGE_KEY, screen);
      if (params) {
        localStorage.setItem(STORAGE_PARAMS_KEY, JSON.stringify(params));
      } else {
        localStorage.removeItem(STORAGE_PARAMS_KEY);
      }
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const renderScreen = () => {
    // Exclusive Admin View: Force AdminDashboard if user is admin
    // Always allow auth screen and profile screen for basic management
    if (role === 'admin' && !['auth', 'profile', 'adminDashboard'].includes(currentScreen)) {
      return <AdminDashboardScreen onNavigate={handleNavigate} activeTab={adminTab} setActiveTab={setAdminTab} />;
    }

    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />;
      case 'listing':
        return <ServiceListingScreen onNavigate={handleNavigate} initialParams={navigationParams} />;
      case 'profile':
        return <ProfessionalProfileScreen 
          onNavigate={handleNavigate} 
          params={navigationParams} 
        />;
      case 'dashboard':
        return <ProviderDashboardScreen onNavigate={handleNavigate} />;
      case 'chatList':
        return <ChatListScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'notifications':
        return <NotificationsScreen onNavigate={handleNavigate} />;
      case 'registration':
        return <ProviderRegistrationScreen onNavigate={handleNavigate} />;
      case 'plan':
        return <ProviderPlanScreen onNavigate={handleNavigate} />;
      case 'providerPlan':
        return <ProviderPlanScreen onNavigate={handleNavigate} />;
      case 'filters':
        return <FilterServicesScreen onNavigate={handleNavigate} />;
      case 'maia':
        return <MaiaAssistantScreen onNavigate={handleNavigate} />;
      case 'reviews':
        return <ProfessionalReviewsScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'serviceConfirmation':
        return <ServiceConfirmationScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'providerRequests':
        return <ProviderRequestsScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'serviceStatus':
        return <ServiceStatusScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'serviceRequestForm':
        return <ServiceRequestFormScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'writeReview':
        return <WriteReviewScreen onNavigate={handleNavigate} params={navigationParams} />;
       case 'auth':
         return <AuthScreen onNavigate={handleNavigate} />;
       case 'rewards':
         return <RewardsScreen onNavigate={handleNavigate} />;
       case 'forgotPassword':
         return <ForgotPasswordScreen onNavigate={handleNavigate} />;
       case 'updatePassword':
         return <UpdatePasswordScreen onNavigate={handleNavigate} />;
      case 'userProfile':
        return <UserProfileScreen onNavigate={handleNavigate} />;
      case 'adminDashboard':
        return <AdminDashboardScreen onNavigate={handleNavigate} activeTab={adminTab} setActiveTab={setAdminTab} />;
      case 'checkout':
        return <CheckoutScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'providerWallet':
        return <ProviderWalletScreen onNavigate={handleNavigate} />;
      case 'helpCenter':
        return <HelpCenterScreen onNavigate={handleNavigate} />;
      case 'ticketDetails':
        return <HelpCenterScreen onNavigate={handleNavigate} />;
      case 'providerSchedule':
        return <ProviderScheduleScreen onNavigate={handleNavigate} />;
      case 'myRequests':
        return <MyRequestsScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'myFreelances':
        return <MyFreelancesScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'categories':
        return <CategoriesScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'favorites':
        return <FavoritesScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'freelanceRequest':
        return <FreelanceRequestScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'openOrders':
        return <OpenOrdersScreen onNavigate={handleNavigate} params={navigationParams} />;

      case 'termsConsent':
        return <TermsConsentScreen onNavigate={handleNavigate} />;
      case 'bidRoom':
        return <BidRoomScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'freelanceStatus':
        return <FreelanceStatusScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'whatsappSearch':
        return <WhatsAppSearchScreen onNavigate={handleNavigate} params={navigationParams} />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <NotificationProvider onNavigate={handleNavigate}>
      <div className="flex bg-white dark:bg-slate-900 min-h-screen">
        {!NON_PERSISTENT_SCREENS.includes(currentScreen) && (
          <SidebarNav 
            onNavigate={handleNavigate} 
            currentScreen={currentScreen} 
            role={role} 
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            adminTabs={role === 'admin' ? ADMIN_TABS : undefined}
          />
        )}
        <div className={`flex-1 w-full ${!NON_PERSISTENT_SCREENS.includes(currentScreen) ? 'lg:pl-16' : ''} transition-all duration-300`}>
          <PullToRefresh>
            {renderScreen()}
            {!NON_PERSISTENT_SCREENS.includes(currentScreen) && currentScreen !== 'adminDashboard' && role !== 'admin' && (
              <MobileNav onNavigate={handleNavigate} currentScreen={currentScreen} role={role} />
            )}
          </PullToRefresh>
        </div>
      </div>
      {activeChat && (
        <div className="fixed bottom-0 right-0 z-[100] md:bottom-4 md:right-4 w-full h-full md:w-auto md:h-auto font-display">
          <ChatScreen 
            onNavigate={handleNavigate} 
            params={activeChat} 
            onClose={() => {
              setActiveChat(null);
              localStorage.removeItem('KNGindica_activeChat');
            }} 
          />
        </div>
      )}
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}