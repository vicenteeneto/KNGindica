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
import ProviderWalletScreen from './screens/ProviderWalletScreen';
import AuthScreen from './screens/AuthScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ProviderVerificationScreen from './screens/ProviderVerificationScreen';
import HelpCenterScreen from './screens/HelpCenterScreen';
import ProviderScheduleScreen from './screens/ProviderScheduleScreen';
import WriteReviewScreen from './screens/WriteReviewScreen';
import { Screen } from './types';
import { ThemeProvider, useTheme } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';

// ThemeToggle foi movido para o UserProfileScreen
function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [navigationParams, setNavigationParams] = useState<any>({});

  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If not authenticated, always show auth screen
        // In a real app we might allow guest flows, but for now we require auth
        setCurrentScreen('auth');
      } else if (currentScreen === 'auth' && role !== null) {
        // If logged in, role is loaded, and on auth screen, redirect based on role
        // Extra security: only allow the specific email to access admin
        if (role === 'admin' && user?.email === 'offkngpublicidade@gmail.com') {
          setCurrentScreen('adminDashboard');
        } else if (role === 'provider') {
          setCurrentScreen('dashboard');
        } else {
          setCurrentScreen('home');
        }
      }
    }
  }, [user, role, loading, currentScreen]);

  const handleNavigate = (screen: Screen, params?: any) => {
    setCurrentScreen(screen);
    if (params) {
      setNavigationParams(params);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />;
      case 'listing':
        return <ServiceListingScreen onNavigate={handleNavigate} initialParams={navigationParams} />;
      case 'profile':
        return <ProfessionalProfileScreen onNavigate={handleNavigate} professionalId={navigationParams?.professionalId} />;
      case 'dashboard':
        return <ProviderDashboardScreen onNavigate={handleNavigate} />;
      case 'chatList':
        return <ChatListScreen onNavigate={handleNavigate} />;
      case 'chat':
        return <ChatScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'notifications':
        return <NotificationsScreen onNavigate={handleNavigate} />;
      case 'registration':
        return <ProviderRegistrationScreen onNavigate={handleNavigate} />;
      case 'plan':
        return <ProviderPlanScreen onNavigate={handleNavigate} />;
      case 'filters':
        return <FilterServicesScreen onNavigate={handleNavigate} />;
      case 'maia':
        return <MaiaAssistantScreen onNavigate={handleNavigate} />;
      case 'reviews':
        return <ProfessionalReviewsScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'serviceConfirmation':
        return <ServiceConfirmationScreen onNavigate={handleNavigate} />;
      case 'providerRequests':
        return <ProviderRequestsScreen onNavigate={handleNavigate} />;
      case 'serviceStatus':
        return <ServiceStatusScreen onNavigate={handleNavigate} />;
      case 'serviceRequestForm':
        return <ServiceRequestFormScreen onNavigate={handleNavigate} />;
      case 'writeReview':
        return <WriteReviewScreen onNavigate={handleNavigate} params={navigationParams} />;
      case 'auth':
        return <AuthScreen onNavigate={handleNavigate} />;
      case 'forgotPassword':
        return <ForgotPasswordScreen onNavigate={handleNavigate} />;
      case 'userProfile':
        return <UserProfileScreen onNavigate={handleNavigate} />;
      case 'adminDashboard':
        return <AdminDashboardScreen onNavigate={handleNavigate} />;
      case 'checkout':
        return <CheckoutScreen onNavigate={handleNavigate} />;
      case 'providerWallet':
        return <ProviderWalletScreen onNavigate={handleNavigate} />;
      case 'providerVerification':
        return <ProviderVerificationScreen onNavigate={handleNavigate} />;
      case 'helpCenter':
        return <HelpCenterScreen onNavigate={handleNavigate} />;
      case 'ticketDetails':
        return <HelpCenterScreen onNavigate={handleNavigate} />;
      case 'providerSchedule':
        return <ProviderScheduleScreen onNavigate={handleNavigate} />;
      case 'myRequests':
        return <MyRequestsScreen onNavigate={handleNavigate} />;
      case 'categories':
        return <CategoriesScreen onNavigate={handleNavigate} />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      {renderScreen()}
    </>
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
