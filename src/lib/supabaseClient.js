import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const BRANDING_STORAGE_KEY = 'surfops_school_branding';
export const ID_CARDS_BUCKET = 'id-cards';
export const DEFAULT_SCHOOL_ID =
  import.meta.env.VITE_DEFAULT_SCHOOL_ID ||
  '00000000-0000-0000-0000-000000000001';

/**
 * [EN STANDBY PARA GITHUB PAGES]
 * La extracción de subdominio desde window.location.hostname queda comentada
 * mientras la aplicación opere bajo el dominio compartido de GitHub Pages.
 */
/*
export function extractSchoolSlug() {
  if (typeof window === 'undefined') return 'poisson';
  const hostname = window.location.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.github.io')
  ) {
    return 'poisson';
  }
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0];
  }
  return 'poisson';
}
*/

/**
 * Catálogo oficial de 4 paletas de temas visuales para SurfOps ERP.
 */
export const SCHOOL_THEME_PRESETS = {
  poisson_default: {
    id: 'poisson_default',
    name: 'Poisson Predeterminado',
    description: 'Azul Marino, Azul Cielo y Rosado Corporativo',
    palette: {
      primary: '#172554',
      primaryHover: '#1e3a8a',
      secondary: '#0284c7',
      accent: '#db2777',
    },
  },
  pacifico_esmeralda: {
    id: 'pacifico_esmeralda',
    name: 'Pacífico Esmeralda',
    description: 'Verde Bosque, Turquesa y Ámbar Solar',
    palette: {
      primary: '#064e3b',
      primaryHover: '#065f46',
      secondary: '#0d9488',
      accent: '#f59e0b',
    },
  },
  oceano_profundo: {
    id: 'oceano_profundo',
    name: 'Océano Profundo',
    description: 'Pizarra Oscuro, Azul Cielo y Cian Eléctrico',
    palette: {
      primary: '#0f172a',
      primaryHover: '#1e293b',
      secondary: '#0284c7',
      accent: '#06b6d4',
    },
  },
  costa_coral: {
    id: 'costa_coral',
    name: 'Costa Coral',
    description: 'Índigo Profundo, Azul Rey y Coral Vibrante',
    palette: {
      primary: '#1e1b4b',
      primaryHover: '#312e81',
      secondary: '#2563eb',
      accent: '#f97316',
    },
  },
};

export const DEFAULT_POISSON_BRANDING = {
  schoolId: DEFAULT_SCHOOL_ID,
  slug: 'poisson',
  displayName: 'POISSON',
  monogram: 'P',
  tagline: 'Sistema de Gestión Operativa',
  logoStoragePath: null,
  themeId: 'poisson_default',
  themePalette: {
    ...SCHOOL_THEME_PRESETS.poisson_default.palette,
  },
  latitude: -29.978,
  longitude: -71.36,
  timezone: 'America/Santiago',
};

/**
 * Detecta a cuál de los 4 presets corresponde una paleta de colores dada.
 */
export function resolveThemePresetId(palette = {}) {
  const primary = (palette.primary || '').toLowerCase();
  const match = Object.values(SCHOOL_THEME_PRESETS).find(
    (preset) => preset.palette.primary.toLowerCase() === primary
  );
  return match ? match.id : 'poisson_default';
}

/**
 * Inyecta dinámicamente las variables CSS (--brand-primary, --brand-secondary, --brand-accent)
 * directamente en document.documentElement.style.
 */
export function applySchoolThemeToDOM(branding) {
  if (typeof document === 'undefined') return;
  const palette =
    branding?.themePalette || DEFAULT_POISSON_BRANDING.themePalette;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty(
    '--brand-primary',
    palette.primary || DEFAULT_POISSON_BRANDING.themePalette.primary
  );
  rootStyle.setProperty(
    '--brand-secondary',
    palette.secondary || DEFAULT_POISSON_BRANDING.themePalette.secondary
  );
  rootStyle.setProperty(
    '--brand-accent',
    palette.accent || DEFAULT_POISSON_BRANDING.themePalette.accent
  );
}

/**
 * Normaliza un registro proveniente de public.schools o de localStorage
 * hacia la estructura empleada en el estado global de React.
 */
