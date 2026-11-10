import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Wallet } from 'lucide-react';

// Portada pública de SurfOps. Vive fuera de la sesión: no conoce la escuela,
// así que usa la paleta fija de la marca y no las variables white-label.
const MARCA = {
  fondo: '#172554',
  celeste: '#0284c7',
  celesteClaro: '#7dd3fc',
  texto: '#bae6fd',
  textoFuerte: '#e0f2fe',
  borde: '#5b7fd4',
};

const DISPLAY = "'Barlow Semi Condensed', system-ui, sans-serif";
const CUERPO = "'Atkinson Hyperlegible Next', system-ui, sans-serif";

const MODULOS = [
  {
    id: 'instructores',
    leyenda: 'Marca la llegada de cada instructor y la fila reparte las clases por turno.',
  },
  {
    id: 'clases',
    leyenda: 'Agenda clases sueltas y cursos, y deja cerrado el registro del día.',
  },
  {
    id: 'arriendos',
    leyenda: 'Entrega y devolución de equipos, con el carnet guardado solo mientras dura el arriendo.',
  },
  {
    id: 'caja',
    leyenda: 'El total de la jornada y lo que le corresponde a cada instructor, sin planillas.',
  },
];

const INTERVALO_MS = 3800;
const ESPERA_ENTRADA_MS = 1700;

const estiloLamina = (activa) => ({
  flex: '0 0 100%',
  height: '100%',
  boxSizing: 'border-box',
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  color: '#0f172a',
  opacity: activa ? 1 : 0,
  transition: 'opacity 600ms ease',
});

const filaBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '13px 0',
};

const separador = { borderTop: '1px solid #e2e8f0' };

const chip = (fondo, color) => ({
  fontSize: 13.5,
  fontWeight: 600,
  color,
  background: fondo,
  borderRadius: 999,
  padding: '5px 11px',
  whiteSpace: 'nowrap',
});

function TituloLamina({ titulo, bajada }) {
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontSize: 27, fontWeight: 700, color: MARCA.fondo, lineHeight: 1.1 }}>
        {titulo}
      </div>
      <div style={{ fontSize: 15, color: '#475569', marginTop: 4 }}>{bajada}</div>
    </>
  );
}

function LaminaInstructores() {
  const llegados = [
    ['Diego', '08:10', 'Turno 1'],
    ['Jose', '08:20', 'Turno 2'],
    ['Vitoco', '08:35', 'Turno 3'],
  ];
  return (
    <>
      <TituloLamina titulo="Llegada de instructores" bajada="Activos 3 de 5" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
        {llegados.map(([nombre, hora, turno], i) => (
          <div key={nombre} style={{ ...filaBase, ...(i > 0 ? separador : null) }}>
            <span style={{ flex: 1, fontSize: 18, fontWeight: 700 }}>{nombre}</span>
            <span style={{ fontSize: 14, color: '#64748b' }}>{hora}</span>
            <span style={chip(MARCA.fondo, '#ffffff')}>{turno}</span>
          </div>
        ))}
        <div style={{ ...filaBase, ...separador }}>
          <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: '#475569' }}>Caco</span>
          <span style={chip('#e2e8f0', '#475569')}>Aún no llega</span>
        </div>
      </div>
    </>
  );
}

