<template>
  <div class="app">

    <!-- Si no hay sesión, muestra el login -->
    <SeccionLogin
      v-if="!sesionActiva"
      @login-exitoso="onLoginExitoso"
    />

    <!-- Si hay sesión, muestra el sistema completo -->
    <template v-else>

      <AppHeader
        :horaActual="horaActual"
        :seccionActiva="seccionActiva"
        :nombreUsuario="nombreUsuario"
        :rol="rol"
        @cambiar-seccion="showSection"
        @cerrar-sesion="cerrarSesion"
      />

      <main class="main">
        <div v-if="cargando" class="empty">Cargando datos del servidor...</div>
        <div v-else-if="errorConexion" class="alert-box">
          ⚠ No se pudo conectar con el servidor ({{ API_URL }}). Verificá que el backend y MySQL estén corriendo.
        </div>

        <template v-else>
          <SeccionDashboard
            v-if="seccionActiva === 'dashboard'"
            :medicamentos="medicamentos"
            :perfumeria="perfumeria"
            :ingresos="ingresos"
            :egresos="egresos"
            :ingresosPerfumeria="ingresosPerfumeria"
            :egresosPerfumeria="egresosPerfumeria"
          />
          <SeccionMedicamentos
            v-if="seccionActiva === 'medicamentos'"
            :medicamentos="medicamentos"
            :usuarioId="usuarioId"
            :ultimoCodigoEscaneado="ultimoCodigoEscaneado"
            :scanCounter="scanCounter"
            :lotes="lotes"
            @eliminar="eliminarMed"
            @editar="guardarEdicionMed"
            @ver-lotes="id => cargarLotesDelProducto('medicamentos', id)"
            @editar-lote="d => guardarVencimientoLoteEnServidor('medicamentos', d)"
            @toast="showToast"
            @ir-a-registrar="showSection('registrar')"
          />
          <SeccionPerfumeria
            v-if="seccionActiva === 'perfumeria'"
            :perfumeria="perfumeria"
            :usuarioId="usuarioId"
            :ultimoCodigoEscaneado="ultimoCodigoEscaneado"
            :scanCounter="scanCounter"
            :lotes="lotes"
            @eliminar="eliminarPerf"
            @editar="guardarEdicionPerf"
            @ver-lotes="id => cargarLotesDelProducto('perfumeria', id)"
            @editar-lote="d => guardarVencimientoLoteEnServidor('perfumeria', d)"
            @toast="showToast"
            @ir-a-registrar="showSection('registrar')"
          />
          <SeccionMovimientos
            v-if="seccionActiva === 'movimientos'"
            :medicamentos="medicamentos"
            :perfumeria="perfumeria"
            :ingresos="ingresos"
            :egresos="egresos"
            :ingresosPerfumeria="ingresosPerfumeria"
            :egresosPerfumeria="egresosPerfumeria"
            :correcciones="correcciones"
            :correccionesPerfumeria="correccionesPerfumeria"
            :nombreUsuario="nombreUsuario"
            :ultimoCodigoEscaneado="ultimoCodigoEscaneado"
            :scanCounter="scanCounter"
            @confirmar-compra="confirmarCompra"
            @confirmar-venta="confirmarVenta"
            @confirmar-compra-perf="confirmarCompraPerf"
            @confirmar-venta-perf="confirmarVentaPerf"
            @toast="showToast"
          />
          <SeccionVencimientos
            v-if="seccionActiva === 'vencimientos'"
            :medicamentos="medicamentos"
            :perfumeria="perfumeria"
          />
          <SeccionRegistrar
            v-if="seccionActiva === 'registrar'"
            :medicamentos="medicamentos"
            :perfumeria="perfumeria"
            :ultimoCodigoEscaneado="ultimoCodigoEscaneado"
            :scanCounter="scanCounter"
            @registrar-med="agregarMedicamento"
            @registrar-perf="agregarPerfumeria"
            @toast="showToast"
          />
          <!-- Solo administrador o dueño pueden ver/usar esta sección (además está oculta en el menú para el resto) -->
          <SeccionUsuarios
            v-if="seccionActiva === 'usuarios' && (rol === 'administrador' || rol === 'dueño')"
            :usuarios="usuarios"
            :rol="rol"
            :configGmail="configGmail"
            @crear-usuario="crearUsuario"
            @cambiar-estado-usuario="cambiarEstadoUsuario"
            @guardar-gmail="guardarGmail"
            @probar-gmail="probarGmail"
            @toast="showToast"
          />
        </template>
      </main>

      <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>

    </template>
  </div>