export function normalizeSchoolBranding(raw, fallbackSchoolId = DEFAULT_SCHOOL_ID) {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_POISSON_BRANDING,
      schoolId: fallbackSchoolId || DEFAULT_SCHOOL_ID,
    };
  }

  const palette = raw.theme_palette || raw.themePalette || {};
  const normalizedPalette = {
    primary: palette.primary || DEFAULT_POISSON_BRANDING.themePalette.primary,
    primaryHover:
      palette.primaryHover ||
      palette.primary_hover ||
      DEFAULT_POISSON_BRANDING.themePalette.primaryHover,
    secondary:
      palette.secondary || DEFAULT_POISSON_BRANDING.themePalette.secondary,
    accent: palette.accent || DEFAULT_POISSON_BRANDING.themePalette.accent,
  };

  const displayName = (
    raw.display_name ||
    raw.displayName ||
    raw.name ||
    DEFAULT_POISSON_BRANDING.displayName
  ).trim();

  const monogram = (
    raw.monogram ||
    displayName.slice(0, 1) ||
    DEFAULT_POISSON_BRANDING.monogram
  )
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return {
    schoolId:
      raw.id || raw.school_id || raw.schoolId || fallbackSchoolId || DEFAULT_SCHOOL_ID,
    slug: (raw.slug || 'poisson').toLowerCase(),
    displayName,
    monogram,
    tagline: raw.tagline || DEFAULT_POISSON_BRANDING.tagline,
    logoStoragePath: raw.logo_storage_path ?? raw.logoStoragePath ?? null,
    themeId: raw.themeId || raw.theme_id || resolveThemePresetId(normalizedPalette),
    themePalette: normalizedPalette,
    latitude: Number(raw.latitude ?? DEFAULT_POISSON_BRANDING.latitude),
    longitude: Number(raw.longitude ?? DEFAULT_POISSON_BRANDING.longitude),
    timezone: raw.timezone || DEFAULT_POISSON_BRANDING.timezone,
  };
}

/**
 * Lee síncronamente surfops_school_branding desde localStorage para evitar FOUC.
 */
export function getCachedSchoolBranding() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_POISSON_BRANDING };
  }

  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeSchoolBranding(parsed);
    }
  } catch {
    // Ignorar errores de parseo en localStorage
  }

  return { ...DEFAULT_POISSON_BRANDING };
}

/**
 * Guarda la configuración de branding en localStorage (surfops_school_branding).
 */
export function cacheSchoolBranding(branding) {
  if (typeof window === 'undefined' || !branding) return;
  try {
    const normalized = normalizeSchoolBranding(branding, branding.schoolId);
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignorar errores de cuota o privacidad en localStorage
  }
}

/**
 * Obtiene la configuración de la escuela desde public.schools filtrando por schoolId (auth.uid()),
 * la guarda en localStorage bajo 'surfops_school_branding' y la retorna normalizada.
 */
export async function loadSchoolBranding(schoolId) {
  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;

  if (supabase && targetSchoolId) {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(
          'id, slug, name, display_name, monogram, tagline, logo_storage_path, theme_palette, latitude, longitude, timezone'
        )
        .eq('id', targetSchoolId)
        .maybeSingle();

      if (!error && data) {
        const normalized = normalizeSchoolBranding(data, targetSchoolId);
        cacheSchoolBranding(normalized);
        applySchoolThemeToDOM(normalized);
        return normalized;
      }
    } catch {
      // Fallback a caché local o tema predeterminado si no hay conexión
    }
  }

  const cached = getCachedSchoolBranding();
  const fallback = normalizeSchoolBranding(
    {
      ...cached,
      schoolId: targetSchoolId,
    },
    targetSchoolId
  );
  cacheSchoolBranding(fallback);
  applySchoolThemeToDOM(fallback);
  return fallback;
}

/**
 * Convierte un Data URL Base64 en un Blob para Supabase Storage.
 */
function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  if (header.includes('base64')) {
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i += 1) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  return new Blob([decodeURIComponent(data)], { type: mime });
}

/**
 * Sube la fotografía de carnet al bucket privado 'id-cards' bajo {school_id}/{rental_id}.jpg
 * y retorna id_photo_storage_path.
 */
export async function uploadIdCardPhoto(schoolId, rentalId, photoInput) {
  const storagePath = `${schoolId}/${rentalId}.jpg`;
  if (!supabase || !photoInput) {
    return storagePath;
  }

  const fileBody =
    typeof photoInput === 'string' && photoInput.startsWith('data:')
      ? dataUrlToBlob(photoInput)
      : photoInput;

  const { data, error } = await supabase.storage
    .from(ID_CARDS_BUCKET)
    .upload(storagePath, fileBody, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return data?.path || storagePath;
}

/**
 * Genera una URL firmada temporal (60 segundos por defecto) para visualizar un carnet en garantía.
 */
export async function getSignedIdCardUrl(storagePath, expiresInSeconds = 60) {
  if (!supabase || !storagePath) return null;

  const { data, error } = await supabase.storage
    .from(ID_CARDS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data?.signedUrl || null;
}
