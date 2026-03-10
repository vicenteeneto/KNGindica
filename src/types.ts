export type Screen = 'home' | 'listing' | 'profile' | 'dashboard' | 'chatList' | 'chat' | 'notifications' | 'registration' | 'plan' | 'filters' | 'maia' | 'reviews' | 'serviceConfirmation' | 'providerRequests' | 'serviceStatus' | 'serviceRequestForm' | 'auth' | 'forgotPassword' | 'userProfile' | 'adminDashboard' | 'checkout' | 'providerWallet' | 'providerVerification' | 'helpCenter' | 'ticketDetails' | 'providerSchedule' | 'myRequests' | 'categories' | 'writeReview';

export interface NavigationProps {
  onNavigate: (screen: Screen, params?: any) => void;
}

export interface Professional {
  id: string;
  name: string;
  service: string;
  rating: number;
  reviews: number;
  price: number;
  priceUnit: string;
  distance: number;
  image: string;
  description: string;
  isAffiliate?: boolean;
  isNew?: boolean;
  category: string;
  isVerified?: boolean;
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
