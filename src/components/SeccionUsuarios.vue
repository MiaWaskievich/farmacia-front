<template>
  <div>
    <div class="section-header">
      <div>
        <div class="section-title">USUARIOS</div>
        <div class="section-sub">Crear y administrar cuentas de acceso al sistema</div>
      </div>
    </div>

    <!-- CONFIGURACIÓN DE CORREO (Gmail) -->
    <div class="card">
      <div class="card-title">Configuración de correo (Gmail)</div>
      <p style="color:var(--text2);font-size:calc(15px * var(--zoom-texto));margin-bottom:1rem;">
        Esta es la casilla desde donde el sistema manda las credenciales a las cuentas nuevas.
        <span v-if="configGmail.configurado">
          Actualmente configurada: <b style="color:var(--text)">{{ configGmail.gmailUser }}</b>
        </span>
        <span v-else style="color:var(--yellow)">Todavía no hay ninguna casilla configurada.</span>
      </p>
      <div class="form-grid">
        <div class="form-group">
          <label>Gmail que envía los correos *</label>
          <input type="email" v-model="formGmail.gmailUser" placeholder="tucasilla@gmail.com">
        </div>
        <div class="form-group">
          <label>Contraseña de aplicación de Google *</label>
          <input type="text" v-model="formGmail.gmailPassword" placeholder="16 caracteres, ej: abcd efgh ijkl mnop">
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" @click="guardarGmail">Guardar</button>
        <button class="btn btn-secondary" @click="probarGmail" :disabled="!configGmail.configurado && !formGmail.gmailUser">Enviar correo de prueba</button>
      </div>
      <p style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));margin-top:1rem;">
        No es tu contraseña normal de Gmail. Se genera en
        <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:var(--orange)">myaccount.google.com/apppasswords</a>
        (la cuenta de Gmail necesita tener activada la verificación en 2 pasos).
      </p>
    </div>

    <!-- FORMULARIO DE ALTA -->
    <div class="card">
      <div class="card-title">Nueva cuenta</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Correo electrónico (Gmail) *</label>
          <input type="email" v-model="form.email" placeholder="usuario@gmail.com">
        </div>
        <div class="form-group">
          <label>Nombre completo</label>
          <input type="text" v-model="form.nombre" placeholder="Ej: Juan Pérez">
        </div>
        <div class="form-group">
          <label>Nombre de usuario *</label>
          <input type="text" v-model="form.usuario" placeholder="Ej: jperez">
        </div>
        <div class="form-group">
          <label>Contraseña *</label>
          <input type="text" v-model="form.password" placeholder="Contraseña inicial">
        </div>
        <div class="form-group">
          <label>Rol *</label>
          <select v-model="form.rol">
            <option value="empleado">Empleado</option>
            <option value="administrador">Administrador</option>
            <!-- Solo el dueño puede crear otra cuenta de dueño -->
            <option v-if="rol === 'dueño'" value="dueño">Dueño</option>
          </select>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" @click="crear">Crear cuenta</button>
        <button class="btn btn-secondary" @click="limpiar">Limpiar</button>
      </div>
      <p style="color:var(--text2);font-size:calc(14px * var(--zoom-texto));margin-top:1rem;">
        Al crear la cuenta se le enviará un correo a la casilla de Gmail indicada con su nombre de usuario y contraseña.
      </p>
    </div>

    <!-- LISTADO -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-if="usuarios.length === 0"><td colspan="6"><div class="empty">Sin usuarios cargados</div></td></tr>
            <tr v-for="u in usuarios" :key="u.id">
              <td>{{ u.nombre }}</td>
              <td><code style="font-size:calc(14px * var(--zoom-texto));color:var(--orange)">{{ u.usuario }}</code></td>
              <td style="color:var(--text2)">{{ u.email || '-' }}</td>
              <td>
                <span class="badge" :class="badgeRol(u.rol)" style="text-transform:capitalize;">{{ u.rol }}</span>
              </td>
              <td>
                <span class="badge" :class="u.activo ? 'badge-ok' : 'badge-danger'">{{ u.activo ? 'Activo' : 'Deshabilitado' }}</span>
              </td>
              <td>
                <!--
                  La cuenta de dueño nunca se puede deshabilitar (ni desde acá
                  se muestra el botón). Un administrador tampoco puede
                  deshabilitar a otro administrador: el backend igualmente lo
                  bloquearía, pero se oculta el botón para que quede claro en
                  la interfaz. El botón alterna entre "Deshabilitar" (si está
                  activo) y "Habilitar" (si ya estaba deshabilitado), para
                  poder revertirlo en cualquier momento sin perder la cuenta.
                -->
                <button
                  v-if="u.rol !== 'dueño' && (rol === 'dueño' || u.rol === 'empleado')"
                  class="btn btn-sm"
                  :class="u.activo ? 'btn-danger' : 'btn-secondary'"
                  @click="cambiarEstado(u)"
                >
                  {{ u.activo ? 'Deshabilitar' : 'Habilitar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN (habilitar / deshabilitar cuenta) -->
    <!-- Reemplaza el confirm() nativo del navegador: la propia página muestra
         este cartel para que la confirmación tenga el estilo del sistema. -->
    <div v-if="confirmModal.visible" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;">
      <div style="background:var(--bg2);border:1px solid var(--border-o);border-radius:12px;padding:2rem;width:100%;max-width:420px;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:calc(19px * var(--zoom-texto));font-weight:600;color:var(--orange);letter-spacing:2px;margin-bottom:1rem;">
          {{ confirmModal.usuario && confirmModal.usuario.activo ? 'DESHABILITAR CUENTA' : 'HABILITAR CUENTA' }}
        </div>
        <p style="color:var(--text2);font-size:calc(16px * var(--zoom-texto));">
          ¿Seguro que querés {{ confirmModal.usuario && confirmModal.usuario.activo ? 'deshabilitar' : 'habilitar' }} la cuenta
          "<b style="color:var(--text)">{{ confirmModal.usuario && confirmModal.usuario.usuario }}</b>"?
        </p>
        <div class="btn-row">
          <button class="btn btn-primary" @click="confirmarCambioEstado">Sí, confirmar</button>
          <button class="btn btn-secondary" @click="confirmModal.visible = false">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// SeccionUsuarios: administración de cuentas de acceso (solo la ven
// administrador y dueño). Permite configurar el Gmail desde el que se
// envían las credenciales, crear cuentas nuevas y habilitar/deshabilitar
// las existentes. La confirmación de habilitar/deshabilitar usa un modal
// propio en vez del confirm() nativo del navegador (ver template más arriba).
export default {
  name: 'SeccionUsuarios',
  props: {
    usuarios: Array,   // listado de cuentas, traído por App.vue desde /api/usuarios
    rol: String,        // rol del usuario logueado ('dueño' | 'administrador'), para saber qué puede hacer
    configGmail: Object, // { configurado, gmailUser } traído por App.vue desde /api/configuracion
  },
  // crear-usuario: pide a App.vue dar de alta la cuenta en el backend (dispara el mail de credenciales).
  // cambiar-estado-usuario: pide habilitar/deshabilitar la cuenta { id, activo, accion }.
  // guardar-gmail: pide guardar la casilla de Gmail que envía los correos del sistema.
  // probar-gmail: pide mandar un correo de prueba con la configuración actual.
  // toast: pide mostrar un mensaje flotante (por ejemplo, un error de validación).
  emits: ['crear-usuario', 'cambiar-estado-usuario', 'guardar-gmail', 'probar-gmail', 'toast'],
  data() {
    return {
      form: { email: '', nombre: '', usuario: '', password: '', rol: 'empleado' }, // formulario de alta de cuenta
      formGmail: { gmailUser: '', gmailPassword: '' }, // formulario de configuración del Gmail emisor
      confirmModal: { visible: false, usuario: null }, // modal propio para habilitar/deshabilitar (reemplaza confirm() del navegador)
    }
  },
  methods: {
    // badgeRol(rol)
    // Quién la llama: el template, para pintar la insignia de rol de cada fila.
    // Qué devuelve: un string con la clase CSS del color según el rol
    //           ('badge-ok' para dueño, 'badge-warn' para administrador,
    //           'badge-in' para empleado).
    badgeRol(rol) {
      if (rol === 'dueño') return 'badge-ok'
      if (rol === 'administrador') return 'badge-warn'
      return 'badge-in'
    },
    // crear()
    // Quién la llama: el template, botón "Crear cuenta" del formulario de alta.
    // Qué hace: valida los campos obligatorios y que el correo sea de Gmail;
    //           si está todo bien, emite 'crear-usuario' a App.vue (que hace
    //           el POST real al backend) y limpia el formulario.
    crear() {
      const { email, usuario, password } = this.form
      if (!email || !usuario || !password) {
        this.$emit('toast', 'Completá correo, usuario y contraseña')
        return
      }
      if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
        this.$emit('toast', 'El correo debe ser una cuenta de Gmail (@gmail.com)')
        return
      }
      this.$emit('crear-usuario', { ...this.form, nombre: this.form.nombre || this.form.usuario })
      this.limpiar()
    },
    // limpiar()
    // Quién la llama: crear(), justo después de emitir 'crear-usuario'.
    // Qué hace: vacía el formulario de alta de cuenta.
    limpiar() {
      this.form = { email: '', nombre: '', usuario: '', password: '', rol: 'empleado' }
    },
    // cambiarEstado(u)
    // Quién la llama: el template, botón "Deshabilitar" / "Habilitar" de cada fila.
    // Qué hace: en vez de mostrar el confirm() nativo del navegador, abre el
    //           modal propio del sistema guardando qué usuario está en juego
    //           (no emite nada todavía: eso lo hace confirmarCambioEstado()).
    cambiarEstado(u) {
      this.confirmModal = { visible: true, usuario: u }
    },
    // confirmarCambioEstado()
    // Quién la llama: el template, botón "Sí, confirmar" del modal propio de confirmación.
    // Qué hace: cierra el modal y emite 'cambiar-estado-usuario' con el id,
    //           el nuevo estado (invertido) y la acción en texto, para que
    //           App.vue haga el PUT al backend.
    confirmarCambioEstado() {
      const u = this.confirmModal.usuario
      const accion = u.activo ? 'deshabilitar' : 'habilitar'
      this.confirmModal.visible = false
      this.$emit('cambiar-estado-usuario', { id: u.id, activo: !u.activo, accion })
    },
    // guardarGmail()
    // Quién la llama: el template, botón "Guardar" del formulario "Configuración de correo".
    // Qué hace: valida que estén completos el Gmail y la contraseña de
    //           aplicación; si está todo bien, emite 'guardar-gmail' a
    //           App.vue (que hace el PUT real al backend) y limpia el formulario.
    guardarGmail() {
      const { gmailUser, gmailPassword } = this.formGmail
      if (!gmailUser || !gmailPassword) {
        this.$emit('toast', 'Completá el Gmail y la contraseña de aplicación')
        return
      }
      this.$emit('guardar-gmail', { ...this.formGmail })
      this.formGmail = { gmailUser: '', gmailPassword: '' }
    },
    // probarGmail()
    // Quién la llama: el template, botón "Enviar correo de prueba".
    // Qué hace: emite 'probar-gmail' a App.vue, que le pide al backend que
    //           mande el correo de prueba con la configuración ya guardada.
    probarGmail() {
      this.$emit('probar-gmail')
    },
  },
}
</script>
