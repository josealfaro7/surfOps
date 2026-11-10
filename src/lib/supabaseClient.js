import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export const ID_CARDS_BUCKET = 'id-cards';

/** Clave de caché de branding POR escuela + puntero a la última escuela usada (Zero-FOUC) */
const brandingKey = (schoolId) => `surfops_branding_${schoolId}`;
const LAST_BRANDING_KEY = 'surfops_branding_last';

/**
 * Catálogo de 4 paletas. Se aplican como variables CSS que tailwind.config.js
 * conecta a las clases blue-950 / sky-* / pink-* usadas en toda la UI.
 */
export const SCHOOL_THEME_PRESETS = {
  poisson_default: {
    id: 'poisson_default',
    name: 'Poisson Predeterminado',
    description: 'Azul Marino, Azul Cielo y Rosado Corporativo',
    palette: { primary: '#172554', primaryHover: '#1e3a8a', secondary: '#0284c7', accent: '#db2777' },
  },
  pacifico_esmeralda: {
    id: 'pacifico_esmeralda',
    name: 'Pacífico Esmeralda',
    description: 'Verde Bosque, Turquesa y Ámbar Solar',
    palette: { primary: '#064e3b', primaryHover: '#065f46', secondary: '#0d9488', accent: '#f59e0b' },
  },
  oceano_profundo: {
    id: 'oceano_profundo',
    name: 'Océano Profundo',
    description: 'Pizarra Oscuro, Azul Cielo y Cian Eléctrico',
    palette: { primary: '#0f172a', primaryHover: '#1e293b', secondary: '#0284c7', accent: '#06b6d4' },
  },
  costa_coral: {
    id: 'costa_coral',
    name: 'Costa Coral',
    description: 'Índigo Profundo, Azul Rey y Coral Vibrante',
    palette: { primary: '#1e1b4b', primaryHover: '#312e81', secondary: '#2563eb', accent: '#f97316' },
  },
};

export const DEFAULT_POISSON_BRANDING = {
  schoolId: null,
  slug: 'poisson',
  displayName: 'POISSON',
  monogram: 'P',
  tagline: 'Sistema de Gestión Operativa',
  logoStoragePath: null,
  themeId: 'poisson_default',
  themePalette: { ...SCHOOL_THEME_PRESETS.poisson_default.palette },
  latitude: -29.978,
  longitude: -71.36,
  timezone: 'America/Santiago',
};

export function resolveThemePresetId(palette = {}) {
  const primary = (palette.primary || '').toLowerCase();
  const match = Object.values(SCHOOL_THEME_PRESETS).find(
    (preset) => preset.palette.primary.toLowerCase() === primary
  );
  return match ? match.id : 'poisson_default';
}

/** Inyecta --brand-primary / --brand-primary-hover / --brand-secondary / --brand-accent */
export function applySchoolThemeToDOM(branding) {
  if (typeof document === 'undefined') return;
  const d = DEFAULT_POISSON_BRANDING.themePalette;
  const p = branding?.themePalette || d;
  const root = document.documentElement.style;
  root.setProperty('--brand-primary', p.primary || d.primary);
  root.setProperty('--brand-primary-hover', p.primaryHover || p.primary || d.primaryHover);
  root.setProperty('--brand-secondary', p.secondary || d.secondary);
  root.setProperty('--brand-accent', p.accent || d.accent);
}

export function normalizeSchoolBranding(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_POISSON_BRANDING };
  const d = DEFAULT_POISSON_BRANDING;
  const palette = raw.theme_palette || raw.themePalette || {};
  const themePalette = {
    primary: palette.primary || d.themePalette.primary,
    primaryHover: palette.primaryHover || palette.primary_hover || palette.primary || d.themePalette.primaryHover,
    secondary: palette.secondary || d.themePalette.secondary,
    accent: palette.accent || d.themePalette.accent,
  };
  const displayName = String(raw.display_name || raw.displayName || d.displayName).trim();
  const monogram = String(raw.monogram || displayName.slice(0, 1) || d.monogram)
    .trim()
    .slice(0, 3)
    .toUpperCase();
  const lat = Number(raw.latitude);
  const lng = Number(raw.longitude);

  return {
    schoolId: raw.id || raw.school_id || raw.schoolId || null,
    slug: String(raw.slug || d.slug).toLowerCase(),
    displayName,
    monogram,
    tagline: raw.tagline || d.tagline,
    logoStoragePath: raw.logo_storage_path ?? raw.logoStoragePath ?? null,
    themeId: raw.themeId || resolveThemePresetId(themePalette),
    themePalette,
    latitude: Number.isFinite(lat) ? lat : d.latitude,
    longitude: Number.isFinite(lng) ? lng : d.longitude,
    timezone: raw.timezone || d.timezone,
  };
}

/** Branding de la última escuela usada en este navegador (solo colores/nombre, sin datos operativos) */
export function getCachedSchoolBranding(schoolId = null) {
  try {
    const key = schoolId ? brandingKey(schoolId) : localStorage.getItem(LAST_BRANDING_KEY);
    if (key) {
      const raw = localStorage.getItem(key);
      if (raw) return normalizeSchoolBranding(JSON.parse(raw));
    }
  } catch {
    // caché corrupta o almacenamiento deshabilitado: usar valores por defecto
  }
  return { ...DEFAULT_POISSON_BRANDING };
}

export function cacheSchoolBranding(branding) {
  if (!branding?.schoolId) return;
  try {
    const key = brandingKey(branding.schoolId);
    localStorage.setItem(key, JSON.stringify(normalizeSchoolBranding(branding)));
    localStorage.setItem(LAST_BRANDING_KEY, key);
  } catch {
    // sin espacio o modo privado: el branding se volverá a pedir al servidor
  }
}

/** Lee el branding de public.schools para la escuela autenticada */
export async function loadSchoolBranding(schoolId) {
  if (!supabase || !schoolId) return getCachedSchoolBranding(schoolId);
  const { data, error } = await supabase
    .from('schools')
    .select('id, slug, display_name, monogram, tagline, logo_storage_path, theme_palette, latitude, longitude, timezone')
    .eq('id', schoolId)
    .maybeSingle();

  if (error || !data) {
    // Sin conexión: usar la caché de ESA escuela (nunca la de otra)
    return { ...getCachedSchoolBranding(schoolId), schoolId };
  }
  const normalized = normalizeSchoolBranding(data);
  cacheSchoolBranding(normalized);
  return normalized;
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteString = atob(data);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) bytes[i] = byteString.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Sube la foto de carnet a id-cards/{school_id}/{rental_id}.jpg y retorna la ruta */
export async function uploadIdCardPhoto(schoolId, rentalId, photoDataUrl) {
  const storagePath = `${schoolId}/${rentalId}.jpg`;
  const { data, error } = await supabase.storage
    .from(ID_CARDS_BUCKET)
    .upload(storagePath, dataUrlToBlob(photoDataUrl), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return data?.path || storagePath;
}

/** URL firmada de corta duración para ver un carnet en garantía */
export async function getSignedIdCardUrl(storagePath, expiresInSeconds = 60) {
  if (!supabase || !storagePath) return null;
  const { data, error } = await supabase.storage
    .from(ID_CARDS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl || null;
}