</template>

<script>
// App.vue: componente raíz del sistema. Es el único que habla directamente
// con el backend (fetch a la API en API_URL): guarda la sesión, carga todos
// los datos al iniciar, y expone un método por cada acción que puede pedir
// cualquier sección hija (crear/editar/eliminar productos, confirmar
// compras/ventas, gestionar usuarios, etc.). Las secciones (Dashboard,
// Medicamentos, Movimientos...) reciben los datos por props y avisan por
// eventos cuando el usuario hace algo; nunca hacen fetch por su cuenta.
// También mantiene el reloj del header y la conexión WebSocket con el
// lector de código de barras (ESP32).
import SeccionLogin      from './components/SeccionLogin.vue'
import AppHeader         from './components/AppHeader.vue'
import SeccionDashboard  from './components/SeccionDashboard.vue'
import SeccionMedicamentos from './components/SeccionMedicamentos.vue'
import SeccionPerfumeria from './components/SeccionPerfumeria.vue'
import SeccionMovimientos from './components/SeccionMovimientos.vue'
import SeccionVencimientos from './components/SeccionVencimientos.vue'
import SeccionRegistrar  from './components/SeccionRegistrar.vue'
import SeccionUsuarios   from './components/SeccionUsuarios.vue'

// En la web (Vercel) se usa VITE_API_URL; en la PC, el back local.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default {
  name: 'App',
  components: {
    SeccionLogin, AppHeader, SeccionDashboard, SeccionMedicamentos,
    SeccionPerfumeria, SeccionMovimientos, SeccionVencimientos, SeccionRegistrar,
    SeccionUsuarios,
  },
  data() {
    return {
      API_URL,
      sesionActiva:  false, // true una vez logueado; controla si se muestra el login o el sistema
      nombreUsuario: '',
      token:         '',    // JWT devuelto por el login, se manda en cada fetch (ver authHeaders)
      rol:           '',    // 'empleado' | 'administrador' | 'dueño'
      usuarioId:     null,
      seccionActiva: 'dashboard', // nombre de la sección que se está mostrando en <main>
      horaActual:    '--:--',     // reloj del header, se actualiza cada segundo (ver updateClock)
      toastMsg:      '',    // texto del mensaje flotante (toast) actualmente visible
      toastVisible:  false,
      cargando:      true,  // true mientras se traen los datos iniciales del backend
      errorConexion: false, // true si cargarDatos() no pudo conectarse al backend
      medicamentos:         [],
      perfumeria:           [],
      ingresos:             [],
      egresos:              [],
      ingresosPerfumeria:   [],
      egresosPerfumeria:    [],
      correcciones:            [], // historial de ajustes manuales de stock (Movimientos > Correcciones) — medicamentos
      correccionesPerfumeria:  [], // ídem, perfumería
      lotes:                [],   // vencimientos por lote del producto abierto en el modal "Vencimiento" (Medicamentos / Perfumería)
      usuarios:             [],   // solo se carga si el rol es administrador o dueño
      configGmail:          { configurado: false, gmailUser: null },
      // ESP32 Scanner
      esp32Ws:               null,  // conexión (EventSource) con el back, que reenvía los códigos del lector ESP32
      ultimoCodigoEscaneado: '',    // último código recibido; las secciones lo leen por prop
      scanCounter:           0, // se incrementa en CADA escaneo, incluso si el código es igual al anterior
    }
  },
  methods: {
    // ── Sesión ──────────────────────────────────────────────────
    // Quién la llama: SeccionLogin.vue, evento "login-exitoso" (cuando el
    //           backend confirma usuario/contraseña correctos).
    // Qué hace: guarda los datos de la sesión en memoria y dispara la carga
    //           inicial de todos los datos del sistema (cargarDatos).
    onLoginExitoso(data) {
      this.token         = data.token
      this.usuarioId     = data.id
      this.nombreUsuario = data.nombre
      this.rol           = data.rol
      this.sesionActiva  = true
      this.cargarDatos()
    },

    // Quién la llama: AppHeader.vue, evento "cerrar-sesion" (botón "Cerrar sesión").
    // Qué hace: borra la sesión (sessionStorage y el estado en memoria) y
    //           vacía todos los datos cargados, para volver a mostrar la
    //           pantalla de login limpia.
    cerrarSesion() {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('nombre')
      sessionStorage.removeItem('usuario')
      sessionStorage.removeItem('rol')
      sessionStorage.removeItem('usuarioId')
      this.token         = ''
      this.usuarioId     = null
      this.nombreUsuario = ''
      this.rol           = ''
      this.sesionActiva  = false
      this.medicamentos  = []
      this.perfumeria    = []
      this.ingresos      = []
      this.egresos       = []
      this.ingresosPerfumeria  = []
      this.egresosPerfumeria   = []
      this.correcciones           = []
      this.correccionesPerfumeria = []
      this.usuarios      = []
    },

    // ── Headers con token para todos los fetch ──────────────────
    // Quién la llama: todos los demás métodos de este archivo que hacen
    //           fetch al backend (menos cargarDatos, que arma el suyo propio
    //           con el token a mano porque no necesita Content-Type).
    // Devuelve: un objeto { 'Content-Type', 'Authorization' } listo para
    //           pasarle a fetch(..., { headers: this.authHeaders() }).
    authHeaders() {
      return {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.token}`,
      }
    },

    // Quién la llama: AppHeader.vue, evento "cambiar-seccion" (al hacer clic
    //           en un botón del menú).
    // Qué hace: cambia this.seccionActiva, lo que decide qué <Seccion...> de
    //           <main> se muestra (ver el template de arriba).
    showSection(id) { this.seccionActiva = id },

    // Quién la llama: cualquier método de este archivo que necesite avisar
    //           éxito o error de una acción (y también SeccionUsuarios.vue y
    //           SeccionRegistrar.vue, vía el evento "toast").
    // Qué hace: muestra el mensaje flotante durante 3 segundos y después lo oculta.
    showToast(msg) {
      this.toastMsg     = msg
      this.toastVisible = true
      setTimeout(() => { this.toastVisible = false }, 3000)
    },

    // ── Carga inicial ───────────────────────────────────────────
    // Quién la llama: onLoginExitoso() (al loguearse), mounted() (si ya
    //           había una sesión guardada al recargar la página), y también
    //           confirmarCompra/confirmarVenta/confirmarCompraPerf/
    //           confirmarVentaPerf (para refrescar todo después de un
    //           movimiento de stock).
    // Qué hace: trae de una sola vez todo lo que necesita el sistema para
    //           arrancar: catálogos (medicamentos, perfumería), los cuatro
    //           historiales de movimientos y los dos de correcciones. Si el
    //           rol es administrador o dueño, además carga usuarios y la
    //           configuración de Gmail.
    async cargarDatos() {
      this.cargando      = true
      this.errorConexion = false
      try {
        const headers = { 'Authorization': `Bearer ${this.token}` }
        const [rMed, rPerf, rIng, rEgr, rIngP, rEgrP, rCor, rCorP] = await Promise.all([
          fetch(`${API_URL}/medicamentos`,                  { headers }),
          fetch(`${API_URL}/perfumeria`,                    { headers }),
          fetch(`${API_URL}/historial-ingresos`,            { headers }),
          fetch(`${API_URL}/historial-egresos`,             { headers }),
          fetch(`${API_URL}/historial-ingresos-perfumeria`, { headers }),
          fetch(`${API_URL}/historial-egresos-perfumeria`,  { headers }),
          fetch(`${API_URL}/historial-correcciones`,            { headers }),
          fetch(`${API_URL}/historial-correcciones-perfumeria`, { headers }),
        ])
        if (!rMed.ok || !rPerf.ok || !rIng.ok || !rEgr.ok || !rIngP.ok || !rEgrP.ok || !rCor.ok || !rCorP.ok)
          throw new Error('Error del servidor')
        this.medicamentos       = await rMed.json()
        this.perfumeria         = await rPerf.json()
        this.ingresos           = await rIng.json()
        this.egresos            = await rEgr.json()
        this.ingresosPerfumeria = await rIngP.json()
        this.egresosPerfumeria  = await rEgrP.json()
        this.correcciones           = await rCor.json()
        this.correccionesPerfumeria = await rCorP.json()
        // Solo administrador o dueño pueden listar usuarios; para un empleado directamente no se pide.
        if (this.rol === 'administrador' || this.rol === 'dueño') {
          await this.cargarUsuarios()
          await this.cargarConfigGmail()
        }
      } catch (err) {
        console.error(err)
        this.errorConexion = true
      } finally {
        this.cargando = false
      }
    },

    // ── Usuarios (solo administrador / dueño) ────────────────────
    // Quién la llama: cargarDatos() (solo si el rol logueado es
    //           administrador o dueño).
    // Qué hace: trae el listado de cuentas del backend. Si el usuario
    //           logueado no tiene permisos (es empleado) o falla la
    //           petición, simplemente no carga nada: la sección "Usuarios"
    //           ni se muestra en ese caso.
    async cargarUsuarios() {
      try {
        const res = await fetch(`${API_URL}/usuarios`, { headers: this.authHeaders() })
        if (!res.ok) return   // si no tiene permisos (empleado) o falla, simplemente no carga la lista
        this.usuarios = await res.json()
      } catch { /* silencioso: la sección "Usuarios" ni siquiera se muestra si esto falla */ }
    },
    // Quién la llama: SeccionUsuarios.vue, evento "crear-usuario" (formulario
    //           de alta de cuenta).
    // Qué hace: da de alta una cuenta nueva en el backend (dispara el envío
    //           del correo con las credenciales) y la agrega al listado local.
    async crearUsuario(datos) {
      try {
        const res  = await fetch(`${API_URL}/usuarios`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(datos) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al crear la cuenta'); return }
        this.usuarios.push(data)
        this.showToast(data.emailEnviado
          ? 'Cuenta creada y credenciales enviadas por correo'
          : 'Cuenta creada, pero no se pudo enviar el correo (revisá la configuración de Gmail)')
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // cambiarEstadoUsuario({ id, activo, accion })
    // Qué hace: habilita o deshabilita una cuenta (en vez de borrarla), para
    //           poder revertirlo más adelante si esa persona vuelve.
    // Quién la llama: el evento "cambiar-estado-usuario" de <SeccionUsuarios>
    //                 (botón "Deshabilitar" / "Habilitar" de cada fila, ya
    //                 confirmado por el modal propio del componente, no por
    //                 el confirm() nativo del navegador).
    async cambiarEstadoUsuario({ id, activo, accion }) {
      try {
        const res  = await fetch(`${API_URL}/usuarios/${id}/estado`, { method: 'PATCH', headers: this.authHeaders(), body: JSON.stringify({ activo }) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || `Error al ${accion} la cuenta`); return }
        const idx = this.usuarios.findIndex(u => u.id === id)
        if (idx !== -1) this.usuarios[idx] = data   // se actualiza en el lugar (no se quita de la lista)
        this.showToast(activo ? 'Cuenta habilitada' : 'Cuenta deshabilitada')
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // Quién la llama: cargarDatos() (solo si el rol logueado es
    //           administrador o dueño) y guardarGmail() (para refrescar el
    //           estado justo después de guardar).
    // Qué hace: trae la configuración actual del Gmail emisor (si ya está
    //           configurado y qué casilla es).
    async cargarConfigGmail() {
      try {
        const res = await fetch(`${API_URL}/configuracion`, { headers: this.authHeaders() })
        if (!res.ok) return
        this.configGmail = await res.json()
      } catch { /* silencioso */ }
    },
    // Quién la llama: SeccionUsuarios.vue, evento "guardar-gmail" (formulario
    //           "Configuración de correo").
    // Qué hace: guarda la casilla de Gmail (y su contraseña de aplicación)
    //           desde la que el sistema manda las credenciales a las cuentas
    //           nuevas, y refresca cargarConfigGmail() para reflejarlo.
    async guardarGmail(datos) {
      try {
        const res  = await fetch(`${API_URL}/configuracion/gmail`, { method: 'PUT', headers: this.authHeaders(), body: JSON.stringify(datos) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al guardar la configuración'); return }
        this.showToast(data.mensaje)
        await this.cargarConfigGmail()
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // Quién la llama: SeccionUsuarios.vue, evento "probar-gmail" (botón
    //           "Enviar correo de prueba").
    // Qué hace: pide al backend que mande un correo de prueba con la
    //           configuración de Gmail ya guardada.
    async probarGmail() {
      try {
        const res  = await fetch(`${API_URL}/configuracion/gmail/probar`, { method: 'POST', headers: this.authHeaders() })
        const data = await res.json()
        this.showToast(res.ok ? data.mensaje : (data.error || 'No se pudo enviar el correo de prueba'))
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // ── Medicamentos ────────────────────────────────────────────
    // Quién la llama: SeccionRegistrar.vue, evento "registrar-med"
    //           (formulario de alta, modo "medicamento").
    // Qué hace: da de alta un medicamento nuevo y lo agrega al array local.
    async agregarMedicamento(med) {
      try {
        const res  = await fetch(`${API_URL}/medicamentos`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(med) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al registrar'); return }
        this.medicamentos.push(data)
        this.showToast('Medicamento registrado correctamente')
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // Quién la llama: SeccionMedicamentos.vue, evento "eliminar" (botón
    //           "Eliminar" de cada fila, confirmado con el confirm() nativo
    //           del navegador dentro de este mismo método).
    // Qué hace: borra el medicamento en el backend y lo saca del array local.
    async eliminarMed(id) {
      if (!confirm('¿Eliminar este medicamento?')) return
      try {
        const res  = await fetch(`${API_URL}/medicamentos/${id}`, { method: 'DELETE', headers: this.authHeaders() })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al eliminar'); return }
        this.medicamentos = this.medicamentos.filter(m => m.id !== id)
        this.showToast('Medicamento eliminado')
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // Quién la llama: SeccionMedicamentos.vue, evento "editar" (modal de
    //           edición, botón "Guardar").
    // Qué hace: guarda los cambios en el backend y actualiza ese medicamento
    //           en el array local. Si el "Stock actual" se modificó a mano,
    //           el backend genera automáticamente un registro de corrección,
    //           así que después de guardar se vuelve a pedir el historial de
    //           correcciones (cargarCorrecciones) para que se vea actualizado.
    async guardarEdicionMed(data) {
      try {
        const res        = await fetch(`${API_URL}/medicamentos/${data.id}`, { method: 'PUT', headers: this.authHeaders(), body: JSON.stringify(data) })
        const actualizado = await res.json()
        if (!res.ok) { this.showToast(actualizado.error || 'Error al actualizar'); return }
        const idx = this.medicamentos.findIndex(m => m.id === data.id)
        if (idx !== -1) this.medicamentos[idx] = actualizado
        this.showToast('Medicamento actualizado correctamente')
        // Si el "Stock actual" cambió, el backend generó una corrección: se
        // vuelve a traer el historial para que se vea en Movimientos > Correcciones.
        this.cargarCorrecciones()
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // ── Correcciones (ajustes manuales de stock) ─────────────────
    // Quién la llama: cargarDatos() (carga inicial) y guardarEdicionMed()
    //           (justo después de editar un medicamento, por si cambió el stock).
    // Qué hace: refresca el historial de correcciones de medicamentos.
    async cargarCorrecciones() {
      try {
        const res = await fetch(`${API_URL}/historial-correcciones`, { headers: this.authHeaders() })
        if (res.ok) this.correcciones = await res.json()
      } catch { /* silencioso: no interrumpe el flujo de edición */ }
    },
    // Quién la llama: cargarDatos() (carga inicial) y guardarEdicionPerf()
    //           (justo después de editar un producto de perfumería).
    // Qué hace: refresca el historial de correcciones de perfumería.
    async cargarCorreccionesPerfumeria() {
      try {
        const res = await fetch(`${API_URL}/historial-correcciones-perfumeria`, { headers: this.authHeaders() })
        if (res.ok) this.correccionesPerfumeria = await res.json()
      } catch { /* silencioso: no interrumpe el flujo de edición */ }
    },

    // ── Perfumería ──────────────────────────────────────────────
    // Quién la llama: SeccionRegistrar.vue, evento "registrar-perf"
    //           (formulario de alta, modo "perfumeria").
    // Qué hace: da de alta un producto nuevo y lo agrega al array local.
    async agregarPerfumeria(prod) {
      try {
        const res  = await fetch(`${API_URL}/perfumeria`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(prod) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al registrar'); return }
        this.perfumeria.push(data)
        this.showToast('Producto de perfumería registrado correctamente')
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // Quién la llama: SeccionPerfumeria.vue, evento "eliminar" (botón
    //           "Eliminar" de cada fila, confirmado con el confirm() nativo
    //           del navegador dentro de este mismo método).
    // Qué hace: borra el producto en el backend y lo saca del array local.
    async eliminarPerf(id) {
      if (!confirm('¿Eliminar este producto?')) return
      try {
        const res  = await fetch(`${API_URL}/perfumeria/${id}`, { method: 'DELETE', headers: this.authHeaders() })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al eliminar'); return }
        this.perfumeria = this.perfumeria.filter(p => p.id !== id)
        this.showToast('Producto eliminado')
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // Quién la llama: SeccionPerfumeria.vue, evento "editar" (modal de
    //           edición, botón "Guardar").
    // Qué hace: guarda los cambios en el backend y actualiza ese producto en
    //           el array local. Igual que guardarEdicionMed: si cambió el
    //           "Stock actual", refresca el historial de correcciones de perfumería.
    async guardarEdicionPerf(data) {
      try {
        const res        = await fetch(`${API_URL}/perfumeria/${data.id}`, { method: 'PUT', headers: this.authHeaders(), body: JSON.stringify(data) })
        const actualizado = await res.json()
        if (!res.ok) { this.showToast(actualizado.error || 'Error al actualizar'); return }
        const idx = this.perfumeria.findIndex(p => p.id === data.id)
        if (idx !== -1) this.perfumeria[idx] = actualizado
        this.showToast('Producto actualizado correctamente')
        // Si el "Stock actual" cambió, el backend generó una corrección: se
        // vuelve a traer el historial para que se vea en Movimientos > Correcciones.
        this.cargarCorreccionesPerfumeria()
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // cargarLotesDelProducto(tipo, id)
    // Quién la llama: SeccionMedicamentos.vue y SeccionPerfumeria.vue, a través del evento
    //                 'ver-lotes' (botón "Vencimiento" de cada fila). "tipo" es
    //                 'medicamentos' o 'perfumeria'.
    // Qué hace: Pide al servidor (GET /api/{tipo}/{id}/lotes) los lotes con stock del
    //           producto y los deja en this.lotes, que la ventana de vencimientos recibe
    //           por prop. Si falla, muestra un aviso.
    // Qué devuelve: Una Promise que se resuelve sin valor (nada). El resultado queda en
    //               this.lotes.
    async cargarLotesDelProducto(tipo, id) {
      this.lotes = []
      try {
        const res = await fetch(`${API_URL}/${tipo}/${id}/lotes`, { headers: this.authHeaders() })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al obtener los vencimientos'); return }
        this.lotes = data
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },
    // guardarVencimientoLoteEnServidor(tipo, datos)
    // Quién la llama: SeccionMedicamentos.vue y SeccionPerfumeria.vue, a través del evento
    //                 'editar-lote' (botón "Guardar" de la fila en edición). "datos" es
    //                 { productoId, loteId, vencimiento, cantidad }.
    // Qué hace: Pide al servidor (PUT /api/{tipo}/{productoId}/lotes/{loteId}) cambiar
    //           la fecha de vencimiento de esas unidades. Con la respuesta refresca
    //           this.lotes (lista de la ventana) y reemplaza el producto en el array
    //           local para que la tabla muestre el cambio. Muestra un aviso de éxito o
    //           de error.
    // Qué devuelve: Una Promise que se resuelve sin valor (nada).
    async guardarVencimientoLoteEnServidor(tipo, datos) {
      try {
        const { productoId, loteId, vencimiento, cantidad } = datos
        const res = await fetch(`${API_URL}/${tipo}/${productoId}/lotes/${loteId}`, {
          method: 'PUT', headers: this.authHeaders(), body: JSON.stringify({ vencimiento, cantidad }),
        })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al guardar el vencimiento'); return }
        this.lotes = data.lotes
        const lista = tipo === 'medicamentos' ? this.medicamentos : this.perfumeria
        const actualizado = data.medicamento || data.producto
        const idx = lista.findIndex(x => x.id === productoId)
        if (idx !== -1 && actualizado) lista[idx] = actualizado
        this.showToast('Fecha de vencimiento actualizada')
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // ── Compras medicamentos ────────────────────────────────────
    // Quién la llama: SeccionMovimientos.vue, evento "confirmar-compra"
    //           (botón "Confirmar ingreso", con el toggle en "Medicamentos").
    // Qué hace: confirma el comprobante de compra/ingreso en el backend
    //           (suma stock de cada línea) y recarga todos los datos
    //           (catálogo + historiales) para reflejar los cambios.
    async confirmarCompra(comp) {
      try {
        const res  = await fetch(`${API_URL}/compras`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(comp) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al confirmar'); return }
        this.showToast(data.mensaje)
        await this.cargarDatos()
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // ── Ventas medicamentos ─────────────────────────────────────
    // Quién la llama: SeccionMovimientos.vue, evento "confirmar-venta"
    //           (botón "Confirmar venta", con el toggle en "Medicamentos").
    // Qué hace: confirma el comprobante de venta/egreso en el backend (resta
    //           stock de cada línea) y recarga todos los datos.
    async confirmarVenta(venta) {
      try {
        const res  = await fetch(`${API_URL}/ventas`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(venta) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al confirmar'); return }
        this.showToast(data.mensaje)
        await this.cargarDatos()
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // ── Compras perfumería ──────────────────────────────────────
    // Quién la llama: SeccionMovimientos.vue, evento "confirmar-compra-perf"
    //           (botón "Confirmar ingreso", con el toggle en "Perfumería").
    // Qué hace: igual que confirmarCompra, pero para productos de perfumería.
    async confirmarCompraPerf(comp) {
      try {
        const res  = await fetch(`${API_URL}/movimientos-perfumeria/compras`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(comp) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al confirmar'); return }
        this.showToast(data.mensaje)
        await this.cargarDatos()
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // ── Ventas perfumería ───────────────────────────────────────
    // Quién la llama: SeccionMovimientos.vue, evento "confirmar-venta-perf"
    //           (botón "Confirmar venta", con el toggle en "Perfumería").
    // Qué hace: igual que confirmarVenta, pero para productos de perfumería.
    async confirmarVentaPerf(venta) {
      try {
        const res  = await fetch(`${API_URL}/movimientos-perfumeria/ventas`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(venta) })
        const data = await res.json()
        if (!res.ok) { this.showToast(data.error || 'Error al confirmar'); return }
        this.showToast(data.mensaje)
        await this.cargarDatos()
      } catch { this.showToast('No se pudo conectar con el servidor') }
    },

    // ── ESP32 Scanner ───────────────────────────────────────────
    // Quién la llama: mounted() (al arrancar la app) y ella misma, en su
    //           propio onclose, para reconectar automáticamente.
    // Qué hace: abre (y reabre automáticamente si se corta) la conexión
    //           WebSocket con el lector de código de barras inalámbrico
    //           (BR-400 sobre una ESP32). Cada código recibido se guarda en
    //           ultimoCodigoEscaneado y se incrementa scanCounter, que es lo
    //           que realmente "escuchan" las secciones que saben usar un
    //           escaneo (Medicamentos, Perfumería, Movimientos, Registrar)
    //           mediante un watch sobre scanCounter.
    conectarEsp32Scanner() {
      // El ESP32 manda cada código al back (POST /api/escaner) y el back lo
      // reenvía acá en tiempo real (Server-Sent Events). Así funciona desde
      // cualquier PC con internet, no solo en la red del lector.
      this.esp32Ws = new EventSource(`${API_URL}/escaner/stream`)
      this.esp32Ws.onopen    = () => { this.showToast('Lector conectado ✓') }
      this.esp32Ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.tipo === 'barcode' && data.codigo) {
            this.ultimoCodigoEscaneado = data.codigo
            this.scanCounter++   // dispara el watch en la sección activa, aunque se repita el mismo código

            // Si la sección activa no sabe qué hacer con un código escaneado
            // (Dashboard, Vencimientos, Usuarios), al menos avisamos que
            // llegó, para que no parezca que el lector no anda.
            const seccionesConEscaneo = ['movimientos', 'registrar', 'medicamentos', 'perfumeria']
            if (!seccionesConEscaneo.includes(this.seccionActiva)) {
              this.showToast(`Código escaneado: ${data.codigo} (andá a Movimientos, Registrar, Medicamentos o Perfumería para usarlo)`)
            }
          }
        } catch (e) { console.error('Error del scanner:', e) }
      }
      // Si se corta la conexión, EventSource reintenta solo (no hace falta setTimeout).
    },

    // Quién la llama: mounted() una vez, y a sí misma cada 1000ms vía
    //           setInterval (también configurado en mounted()).
    // Qué hace: actualiza this.horaActual con la hora actual (formato AR, HH:MM:SS).
    updateClock() {
      this.horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },
  },

  // Quién la llama: Vue, automáticamente, una sola vez cuando el componente
  //           raíz termina de montarse (arranca la app).
  // Qué hace: arranca el reloj (y lo deja actualizándose cada segundo),
  //           conecta el lector de código de barras, y si ya había una
  //           sesión guardada en sessionStorage (por ejemplo, si se recargó
  //           la página), la restaura sin pedir el login de nuevo.
  mounted() {
    this.updateClock()
    setInterval(this.updateClock, 1000)
    this.conectarEsp32Scanner()

    // Verifica si ya había una sesión activa (por si recarga la página)
    const token     = sessionStorage.getItem('token')
    const nombre    = sessionStorage.getItem('nombre')
    const rol       = sessionStorage.getItem('rol')
    const usuarioId = sessionStorage.getItem('usuarioId')
    if (token && nombre) {
      this.token         = token
      this.nombreUsuario = nombre
      this.rol           = rol || ''
      this.usuarioId     = usuarioId ? parseInt(usuarioId) : null
      this.sesionActiva  = true
      this.cargarDatos()
    }
  },
}
</script>