function LaminaClases() {
  const clases = [
    ['09:00 Clase grupal', 'Diego, 4 alumnos', 'Realizada', true],
    ['10:30 Clase particular', 'Vitoco, 1 alumno', 'Agendada', false],
    ['15:00 Curso, sesión 2', 'Jose, 3 alumnos', 'Agendada', false],
  ];
  return (
    <>
      <TituloLamina titulo="Clases del día" bajada="Martes 10 de noviembre" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
        {clases.map(([titulo, detalle, estado, hecha], i) => (
          <div key={titulo} style={{ ...filaBase, padding: '14px 0', ...(i > 0 ? separador : null) }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 17.5, fontWeight: 700 }}>{titulo}</span>
              <span style={{ display: 'block', fontSize: 14.5, color: '#64748b', marginTop: 2 }}>{detalle}</span>
            </span>
            <span style={hecha ? chip('#e0f2fe', '#0369a1') : chip('#f1f5f9', '#475569')}>{estado}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function LaminaArriendos() {
  const arriendos = [
    ["Tabla 7'2 y traje", 'Camila R., devuelve 14:30'],
    ['Tabla 6′4', 'Marco T., devuelve 16:00'],
  ];
  return (
    <>
      <TituloLamina titulo="Arriendos activos" bajada="2 equipos fuera" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
        {arriendos.map(([equipo, detalle], i) => (
          <div key={equipo} style={{ ...filaBase, padding: '14px 0', ...(i > 0 ? separador : null) }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 17.5, fontWeight: 700 }}>{equipo}</span>
              <span style={{ display: 'block', fontSize: 14.5, color: '#64748b', marginTop: 2 }}>{detalle}</span>
            </span>
            <span style={chip('#e0f2fe', '#0369a1')}>Carnet ok</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid #e2e8f0',
          fontSize: 14.5,
          color: '#475569',
          lineHeight: 1.5,
        }}
      >
        La foto del carnet se borra al día siguiente de la devolución.
      </div>
    </>
  );
}

function LaminaCaja() {
  const lineas = [
    ['Clases y cursos', '$128.000'],
    ['Arriendos', '$56.000'],
    ['Pago a instructores', '$62.000'],
  ];
  return (
    <>
      <TituloLamina titulo="Cierre de caja" bajada="Al terminar la jornada" />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
        {lineas.map(([concepto, monto], i) => (
          <div
            key={concepto}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              padding: '12px 0',
              ...(i > 0 ? separador : null),
            }}
          >
            <span style={{ flex: 1, fontSize: 16.5, color: '#475569' }}>{concepto}</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600 }}>{monto}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          paddingTop: 16,
          borderTop: `2px solid ${MARCA.fondo}`,
        }}
      >
        <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: MARCA.fondo }}>Total del día</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 700, color: MARCA.fondo }}>$184.000</span>
      </div>
    </>
  );
}

const LAMINAS = [LaminaInstructores, LaminaClases, LaminaArriendos, LaminaCaja];

function Ventaja({ icono: Icono, clase, children }) {
  return (
    <li className={clase} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
      <Icono size={23} strokeWidth={1.8} color={MARCA.celesteClaro} style={{ flex: 'none' }} aria-hidden="true" />
      <span style={{ fontSize: 17.5, color: MARCA.textoFuerte }}>{children}</span>
    </li>
  );
}

