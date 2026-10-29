<template>
  <div>
    <div class="header">
      <div>
        <div class="logo"><span class="logo-dot"></span>Farmacia</div>
        <div class="logo-sub">GESTIÓN DE STOCK</div>
      </div>
      <div class="header-right">
        <span class="header-badge">CÓDIGO DE BARRAS</span>
        <span class="clock">{{ horaActual }}</span>
        <span style="color:var(--text2);font-size:calc(15px * var(--zoom-texto));">{{ nombreUsuario }}</span>
        <!-- Insignia con el rol del usuario logueado (Dueño / Administrador / Empleado) -->
        <span class="header-badge" style="text-transform:capitalize;">{{ rol }}</span>
        <button class="btn btn-danger btn-sm" @click="$emit('cerrar-sesion')">Cerrar sesión</button>
      </div>
    </div>

    <nav class="nav">
      <button class="nav-btn" :class="{ active: seccionActiva === 'dashboard' }"    @click="$emit('cambiar-seccion', 'dashboard')">Dashboard</button>
      <button class="nav-btn" :class="{ active: seccionActiva === 'medicamentos' }" @click="$emit('cambiar-seccion', 'medicamentos')">Medicamentos</button>
      <button class="nav-btn" :class="{ active: seccionActiva === 'perfumeria' }"   @click="$emit('cambiar-seccion', 'perfumeria')">Perfumería</button>
      <button class="nav-btn" :class="{ active: seccionActiva === 'movimientos' }"  @click="$emit('cambiar-seccion', 'movimientos')">Movimientos</button>
      <button class="nav-btn" :class="{ active: seccionActiva === 'vencimientos' }" @click="$emit('cambiar-seccion', 'vencimientos')">Vencimientos</button>
      <button class="nav-btn" :class="{ active: seccionActiva === 'registrar' }"    @click="$emit('cambiar-seccion', 'registrar')">+ Registrar</button>
      <!-- Solo visible para administrador o dueño -->
      <button v-if="rol === 'administrador' || rol === 'dueño'" class="nav-btn" :class="{ active: seccionActiva === 'usuarios' }" @click="$emit('cambiar-seccion', 'usuarios')">Usuarios</button>
    </nav>
  </div>
</template>

<script>
// AppHeader: encabezado fijo de la aplicación (logo, reloj, usuario logueado,
// botón de cerrar sesión) y el menú de navegación entre secciones.
// No tiene lógica propia: solo recibe datos por props y avisa al padre
// (App.vue) por eventos cuando el usuario cambia de sección o cierra sesión.
export default {
  name: 'AppHeader',
  props: {
    horaActual:    String, // reloj en vivo, ya formateado (lo calcula App.vue)
    seccionActiva: String, // nombre de la sección visible, para resaltar el botón activo del menú
    nombreUsuario: String, // nombre del usuario logueado, se muestra junto al reloj
    rol:           String, // rol del usuario logueado ('empleado' | 'administrador' | 'dueño')
  },
  // cambiar-seccion: se emite al hacer clic en un botón del menú, con el nombre de la sección elegida.
  // cerrar-sesion: se emite al hacer clic en "Cerrar sesión".
  emits: ['cambiar-seccion', 'cerrar-sesion'],
}
</script>
