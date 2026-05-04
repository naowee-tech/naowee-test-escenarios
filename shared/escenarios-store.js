/* ═══════════════════════════════════════════════════════════════
   EscStore — fuente única de verdad para registros de escenarios
   Persistencia: localStorage (sobrevive cierre de pestaña)
   Uso: cargar este script ANTES del JS de la página que lo consuma
   ═══════════════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const STORAGE_KEY = 'regDrafts';
  const SESSION_LEGACY_KEY = 'regDrafts'; // misma key, distinto storage
  const SEED_FLAG_KEY = 'regDraftsSeeded'; // para no resemilla en cada visita
  const REV_LEGACY_KEY = 'revEstados'; // se ignora, todo va al store
  const SHOW_TOAST_KEY = 'escToast'; // mensajes flotantes entre páginas
  const GESTOR_NAME = 'Juan Hernández Granados';
  const REVISOR_NAME = 'María Alejandra Gómez';

  // ─── Estados y mappings DS ─────────────────────────────────────
  const ESTADO_BADGE = {
    'borrador':  { label: 'Borrador',     variant: 'neutral' },
    'revision':  { label: 'En revisión',  variant: 'caution' },
    'activo':    { label: 'Activo',       variant: 'positive' },
    'rechazado': { label: 'Rechazado',    variant: 'negative' }
  };
  const DOC_BADGE = {
    'pendiente': { label: 'Pendiente', variant: 'informative' },
    'aprobado':  { label: 'Aprobado',  variant: 'positive' },
    'rechazado': { label: 'Rechazado', variant: 'negative' }
  };

  // ─── IO básico ─────────────────────────────────────────────────
  function read(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function write(arr){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
    catch(e){ /* quota / privacy mode */ }
  }

  // ─── Migración legacy desde sessionStorage ─────────────────────
  function migrateLegacy(){
    try {
      const legacyRaw = sessionStorage.getItem(SESSION_LEGACY_KEY);
      if(!legacyRaw) return;
      const legacy = JSON.parse(legacyRaw);
      if(!Array.isArray(legacy) || legacy.length === 0) return;
      // Si localStorage ya tiene datos, no pisar — solo borrar legacy
      const current = read();
      if(current.length === 0){
        const migrated = legacy.map(d => normalizeRecord(d));
        write(migrated);
      }
      sessionStorage.removeItem(SESSION_LEGACY_KEY);
      sessionStorage.removeItem(REV_LEGACY_KEY);
    } catch(e){}
  }

  // ─── Normalización: asegurar campos requeridos por el modelo ───
  function normalizeRecord(d){
    if(!d || typeof d !== 'object') return d;
    if(!d.status) d.status = 'borrador';
    if(d.sentAt === undefined) d.sentAt = null;
    if(d.reviewedAt === undefined) d.reviewedAt = null;
    if(d.reviewerName === undefined) d.reviewerName = null;
    // Solicitud de actualización (ciclo: gestor pide cambio a un registro ya activo)
    if(d.updateRequest === undefined) d.updateRequest = null;
    if(!d.documentacion || typeof d.documentacion !== 'object') d.documentacion = {};
    Object.keys(d.documentacion).forEach(docId => {
      const doc = d.documentacion[docId];
      if(typeof doc === 'string'){
        d.documentacion[docId] = { file: doc, uploadedAt: null, docStatus: 'pendiente', notaRechazo: null, reviewedAt: null };
      } else if(doc && typeof doc === 'object'){
        if(!doc.docStatus) doc.docStatus = 'pendiente';
        if(doc.notaRechazo === undefined) doc.notaRechazo = null;
        if(doc.reviewedAt === undefined) doc.reviewedAt = null;
      }
    });
    if(!Array.isArray(d.historial)) d.historial = [];
    return d;
  }

  // ─── Eventos / historial ───────────────────────────────────────
  function buildEvent(category, title, desc, actor, actorName){
    return {
      ts: Date.now(),
      category: category || 'estado',
      title: title || '',
      desc: desc || '',
      actor: actor || 'sistema',
      actorName: actorName || ''
    };
  }
  function pushEvent(idx, evento){
    const arr = read();
    if(!arr[idx]) return;
    if(!Array.isArray(arr[idx].historial)) arr[idx].historial = [];
    arr[idx].historial.push(evento);
    write(arr);
  }

  // ─── API CRUD ──────────────────────────────────────────────────
  function getAll(){ return read().map(normalizeRecord); }
  // Variante ordenada (más reciente primero) que preserva el índice global del store.
  // Devuelve [{record, originalIdx}, ...] para que el consumidor pueda rutear por idx.
  function getAllSorted(){
    return read()
      .map((d, i) => ({ record: normalizeRecord(d), originalIdx: i }))
      .sort((a, b) => {
        const ta = a.record.sentAt || a.record.reviewedAt || a.record.savedAt || 0;
        const tb = b.record.sentAt || b.record.reviewedAt || b.record.savedAt || 0;
        return tb - ta;
      });
  }
  function setAll(arr){ write(arr); }
  function get(idx){ const arr = read(); return arr[idx] ? normalizeRecord(arr[idx]) : null; }
  function update(idx, patch){
    const arr = read();
    if(!arr[idx]) return null;
    arr[idx] = Object.assign(arr[idx], patch || {});
    write(arr);
    return arr[idx];
  }
  function add(record){
    const arr = read();
    const norm = normalizeRecord(record || {});
    if(!norm.savedAt) norm.savedAt = Date.now();
    arr.push(norm);
    write(arr);
    return arr.length - 1;
  }
  function remove(idx){
    const arr = read();
    if(idx < 0 || idx >= arr.length) return;
    arr.splice(idx, 1);
    write(arr);
  }

  // ─── Helpers de flujo (las acciones del negocio) ───────────────
  function sendToReview(idx, actorName){
    const arr = read();
    if(!arr[idx]) return;
    const wasRejected = arr[idx].status === 'rechazado';
    // Si venimos de una solicitud de actualización aprobada, este reenvío
    // cierra ese ciclo. El evento de la solicitud ya está en historial.
    const hadApprovedUpdateReq = arr[idx].updateRequest && arr[idx].updateRequest.status === 'approved';
    arr[idx].status = 'revision';
    arr[idx].sentAt = Date.now();
    if(wasRejected){
      // Limpiar estado de docs rechazados al reenviar (gestor corrigió)
      const docs = arr[idx].documentacion || {};
      Object.keys(docs).forEach(k => {
        if(docs[k] && docs[k].docStatus === 'rechazado'){
          docs[k].docStatus = 'pendiente';
          docs[k].notaRechazo = null;
          docs[k].reviewedAt = null;
        }
      });
    }
    if(hadApprovedUpdateReq){
      // Limpiar la solicitud ya completada (el ciclo se cerró)
      arr[idx].updateRequest = null;
    }
    write(arr);
    let title, desc;
    if(hadApprovedUpdateReq){
      title = 'Reenviado tras actualización';
      desc = 'El gestor aplicó los cambios solicitados y reenvió el registro a revisión.';
    } else if(wasRejected){
      title = 'Reenviado a revisión';
      desc = 'El gestor reenvió el registro tras aplicar correcciones.';
    } else {
      title = 'Enviado a revisión';
      desc = 'El registro fue enviado al revisor.';
    }
    pushEvent(idx, buildEvent('estado', title, desc, 'gestor', actorName || GESTOR_NAME));
  }

  // ─── Solicitud de actualización (update request) ──────────────────
  // Ciclo: gestor activo pide cambio → revisor aprueba (→ record a borrador
  // para editar) o rechaza (→ record sigue activo, con nota del revisor).
  function createUpdateRequest(idx, motivo, actorName){
    const arr = read();
    if(!arr[idx]) return;
    if(arr[idx].status !== 'activo') return; // precondición
    if(arr[idx].updateRequest && arr[idx].updateRequest.status === 'pending') return;
    arr[idx].updateRequest = {
      status: 'pending',
      createdAt: Date.now(),
      motivo: motivo || '',
      reviewedAt: null,
      reviewerName: null,
      reviewerNota: null
    };
    write(arr);
    pushEvent(idx, buildEvent(
      'estado', 'Solicitud de actualización creada',
      motivo || 'El gestor solicitó actualizar el registro.',
      'gestor', actorName || GESTOR_NAME
    ));
  }
  function approveUpdateRequest(idx, reviewerName){
    const arr = read();
    if(!arr[idx]) return;
    if(!arr[idx].updateRequest || arr[idx].updateRequest.status !== 'pending') return;
    arr[idx].updateRequest.status = 'approved';
    arr[idx].updateRequest.reviewedAt = Date.now();
    arr[idx].updateRequest.reviewerName = reviewerName || REVISOR_NAME;
    // El registro vuelve a modo edición (borrador) para que el gestor actualice
    arr[idx].status = 'borrador';
    // Reseteamos metadata de revisión previa — empieza nuevo ciclo
    arr[idx].sentAt = null;
    write(arr);
    pushEvent(idx, buildEvent(
      'estado', 'Solicitud de actualización aprobada',
      'El revisor aprobó la solicitud. El gestor puede actualizar el registro y reenviarlo a revisión.',
      'revisor', reviewerName || REVISOR_NAME
    ));
  }
  function rejectUpdateRequest(idx, reviewerName, nota){
    const arr = read();
    if(!arr[idx]) return;
    if(!arr[idx].updateRequest || arr[idx].updateRequest.status !== 'pending') return;
    arr[idx].updateRequest.status = 'rejected';
    arr[idx].updateRequest.reviewedAt = Date.now();
    arr[idx].updateRequest.reviewerName = reviewerName || REVISOR_NAME;
    arr[idx].updateRequest.reviewerNota = nota || '';
    // El registro sigue activo (no cambia status)
    write(arr);
    pushEvent(idx, buildEvent(
      'estado', 'Solicitud de actualización rechazada',
      nota || 'El revisor rechazó la solicitud. El registro se mantiene activo sin cambios.',
      'revisor', reviewerName || REVISOR_NAME
    ));
  }
  function approve(idx, reviewerName){
    const arr = read();
    if(!arr[idx]) return;
    arr[idx].status = 'activo';
    arr[idx].reviewedAt = Date.now();
    arr[idx].reviewerName = reviewerName || REVISOR_NAME;
    write(arr);
    pushEvent(idx, buildEvent(
      'estado', 'Registro aprobado',
      'El revisor aprobó el registro y todos sus documentos.',
      'revisor', reviewerName || REVISOR_NAME
    ));
  }
  function reject(idx, reviewerName, motivo){
    const arr = read();
    if(!arr[idx]) return;
    arr[idx].status = 'rechazado';
    arr[idx].reviewedAt = Date.now();
    arr[idx].reviewerName = reviewerName || REVISOR_NAME;
    write(arr);
    pushEvent(idx, buildEvent(
      'estado', 'Registro rechazado',
      motivo || 'El revisor rechazó el registro. Revisa los documentos con observaciones.',
      'revisor', reviewerName || REVISOR_NAME
    ));
  }
  function approveDoc(idx, docId, reviewerName){
    const arr = read();
    if(!arr[idx]) return;
    if(!arr[idx].documentacion) arr[idx].documentacion = {};
    if(!arr[idx].documentacion[docId]) arr[idx].documentacion[docId] = { file: null };
    arr[idx].documentacion[docId].docStatus = 'aprobado';
    arr[idx].documentacion[docId].notaRechazo = null;
    arr[idx].documentacion[docId].reviewedAt = Date.now();
    write(arr);
    pushEvent(idx, buildEvent(
      'documentos', 'Documento aprobado',
      `${docLabel(docId)} fue aprobado por el revisor.`,
      'revisor', reviewerName || REVISOR_NAME
    ));
  }
  function rejectDoc(idx, docId, reviewerName, nota){
    const arr = read();
    if(!arr[idx]) return;
    if(!arr[idx].documentacion) arr[idx].documentacion = {};
    if(!arr[idx].documentacion[docId]) arr[idx].documentacion[docId] = { file: null };
    arr[idx].documentacion[docId].docStatus = 'rechazado';
    arr[idx].documentacion[docId].notaRechazo = nota || 'Documento rechazado.';
    arr[idx].documentacion[docId].reviewedAt = Date.now();
    write(arr);
    pushEvent(idx, buildEvent(
      'documentos', 'Documento rechazado',
      `${docLabel(docId)}: ${nota || 'sin nota'}`,
      'revisor', reviewerName || REVISOR_NAME
    ));
  }

  // ─── Labels conocidos para mensajes humanos en el historial ────
  const DOC_LABELS = {
    fotoFrontalGeneral: 'Foto frontal general',
    fotoPanoramica: 'Foto panorámica',
    fotoInstalaciones: 'Fotos instalaciones',
    planoEscenario: 'Plano del escenario',
    planoLocalizacion: 'Plano de localización',
    docPropiedad: 'Documento de propiedad',
    conceptoBomberos: 'Concepto bomberos',
    conceptoSalud: 'Concepto salud',
    conceptoInfraestructura: 'Concepto infraestructura',
    resolucionCreacion: 'Resolución de creación'
  };
  function docLabel(docId){ return DOC_LABELS[docId] || docId; }

  // ─── Toasts entre páginas ──────────────────────────────────────
  function setToast(payload){
    try { sessionStorage.setItem(SHOW_TOAST_KEY, JSON.stringify(payload || {})); }
    catch(e){}
  }
  function consumeToast(){
    try {
      const raw = sessionStorage.getItem(SHOW_TOAST_KEY);
      if(!raw) return null;
      sessionStorage.removeItem(SHOW_TOAST_KEY);
      return JSON.parse(raw);
    } catch(e){ return null; }
  }

  // ─── Semilla de demo (4 registros con estados coherentes) ─────
  function buildSeed(){
    const now = Date.now();
    const days = (n) => now - n * 86400000;
    const hours = (n) => now - n * 3600000;

    const seed = [
      // ── 1. BORRADOR ─────────────────────────────
      {
        nombre: 'Centro deportivo Prado',
        catastral: '110011010100120000900099000110',
        departamento: 'Antioquia',
        municipio: 'Medellín',
        lat: 6.2518, lon: -75.5636,
        direccion: 'Cra 30 #24-50',
        corregimiento: '',
        zona: 'Urbana',
        entidad: 'Alcaldía de Medellín',
        propietario: 'Ente territorial',
        administradora: 'INDER Medellín',
        tenencia: 'Comodato',
        telefono: '3001234567',
        correoResp: 'juan@medellin.gov.co',
        tipoEscenario: 'Cancha múltiple',
        fichaComun: { areaTotal:'5000', areaUtil:'3200', cubierto:'Mixto', capacidad:'500', anioCons:'2018', anioRemod:'', estado:'Bueno' },
        subEspacios: [
          { nombre:'Cancha principal', tipo:'Cancha múltiple', ficha:{ dimLargo:'40', dimAncho:'20', superficie:'Concreto' } }
        ],
        subCount: 1,
        disciplinas: ['Microfútbol','Baloncesto','Voleibol'],
        responsable: GESTOR_NAME,
        car: false,
        savedAt: days(2),
        sentAt: null,
        reviewedAt: null,
        reviewerName: null,
        status: 'borrador',
        documentacion: {},
        historial: [
          { ts: days(2), category: 'asignaciones', title: 'Registro creado', desc: 'Borrador iniciado por el gestor.', actor: 'gestor', actorName: GESTOR_NAME }
        ]
      },
      // ── 2. EN REVISIÓN ──────────────────────────
      {
        nombre: 'Centro deportivo Miramar',
        catastral: '080010101000000010901900000099',
        departamento: 'Atlántico',
        municipio: 'Barranquilla',
        lat: 10.9685, lon: -74.7813,
        direccion: 'Cra 51B #87-50, El Prado',
        corregimiento: '',
        zona: 'Urbana',
        entidad: 'Alcaldía de Barranquilla',
        propietario: 'Ente territorial',
        administradora: 'IDRD Atlántico',
        tenencia: 'Propiedad',
        telefono: '3002345678',
        correoResp: 'gestor@barranquilla.gov.co',
        tipoEscenario: 'Piscina',
        fichaComun: { areaTotal:'2400', areaUtil:'1800', cubierto:'Cubierto', capacidad:'800', anioCons:'2014', anioRemod:'2022', estado:'Excelente' },
        subEspacios: [
          { nombre:'Piscina olímpica', tipo:'Piscina', ficha:{ longitud:'50', ancho:'25', profMin:'1.2', profMax:'2.5', carriles:'8', tipoPiscina:'Olímpica', tratamiento:'Cloro', climatizada:true } }
        ],
        subCount: 1,
        disciplinas: ['Natación','Waterpolo','Nado sincronizado'],
        responsable: GESTOR_NAME,
        car: true,
        savedAt: days(7),
        sentAt: hours(3),
        reviewedAt: null,
        reviewerName: null,
        status: 'revision',
        documentacion: {
          fotoFrontalGeneral: { file: 'foto-frontal.jpg', uploadedAt: days(7), docStatus: 'pendiente', notaRechazo: null, reviewedAt: null },
          fotoPanoramica: { file: 'foto-panoramica.jpg', uploadedAt: days(7), docStatus: 'pendiente', notaRechazo: null, reviewedAt: null },
          planoEscenario: { file: 'plano.pdf', uploadedAt: days(6), docStatus: 'pendiente', notaRechazo: null, reviewedAt: null },
          docPropiedad: { file: 'propiedad.pdf', uploadedAt: days(6), docStatus: 'pendiente', notaRechazo: null, reviewedAt: null }
        },
        historial: [
          { ts: days(7), category: 'asignaciones', title: 'Registro creado', desc: 'El gestor creó el registro inicial.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: days(6), category: 'documentos', title: 'Documentación cargada', desc: '4 documentos cargados.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: hours(3), category: 'estado', title: 'Enviado a revisión', desc: 'El registro fue enviado al revisor.', actor: 'gestor', actorName: GESTOR_NAME }
        ]
      },
      // ── 3. ACTIVO ───────────────────────────────
      {
        nombre: 'Centro deportivo Norte',
        catastral: '110010101000000020101010101099',
        departamento: 'Cundinamarca',
        municipio: 'Bogotá D.C.',
        lat: 4.6486, lon: -74.0639,
        direccion: 'Cra 68 #55-65, Salitre',
        corregimiento: '',
        zona: 'Urbana',
        entidad: 'Alcaldía Mayor de Bogotá',
        propietario: 'Ente territorial',
        administradora: 'IDRD Bogotá',
        tenencia: 'Propiedad',
        telefono: '3003456789',
        correoResp: 'gestor@bogota.gov.co',
        tipoEscenario: 'Coliseo',
        fichaComun: { areaTotal:'12000', areaUtil:'8500', cubierto:'Cubierto', capacidad:'3500', anioCons:'2010', anioRemod:'2023', estado:'Bueno' },
        subEspacios: [
          { nombre:'Coliseo principal', tipo:'Coliseo', ficha:{ largoCancha:'40', anchoCancha:'20', superficie:'Parquet', alturaTecho:'12' } }
        ],
        subCount: 1,
        disciplinas: ['Baloncesto','Voleibol','Fútbol sala','Balonmano'],
        responsable: GESTOR_NAME,
        car: true,
        savedAt: days(20),
        sentAt: days(15),
        reviewedAt: days(10),
        reviewerName: REVISOR_NAME,
        status: 'activo',
        documentacion: {
          fotoFrontalGeneral: { file: 'frontal.jpg', uploadedAt: days(18), docStatus: 'aprobado', notaRechazo: null, reviewedAt: days(10) },
          fotoPanoramica: { file: 'panoramica.jpg', uploadedAt: days(18), docStatus: 'aprobado', notaRechazo: null, reviewedAt: days(10) },
          planoEscenario: { file: 'plano.pdf', uploadedAt: days(17), docStatus: 'aprobado', notaRechazo: null, reviewedAt: days(10) },
          docPropiedad: { file: 'propiedad.pdf', uploadedAt: days(17), docStatus: 'aprobado', notaRechazo: null, reviewedAt: days(10) }
        },
        historial: [
          { ts: days(20), category: 'asignaciones', title: 'Registro creado', desc: 'El gestor creó el registro inicial.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: days(18), category: 'documentos', title: 'Documentación cargada', desc: '4 documentos cargados.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: days(15), category: 'estado', title: 'Enviado a revisión', desc: 'El registro fue enviado al revisor.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: days(10), category: 'estado', title: 'Registro aprobado', desc: 'El revisor aprobó el registro y todos sus documentos.', actor: 'revisor', actorName: REVISOR_NAME }
        ]
      },
      // ── 4. RECHAZADO (con docs rechazados y notas reales) ─────
      {
        nombre: 'Centro deportivo Sur',
        catastral: '760010101000000010404040404099',
        departamento: 'Valle del Cauca',
        municipio: 'Cali',
        lat: 3.4516, lon: -76.5320,
        direccion: 'Cl. 5 #66-00, San Fernando',
        corregimiento: '',
        zona: 'Urbana',
        entidad: 'Alcaldía de Cali',
        propietario: 'Ente territorial',
        administradora: 'Secretaría del Deporte Cali',
        tenencia: 'Comodato',
        telefono: '3004567890',
        correoResp: 'gestor@cali.gov.co',
        tipoEscenario: 'Estadio',
        fichaComun: { areaTotal:'45000', areaUtil:'7200', cubierto:'Descubierto', capacidad:'45000', anioCons:'1971', anioRemod:'2011', estado:'Regular' },
        subEspacios: [
          { nombre:'Estadio Olímpico', tipo:'Estadio', ficha:{ largoTerreno:'105', anchoTerreno:'68', superficie:'Césped natural', iluminacionPro:true, pistaAtletica:true } }
        ],
        subCount: 1,
        disciplinas: ['Fútbol','Atletismo'],
        responsable: GESTOR_NAME,
        car: false,
        savedAt: days(15),
        sentAt: days(10),
        reviewedAt: days(5),
        reviewerName: REVISOR_NAME,
        status: 'rechazado',
        documentacion: {
          fotoFrontalGeneral: {
            file: 'frontal.jpg', uploadedAt: days(13),
            docStatus: 'rechazado', reviewedAt: days(5),
            notaRechazo: 'La imagen no corresponde al escenario registrado. Se requiere una fotografía frontal clara donde se identifique la fachada principal de la instalación.'
          },
          fotoPanoramica: {
            file: 'panoramica.jpg', uploadedAt: days(13),
            docStatus: 'aprobado', notaRechazo: null, reviewedAt: days(5)
          },
          planoEscenario: {
            file: 'plano.pdf', uploadedAt: days(12),
            docStatus: 'rechazado', reviewedAt: days(5),
            notaRechazo: 'El plano presentado no incluye las medidas reglamentarias ni la distribución de las áreas de juego. Debe cumplir con la normativa vigente.'
          },
          docPropiedad: {
            file: 'propiedad.pdf', uploadedAt: days(12),
            docStatus: 'aprobado', notaRechazo: null, reviewedAt: days(5)
          }
        },
        historial: [
          { ts: days(15), category: 'asignaciones', title: 'Registro creado', desc: 'El gestor creó el registro inicial.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: days(13), category: 'documentos', title: 'Documentación cargada', desc: '4 documentos cargados.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: days(10), category: 'estado', title: 'Enviado a revisión', desc: 'El registro fue enviado al revisor.', actor: 'gestor', actorName: GESTOR_NAME },
          { ts: days(5), category: 'documentos', title: 'Documento rechazado', desc: 'Foto frontal general: imagen no corresponde al escenario.', actor: 'revisor', actorName: REVISOR_NAME },
          { ts: days(5), category: 'documentos', title: 'Documento aprobado', desc: 'Foto panorámica fue aprobada.', actor: 'revisor', actorName: REVISOR_NAME },
          { ts: days(5), category: 'documentos', title: 'Documento rechazado', desc: 'Plano del escenario: falta normativa vigente.', actor: 'revisor', actorName: REVISOR_NAME },
          { ts: days(5), category: 'documentos', title: 'Documento aprobado', desc: 'Documento de propiedad fue aprobado.', actor: 'revisor', actorName: REVISOR_NAME },
          { ts: days(5), category: 'estado', title: 'Registro rechazado', desc: 'El revisor rechazó el registro. Revisa los documentos con observaciones.', actor: 'revisor', actorName: REVISOR_NAME }
        ]
      }
    ];
    return seed;
  }

  function seed(){
    const arr = read();
    if(arr.length === 0){
      write(buildSeed());
      try { localStorage.setItem(SEED_FLAG_KEY, '1'); } catch(e){}
    }
  }
  function reset(){
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SEED_FLAG_KEY); } catch(e){}
    seed();
  }

  // ─── Inicialización al cargar el script ────────────────────────
  migrateLegacy();
  seed();

  // ─── Exponer API ───────────────────────────────────────────────
  global.EscStore = {
    STORAGE_KEY,
    GESTOR_NAME, REVISOR_NAME,
    ESTADO_BADGE, DOC_BADGE,
    docLabel,
    // CRUD
    getAll, getAllSorted, setAll, get, update, add, remove,
    // Flujo
    sendToReview, approve, reject, approveDoc, rejectDoc,
    createUpdateRequest, approveUpdateRequest, rejectUpdateRequest,
    // Historial
    pushEvent, buildEvent,
    // Toasts
    setToast, consumeToast,
    // Demo
    seed, reset
  };
})(window);
