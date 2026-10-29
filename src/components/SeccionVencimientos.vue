<template>
  <div>
    <div class="section-header">
      <div>
        <div class="section-title">CONTROL DE VENCIMIENTOS</div>
        <div class="section-sub">Medicamentos ordenados por fecha de vencimiento</div>
      </div>
    </div>

    <div class="stats" style="margin-bottom:1.5rem;">
      <div class="stat danger"><div class="stat-label">Vencidos</div><div class="stat-value">{{ medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) < 0).length }}</div></div>
      <div class="stat danger"><div class="stat-label">Críticos (≤30d)</div><div class="stat-value">{{ medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) >= 0 && getDiasVenc(m.vencimiento) <= 30).length }}</div></div>
      <div class="stat warn"><div class="stat-label">Próximos (≤90d)</div><div class="stat-value">{{ medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) > 30 && getDiasVenc(m.vencimiento) <= 90).length }}</div></div>
      <div class="stat ok"><div class="stat-label">Vigentes</div><div class="stat-value">{{ medicamentos.filter(m => m.vencimiento && getDiasVenc(m.vencimiento) > 90).length }}</div></div>
      <div class="stat"><div class="stat-label">Sin vencimiento</div><div class="stat-value">{{ medicamentos.filter(m => !m.vencimiento).length }}</div></div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Código</th><th>Nombre</th><th>Laboratorio</th><th>Stock</th><th>Fecha venc.</th><th>Días restantes</th><th>Estado</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in [...medicamentos].sort((a,b) => {
                  const da = getDiasVenc(a.vencimiento), db = getDiasVenc(b.vencimiento)
                  if (da === null && db === null) return 0
                  if (da === null) return 1
                  if (db === null) return -1
                  return da - db
                })" :key="m.id">
              <td><code style="font-size:calc(13px * var(--zoom-texto));color:var(--orange)">{{ m.codigo }}</code></td>
              <td>{{ m.nombre }}</td>
              <td style="color:var(--text2)">{{ m.laboratorio }}</td>
              <td>{{ m.stock }} uds.</td>
              <td style="font-size:calc(14px * var(--zoom-texto))">{{ m.vencimiento || 'Sin vencimiento' }}</td>
              <td :class="getEstadoVenc(getDiasVenc(m.vencimiento)).dayCls">
                {{ getDiasVenc(m.vencimiento) === null ? '—' : getDiasVenc(m.vencimiento) < 0 ? 'Vencido hace ' + Math.abs(getDiasVenc(m.vencimiento)) + ' días' : getDiasVenc(m.vencimiento) === 0 ? 'Vence hoy' : getDiasVenc(m.vencimiento) + ' días' }}
              </td>
              <td><span class="badge" :class="getEstadoVenc(getDiasVenc(m.vencimiento)).cls">{{ getEstadoVenc(getDiasVenc(m.vencimiento)).label }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
// SeccionVencimientos: muestra los medicamentos ordenados por fecha de
// vencimiento, con contadores (vencidos / críticos / próximos / vigentes)
// y una etiqueta de estado por fila. Es de solo lectura: no modifica datos,
// solo los recibe por props y los calcula/ordena para mostrarlos.
export default {
  name: 'SeccionVencimientos',
  props: {
    medicamentos: Array, // lista completa de medicamentos (viene de App.vue)
  },
  methods: {
    // getDiasVenc(fecha)
    // Quién la llama: el propio template (tabla y contadores de arriba, en
    //           varios v-for/filter) y también SeccionDashboard.vue tiene su
    //           propia copia de esta misma función.
    // Qué devuelve: un número (negativo si ya venció, 0 si vence hoy,
    //           positivo con los días que faltan), o null si no tiene
    //           vencimiento cargado (ahora es opcional para medicamentos).
    getDiasVenc(fecha) {
      if (!fecha) return null
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      return Math.ceil((new Date(fecha) - hoy) / (1000 * 60 * 60 * 24))
    },
    // getEstadoVenc(dias)
    // Quién la llama: el template, para pintar la columna "Días restantes" y
    //           la insignia de "Estado" de cada fila (recibe el resultado de getDiasVenc).
    // Qué devuelve: un objeto { label, cls, dayCls } con el texto y las
    //           clases CSS del estado: Vencido/Crítico (rojo), Próximo
    //           (amarillo, ≤90 días), Vigente (verde), o "Sin vencimiento" si dias es null.
    getEstadoVenc(dias) {
      if (dias === null) return { label: 'Sin vencimiento', cls: 'badge-ok', dayCls: 'days-ok' }
      if (dias < 0) return { label: 'Vencido', cls: 'badge-danger', dayCls: 'days-danger' }
      if (dias <= 30) return { label: 'Crítico', cls: 'badge-danger', dayCls: 'days-danger' }
      if (dias <= 90) return { label: 'Próximo', cls: 'badge-warn', dayCls: 'days-warn' }
      return { label: 'Vigente', cls: 'badge-ok', dayCls: 'days-ok' }
    },
  },
}
</script>
