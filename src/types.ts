export type Screen = 'home' | 'listing' | 'profile' | 'dashboard' | 'chatList' | 'chat' | 'notifications' | 'registration' | 'plan' | 'providerPlan' | 'filters' | 'maia' | 'reviews' | 'serviceConfirmation' | 'providerRequests' | 'serviceStatus' | 'serviceRequestForm' | 'auth' | 'forgotPassword' | 'updatePassword' | 'userProfile' | 'adminDashboard' | 'checkout' | 'providerWallet' | 'helpCenter' | 'ticketDetails' | 'providerSchedule' | 'myRequests' | 'myFreelances' | 'categories' | 'writeReview' | 'favorites' | 'freelanceRequest' | 'openOrders' | 'whatsappSearch' | 'termsConsent' | 'bidRoom' | 'rewards' | 'freelanceStatus' | 'back';

export interface NavigationProps {
  onNavigate: (screen: Screen, params?: any) => void;
  params?: any;
}

export interface Professional {
  id: string;
  name: string;
  service: string;
  rating: number | string;
  reviews: number;
  price: number;
  priceUnit: string;
  /**
   * Distância até o cliente. HomeScreen grava um rótulo já formatado
   * ('3.4', 'N/A', 'N/A (Rondonópolis)'); ServiceListingScreen grava km numérico.
   * Use toNumber() de lib/formatters antes de comparar ou ordenar.
   */
  distance: number | string;
  image: string;
  description: string;
  isAffiliate?: boolean;
  isNew?: boolean;
  category: string;
  isVerified?: boolean;
  city?: string | null;
  plan_type?: string | null;
  pricing_model?: string | null;
  show_price?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Ticket {
  id: string;
  serviceId: string;
  professionalName: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  createdAt: string;
  subject: string;
  description: string;
}
