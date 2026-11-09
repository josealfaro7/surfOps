import React from 'react';
import BauhausArt from './BauhausArt';

/**
 * ModuleHeader — "Two-Column Feature Section" adaptada a cabecera de módulo.
 * Columna izquierda: eyebrow + Section Heading (52px) + Body Paragraph (18px/1.82, 480px).
 * Columna derecha: Geometric Illustration Block + acciones/resumen opcionales.
 */
export default function ModuleHeader({
  eyebrow,
  title,
  accent,
  description,
  art = 'login',
  actions = null,
  aside = null,
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end pb-10 border-b border-midnight-ink">
      <div className="lg:col-span-8 space-y-6">
        {eyebrow && <span className="ed-eyebrow">{eyebrow}</span>}
        <h1 className="ed-h1">
          {title}
          {accent && (
            <>
              {' '}
              <span className="text-signal-blue">{accent}</span>
            </>
          )}
        </h1>
        {description && <p className="ed-body ed-measure">{description}</p>}
        {actions && <div className="flex flex-wrap items-center gap-4 pt-2">{actions}</div>}
      </div>
      <div className="lg:col-span-4 flex flex-col gap-6 lg:items-end">
        <BauhausArt variant={art} className="hidden lg:grid w-56 xl:w-64" />
        {aside}
      </div>
    </section>
  );
}
