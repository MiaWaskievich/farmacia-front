<template>
  <div>
    <div class="section-header">
      <div>
        <div class="section-title">MEDICAMENTOS</div>
        <div class="section-sub">Catálogo de productos registrados</div>
      </div>
      <button class="btn btn-primary btn-sm" @click="$emit('ir-a-registrar')">+ Nuevo</button>
    </div>

    <div class="filter-row">
      <input type="text" placeholder="Buscar por nombre, código..." v-model="searchMed">
      <select v-model="filterEstado">
        <option value="">Todos los estados</option>
        <option value="ok">Stock correcto</option>
        <option value="bajo">Stock bajo</option>
        <option value="agotado">Agotado</option>
      </select>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Laboratorio</th><th>Stock</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="medicamentosFiltrados.length === 0">
              <td colspan="7"><div class="empty">Sin resultados</div></td>
            </tr>
            <tr v-for="m in medicamentosFiltrados" :key="m.id">
              <td><code style="font-size:calc(13px * var(--zoom-texto));color:var(--orange)">{{ m.codigo }}</code></td>
              <td><b style="font-weight:500">{{ m.nombre }}</b><br><span style="font-size:calc(13px * var(--zoom-texto));color:var(--text2)">{{ m.presentacion }}</span></td>
              <td style="color:var(--text2)">{{ m.laboratorio }}</td>
              <td>
                {{ m.stock }} uds.
                <div class="stock-bar" style="margin-top:4px">
                  <div class="stock-fill" :class="getBarCls(m)" :style="{ width: Math.min(100, Math.round(m.stock / m.stock_min * 100)) + '%' }"></div>
                </div>
              </td>
              <td><button class="btn btn-secondary btn-sm" @click="abrirModalVencimientos(m)">Vencimiento</button></td>
              <td>
                <span class="badge" :class="getEstadoStock(m).cls">{{ getEstadoStock(m).label }}</span><br>
                <span class="badge" :class="getEstadoVenc(getDiasVenc(m.vencimiento)).cls" style="margin-top:4px">{{ getEstadoVenc(getDiasVenc(m.vencimiento)).label }}</span>
              </td>
              <td style="display:flex;gap:6px;flex-wrap:wrap;">
                <!-- Solo puede editar quien registró el producto (o si es un producto viejo sin creador cargado) -->
                <button v-if="puedeEditar(m)" class="btn btn-secondary btn-sm" @click="abrirEdicion(m)">Editar</button>
                <button class="btn btn-danger btn-sm" @click="$emit('eliminar', m.id)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL EDICIÓN -->
    <div v-if="editModal.visible" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;">
      <div style="background:var(--bg2);border:1px solid var(--border-o);border-radius:12px;padding:2rem;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:calc(19px * var(--zoom-texto));font-weight:600;color:var(--orange);letter-spacing:2px;margin-bottom:1.5rem;">EDITAR MEDICAMENTO</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Código de barras</label>
            <input type="text" v-model="editModal.data.codigo">
          </div>
          <div class="form-group">
            <label>Nombre *</label>
            <input type="text" v-model="editModal.data.nombre">
          </div>
          <div class="form-group">
            <label>Laboratorio</label>
            <input type="text" v-model="editModal.data.laboratorio">
          </div>
          <div class="form-group">
            <label>Presentación</label>
            <input type="text" v-model="editModal.data.presentacion">
          </div>
          <div class="form-group">
            <label>Precio ($)</label>
            <input type="number" v-model="editModal.data.precio" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Stock actual</label>
            <input type="number" v-model="editModal.data.stock" min="0">
          </div>
          <div class="form-group">
            <label>Stock mínimo</label>
            <input type="number" v-model="editModal.data.stock_min" min="0">
          </div>
          <div class="form-group">
            <label>Categoría</label>
            <select v-model="editModal.data.categoria">
              <option value="">Seleccionar...</option>
              <option>Analgésico</option>
              <option>Antibiótico</option>
              <option>Antiinflamatorio</option>
              <option>Antihipertensivo</option>
              <option>Vitamina / Suplemento</option>
              <option>Otro</option>
            </select>
          </div>
        </div>
        <p style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));margin-top:1rem;">
          El "Stock actual" corrige el número de unidades disponibles directamente (por ejemplo, si se cargó mal un ingreso o egreso). Este ajuste queda registrado en Movimientos → Historial de correcciones.
        </p>
        <div class="btn-row">
          <button class="btn btn-primary" @click="guardarEdicion">Guardar cambios</button>
          <button class="btn btn-secondary" @click="editModal.visible = false">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- MODAL VENCIMIENTOS: una fila por lote de unidades en stock, con su fecha -->
    <div v-if="lotesModal.visible" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;" @click.self="cerrarModalVencimientos">
      <div style="background:var(--bg2);border:1px solid var(--border-o);border-radius:12px;padding:2rem;width:100%;max-width:720px;max-height:90vh;overflow-y:auto;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:calc(19px * var(--zoom-texto));font-weight:600;color:var(--orange);letter-spacing:2px;margin-bottom:4px;">VENCIMIENTOS</div>
        <div style="font-size:calc(17px * var(--zoom-texto));font-weight:500;">{{ lotesModal.nombre }}</div>
        <div style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));margin:4px 0 1.25rem;">
          Unidades en stock agrupadas por fecha de vencimiento. Con "Editar" corregís la fecha si se cargó mal.
        </div>
        <div class="card" style="padding:0;overflow:hidden;margin-bottom:0;">
          <table>
            <thead><tr><th>Unidades</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              <tr v-if="lotes.length === 0"><td colspan="4"><div class="empty">Sin unidades en stock</div></td></tr>
              <tr v-for="l in lotes" :key="l.id">
                <!-- Fila en modo edición: fecha nueva y, si el lote tiene varias unidades, cuántas modificar -->
                <template v-if="lotesModal.editando && lotesModal.editando.id === l.id">
                  <td style="font-weight:500">
                    <div v-if="l.cantidad > 1" style="display:flex;align-items:center;gap:6px;">
                      <input type="number" v-model="lotesModal.editando.cantidad" min="1" :max="l.cantidad" style="width:80px;background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:6px;font-family:inherit;font-size:calc(16px * var(--zoom-texto));">
                      <span style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));">de {{ l.cantidad }}</span>
                    </div>
                    <span v-else>{{ l.cantidad }} uds.</span>
                  </td>
                  <td><input type="date" v-model="lotesModal.editando.vencimiento" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:6px;font-family:inherit;font-size:calc(16px * var(--zoom-texto));"></td>
                  <td></td>
                  <td style="white-space:nowrap">
                    <button class="btn btn-primary btn-sm" @click="confirmarEdicionVencimientoLote(l)">Guardar</button>
                    <button class="btn btn-secondary btn-sm" @click="cancelarEdicionVencimientoLote">Cancelar</button>
                  </td>
                </template>
                <template v-else>
                  <td style="font-weight:500">{{ l.cantidad }} uds.</td>
                  <td>{{ l.vencimiento || 'Sin vencimiento' }}</td>
                  <td><span class="badge" :class="getEstadoVenc(getDiasVenc(l.vencimiento)).cls">{{ getEstadoVenc(getDiasVenc(l.vencimiento)).label }}</span></td>
                  <td><button class="btn btn-secondary btn-sm" @click="iniciarEdicionVencimientoLote(l)">Editar</button></td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" @click="cerrarModalVencimientos">Cerrar</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
