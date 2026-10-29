<template>
  <div>
    <div class="section-header">
      <div>
        <div class="section-title">PANEL PRINCIPAL</div>
        <div class="section-sub">Resumen general del sistema</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-label">Total medicamentos</div><div class="stat-value">{{ medicamentos.length }}</div><div class="stat-sub">Productos activos</div></div>
      <div class="stat warn"><div class="stat-label">Stock bajo</div><div class="stat-value">{{ medicamentos.filter(m => m.stock <= m.stock_min && m.stock > 0).length }}</div><div class="stat-sub">Por reponer</div></div>
      <div class="stat danger"><div class="stat-label">Agotados</div><div class="stat-value">{{ medicamentos.filter(m => m.stock === 0).length }}</div><div class="stat-sub">Sin stock</div></div>
      <div class="stat danger"><div class="stat-label">Venc. próximos</div><div class="stat-value">{{ medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) <= 30).length }}</div><div class="stat-sub">Menos de 30 días</div></div>
      <div class="stat ok"><div class="stat-label">Ingresos</div><div class="stat-value">{{ ingresos.length }}</div><div class="stat-sub">Registrados</div></div>
      <div class="stat ok"><div class="stat-label">Egresos</div><div class="stat-value">{{ egresos.length }}</div><div class="stat-sub">Registrados</div></div>
    </div>

    <div v-if="medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) <= 30).length > 0" class="alert-box">
      ⚠ {{ medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) <= 30).length }} medicamento(s) vencen en menos de 30 días:
      {{ medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) <= 30).map(m => m.nombre).join(', ') }}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
      <div class="card">
        <div class="card-title">Stock bajo</div>
        <div v-if="medicamentos.filter(m => m.stock <= m.stock_min).length === 0" class="empty">Sin alertas de stock</div>
        <div v-for="m in medicamentos.filter(m => m.stock <= m.stock_min)" :key="m.id" style="padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:calc(15px * var(--zoom-texto));">
            <span>{{ m.nombre }}</span>
            <span :style="{ color: m.stock === 0 ? 'var(--red)' : 'var(--yellow)' }">{{ m.stock }} uds.</span>
          </div>
          <div class="stock-bar">
            <div class="stock-fill" :class="m.stock === 0 ? 'low' : 'mid'" :style="{ width: Math.min(100, Math.round(m.stock / m.stock_min * 100)) + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Últimos movimientos</div>
        <div v-if="ultimosMovimientos.length === 0" class="empty">Sin movimientos</div>
        <div v-for="(m, i) in ultimosMovimientos" :key="i" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:calc(15px * var(--zoom-texto));">
          <div>
            <div>{{ m.nombre }}</div>
            <div style="color:var(--text2);font-size:calc(13px * var(--zoom-texto));margin-top:2px;">{{ m.fecha }} · {{ m.empleado }}</div>
          </div>
          <span class="badge" :class="m.tipo === 'ingreso' ? 'badge-in' : 'badge-out'">{{ m.tipo === 'ingreso' ? '+' : '-' }}{{ m.cantidad }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// SeccionDashboard: panel principal con los números resumen del sistema
// (total de medicamentos, stock bajo, agotados, vencimientos próximos,
// cantidad de ingresos/egresos) y dos listados cortos: productos con stock
// bajo y los últimos 5 movimientos. Es de solo lectura, todo se calcula a
// partir de lo que le llega por props.
export default {
  name: 'SeccionDashboard',
  props: {
    medicamentos: Array, // lista completa de medicamentos
    ingresos: Array,     // historial de ingresos de medicamentos
    egresos: Array,      // historial de egresos de medicamentos
  },
  computed: {
    // ultimosMovimientos
    // Quién la usa: el template, en la tabla "Últimos movimientos" del dashboard.
    // Qué devuelve: un array de máximo 5 elementos, mezclando ingresos y
    //           egresos (cada uno con un campo "tipo" agregado), ordenados
    //           del más reciente al más viejo. Solo para mostrar en pantalla:
    //           no mezcla los historiales reales, que siguen separados en la base.
    ultimosMovimientos() {
      const todos = [
        ...this.ingresos.map(m => ({ ...m, tipo: 'ingreso' })),
        ...this.egresos.map(m => ({ ...m, tipo: 'egreso' })),
      ]
      return todos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5)
    },
  },
  methods: {
    // getDiasVenc(fecha)
    // Quién la llama: el template, para el contador "Venc. próximos" y el
    //           cartel de alerta de arriba (también existe la misma función
    //           en SeccionVencimientos.vue y SeccionMedicamentos.vue). El
    //           template siempre chequea "m.vencimiento &&" antes de llamarla,
    //           así que los medicamentos sin vencimiento cargado ya quedan
    //           afuera del conteo (no se cuentan como "por vencer").
    // Qué devuelve: un número. Negativo si ya venció, 0 si vence hoy,
    //           positivo con los días que faltan.
    getDiasVenc(fecha) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      return Math.ceil((new Date(fecha) - hoy) / (1000 * 60 * 60 * 24))
    },
  },
}
</script>
