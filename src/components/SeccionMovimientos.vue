<template>
  <div>
    <div class="section-header">
      <div>
        <div class="section-title">MOVIMIENTOS</div>
        <div class="section-sub">Ingresos y salidas de stock por comprobante</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <!-- Toggle: sección activa (medicamentos o perfumería) -->
        <button class="btn btn-sm" @click="seccion = 'medicamentos'"
          :style="seccion === 'medicamentos' ? 'background:var(--orange);color:#000' : 'background:transparent;color:var(--orange);border:1px solid var(--border-o)'">
          💊 Medicamentos
        </button>
        <button class="btn btn-sm" @click="seccion = 'perfumeria'"
          :style="seccion === 'perfumeria' ? 'background:var(--orange);color:#000' : 'background:transparent;color:var(--orange);border:1px solid var(--border-o)'">
          🧴 Perfumería
        </button>
        <!-- Toggle: tipo de comprobante -->
        <button class="btn btn-primary btn-sm" @click="compMode = 'compra'" :style="compMode === 'compra' ? '' : 'opacity:0.6'">📥 Compra / Ingreso</button>
        <button class="btn btn-secondary btn-sm" @click="compMode = 'venta'" :style="compMode === 'venta' ? '' : 'opacity:0.6'">📤 Venta / Egreso</button>
      </div>
    </div>

    <!-- ══════════════ COMPROBANTE COMPRA ══════════════ -->
    <div v-if="compMode === 'compra'" class="card">
      <div class="card-title">Comprobante de Compra — {{ seccion === 'medicamentos' ? 'Medicamentos' : 'Perfumería' }}</div>
      <div class="form-grid">
        <div class="form-group"><label>Número de comprobante *</label><input type="text" v-model="comp.numero" placeholder="Ej: 0001-00012345"></div>
        <div class="form-group">
          <label>Tipo de comprobante *</label>
          <select v-model="comp.tipo">
            <option value="">Seleccionar...</option>
            <option>Factura A</option><option>Factura B</option><option>Factura C</option><option>Remito</option>
          </select>
        </div>
        <div class="form-group"><label>Fecha</label><input type="date" v-model="comp.fecha" readonly style="color:var(--text2)"></div>
        <div class="form-group"><label>Proveedor *</label><input type="text" v-model="comp.proveedor" placeholder="Nombre del proveedor"></div>
      </div>

      <div style="margin-top:1.5rem;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:calc(16px * var(--zoom-texto));color:var(--orange);letter-spacing:2px;margin-bottom:1rem;">DETALLE DE PRODUCTOS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto auto auto;gap:10px;align-items:end;margin-bottom:10px;">
          <div class="form-group" style="margin:0"><label>Código de barras</label><input type="text" ref="compBarcodeInput" v-model="compLinea.barcode" @input="autocompletarComp" @keyup.enter="onEscaneoComp" placeholder="Escanear..."></div>
          <div class="form-group" style="margin:0"><label>Producto</label><input type="text" v-model="compLinea.nombre" readonly style="color:var(--text2)" placeholder="Se completa solo"></div>
          <div class="form-group" style="margin:0"><label>Vencimiento (opcional)</label><input type="date" v-model="compLinea.vencimiento"></div>
          <div class="form-group" style="margin:0"><label>Cantidad</label><input type="number" v-model="compLinea.cantidad" placeholder="0" min="1" style="width:90px"></div>
          <button class="btn btn-secondary btn-sm" @click="agregarLineaComp" style="align-self:flex-end">+ Agregar</button>
        </div>
        <!-- Alerta en rojo, pegada al botón "+ Agregar": dice exactamente qué campo falta completar (o qué otro problema hay) -->
        <div v-if="errorComp" ref="alertaComp" class="alert-box" style="margin-bottom:10px;">⚠ {{ errorComp }}</div>
        <div v-if="comp.detalle.length === 0" class="empty" style="padding:1rem;border:1px dashed var(--border);border-radius:6px;text-align:center;">Sin productos agregados</div>
        <div v-else class="card" style="padding:0;overflow:hidden;margin-bottom:0;">
          <table>
            <thead><tr><th>Código</th><th>Producto</th><th>Vencimiento</th><th>Cantidad</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in comp.detalle" :key="i">
                <td><code style="font-size:calc(13px * var(--zoom-texto));color:var(--orange)">{{ l.barcode }}</code></td>
                <td>{{ l.nombre }}</td>
                <td style="color:var(--text2)">{{ l.vencimiento || 'Sin vencimiento' }}</td>
                <td style="color:var(--green);font-weight:500">+{{ l.cantidad }}</td>
                <td><button class="btn btn-danger btn-sm" @click="comp.detalle.splice(i,1)">✕</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" @click="confirmarCompra">✔ Confirmar ingreso</button>
        <button class="btn btn-secondary" @click="limpiarComp">Limpiar</button>
      </div>
    </div>

    <!-- ══════════════ COMPROBANTE VENTA ══════════════ -->
    <div v-if="compMode === 'venta'" class="card">
      <div class="card-title">Comprobante de Venta — {{ seccion === 'medicamentos' ? 'Medicamentos' : 'Perfumería' }}</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Número de comprobante</label>
          <input type="text" :value="numeroVentaAuto" readonly style="color:var(--text2)">
        </div>
        <div class="form-group">
          <label>Tipo de comprobante *</label>
          <select v-model="venta.tipo">
            <option value="">Seleccionar...</option>
            <option>Ticket</option><option>Factura A</option><option>Factura B</option><option>Factura C</option>
          </select>
        </div>
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" v-model="venta.fecha" readonly style="color:var(--text2)">
        </div>
        <div class="form-group"><label>Cliente</label><input type="text" v-model="venta.cliente" placeholder="Consumidor Final"></div>
        <div class="form-group">
          <label>Método de pago</label>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn btn-sm" @click="venta.metodoPago = 'efectivo'"
              :style="venta.metodoPago === 'efectivo' ? 'background:var(--orange);color:#000' : 'background:transparent;color:var(--orange);border:1px solid var(--border-o)'">Efectivo</button>
            <button type="button" class="btn btn-sm" @click="venta.metodoPago = 'tarjeta'"
              :style="venta.metodoPago === 'tarjeta' ? 'background:var(--orange);color:#000' : 'background:transparent;color:var(--orange);border:1px solid var(--border-o)'">Tarjeta</button>
            <button type="button" class="btn btn-sm" @click="venta.metodoPago = 'transferencia'"
              :style="venta.metodoPago === 'transferencia' ? 'background:var(--orange);color:#000' : 'background:transparent;color:var(--orange);border:1px solid var(--border-o)'">Transferencia</button>
          </div>
        </div>
      </div>

      <div style="margin-top:1.5rem;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:calc(16px * var(--zoom-texto));color:var(--orange);letter-spacing:2px;margin-bottom:1rem;">PRODUCTOS VENDIDOS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto auto;gap:10px;align-items:end;margin-bottom:10px;">
          <div class="form-group" style="margin:0"><label>Código de barras</label><input type="text" ref="ventaBarcodeInput" v-model="ventaLinea.barcode" @input="autocompletarVenta" @keyup.enter="onEscaneoVenta" placeholder="Escanear..."></div>
          <div class="form-group" style="margin:0"><label>Producto</label><input type="text" v-model="ventaLinea.nombre" readonly style="color:var(--text2)" placeholder="Se completa solo"></div>
          <div class="form-group" style="margin:0"><label>Cantidad</label><input type="number" v-model="ventaLinea.cantidad" placeholder="0" min="1" style="width:90px"></div>
          <button class="btn btn-secondary btn-sm" @click="agregarLineaVenta" style="align-self:flex-end">+ Agregar</button>
        </div>
        <!-- Alerta en rojo, pegada al botón "+ Agregar": dice exactamente qué campo falta completar (o qué otro problema hay) -->
        <div v-if="errorVenta" ref="alertaVenta" class="alert-box" style="margin-bottom:10px;">⚠ {{ errorVenta }}</div>
        <div v-if="venta.detalle.length === 0" class="empty" style="padding:1rem;border:1px dashed var(--border);border-radius:6px;text-align:center;">Sin productos agregados</div>
        <div v-else class="card" style="padding:0;overflow:hidden;margin-bottom:0;">
          <table>
            <thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in venta.detalle" :key="i">
                <td><code style="font-size:calc(13px * var(--zoom-texto));color:var(--orange)">{{ l.barcode }}</code></td>
                <td>{{ l.nombre }}</td>
                <td style="color:var(--orange);font-weight:500">-{{ l.cantidad }}</td>
                <td style="color:var(--text2)">${{ Number(l.precio || 0).toFixed(2) }}</td>
                <td style="font-weight:500">${{ (Number(l.cantidad) * Number(l.precio || 0)).toFixed(2) }}</td>
                <td><button class="btn btn-danger btn-sm" @click="venta.detalle.splice(i,1)">✕</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Panel de cobro: cuánto se cobra, total y vuelto, automáticos ──
           Con tarjeta o transferencia se cobra el total exacto (no hace falta
           cargar nada más, no hay vuelto). Con efectivo se carga lo que
           entrega el cliente y se calcula el vuelto. -->
      <div v-if="venta.detalle.length > 0" class="card" style="margin-top:1.5rem;margin-bottom:0;background:var(--bg3);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.5rem;align-items:end;">
          <div>
            <div style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));">Total a cobrar ({{ venta.metodoPago }})</div>
            <div style="font-family:'Rajdhani',sans-serif;font-size:calc(26px * var(--zoom-texto));font-weight:600;color:var(--orange);">${{ totalVenta.toFixed(2) }}</div>
          </div>
          <template v-if="venta.metodoPago === 'efectivo'">
            <div class="form-group" style="margin:0">
              <label>Monto recibido del cliente</label>
              <input type="number" v-model="venta.montoRecibido" placeholder="0.00" min="0" step="0.01">
            </div>
            <div>
              <div style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));">{{ vueltoVenta < 0 ? 'Falta cobrar' : 'Vuelto' }}</div>
              <div style="font-family:'Rajdhani',sans-serif;font-size:calc(26px * var(--zoom-texto));font-weight:600;" :style="vueltoVenta < 0 ? 'color:var(--red)' : 'color:var(--green)'">
                ${{ Math.abs(vueltoVenta).toFixed(2) }}
              </div>
            </div>
          </template>
          <div v-else style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));align-self:center;">
            Se cobra el total exacto por {{ venta.metodoPago }} (sin vuelto).
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" @click="confirmarVenta">✔ Confirmar venta</button>
        <button class="btn btn-secondary" @click="limpiarVenta">Limpiar</button>
      </div>
    </div>

    <!-- ══════════════ HISTORIAL DE INGRESOS ══════════════ -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);">
        <span style="font-family:'Rajdhani',sans-serif;font-size:calc(16px * var(--zoom-texto));color:var(--orange);letter-spacing:2px;">
          HISTORIAL DE INGRESOS — {{ seccion === 'medicamentos' ? 'MEDICAMENTOS' : 'PERFUMERÍA' }}
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Código</th><th>Producto</th><th>Cantidad</th><th>Registrado por</th><th>Proveedor</th><th>Observaciones</th></tr></thead>
          <tbody>
            <tr v-if="historialIngresosActivo.length === 0"><td colspan="7"><div class="empty">Sin ingresos registrados</div></td></tr>
            <tr v-for="(m, i) in [...historialIngresosActivo].reverse()" :key="'ing-'+i">
              <td style="font-size:calc(14px * var(--zoom-texto));color:var(--text2)">{{ m.fecha }}</td>
              <td><code style="font-size:calc(13px * var(--zoom-texto));color:var(--orange)">{{ m.codigo }}</code></td>
              <td>{{ m.nombre }}</td>
              <td style="font-weight:500;color:var(--green)">+{{ m.cantidad }}</td>
              <td style="color:var(--orange);font-weight:500">{{ m.empleado_registro || '-' }}</td>
              <td style="color:var(--text2)">{{ m.empleado || '-' }}</td>
              <td style="color:var(--text2);font-size:calc(14px * var(--zoom-texto))">{{ m.obs || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══════════════ HISTORIAL DE EGRESOS ══════════════ -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);">
        <span style="font-family:'Rajdhani',sans-serif;font-size:calc(16px * var(--zoom-texto));color:var(--orange);letter-spacing:2px;">
          HISTORIAL DE EGRESOS — {{ seccion === 'medicamentos' ? 'MEDICAMENTOS' : 'PERFUMERÍA' }}
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Código</th><th>Producto</th><th>Cantidad</th><th>Registrado por</th><th>Cliente</th><th>Método de pago</th><th>Monto cobrado</th><th>Observaciones</th></tr></thead>
          <tbody>
            <tr v-if="historialEgresosActivo.length === 0"><td colspan="9"><div class="empty">Sin egresos registrados</div></td></tr>
            <tr v-for="(m, i) in [...historialEgresosActivo].reverse()" :key="'egr-'+i">
              <td style="font-size:calc(14px * var(--zoom-texto));color:var(--text2)">{{ m.fecha }}</td>
              <td><code style="font-size:calc(13px * var(--zoom-texto));color:var(--orange)">{{ m.codigo }}</code></td>
              <td>{{ m.nombre }}</td>
              <td style="font-weight:500;color:var(--orange)">-{{ m.cantidad }}</td>
              <td style="color:var(--orange);font-weight:500">{{ m.empleado_registro || '-' }}</td>
              <td style="color:var(--text2)">{{ m.empleado || '-' }}</td>
              <td style="color:var(--text2);text-transform:capitalize">{{ m.metodo_pago || '-' }}</td>
              <td style="font-weight:500">{{ m.monto_total != null ? '$' + Number(m.monto_total).toFixed(2) : '-' }}</td>
              <td style="color:var(--text2);font-size:calc(14px * var(--zoom-texto))">{{ m.obs || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══════════════ HISTORIAL DE CORRECCIONES ══════════════ -->
    <!-- Apartado extra: ajustes manuales de stock hechos desde "Editar" en
         Medicamentos/Perfumería (no son compras ni ventas). Queda registrado
         acá si se sumaron unidades (positivo) o se quitaron (negativo). -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);">
        <span style="font-family:'Rajdhani',sans-serif;font-size:calc(16px * var(--zoom-texto));color:var(--orange);letter-spacing:2px;">
          HISTORIAL DE CORRECCIONES — {{ seccion === 'medicamentos' ? 'MEDICAMENTOS' : 'PERFUMERÍA' }}
        </span>
        <div style="font-size:calc(14px * var(--zoom-texto));color:var(--text2);margin-top:4px;">
          Ajustes de stock hechos desde "Editar" (no forman parte de compras ni ventas)
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Código</th><th>Producto</th><th>Stock anterior</th><th>Stock nuevo</th><th>Ajuste</th><th>Registrado por</th></tr></thead>
          <tbody>
            <tr v-if="correccionesActiva.length === 0"><td colspan="7"><div class="empty">Sin correcciones registradas</div></td></tr>
            <tr v-for="(c, i) in [...correccionesActiva].reverse()" :key="'cor-'+i">
              <td style="font-size:calc(14px * var(--zoom-texto));color:var(--text2)">{{ c.fecha }}</td>
              <td><code style="font-size:calc(13px * var(--zoom-texto));color:var(--orange)">{{ c.codigo }}</code></td>
              <td>{{ c.nombre }}</td>
              <td style="color:var(--text2)">{{ c.cantidad_anterior }}</td>
              <td style="color:var(--text2)">{{ c.cantidad_nueva }}</td>
              <td :style="c.diferencia >= 0 ? 'font-weight:500;color:var(--green)' : 'font-weight:500;color:var(--red)'">
                {{ c.diferencia >= 0 ? '+' : '' }}{{ c.diferencia }}
              </td>
              <td style="color:var(--orange);font-weight:500">{{ c.empleado_registro || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script>
// obtenerFechaHoyLocal()
// Quién la llama: data() de SeccionMovimientos.vue (fecha inicial del comprobante de
//                 compra y del de venta) y el método fechaHoy().
// Qué hace: Calcula la fecha de hoy con la hora de esta computadora (no en UTC),
//           para que a la noche no salte al día siguiente. Es la que hace que la
//           fecha de compra y de venta se complete sola.
// Qué devuelve: Un string (texto) con formato 'AAAA-MM-DD', por ejemplo '2026-10-04'.
function obtenerFechaHoyLocal() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export default {
  name: 'SeccionMovimientos',
  props: {
    medicamentos: Array,
    perfumeria: Array,
    ingresos: Array,
    egresos: Array,
    ingresosPerfumeria: Array,
    egresosPerfumeria: Array,
    correcciones: Array,           // historial de ajustes manuales de stock — medicamentos
    correccionesPerfumeria: Array, // ídem, perfumería
    nombreUsuario: String,  // nombre del empleado logueado (no editable)
    ultimoCodigoEscaneado: String, // último código recibido de la ESP32 por WebSocket (App.vue)
    scanCounter: Number,           // se incrementa en cada escaneo; dispara el watch de abajo
  },
  // confirmar-compra / confirmar-venta: piden a App.vue registrar el comprobante de medicamentos.
  // confirmar-compra-perf / confirmar-venta-perf: ídem, para perfumería.
  // toast: pide mostrar un mensaje flotante.
  emits: ['confirmar-compra', 'confirmar-venta', 'confirmar-compra-perf', 'confirmar-venta-perf', 'toast'],
  data() {
    return {
      seccion: 'medicamentos', // 'medicamentos' | 'perfumeria' -- catálogo/historiales que se muestran
      compMode: 'compra',      // 'compra' | 'venta' -- qué formulario de comprobante se muestra
      // Comprobante de compra en curso. "fecha" arranca en el día de hoy y es
      // de solo lectura (se registra sola, igual que en la venta).
      comp: { numero: '', tipo: '', fecha: obtenerFechaHoyLocal(), proveedor: '', detalle: [] },
      // Línea de producto que se está por agregar a la compra. "vencimiento"
      // es opcional (vacío = sin vencimiento) y se conserva entre línea y
      // línea para poder escanear varias unidades con la misma fecha.
      compLinea: { barcode: '', nombre: '', cantidad: '', vencimiento: '' },
      errorComp: '',    // mensaje de error persistente (en rojo) del comprobante de compra/ingreso (se muestra junto al botón "+ Agregar")
      // Comprobante de venta en curso. Ya no tiene "numero" editable (se
      // calcula solo, ver numeroVentaAuto): "fecha" arranca en el día de hoy
      // y es de solo lectura (se automatiza). La venta ya no tiene fecha de
      // vencimiento (el vencimiento se carga al ingresar la compra).
      // "metodoPago" es 'efectivo' | 'tarjeta' | 'transferencia'. "montoRecibido" es lo que
      // entrega el cliente en efectivo, o lo que transfiere en
      // transferencia (en tarjeta no se usa, se cobra el total exacto), para
      // calcular el vuelto (vueltoVenta).
      venta: { tipo: '', fecha: obtenerFechaHoyLocal(), metodoPago: 'efectivo', cliente: '', montoRecibido: '', detalle: [] },
      ventaLinea: { barcode: '', nombre: '', cantidad: '' }, // línea de producto que se está por agregar a la venta
      errorVenta: '',   // mensaje de error persistente (en rojo) del comprobante de venta/egreso (se muestra junto al botón "+ Agregar")
    }
  },
  watch: {
    // Quién la llama: Vue, automáticamente, cada vez que App.vue incrementa
    //           scanCounter (un nuevo escaneo llegó del lector ESP32). Se
    //           usa scanCounter y no el código en sí, porque si escaneás el
    //           mismo producto dos veces seguidas el string
    //           "ultimoCodigoEscaneado" no cambiaría y Vue no volvería a notificar.
    // Qué hace: según si se está cargando una compra o una venta, completa
    //           el código en la línea correspondiente, busca el producto
    //           (autocompletarComp/Venta) y agrega la línea (onEscaneoComp/Venta).
    scanCounter() {
      if (!this.ultimoCodigoEscaneado) return
      if (this.compMode === 'compra') {
        this.compLinea.barcode = this.ultimoCodigoEscaneado
        this.autocompletarComp()
        this.onEscaneoComp()
      } else {
        this.ventaLinea.barcode = this.ultimoCodigoEscaneado
        this.autocompletarVenta()
        this.onEscaneoVenta()
      }
    },
  },
  computed: {
    // Quién la usa: autocompletarComp/autocompletarVenta, agregarLineaVenta,
    //           confirmarVenta y el template (para el <select> de productos).
    // Qué devuelve: el array "medicamentos" o "perfumeria" según el toggle "seccion".
    catalogoActivo() {
      return this.seccion === 'medicamentos' ? this.medicamentos : this.perfumeria
    },
    // Quién la usa: el template, tabla "Historial de ingresos".
    // Qué devuelve: el array "ingresos" o "ingresosPerfumeria" según el toggle "seccion".
    historialIngresosActivo() {
      return this.seccion === 'medicamentos' ? this.ingresos : this.ingresosPerfumeria
    },
    // Quién la usa: el template, tabla "Historial de egresos".
    // Qué devuelve: el array "egresos" o "egresosPerfumeria" según el toggle "seccion".
    historialEgresosActivo() {
      return this.seccion === 'medicamentos' ? this.egresos : this.egresosPerfumeria
    },
    // Quién la usa: el template, tabla "Historial de correcciones".
    // Qué devuelve: el array "correcciones" o "correccionesPerfumeria" según el toggle "seccion".
    correccionesActiva() {
      return this.seccion === 'medicamentos' ? this.correcciones : this.correccionesPerfumeria
    },
    // numeroVentaAuto
    // Quién la usa: el template (input readonly "Número de comprobante" de
    //           la venta) y confirmarVenta() (para mandarlo en el payload).
    // Qué devuelve: un string tipo "0001-00000007", calculado en base a
    //           cuántas ventas ya hay en el historial de egresos activo
    //           (historialEgresosActivo.length + 1, con 8 dígitos). No se
    //           guarda en la base como secuencia propia: es un correlativo
    //           calculado a partir de lo que ya está registrado.
    numeroVentaAuto() {
      const siguiente = this.historialEgresosActivo.length + 1
      return '0001-' + String(siguiente).padStart(8, '0')
    },
    // totalVenta
    // Quién la usa: el template (panel de cobro), vueltoVenta() y confirmarVenta().
    // Qué devuelve: la suma de cantidad × precio de cada línea del detalle
    //           de la venta en curso (el "Cuánto se cobra" / "Total" automático),
    //           redondeada a 2 decimales. Convierte con Number() porque el
    //           precio puede llegar como texto desde MySQL (DECIMAL).
    totalVenta() {
      const t = this.venta.detalle.reduce((acc, l) => acc + Number(l.cantidad) * Number(l.precio || 0), 0)
      return Math.round(t * 100) / 100
    },
    // vueltoVenta
    // Quién la usa: el template (panel de cobro, "Vuelto"/"Falta cobrar") y
    //           confirmarVenta() (para mandarlo en el payload).
    // Qué devuelve: un número. Con tarjeta o transferencia siempre es 0 (se
    //           cobra el total exacto). Con efectivo, es lo que entregó el
    //           cliente (venta.montoRecibido) menos totalVenta -- puede dar
    //           negativo si todavía no completó el pago (el template lo
    //           muestra en rojo como "Falta cobrar" y confirmarVenta() no
    //           deja confirmar).
    vueltoVenta() {
      if (this.venta.metodoPago !== 'efectivo') return 0
      const v = (parseFloat(this.venta.montoRecibido) || 0) - this.totalVenta
      return Math.round(v * 100) / 100
    },
    // montoPagadoVenta
    // Quién la usa: confirmarVenta() (para mandarlo en el payload).
    // Qué devuelve: en tarjeta o transferencia, el total exacto (totalVenta);
    //           en efectivo, lo que cargó el cajero en "Monto recibido"
    //           (venta.montoRecibido).
    montoPagadoVenta() {
      if (this.venta.metodoPago !== 'efectivo') return this.totalVenta
      return parseFloat(this.venta.montoRecibido) || 0
    },
  },
  methods: {
    // ── autocomplete ──
    // autocompletarComp()
    // Quién la llama: el watch de scanCounter y el @input del campo "Código
    //           de barras" del formulario de compra en el template.
    // Qué hace: busca el producto por código en catalogoActivo y completa
    //           compLinea.nombre (readonly en el formulario) — no devuelve nada.
    autocompletarComp() {
      const prod = this.catalogoActivo.find(p => p.codigo === this.compLinea.barcode)
      this.compLinea.nombre = prod ? prod.nombre : ''
    },
    // autocompletarVenta()
    // Quién la llama: el watch de scanCounter y el @input del campo "Código
    //           de barras" del formulario de venta en el template.
    // Qué hace: igual que autocompletarComp, pero completa ventaLinea.nombre.
    autocompletarVenta() {
      const prod = this.catalogoActivo.find(p => String(p.codigo).trim() === String(this.ventaLinea.barcode || '').trim())
      this.ventaLinea.nombre = prod ? prod.nombre : ''
    },

    // ── escáner ──
    // onEscaneoComp()
    // Quién la llama: el watch de scanCounter, cuando compMode === 'compra'.
    // Qué hace: si no se cargó cantidad, asume 1 unidad, y llama a
    //           agregarLineaComp() (flujo rápido de "escanear y sigue escaneando").
    onEscaneoComp() {
      if (!this.compLinea.cantidad) this.compLinea.cantidad = 1
      this.agregarLineaComp()
    },
    // onEscaneoVenta()
    // Quién la llama: el watch de scanCounter, cuando compMode === 'venta'.
    // Qué hace: igual que onEscaneoComp, pero llama a agregarLineaVenta().
    onEscaneoVenta() {
      if (!this.ventaLinea.cantidad) this.ventaLinea.cantidad = 1
      this.agregarLineaVenta()
    },

    // armarTextoCamposFaltantes(campos)
    // Quién la llama: agregarLineaComp(), agregarLineaVenta(), confirmarCompra() y
    //                 confirmarVenta() (todas de SeccionMovimientos.vue).
    // Qué hace: Arma el texto de la alerta roja con el nombre exacto de lo que falta,
    //           a partir de un array de nombres de campos.
    // Qué devuelve: Un string. Con un solo campo: 'Faltó completar el campo Tipo de
    //               comprobante'. Con varios: 'Faltó completar los campos Tipo de
    //               comprobante y Cantidad'.
    armarTextoCamposFaltantes(campos) {
      if (campos.length === 1) return `Faltó completar el campo ${campos[0]}`
      return `Faltó completar los campos ${campos.slice(0, -1).join(', ')} y ${campos[campos.length - 1]}`
    },
    // mostrarAlertaEnMovimiento(tipo, mensaje)
    // Quién la llama: agregarLineaComp(), agregarLineaVenta(), confirmarCompra() y
    //                 confirmarVenta() (SeccionMovimientos.vue), ante cualquier error de
    //                 validación. "tipo" es 'comp' (ingreso/compra) o 'venta' (egreso/venta).
    // Qué hace: Escribe el mensaje en errorComp / errorVenta (alerta roja junto al botón
    //           "+ Agregar") y la lleva a la vista con scroll. Si el mensaje es igual al
    //           anterior, igual vuelve a mostrarla.
    // Qué devuelve: Nada (undefined). Solo actualiza la pantalla.
    mostrarAlertaEnMovimiento(tipo, mensaje) {
      const campo = tipo === 'comp' ? 'errorComp' : 'errorVenta'
      this[campo] = ''
      this.$nextTick(() => {
        this[campo] = mensaje
        this.$nextTick(() => {
          const el = this.$refs[tipo === 'comp' ? 'alertaComp' : 'alertaVenta']
          if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      })
    },

    // ── agregar líneas ──
    // agregarLineaComp()
    // Quién la llama: onEscaneoComp() y el template (botón "Agregar" /
    //           submit del formulario de línea de compra).
    // Qué hace: valida los campos obligatorios del comprobante (número, tipo,
    //           fecha, proveedor) y de la línea en curso (código, cantidad > 0)
    //           y que el código corresponda a un producto conocido. Si falta
    //           algo, muestra una alerta roja que dice exactamente qué campo
    //           falta ("Faltó completar el campo ..."); si es válida, la
    //           agrega a comp.detalle (con su vencimiento, o null si quedó
    //           vacío), limpia compLinea (menos el vencimiento, que se
    //           conserva para la próxima línea) y devuelve el foco al
    //           input de código para poder seguir escaneando sin usar el
    //           mouse. No devuelve nada.
    agregarLineaComp() {
      const { barcode, nombre, cantidad, vencimiento } = this.compLinea
      // Campos obligatorios del comprobante y de la línea: si falta alguno, la
      // alerta dice exactamente cuáles son.
      const faltantes = []
      if (!String(this.comp.numero || '').trim())    faltantes.push('Número de comprobante')
      if (!this.comp.tipo)                           faltantes.push('Tipo de comprobante')
      if (!this.comp.fecha)                          faltantes.push('Fecha')
      if (!String(this.comp.proveedor || '').trim()) faltantes.push('Proveedor')
      if (!String(barcode || '').trim())             faltantes.push('Código de barras')
      if (!cantidad || parseInt(cantidad) < 1)       faltantes.push('Cantidad')
      if (faltantes.length > 0) { this.mostrarAlertaEnMovimiento('comp', this.armarTextoCamposFaltantes(faltantes)); return }
      if (!nombre) { this.mostrarAlertaEnMovimiento('comp', 'El código ingresado no corresponde a ningún producto registrado.'); return }
      this.errorComp = ''
      this.comp.detalle.push({ barcode, nombre, cantidad: parseInt(cantidad), vencimiento: vencimiento || null })
      this.compLinea = { barcode: '', nombre: '', cantidad: '', vencimiento }
      this.$nextTick(() => this.$refs.compBarcodeInput?.focus())
    },
    // agregarLineaVenta()
    // Quién la llama: onEscaneoVenta() y el template (botón "Agregar" /
    //           submit del formulario de línea de venta).
    // Qué hace: igual que agregarLineaComp (alerta roja con el nombre exacto
    //           del campo que falta; el comprobante de venta exige el tipo y
    //           la fecha), pero además valida que haya stock suficiente del producto antes de agregar la línea a
    //           venta.detalle (contando lo que ya está en la venta). Si el
    //           producto ya estaba en el detalle, suma la cantidad a esa
    //           misma línea en vez de duplicarla. Guarda también el "precio"
    //           unitario del producto (tomado del catálogo, como número) en
    //           la línea, para poder calcular el subtotal, el total y el
    //           vuelto automáticamente. Ante cualquier error muestra la
    //           alerta roja (mostrarAlertaEnMovimiento). No devuelve nada.
    agregarLineaVenta() {
      const barcode = String(this.ventaLinea.barcode || '').trim()
      const cantidad = parseInt(this.ventaLinea.cantidad)
      const fallo = (msg) => { this.mostrarAlertaEnMovimiento('venta', msg) }
      // Campos obligatorios del comprobante y de la línea: si falta alguno, la
      // alerta dice exactamente cuáles son.
      const faltantes = []
      if (!this.venta.tipo)  faltantes.push('Tipo de comprobante')
      if (!this.venta.fecha) faltantes.push('Fecha')
      if (!barcode)          faltantes.push('Código de barras')
      if (!cantidad || cantidad < 1) faltantes.push('Cantidad')
      if (faltantes.length > 0) return fallo(this.armarTextoCamposFaltantes(faltantes))
      const prod = this.catalogoActivo.find(p => String(p.codigo).trim() === barcode)
      if (!prod) return fallo('El código ingresado no corresponde a ningún producto registrado.')
      const stock = Number(prod.stock) || 0
      const existente = this.venta.detalle.find(l => l.barcode === String(prod.codigo).trim())
      const yaEnVenta = existente ? existente.cantidad : 0
      if (yaEnVenta + cantidad > stock) return fallo(`No hay stock suficiente de "${prod.nombre}" (disponible: ${stock}, ya en la venta: ${yaEnVenta}).`)
      this.errorVenta = ''
      if (existente) {
        existente.cantidad += cantidad // mismo producto: se acumula en la misma línea
      } else {
        this.venta.detalle.push({ barcode: String(prod.codigo).trim(), nombre: prod.nombre, cantidad, precio: Number(prod.precio) || 0 })
      }
      this.ventaLinea = { barcode: '', nombre: '', cantidad: '' }
      this.$nextTick(() => this.$refs.ventaBarcodeInput?.focus())
    },

    // ── confirmar ──
    // confirmarCompra()
    // Quién la llama: el template, botón "Confirmar ingreso".
    // Qué hace: valida los datos del comprobante (campos obligatorios y que
    //           tenga al menos un producto cargado); si está todo bien,
    //           emite 'confirmar-compra' (o 'confirmar-compra-perf' según la
    //           sección) a App.vue con el comprobante completo más el nombre
    //           del empleado logueado, y limpia el formulario. Si falta algo,
    //           muestra la alerta roja con el nombre exacto del campo que falta
    //           ("Faltó completar el campo ..."). No devuelve nada.
    confirmarCompra() {
      const { numero, tipo, proveedor, detalle } = this.comp
      // Junta el nombre de cada campo obligatorio que falte, para avisar exactamente cuál es.
      const faltantes = []
      if (!numero)    faltantes.push('Número de comprobante')
      if (!tipo)      faltantes.push('Tipo de comprobante')
      if (!proveedor) faltantes.push('Proveedor')
      if (faltantes.length > 0) {
        this.mostrarAlertaEnMovimiento('comp', this.armarTextoCamposFaltantes(faltantes))
        return
      }
      if (detalle.length === 0) {
        this.mostrarAlertaEnMovimiento('comp', 'Agregá al menos un producto al comprobante antes de confirmar el ingreso.')
        return
      }
      this.errorComp = ''
      const evento = this.seccion === 'medicamentos' ? 'confirmar-compra' : 'confirmar-compra-perf'
      // Agrega el nombre del empleado logueado automáticamente, no editable
      this.$emit(evento, { ...this.comp, empleado: this.nombreUsuario })
      this.limpiarComp()
    },
    // confirmarVenta()
    // Quién la llama: el template, botón "Confirmar venta".
    // Qué hace: igual que confirmarCompra, pero además vuelve a chequear el
    //           stock disponible de cada línea justo antes de confirmar (por
    //           si cambió desde que se armó el detalle); usa numeroVentaAuto
    //           como número de comprobante (ya no lo escribe el usuario);
    //           en efectivo no deja confirmar si el monto
    //           recibido no alcanza para cubrir el total; emite
    //           'confirmar-venta' o 'confirmar-venta-perf' con el total, el
    //           método de pago, lo pagado y el vuelto (que el backend guarda
    //           en el historial de egresos). No devuelve nada.
    confirmarVenta() {
      const { tipo, fecha, detalle } = this.venta
      const faltantes = []
      if (!tipo)  faltantes.push('Tipo de comprobante')
      if (!fecha) faltantes.push('Fecha')
      if (faltantes.length > 0) {
        this.mostrarAlertaEnMovimiento('venta', this.armarTextoCamposFaltantes(faltantes))
        return
      }
      if (detalle.length === 0) {
        this.mostrarAlertaEnMovimiento('venta', 'Agregá al menos un producto al comprobante antes de confirmar el egreso.')
        return
      }
      if (this.venta.metodoPago === 'efectivo' && this.vueltoVenta < 0) {
        this.mostrarAlertaEnMovimiento('venta', `El monto recibido no alcanza para cubrir el total ($${this.totalVenta.toFixed(2)}).`)
        return
      }
      for (const l of detalle) {
        const prod = this.catalogoActivo.find(p => String(p.codigo).trim() === l.barcode)
        if (prod && l.cantidad > prod.stock) {
          this.mostrarAlertaEnMovimiento('venta', `No hay stock suficiente de "${l.nombre}" (disponible: ${prod.stock}).`)
          return
        }
      }
      this.errorVenta = ''
      const evento = this.seccion === 'medicamentos' ? 'confirmar-venta' : 'confirmar-venta-perf'
      // Agrega el nombre del empleado logueado automáticamente (no editable),
      // el número de comprobante calculado y los datos del cobro: método de
      // pago, total, lo pagado y el vuelto.
      this.$emit(evento, {
        ...this.venta,
        numero: this.numeroVentaAuto,
        empleado: this.nombreUsuario,
        // Lo que pagó el cliente por los productos (se guarda en el historial de egresos)
        montoTotal: this.totalVenta,
        monto_total: this.totalVenta,
        metodoPago: this.venta.metodoPago,
        metodo_pago: this.venta.metodoPago,
        montoPagado: this.montoPagadoVenta,
        vuelto: Math.max(0, this.vueltoVenta),
        detalle: detalle.map(l => ({ ...l, subtotal: Math.round(l.cantidad * l.precio * 100) / 100 })),
      })
      this.limpiarVenta()
    },

    // fechaHoy()
    // Quién la llama: limpiarVenta() y limpiarComp().
    // Qué devuelve: la fecha de hoy como string 'AAAA-MM-DD', lista para un <input type="date">.
    fechaHoy() {
      return obtenerFechaHoyLocal()
    },

    // limpiarComp()
    // Quién la llama: confirmarCompra() (al terminar con éxito) y el
    //           template (botón "Limpiar" del formulario de compra).
    // Qué hace: vacía el comprobante de compra en curso y su línea. No devuelve nada.
    limpiarComp() { this.comp = { numero: '', tipo: '', fecha: this.fechaHoy(), proveedor: '', detalle: [] }; this.compLinea = { barcode: '', nombre: '', cantidad: '', vencimiento: '' }; this.errorComp = '' },
    // limpiarVenta()
    // Quién la llama: confirmarVenta() (al terminar con éxito) y el template
    //           (botón "Limpiar" del formulario de venta).
    // Qué hace: vacía el comprobante de venta en curso y su línea. La fecha
    //           se vuelve a poner en el día de hoy (es automática, no se deja
    //           en blanco).
    limpiarVenta() { this.venta = { tipo: '', fecha: this.fechaHoy(), metodoPago: 'efectivo', cliente: '', montoRecibido: '', detalle: [] }; this.ventaLinea = { barcode: '', nombre: '', cantidad: '' }; this.errorVenta = '' },
  },
}
</script>
