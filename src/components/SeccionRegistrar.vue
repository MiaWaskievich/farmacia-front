<template>
  <div>
    <div class="section-header">
      <div>
        <div class="section-title">REGISTRAR PRODUCTO</div>
        <div class="section-sub">Agregar nuevo producto al sistema</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" @click="modo = 'medicamento'" :style="modo === 'medicamento' ? '' : 'opacity:0.6'">💊 Medicamento</button>
        <button class="btn btn-secondary btn-sm" @click="modo = 'perfumeria'" :style="modo === 'perfumeria' ? '' : 'opacity:0.6'">🧴 Perfumería</button>
      </div>
    </div>

    <!-- FORMULARIO MEDICAMENTO -->
    <div v-if="modo === 'medicamento'" class="card">
      <div class="card-title">Datos del medicamento</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Código de barras *</label>
          <input type="text" v-model="med.codigo" placeholder="Escanear o ingresar...">
        </div>
        <div class="form-group">
          <label>Nombre *</label>
          <input type="text" v-model="med.nombre" placeholder="Ej: Ibuprofeno 400mg">
        </div>
        <div class="form-group">
          <label>Laboratorio</label>
          <input type="text" v-model="med.laboratorio" placeholder="Ej: Bayer">
        </div>
        <div class="form-group">
          <label>Presentación</label>
          <input type="text" v-model="med.presentacion" placeholder="Ej: Caja x 20 comprimidos">
        </div>
        <div class="form-group">
          <label>Stock inicial *</label>
          <input type="number" v-model="med.stock" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label>Stock mínimo (alerta)</label>
          <input type="number" v-model="med.stockMin" placeholder="10" min="0">
        </div>
        <div class="form-group">
          <label>Precio ($)</label>
          <input type="number" v-model="med.precio" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <select v-model="med.categoria">
            <option value="">Seleccionar...</option>
            <option>Analgésico</option>
            <option>Antibiótico</option>
            <option>Antiinflamatorio</option>
            <option>Antihipertensivo</option>
            <option>Vitamina / Suplemento</option>
            <option>Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Observaciones</label>
          <input type="text" v-model="med.obs" placeholder="Notas adicionales...">
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" @click="registrarMedicamento">Guardar medicamento</button>
        <button class="btn btn-secondary" @click="limpiarMed">Limpiar</button>
      </div>
    </div>

    <!-- FORMULARIO PERFUMERÍA -->
    <div v-if="modo === 'perfumeria'" class="card">
      <div class="card-title">Datos del producto de perfumería</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Código de barras *</label>
          <input type="text" v-model="perf.codigo" placeholder="Escanear o ingresar...">
        </div>
        <div class="form-group">
          <label>Nombre *</label>
          <input type="text" v-model="perf.nombre" placeholder="Ej: Pañales Pampers T2">
        </div>
        <div class="form-group">
          <label>Marca</label>
          <input type="text" v-model="perf.marca" placeholder="Ej: Pampers">
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input type="text" v-model="perf.descripcion" placeholder="Ej: Paquete x 40 unidades">
        </div>
        <div class="form-group">
          <label>Stock inicial *</label>
          <input type="number" v-model="perf.stock" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label>Stock mínimo (alerta)</label>
          <input type="number" v-model="perf.stockMin" placeholder="10" min="0">
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <select v-model="perf.categoria">
            <option value="">Seleccionar...</option>
            <option>Higiene personal</option>
            <option>Pañales</option>
            <option>Cosmética</option>
            <option>Cuidado bucal</option>
            <option>Cuidado del cabello</option>
            <option>Otros</option>
          </select>
        </div>
        <div class="form-group">
          <label>Precio ($)</label>
          <input type="number" v-model="perf.precio" placeholder="0.00" min="0" step="0.01">
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" @click="registrarPerfumeria">Guardar producto</button>
        <button class="btn btn-secondary" @click="limpiarPerf">Limpiar</button>
      </div>
    </div>
  </div>
</template>

