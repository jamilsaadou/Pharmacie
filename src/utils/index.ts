import { clsx, type ClassValue } from 'clsx';

// Utilitaire pour combiner les classes CSS
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Formatage des prix
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF', // Franc CFA
  }).format(price);
}

// Alias pour formatPrice
export const formatCurrency = formatPrice;

// Formatage des dates
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Date invalide';

    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch {
    return 'Date invalide';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Date invalide';

    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch {
    return 'Date invalide';
  }
}

// Génération d'IDs uniques
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Génération de numéros de facture
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `FAC${year}${month}${day}${random}`;
}

// Base URL utils for server/client safe fetch
export function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  return 'http://localhost:3000';
}

export function buildUrl(path: string, params?: Record<string, any>): string {
  const base = getBaseUrl();
  const url = new URL(path, base);
  if (params) {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        usp.append(key, String(value));
      }
    });
    const qs = usp.toString();
    if (qs) url.search = qs; // évite d'avoir un '?' final vide
  }
  return url.toString();
}

export async function safeFetch(pathOrUrl: string, init?: RequestInit, params?: Record<string, any>) {
  const url = /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : buildUrl(pathOrUrl, params);
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return res;
}

// Calcul de la TVA
export function calculateTVA(amount: number, rate: number = 18): number {
  return (amount * rate) / 100;
}

// Calcul du total avec TVA
export function calculateTotalWithTVA(amount: number, tvaRate: number = 18): number {
  return amount + calculateTVA(amount, tvaRate);
}

// Vérification si un médicament est en stock faible
export function isLowStock(quantite: number, seuil: number): boolean {
  return quantite <= seuil;
}

// Vérification si un médicament est expiré
export function isExpired(dateExpiration: Date | string | null | undefined): boolean {
  if (!dateExpiration) return false;
  const expDate = typeof dateExpiration === 'string' ? new Date(dateExpiration) : dateExpiration;
  if (isNaN(expDate.getTime())) return false;
  return new Date() > expDate;
}

// Vérification si un médicament expire bientôt (dans les 30 jours)
export function isExpiringSoon(dateExpiration: Date | string | null | undefined, days: number = 30): boolean {
  if (!dateExpiration) return false;
  const today = new Date();
  const expirationDate = typeof dateExpiration === 'string' ? new Date(dateExpiration) : new Date(dateExpiration);
  if (isNaN(expirationDate.getTime())) return false;
  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= days && diffDays > 0;
}

// Calcul du nombre de jours jusqu'à expiration
export function daysUntilExpiration(dateExpiration: Date | string | null | undefined): number {
  if (!dateExpiration) return 0;
  const today = new Date();
  const expirationDate = typeof dateExpiration === 'string' ? new Date(dateExpiration) : new Date(dateExpiration);
  if (isNaN(expirationDate.getTime())) return 0;
  const diffTime = expirationDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Validation d'email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validation de numéro de téléphone (format français/africain)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+33|0)[1-9](\d{8})$|^(\+22[0-9]|00[0-9]{2})\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Formatage du numéro de téléphone
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

// Recherche dans un tableau d'objets
export function searchInArray<T>(
  array: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm) return array;
  
  const term = searchTerm.toLowerCase();
  return array.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      if (typeof value === 'number') {
        return value.toString().includes(term);
      }
      return false;
    })
  );
}

// Tri d'un tableau
export function sortArray<T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Pagination
export function paginate<T>(array: T[], page: number, itemsPerPage: number) {
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  return {
    items: array.slice(startIndex, endIndex),
    totalPages: Math.ceil(array.length / itemsPerPage),
    currentPage: page,
    totalItems: array.length,
    hasNextPage: endIndex < array.length,
    hasPrevPage: page > 1,
  };
}

// Debounce pour les recherches
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Conversion d'une date en string ISO pour les inputs
export function dateToInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Conversion d'un string ISO en Date
export function inputValueToDate(value: string): Date {
  return new Date(value);
}

// Calcul de l'âge à partir de la date de naissance
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Export de données en CSV
export function exportToCSV<T>(data: T[], filename: string, headers: Record<keyof T, string>) {
  // Ne rien faire côté serveur
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const csvContent = [
    Object.values(headers).join(','),
    ...data.map(item =>
      Object.keys(headers).map(key => {
        const value = item[key as keyof T] as any;
        if (value instanceof Date) {
          return formatDate(value);
        }
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