// SeccionMedicamentos: catálogo de medicamentos. Permite buscar/filtrar,
// eliminar, y editar (solo quien lo registró puede editarlo). La edición usa
// un modal propio; si ahí se cambia el "Stock actual" a mano, el backend
// registra ese ajuste en el Historial de correcciones (ver App.vue).
export default {
  name: 'SeccionMedicamentos',
  props: {
    medicamentos: Array,
    lotes: Array,        // vencimientos por lote del producto abierto en el modal "Vencimiento" (los carga App.vue)
    usuarioId: Number,   // id del usuario logueado, para saber si puede editar cada producto
    ultimoCodigoEscaneado: String, // último código recibido de la ESP32 por WebSocket (App.vue)
    scanCounter: Number,           // se incrementa en cada escaneo; dispara el watch de abajo
  },
  // eliminar: pide a App.vue borrar el medicamento por id.
  // editar: pide a App.vue guardar los cambios del modal de edición.
  // ir-a-registrar: pide cambiar a la sección "Registrar" (botón "+ Nuevo").
  // ver-lotes: pide a App.vue traer los vencimientos por lote del producto (id).
  // editar-lote: pide a App.vue cambiar la fecha de un lote ({ productoId, loteId, vencimiento, cantidad }).
  emits: ['eliminar', 'editar', 'ir-a-registrar', 'ver-lotes', 'editar-lote', 'toast'],
  data() {
    return {
      searchMed: '',      // texto del buscador (nombre, código o laboratorio)
      filterEstado: '',   // filtro de estado de stock: '' | 'ok' | 'bajo' | 'agotado'
      editModal: { visible: false, data: {} }, // estado del modal de edición y una copia editable del medicamento
      lotesModal: { visible: false, id: null, nombre: '', editando: null }, // estado del modal de vencimientos (producto abierto; "editando" = lote cuya fecha se está corrigiendo: { id, vencimiento, cantidad })
    }
  },
  watch: {
    // Quién la llama: Vue, automáticamente, cada vez que App.vue incrementa
    //           scanCounter (un nuevo escaneo llegó del lector ESP32).
    // Qué hace: usa el código escaneado como texto de búsqueda directa, lo
    //           que filtra medicamentosFiltrados hasta dejar solo ese producto.
    scanCounter() {
      if (!this.ultimoCodigoEscaneado) return
      this.searchMed = this.ultimoCodigoEscaneado
    },
  },
  computed: {
    // Quién la usa: el template, para pintar las filas de la tabla principal.
    // Qué devuelve: el array "medicamentos" filtrado por el texto de
    //           búsqueda (searchMed, contra nombre/código/laboratorio) y por
    //           el estado de stock elegido (filterEstado), a la vez.
    medicamentosFiltrados() {
      return this.medicamentos.filter(m => {
        const q = this.searchMed.toLowerCase()
        const match = m.nombre.toLowerCase().includes(q) || m.codigo.includes(q) || m.laboratorio.toLowerCase().includes(q)
        const est = this.getEstadoStock(m)
        const estMatch = !this.filterEstado ||
          (this.filterEstado === 'ok' && est.label === 'Normal') ||
          (this.filterEstado === 'bajo' && est.label === 'Stock bajo') ||
          (this.filterEstado === 'agotado' && est.label === 'Agotado')
        return match && estMatch
      })
    }
  },
  methods: {
    // getDiasVenc(fecha)
    // Quién la llama: el template (columna "Vencimiento" de la tabla) y
    //           getEstadoVenc() más abajo no la usa directamente (recibe el
    //           resultado ya calculado desde el template).
    // Qué devuelve: un número (negativo si ya venció, 0 si vence hoy,
    //           positivo con los días que faltan), o null si el medicamento
    //           no tiene vencimiento cargado (es opcional: se carga al
    //           ingresar una compra en Movimientos, y el detalle por unidad
    //           se ve con el botón "Vencimiento" de cada fila).
    getDiasVenc(fecha) {
      if (!fecha) return null
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      return Math.ceil((new Date(fecha) - hoy) / (1000 * 60 * 60 * 24))
    },
    // getEstadoStock(m)
    // Quién la llama: el template (insignia de estado de cada fila) y
    //           medicamentosFiltrados() (para aplicar el filtro por estado).
    // Qué devuelve: un objeto { label, cls } con el texto y la clase CSS del
    //           estado: "Agotado" (rojo), "Stock bajo" (amarillo) o "Normal" (verde).
    getEstadoStock(m) {
      if (m.stock === 0) return { label: 'Agotado', cls: 'badge-danger' }
      if (m.stock <= m.stock_min) return { label: 'Stock bajo', cls: 'badge-warn' }
      return { label: 'Normal', cls: 'badge-ok' }
    },
    // getEstadoVenc(dias)
    // Quién la llama: el template, con el resultado de getDiasVenc(fecha) de cada fila.
    // Qué devuelve: un objeto { label, cls, dayCls } con el texto y las
    //           clases CSS del estado: Vencido/Crítico (rojo), Próximo
    //           (amarillo, ≤90 días), Vigente (verde), o "Sin vencimiento"
    //           (gris/verde) si el medicamento no tiene fecha cargada.
    getEstadoVenc(dias) {
      if (dias === null) return { label: 'Sin vencimiento', cls: 'badge-ok', dayCls: 'days-ok' }
      if (dias < 0) return { label: 'Vencido', cls: 'badge-danger', dayCls: 'days-danger' }
      if (dias <= 30) return { label: 'Crítico', cls: 'badge-danger', dayCls: 'days-danger' }
      if (dias <= 90) return { label: 'Próximo', cls: 'badge-warn', dayCls: 'days-warn' }
      return { label: 'Vigente', cls: 'badge-ok', dayCls: 'days-ok' }
    },
    // getBarCls(m)
    // Quién la llama: el template, para la barra de progreso de stock de cada fila.
    // Qué devuelve: un string ('low' | 'mid' | 'high') según el porcentaje de
    //           stock actual respecto al mínimo configurado.
    getBarCls(m) {
      const pct = m.stock_min > 0 ? Math.round(m.stock / m.stock_min * 100) : 100
      return m.stock === 0 ? 'low' : pct < 50 ? 'low' : pct < 100 ? 'mid' : 'high'
    },
    // abrirModalVencimientos(m)
    // Quién la llama: el template de esta sección: botón "Vencimiento" de cada fila de la tabla.
    // Qué hace: Abre la ventana de vencimientos del medicamento (m) y emite el evento
    //           'ver-lotes' con su id para que App.vue (cargarLotesDelProducto) traiga
    //           sus lotes desde el servidor.
    // Qué devuelve: Nada (undefined). Los lotes llegan después por la prop "lotes".
    abrirModalVencimientos(m) {
      this.lotesModal = { visible: true, id: m.id, nombre: m.nombre, editando: null }
      this.$emit('ver-lotes', m.id)
    },
    // cerrarModalVencimientos()
    // Quién la llama: el template de esta sección: botón "Cerrar" de la ventana de
    //                 vencimientos y clic fuera de la ventana.
    // Qué hace: Cierra la ventana de vencimientos y descarta cualquier edición de
    //           fecha que estuviera a medias.
    // Qué devuelve: Nada (undefined).
    cerrarModalVencimientos() {
      this.lotesModal.visible = false
      this.lotesModal.editando = null
    },
    // iniciarEdicionVencimientoLote(lote)
    // Quién la llama: el template de esta sección: botón "Editar" de cada fila de la
    //                 ventana de vencimientos.
    // Qué hace: Pone esa fila en modo edición (lotesModal.editando) con su fecha
    //           actual y todas sus unidades seleccionadas, para corregir la fecha.
    // Qué devuelve: Nada (undefined).
    iniciarEdicionVencimientoLote(lote) {
      this.lotesModal.editando = { id: lote.id, vencimiento: lote.vencimiento || '', cantidad: lote.cantidad }
    },
    // cancelarEdicionVencimientoLote()
    // Quién la llama: el template de esta sección: botón "Cancelar" de la fila en edición.
    // Qué hace: Sale del modo edición de la fila sin guardar ningún cambio.
    // Qué devuelve: Nada (undefined).
    cancelarEdicionVencimientoLote() {
      this.lotesModal.editando = null
    },
    // confirmarEdicionVencimientoLote(lote)
    // Quién la llama: el template de esta sección: botón "Guardar" de la fila en edición.
    // Qué hace: Valida que haya una fecha y que la cantidad esté entre 1 y las
    //           unidades del lote (si no, avisa con el evento 'toast'). Si es válido,
    //           emite 'editar-lote' con { productoId, loteId, vencimiento, cantidad }
    //           para que App.vue (guardarVencimientoLoteEnServidor) lo guarde. Si se
    //           eligen menos unidades que las del lote, solo esas pasan a la fecha nueva.
    // Qué devuelve: Nada (undefined).
    confirmarEdicionVencimientoLote(lote) {
      const e = this.lotesModal.editando
      if (!e || e.id !== lote.id) return
      if (!e.vencimiento) { this.$emit('toast', 'Elegí la fecha de vencimiento.'); return }
      const cantidad = parseInt(e.cantidad)
      if (!cantidad || cantidad < 1 || cantidad > lote.cantidad) { this.$emit('toast', `La cantidad tiene que estar entre 1 y ${lote.cantidad}.`); return }
      this.$emit('editar-lote', { productoId: this.lotesModal.id, loteId: lote.id, vencimiento: e.vencimiento, cantidad })
      this.lotesModal.editando = null
    },
    // puedeEditar(m)
    // Quién la llama: el template, para decidir si mostrar el botón "Editar" de cada fila.
    // Qué devuelve: true/false. Solo puede editar el medicamento el usuario
    //           que lo registró originalmente; si el producto es viejo y no
    //           tiene "creado_por" cargado, se permite igual.
    puedeEditar(m) {
      return m.creado_por === null || m.creado_por === undefined || m.creado_por === this.usuarioId
    },
    // abrirEdicion(m)
    // Quién la llama: el template, botón "Editar" de cada fila (solo si puedeEditar(m) es true).
    // Qué hace: abre el modal de edición precargado con una copia de los
    //           datos del medicamento (no muta el original hasta guardar).
    abrirEdicion(m) {
      this.editModal.data = { ...m }
      this.editModal.visible = true
    },
    // guardarEdicion()
    // Quién la llama: el template, botón "Guardar" del modal de edición.
    // Qué hace: emite 'editar' con los datos del formulario (App.vue hace el
    //           PUT real al backend) y cierra el modal.
    guardarEdicion() {
      this.$emit('editar', { ...this.editModal.data })
      this.editModal.visible = false
    },
  },
}
</script>