<script>
// SeccionRegistrar: formulario para dar de alta un producto nuevo, ya sea
// medicamento o de perfumería (toggle "modo"). Valida los campos mínimos,
// evita códigos duplicados y emite el evento correspondiente para que
// App.vue haga el POST al backend. También completa el código de barras
// automáticamente cuando llega un escaneo desde la balanza/lector (ESP32).
export default {
  name: 'SeccionRegistrar',
  props: {
    medicamentos: Array, // lista completa, se usa para chequear códigos duplicados
    perfumeria: Array,   // ídem, para perfumería
    ultimoCodigoEscaneado: String, // último código recibido de la ESP32 por WebSocket (App.vue)
    scanCounter: Number,           // se incrementa en cada escaneo; dispara el watch de abajo
  },
  // registrar-med / registrar-perf: piden a App.vue que dé de alta el producto en el backend.
  // toast: pide mostrar un mensaje flotante (por ejemplo, un error de validación).
  emits: ['registrar-med', 'registrar-perf', 'toast'],
  data() {
    return {
      modo: 'medicamento', // 'medicamento' | 'perfumeria' -- qué formulario está visible
      med:  { codigo: '', nombre: '', laboratorio: '', presentacion: '', stock: '', stockMin: 10, categoria: '', obs: '', precio: '' },
      perf: { codigo: '', nombre: '', marca: '', descripcion: '', stock: '', stockMin: 10, categoria: '', precio: '' },
    }
  },
  watch: {
    // scanCounter (watch)
    // Quién lo dispara: App.vue, cada vez que llega un código por el
    //           WebSocket de la ESP32 (incrementa scanCounter).
    // Se dispara en CADA escaneo (usamos scanCounter, no el código en sí,
    // porque si escaneás el mismo código dos veces seguidas el string no
    // cambiaría y Vue no notificaría el watch).
    // Qué hace / devuelve: completa el campo "código" del formulario visible
    //           (medicamento o perfumería, según "modo"); no devuelve nada.
    scanCounter() {
      if (!this.ultimoCodigoEscaneado) return
      if (this.modo === 'medicamento') {
        this.med.codigo = this.ultimoCodigoEscaneado
      } else {
        this.perf.codigo = this.ultimoCodigoEscaneado
      }
    },
  },
  methods: {
    // registrarMedicamento()
    // Quién la llama: el botón "Registrar medicamento" del formulario (modo === 'medicamento').
    // Con quién se comunica: no llama al backend directamente -- emite
    //           'registrar-med' hacia App.vue, que es quien hace el POST a /api/medicamentos.
    // Qué hace: valida los campos obligatorios, chequea que el código no
    //           exista ya en "medicamentos" (prop), y emite 'registrar-med'
    //           con los datos normalizados (números parseados, valores por
    //           defecto si quedaron vacíos), y limpia el formulario. Ya no
    //           pide ni envía "vencimiento" (se quitó del alta: el
    //           vencimiento se carga al ingresar la compra, en Movimientos >
    //           Compra, y se ve por lote con el botón "Vencimiento").
    // Qué devuelve: nada (void); si falla una validación, corta con un
    //           'toast' de error y no llega a emitir 'registrar-med'.
    registrarMedicamento() {
      const { codigo, nombre } = this.med
      if (!codigo || !nombre) { this.$emit('toast', 'Completá los campos obligatorios (*)'); return }
      if (this.medicamentos.find(m => m.codigo === codigo)) { this.$emit('toast', 'Ya existe un medicamento con ese código'); return }
      this.$emit('registrar-med', {
        codigo, nombre,
        laboratorio: this.med.laboratorio || '-',
        presentacion: this.med.presentacion || '-',
        stock: parseInt(this.med.stock) || 0,
        stockMin: parseInt(this.med.stockMin) || 10,
        categoria: this.med.categoria || 'Otro',
        precio: parseFloat(this.med.precio) || 0,
      })
      this.limpiarMed()
    },
    // limpiarMed()
    // Quién la llama: el botón "Limpiar" del formulario de medicamento, y
    //           registrarMedicamento() al terminar de emitir.
    // Qué hace / devuelve: vacía el formulario de medicamento (mutación de
    //           estado local); no devuelve nada.
    limpiarMed() {
      this.med = { codigo: '', nombre: '', laboratorio: '', presentacion: '', stock: '', stockMin: 10, categoria: '', obs: '', precio: '' }
    },
    // registrarPerfumeria()
    // Quién la llama: el botón "Registrar producto" del formulario (modo === 'perfumeria').
    // Con quién se comunica: emite 'registrar-perf' hacia App.vue, que hace el POST a /api/perfumeria.
    // Qué hace / devuelve: igual que registrarMedicamento pero para el
    //           formulario de perfumería; ya no pide ni envía "vencimiento"
    //           (se quitó del alta). No devuelve nada.
    registrarPerfumeria() {
      const { codigo, nombre } = this.perf
      if (!codigo || !nombre) { this.$emit('toast', 'Completá los campos obligatorios (*)'); return }
      if (this.perfumeria.find(p => p.codigo === codigo)) { this.$emit('toast', 'Ya existe un producto con ese código'); return }
      this.$emit('registrar-perf', {
        codigo, nombre,
        marca: this.perf.marca || '-',
        descripcion: this.perf.descripcion || '-',
        stock: parseInt(this.perf.stock) || 0,
        stockMin: parseInt(this.perf.stockMin) || 10,
        categoria: this.perf.categoria || 'Otros',
        precio: parseFloat(this.perf.precio) || 0,
      })
      this.limpiarPerf()
    },
    // limpiarPerf()
    // Quién la llama: el botón "Limpiar" del formulario de perfumería, y
    //           registrarPerfumeria() al terminar de emitir.
    // Qué hace / devuelve: vacía el formulario de perfumería; no devuelve nada.
    limpiarPerf() {
      this.perf = { codigo: '', nombre: '', marca: '', descripcion: '', stock: '', stockMin: 10, categoria: '', precio: '' }
    },
  },
}
</script>
