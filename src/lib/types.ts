/** Shapes returned by the Servizato backend (mirrors lib/*-types.ts on the website). */
export interface Address {
  location?: { type: "Point"; coordinates: [number, number] };
  label?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  locality?: string;
  pincode?: string;
}

export type PricingModel = "fixed" | "starting" | "per_unit" | "quote_required";

export interface CatalogCategory {
  key: string;
  label: string;
  isActive: boolean;
}

export interface DiscoveryOffering {
  offeringId: string;
  provider: { id: string; companyName: string; description?: string; businessImage?: { url: string } | null; serviceAreas: string[] };
  service: { id: string; name: string; description?: string; categoryKey?: string };
  pricing: {
    basePrice: number;
    finalPrice: number;
    taxPercent: number;
    offerActive: boolean;
    offerName?: string;
    model: PricingModel;
    unit: string;
  };
  rating: number | null;
  reviewCount: number;
  discoveryCoverage?: "matched" | "outside" | "uncertain";
}

export interface Pro {
  _id: string;
  userId?: { _id: string; name?: string; phone?: string; email?: string };
  skills?: string[];
  status?: string;
  isActive?: boolean;
}

export interface JobSummary {
  _id: string;
  status: string;
  technicianId?: Pro;
  scheduledAt?: string;
  invoiceId?: string;
  paymentStatus?: string;
  otp?: string;
  otpExpiresAt?: string;
}

export interface BookingSummary {
  _id: string;
  serviceType: string;
  status: string;
  customerStatus?: string;
  provider?: { companyName: string };
  serviceOffering?: { name: string };
  scheduledAt?: string;
  address?: Address;
  pricing?: { finalPrice?: number };
  estimatedPrice?: number;
  createdAt: string;
  job?: JobSummary;
}

export interface TimelineEntry {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

export interface InvoiceSummary {
  _id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  issuedAt?: string;
  createdAt: string;
  dueDate?: string;
  bookingId?: string | { _id: string; serviceType?: string };
}

export interface InvoiceDetail extends InvoiceSummary {
  items: { description: string; qty: number; unitPrice: number; amount: number }[];
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  notes?: string;
  paymentMethod?: string;
  paymentReceivedAt?: string;
}

export interface BookingDetail {
  booking: BookingSummary;
  provider?: { companyName: string; phone?: string };
  service?: { name: string; description?: string };
  technician?: Pro;
  job?: JobSummary;
  invoice?: InvoiceSummary;
  tracking?: { label: string; description: string; key: string };
  timeline: TimelineEntry[];
}

export interface ServiceRequestSummary {
  _id: string;
  serviceName: string;
  status: string;
  preferredDate?: string;
  createdAt: string;
  pricing: { finalPrice: number };
  serviceProviderId?: { companyName: string };
  address?: Address;
}

// ---- Pro (technician) ----
export interface TechnicianWorkflow {
  access: "active" | "read_only";
  reason?: string;
  canAccept: boolean;
  canArrive: boolean;
  canStart: boolean;
  canUploadProof: boolean;
  canManageParts: boolean;
  canComplete: boolean;
  canRetryInvoice: boolean;
}
export interface TechnicianJourney {
  canTrack: boolean;
  destinationAvailable: boolean;
  clientIntervalMs: number;
  requiredReadings: number;
  radiusMeters: number;
}
export interface TechnicianJob {
  _id: string;
  status: string;
  bookingId?: {
    _id: string;
    serviceType?: string;
    subService?: string;
    customerId?: { _id?: string; name?: string; phone?: string } | null;
    address?: Address;
    scheduledAt?: string;
    notes?: string;
    pricing?: { finalPrice?: number; quantity?: number; unit?: string };
  } | null;
  scheduledAt?: string;
  createdAt?: string;
  arrivedAt?: string;
  startTime?: string;
  endTime?: string;
  proofRequired?: boolean;
  proofIds?: Array<{ _id: string; url?: string; thumbnailUrl?: string } | string>;
  partsUsed?: { partName: string; qty: number; price?: number }[];
  paymentStatus?: string;
  invoiceId?: string | { _id: string; invoiceNumber?: string } | null;
}
export interface TechnicianJobDetail {
  job: TechnicianJob;
  journey?: TechnicianJourney;
  workflow?: TechnicianWorkflow;
}