export default function Landing() {
  const [indice, setIndice] = useState(0);

  const sinMovimiento = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (sinMovimiento) return undefined;
    // Arranca después de la secuencia de entrada: dos movimientos a la vez se
    // leen como ruido.
    let reloj;
    const espera = setTimeout(() => {
      reloj = setInterval(() => {
        setIndice((previo) => (previo + 1) % LAMINAS.length);
      }, INTERVALO_MS);
    }, ESPERA_ENTRADA_MS);
    return () => {
      clearTimeout(espera);
      if (reloj) clearInterval(reloj);
    };
  }, [sinMovimiento]);

  const irA = useCallback((n) => () => setIndice(n), []);

  const botonBase = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    padding: '0 32px',
    borderRadius: 8,
    textDecoration: 'none',
    fontFamily: DISPLAY,
    fontSize: 21,
    fontWeight: 600,
    letterSpacing: '0.01em',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        background: MARCA.fondo,
        color: '#ffffff',
        fontFamily: CUERPO,
        fontSize: 17,
      }}
    >
      <div
        style={{
          flex: '1 1 540px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
        className="landing-col-izq"
      >
        <header className="ent-logo" style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
            <rect x="0" y="0" width="40" height="40" rx="10" fill={MARCA.celeste} />
            <path
              d="M8 17c3-4.4 6-4.4 9 0s6 4.4 9 0"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M8 25c3-4.4 6-4.4 9 0s6 4.4 9 0"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>
          <span style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: '0.01em' }}>SurfOps</span>
        </header>

        <div className="landing-centro" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <main
            className="landing-texto"
            style={{
              width: '100%',
              maxWidth: 560,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
          >
            <div style={{ overflow: 'hidden', margin: '0 0 20px' }}>
              <h1
                className="landing-titulo ent-titulo"
                style={{ margin: 0, fontFamily: DISPLAY, lineHeight: 1.02, fontWeight: 700 }}
              >
                Ordena el día de tu escuela de surf desde la arena.
              </h1>
            </div>

            <p className="ent-sub" style={{ margin: '0 0 36px', fontSize: 19, lineHeight: 1.55, color: MARCA.texto }}>
              SurfOps reparte los turnos entre los instructores, registra las clases y los arriendos, y cierra la caja
              al final de la jornada.
            </p>

            <ul
              style={{
                margin: '0 0 40px',
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <Ventaja clase="ent-f1" icono={Users}>La fila de instructores rota sola, por turno</Ventaja>
              <Ventaja clase="ent-f2" icono={Calendar}>Clases, cursos y arriendos en un solo registro</Ventaja>
              <Ventaja clase="ent-f3" icono={Wallet}>El cierre de caja sale al terminar el día</Ventaja>
            </ul>

            <div className="ent-botones" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <Link to="/app" style={{ ...botonBase, background: '#ffffff', color: MARCA.fondo }}>
                Iniciar sesión
              </Link>
              <Link
                to="/app"
                style={{
                  ...botonBase,
                  border: `1.5px solid ${MARCA.borde}`,
                  background: 'transparent',
                  color: '#ffffff',
                }}
              >
                Solicitar una demo
              </Link>
            </div>
          </main>
        </div>
      </div>

      <div
        style={{
          flex: '1 1 460px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
        className="landing-col-der"
      >
        <div className="landing-hueco" style={{ flex: 'none' }} aria-hidden="true" />

        <div className="landing-centro" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <aside
            aria-label="Los módulos de SurfOps, uno tras otro"
            className="landing-bloque"
            style={{
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 16,
            }}
          >
            <div
              className="landing-marco ent-tarjeta"
              style={{
                flex: 'none',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: '0 26px 64px rgba(6, 16, 46, 0.5)',
              }}
            >
              <div className="landing-escala">
                <div
                  style={{
                    display: 'flex',
                    height: '100%',
                    transition: sinMovimiento ? 'none' : 'transform 640ms cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: `translateX(-${indice * 100}%)`,
                  }}
                >
                  {LAMINAS.map((Lamina, i) => (
                    <div key={MODULOS[i].id} style={estiloLamina(i === indice)}>
                      <Lamina />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="landing-leyenda ent-leyenda" style={{ position: 'relative', flex: 'none' }}>
              {MODULOS.map((modulo, i) => (
                <p
                  key={modulo.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    margin: 0,
                    fontSize: 22,
                    lineHeight: 1.45,
                    color: MARCA.texto,
                    textAlign: 'center',
                    transition: sinMovimiento ? 'none' : 'opacity 480ms ease',
                    opacity: i === indice ? 1 : 0,
                    pointerEvents: i === indice ? 'auto' : 'none',
                  }}
                >
                  {modulo.leyenda}
                </p>
              ))}
            </div>

            <div className="ent-puntos" style={{ display: 'flex', alignItems: 'center', gap: 5, height: 48, flex: 'none' }}>
              {MODULOS.map((modulo, i) => (
                <button
                  key={modulo.id}
                  type="button"
                  onClick={irA(i)}
                  aria-label={`Ver ${modulo.id}`}
                  aria-pressed={i === indice}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: 11,
                      width: i === indice ? 35 : 11,
                      borderRadius: 999,
                      backgroundColor: i === indice ? '#ffffff' : MARCA.borde,
                      transition: sinMovimiento ? 'none' : 'width 320ms ease, background-color 320ms ease',
                    }}
                  />
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
