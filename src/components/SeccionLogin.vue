<template>
  <div class="login-wrap">
    <div class="login-card">

      <!-- Logo -->
      <div style="text-align:center;margin-bottom:2rem;">
        <div class="logo" style="justify-content:center;font-size:calc(32px * var(--zoom-texto));">
          <span class="logo-dot"></span>Farmacia
        </div>
        <div class="logo-sub" style="text-align:center;margin-top:4px;">GESTIÓN DE STOCK</div>
      </div>

      <div class="card-title">INICIAR SESIÓN</div>

      <!-- Selector de modo: Administrador o Empleado -->
      <div style="display:flex;gap:8px;margin-bottom:1.5rem;">
        <button
          type="button"
          class="btn btn-sm"
          style="flex:1;justify-content:center;"
          :style="modo === 'admin' ? 'background:var(--orange);color:#000' : 'background:transparent;color:var(--orange);border:1px solid var(--border-o)'"
          @click="modo = 'admin'"
          :disabled="cargando"
        >
          Administrador/dueño
        </button>
        <button
          type="button"
          class="btn btn-sm"
          style="flex:1;justify-content:center;"
          :style="modo === 'empleado' ? 'background:var(--orange);color:#000' : 'background:transparent;color:var(--orange);border:1px solid var(--border-o)'"
          @click="modo = 'empleado'"
          :disabled="cargando"
        >
          Empleado
        </button>
      </div>

      <!-- Mensaje de error -->
      <div v-if="error" class="alert-box" style="margin-bottom:1rem;">
        ⚠ {{ error }}
      </div>

      <!-- Formulario -->
      <div class="form-group" style="margin-bottom:1rem;">
        <label>Usuario</label>
        <input
          type="text"
          v-model="form.usuario"
          placeholder="Ingresá tu usuario"
          @keyup.enter="iniciarSesion"
          :disabled="cargando"
          autocomplete="username"
        >
      </div>

      <div class="form-group" style="margin-bottom:1.5rem;">
        <label>Contraseña</label>
        <input
          :type="mostrarPassword ? 'text' : 'password'"
          v-model="form.password"
          placeholder="Ingresá tu contraseña"
          @keyup.enter="iniciarSesion"
          :disabled="cargando"
          autocomplete="current-password"
        >
        <span
          style="font-size:calc(13px * var(--zoom-texto));color:var(--text2);cursor:pointer;margin-top:4px;display:inline-block;"
          @click="mostrarPassword = !mostrarPassword"
        >
          {{ mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña' }}
        </span>
      </div>

      <button
        class="btn btn-primary"
        style="width:100%;justify-content:center;padding:12px;"
        @click="iniciarSesion"
        :disabled="cargando"
      >
        {{ cargando ? 'Ingresando...' : 'Ingresar' }}
      </button>

      <p style="text-align:center;color:var(--text3);font-size:calc(14px * var(--zoom-texto));margin-top:1.5rem;">
        Sistema de Gestión de Farmacia · FAR.0.3
      </p>

    </div>
  </div>
</template>

<script>
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// SeccionLogin: pantalla de inicio de sesión. Se muestra cuando todavía no
// hay un token guardado (ver App.vue). Valida el formulario, llama a
// POST /api/auth/login, guarda la sesión en sessionStorage y le avisa a
// App.vue (evento login-exitoso) para que muestre el resto del sistema.
export default {
  name: 'SeccionLogin',
  emits: ['login-exitoso'], // se emite cuando el backend confirma usuario/contraseña correctos
  data() {
    return {
      form: { usuario: '', password: '' },
      modo: 'empleado',   // 'admin' | 'empleado' -- qué pestaña de login está elegida
      error: '',          // mensaje de error a mostrar (vacío = sin error)
      cargando: false,    // true mientras espera la respuesta del servidor (deshabilita el formulario)
      mostrarPassword: false, // alterna entre mostrar la contraseña en texto plano u oculta
    }
  },
  methods: {
    // iniciarSesion()
    // Quién la llama: el botón "Iniciar sesión" del formulario (@click / submit del template).
    // Con quién se comunica: hace POST a http://localhost:3000/api/auth/login (routes/auth.js del backend).
    // Qué hace: valida los campos, llama al login del backend y, si es
    //           exitoso, guarda la sesión (token, nombre, usuario, rol, id)
    //           en sessionStorage y avisa a App.vue con el evento
    //           'login-exitoso' para que cargue el resto del sistema.
    // Qué devuelve: no devuelve nada (async void); comunica el resultado
    //           mutando "error"/"cargando" en pantalla o emitiendo 'login-exitoso'.
    async iniciarSesion() {
      this.error = ''

      if (!this.form.usuario || !this.form.password) {
        this.error = 'Completá usuario y contraseña'
        return
      }

      this.cargando = true
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...this.form, modo: this.modo }),
        })

        const data = await res.json()

        if (!res.ok) {
          this.error = data.error || 'Error al iniciar sesión'
          return
        }

        // Guarda el token en sessionStorage (dura hasta cerrar el navegador)
        sessionStorage.setItem('token', data.token)
        sessionStorage.setItem('nombre', data.nombre)
        sessionStorage.setItem('usuario', data.usuario)
        sessionStorage.setItem('rol', data.rol)
        sessionStorage.setItem('usuarioId', data.id)

        // Avisa a App.vue que el login fue exitoso
        this.$emit('login-exitoso', {
          token:   data.token,
          id:      data.id,
          nombre:  data.nombre,
          usuario: data.usuario,
          rol:     data.rol,
        })

      } catch (err) {
        this.error = 'No se pudo conectar con el servidor'
        console.error(err)
      } finally {
        this.cargando = false
      }
    },
  },
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 1rem;
}

.login-card {
  background: var(--bg2);
  border: 1px solid var(--border-o);
  border-radius: 14px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
}
</style>
