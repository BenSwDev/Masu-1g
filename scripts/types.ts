export interface TestResult {
  scenario: string;
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  duration: number;
  timestamp: Date;
  userAction?: string;
  apiRequests?: ApiRequest[];
  dbChanges?: DbChange[];
}

export interface ApiRequest {
  method: string;
  url: string;
  status: number;
  requestBody?: any;
  responseBody?: any;
  duration: number;
}

export interface DbChange {
  collection: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  documentId?: string;
  changes?: any;
}

export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
}

export interface TestStep {
  name: string;
  action: () => Promise<void>;
  expectedResult: string;
  timeout?: number;
}

export interface FlowTest {
  flowName: string;
  scenarios: TestScenario[];
}

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  notes?: string;
}

export interface RecipientInfo extends GuestInfo {
  recipientFirstName: string;
  recipientLastName: string;
  recipientEmail: string;
  recipientPhone: string;
}

export interface AddressInfo {
  city: string;
  street: string;
  houseNumber: string;
  addressType: 'apartment' | 'house' | 'office' | 'hotel' | 'other';
  floor?: string;
  apartmentNumber?: string;
  entrance?: string;
  parking: boolean;
  notes?: string;
}

export interface TreatmentSelection {
  category: string;
  treatmentName: string;
  duration?: string;
  therapistPreference: 'any' | 'male' | 'female';
}

export interface SchedulingInfo {
  date: string;
  time: string;
}

export interface VoucherInfo {
  type: 'monetary' | 'treatment';
  monetaryValue?: number;
  treatment?: TreatmentSelection;
  isGift: boolean;
  recipientInfo?: RecipientInfo;
  greetingMessage?: string;
  sendOption?: 'immediate' | 'scheduled';
  sendDate?: string;
  sendTime?: string;
}

export interface SubscriptionInfo {
  subscriptionName: string;
  treatment: TreatmentSelection;
} 